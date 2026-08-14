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
 * Outgoing seq counter is module-local. `useWireSync` resets it on
 * disconnect via `resetChessWireSender()` so reconnects start fresh.
 *
 * Surface (post C-Chess.8):
 * - `sendChessMove`: quiet move (no capture).
 * - `sendChessAttack`: instant-kill capture.
 * - `sendChessCombatInitiated`: non-instant capture that enters poker.
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
 * point for OPEN-2 (deterministic transcript ordering).
 */

import { useGameStore } from '../stores/gameStore';
import { usePeerStore } from '../stores/peerStore';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import type { ChessBoardPosition } from '../types/ChessTypes';
import type { ChessAttackCommand, ChessCommand, ChessCommandEnvelope, ChessCombatInitiatedCommand, ChessMoveCommand } from '../../../../shared/p2p-wire/chess';
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

let outgoingChessSeq = 0;
let pendingChessEnvelope: ChessCommandEnvelope | null = null;

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
 * Why `peerStore.isHost` here:
 *   `isCardsAuthority` selects the canonical perspective for the cards
 *   hash. Today cards is host-authoritative (see PVP_WIRE_PROTOCOL §5
 *   "Cards Phase — Host-Authoritative"), so `isCardsAuthority === isHost`
 *   is a literal alias — see `useWireSync.ts:70`. The host stores state
 *   from its own perspective; the joiner flips into host perspective
 *   before hashing so the bytes match (`computeCardsPrevStateHash`).
 *
 * TODO(OPEN-8): when cards migrates to symmetric (chess-style), the cards
 * hash perspective will be derived from `Authority.myRole` (first-mover
 * is the canonical owner), NOT from the WS-transport `isHost` axis. The
 * three sites that today read `peerStore.isHost` as a cards-authority
 * proxy must move together: `useWireSync.ts:70`, this function, and
 * `BlockchainSubscriber.ts:319` (proposer gate). Tracked in OPEN-8.
 */
export function captureChessPrevHashes(): ChessPrevHashes {
	// Today: cards-authority === ws-host. See JSDoc above.
	const isCardsAuthority = usePeerStore.getState().isHost;
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
}

export interface ChessAttackEmit {
	readonly pieceId: string;
	readonly from: ChessBoardPosition;
	readonly to: ChessBoardPosition;
	readonly defenderId: string;
}

export type ChessCombatInitiatedEmit = ChessAttackEmit;

/**
 * Build + send a chess_command envelope around the given inner command,
 * record the corresponding transcript entry, and log diagnostics. Both
 * outgoing paths (move, attack) flow through here so seq counter +
 * matchId gating + transcript identity policy live in one place.
 *
 * `prev` MUST come from `captureChessPrevHashes()` invoked BEFORE the
 * local mutation; the brand on `ChessPrevHashes` enforces the origin,
 * the timing is the caller's contract. This module no longer reads
 * state for hashing — that responsibility belongs to the caller, who
 * alone knows when state is unmutated.
 */
function dispatchChessCommand(
	command: ChessCommand,
	prev: ChessPrevHashes,
	transcriptExtra: Record<string, unknown>,
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

	const envelope: ChessCommandEnvelope = {
		type: 'chess_command',
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
	const postCheckpoint = captureChessIntegrityCheckpoint({
		matchId,
		isCardsAuthority: peerState.isHost,
	});
	if (preCheckpoint === null || postCheckpoint === null) {
		chessIntegrityMonitor.quarantine({
			reason: 'local_checkpoint_unavailable',
			commandId: envelope.commandId,
			expectedRoot: preCheckpoint?.root ?? null,
			receivedRoot: postCheckpoint?.root ?? null,
			detail: 'cannot build a complete chess+cards transition checkpoint',
		});
		debug.error('[chessWireSender] transition blocked — integrity checkpoint unavailable');
		return false;
	}
	const intentHash = computeTransitionIntentHash({
		matchId,
		seq: envelope.seq,
		commandId: envelope.commandId,
		prevRoot: preCheckpoint.root,
		action: command,
	});
	const registration = chessIntegrityMonitor.register({
		matchId,
		seq: envelope.seq,
		commandId: envelope.commandId,
		intentHash,
		prevRoot: preCheckpoint.root,
		nextRoot: postCheckpoint.root,
	});
	if (registration.status === 'blocked') {
		debug.warn(`[chessWireSender] transition blocked — ${registration.reason}`);
		return false;
	}
	pendingChessEnvelope = envelope;
	outgoingChessSeq += 1;

	// Unconditional console.log — temporary diagnostic. Will move back to
	// debug.chess once the channel is verified active for users.
	console.log('[chessWireSender] SEND chess_command', {
		commandType: command.type,
		seq: envelope.seq,
		commandId: envelope.commandId.slice(0, 8),
		matchId: matchId.slice(0, 8),
		mySide: myCanonicalSide,
		piece: command.pieceId.slice(0, 8),
		from: command.from,
		to: command.to,
		prevChessHash: prev.chess ? prev.chess.slice(0, 12) : '(empty)',
		prevCardsHash: prev.cards ? prev.cards.slice(0, 12) : '(empty)',
	});
	send(envelope);

	// Transcript: delegated to the bridge-registered observer (C3). Pre-C3
	// this module called `recordMove` inline; centralising in the bridge
	// keeps a single audit point for transcript ordering policy (OPEN-2).
	try {
		chessSendObserver?.(envelope, transcriptExtra);
	} catch (error) {
		debug.warn('[chessWireSender] transcript observer failed after send', error);
	}

	debug.chess(`[chessWireSender] sent ${command.type} seq=${envelope.seq} piece=${command.pieceId.slice(0, 8)} (${command.from.row},${command.from.col})→(${command.to.row},${command.to.col})`);
	return true;
}

export function confirmChessTransitionReceipt(
	receipt: TransitionReceiptMessage,
): ReturnType<typeof chessIntegrityMonitor.confirm> {
	const confirmation = chessIntegrityMonitor.confirm(receipt);
	if (confirmation.status === 'confirmed' || confirmation.status === 'quarantined') {
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
	peer.send(envelope);
	return true;
}

/**
 * Send a chess_move envelope (quiet move). Returns true on send, false
 * when no P2P session is active (silent no-op for SP).
 *
 * `prev` MUST be captured via `captureChessPrevHashes()` BEFORE the
 * caller applied the local mutation. See `captureChessPrevHashes` JSDoc.
 */
export function sendChessMove(move: ChessMoveEmit, prev: ChessPrevHashes): boolean {
	const command: ChessMoveCommand = {
		type: 'chess_move',
		pieceId: move.pieceId,
		from: move.from,
		to: move.to,
	};
	return dispatchChessCommand(command, prev, {});
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
export function sendChessAttack(attack: ChessAttackEmit, prev: ChessPrevHashes): boolean {
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
	});
}

/**
 * Send a non-instant capture envelope. Receiver mirrors the same attack
 * animation and then stages `pendingCombat`, which lets the existing poker
 * bootstrap run on both peers.
 */
export function sendChessCombatInitiated(attack: ChessCombatInitiatedEmit, prev: ChessPrevHashes): boolean {
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
	});
}

/**
 * Reset module-local seq counter. Called by useWireSync on disconnect so a
 * reconnected session starts at seq 0 (matching the receive-side reset of
 * `lastIncomingChessSeqRef`).
 */
export function resetChessWireSender(): void {
	outgoingChessSeq = 0;
	pendingChessEnvelope = null;
	chessIntegrityMonitor.reset();
}
