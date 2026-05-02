import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { usePeerStore } from '../stores/peerStore';
import { useGameStore } from '../stores/gameStore';
import { debug } from '../config/debugConfig';
import { GameState } from '../types';
import { verifyDeckOwnership } from '../../data/blockchain/deckVerification';
import { sha256Hash } from '../../data/blockchain/hashUtils';
import { verifyDeck as verifyDeckOnServer } from '../../data/chainAPI';
import { getNFTBridge } from '../nft';
import type { PackagedMatchResult } from '../../data/blockchain/types';
import { startNewTranscript, getActiveTranscript, clearTranscript, recordSessionEvent, exportSessionLog } from '../../data/blockchain/transcriptBuilder';
import type { GameMove } from '../../data/blockchain/signedMove';
import { getWasmHash, loadWasmEngine } from '../engine/wasmLoader';
import { computeStateHash } from '../engine/engineBridge';
import { isSharedNetworkEnvironment } from '../config/featureFlags';
import { submitSlashEvidence, findExistingMatchResult } from '../../data/blockchain/slashEvidence';
import { GAME_COMMAND_TYPES } from '../core/commands';
import { canonicalQuickHash, type GameCommandEnvelope, type WireGameCommand } from './p2pEnvelope';
import { useWarbandStore, selectArmy } from '../../lib/stores/useWarbandStore';

export type { GameCommandEnvelope, WireGameCommand } from './p2pEnvelope';
export { canonicalQuickHash } from './p2pEnvelope';

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

function generateSalt(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

let moveCounter = 0;
let outgoingSeqCounter = 0;

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
	| GameCommandEnvelope
	| { type: 'gameState'; gameState: GameState; stateHash?: string }
	| { type: 'opponentDisconnected' }
	| { type: 'ping' }
	| { type: 'pong' }
	| { type: 'deck_verify'; hiveAccount: string; nftIds: string[] }
	| { type: 'seed_commit'; commitment: string }
	| { type: 'seed_reveal'; salt: string; hiveUsername?: string }
	| { type: 'army_announcement'; army: import('../types/ChessTypes').ArmySelection }
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
	const connection = usePeerStore(state => state.connection);
	const connectionState = usePeerStore(state => state.connectionState);
	const isHost = usePeerStore(state => state.isHost);
	const send = usePeerStore(state => state.send);

	const playCard = useGameStore(state => state.playCard);
	const attackWithCard = useGameStore(state => state.attackWithCard);
	const endTurn = useGameStore(state => state.endTurn);
	const performHeroPower = useGameStore(state => state.performHeroPower);
	const applyOpponentCommandToStore = useGameStore(state => state.applyOpponentCommand);
	const lastSyncRef = useRef<number>(0);
	const messageQueueRef = useRef<P2PMessage[]>([]);
	const isProcessingRef = useRef(false);
	const initSentRef = useRef(false);

	// Rate limiting: max 5 action messages per second from opponent
	const actionTimestampsRef = useRef<number[]>([]);
	const MAX_ACTIONS_PER_SEC = 5;

	// Session binding: matchId derived from seed exchange
	const matchIdRef = useRef<string | null>(null);
	// Per-session seq tracking: monotonic, contiguous, reset on new session
	const lastIncomingSeqRef = useRef<number>(-1);
	// Identity binding: opponent's Hive username from seed_reveal
	const opponentUsernameRef = useRef<string | null>(null);
	const pendingSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Commit-reveal seed exchange state
	const mySaltRef = useRef<string | null>(null);
	const theirCommitmentRef = useRef<string | null>(null);
	const seedResolvedRef = useRef(false);

	// Slash dedup: only submit one slash per turn
	const lastSlashTurnRef = useRef<number>(-1);

	// Command dedup: track commandIds (UUIDs from envelope) we've already applied so a
	// duplicate envelope (network retry, buffered replay after reconnect, malicious
	// resend) is rejected before re-applying its mutation. Defense-in-depth alongside
	// the seq-contiguity check — seq alone catches simple duplicates but doesn't
	// survive a peer-side seq counter reset; commandId is globally unique per envelope.
	// Bounded ring (Set + insertion-order array) prevents unbounded memory growth on
	// long matches while keeping recent IDs for replay rejection.
	const SEEN_COMMAND_IDS_MAX = 256;
	const seenCommandIdsRef = useRef<Set<string>>(new Set());
	const seenCommandIdsOrderRef = useRef<string[]>([]);

	// Last envelope send timestamp — used by `sendCommandEnvelope` to enforce a
	// short cooldown that avoids the prevStateHash race when the user clicks
	// faster than the host's gameState sync round-trip. Reset on disconnect via
	// the seed-exchange useEffect cleanup branch.
	const lastEnvelopeSentAtRef = useRef<number>(0);

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
			outgoingSeqCounter = 0;
			lastIncomingSeqRef.current = -1;
			seenCommandIdsRef.current.clear();
			seenCommandIdsOrderRef.current.length = 0;
			lastEnvelopeSentAtRef.current = 0;
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

		// Announce our selected army so the opponent can render our actual hero
		// portraits (and the host can build a gameState with both armies before
		// sending the `init`). Without this both sides initialize with the
		// hardcoded `getDefaultArmySelection()` fallback.
		try {
			const ourArmy = selectArmy(useWarbandStore.getState());
			if (ourArmy) {
				send({ type: 'army_announcement', army: ourArmy });
				debug.log('[useP2PSync] Sent army_announcement:', { king: ourArmy.king?.name });
			} else {
				debug.warn('[useP2PSync] No local army to announce — opponent will see default fallback');
			}
		} catch (err) {
			debug.warn('[useP2PSync] Failed to send army_announcement:', err);
		}

		// Cross-verify deck NFT ownership: send our deck's NFT IDs so opponent can verify on-chain
		if (isSharedNetworkEnvironment()) {
			try {
				const bridge = getNFTBridge();
				const username = bridge.getUsername();
				if (username) {
					const collection = bridge.getCardCollection();
					const nftIds = collection
						.filter(card => card.ownershipSource === 'nft')
						.map(c => c.uid ?? '')
						.filter(Boolean);
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

		// Owner of `activeTranscript`: this effect started it, so it cleans it up on
		// unmount or dep change. The early-return branch above also calls clearTranscript
		// when the connection drops mid-mount; this return covers the unmount path
		// (e.g., user navigates away while connected) where the early-return never fires.
		// `clearTranscript` is idempotent — safe if both paths run on a state transition.
		return () => {
			clearTranscript();
		};
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

			if (isSharedNetworkEnvironment()) {
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

		// Track heartbeat reception for diagnostics; log once on first arrival to confirm
		// the listener is wired, then again every 30s so the user can see the connection
		// is alive without spamming the console.
		let heartbeatLogState = { firstSeen: false, lastLoggedAt: 0 };
		const processMessage = async (data: P2PMessage) => {
			// Heartbeat keepalive — handle before switch (not a game message)
			if ((data as { type: string }).type === 'heartbeat') {
				usePeerStore.getState().handleHeartbeat();
				const now = Date.now();
				if (!heartbeatLogState.firstSeen) {
					debug.log('[useP2PSync] First heartbeat received from opponent — connection alive');
					heartbeatLogState = { firstSeen: true, lastLoggedAt: now };
				} else if (now - heartbeatLogState.lastLoggedAt > 30_000) {
					debug.log('[useP2PSync] Heartbeats flowing (alive, last 30s)');
					heartbeatLogState.lastLoggedAt = now;
				}
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
					// Canonicalize to host perspective before hashing so both peers operate
					// on the same byte layout. The host stores `players.player = host`;
					// the client stores `players.player = client` (post-flip in the init/
					// gameState handlers). Without this flip the WASM hash always mismatches
					// because the byte order of `players.player` vs `players.opponent` differs.
					const canonicalState = isHost ? gs : flipGameState(gs);
					const myHash = await computeStateHash(canonicalState);
					if (myHash !== data.stateHash) {
						debug.error(`[useP2PSync] State hash mismatch at turn ${data.turnNumber}: local=${myHash.slice(0, 16)}, remote=${data.stateHash.slice(0, 16)}`);
						send({ type: 'hash_mismatch', turnNumber: data.turnNumber, myHash });
						toast.error('State verification failed', {
							description: 'Game state diverged from opponent. Possible cheating detected.',
							duration: 8000,
						});

						if (isSharedNetworkEnvironment() && data.turnNumber !== lastSlashTurnRef.current) {
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

					if (isSharedNetworkEnvironment()) {
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
						// Build the host's authoritative gameState deterministically
						// from matchSeed. Replaces the prior "reshuffle decks of the
						// module-load random state" path, which left hands and
						// instanceIds non-deterministic.
						useGameStore.getState().initGameWithSeed(matchSeed);
						usePeerStore.getState().setP2pInitApplied(true);

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
						usePeerStore.getState().setP2pInitApplied(true);
					}
					break;

				case 'game_command':
					if (isHost) {
						const reject = (cause: string): void => {
							debug.warn(`[useP2PSync] game_command rejected: ${cause}`, {
								seq: data.seq,
								commandType: data.command?.type,
							});
							recordSessionEvent('command_rejected', {
								cause,
								seq: data.seq,
								commandType: data.command?.type,
							});
						};

						const expectedMatchId = matchIdRef.current;
						if (!expectedMatchId) {
							reject('no_match_id_yet');
							break;
						}
						if (data.matchId !== expectedMatchId) {
							reject('match_id_mismatch');
							break;
						}

						const expectedSeq = lastIncomingSeqRef.current + 1;
						if (data.seq !== expectedSeq) {
							reject(`seq_non_contiguous_expected_${expectedSeq}_got_${data.seq}`);
							break;
						}

						// commandId dedup — defense-in-depth alongside seq. Catches replays that
						// somehow bypass seq (e.g., a buggy peer that resets its counter mid-game).
						if (typeof data.commandId !== 'string' || data.commandId.length === 0) {
							reject('missing_command_id');
							break;
						}
						if (seenCommandIdsRef.current.has(data.commandId)) {
							reject(`duplicate_command_id_${data.commandId.slice(0, 8)}`);
							break;
						}

						// prevStateHash is required and must match. Earlier code short-circuited
						// when `data.prevStateHash` was falsy — that allowed a sender to bypass
						// the integrity check by omitting the field. With sender-side
						// canonicalQuickHash always producing a string (empty only when state
						// is null, which shouldn't happen during play), we can validate
						// strictly: non-empty string + exact match.
						if (typeof data.prevStateHash !== 'string' || data.prevStateHash.length === 0) {
							reject('missing_prev_state_hash');
							break;
						}
						const localPrevHash = canonicalQuickHash(useGameStore.getState().gameState, true);
						if (data.prevStateHash !== localPrevHash) {
							reject(`prev_state_hash_mismatch_local_${localPrevHash}_got_${data.prevStateHash}`);
							break;
						}

						const nowEnvelope = Date.now();
						actionTimestampsRef.current = actionTimestampsRef.current.filter(t => nowEnvelope - t < 1000);
						if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) {
							reject('rate_limit_exceeded');
							break;
						}
						actionTimestampsRef.current.push(nowEnvelope);

						const gs = useGameStore.getState().gameState;
						if (gs.currentTurn !== 'opponent' || gs.gamePhase === 'game_over') {
							reject('not_opponent_turn_or_game_over');
							break;
						}

						const wireCommand = data.command;
						if (!wireCommand || typeof wireCommand !== 'object') {
							reject('malformed_command');
							break;
						}

						// Mark a successfully-applied envelope: advance seq, register commandId
						// in the dedup ring (FIFO eviction at SEEN_COMMAND_IDS_MAX), and trigger
						// the post-apply sync to the peer. Fails-fast with `false` if the dedup
						// ring is corrupt — but `add` cannot fail, so this always returns `true`.
						const markCommandApplied = (): void => {
							lastIncomingSeqRef.current = data.seq;
							seenCommandIdsRef.current.add(data.commandId);
							seenCommandIdsOrderRef.current.push(data.commandId);
							while (seenCommandIdsOrderRef.current.length > SEEN_COMMAND_IDS_MAX) {
								const evicted = seenCommandIdsOrderRef.current.shift();
								if (evicted !== undefined) seenCommandIdsRef.current.delete(evicted);
							}
						};

						// Payload existence pre-check helpers. Rejecting BEFORE applyOpponentCommand
						// saves CPU on a flood of bogus IDs. From host POV the opponent's data
						// is gs.players.opponent.* and our own is gs.players.player.*.
						const HERO_TARGET_IDS = new Set(['player-hero', 'opponent-hero']);
						const isMinionInBattlefield = (id: string): boolean => (
							gs.players.opponent.battlefield.some(c => c.instanceId === id)
							|| gs.players.player.battlefield.some(c => c.instanceId === id)
						);

						// Lightweight payload validation; wireCommand is already a discriminated union.
						switch (wireCommand.type) {
							case GAME_COMMAND_TYPES.playCard:
								if (typeof wireCommand.cardId !== 'string' || wireCommand.cardId.length > 64) {
									reject('invalid_play_card_payload');
									break;
								}
								if (!gs.players.opponent.hand.some(c => c.instanceId === wireCommand.cardId)) {
									reject('play_card_id_not_in_opponent_hand');
									break;
								}
								if (wireCommand.targetId !== undefined
									&& !HERO_TARGET_IDS.has(wireCommand.targetId)
									&& !isMinionInBattlefield(wireCommand.targetId)) {
									reject('play_card_target_not_found');
									break;
								}
								recordMove('playCard', {
									cardId: wireCommand.cardId,
									targetId: wireCommand.targetId,
									targetType: wireCommand.targetType,
									insertionIndex: wireCommand.insertionIndex,
									commandId: data.commandId,
									seq: data.seq,
								}, 'opponent');
								applyOpponentCommandToStore(wireCommand);
								markCommandApplied();
								debouncedSync();
								break;
							case GAME_COMMAND_TYPES.attack:
								if (typeof wireCommand.attackerId !== 'string' || wireCommand.attackerId.length > 64) {
									reject('invalid_attack_payload');
									break;
								}
								if (wireCommand.defenderId !== undefined && (typeof wireCommand.defenderId !== 'string' || wireCommand.defenderId.length > 64)) {
									reject('invalid_attack_payload');
									break;
								}
								if (!gs.players.opponent.battlefield.some(c => c.instanceId === wireCommand.attackerId)) {
									reject('attack_attacker_not_on_opponent_battlefield');
									break;
								}
								if (wireCommand.defenderId !== undefined
									&& !HERO_TARGET_IDS.has(wireCommand.defenderId)
									&& !gs.players.player.battlefield.some(c => c.instanceId === wireCommand.defenderId)) {
									reject('attack_defender_not_on_player_battlefield');
									break;
								}
								recordMove('attack', {
									attackerId: wireCommand.attackerId,
									defenderId: wireCommand.defenderId,
									commandId: data.commandId,
									seq: data.seq,
								}, 'opponent');
								applyOpponentCommandToStore(wireCommand);
								markCommandApplied();
								debouncedSync();
								break;
							case GAME_COMMAND_TYPES.endTurn:
								recordMove('endTurn', {
									commandId: data.commandId,
									seq: data.seq,
								}, 'opponent');
								applyOpponentCommandToStore(wireCommand);
								markCommandApplied();
								debouncedSync();
								break;
							case GAME_COMMAND_TYPES.useHeroPower:
								if (wireCommand.targetId !== undefined
									&& !HERO_TARGET_IDS.has(wireCommand.targetId)
									&& !isMinionInBattlefield(wireCommand.targetId)) {
									reject('hero_power_target_not_found');
									break;
								}
								recordMove('useHeroPower', {
									targetId: wireCommand.targetId,
									commandId: data.commandId,
									seq: data.seq,
								}, 'opponent');
								applyOpponentCommandToStore(wireCommand);
								markCommandApplied();
								debouncedSync();
								break;
							default:
								reject(`unknown_command_type_${(wireCommand as { type: string }).type}`);
						}
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

				case 'pong':
					// Residual ack of our ping (legacy keepalive scheme — modern keepalive
					// is the dedicated `heartbeat` message handled at the top). No action
					// needed; just silently consume so the default branch doesn't log a
					// spurious "Unknown message type: pong" warning.
					break;

				case 'army_announcement':
					// Opponent announced their selected army. Store so the match coordinator
					// can render the real hero portraits instead of the default fallback.
					if (data.army && typeof data.army === 'object') {
						usePeerStore.getState().setOpponentArmy(data.army);
						debug.log('[useP2PSync] Opponent army received:', {
							king: data.army.king?.name,
							queen: data.army.queen?.name,
							rook: data.army.rook?.name,
						});
					}
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

					if (isSharedNetworkEnvironment() && data.result.matchId) {
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

		// Connection-scoped cancellation flag. Closed over by `processQueue` so a
		// long-running message processing loop bails out as soon as React unmounts
		// the hook (or `connection`/`connectionState` deps change). Without this,
		// `await processMessage(msg)` could continue post-cleanup, firing toasts /
		// audio / transcript writes against a session that no longer exists. Local
		// (not useRef) so each connection epoch starts fresh — no carry-over from
		// the previous cleanup.
		let cancelled = false;

		const processQueue = async () => {
			if (isProcessingRef.current) return;
			isProcessingRef.current = true;
			try {
				while (messageQueueRef.current.length > 0) {
					if (cancelled) {
						messageQueueRef.current.length = 0;
						break;
					}
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
		debug.log('[useP2PSync] Data listener attached to connection (heartbeats will now be processed)');

		return () => {
			cancelled = true;
			connection.off('data', handleMessageWrapper);
			debug.log('[useP2PSync] Data listener detached');
			if (pendingSyncRef.current) {
				clearTimeout(pendingSyncRef.current);
				pendingSyncRef.current = null;
			}
		};
	}, [connection, connectionState, isHost, send, playCard, attackWithCard, endTurn, performHeroPower, applyOpponentCommandToStore]);

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

	const sendCommandEnvelope = useCallback((command: WireGameCommand): void => {
		const matchId = matchIdRef.current ?? '';
		if (!matchId) {
			debug.warn('[useP2PSync] sendCommandEnvelope skipped: no matchId yet');
			return;
		}
		// Cooldown to avoid the fast-double-click race: client (!isHost) doesn't
		// apply commands locally — its state stays at the pre-command hash until
		// host's gameState sync arrives. A second envelope sent within the round-
		// trip window carries the SAME prevStateHash as the first, but the host
		// has already advanced. The host then rejects with `prev_state_hash_mismatch`
		// and the user's second action is silently lost. Cooldown (250ms) is well
		// under typical human click cadence (~300-500ms) and well over LAN RTT
		// (~50-100ms), so legitimate consecutive actions still flow through.
		const ENVELOPE_COOLDOWN_MS = 250;
		const nowSend = Date.now();
		if (nowSend - lastEnvelopeSentAtRef.current < ENVELOPE_COOLDOWN_MS) {
			debug.warn(`[useP2PSync] envelope cooldown active (${nowSend - lastEnvelopeSentAtRef.current}ms since last) — dropping ${command.type}`);
			toast.error('Action too fast — wait for opponent to sync', { duration: 1500 });
			return;
		}
		lastEnvelopeSentAtRef.current = nowSend;

		const localState = useGameStore.getState().gameState;
		const prevStateHash = canonicalQuickHash(localState, isHost);
		const envelope: GameCommandEnvelope = {
			type: 'game_command',
			matchId,
			seq: outgoingSeqCounter++,
			commandId: crypto.randomUUID(),
			prevStateHash,
			command,
		};
		send(envelope);
	}, [send, isHost]);

	// Sender wrappers: when the local player is the P2P client, the command travels
	// in the SENDER's perspective (e.g. `targetId: 'opponent-hero'` means "the host's hero
	// from the client's POV"). The host's applyOpponentCommand swaps player/opponent
	// before applying — no perspective translation is performed at the wire level.
	const wrappedPlayCard = useCallback((cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number) => {
		recordMove('playCard', { cardId, targetId, targetType, insertionIndex }, 'player');
		if (connectionState === 'connected' && !isHost) {
			sendCommandEnvelope({
				type: GAME_COMMAND_TYPES.playCard,
				cardId,
				targetId,
				targetType,
				insertionIndex,
			});
		} else {
			playCard(cardId, targetId, targetType, insertionIndex);
			if (isHost) debouncedSync();
		}
	}, [connectionState, isHost, playCard, debouncedSync, sendCommandEnvelope]);

	const wrappedAttack = useCallback((attackerId: string, defenderId: string) => {
		recordMove('attack', { attackerId, defenderId }, 'player');
		if (connectionState === 'connected' && !isHost) {
			sendCommandEnvelope({
				type: GAME_COMMAND_TYPES.attack,
				attackerId,
				defenderId,
			});
		} else {
			attackWithCard(attackerId, defenderId);
			if (isHost) debouncedSync();
		}
	}, [connectionState, isHost, attackWithCard, debouncedSync, sendCommandEnvelope]);

	const wrappedEndTurn = useCallback(() => {
		recordMove('endTurn', {}, 'player');
		if (connectionState === 'connected' && !isHost) {
			sendCommandEnvelope({ type: GAME_COMMAND_TYPES.endTurn });
		} else {
			endTurn();
			if (isHost) debouncedSync();
		}
	}, [connectionState, isHost, endTurn, debouncedSync, sendCommandEnvelope]);

	const wrappedUseHeroPower = useCallback((targetId?: string) => {
		recordMove('useHeroPower', { targetId }, 'player');
		if (connectionState === 'connected' && !isHost) {
			sendCommandEnvelope({
				type: GAME_COMMAND_TYPES.useHeroPower,
				targetId,
				targetType: 'card',
			});
		} else {
			performHeroPower(targetId, 'card');
			if (isHost) debouncedSync();
		}
	}, [connectionState, isHost, performHeroPower, debouncedSync, sendCommandEnvelope]);

	const downloadSessionLog = useCallback((): void => {
		try {
			const blob = exportSessionLog({
				matchId: matchIdRef.current,
				buildHash: typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev',
				connectionState,
				isHost,
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `ragnarok-session-${matchIdRef.current ?? 'unmatched'}-${Date.now()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			debug.error('[useP2PSync] downloadSessionLog failed:', err);
		}
	}, [connectionState, isHost]);

	// Host broadcasts state every 500ms as heartbeat sync to the opponent.
	// (Spectator broadcast was removed — see Patch-WebRTC.2; replaced
	// post-beta by a transcript-based replay viewer, TD-25.)
	useEffect(() => {
		if (connectionState !== 'connected' || !isHost) return;
		const interval = setInterval(() => {
			syncGameState();
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
	 * or null if they reject/timeout. Ranked broadcasters must treat null as
	 * a blocked result, not as permission to publish a single-sig result.
	 */
	const proposeResult = useCallback(async (
		result: PackagedMatchResult,
		hash: string,
		broadcasterSig: string,
	): Promise<{ broadcaster: string; counterparty: string } | null> => {
		if (connectionState !== 'connected') return null;

		return new Promise((resolve) => {
			// Capture the timeout id so the success/reject paths can clear it
			// instead of letting it run to completion (it's a no-op once
			// `pendingResultRef.current` is null, but clearing is cheaper than
			// letting a 30s timer wait around for nothing).
			let timeoutId: ReturnType<typeof setTimeout> | null = null;

			const settle = (sigs: { broadcaster: string; counterparty: string } | null) => {
				if (timeoutId !== null) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
				resolve(sigs);
			};

			pendingResultRef.current = {
				result,
				hash,
				broadcasterSig,
				resolve: (sigs) => settle(sigs),
				reject: () => settle(null),
			};

			const proposalId = crypto.randomUUID();
			send({ type: 'result_propose', result, hash, broadcasterSig, proposalId });

			// 30s timeout — fall back to single-sig
			timeoutId = setTimeout(() => {
				if (pendingResultRef.current) {
					pendingResultRef.current = null;
					settle(null);
				}
			}, RESULT_SIGN_TIMEOUT_MS);
		});
	}, [connectionState, send]);

	return {
		syncGameState,
		playCard: wrappedPlayCard,
		attackWithCard: wrappedAttack,
		endTurn: wrappedEndTurn,
		performHeroPower: wrappedUseHeroPower,
		sendDeckVerification,
		proposeResult,
		downloadSessionLog,
		isConnected: connectionState === 'connected',
		isHost,
	};
}
