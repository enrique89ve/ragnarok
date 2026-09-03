/**
 * chessWireSender — outgoing side of the chess_command envelope flow.
 *
 * Sits between the chess UI (where the local move is initiated) and the
 * peerStore transport. Stays out of `useWireSync` so the chess UI doesn't
 * have to drag in the entire P2P-cards stack to send one envelope.
 *
 * Reads `matchId` from gameStore (mirrored there by useWireSync after
 * seed_reveal). No-ops when matchId is null — caller can call this
 * unconditionally from the move flow; SP / pre-handshake paths are
 * silently filtered.
 *
 * Outgoing seq counter is module-local. `useWireSync` resets it via
 * `resetChessWireSender()` only when the session is discarded; a short
 * reconnect keeps the pending envelope available for idempotent replay.
 *
 * Surface (post C-Chess.8):
 * - `sendChessMove`: quiet move (no capture).
 * - `sendChessAttack`: instant-kill capture.
 * - `sendChessCombatInitiated`: non-instant capture that enters poker.
 * - `sendChessMinePlacement`: signed King Divine Command placement.
 *
 * State hash (TD-27c-chess): each envelope carries `prevChessStateHash`
 * (over the protocol chess snapshot) AND `prevCardsStateHash` (over the
 * WASM-canonical cards GameState). Both are computed via the shared
 * helpers in `engine/{chessHash,wireHash}.ts` so the failure-mode policy
 * matches the cards send-path. The receiver validates both before
 * applying.
 *
 * Capture timing (TD-27c-chess fix): hashes are produced by
 * `captureChessPrevHashes()` and passed in by the caller. The caller is
 * responsible for invoking capture BEFORE applying the local mutation —
 * the sender no longer reads state for hashing, which makes "hashed
 * post-mutation" physically impossible from this module. The brand on
 * `ChessPrevHashes` enforces that the hash bundle came from the official
 * capture function (no inline forgery).
 *
 * Transcript writes (C3): this module is now a PURE send. The transcript
 * write that previously lived inline is delegated to a bridge-registered
 * observer (`setChessSendObserver`), so every `recordMove` call across
 * cards/poker/chess is funneled through `useWireSync` — the single audit
 * point for the deterministic transcript-order policy.
 */

import { useGameStore } from '../stores/gameStore';
import { usePeerStore } from '../stores/peerStore';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import type { ChessBoardPosition } from '../types/ChessTypes';
import type { ChessAttackCommand, ChessCommand, ChessCommandEnvelope, ChessCombatInitiatedCommand, ChessMinePlacementCommand, ChessMoveCommand } from '../../../../shared/p2p-wire/chess';
import { encodeChessCombatInitiated } from '../../../../shared/p2p-wire/combat';
import { computeChessPrevStateHash } from '../engine/chessHash';
import { computeCardsPrevStateHash } from '../engine/wireHash';
import { debug } from '../config/debugConfig';
import {
	computeTransitionIntentHash,
	type TransitionReceiptMessage,
} from '@shared/p2p-wire/integrity';
import {
	buildChessIntegrityCheckpoint,
	captureChessIntegrityCheckpoint,
} from './chessIntegrityCheckpoint';
import { chessIntegrityMonitor } from './chessIntegrityMonitor';
import { commitNextP2PCanonicalAction } from './canonicalActionOrder';
import type { GameplaySignatureInput } from '../protocol/signedGameplayEnvelope';
import { P2P_ACTION_APPLIED_WAIT_TIMEOUT_MS } from '@shared/p2p-wire/delivery';
import type { Hash256 } from '@shared/p2p-wire/integrity';

let outgoingChessSeq = 0;
let pendingChessEnvelope: ChessCommandEnvelope | null = null;
let pendingChessReceiptTimeout: ReturnType<typeof setTimeout> | null = null;
// Invalidates async signing continuations when a transport/session reset
// starts a new wire epoch. Without this, a late signature from the old match
// could mutate the freshly reconnected board or clear its pending reservation.
let chessWireGeneration = 0;
// Signing is asynchronous even though the local session key normally signs
// quickly. Keep a separate reservation while it is in flight so a second
// click cannot race the first command before the integrity monitor has a
// post-mutation checkpoint to register.
let pendingChessSignature = false;
type ChessGameplaySigner = (input: GameplaySignatureInput) => Promise<Readonly<{
	signerPubkey: string;
	signature: string;
}> | null>;
let chessGameplaySigner: ChessGameplaySigner | null = null;

export function setChessGameplaySigner(signer: ChessGameplaySigner | null): void {
	chessGameplaySigner = signer;
}

/**
 * Snapshot the local chess board for hashing. The combat store's
 * `boardState` is `ChessBoardState extends ChessBoardSnapshot<ChessPiece>`,
 * so the rich pieces satisfy the structural protocol-piece contract; the
 * canonicalizer reads only protocol fields by virtue of its generic
 * constraint, ignoring rich client overlays.
 */
function readChessSnapshot(): ReturnType<typeof useUnifiedCombatStore.getState>['boardState'] | null {
	return useUnifiedCombatStore.getState().boardState ?? null;
}

/**
 * Brand for `ChessPrevHashes`. Module-private real Symbol (not just a
 * type-level `declare`) so the brand survives JS emission — using
 * `declare const ... : unique symbol` would compile fine but crash at
 * runtime with `ReferenceError` when used as a computed key. The Symbol
 * is intentionally NOT exported, so the only way to satisfy
 * `ChessPrevHashes` is to call `captureChessPrevHashes()`.
 *
 * The brand does NOT prove the snapshot was taken pre-mutation; that's a
 * runtime contract enforced by the receiver's dual-hash validation
 * (TD-27c-chess). What the brand DOES prove is that the value flowed
 * through the official capture function — a real, useful invariant.
 */
const ChessPrevHashesBrand: unique symbol = Symbol('chess-prev-hashes');

export interface ChessPrevHashes {
	readonly [ChessPrevHashesBrand]: true;
	readonly chess: string;
	readonly cards: string;
}

/**
 * Capture the dual prev-state hashes (chess + cards) over the CURRENT
 * local state. The caller MUST invoke this BEFORE applying any local
 * mutation (`movePiece`, etc.); otherwise the hashes will reflect
 * post-mutation state and the receiver's validation will diverge — that
 * was the TD-27c-chess bug.
 *
 * Returns a branded value so the consumers (`sendChessMove`,
 * `sendChessAttack`) cannot accept literally-constructed hashes.
 *
 * Cards hash perspective uses the canonical player side, not the transport
 * host hint. Seed parity may assign the first-mover side to either browser.
 */
export function captureChessPrevHashes(): ChessPrevHashes {
	const isCardsAuthority = useGameStore.getState().myCanonicalSide === 'player';
	const cards = computeCardsPrevStateHash(
		useGameStore.getState().gameState,
		isCardsAuthority,
	);
	const chess = computeChessPrevStateHash(readChessSnapshot());
	return {
		[ChessPrevHashesBrand]: true,
		chess,
		cards,
	};
}

/**
 * Bridge-registered post-send hook. Fired once per successfully-sent
 * envelope so the bridge can write the corresponding transcript entry
 * with its own identity policy (localPlayerId, hiveUsername, etc.).
 *
 * Module-singleton because the bridge mounts once per P2P session via
 * P2PProvider; `setChessSendObserver(null)` on bridge unmount.
 */
export type ChessSendObserver = (
	envelope: ChessCommandEnvelope,
	transcriptExtra: Record<string, unknown>,
) => void;

let chessSendObserver: ChessSendObserver | null = null;

export function setChessSendObserver(observer: ChessSendObserver | null): void {
	chessSendObserver = observer;
}

export interface ChessMoveEmit {
	readonly pieceId: string;
	readonly from: ChessBoardPosition;
	readonly to: ChessBoardPosition;
	/** Canonical move order captured before the local reducer mutates state. */
	readonly canonicalOrder: number;
}

type ApplyLocalChessMutation = () => boolean;

function quarantineChessSession(detail: string): void {
	const peer = usePeerStore.getState();
	if (peer.p2pIntegrityError !== null) return;
	peer.setP2pIntegrityError(`Game integrity diverged. Actions are paused until the match is left. (${detail})`);
}

function clearPendingChessReceiptTimeout(): void {
	if (!pendingChessReceiptTimeout) return;
	clearTimeout(pendingChessReceiptTimeout);
	pendingChessReceiptTimeout = null;
}

function armPendingChessReceiptTimeout(
	envelope: ChessCommandEnvelope,
	nextRoot: Hash256 | null,
): void {
	clearPendingChessReceiptTimeout();
	pendingChessReceiptTimeout = setTimeout(() => {
		pendingChessReceiptTimeout = null;
		if (pendingChessEnvelope !== envelope) return;
		if (chessIntegrityMonitor.getState().status !== 'healthy') return;
		if (usePeerStore.getState().connectionState !== 'connected') return;
		quarantineChessSession('chess_transition_receipt_timeout');
		chessIntegrityMonitor.quarantine({
			reason: 'receipt_timeout',
			commandId: envelope.commandId,
			expectedRoot: nextRoot,
			receivedRoot: null,
			detail: 'the opponent did not confirm the chess transition before the delivery window closed',
		});
	}, P2P_ACTION_APPLIED_WAIT_TIMEOUT_MS);
}

export function pausePendingChessReceiptTimeout(): void {
	clearPendingChessReceiptTimeout();
}

export interface ChessAttackEmit {
	readonly pieceId: string;
	readonly from: ChessBoardPosition;
	readonly to: ChessBoardPosition;
	readonly defenderId: string;
	/** Canonical action order captured before the local reducer mutates state. */
	readonly canonicalOrder: number;
}

export type ChessCombatInitiatedEmit = ChessAttackEmit;

export interface ChessMinePlacementEmit {
	readonly owner: 'player' | 'opponent';
	readonly kingId: string;
	readonly position: ChessBoardPosition;
	readonly direction?: 'horizontal' | 'vertical' | 'diagonal_up' | 'diagonal_down';
	readonly mineId: string;
	readonly affectedTiles: readonly ChessBoardPosition[];
	/** Canonical action order captured before the local reducer mutates state. */
	readonly canonicalOrder: number;
}

/**
 * Build + send a chess_command envelope around the given inner command,
 * record the corresponding transcript entry, and log diagnostics. Both
 * outgoing paths (move, attack) flow through here so seq counter +
 * matchId gating + transcript identity policy live in one place.
 *
 * When `applyLocalMutation` is supplied, signing happens first and the
 * callback is the only point at which the canonical local state may mutate.
 * This is the normal P2P path. The optional form preserves the legacy caller
 * contract for already-applied actions.
 *
 * `prev` MUST come from `captureChessPrevHashes()` invoked BEFORE the
 * local mutation; the brand on `ChessPrevHashes` enforces the origin,
 * the timing is the caller's contract. When a deferred mutation callback is
 * supplied, this module captures the post-mutation checkpoint only after that
 * callback reports success.
 */
function dispatchChessCommand(
	command: ChessCommand,
	prev: ChessPrevHashes,
	transcriptExtra: Record<string, unknown>,
	canonicalOrder: number,
	applyLocalMutation?: ApplyLocalChessMutation,
): boolean {
	const { matchId, myCanonicalSide } = useGameStore.getState();
	if (!matchId) {
		// SP or pre-handshake — nothing to send.
		console.warn('[chessWireSender] SKIP: no matchId (SP or pre-handshake)', {
			commandType: command.type,
			myCanonicalSide,
		});
		return false;
	}

	const peerState = usePeerStore.getState();
	const send = peerState.send;
	const connectionState = peerState.connectionState;
	if (connectionState !== 'connected') {
		console.warn('[chessWireSender] SKIP: not connected', { connectionState });
		return false;
	}
	if (peerState.p2pIntegrityError) {
		console.warn('[chessWireSender] SKIP: P2P integrity is quarantined');
		return false;
	}
	if (!peerState.p2pSessionLocalAuthorized || !peerState.p2pSessionRemoteAuthorized || !chessGameplaySigner) {
		console.warn('[chessWireSender] SKIP: session authorization is incomplete');
		return false;
	}
	if (pendingChessSignature) {
		console.warn('[chessWireSender] SKIP: gameplay signature is already pending');
		return false;
	}

	const unsignedEnvelope = {
		type: 'chess_command' as const,
		matchId,
		seq: outgoingChessSeq,
		commandId: crypto.randomUUID(),
		prevChessStateHash: prev.chess,
		prevCardsStateHash: prev.cards,
		command,
	};
	const preCheckpoint = buildChessIntegrityCheckpoint({
		matchId,
		chessHash: prev.chess,
		cardsHash: prev.cards,
	});
	if (preCheckpoint === null) {
		quarantineChessSession('chess_pre_checkpoint_unavailable');
		chessIntegrityMonitor.quarantine({
			reason: 'local_checkpoint_unavailable',
			commandId: unsignedEnvelope.commandId,
			expectedRoot: null,
			receivedRoot: null,
			detail: 'cannot build the pre-mutation chess+cards transition checkpoint',
		});
		debug.error('[chessWireSender] transition blocked — integrity checkpoint unavailable');
		return false;
	}
	const intentHash = computeTransitionIntentHash({
		matchId,
		seq: unsignedEnvelope.seq,
		commandId: unsignedEnvelope.commandId,
		prevRoot: preCheckpoint.root,
		action: command,
	});
	const signInput: GameplaySignatureInput = {
		matchId,
		seq: unsignedEnvelope.seq,
		commandId: unsignedEnvelope.commandId,
		prevStateHash: `${prev.chess}|${prev.cards}`,
		command,
	};
	const signer = chessGameplaySigner;
	if (!signer) return false;
	pendingChessSignature = true;
	const dispatchGeneration = chessWireGeneration;
	void Promise.resolve()
		.then(() => signer(signInput))
		.then((signed) => {
		if (dispatchGeneration !== chessWireGeneration) {
			debug.warn('[chessWireSender] ignoring a late gameplay signature from a reset wire epoch');
			return;
		}
		if (!signed) {
			debug.warn('[chessWireSender] SKIP: gameplay signature unavailable');
			quarantineChessSession('chess_signature_unavailable');
			chessIntegrityMonitor.quarantine({
				reason: 'signature_unavailable',
				commandId: unsignedEnvelope.commandId,
				expectedRoot: preCheckpoint.root,
				receivedRoot: null,
				detail: 'the browser session key did not produce a gameplay signature',
			});
			return;
		}
		const latestPeerState = usePeerStore.getState();
		if (
			latestPeerState.connectionState !== 'connected'
			|| useGameStore.getState().matchId !== matchId
			|| latestPeerState.p2pIntegrityError
		) {
			debug.warn('[chessWireSender] dropping stale signed command before local mutation');
			return;
		}

		// The P2P UI supplies this callback for canonical actions. It is invoked
		// only after the signature exists, so a rejected/failed signer can never
		// leave a local board mutation with no corresponding wire command.
		if (applyLocalMutation) {
			let applied = false;
			try {
				applied = applyLocalMutation();
			} catch (error: unknown) {
				debug.warn('[chessWireSender] local canonical mutation failed', error);
			}
			if (!applied) {
				quarantineChessSession('chess_local_mutation_failed');
				chessIntegrityMonitor.quarantine({
					reason: 'local_checkpoint_unavailable',
					commandId: unsignedEnvelope.commandId,
					expectedRoot: preCheckpoint.root,
					receivedRoot: null,
					detail: 'the signed command could not be applied to the current local canonical state',
				});
				debug.error('[chessWireSender] transition quarantined — local mutation was not applied');
				return;
			}
		}
		const postCheckpoint = captureChessIntegrityCheckpoint({
			matchId,
			isCardsAuthority: myCanonicalSide === 'player',
		});
		if (postCheckpoint === null) {
			quarantineChessSession('chess_post_checkpoint_unavailable');
			chessIntegrityMonitor.quarantine({
				reason: 'local_checkpoint_unavailable',
				commandId: unsignedEnvelope.commandId,
				expectedRoot: preCheckpoint.root,
				receivedRoot: null,
				detail: 'cannot build the post-mutation chess+cards transition checkpoint',
			});
			debug.error('[chessWireSender] transition quarantined — post-mutation checkpoint unavailable');
			return;
		}
		const registration = chessIntegrityMonitor.register({
			matchId,
			seq: unsignedEnvelope.seq,
			commandId: unsignedEnvelope.commandId,
			intentHash,
			prevRoot: preCheckpoint.root,
			nextRoot: postCheckpoint.root,
		});
		if (registration.status === 'blocked') {
			quarantineChessSession(`chess_transition_${registration.reason}`);
			chessIntegrityMonitor.quarantine({
				reason: 'local_checkpoint_unavailable',
				commandId: unsignedEnvelope.commandId,
				expectedRoot: preCheckpoint.root,
				receivedRoot: postCheckpoint.root,
				detail: `the local action was applied but transition registration was blocked: ${registration.reason}`,
			});
			debug.error(`[chessWireSender] transition quarantined — ${registration.reason}`);
			return;
		}
		const envelope: ChessCommandEnvelope = { ...unsignedEnvelope, ...signed };
		pendingChessEnvelope = envelope;
		outgoingChessSeq += 1;

		// Unconditional console.log — temporary diagnostic. Will move back to
		// debug.chess once the channel is verified active for users.
		const commandDetails = command.type === 'chess_mine_placement'
			? { mineId: command.mineId.slice(0, 12), position: command.position, affectedTiles: command.affectedTiles.length }
			: { piece: command.pieceId.slice(0, 8), from: command.from, to: command.to };
		console.log('[chessWireSender] SEND chess_command', {
			commandType: command.type,
			seq: envelope.seq,
			commandId: envelope.commandId.slice(0, 8),
			matchId: matchId.slice(0, 8),
			mySide: myCanonicalSide,
			...commandDetails,
			prevChessHash: prev.chess ? prev.chess.slice(0, 12) : '(empty)',
			prevCardsHash: prev.cards ? prev.cards.slice(0, 12) : '(empty)',
		});
		const accepted = send(envelope);
		if (!accepted) {
			// The local reducer has already committed the signed transition, so a
			// dropped envelope is a hard integrity failure. Do not record it as a
			// successfully delivered move or allow the caller to continue with a
			// sequence gap; freeze the match and require an explicit leave.
			pendingChessEnvelope = null;
			quarantineChessSession('chess_transport_send_rejected');
			chessIntegrityMonitor.quarantine({
				reason: 'local_checkpoint_unavailable',
				commandId: envelope.commandId,
				expectedRoot: preCheckpoint.root,
				receivedRoot: postCheckpoint.root,
				detail: 'transport rejected the signed chess command after local commit',
			});
			debug.error('[chessWireSender] transition quarantined — transport rejected signed command');
			return;
		}
		armPendingChessReceiptTimeout(envelope, postCheckpoint.root);
		const actorId = usePeerStore.getState().myPeerId;
		const transcriptCanonicalOrder = actorId
			? commitNextP2PCanonicalAction({ actionId: envelope.commandId, actorId })
			: null;
		if (transcriptCanonicalOrder === null) {
			quarantineChessSession('chess_canonical_order_unavailable');
			chessIntegrityMonitor.quarantine({
				reason: 'local_checkpoint_unavailable',
				commandId: envelope.commandId,
				expectedRoot: preCheckpoint.root,
				receivedRoot: postCheckpoint.root,
				detail: 'the P2P lifecycle could not commit a canonical transcript order',
			});
			return;
		}

		// Transcript: delegated to the bridge-registered observer (C3). Pre-C3
		// this module called `recordMove` inline; centralising in the bridge
		// keeps a single audit point for the transcript-order policy.
		try {
			chessSendObserver?.(envelope, {
				...transcriptExtra,
				canonicalOrder: transcriptCanonicalOrder,
			});
		} catch (error) {
			debug.warn('[chessWireSender] transcript observer failed after send', error);
		}
		})
		.catch((error: unknown) => {
		if (dispatchGeneration !== chessWireGeneration) return;
		debug.warn('[chessWireSender] gameplay signature failed', error);
		quarantineChessSession('chess_signature_failed');
		chessIntegrityMonitor.quarantine({
			reason: 'signature_failed',
			commandId: unsignedEnvelope.commandId,
			expectedRoot: preCheckpoint.root,
			receivedRoot: null,
			detail: 'browser gameplay signing failed before the command could be sent',
		});
		})
		.finally(() => {
			if (dispatchGeneration === chessWireGeneration) pendingChessSignature = false;
		});

	const queuedDetails = command.type === 'chess_mine_placement'
		? `mine=${command.mineId.slice(0, 8)} (${command.position.row},${command.position.col})`
		: `piece=${command.pieceId.slice(0, 8)} (${command.from.row},${command.from.col})→(${command.to.row},${command.to.col})`;
	debug.chess(`[chessWireSender] queued signed ${command.type} seq=${unsignedEnvelope.seq} ${queuedDetails}`);
	return true;
}

export function confirmChessTransitionReceipt(
	receipt: TransitionReceiptMessage,
): ReturnType<typeof chessIntegrityMonitor.confirm> {
	const confirmation = chessIntegrityMonitor.confirm(receipt);
	if (confirmation.status === 'confirmed' || confirmation.status === 'quarantined') {
		clearPendingChessReceiptTimeout();
		pendingChessEnvelope = null;
	}
	return confirmation;
}

/**
 * Re-send the single unconfirmed intent after a same-tab transport reconnect.
 * The receiver caches the original receipt by commandId, so this is
 * idempotent whether the first intent was lost or only its receipt was lost.
 */
export function retryPendingChessTransition(): boolean {
	const envelope = pendingChessEnvelope;
	if (envelope === null) return false;
	if (chessIntegrityMonitor.getState().status !== 'healthy') return false;
	const peer = usePeerStore.getState();
	if (peer.connectionState !== 'connected') return false;
	if (peer.p2pIntegrityError) return false;
	const accepted = peer.send(envelope);
	if (accepted) {
		const pendingRoot = chessIntegrityMonitor.getState();
		armPendingChessReceiptTimeout(
			envelope,
			pendingRoot.status === 'healthy' ? pendingRoot.pending?.nextRoot ?? null : null,
		);
	}
	return accepted;
}

/** True while a local canonical action is waiting for its gameplay signature. */
export function isChessCommandPending(): boolean {
	return pendingChessSignature;
}

/**
 * Send a chess_move envelope (quiet move). Returns true on send, false
 * when no P2P session is active (silent no-op for SP).
 *
 * `prev` MUST be captured via `captureChessPrevHashes()` BEFORE the
 * caller applied the local mutation. See `captureChessPrevHashes` JSDoc.
 */
export function sendChessMove(
	move: ChessMoveEmit,
	prev: ChessPrevHashes,
	applyLocalMutation?: ApplyLocalChessMutation,
): boolean {
	const command: ChessMoveCommand = {
		type: 'chess_move',
		pieceId: move.pieceId,
		from: move.from,
		to: move.to,
	};
	return dispatchChessCommand(command, prev, {}, move.canonicalOrder, applyLocalMutation);
}

/**
 * Send a chess_attack envelope (instant-kill capture only). The caller
 * MUST have verified `isChessAttackInstantKill` returns true before
 * invoking. Receiver re-verifies and rejects with
 * `non_instant_capture_not_supported_p2p` otherwise.
 *
 * `prev` MUST be captured via `captureChessPrevHashes()` BEFORE the
 * caller applied the local mutation. See `captureChessPrevHashes` JSDoc.
 */
export function sendChessAttack(
	attack: ChessAttackEmit,
	prev: ChessPrevHashes,
	applyLocalMutation?: ApplyLocalChessMutation,
): boolean {
	const command: ChessAttackCommand = {
		type: 'chess_attack',
		pieceId: attack.pieceId,
		from: attack.from,
		to: attack.to,
		defenderId: attack.defenderId,
	};
	return dispatchChessCommand(command, prev, {
		defenderId: attack.defenderId,
		isInstantKill: true,
	}, attack.canonicalOrder, applyLocalMutation);
}

/**
 * Send a non-instant capture envelope. Receiver mirrors the same attack
 * animation and then stages `pendingCombat`, which lets the existing poker
 * bootstrap run on both peers.
 */
export function sendChessCombatInitiated(
	attack: ChessCombatInitiatedEmit,
	prev: ChessPrevHashes,
	applyLocalMutation?: ApplyLocalChessMutation,
): boolean {
	const command: ChessCombatInitiatedCommand = {
		type: 'chess_combat_initiated',
		pieceId: attack.pieceId,
		from: attack.from,
		to: attack.to,
		defenderId: attack.defenderId,
		compact: encodeChessCombatInitiated({ from: attack.from, to: attack.to }),
	};
	return dispatchChessCommand(command, prev, {
		defenderId: attack.defenderId,
		isInstantKill: false,
	}, attack.canonicalOrder, applyLocalMutation);
}

/**
 * Send a signed King Divine Command placement. The mine is applied locally
 * only after the gameplay signature resolves, exactly like chess movement.
 * `affectedTiles` is part of the signed payload and is revalidated against
 * the match-seeded placement id by the receiver.
 */
export function sendChessMinePlacement(
	mine: ChessMinePlacementEmit,
	prev: ChessPrevHashes,
	applyLocalMutation?: ApplyLocalChessMutation,
): boolean {
	const command: ChessMinePlacementCommand = {
		type: 'chess_mine_placement',
		owner: mine.owner,
		kingId: mine.kingId,
		position: mine.position,
		...(mine.direction === undefined ? {} : { direction: mine.direction }),
		mineId: mine.mineId,
		affectedTiles: [...mine.affectedTiles],
	};
	return dispatchChessCommand(command, prev, {
		owner: mine.owner,
		kingId: mine.kingId,
		position: mine.position,
		...(mine.direction === undefined ? {} : { direction: mine.direction }),
		mineId: mine.mineId,
		affectedTiles: [...mine.affectedTiles],
	}, mine.canonicalOrder, applyLocalMutation);
}

/**
 * Reset module-local state when a match/session ends. A short reconnect keeps
 * this sequence and the pending receipt cache alive so the peer can replay the
 * same envelope; the next fresh session starts at seq 0.
 */
export function resetChessWireSender(): void {
	chessWireGeneration += 1;
	outgoingChessSeq = 0;
	clearPendingChessReceiptTimeout();
	pendingChessEnvelope = null;
	pendingChessSignature = false;
	chessGameplaySigner = null;
	chessIntegrityMonitor.reset();
}
