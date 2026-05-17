import { useEffect, useRef, useCallback } from 'react';
import { GameEventBus } from '../../../../../core/events/GameEventBus';
import { usePeerStore } from '../../../../stores/peerStore';
import { useMatchStore } from '../../../store';
import { deriveAuthority } from '../../../derived';
import { useGameStore } from '../../../../stores/gameStore';
import { debug } from '../../../../config/debugConfig';
import { verifyDeckOwnership } from '../../../../../data/blockchain/deckVerification';
import { sha256Hash } from '../../../../../data/blockchain/hashUtils';
import { computeMatchResultCommitmentHash } from '../../../../../data/blockchain/matchResultPackager';
import { verifyDeckClaims as verifyDeckClaimsOnServer } from '../../../../../data/chainAPI';
import { getNFTBridge } from '../../../../nft';
import type { PackagedMatchResult } from '../../../../../data/blockchain/types';
import { NftUidSchema } from '../../../../../../../shared/protocol-core/playerCollection';
import { CardIdSchema } from '../../../../../../../shared/schemas/ids';
import type { DeckCardClaim } from '../../../../../../../shared/protocol-core/deckVerification';
import { startNewTranscript, clearTranscript, recordSessionEvent, exportSessionLog, recordMove, getActiveTranscript } from '../../../../../data/blockchain/transcriptBuilder';
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
import { getP2PProcessFlags, getP2PTransportRole } from '../../../../p2p/p2pPerspective';
import type { P2PMessage } from '../../../../p2p/messages';
import { parseWireMessage } from '../../../../p2p/messageSchemas';
import { CombatAction, CombatPhase, type PokerCombatState } from '../../../../types/PokerCombatTypes';
import { encodePokerAction, isPokerActionCompactConsistent, type CompactPokerActionName } from '../../../../../../../shared/p2p-wire/combat';
import { generateSessionKey, type SessionKey } from '../../../../protocol/sessionKey';
import {
	emptyTranscript,
	appendSelfAction,
	verifyAndAppendRemote,
	type Transcript,
	type Broadcaster,
} from '../../../../protocol/transcript';
import { buildSessionAuthorizeMessage, signSessionAuthorize } from '../../../../../data/HiveDataLayer';
import { verifyInboundRenewal } from '../../../../protocol/sessionRenewal';
import { verifyHiveSignature } from '../../../../../data/blockchain/hiveSignatureVerifier';
import {
	open as openActionLog,
	deriveEncKey as deriveActionLogEncKey,
	appendLeaf as appendActionLogLeaf,
	pruneFinalized as pruneActionLog,
	type StoredLeaf,
} from '../../../../protocol/actionLog';
import { verifyResultProposalTranscriptRoot } from './resultProposalGuard';

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
	//   - `processFlags` — pure process gates derived from transport role and
	//     current authority mode. UI code should consume viewer/canonical
	//     perspective instead of branching on these flags.
	const isWsHost = usePeerStore(state => state.isHost);
	const transportRole = getP2PTransportRole(isWsHost);
	const processFlags = getP2PProcessFlags({ transportRole });
	const isCardsAuthority = processFlags.broadcastsCardsState;
	const shouldSendGuestKeepAlive = processFlags.sendsGuestKeepAlive;
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
	// ADR 0004 §Decision.3 — ephemeral session keys. The local SessionKey
	// is the in-process keypair signing every action envelope (issue 03).
	// `sessionAuthorizeSentRef` guards against re-firing the Hive Keychain
	// prompt if seed_reveal arrives twice (network retry, reconnect).
	// Opponent state is captured when their `session_authorize` arrives;
	// both halves must be present before any action_envelope is sent.
	const sessionKeyRef = useRef<SessionKey | null>(null);
	const sessionAuthorizeSentRef = useRef(false);
	const opponentSessionPubkeyRef = useRef<string | null>(null);
	const opponentSessionHiveSigRef = useRef<string | null>(null);
	// ADR 0004 §Decision.4 — per-action signed transcript (issue 03). Both
	// peers maintain a local copy of the same leaf sequence; the Merkle
	// root is committed in `match_result.transcriptRoot` at end-of-match.
	// Broadcaster role is canonical (A = first-mover, B = second-mover),
	// derived from the WS host hint at seed_reveal — see seed_reveal handler.
	const signedTranscriptRef = useRef<Transcript | null>(null);
	const myBroadcasterRef = useRef<Broadcaster | null>(null);
	// ADR 0004 §Decision.6 (issue 04) — encrypted IndexedDB action log. The
	// DB handle is opened lazily after session_authorize so the encKey
	// derivation can reuse the same Hive sig. Both refs MAY be null during
	// the early-handshake window; appendLeaf is then a no-op (Phase 0 accepts
	// this loss; harden in issue 06).
	const actionLogDbRef = useRef<Awaited<ReturnType<typeof openActionLog>> | null>(null);
	const actionLogEncKeyRef = useRef<CryptoKey | null>(null);
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
	const seenPokerDecisionIdsRef = useRef<Set<string>>(new Set());
	const seenPokerDecisionIdsOrderRef = useRef<string[]>([]);

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
			if (connectionState === 'grace_period' || connectionState === 'reconnecting') {
				return undefined;
			}
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
				seenPokerDecisionIdsRef.current.clear();
				seenPokerDecisionIdsOrderRef.current.length = 0;
				resetChessWireSender();
			lastEnvelopeSentAtRef.current = 0;
			sessionKeyRef.current = null;
			actionLogDbRef.current = null;
			actionLogEncKeyRef.current = null;
			sessionAuthorizeSentRef.current = false;
			opponentSessionPubkeyRef.current = null;
			opponentSessionHiveSigRef.current = null;
			usePeerStore.getState().setP2pSessionAuthorization({
				localAuthorized: false,
				remoteAuthorized: false,
				error: null,
			});
			signedTranscriptRef.current = null;
			myBroadcasterRef.current = null;
			return undefined;
		}

		if (seedResolvedRef.current && matchIdRef.current) {
			const resumedMatchId = matchIdRef.current;
			loadWasmEngine().then(() => {
				const wasmHash = getWasmHash();
				send({ type: 'wasm_hash_check', wasmHash });
			}).catch(err => {
				GameEventBus.emitNotification({
					level: 'error',
					message: `WASM engine failed to load after reconnect — ranked play blocked — ${err instanceof Error ? err.message : 'Unknown WASM error'}`,
					duration: 15000,
				});
			});
			const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
			send({ type: 'version_check', buildHash: hash });
			send({
				type: 'state_sync_request',
				matchId: resumedMatchId,
				fromTurn: signedTranscriptRef.current?.leaves.length ?? 0,
			});
			debug.log('[wireSync] Reconnected existing P2P session without reseeding', {
				matchId: resumedMatchId,
				localLeaves: signedTranscriptRef.current?.leaves.length ?? 0,
			});
			return undefined;
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

		// Cross-verify deck ownership with source-aware claims.
		if (isSharedNetworkEnvironment()) {
			try {
				const bridge = getNFTBridge();
				const username = bridge.getUsername();
				if (username) {
					const collection = bridge.getCardCollection();
					const claims: DeckCardClaim[] = [];
					for (const card of collection) {
						if (card.ownershipSource !== 'nft') continue;
						const nftUid = NftUidSchema.safeParse(card.uid);
						const cardId = CardIdSchema.safeParse(card.cardId);
						if (!nftUid.success || !cardId.success) continue;
						claims.push({
							authority: 'nft-custody',
							nftUid: nftUid.data,
							cardId: cardId.data,
						});
					}
					if (claims.length > 0) {
						send({ type: 'deck_verify', hiveAccount: username, protocolVersion: 2, claims });
						debug.combat(`[wireSync] Sent deck_verify: ${claims.length} source-aware claim(s) for @${username}`);
					}
				}
			} catch (err) {
				debug.warn('[wireSync] Failed to send deck verification:', err);
			}
		}

		startNewTranscript();
		return undefined;
	}, [connection, connectionState, send]);

	useEffect(() => () => {
		clearTranscript();
		resetChessWireSender();
	}, []);

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
				level: 'warning',
				message: 'Connection lost. Reconnecting and preserving queued actions.',
				duration: 8000,
			});
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

					// ADR 0004 §Decision.4 (issue 03) — initialise the signed
					// transcript before any action can be appended. Broadcaster
					// label is canonical (A/B), derived from the WS host hint
					// at seed_reveal: WS host is 'A', client is 'B'. This is
					// the only place we mint the label; downstream code reads
					// `myBroadcasterRef.current`.
					signedTranscriptRef.current = emptyTranscript(truncatedMatchId);
					myBroadcasterRef.current = isWsHost ? 'A' : 'B';

					// Identity binding: capture opponent's Hive username
					if (data.hiveUsername) {
						opponentUsernameRef.current = data.hiveUsername;
					}

					// ADR 0004 §Decision.3 — generate per-match ephemeral Ed25519
					// session key and request Hive Keychain to authorize the
					// pubkey. Fire-and-forget: the prompt is async and must not
					// block seed_reveal completion. Issue 03 will block envelope
					// sends on both `sessionKeyRef.current` and
					// `opponentSessionPubkeyRef.current` being populated.
					if (!sessionAuthorizeSentRef.current) {
						sessionAuthorizeSentRef.current = true;
						const localMatchId = truncatedMatchId;
						(async () => {
							try {
								const sessionKey = await generateSessionKey(localMatchId);
								sessionKeyRef.current = sessionKey;
								const localUsername = getNFTBridge().getUsername();
								if (!localUsername) {
									debug.warn('[wireSync] session_authorize skipped — no local Hive username');
									usePeerStore.getState().setP2pSessionAuthorization({
										localAuthorized: false,
										error: 'Missing local Hive session',
									});
									return;
								}
								const hiveSig = await signSessionAuthorize(localMatchId, sessionKey.pubkey, {
									username: localUsername,
								});
								send({
									type: 'session_authorize',
									matchId: localMatchId,
									ephemeralPubkey: sessionKey.pubkey,
									hiveSig,
								});
								debug.log('[wireSync] Sent session_authorize', {
									matchId: localMatchId,
									mode: sessionKey.mode,
									pubkeyPrefix: sessionKey.pubkey.slice(0, 8),
								});
								usePeerStore.getState().setP2pSessionAuthorization({
									localAuthorized: true,
									error: null,
								});
								// ADR 0004 §Decision.6 (issue 04) — open the encrypted
								// action log alongside session_authorize. Reuse the same
								// Posting signature so match start has one Keychain prompt.
								try {
									const [db, encKey] = await Promise.all([
										openActionLog(),
										deriveActionLogEncKey(hiveSig, localMatchId),
									]);
									actionLogDbRef.current = db;
									actionLogEncKeyRef.current = encKey;
									debug.log('[wireSync] Action log opened', { matchId: localMatchId });
								} catch (logErr) {
									debug.warn('[wireSync] Action log unavailable — running without reload safety', logErr);
								}
							} catch (err) {
								debug.error('[wireSync] session_authorize failed:', err);
								usePeerStore.getState().setP2pSessionAuthorization({
									localAuthorized: false,
									error: err instanceof Error ? err.message : String(err),
								});
							}
						})();
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
					//   - chess_attack: instant-kill captures — receiver runs
					//     `beginChessAttack(attacker, defender, true)`.
					//   - chess_combat_initiated: non-instant captures — receiver
					//     runs the same attack command with `false`, then the
					//     coordinator boots poker from pendingCombat.
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
					// type extended with `beginChessAttack` + `pendingAttackAnimation`
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
									beginChessAttack?: (attacker: RemotePieceShape, defender: RemotePieceShape, isInstantKill: boolean) => void;
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
					let transcriptAction: 'chess_move' | 'chess_attack' | 'chess_combat_initiated';
					let transcriptExtra: Record<string, unknown> = {};

					if (cmd.type === 'chess_move') {
						if (!cs.executeMove) {
							reject('execute_move_unavailable');
							break;
						}
						cs.executeMove(cmd.from, cmd.to);
						transcriptAction = 'chess_move';
					} else {
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
						if (cs.pendingAttackAnimation) {
							reject('attack_animation_in_progress');
							break;
						}
						if (!cs.beginChessAttack) {
							reject('begin_chess_attack_unavailable');
							break;
						}
						const instantKill = isChessAttackInstantKill({ attackerType: attacker.type, defenderType: defender.type });
						if (cmd.type === 'chess_attack' && !instantKill) {
							reject('chess_attack_requires_instant_capture');
							break;
						}
						if (cmd.type === 'chess_combat_initiated' && instantKill) {
							reject('chess_combat_initiated_requires_non_instant_capture');
							break;
						}

						cs.beginChessAttack(attacker, defender, instantKill);
						transcriptAction = cmd.type;
						transcriptExtra = {
							defenderId: cmd.defenderId,
							isInstantKill: instantKill,
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

				case 'poker_action': {
					const nowP = Date.now();
					actionTimestampsRef.current = actionTimestampsRef.current.filter(t => nowP - t < 1000);
					if (actionTimestampsRef.current.length >= MAX_ACTIONS_PER_SEC) break;
					actionTimestampsRef.current.push(nowP);

					const validActions = Object.values(CombatAction) as string[];
					if (!validActions.includes(data.action)) break;
					if (data.hpCommitment !== undefined && (typeof data.hpCommitment !== 'number' || data.hpCommitment < 0 || data.hpCommitment > 500)) break;
					if (!isPokerActionCompactConsistent({
						action: data.action,
						hpCommitment: data.hpCommitment,
						compact: data.compact,
					})) {
						debug.warn('[wireSync] poker_action dropped — compact tuple mismatch', {
							action: data.action,
							hpCommitment: data.hpCommitment,
						});
						break;
					}

					const combatStore = (globalThis as Record<string, unknown>).__ragnarokCombatStore as
						| {
								getState: () => {
									pokerCombatState?: PokerCombatState | null;
									performPokerAction?: (playerId: string, action: CombatAction, hp?: number) => void;
									maybeCloseBettingRound?: () => void;
								};
						  }
						| undefined;
					if (!combatStore) break;
					const cState = combatStore.getState();
					const pokerState = cState.pokerCombatState;
					if (!pokerState || pokerState.foldWinner) break;
					if (pokerState.phase === CombatPhase.RESOLUTION) break;

					if (typeof data.playerId !== 'string' || data.playerId.length > 128) break;
					if (!data.turnId || !pokerState.turnId || data.turnId !== pokerState.turnId) {
						debug.warn('[wireSync] poker_action dropped — turnId mismatch', {
							received: data.turnId,
							expected: pokerState.turnId,
						});
						break;
					}
					if (data.playerId !== pokerState.opponent.playerId) {
						debug.warn('[wireSync] poker_action dropped — remote actor mismatch', {
							received: data.playerId,
							expected: pokerState.opponent.playerId,
						});
						break;
					}
					if (pokerState.activePlayerId !== data.playerId) break;
					if (seenPokerDecisionIdsRef.current.has(data.decisionId)) {
						debug.warn('[wireSync] poker_action dropped — duplicate decisionId', {
							decisionId: data.decisionId.slice(0, 24),
						});
						break;
					}
					seenPokerDecisionIdsRef.current.add(data.decisionId);
					seenPokerDecisionIdsOrderRef.current.push(data.decisionId);
					while (seenPokerDecisionIdsOrderRef.current.length > SEEN_COMMAND_IDS_MAX) {
						const evicted = seenPokerDecisionIdsOrderRef.current.shift();
						if (evicted !== undefined) seenPokerDecisionIdsRef.current.delete(evicted);
					}

					recordMove('poker_action', {
						action: data.action,
						hpCommitment: data.hpCommitment,
						turnId: data.turnId,
						decisionId: data.decisionId,
					}, remotePlayerId({
						opponentUsername: opponentUsernameRef.current,
						remotePeerId: usePeerStore.getState().remotePeerId,
					}));
					cState.performPokerAction?.(data.playerId, data.action as CombatAction, data.hpCommitment);
					cState.maybeCloseBettingRound?.();
					break;
				}

				case 'poker_turn_started': {
					const combatStore = (globalThis as Record<string, unknown>).__ragnarokCombatStore as
						| {
								getState: () => {
									pokerCombatState?: {
										combatId?: string;
										phase?: CombatPhase;
										activePlayerId?: string | null;
										actionsThisRound?: number;
										maxTurnTime?: number;
									} | null;
									syncPokerTurnClock?: (input: {
										turnId: string;
										combatId: string;
										phase: string;
										activePlayerId: string;
										actionsThisRound: number;
										durationMs: number;
										sentAtMs?: number;
										remainingMs?: number;
										receivedAtMs: number;
									}) => void;
								};
						  }
						| undefined;
					const cState = combatStore?.getState();
					const pokerState = cState?.pokerCombatState;
					if (!pokerState) break;
					if (pokerState.combatId !== data.combatId) break;
					if (pokerState.phase !== data.phase) break;
					if (pokerState.activePlayerId !== data.activePlayerId) break;
					if (pokerState.actionsThisRound !== data.actionsThisRound) break;
					const expectedDurationMs = Math.max(1, pokerState.maxTurnTime ?? 60) * 1_000;
					if (data.durationMs !== expectedDurationMs) {
						debug.warn('[wireSync] poker_turn_started dropped — duration mismatch', {
							received: data.durationMs,
							expected: expectedDurationMs,
						});
						break;
					}
					cState?.syncPokerTurnClock?.({
						turnId: data.turnId,
						combatId: data.combatId,
						phase: data.phase,
						activePlayerId: data.activePlayerId,
						actionsThisRound: data.actionsThisRound,
						durationMs: data.durationMs,
						sentAtMs: data.sentAtMs,
						remainingMs: data.remainingMs,
						receivedAtMs: Date.now(),
					});
					recordMove('poker_turn_started', {
						combatId: data.combatId,
						phase: data.phase,
						activePlayerId: data.activePlayerId,
						turnId: data.turnId,
						actionsThisRound: data.actionsThisRound,
						durationMs: data.durationMs,
						remainingMs: data.remainingMs,
					}, remotePlayerId({
						opponentUsername: opponentUsernameRef.current,
						remotePeerId: usePeerStore.getState().remotePeerId,
					}));
					break;
				}

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

					verifyDeckOwnership(data.hiveAccount, data.claims.map(claim => (
						claim.authority === 'nft-custody'
							? { nft_id: claim.nftUid, cardId: claim.cardId }
							: { cardId: claim.cardId, category: 'starter' as const }
					))).then(result => {
						if (!result.valid) {
							GameEventBus.emitNotification({
								level: 'error',
								message: `Opponent deck verification failed — ${result.invalidCards.length} card(s) not owned by ${data.hiveAccount}. Disconnecting.`,
								duration: 5000,
							});
							disconnectOnce();
						}
					}).catch(() => { /* IndexedDB unavailable in dev mode — skip */ });

					if (data.hiveAccount && data.claims.length > 0) {
						verifyDeckClaimsOnServer(data.hiveAccount, data.claims)
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

					const localTranscript = getActiveTranscript();
					let localTranscriptRoot: string | null = null;
					if (localTranscript) {
						try {
							localTranscriptRoot = await localTranscript.buildMerkleTree();
						} catch (err) {
							debug.warn('[wireSync] Failed to build local transcript root for result proposal:', err);
						}
					}
					const transcriptCheck = verifyResultProposalTranscriptRoot({
						result: data.result as PackagedMatchResult,
						localRoot: localTranscriptRoot,
					});
					if (transcriptCheck.status === 'rejected') {
						recordSessionEvent('result_rejected', {
							reason: transcriptCheck.reason,
							proposalId: data.proposalId,
							matchId: data.result.matchId,
							proposerWinner: data.result.winner.username,
							proposerLoser: data.result.loser.username,
							localRootPrefix: transcriptCheck.localRoot?.slice(0, 12),
							proposedRootPrefix: transcriptCheck.proposedRoot?.slice(0, 12),
						});
						send({ type: 'result_reject', reason: transcriptCheck.reason });
						break;
					}

					const expectedCommitmentHash = await computeMatchResultCommitmentHash(data.result as PackagedMatchResult);
					if (expectedCommitmentHash !== data.hash) {
						recordSessionEvent('result_rejected', {
							reason: 'commitment_mismatch',
							proposalId: data.proposalId,
							matchId: data.result.matchId,
							proposerWinner: data.result.winner.username,
							proposerLoser: data.result.loser.username,
							expectedCommitmentHash,
							proposedCommitmentHash: data.hash,
						});
						send({ type: 'result_reject', reason: 'commitment_mismatch' });
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
							// ADR 0004 §Decision.6 (issue 04) — match finalized,
							// prune the action log. Idempotent; second prune is
							// a no-op if the connection cleanup ran first.
							const logDb = actionLogDbRef.current;
							if (logDb) {
								void pruneActionLog(logDb, data.result.matchId).catch((e) => {
									debug.warn('[wireSync] action log prune failed:', e);
								});
							}
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

				case 'session_authorize': {
					// ADR 0004 §Decision.3 — cache opponent's ephemeral pubkey +
					// the Hive sig that binds it to their on-chain identity.
					if (data.matchId !== matchIdRef.current) {
						debug.warn('[wireSync] session_authorize matchId mismatch — ignoring', {
							received: data.matchId,
							expected: matchIdRef.current,
						});
						break;
					}
					const opponentUsername = opponentUsernameRef.current;
					if (!opponentUsername) {
						debug.warn('[wireSync] session_authorize dropped — no opponent Hive username');
						usePeerStore.getState().setP2pSessionAuthorization({
							remoteAuthorized: false,
							error: 'Missing opponent Hive username',
						});
						break;
					}
					const authorizeMessage = buildSessionAuthorizeMessage(data.matchId, data.ephemeralPubkey);
					const sigValid = await verifyHiveSignature(opponentUsername, authorizeMessage, data.hiveSig);
					if (!sigValid) {
						debug.warn('[wireSync] session_authorize dropped — Hive signature verification failed', {
							opponentUsername,
							matchId: data.matchId,
							pubkeyPrefix: data.ephemeralPubkey.slice(0, 8),
						});
						usePeerStore.getState().setP2pSessionAuthorization({
							remoteAuthorized: false,
							error: 'Opponent Hive signature verification failed',
						});
						break;
					}
					if (opponentSessionPubkeyRef.current
						&& opponentSessionPubkeyRef.current !== data.ephemeralPubkey
					) {
						debug.warn('[wireSync] session_authorize replaced opponent pubkey mid-match — possible re-key', {
							before: opponentSessionPubkeyRef.current.slice(0, 8),
							after: data.ephemeralPubkey.slice(0, 8),
						});
					}
					opponentSessionPubkeyRef.current = data.ephemeralPubkey;
					opponentSessionHiveSigRef.current = data.hiveSig;
					usePeerStore.getState().setP2pSessionAuthorization({
						remoteAuthorized: true,
					});
					debug.log('[wireSync] Cached opponent session_authorize', {
						matchId: data.matchId,
						pubkeyPrefix: data.ephemeralPubkey.slice(0, 8),
					});
					break;
				}

				case 'session_renewal': {
					// ADR 0004 §Decision.6 B–E (issue 06). Opponent reloaded;
					// they generated a fresh ephemeral keypair and re-bound it
					// to their Hive identity. Validate the Hive sig and accept
					// the new pubkey for the remainder of the match.
					const activeMatchId = matchIdRef.current;
					const opponentUsername = opponentUsernameRef.current;
					if (!activeMatchId || !opponentUsername) {
						debug.warn('[wireSync] session_renewal dropped — no active match or opponent username', {
							hasMatchId: !!activeMatchId,
							hasOpponent: !!opponentUsername,
						});
						break;
					}
					try {
						const result = await verifyInboundRenewal({
							matchId: data.matchId,
							newPubkey: data.newPubkey,
							hiveSig: data.hiveSig,
							activeMatchId,
							verifyHiveSig: async (message, sig) => {
								// Recover the signing pubkey from the Hive sig
								// and confirm it's a known Hive Posting
								// authority for the opponent. The existing
								// p2pRelay path already attests the opponent's
								// account via seed_reveal, so trusting the
								// account-name binding here matches that level.
								return verifyHiveSignature(opponentUsername, message, sig);
							},
						});
						if (result.accepted) {
							opponentSessionPubkeyRef.current = data.newPubkey;
							opponentSessionHiveSigRef.current = data.hiveSig;
							usePeerStore.getState().setP2pSessionAuthorization({
								remoteAuthorized: true,
							});
							const lastSeen = signedTranscriptRef.current?.merkleRoot ?? '0'.repeat(64);
							send({ type: 'session_resumed', matchId: activeMatchId, lastSeenStateHash: lastSeen });
							debug.log('[wireSync] Accepted opponent session_renewal', {
								matchId: data.matchId,
								newPubkeyPrefix: data.newPubkey.slice(0, 8),
							});
						} else {
							debug.warn('[wireSync] session_renewal rejected', { reason: result.reason });
						}
					} catch (err) {
						debug.error('[wireSync] session_renewal verification error:', err);
					}
					break;
				}

				case 'session_resumed': {
					// ADR 0004 §Decision.6 — opponent acknowledged OUR renewal
					// and reported the last state hash they saw. The actual
					// state reconciliation belongs to issue 07's smoke harness
					// (state_sync_request fallback path); Phase 0 only logs
					// here so the protocol bookkeeping completes.
					debug.log('[wireSync] Opponent session_resumed', {
						matchId: data.matchId,
						lastSeenStateHashPrefix: data.lastSeenStateHash.slice(0, 8),
						localRootPrefix: signedTranscriptRef.current?.merkleRoot.slice(0, 8) ?? '0'.repeat(8),
					});
					break;
				}

				case 'state_sync_request': {
					// ADR 0004 §Decision.6 — the resuming peer's local action
					// log was unavailable (private browsing, corruption). Send
					// our copy of the signed transcript for replay; the
					// resuming peer verifies every signature against the
					// active pubkeys before applying. Phase 0 sends the full
					// in-memory transcript leaves; if signedTranscriptRef is
					// empty, reply with zero leaves so they fall back to
					// other recovery paths.
					const activeId = matchIdRef.current;
					if (!activeId || data.matchId !== activeId) break;
					const tr = signedTranscriptRef.current;
					const leaves = tr ? tr.leaves.slice(data.fromTurn) : [];
					debug.log('[wireSync] state_sync_request — replying with', {
						matchId: data.matchId,
						leafCount: leaves.length,
						fromTurn: data.fromTurn,
					});
					// Phase 0: re-emit each leaf as its own action_envelope,
					// preserving the chain ordering. Sufficient for the smoke
					// harness; a richer bundled wire message is a follow-up.
					for (const leaf of leaves) {
						send({
							type: 'action_envelope',
							matchId: data.matchId,
							seq: leaf.seq,
							prevHash: leaf.prevHash,
							action: leaf.action,
							sig: leaf.sig,
						});
					}
					break;
				}

				case 'action_envelope': {
					// ADR 0004 §Decision.4 (issue 03). Per-action signed
					// envelopes feed a parallel transcript (additive to the
					// host-auth `game_command` flow); the engine still applies
					// state from gameStore as before. Drop silently when the
					// transcript or opponent pubkey isn't yet populated —
					// `session_authorize` is async over the wire, so the first
					// few envelopes can race the handshake. The legacy
					// `game_command` path still mutates state in the meantime.
					const tr = signedTranscriptRef.current;
					const oppPubkey = opponentSessionPubkeyRef.current;
					const myRole = myBroadcasterRef.current;
					if (!tr || !oppPubkey || !myRole) {
						debug.warn('[wireSync] action_envelope dropped — handshake not ready', {
							hasTranscript: !!tr,
							hasOpponentKey: !!oppPubkey,
							hasBroadcasterRole: !!myRole,
						});
						break;
					}
					if (data.matchId !== tr.matchId) {
						debug.warn('[wireSync] action_envelope matchId mismatch', {
							got: data.matchId,
							expected: tr.matchId,
						});
						break;
					}
					// The remote's broadcaster label is the opposite of ours
					// (A/B is a per-match canonical labelling, not viewer-
					// relative). We never trust a self-reported broadcaster
					// from the envelope — derived locally from myBroadcasterRef.
					const remoteBroadcaster: Broadcaster = myRole === 'A' ? 'B' : 'A';
					try {
						const next = await verifyAndAppendRemote(
							tr,
							{
								type: 'action_envelope',
								matchId: data.matchId,
								seq: data.seq,
								prevHash: data.prevHash,
								action: data.action,
								sig: data.sig,
							},
							oppPubkey,
							remoteBroadcaster,
						);
						signedTranscriptRef.current = next;
						// Persist the remote leaf to the encrypted log (issue 04).
						// No-op if the log isn't open yet (early handshake gap).
						const logDb = actionLogDbRef.current;
						const logKey = actionLogEncKeyRef.current;
						if (logDb && logKey) {
							const appended = next.leaves[next.leaves.length - 1];
							const stored: StoredLeaf = { ...appended, matchId: data.matchId };
							void appendActionLogLeaf(logDb, stored, logKey).catch((e) => {
								debug.warn('[wireSync] action log write (remote) failed:', e);
							});
						}
					} catch (err) {
						debug.warn('[wireSync] action_envelope rejected:', err instanceof Error ? err.message : String(err));
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

	/**
	 * ADR 0004 §Decision.4 (issue 03) — sign + append the local action to
	 * the transcript and broadcast an `action_envelope`. Additive to the
	 * host-auth `game_command` flow: the cards engine still mutates state
	 * via `playCard`/`applyOpponentCommand`; the envelope is the audit
	 * record committed in `match_result.transcriptRoot`.
	 *
	 * Drops silently (with a debug warn) until the session handshake is
	 * complete on both sides — `session_authorize` is async, so the first
	 * few actions can race the prompt. The legacy game_command path keeps
	 * gameplay moving while we wait; missing leaves in the early window
	 * are an accepted limitation of Phase 0 (issue 06 will harden it).
	 */
	const appendAndSendActionEnvelope = useCallback(async (action: Record<string, unknown>): Promise<void> => {
		if (connectionState !== 'connected') return;
		const key = sessionKeyRef.current;
		const tr = signedTranscriptRef.current;
		const broadcaster = myBroadcasterRef.current;
		if (!key || !tr || !broadcaster) {
			debug.warn('[wireSync] action_envelope skipped — session not ready', {
				hasKey: !!key,
				hasTranscript: !!tr,
				hasBroadcaster: !!broadcaster,
			});
			return;
		}
		try {
			const { next, envelope } = await appendSelfAction(tr, action, key, broadcaster);
			signedTranscriptRef.current = next;
			send(envelope);
			// Persist the self leaf to the encrypted log (issue 04). No-op if
			// the log handle isn't ready yet (early-handshake gap).
			const logDb = actionLogDbRef.current;
			const logKey = actionLogEncKeyRef.current;
			if (logDb && logKey) {
				const stored: StoredLeaf = {
					seq: envelope.seq,
					prevHash: envelope.prevHash,
					action: envelope.action,
					sig: envelope.sig,
					broadcaster,
					matchId: tr.matchId,
				};
				void appendActionLogLeaf(logDb, stored, logKey).catch((e) => {
					debug.warn('[wireSync] action log write (self) failed:', e);
				});
			}
		} catch (err) {
			debug.error('[wireSync] action_envelope build/send failed:', err);
		}
	}, [connectionState, send]);

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
	// Build a transcript-friendly action payload. Strips `undefined` keys so
	// the canonical-JSON serializer (which rejects `undefined`) sees only
	// the fields the wire actually carries. Mirrors the optionality of the
	// `WireGameCommand` discriminated union.
	const buildTranscriptAction = (
		type: typeof GAME_COMMAND_TYPES[keyof typeof GAME_COMMAND_TYPES],
		fields: Record<string, string | number | boolean | undefined>,
	): Record<string, unknown> => {
		const out: Record<string, unknown> = { type };
		for (const [k, v] of Object.entries(fields)) {
			if (v !== undefined) out[k] = v;
		}
		return out;
	};

	const wrappedPlayCard = useCallback((cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number) => {
		recordMove('playCard', { cardId, targetId, targetType, insertionIndex }, buildLocalTranscriptId());
		void appendAndSendActionEnvelope(buildTranscriptAction(GAME_COMMAND_TYPES.playCard, {
			cardId, targetId, targetType, insertionIndex,
		}));
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
	}, [connectionState, isCardsAuthority, playCard, debouncedSync, sendCommandEnvelope, appendAndSendActionEnvelope]);

	const wrappedAttack = useCallback((attackerId: string, defenderId: string) => {
		recordMove('attack', { attackerId, defenderId }, buildLocalTranscriptId());
		void appendAndSendActionEnvelope(buildTranscriptAction(GAME_COMMAND_TYPES.attack, {
			attackerId, defenderId,
		}));
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
	}, [connectionState, isCardsAuthority, attackWithCard, debouncedSync, sendCommandEnvelope, appendAndSendActionEnvelope]);

	const wrappedEndTurn = useCallback(() => {
		recordMove('endTurn', {}, buildLocalTranscriptId());
		void appendAndSendActionEnvelope({ type: GAME_COMMAND_TYPES.endTurn });
		if (connectionState === 'connected' && !isCardsAuthority) {
			sendCommandEnvelope({ type: GAME_COMMAND_TYPES.endTurn });
		} else {
			endTurn();
			if (isCardsAuthority) debouncedSync();
		}
	}, [connectionState, isCardsAuthority, endTurn, debouncedSync, sendCommandEnvelope, appendAndSendActionEnvelope]);

	const wrappedUseHeroPower = useCallback((targetId?: string) => {
		recordMove('useHeroPower', { targetId }, buildLocalTranscriptId());
		void appendAndSendActionEnvelope(buildTranscriptAction(GAME_COMMAND_TYPES.useHeroPower, {
			targetId, targetType: 'card',
		}));
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
	}, [connectionState, isCardsAuthority, performHeroPower, debouncedSync, sendCommandEnvelope, appendAndSendActionEnvelope]);

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
		if (connectionState !== 'connected' || !shouldSendGuestKeepAlive) return;
		const interval = setInterval(() => {
			send({ type: 'ping' });
		}, 10_000);
		return () => clearInterval(interval);
	}, [connectionState, shouldSendGuestKeepAlive, send]);

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

	// Send source-aware deck claims to the opponent for ownership verification.
	const sendDeckVerification = useCallback((hiveAccount: string, claims: readonly DeckCardClaim[]) => {
		if (connectionState === 'connected') {
			send({ type: 'deck_verify', hiveAccount, protocolVersion: 2, claims });
		}
	}, [connectionState, send]);

	const sendPokerAction = useCallback((input: {
		playerId: string;
		action: CombatAction;
		hpCommitment?: number;
		turnId?: string | null;
	}) => {
		if (connectionState !== 'connected') return;
		const sentAtMs = Date.now();
		send({
			type: 'poker_action',
			playerId: input.playerId,
			action: input.action,
			hpCommitment: input.hpCommitment,
			turnId: input.turnId ?? undefined,
			decisionId: `${input.turnId ?? 'unclocked'}:${input.playerId}:${sentAtMs}`,
			sentAtMs,
			compact: encodePokerAction({
				action: input.action as CompactPokerActionName,
				hpCommitment: input.hpCommitment,
			}),
		});
	}, [connectionState, send]);

	const sendPokerTurnStarted = useCallback((input: {
		combatId: string;
		turnId: string;
		phase: string;
		activePlayerId: string;
		actionsThisRound: number;
		durationMs: number;
		remainingMs?: number;
	}) => {
		if (connectionState !== 'connected') return;
		send({
			type: 'poker_turn_started',
			combatId: input.combatId,
			turnId: input.turnId,
			phase: input.phase,
			activePlayerId: input.activePlayerId,
			actionsThisRound: input.actionsThisRound,
			durationMs: input.durationMs,
			remainingMs: input.remainingMs,
			sentAtMs: Date.now(),
		});
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

				// 30s timeout — ranked settlement stays blocked without dual-sig.
			timeoutId = setTimeout(() => {
				if (pendingResultRef.current) {
					pendingResultRef.current = null;
					settle(null);
				}
			}, RESULT_SIGN_TIMEOUT_MS);
		});
	}, [connectionState, send]);

	/**
	 * ADR 0004 §Decision.4 (issue 03) — read the signed-transcript Merkle
	 * root. The broadcaster overlays this onto `PackagedMatchResult.
	 * transcriptRoot` *before* computing the match hash + dual sig so the
	 * committed root pins the full per-action history (not the legacy
	 * session-log digest). Returns `null` when the transcript is unset
	 * (handshake not yet complete) — callers fall back to the legacy
	 * transcriptRoot in that case.
	 */
	const getSignedTranscriptRoot = useCallback((): string | null => {
		return signedTranscriptRef.current?.merkleRoot ?? null;
	}, []);

	return {
		syncGameState,
		playCard: wrappedPlayCard,
		attackWithCard: wrappedAttack,
		endTurn: wrappedEndTurn,
		performHeroPower: wrappedUseHeroPower,
		sendPokerAction,
		sendPokerTurnStarted,
		sendDeckVerification,
		proposeResult,
		downloadSessionLog,
		getSignedTranscriptRoot,
		isConnected: connectionState === 'connected',
		isHost: transportRole === 'host',
	};
}
