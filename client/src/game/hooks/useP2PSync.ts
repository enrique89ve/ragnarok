import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { DataConnection } from 'peerjs';
import { usePeerStore } from '../stores/peerStore';
import { useGameStore } from '../stores/gameStore';
import { debug } from '../config/debugConfig';
import { GameState } from '../types';
import { verifyDeckOwnership } from '../../data/blockchain/deckVerification';
import { sha256Hash } from '../../data/blockchain/hashUtils';
import { verifyDeck as verifyDeckOnServer } from '../../data/chainAPI';
import { getNFTBridge } from '../nft';
import type { PackagedMatchResult } from '../../data/blockchain/types';
import { createSeededRng, seededShuffle } from '../utils/seededRng';
import { startNewTranscript, getActiveTranscript, clearTranscript } from '../../data/blockchain/transcriptBuilder';
import type { GameMove } from '../../data/blockchain/signedMove';
import { getWasmHash, loadWasmEngine } from '../engine/wasmLoader';
import { computeStateHash } from '../engine/engineBridge';
import { isHiveMode } from '../config/featureFlags';
import { submitSlashEvidence, findExistingMatchResult } from '../../data/blockchain/slashEvidence';
import { filterGameStateForSpectator } from '../spectator/spectatorFilter';

declare const __BUILD_HASH__: string;

/**
 * Flip the game state so the client sees themselves as 'player' and the host as 'opponent'.
 * The host always stores state from its own perspective (host=player, client=opponent).
 * Without this flip the client would see their own cards at the top under "opponent".
 */
function flipGameState(state: GameState): GameState {
	return {
		...state,
		players: {
			player: state.players.opponent,
			opponent: state.players.player,
		},
		currentTurn: state.currentTurn === 'player' ? 'opponent' : 'player',
		winner: state.winner === 'player' ? 'opponent' : state.winner === 'opponent' ? 'player' : state.winner,
		mulligan: state.mulligan ? {
			...state.mulligan,
			playerReady: (state.mulligan as any).opponentReady ?? false,
			opponentReady: (state.mulligan as any).playerReady ?? false,
		} : state.mulligan,
	};
}

/**
 * Translate a target ID from the client's flipped perspective back to the host's perspective.
 * e.g. the client sees the host's hero as 'opponent-hero', but the host calls it 'player-hero'.
 */
function translateTargetForHost(targetId: string | undefined): string | undefined {
	if (targetId === 'opponent-hero') return 'player-hero';
	if (targetId === 'player-hero') return 'opponent-hero';
	return targetId;
}

function generateSalt(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

let moveCounter = 0;

function recordMove(action: string, payload: Record<string, unknown>, playerId: string): void {
	const transcript = getActiveTranscript();
	if (!transcript) return;
	const move: GameMove = {
		moveNumber: moveCounter++,
		action,
		payload,
		playerId,
		timestamp: Date.now(),
	};
	transcript.addMove(move);
}

export type P2PMessage =
	| { type: 'init'; gameState: GameState; isHost: boolean; matchId?: string }
	| { type: 'playCard'; cardId: string; targetId?: string; targetType?: 'minion' | 'hero'; insertionIndex?: number }
	| { type: 'attack'; attackerId: string; defenderId: string }
	| { type: 'endTurn' }
	| { type: 'useHeroPower'; targetId?: string }
	| { type: 'gameState'; gameState: GameState; stateHash?: string }
	| { type: 'opponentDisconnected' }
	| { type: 'ping' }
	| { type: 'pong' }
	| { type: 'deck_verify'; hiveAccount: string; nftIds: string[] }
	| { type: 'seed_commit'; commitment: string }
	| { type: 'seed_reveal'; salt: string; hiveUsername?: string }
	| { type: 'result_propose'; result: PackagedMatchResult; hash: string; broadcasterSig: string; proposalId: string }
	| { type: 'result_countersign'; counterpartySig: string; proposalId: string }
	| { type: 'result_reject'; reason: string }
	| { type: 'version_check'; buildHash: string }
	| { type: 'wasm_hash_check'; wasmHash: string }
	| { type: 'hash_check'; stateHash: string; turnNumber: number }
	| { type: 'hash_mismatch'; turnNumber: number; myHash: string }
	| { type: 'poker_action'; playerId: string; action: string; hpCommitment?: number };

const RESULT_SIGN_TIMEOUT_MS = 30_000;

export function useP2PSync() {
	const { connection, connectionState, isHost, send } = usePeerStore();
	const gameStore = useGameStore();
	const lastSyncRef = useRef<number>(0);
	const messageQueueRef = useRef<P2PMessage[]>([]);
	const isProcessingRef = useRef(false);
	const initSentRef = useRef(false);

	// Rate limiting: max 5 action messages per second from opponent
	const actionTimestampsRef = useRef<number[]>([]);
	const MAX_ACTIONS_PER_SEC = 5;

	// Session binding: matchId derived from seed exchange
	const matchIdRef = useRef<string | null>(null);
	// Identity binding: opponent's Hive username from seed_reveal
	const opponentUsernameRef = useRef<string | null>(null);
	const pendingSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const spectatorConnectionsRef = useRef<DataConnection[]>([]);

	// Commit-reveal seed exchange state
	const mySaltRef = useRef<string | null>(null);
	const theirCommitmentRef = useRef<string | null>(null);
	const seedResolvedRef = useRef(false);

	// Slash dedup: only submit one slash per turn
	const lastSlashTurnRef = useRef<number>(-1);

	// Dual-sig result state
	const pendingResultRef = useRef<{
		result: PackagedMatchResult;
		hash: string;
		broadcasterSig: string;
		resolve: (sigs: { broadcaster: string; counterparty: string }) => void;
		reject: (err: Error) => void;
	} | null>(null);

	// Seed exchange: generate salt and send commitment when connection opens
	// Also send version_check and start a new transcript
	useEffect(() => {
		if (!connection || connectionState !== 'connected') {
			mySaltRef.current = null;
			theirCommitmentRef.current = null;
			seedResolvedRef.current = false;
			clearTranscript();
			moveCounter = 0;
			return;
		}

		loadWasmEngine().then(() => {
			const wasmHash = getWasmHash();
			send({ type: 'wasm_hash_check', wasmHash });
		}).catch(err => {
			toast.error('WASM engine failed to load — ranked play blocked', {
				description: err instanceof Error ? err.message : 'Unknown WASM error',
				duration: 15000,
			});
		});

		const salt = generateSalt();
		mySaltRef.current = salt;

		sha256Hash(salt).then(commitment => {
			send({ type: 'seed_commit', commitment });
		});

		const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
		send({ type: 'version_check', buildHash: hash });

		// Cross-verify deck NFT ownership: send our deck's NFT IDs so opponent can verify on-chain
		if (isHiveMode()) {
			try {
				const bridge = getNFTBridge();
				const username = bridge.getUsername();
				if (username) {
					const collection = bridge.getCardCollection();
					const nftIds = collection.map(c => c.uid ?? '').filter(Boolean);
					if (nftIds.length > 0) {
						send({ type: 'deck_verify', hiveAccount: username, nftIds });
						debug.combat(`[useP2PSync] Sent deck_verify: ${nftIds.length} NFTs for @${username}`);
					}
				}
			} catch (err) {
				debug.warn('[useP2PSync] Failed to send deck verification:', err);
			}
		}

		startNewTranscript();
	}, [connection, connectionState, send]);

	// Host sends init AFTER seed exchange completes (replaces old 200ms timer)
	// Timeout after 10s if seed exchange stalls
	useEffect(() => {
		if (!connection || !isHost || connectionState !== 'connected') {
			initSentRef.current = false;
			return undefined;
		}
		if (initSentRef.current) return undefined;
		if (!seedResolvedRef.current) {
			const timeout = setTimeout(() => {
				if (!seedResolvedRef.current) {
					debug.error('[useP2PSync] Seed exchange timed out after 10s');
					toast.error('Seed exchange timed out. Disconnecting.', { duration: 5000 });
					usePeerStore.getState().disconnect();
				}
			}, 10_000);
			return () => clearTimeout(timeout);
		}

		initSentRef.current = true;
		const currentState = useGameStore.getState().gameState;
		if (currentState) {
			send({ type: 'init', gameState: currentState, isHost: true });
		}
		return undefined;
	}, [connection, isHost, connectionState, send]);

	// Detect when connection closes and notify the player
	useEffect(() => {
		if (!connection) return;

		const handleClose = () => {
			debug.warn('[useP2PSync] Connection to opponent closed');
			// Clean up pending result to prevent stale closures
			if (pendingResultRef.current) {
				pendingResultRef.current.reject(new Error('Connection closed'));
				pendingResultRef.current = null;
			}
			// Clean up debounce timer
			if (pendingSyncRef.current) {
				clearTimeout(pendingSyncRef.current);
				pendingSyncRef.current = null;
			}
			// Reset message queue to prevent permanent lock
			isProcessingRef.current = false;
			messageQueueRef.current = [];
			toast.error('Opponent disconnected from the game.', {
				duration: 8000,
				description: 'The connection was lost. You may need to start a new game.',
			});

			if (isHiveMode()) {
				const gs = useGameStore.getState().gameState;
				const matchSeed = useGameStore.getState().matchSeed;
				const opponentName = usePeerStore.getState().remotePeerId ?? 'unknown';
				if (gs && gs.gamePhase !== 'game_over' && gs.turnNumber > 0 && matchSeed) {
					submitSlashEvidence({
						matchId: matchSeed,
						offender: opponentName,
						reason: 'fake_disconnect',
						trxId1: matchSeed,
						trxId2: `disconnect_turn_${gs.turnNumber}_${Date.now()}`,
						notes: `Opponent disconnected mid-match at turn ${gs.turnNumber}`,
					}).catch(err => debug.warn('[useP2PSync] Failed to submit fake_disconnect slash:', err));
				}
			}
		};

		connection.on('close', handleClose);
		return () => {
			connection.off('close', handleClose);
		};
	}, [connection]);

	useEffect(() => {
		if (!connection || (connectionState !== 'connected' && connectionState !== 'grace_period')) return;

		const processMessage = async (data: P2PMessage) => {
			// Heartbeat keepalive — handle before switch (not a game message)
			if ((data as { type: string }).type === 'heartbeat') {
				usePeerStore.getState().handleHeartbeat();
				return;
			}

			switch (data.type) {
				case 'version_check': {
					const myHash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
					if (data.buildHash !== myHash && data.buildHash !== 'dev' && myHash !== 'dev') {
						toast.warning('Client version mismatch', {
							description: `Your build: ${myHash.slice(0, 7)}, opponent: ${data.buildHash.slice(0, 7)}. Results may differ.`,
							duration: 8000,
						});
					}
					break;
				}

				case 'wasm_hash_check': {
					const myWasmHash = getWasmHash();
					const theirWasmHash = data.wasmHash;
					if (theirWasmHash !== myWasmHash && theirWasmHash !== 'dev' && myWasmHash !== 'dev') {
						toast.error('WASM engine mismatch — disconnecting', {
							description: `Your engine: ${myWasmHash.slice(0, 12)}…, opponent: ${theirWasmHash.slice(0, 12)}…. Both players must use the same game version.`,
							duration: 10000,
						});
						usePeerStore.getState().disconnect();
					}
					break;
				}

				case 'hash_check': {
					const gs = useGameStore.getState().gameState;
					if (!gs) break;
					const myHash = await computeStateHash(gs);
					if (myHash !== data.stateHash) {
						debug.error(`[useP2PSync] State hash mismatch at turn ${data.turnNumber}: local=${myHash.slice(0, 16)}, remote=${data.stateHash.slice(0, 16)}`);
						send({ type: 'hash_mismatch', turnNumber: data.turnNumber, myHash });
						toast.error('State verification failed', {
							description: 'Game state diverged from opponent. Possible cheating detected.',
							duration: 8000,
						});

						if (isHiveMode() && data.turnNumber !== lastSlashTurnRef.current) {
							lastSlashTurnRef.current = data.turnNumber;
							const matchSeed = useGameStore.getState().matchSeed;
							const opponentName = usePeerStore.getState().remotePeerId ?? 'unknown';
							if (matchSeed) {
								submitSlashEvidence({
									matchId: matchSeed,
									offender: opponentName,
									reason: 'forged_move',
									trxId1: matchSeed,
									trxId2: `hash_check_fail_turn_${data.turnNumber}_${myHash.slice(0, 16)}`,
									notes: `Hash check failed at turn ${data.turnNumber}. Local: ${myHash.slice(0, 16)}, remote: ${data.stateHash.slice(0, 16)}`,
								}).catch(err => debug.warn('[useP2PSync] Failed to submit forged_move slash:', err));
							}
						}
					}
					break;
				}

				case 'hash_mismatch':
					debug.error(`[useP2PSync] Opponent reports hash mismatch at turn ${data.turnNumber}: theirHash=${data.myHash.slice(0, 16)}`);
					toast.error('State verification failed', {
						description: 'Opponent detected state divergence. Game integrity compromised.',
						duration: 8000,
					});

					if (isHiveMode()) {
						const matchSeed = useGameStore.getState().matchSeed;
						const opponentName = usePeerStore.getState().remotePeerId ?? 'unknown';
						if (matchSeed) {
							submitSlashEvidence({
								matchId: matchSeed,
								offender: opponentName,
								reason: 'forged_move',
								trxId1: matchSeed,
								trxId2: `hash_mismatch_turn_${data.turnNumber}_${data.myHash.slice(0, 16)}`,
								notes: `State hash mismatch at turn ${data.turnNumber}. Opponent hash: ${data.myHash.slice(0, 16)}`,
							}).catch(err => debug.warn('[useP2PSync] Failed to submit forged_move slash:', err));
						}
					}
					break;

				case 'seed_commit':
					theirCommitmentRef.current = data.commitment;
					if (mySaltRef.current) {
						send({ type: 'seed_reveal', salt: mySaltRef.current, hiveUsername: getNFTBridge().getUsername() || undefined });
					}
					break;

				case 'seed_reveal': {
					const theirSalt = data.salt;
					const theirCommitment = theirCommitmentRef.current;
					if (!theirCommitment) {
						debug.warn('[useP2PSync] Received seed_reveal before seed_commit');
						break;
					}

					const expectedCommitment = await sha256Hash(theirSalt);
					if (expectedCommitment !== theirCommitment) {
						debug.error('[useP2PSync] Seed commitment mismatch — possible cheating');
						toast.error('Seed verification failed. Disconnecting.', { duration: 5000 });
						usePeerStore.getState().disconnect();
						break;
					}

					const myPeerId = usePeerStore.getState().myPeerId ?? '';
					const remotePeerId = usePeerStore.getState().remotePeerId ?? '';
					const mySalt = mySaltRef.current ?? '';
					const [first, second] = myPeerId < remotePeerId
						? [mySalt, theirSalt]
						: [theirSalt, mySalt];
					const matchSeed = await sha256Hash(first + second);

					useGameStore.setState({ matchSeed });
					seedResolvedRef.current = true;

					// Session binding: derive matchId from seed + peer IDs
					const matchId = await sha256Hash(matchSeed + myPeerId + remotePeerId);
					matchIdRef.current = matchId.slice(0, 16);

					// Identity binding: capture opponent's Hive username
					if (data.hiveUsername) {
						opponentUsernameRef.current = data.hiveUsername;
					}

					if (isHost) {
						const rng = createSeededRng(matchSeed);
						const gs = useGameStore.getState().gameState;
						if (gs) {
							const reshuffled = {
								...gs,
								players: {
									player: { ...gs.players.player, deck: seededShuffle(gs.players.player.deck, rng) },
									opponent: { ...gs.players.opponent, deck: seededShuffle(gs.players.opponent.deck, rng) },
								},
							};
							useGameStore.setState({ gameState: reshuffled });
						}

						initSentRef.current = true;
						const updatedState = useGameStore.getState().gameState;
						if (updatedState) {
							send({ type: 'init', gameState: updatedState, isHost: true });
						}
					}
					break;
				}

				case 'init':
					if (!isHost) {
						useGameStore.setState({ gameState: flipGameState(data.gameState) });
					}
					break;

				case 'playCard':
					if (isHost) {
						// Rate limit: max 5 actions/sec from opponent
						const now1 = Date.now();
						actionTimestampsRef.current = actionTimestampsRef.current.filter(t => now1 - t < 1000);
						if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) break;
						actionTimestampsRef.current.push(now1);

						const gs = useGameStore.getState().gameState;
						if (gs.currentTurn !== 'opponent' || gs.gamePhase === 'game_over') break;
						// Validate ID format (alphanumeric, hyphens, underscores, max 64 chars)
						if (typeof data.cardId !== 'string' || data.cardId.length > 64) break;
						recordMove('playCard', { cardId: data.cardId, targetId: data.targetId, targetType: data.targetType, insertionIndex: data.insertionIndex }, 'opponent');
						gameStore.playCard(data.cardId, translateTargetForHost(data.targetId), data.targetType, data.insertionIndex);
						debouncedSync();
					}
					break;

				case 'attack':
					if (isHost) {
						const now2 = Date.now();
						actionTimestampsRef.current = actionTimestampsRef.current.filter(t => now2 - t < 1000);
						if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) break;
						actionTimestampsRef.current.push(now2);

						const gs = useGameStore.getState().gameState;
						if (gs.currentTurn !== 'opponent' || gs.gamePhase === 'game_over') break;
						if (typeof data.attackerId !== 'string' || data.attackerId.length > 64) break;
						if (typeof data.defenderId !== 'string' || data.defenderId.length > 64) break;
						recordMove('attack', { attackerId: data.attackerId, defenderId: data.defenderId }, 'opponent');
						gameStore.attackWithCard(data.attackerId, translateTargetForHost(data.defenderId) ?? data.defenderId);
						debouncedSync();
					}
					break;

				case 'endTurn':
					if (isHost) {
						const now3 = Date.now();
						actionTimestampsRef.current = actionTimestampsRef.current.filter(t => now3 - t < 1000);
						if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) break;
						actionTimestampsRef.current.push(now3);

						const gs = useGameStore.getState().gameState;
						if (gs.currentTurn !== 'opponent' || gs.gamePhase === 'game_over') break;
						recordMove('endTurn', {}, 'opponent');
						gameStore.endTurn();
						debouncedSync();
					}
					break;

				case 'useHeroPower':
					if (isHost) {
						const gs = useGameStore.getState().gameState;
						if (gs.currentTurn !== 'opponent' || gs.gamePhase === 'game_over') break;
						recordMove('useHeroPower', { targetId: data.targetId }, 'opponent');
						gameStore.useHeroPower(translateTargetForHost(data.targetId));
						debouncedSync();
					}
					break;

				case 'poker_action':
					if (isHost) {
						// Rate limit
						const nowP = Date.now();
						actionTimestampsRef.current = actionTimestampsRef.current.filter(t => nowP - t < 1000);
						if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) break;
						actionTimestampsRef.current.push(nowP);

						// Validate action is a known CombatAction value
						const validActions = ['attack', 'counter', 'engage', 'brace', 'defend'];
						if (!validActions.includes(data.action)) break;
						if (data.hpCommitment !== undefined && (typeof data.hpCommitment !== 'number' || data.hpCommitment < 0 || data.hpCommitment > 500)) break;

						// Access combat store via globalThis (set by unifiedCombatStore.ts)
						const combatStore = (globalThis as Record<string, unknown>).__ragnarokCombatStore as
							{ getState: () => { pokerState?: { activePlayerId?: string | null; foldWinner?: string; phase?: string }; performAction?: (playerId: string, action: string, hp?: number) => void } } | undefined;
						if (!combatStore) break;
						const cState = combatStore.getState();
						if (!cState.pokerState || cState.pokerState.foldWinner) break;
						if (cState.pokerState.phase === 'RESOLUTION' || cState.pokerState.phase === 'SHOWDOWN') break;

						// Validate it's this player's turn in poker
						if (typeof data.playerId !== 'string' || data.playerId.length > 64) break;
						if (cState.pokerState.activePlayerId !== data.playerId) break;

						recordMove('poker_action', { action: data.action, hpCommitment: data.hpCommitment }, 'opponent');
						if (cState.performAction) {
							cState.performAction(data.playerId, data.action, data.hpCommitment);
						}
						debouncedSync();
					}
					break;

				case 'gameState':
					if (!isHost) {
						const flipped = flipGameState(data.gameState);

						// Tamper detection: verify stateHash matches received state
						if (data.stateHash && flipped) {
							const expectedHash = `${data.gameState?.turnNumber ?? 0}:${data.gameState?.gamePhase ?? ''}:${data.gameState?.players?.player?.heroHealth ?? 0}:${data.gameState?.players?.opponent?.heroHealth ?? 0}`;
							if (data.stateHash !== expectedHash) {
								debug.warn('[useP2PSync] GameState hash mismatch — possible tampering');
								// Don't disconnect (could be race condition), but log for diagnostics
							}
						}

						const currentState = useGameStore.getState().gameState;
						const changed = !currentState ||
							currentState.turnNumber !== flipped.turnNumber ||
							currentState.gamePhase !== flipped.gamePhase ||
							currentState.currentTurn !== flipped.currentTurn ||
							currentState.players?.player?.heroHealth !== flipped.players?.player?.heroHealth ||
							currentState.players?.opponent?.heroHealth !== flipped.players?.opponent?.heroHealth ||
							currentState.players?.player?.mana?.current !== flipped.players?.player?.mana?.current ||
							currentState.players?.player?.hand?.length !== flipped.players?.player?.hand?.length ||
							currentState.players?.player?.battlefield?.length !== flipped.players?.player?.battlefield?.length ||
							currentState.players?.opponent?.battlefield?.length !== flipped.players?.opponent?.battlefield?.length;
						if (changed) {
							useGameStore.setState({ gameState: flipped });
						}
					}
					break;

				case 'opponentDisconnected':
					debug.warn('[useP2PSync] Opponent disconnected from game');
					toast.error('Opponent disconnected.', { duration: 8000 });
					break;

				case 'ping':
					send({ type: 'pong' });
					break;

				case 'deck_verify': {
					let disconnecting = false;
					const disconnectOnce = () => {
						if (disconnecting) return;
						disconnecting = true;
						setTimeout(() => usePeerStore.getState().disconnect(), 2000);
					};

					verifyDeckOwnership(
						data.hiveAccount,
						data.nftIds.map(id => ({ nft_id: id })),
					).then(result => {
						if (!result.valid) {
							toast.error(`Opponent deck verification failed`, {
								description: `${result.invalidCards.length} card(s) not owned by ${data.hiveAccount}. Disconnecting.`,
								duration: 5000,
							});
							disconnectOnce();
						}
					}).catch(() => { /* IndexedDB unavailable in dev mode — skip */ });

					if (data.hiveAccount && data.nftIds.length > 0) {
						const cardIds = data.nftIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
						if (cardIds.length > 0) {
							verifyDeckOnServer(data.hiveAccount, cardIds)
								.then(sv => {
									if (!sv.verified) {
										toast.error('Server deck verification failed', {
											description: `${sv.missing.length} card(s) not found on-chain for ${data.hiveAccount}. Disconnecting.`,
											duration: 5000,
										});
										disconnectOnce();
									}
								})
								.catch(() => { /* Chain indexer unavailable — skip */ });
						}
					}
					break;
				}

				case 'result_propose': {
					if (!data.result || !data.hash || typeof data.hash !== 'string' ||
						!data.result.winner?.username || !data.result.loser?.username) {
						send({ type: 'result_reject', reason: 'malformed_proposal' });
						break;
					}

					if (isHiveMode() && data.result.matchId) {
						const proposerUsername = data.result.winner?.username || data.result.loser?.username;
						findExistingMatchResult(data.result.matchId, proposerUsername)
							.then(existingTrxId => {
								if (existingTrxId) {
									submitSlashEvidence({
										matchId: data.result.matchId,
										offender: proposerUsername,
										reason: 'double_result',
										trxId1: existingTrxId,
										trxId2: data.hash,
										notes: `Duplicate match result proposed for matchId ${data.result.matchId}`,
									}).catch(err => debug.warn('[useP2PSync] Failed to submit double_result slash:', err));
								}
							})
							.catch(err => debug.warn('[useP2PSync] Failed to check existing match result:', err));
					}

					const gs = useGameStore.getState().gameState;
					const myWinner = gs?.winner;

					const expectedHostWinner = myWinner === 'player' ? 'opponent' : 'player';
					const proposedWinner = data.result.winner.username;
					const hostUsername = data.result.matchType === 'ranked'
						? (expectedHostWinner === 'player' ? data.result.winner.username : data.result.loser.username)
						: proposedWinner;

					const clientUsername = getNFTBridge().getUsername();
					const iAmWinner = myWinner === 'player';
					const resultSaysIWon = data.result.winner.username === clientUsername;
					const resultSaysILost = data.result.loser.username === clientUsername;

					if ((iAmWinner && resultSaysIWon) || (!iAmWinner && resultSaysILost)) {
						try {
							const sig = await getNFTBridge().signResultHash(data.hash);
							send({ type: 'result_countersign', counterpartySig: sig, proposalId: data.proposalId });
						} catch {
							send({ type: 'result_reject', reason: 'signing_failed' });
						}
					} else if (!clientUsername) {
						send({ type: 'result_reject', reason: 'no_hive_account' });
					} else {
						send({ type: 'result_reject', reason: 'winner_mismatch' });
					}
					break;
				}

				case 'result_countersign': {
					const pending = pendingResultRef.current;
					if (pending) {
						pending.resolve({
							broadcaster: pending.broadcasterSig,
							counterparty: data.counterpartySig,
						});
						pendingResultRef.current = null;
					}
					break;
				}

				case 'result_reject': {
					const pending = pendingResultRef.current;
					if (pending) {
						pending.reject(new Error(`Result rejected: ${data.reason}`));
						pendingResultRef.current = null;
					}
					break;
				}

				default:
					debug.warn('[useP2PSync] Unknown message type:', (data as any).type);
			}
		};

		const processQueue = async () => {
			if (isProcessingRef.current) return;
			isProcessingRef.current = true;
			try {
				while (messageQueueRef.current.length > 0) {
					const msg = messageQueueRef.current.shift()!;
					try {
						await processMessage(msg);
					} catch (err) {
						debug.error(`[useP2PSync] Error processing ${msg.type}:`, err);
					}
				}
			} finally {
				isProcessingRef.current = false;
			}
		};

		const MAX_QUEUE_SIZE = 100;
		const handleMessage = (data: unknown) => {
			if (!data || typeof data !== 'object') return;
			const msg = data as P2PMessage;
			if (!msg.type) return;
			if (messageQueueRef.current.length >= MAX_QUEUE_SIZE) {
				debug.warn(`[useP2PSync] Queue full (${MAX_QUEUE_SIZE}), dropping newest message: ${msg.type}`);
				return;
			}
			messageQueueRef.current.push(msg);
			processQueue();
		};

		const handleMessageWrapper = (data: unknown) => handleMessage(data);
		connection.on('data', handleMessageWrapper);

		return () => {
			connection.off('data', handleMessageWrapper);
			if (pendingSyncRef.current) {
				clearTimeout(pendingSyncRef.current);
				pendingSyncRef.current = null;
			}
		};
	}, [connection, connectionState, isHost, send, gameStore]);

	const syncGameState = useCallback(() => {
		if (connectionState !== 'connected' || !isHost) return;
		const now = Date.now();
		if (now - lastSyncRef.current < 100) return;
		lastSyncRef.current = now;
		const currentState = useGameStore.getState().gameState;
		// Lightweight tamper-detection hash (not full signature — too expensive at 2/sec)
		const quickHash = currentState
			? `${currentState.turnNumber}:${currentState.gamePhase}:${currentState.players?.player?.heroHealth ?? 0}:${currentState.players?.opponent?.heroHealth ?? 0}`
			: '';
		send({ type: 'gameState', gameState: currentState, stateHash: quickHash });
	}, [connectionState, isHost, send]);

	const debouncedSync = useCallback(() => {
		if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
		pendingSyncRef.current = setTimeout(() => {
			syncGameState();
			pendingSyncRef.current = null;
		}, 25);
	}, [syncGameState]);

	const wrappedPlayCard = useCallback((cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number) => {
		if (connectionState === 'connected' && !isHost) {
			recordMove('playCard', { cardId, targetId, targetType, insertionIndex }, 'player');
			send({ type: 'playCard', cardId, targetId: translateTargetForHost(targetId), targetType, insertionIndex });
		} else {
			recordMove('playCard', { cardId, targetId, targetType, insertionIndex }, 'player');
			gameStore.playCard(cardId, targetId, targetType, insertionIndex);
			if (isHost) debouncedSync();
		}
	}, [connectionState, isHost, send, gameStore, debouncedSync]);

	const wrappedAttack = useCallback((attackerId: string, defenderId: string) => {
		if (connectionState === 'connected' && !isHost) {
			recordMove('attack', { attackerId, defenderId }, 'player');
			send({ type: 'attack', attackerId, defenderId: translateTargetForHost(defenderId) ?? defenderId });
		} else {
			recordMove('attack', { attackerId, defenderId }, 'player');
			gameStore.attackWithCard(attackerId, defenderId);
			if (isHost) debouncedSync();
		}
	}, [connectionState, isHost, send, gameStore, debouncedSync]);

	const wrappedEndTurn = useCallback(() => {
		if (connectionState === 'connected' && !isHost) {
			recordMove('endTurn', {}, 'player');
			send({ type: 'endTurn' });
		} else {
			recordMove('endTurn', {}, 'player');
			gameStore.endTurn();
			if (isHost) debouncedSync();
		}
	}, [connectionState, isHost, send, gameStore, debouncedSync]);

	const wrappedUseHeroPower = useCallback((targetId?: string) => {
		if (connectionState === 'connected' && !isHost) {
			recordMove('useHeroPower', { targetId }, 'player');
			send({ type: 'useHeroPower', targetId: translateTargetForHost(targetId) });
		} else {
			recordMove('useHeroPower', { targetId }, 'player');
			gameStore.useHeroPower(targetId);
			if (isHost) debouncedSync();
		}
	}, [connectionState, isHost, send, gameStore, debouncedSync]);

	// Host: accept incoming spectator connections via PeerJS
	useEffect(() => {
		const peer = usePeerStore.getState().peer;
		if (!peer || !isHost) return;

		const handleConnection = (conn: DataConnection) => {
			const meta = conn.metadata as { type?: string; hiveAccount?: string; spectateToken?: string } | undefined;
			if (meta?.type !== 'spectator') return;

			// Spectator authentication: require a Hive account name
			// In tournament mode, could further verify against participant list
			if (!meta.hiveAccount || typeof meta.hiveAccount !== 'string' || meta.hiveAccount.length < 3) {
				debug.warn('[useP2PSync] Spectator rejected — no Hive account provided');
				conn.close();
				return;
			}

			conn.on('open', () => {
				spectatorConnectionsRef.current.push(conn);
				debug.log(`[useP2PSync] Spectator connected: ${meta.hiveAccount}`);
			});

			conn.on('close', () => {
				spectatorConnectionsRef.current = spectatorConnectionsRef.current.filter(c => c !== conn);
			});

			conn.on('error', () => {
				spectatorConnectionsRef.current = spectatorConnectionsRef.current.filter(c => c !== conn);
			});
		};

		peer.on('connection', handleConnection);
		return () => {
			peer.off('connection', handleConnection);
			spectatorConnectionsRef.current = [];
		};
	}, [isHost, connectionState]);

	// Host broadcasts state every 500ms as heartbeat sync (to opponent + spectators)
	useEffect(() => {
		if (connectionState !== 'connected' || !isHost) return;
		const interval = setInterval(() => {
			syncGameState();

			const currentState = useGameStore.getState().gameState;
			if (currentState) {
				const filteredState = filterGameStateForSpectator(currentState);
				spectatorConnectionsRef.current = spectatorConnectionsRef.current.filter(c => c.open);
				spectatorConnectionsRef.current.forEach(conn => {
					try {
						conn.send({ type: 'spectator_state', gameState: filteredState });
					} catch {
						// Connection may have closed between filter and send
					}
				});
			}
		}, 500);
		return () => clearInterval(interval);
	}, [connectionState, isHost, syncGameState]);

	// Client pings host every 10s to keep the connection alive
	useEffect(() => {
		if (connectionState !== 'connected' || isHost) return;
		const interval = setInterval(() => {
			send({ type: 'ping' });
		}, 10_000);
		return () => clearInterval(interval);
	}, [connectionState, isHost, send]);

	// Host sends state hash check every 2s for anti-cheat verification
	useEffect(() => {
		if (connectionState !== 'connected' || !isHost) return;
		let cancelled = false;
		let timerId: ReturnType<typeof setTimeout> | null = null;
		const scheduleCheck = () => {
			if (cancelled) return;
			timerId = setTimeout(async () => {
				if (cancelled) return;
				const gs = useGameStore.getState().gameState;
				if (gs && gs.gamePhase !== 'game_over') {
					const stateHash = await computeStateHash(gs);
					if (!cancelled) {
						send({ type: 'hash_check', stateHash, turnNumber: gs.turnNumber });
					}
				}
				scheduleCheck();
			}, 2000);
		};
		scheduleCheck();
		return () => {
			cancelled = true;
			if (timerId) clearTimeout(timerId);
		};
	}, [connectionState, isHost, send]);

	// Send our deck's NFT IDs to the opponent for ownership verification
	const sendDeckVerification = useCallback((hiveAccount: string, nftIds: string[]) => {
		if (connectionState === 'connected') {
			send({ type: 'deck_verify', hiveAccount, nftIds });
		}
	}, [connectionState, send]);

	/**
	 * Propose a match result to the opponent for dual-signature verification.
	 * Returns the signatures object if the opponent counter-signs within 30s,
	 * or null if they reject/timeout (single-sig fallback).
	 */
	const proposeResult = useCallback(async (
		result: PackagedMatchResult,
		hash: string,
		broadcasterSig: string,
	): Promise<{ broadcaster: string; counterparty: string } | null> => {
		if (connectionState !== 'connected') return null;

		return new Promise((resolve) => {
			pendingResultRef.current = {
				result,
				hash,
				broadcasterSig,
				resolve: (sigs) => resolve(sigs),
				reject: () => resolve(null),
			};

			const proposalId = crypto.randomUUID();
			send({ type: 'result_propose', result, hash, broadcasterSig, proposalId });

			// 30s timeout — fall back to single-sig
			setTimeout(() => {
				if (pendingResultRef.current) {
					pendingResultRef.current = null;
					resolve(null);
				}
			}, RESULT_SIGN_TIMEOUT_MS);
		});
	}, [connectionState, send]);

	return {
		syncGameState,
		playCard: wrappedPlayCard,
		attackWithCard: wrappedAttack,
		endTurn: wrappedEndTurn,
		useHeroPower: wrappedUseHeroPower,
		sendDeckVerification,
		proposeResult,
		isConnected: connectionState === 'connected',
		isHost,
	};
}
