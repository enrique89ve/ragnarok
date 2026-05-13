import { useEffect, useRef, useCallback } from 'react';
import { GameEventBus } from '../../../../../core/events/GameEventBus';
import { usePeerStore } from '../../../../stores/peerStore';
import { useMatchStore } from '../../../store';
import { deriveAuthority } from '../../../derived';
import { useGameStore } from '../../../../stores/gameStore';
import { debug } from '../../../../config/debugConfig';
import { verifyDeckOwnership } from '../../../../../data/blockchain/deckVerification';
import { sha256Hash } from '../../../../../data/blockchain/hashUtils';
import { verifyDeckClaims as verifyDeckClaimsOnServer } from '../../../../../data/chainAPI';
import { getNFTBridge } from '../../../../nft';
import type { PackagedMatchResult } from '../../../../../data/blockchain/types';
import { NftUidSchema } from '../../../../../../../shared/protocol-core/playerCollection';
import type { DeckCardClaim } from '../../../../../../../shared/protocol-core/deckVerification';
import { startNewTranscript, clearTranscript, recordSessionEvent, exportSessionLog, recordMove } from '../../../../../data/blockchain/transcriptBuilder';
import { localPlayerId, remotePlayerId } from '../../../../../data/blockchain/playerIdentity';
import { getWasmHash, loadWasmEngine } from '../../../../engine/wasmLoader';
import { computeStateHash } from '../../../../engine/engineBridge';
import { flipGameState, computeCardsPrevStateHash } from '../../../../engine/wireHash';
import { computeChessPrevStateHash } from '../../../../engine/chessHash';
import { isSharedNetworkEnvironment } from '../../../../config/featureFlags';
import { submitSlashEvidence, findExistingMatchResult } from '../../../../../data/blockchain/slashEvidence';
import { GAME_COMMAND_TYPES } from '../../../../core/commands';
import type { GameCommandEnvelope, WireGameCommand } from '../../../../hooks/p2pEnvelope';
import { useWarbandStore, selectArmy } from '../../../../../lib/stores/useWarbandStore';
import { deriveCanonicalSide, isChessAttackInstantKill, tryParseChessCommandEnvelope, type ChessAttackPieceKind, type ChessCommandEnvelope } from '../../../../../../../shared/p2p-wire/chess';
import { resetChessWireSender, setChessSendObserver } from '../../../../p2p/chessWireSender';
import type { P2PMessage } from '../../../../p2p/messages';
import { parseWireMessage } from '../../../../p2p/messageSchemas';

export type { GameCommandEnvelope, WireGameCommand } from '../../../../hooks/p2pEnvelope';
export type { P2PMessage } from '../../../../p2p/messages';

declare const __BUILD_HASH__: string;

function generateSalt(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// `moveCounter` was lifted into transcriptBuilder.ts (singleton-scoped) so
// chessWireSender can share the same monotonic counter for chess moves.
let outgoingSeqCounter = 0;
// Chess wire is symmetric P2P (Plan B): both peers send and apply
// chess_command envelopes independently — no host-only routing. The
// outgoing seq counter for chess lives in the dedicated `chessWireSender`
// module so the chess UI can emit without dragging in this hook's
// internals; it's reset on disconnect via `resetChessWireSender()` below.

// `recordMove` + `moveCounter` previously lived here as module-locals. Both
// were lifted into `transcriptBuilder.ts` so the chess send path (`chessWireSender`,
// not a hook) can record without dragging in this file's React context. The
// counter must be a singleton — splitting it would break monotonic moveNumber
// across the cards / chess / poker entry points.

const RESULT_SIGN_TIMEOUT_MS = 30_000;

export function useWireSync() {
	const connection = usePeerStore(state => state.connection);
	const connectionState = usePeerStore(state => state.connectionState);
	// Two semantic views on the same WS-resolved bit:
	//   - `isWsHost` — WS-resolved host hint. Used by the seed_reveal handshake to
	//     derive the canonical chess side via `deriveCanonicalSide(matchSeed,
	//     isWsHost)`. This is the legitimate use of the WS hint.
	//   - `isCardsAuthority` — "am I authoritative for cards game commands?". Today
	//     cards is host-auth so this aliases isWsHost. OPEN-8 will migrate cards
	//     to symmetric (chess-style); when that lands, isCardsAuthority disappears
	//     and `isFirstMover` (below, derived from Authority) becomes the gate.
	//     Audit grep target during the migration.
	const isWsHost = usePeerStore(state => state.isHost);
	const isCardsAuthority = isWsHost;
	// `isFirstMover` is the canonical symmetric-protocol concept (chess uses it
	// implicitly; cards will after OPEN-8). Derived from MatchContext.activeMatch
	// via `deriveAuthority`. Today no chess auth code reads isHost, so this
	// stays unread — but the subscription is the migration anchor: when OPEN-8
	// lands, swap `isCardsAuthority` → `isFirstMover` site by site.
	const activeMatchForAuthority = useMatchStore(state => state.activeMatch);
	const _authority = activeMatchForAuthority ? deriveAuthority(activeMatchForAuthority) : null;
	const isFirstMover = _authority?.kind === 'p2p-symmetric' && _authority.myRole === 'first-mover';
	void isFirstMover; // Intentional: reserved for OPEN-8 migration (see comment above).
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

	// Slash dedup: one cards-slash + one chess-slash per turn at most. Tracked
	// independently because cards and chess hash checks are independent
	// detections — a turn can plausibly fail one without the other (e.g.
	// chess-only mutation that doesn't touch cards GameState).
	const lastSlashTurnRef = useRef<number>(-1);
	const lastChessSlashTurnRef = useRef<number>(-1);

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

	// Chess-wire dedup ring + monotonic seq tracking. Independent of the
	// cards-wire counters above so chess and poker phases don't share seq
	// space (would otherwise look like seq gaps when phases switch).
	const lastIncomingChessSeqRef = useRef<number>(-1);
	const seenChessCommandIdsRef = useRef<Set<string>>(new Set());
	const seenChessCommandIdsOrderRef = useRef<string[]>([]);

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

	// Chess send observer (C3): centralise transcript writes for outgoing
	// chess envelopes. The chess UI calls `sendChessMove`/`sendChessAttack`
	// which build+send the envelope; this observer fires post-send and
	// records the move under the bridge's identity policy. Mounted once
	// per bridge lifetime so transcripts always go through one chokepoint
	// (audit point for OPEN-2 deterministic ordering).
	useEffect(() => {
		setChessSendObserver((envelope, transcriptExtra) => {
			recordMove(envelope.command.type, {
				pieceId: envelope.command.pieceId,
				from: envelope.command.from,
				to: envelope.command.to,
				commandId: envelope.commandId,
				seq: envelope.seq,
				...transcriptExtra,
			}, localPlayerId({
				hiveUsername: getNFTBridge().getUsername(),
				myPeerId: usePeerStore.getState().myPeerId,
			}));
		});
		return () => setChessSendObserver(null);
	}, []);

	// Seed exchange: generate salt and send commitment when connection opens
	// Also send version_check and start a new transcript
	useEffect(() => {
		if (!connection || connectionState !== 'connected') {
			mySaltRef.current = null;
			theirCommitmentRef.current = null;
			seedResolvedRef.current = false;
			clearTranscript(); // also resets moveCounter inside the transcript module
			outgoingSeqCounter = 0;
			lastIncomingSeqRef.current = -1;
			seenCommandIdsRef.current.clear();
			seenCommandIdsOrderRef.current.length = 0;
			lastIncomingChessSeqRef.current = -1;
			seenChessCommandIdsRef.current.clear();
			seenChessCommandIdsOrderRef.current.length = 0;
			resetChessWireSender();
			lastEnvelopeSentAtRef.current = 0;
			return;
		}

		loadWasmEngine().then(() => {
			const wasmHash = getWasmHash();
			send({ type: 'wasm_hash_check', wasmHash });
		}).catch(err => {
			GameEventBus.emitNotification({
				level: 'error',
				message: `WASM engine failed to load — ranked play blocked — ${err instanceof Error ? err.message : 'Unknown WASM error'}`,
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
				debug.log('[wireSync] Sent army_announcement:', { king: ourArmy.king?.name });
			} else {
				debug.warn('[wireSync] No local army to announce — opponent will see default fallback');
			}
		} catch (err) {
			debug.warn('[wireSync] Failed to send army_announcement:', err);
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
						debug.combat(`[wireSync] Sent deck_verify: ${nftIds.length} NFTs for @${username}`);
					}
				}
			} catch (err) {
				debug.warn('[wireSync] Failed to send deck verification:', err);
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
		if (!connection || !isCardsAuthority || connectionState !== 'connected') {
			initSentRef.current = false;
			return undefined;
		}
		if (initSentRef.current) return undefined;
		if (!seedResolvedRef.current) {
			const timeout = setTimeout(() => {
				if (!seedResolvedRef.current) {
					debug.error('[wireSync] Seed exchange timed out after 10s');
					GameEventBus.emitNotification({
						level: 'error',
						message: 'Seed exchange timed out. Disconnecting.',
						duration: 5000,
					});
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
	}, [connection, isCardsAuthority, connectionState, send]);

	// Detect when connection closes and notify the player
	useEffect(() => {
		if (!connection) return;

		const handleClose = () => {
			debug.warn('[wireSync] Connection to opponent closed');
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
			GameEventBus.emitNotification({
				level: 'error',
				message: 'Opponent disconnected from the game. The connection was lost. You may need to start a new game.',
				duration: 8000,
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
					}).catch(err => debug.warn('[wireSync] Failed to submit fake_disconnect slash:', err));
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
			// Heartbeat keepalive - handle before game-message dispatch.
			if (data.type === 'heartbeat') {
				usePeerStore.getState().handleHeartbeat();
				const now = Date.now();
				if (!heartbeatLogState.firstSeen) {
					debug.log('[wireSync] First heartbeat received from opponent — connection alive');
					heartbeatLogState = { firstSeen: true, lastLoggedAt: now };
				} else if (now - heartbeatLogState.lastLoggedAt > 30_000) {
					debug.log('[wireSync] Heartbeats flowing (alive, last 30s)');
					heartbeatLogState.lastLoggedAt = now;
				}
				return;
			}

			switch (data.type) {
				case 'version_check': {
					const myHash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
					if (data.buildHash !== myHash && data.buildHash !== 'dev' && myHash !== 'dev') {
						GameEventBus.emitNotification({
							level: 'warning',
							message: `Client version mismatch — your build: ${myHash.slice(0, 7)}, opponent: ${data.buildHash.slice(0, 7)}. Results may differ.`,
							duration: 8000,
						});
					}
					break;
				}

				case 'wasm_hash_check': {
					const myWasmHash = getWasmHash();
					const theirWasmHash = data.wasmHash;
					if (theirWasmHash !== myWasmHash && theirWasmHash !== 'dev' && myWasmHash !== 'dev') {
						GameEventBus.emitNotification({
							level: 'error',
							message: `WASM engine mismatch — disconnecting. Your engine: ${myWasmHash.slice(0, 12)}…, opponent: ${theirWasmHash.slice(0, 12)}…. Both players must use the same game version.`,
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
					const canonicalState = isCardsAuthority ? gs : flipGameState(gs);
					const myHash = await computeStateHash(canonicalState);
					if (myHash !== data.stateHash) {
						debug.error(`[wireSync] Cards state hash mismatch at turn ${data.turnNumber}: local=${myHash.slice(0, 16)}, remote=${data.stateHash.slice(0, 16)}`);
						send({ type: 'hash_mismatch', turnNumber: data.turnNumber, myHash });
						GameEventBus.emitNotification({
							level: 'error',
							message: 'State verification failed — game state diverged from opponent. Possible cheating detected.',
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
									trxId2: `hash_check_fail_cards_turn_${data.turnNumber}_${myHash.slice(0, 16)}`,
									notes: `Cards hash check failed at turn ${data.turnNumber}. Local: ${myHash.slice(0, 16)}, remote: ${data.stateHash.slice(0, 16)}`,
								}).catch(err => debug.warn('[wireSync] Failed to submit forged_move slash:', err));
							}
						}
					}

					// Chess hash check (TD-27c-chess F3). Empty on either side means
					// well-known race ('' from sender = no chess phase or WASM not
					// ready; '' from local = same on receiver). Skip rather than
					// reject — periodic beacon will retry in 2s.
					if (data.chessStateHash.length > 0) {
						const beaconCombatStore = (globalThis as Record<string, unknown>)
							.__ragnarokCombatStore as { getState: () => { boardState?: Parameters<typeof computeChessPrevStateHash>[0] } } | undefined;
						const localChessSnapshot = beaconCombatStore?.getState().boardState ?? null;
						const myChessHash = computeChessPrevStateHash(localChessSnapshot);
						const localChessMoveCount = localChessSnapshot?.moveCount ?? -1;
						// Skip when the beacon is from a different chess turn than
						// our local state. The 2s beacon period is much slower than
						// chess move latency, so any active-play beacon is almost
						// always stale — comparing hashes across moveCounts is a
						// guaranteed false positive. Idle drift (the beacon's actual
						// purpose) keeps both peers on the same moveCount, so the
						// compare still fires there.
						const moveCountsMatch = data.chessMoveCount >= 0
							&& localChessMoveCount >= 0
							&& data.chessMoveCount === localChessMoveCount;
						if (moveCountsMatch && myChessHash.length > 0 && myChessHash !== data.chessStateHash) {
							debug.error(`[wireSync] Chess state hash mismatch at turn ${data.turnNumber}: local=${myChessHash.slice(0, 16)}, remote=${data.chessStateHash.slice(0, 16)}`);
							GameEventBus.emitNotification({
								level: 'error',
								message: 'Chess board verification failed — chess state diverged from opponent. Possible cheating detected.',
								duration: 8000,
							});

							if (isSharedNetworkEnvironment() && data.turnNumber !== lastChessSlashTurnRef.current) {
								lastChessSlashTurnRef.current = data.turnNumber;
								const matchSeed = useGameStore.getState().matchSeed;
								const opponentName = usePeerStore.getState().remotePeerId ?? 'unknown';
								if (matchSeed) {
									submitSlashEvidence({
										matchId: matchSeed,
										offender: opponentName,
										reason: 'forged_move',
										trxId1: matchSeed,
										trxId2: `hash_check_fail_chess_turn_${data.turnNumber}_${myChessHash.slice(0, 16)}`,
										notes: `Chess hash check failed at turn ${data.turnNumber}. Local: ${myChessHash.slice(0, 16)}, remote: ${data.chessStateHash.slice(0, 16)}`,
									}).catch(err => debug.warn('[wireSync] Failed to submit chess forged_move slash:', err));
								}
							}
						}
					}
					break;
				}

				case 'hash_mismatch':
					debug.error(`[wireSync] Opponent reports hash mismatch at turn ${data.turnNumber}: theirHash=${data.myHash.slice(0, 16)}`);
					GameEventBus.emitNotification({
						level: 'error',
						message: 'State verification failed — opponent detected state divergence. Game integrity compromised.',
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
							}).catch(err => debug.warn('[wireSync] Failed to submit forged_move slash:', err));
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
						debug.warn('[wireSync] Received seed_reveal before seed_commit');
						break;
					}

					const expectedCommitment = await sha256Hash(theirSalt);
					if (expectedCommitment !== theirCommitment) {
						debug.error('[wireSync] Seed commitment mismatch — possible cheating');
						GameEventBus.emitNotification({
							level: 'error',
							message: 'Seed verification failed. Disconnecting.',
							duration: 5000,
						});
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

					// Derive each peer's canonical chess side from the resolved seed.
					// Both peers compute this BEFORE any chess state initializes so
					// `myCanonicalSide` is available to UI components on first render.
					// `isWsHost` is the WS-resolved hint (see wsTransport handshake).
					const myCanonicalSide = deriveCanonicalSide(matchSeed, isWsHost);
					useGameStore.setState({ matchSeed, myCanonicalSide });

					// Symmetric seeding for the chess phase: both peers mint the
					// same `_chessRng` / `_chessIdGen` from the resolved seed, so
					// mine placement (ginnungagap random tiles, mine ids) and any
					// other chess-side randomness converge across peers. Runs on
					// host AND joiner; gameStore's `initGameWithSeed` below stays
					// host-only (it builds the authoritative initial gameState).
					const combatStore = (globalThis as Record<string, unknown>).__ragnarokCombatStore as
						{ getState: () => { initChessWithSeed?: (seed: string) => void } } | undefined;
					combatStore?.getState().initChessWithSeed?.(matchSeed);

					seedResolvedRef.current = true;

					// Session binding: derive matchId from seed + peer IDs.
					// Sort peer IDs lexicographically (same pattern as the seed
					// derivation above) so BOTH peers hash the same string and
					// arrive at the same matchId. Without sorting, peer A would
					// hash `seed+A+B` and peer B would hash `seed+B+A` — different
					// values, breaking symmetric Plan B chess where both peers
					// validate matchId on incoming chess_command envelopes.
					// (Cards path didn't surface this bug because only the host
					// validates matchId there — the client never compares.)
					// Mirrored onto gameStore so other subsystems (chess wire
					// sender, transcript builder) can read it without coupling
					// to useWireSync internals.
					const [matchIdFirst, matchIdSecond] = myPeerId < remotePeerId
						? [myPeerId, remotePeerId]
						: [remotePeerId, myPeerId];
					const matchId = await sha256Hash(matchSeed + matchIdFirst + matchIdSecond);
					const truncatedMatchId = matchId.slice(0, 16);
					matchIdRef.current = truncatedMatchId;
					useGameStore.setState({ matchId: truncatedMatchId });
					console.log('[wireSync] seed_reveal RESOLVED', {
						matchSeed: matchSeed.slice(0, 12),
						matchId: truncatedMatchId,
						myCanonicalSide,
						isWsHost,
					});

					// Identity binding: capture opponent's Hive username
					if (data.hiveUsername) {
						opponentUsernameRef.current = data.hiveUsername;
					}

					if (isCardsAuthority) {
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
					if (!isCardsAuthority) {
						useGameStore.setState({ gameState: flipGameState(data.gameState) });
						usePeerStore.getState().setP2pInitApplied(true);
					}
					break;

				case 'game_command':
					if (isCardsAuthority) {
						// Resolve the remote peer's transcript identity once for all
						// recordMove sites in this case. Falls back to a guest sentinel
						// when the peer never announced a Hive username during seed_reveal.
						const remoteTranscriptId = remotePlayerId({
							opponentUsername: opponentUsernameRef.current,
							remotePeerId: usePeerStore.getState().remotePeerId,
						});
						const reject = (cause: string): void => {
							debug.warn(`[wireSync] game_command rejected: ${cause}`, {
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
						// `computeCardsPrevStateHash` always producing a string (empty only on
						// pre-init / WASM-not-ready edge cases that shouldn't happen during
						// play), we can validate strictly: non-empty string + exact match.
						if (typeof data.prevStateHash !== 'string' || data.prevStateHash.length === 0) {
							reject('missing_prev_state_hash');
							break;
						}
						const localPrevHash = computeCardsPrevStateHash(useGameStore.getState().gameState, true);
						if (localPrevHash.length === 0) {
							// Receiver-side WASM eager-load race or null gameState. The
							// sender's hash is well-formed; the local recompute returns
							// '' per the documented failure-mode policy. Bouncing the
							// envelope so the sender can retry once WASM finishes
							// initializing avoids spurious mismatches at handshake-time.
							// Mirrors `local_prev_state_hash_unavailable` on the chess
							// branch.
							reject('local_prev_state_hash_unavailable');
							break;
						}
						if (data.prevStateHash !== localPrevHash) {
							reject(`prev_state_hash_mismatch_local_${localPrevHash.slice(0, 16)}_got_${data.prevStateHash.slice(0, 16)}`);
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
								}, remoteTranscriptId);
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
								}, remoteTranscriptId);
								applyOpponentCommandToStore(wireCommand);
								markCommandApplied();
								debouncedSync();
								break;
							case GAME_COMMAND_TYPES.endTurn:
								recordMove('endTurn', {
									commandId: data.commandId,
									seq: data.seq,
								}, remoteTranscriptId);
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
								}, remoteTranscriptId);
								applyOpponentCommandToStore(wireCommand);
								markCommandApplied();
								debouncedSync();
								break;
							default:
								reject(`unknown_command_type_${(wireCommand as { type: string }).type}`);
						}
					}
					break;

				case 'chess_command': {
					// Plan B chess: SYMMETRIC P2P. Both peers receive, validate, and
					// apply chess_command independently — no host-only routing. The
					// canonical board state is identical on both peers (post-3.5),
					// so the same envelope produces the same state transition.
					//
					// Surface (post C-Chess.8):
					//   - chess_move: quiet moves via `executeMove`.
					//   - chess_attack: instant-kill captures only — receiver runs
					//     `startAttackAnimation(attacker, defender, true)` and the
					//     existing animation->completeAttackAnimation->executeInstantKill
					//     chain handles the apply locally.
					// Non-instant captures stay blocked at the UI layer (toast).
					console.log('[wireSync] RECV chess_command', {
						seq: (data as { seq?: unknown }).seq,
						commandId: typeof (data as { commandId?: unknown }).commandId === 'string'
							? ((data as { commandId: string }).commandId).slice(0, 8)
							: undefined,
						isWsHost,
					});
					const reject = (cause: string): void => {
						console.warn(`[wireSync] chess_command REJECTED: ${cause}`, {
							seq: (data as { seq?: unknown }).seq,
							commandId: (data as { commandId?: unknown }).commandId,
						});
						recordSessionEvent('chess_command_rejected', { cause });
					};

					const envelope: ChessCommandEnvelope | null = tryParseChessCommandEnvelope(data);
					if (!envelope) {
						reject('schema_invalid');
						break;
					}

					const expectedMatchId = matchIdRef.current;
					if (!expectedMatchId) {
						reject('no_match_id_yet');
						break;
					}
					if (envelope.matchId !== expectedMatchId) {
						reject('match_id_mismatch');
						break;
					}

					// Symmetric P2P: monotonic-non-decreasing seq instead of strict
					// contiguous. Each peer maintains its OWN outgoing counter; the
					// receiver only needs replay protection (seq must not regress).
					if (envelope.seq < lastIncomingChessSeqRef.current) {
						reject(`seq_regressed_last_${lastIncomingChessSeqRef.current}_got_${envelope.seq}`);
						break;
					}

					if (seenChessCommandIdsRef.current.has(envelope.commandId)) {
						reject(`duplicate_command_id_${envelope.commandId.slice(0, 8)}`);
						break;
					}

					// Rate limit shares the cards/poker bucket.
					const nowChess = Date.now();
					actionTimestampsRef.current = actionTimestampsRef.current.filter(t => nowChess - t < 1000);
					if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) {
						reject('rate_limit_exceeded');
						break;
					}
					actionTimestampsRef.current.push(nowChess);

					// Dual prev-state-hash validation (TD-27c-chess). Empty hashes
					// from the peer mean a well-known race (state pre-init, eager
					// WASM load) — drop without rejecting so the sender can retry on
					// the next attempt; same policy as missing_prev_state_hash on
					// the cards path. Mismatch with non-empty claim is a hard reject
					// with the domain-specific code so post-incident triage points
					// at the right slice.
					{
						const senderChessHash = envelope.prevChessStateHash;
						const senderCardsHash = envelope.prevCardsStateHash;
						if (senderChessHash.length === 0 || senderCardsHash.length === 0) {
							reject('missing_prev_state_hash');
							break;
						}
						// Snapshot read for hashing — uses the same globalThis.__ragnarokCombatStore
						// access pattern as the sibling chess branch below ("preserved here to
						// avoid circular imports"). Shape declared structurally rich (matches
						// `Parameters<typeof computeChessPrevStateHash>[0]` without an opaque
						// trailing cast) so a future drift in `boardState` shape breaks the
						// typecheck instead of slipping past unverified.
						type LocalChessSnapshot = Parameters<typeof computeChessPrevStateHash>[0];
						const hashCombatStore = (globalThis as Record<string, unknown>)
							.__ragnarokCombatStore as { getState: () => { boardState?: LocalChessSnapshot } } | undefined;
						const localChessSnapshot = hashCombatStore?.getState().boardState ?? null;
						const localChessHash = computeChessPrevStateHash(localChessSnapshot);
						const localCardsHash = computeCardsPrevStateHash(
							useGameStore.getState().gameState,
							isCardsAuthority,
						);
						if (localChessHash.length === 0 || localCardsHash.length === 0) {
							// Receiver-side race; ask sender to retry by bouncing the
							// envelope. Same fail-safe as the cards path.
							reject('local_prev_state_hash_unavailable');
							break;
						}
						if (senderChessHash !== localChessHash) {
							reject(`prev_chess_state_hash_mismatch_local_${localChessHash.slice(0, 16)}_got_${senderChessHash.slice(0, 16)}`);
							break;
						}
						if (senderCardsHash !== localCardsHash) {
							reject(`prev_cards_state_hash_mismatch_local_${localCardsHash.slice(0, 16)}_got_${senderCardsHash.slice(0, 16)}`);
							break;
						}
					}

					// Combat store access pattern (D4 of the typescript-senior review —
					// known debt; preserved here to avoid circular imports). Inline
					// type extended with `startAttackAnimation` + `pendingAttackAnimation`
					// for the chess_attack branch, plus piece `type` for the
					// instant-kill predicate.
					interface RemotePieceShape {
						readonly id: string;
						readonly type: ChessAttackPieceKind;
						readonly position: { row: number; col: number };
						readonly owner: 'player' | 'opponent';
					}
					const combatStore = (globalThis as Record<string, unknown>).__ragnarokCombatStore as
						| {
								getState: () => {
									boardState?: {
										pieces?: ReadonlyArray<RemotePieceShape>;
										currentTurn?: 'player' | 'opponent';
									};
									pendingAttackAnimation?: unknown;
									executeMove?: (from: { row: number; col: number }, to: { row: number; col: number }) => void;
									startAttackAnimation?: (attacker: RemotePieceShape, defender: RemotePieceShape, isInstantKill: boolean) => void;
								};
						  }
						| undefined;
					if (!combatStore) {
						reject('combat_store_unavailable');
						break;
					}
					const cs = combatStore.getState();
					const pieces = cs.boardState?.pieces ?? [];

					// Capture command in a const so TS preserves discriminated-union
					// narrowing across the branches below — accessing
					// `envelope.command` repeatedly loses the narrow because TS
					// treats property reads on objects as pessimistic.
					const cmd = envelope.command;

					// Common: locate attacker piece and verify position.
					const attacker = pieces.find(p => p.id === cmd.pieceId);
					if (!attacker) {
						// Divergence diagnostic — dump local roster so we can see
						// what id/owner/position set the receiver has versus what
						// the sender claimed.
						console.warn('[wireSync] chess attacker_not_found roster dump', {
							expectedId: cmd.pieceId,
							commandType: cmd.type,
							from: cmd.from,
							to: cmd.to,
							localPieceCount: pieces.length,
							localIds: pieces.map(p => p.id.slice(0, 8)),
						});
						reject(`attacker_not_found_${cmd.pieceId.slice(0, 8)}`);
						break;
					}
					if (attacker.position.row !== cmd.from.row || attacker.position.col !== cmd.from.col) {
						reject('attacker_position_mismatch');
						break;
					}

					// Common: ownership boundary. Remote can only move their own
					// pieces. `myCanonicalSide` set at seed_reveal; absent => fail
					// closed (no envelope before handshake).
					const mySide = useGameStore.getState().myCanonicalSide;
					if (!mySide) {
						reject('canonical_side_unresolved');
						break;
					}
					if (attacker.owner === mySide) {
						reject('remote_attempting_to_move_my_piece');
						break;
					}
					if (cs.boardState?.currentTurn !== attacker.owner) {
						reject('not_current_turn');
						break;
					}

					// Branch by command discriminator.
					let transcriptAction: 'chess_move' | 'chess_attack';
					let transcriptExtra: Record<string, unknown> = {};

					if (cmd.type === 'chess_move') {
						if (!cs.executeMove) {
							reject('execute_move_unavailable');
							break;
						}
						cs.executeMove(cmd.from, cmd.to);
						transcriptAction = 'chess_move';
					} else {
						// chess_attack — instant-kill capture only.
						const defender = pieces.find(p => p.id === cmd.defenderId);
						if (!defender) {
							console.warn('[wireSync] chess defender_not_found roster dump', {
								expectedId: cmd.defenderId,
								to: cmd.to,
								localPieceCount: pieces.length,
								localIds: pieces.map(p => p.id.slice(0, 8)),
							});
							reject(`defender_not_found_${cmd.defenderId.slice(0, 8)}`);
							break;
						}
						if (defender.position.row !== cmd.to.row || defender.position.col !== cmd.to.col) {
							reject('defender_position_mismatch');
							break;
						}
						if (defender.owner === attacker.owner) {
							reject('cannot_attack_own_piece');
							break;
						}
						if (!isChessAttackInstantKill({ attackerType: attacker.type, defenderType: defender.type })) {
							reject('non_instant_capture_not_supported_p2p');
							break;
						}
						if (cs.pendingAttackAnimation) {
							reject('attack_animation_in_progress');
							break;
						}
						if (!cs.startAttackAnimation) {
							reject('start_attack_animation_unavailable');
							break;
						}
						// Apply: trigger the same animation chain the sender ran.
						// `completeAttackAnimation` (called from the receiver's UI
						// when its animation finishes) sees `isInstantKill=true` and
						// invokes `executeInstantKill` locally — see chessCombatSlice.
						cs.startAttackAnimation(attacker, defender, true);
						transcriptAction = 'chess_attack';
						transcriptExtra = {
							defenderId: cmd.defenderId,
							isInstantKill: true,
						};
					}

					// Mark applied: advance chess seq + register commandId in dedup ring.
					lastIncomingChessSeqRef.current = envelope.seq;
					seenChessCommandIdsRef.current.add(envelope.commandId);
					seenChessCommandIdsOrderRef.current.push(envelope.commandId);
					while (seenChessCommandIdsOrderRef.current.length > SEEN_COMMAND_IDS_MAX) {
						const evicted = seenChessCommandIdsOrderRef.current.shift();
						if (evicted !== undefined) seenChessCommandIdsRef.current.delete(evicted);
					}

					// Transcript: record under the remote peer's Hive identity so
					// the host's merkle root (which goes on-chain via
					// BlockchainSubscriber.ts:279) attributes the action correctly.
					recordMove(transcriptAction, {
						pieceId: cmd.pieceId,
						from: cmd.from,
						to: cmd.to,
						commandId: envelope.commandId,
						seq: envelope.seq,
						...transcriptExtra,
					}, remotePlayerId({
						opponentUsername: opponentUsernameRef.current,
						remotePeerId: usePeerStore.getState().remotePeerId,
					}));

					console.log(`[wireSync] chess_command APPLIED: ${transcriptAction} piece=${cmd.pieceId.slice(0, 8)} (${cmd.from.row},${cmd.from.col})→(${cmd.to.row},${cmd.to.col})`);
					break;
				}

				case 'poker_action':
					if (isCardsAuthority) {
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

						recordMove('poker_action', { action: data.action, hpCommitment: data.hpCommitment }, remotePlayerId({
							opponentUsername: opponentUsernameRef.current,
							remotePeerId: usePeerStore.getState().remotePeerId,
						}));
						if (cState.performAction) {
							cState.performAction(data.playerId, data.action, data.hpCommitment);
						}
						debouncedSync();
					}
					break;

				case 'gameState':
					if (!isCardsAuthority) {
						const flipped = flipGameState(data.gameState);
						// No envelope-level integrity verification (TD-27c-bis): see
						// `syncGameState` for the rationale (DTLS + hash_check cover it).
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
					debug.warn('[wireSync] Opponent disconnected from game');
					GameEventBus.emitNotification({
						level: 'error',
						message: 'Opponent disconnected.',
						duration: 8000,
					});
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
						debug.log('[wireSync] Opponent army received:', {
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
							GameEventBus.emitNotification({
								level: 'error',
								message: `Opponent deck verification failed — ${result.invalidCards.length} card(s) not owned by ${data.hiveAccount}. Disconnecting.`,
								duration: 5000,
							});
							disconnectOnce();
						}
					}).catch(() => { /* IndexedDB unavailable in dev mode — skip */ });

					if (data.hiveAccount && data.nftIds.length > 0) {
						const claims: DeckCardClaim[] = [];
						for (const id of data.nftIds) {
							const parsedUid = NftUidSchema.safeParse(id);
							if (!parsedUid.success) continue;
							claims.push({ authority: 'nft-custody', nftUid: parsedUid.data });
						}

						if (claims.length > 0) {
							verifyDeckClaimsOnServer(data.hiveAccount, claims)
								.then(sv => {
									if (!sv.verified) {
										GameEventBus.emitNotification({
											level: 'error',
											message: `Server deck verification failed — ${sv.rejections.length} card claim(s) rejected for ${data.hiveAccount}. Disconnecting.`,
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
						recordSessionEvent('result_rejected', {
							reason: 'malformed_proposal',
							proposalId: data.proposalId,
							matchId: data.result?.matchId,
							proposerWinner: data.result?.winner?.username,
							proposerLoser: data.result?.loser?.username,
						});
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
									}).catch(err => debug.warn('[wireSync] Failed to submit double_result slash:', err));
								}
							})
							.catch(err => debug.warn('[wireSync] Failed to check existing match result:', err));
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
							recordSessionEvent('result_rejected', {
								reason: 'signing_failed',
								proposalId: data.proposalId,
								matchId: data.result.matchId,
								proposerWinner: data.result.winner.username,
								proposerLoser: data.result.loser.username,
								clientUsername,
								myWinner,
							});
							send({ type: 'result_reject', reason: 'signing_failed' });
						}
					} else if (!clientUsername) {
						recordSessionEvent('result_rejected', {
							reason: 'no_hive_account',
							proposalId: data.proposalId,
							matchId: data.result.matchId,
							proposerWinner: data.result.winner.username,
							proposerLoser: data.result.loser.username,
							myWinner,
						});
						send({ type: 'result_reject', reason: 'no_hive_account' });
					} else {
						// Strong divergence signal — proposer claims one outcome,
						// our local game state disagrees. Persist context for audit.
						recordSessionEvent('result_rejected', {
							reason: 'winner_mismatch',
							proposalId: data.proposalId,
							matchId: data.result.matchId,
							proposerWinner: data.result.winner.username,
							proposerLoser: data.result.loser.username,
							clientUsername,
							myWinner,
						});
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
					debug.warn('[wireSync] Unknown message type:', (data as any).type);
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
						debug.error(`[wireSync] Error processing ${msg.type}:`, err);
					}
				}
			} finally {
				isProcessingRef.current = false;
			}
		};

		const MAX_QUEUE_SIZE = 100;
		const handleMessage = (data: unknown) => {
			// Trust boundary (TD-24a): every payload is validated against the
			// `WireMessage` zod union before it enters the queue. Any envelope
			// with the right discriminator but malformed scalars (missing
			// commandId, non-string prevStateHash, ...) is dropped here, so
			// downstream handlers can safely consume narrowed types without
			// per-field defensive checks for shape (semantic checks like
			// "this commandId hasn't been seen before" still belong inline).
			const msg = parseWireMessage(data);
			if (!msg) {
				const advertisedType = (data as { type?: unknown } | null)?.type;
				debug.warn('[wireSync] Dropped malformed wire message', { advertisedType });
				return;
			}
			if (messageQueueRef.current.length >= MAX_QUEUE_SIZE) {
				debug.warn(`[wireSync] Queue full (${MAX_QUEUE_SIZE}), dropping newest message: ${msg.type}`);
				return;
			}
			messageQueueRef.current.push(msg);
			processQueue();
		};

		const handleMessageWrapper = (data: unknown) => handleMessage(data);
		connection.on('data', handleMessageWrapper);
		debug.log('[wireSync] Data listener attached to connection (heartbeats will now be processed)');

		return () => {
			cancelled = true;
			connection.off('data', handleMessageWrapper);
			debug.log('[wireSync] Data listener detached');
			if (pendingSyncRef.current) {
				clearTimeout(pendingSyncRef.current);
				pendingSyncRef.current = null;
			}
		};
	}, [connection, connectionState, isCardsAuthority, isWsHost, send, playCard, attackWithCard, endTurn, performHeroPower, applyOpponentCommandToStore]);

	const syncGameState = useCallback(() => {
		if (connectionState !== 'connected' || !isCardsAuthority) return;
		const now = Date.now();
		if (now - lastSyncRef.current < 100) return;
		lastSyncRef.current = now;
		const currentState = useGameStore.getState().gameState;
		// No envelope-level integrity hash here (TD-27c-bis): WebRTC's DTLS layer
		// already guarantees transport integrity, and `hash_check` (2s beacon)
		// catches cross-peer state divergence with a real WASM hash. The previous
		// inline quickhash was a structural no-op (sender + receiver hashed the
		// SAME bytes from the SAME envelope, so it could only catch in-transit
		// mutation that DTLS already rejects).
		send({ type: 'gameState', gameState: currentState });
	}, [connectionState, isCardsAuthority, send]);

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
			debug.warn('[wireSync] sendCommandEnvelope skipped: no matchId yet');
			return;
		}
		// Cooldown to avoid the fast-double-click race: client (!isCardsAuthority) doesn't
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
			debug.warn(`[wireSync] envelope cooldown active (${nowSend - lastEnvelopeSentAtRef.current}ms since last) — dropping ${command.type}`);
			GameEventBus.emitNotification({
				level: 'error',
				message: 'Action too fast — wait for opponent to sync',
				duration: 1500,
			});
			return;
		}
		lastEnvelopeSentAtRef.current = nowSend;

		const localState = useGameStore.getState().gameState;
		const prevStateHash = computeCardsPrevStateHash(localState, isCardsAuthority);
		const envelope: GameCommandEnvelope = {
			type: 'game_command',
			matchId,
			seq: outgoingSeqCounter++,
			commandId: crypto.randomUUID(),
			prevStateHash,
			command,
		};
		send(envelope);
	}, [send, isCardsAuthority]);

	// Local transcript identity: read fresh from the NFT bridge + peer store on
	// each move. Memoizing would be wrong — `getNFTBridge().getUsername()` can
	// flip mid-session if the user re-authenticates, and `myPeerId` flips on
	// reconnect. The function is cheap (two synchronous reads + one branch).
	const buildLocalTranscriptId = (): string => localPlayerId({
		hiveUsername: getNFTBridge().getUsername(),
		myPeerId: usePeerStore.getState().myPeerId,
	});

	// Sender wrappers: when the local player is the P2P client, the command travels
	// in the SENDER's perspective (e.g. `targetId: 'opponent-hero'` means "the host's hero
	// from the client's POV"). The host's applyOpponentCommand swaps player/opponent
	// before applying — no perspective translation is performed at the wire level.
	const wrappedPlayCard = useCallback((cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number) => {
		recordMove('playCard', { cardId, targetId, targetType, insertionIndex }, buildLocalTranscriptId());
		if (connectionState === 'connected' && !isCardsAuthority) {
			sendCommandEnvelope({
				type: GAME_COMMAND_TYPES.playCard,
				cardId,
				targetId,
				targetType,
				insertionIndex,
			});
		} else {
			playCard(cardId, targetId, targetType, insertionIndex);
			if (isCardsAuthority) debouncedSync();
		}
	}, [connectionState, isCardsAuthority, playCard, debouncedSync, sendCommandEnvelope]);

	const wrappedAttack = useCallback((attackerId: string, defenderId: string) => {
		recordMove('attack', { attackerId, defenderId }, buildLocalTranscriptId());
		if (connectionState === 'connected' && !isCardsAuthority) {
			sendCommandEnvelope({
				type: GAME_COMMAND_TYPES.attack,
				attackerId,
				defenderId,
			});
		} else {
			attackWithCard(attackerId, defenderId);
			if (isCardsAuthority) debouncedSync();
		}
	}, [connectionState, isCardsAuthority, attackWithCard, debouncedSync, sendCommandEnvelope]);

	const wrappedEndTurn = useCallback(() => {
		recordMove('endTurn', {}, buildLocalTranscriptId());
		if (connectionState === 'connected' && !isCardsAuthority) {
			sendCommandEnvelope({ type: GAME_COMMAND_TYPES.endTurn });
		} else {
			endTurn();
			if (isCardsAuthority) debouncedSync();
		}
	}, [connectionState, isCardsAuthority, endTurn, debouncedSync, sendCommandEnvelope]);

	const wrappedUseHeroPower = useCallback((targetId?: string) => {
		recordMove('useHeroPower', { targetId }, buildLocalTranscriptId());
		if (connectionState === 'connected' && !isCardsAuthority) {
			sendCommandEnvelope({
				type: GAME_COMMAND_TYPES.useHeroPower,
				targetId,
				targetType: 'card',
			});
		} else {
			performHeroPower(targetId, 'card');
			if (isCardsAuthority) debouncedSync();
		}
	}, [connectionState, isCardsAuthority, performHeroPower, debouncedSync, sendCommandEnvelope]);

	const downloadSessionLog = useCallback((): void => {
		try {
			const blob = exportSessionLog({
				matchId: matchIdRef.current,
				buildHash: typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev',
				connectionState,
				isHost: isCardsAuthority,
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
			debug.error('[wireSync] downloadSessionLog failed:', err);
		}
	}, [connectionState, isCardsAuthority]);

	// Host broadcasts state every 500ms as heartbeat sync to the opponent.
	// (Spectator broadcast was removed — see Patch-WebRTC.2; replaced
	// post-beta by a transcript-based replay viewer, TD-25.)
	useEffect(() => {
		if (connectionState !== 'connected' || !isCardsAuthority) return;
		const interval = setInterval(() => {
			syncGameState();
		}, 500);
		return () => clearInterval(interval);
	}, [connectionState, isCardsAuthority, syncGameState]);

	// Client pings host every 10s to keep the connection alive
	useEffect(() => {
		if (connectionState !== 'connected' || isCardsAuthority) return;
		const interval = setInterval(() => {
			send({ type: 'ping' });
		}, 10_000);
		return () => clearInterval(interval);
	}, [connectionState, isCardsAuthority, send]);

	// Host sends state hash check every 2s for anti-cheat verification
	useEffect(() => {
		if (connectionState !== 'connected' || !isCardsAuthority) return;
		let cancelled = false;
		let timerId: ReturnType<typeof setTimeout> | null = null;
		const scheduleCheck = () => {
			if (cancelled) return;
			timerId = setTimeout(async () => {
				if (cancelled) return;
				const gs = useGameStore.getState().gameState;
				if (gs && gs.gamePhase !== 'game_over') {
					const stateHash = await computeStateHash(gs);
					// Beacon-covered chess hash (TD-27c-chess F3). Closes the
					// cross-peer divergence-detection gap between chess moves: per-
					// envelope validation catches mid-move drift, but two peers can
					// drift while idle (no chess move, no game_command). Sync hash
					// over the local boardState; '' under WASM-not-ready / no-chess-
					// phase races so the receiver can skip rather than reject.
					const beaconCombatStore = (globalThis as Record<string, unknown>)
						.__ragnarokCombatStore as { getState: () => { boardState?: Parameters<typeof computeChessPrevStateHash>[0] } } | undefined;
					const chessSnapshot = beaconCombatStore?.getState().boardState ?? null;
					const chessStateHash = computeChessPrevStateHash(chessSnapshot);
					// Stamp the snapshot's moveCount alongside the hash so the receiver
					// can skip the compare when it's on a different chess turn (in-
					// flight envelopes faster than 2s beacon → near-permanent stale-
					// snapshot mismatches without this gate). -1 = no chess snapshot.
					const chessMoveCount = chessSnapshot?.moveCount ?? -1;
					if (!cancelled) {
						send({ type: 'hash_check', stateHash, chessStateHash, chessMoveCount, turnNumber: gs.turnNumber });
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
	}, [connectionState, isCardsAuthority, send]);

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
		isHost: isCardsAuthority,
	};
}
