/**
 * reducer.ts — AS twin of shared/protocol-core/chess/reducer.ts.
 *
 * Pure state-transition function. `applyChessAction(snapshotJson, actionJson)`
 * returns canonical-form JSON of either `{ok:true, state}` or
 * `{ok:false, reason}`. Never throws, never mutates the input. Identical
 * inputs across peers yield byte-equal outputs (D2 + D3).
 *
 * Scope is geometry only (D1). Health, stamina, element, log, animation
 * are TS slice concerns and are applied as before/after hooks around
 * this reducer call.
 */

import { Snapshot } from './state';
import {
	Piece,
	PIECE_PAWN,
	PIECE_KING,
	SIDE_PLAYER,
	SIDE_OPPONENT,
	SIDE_NONE,
	STATUS_SETUP,
	STATUS_PLAYING,
} from './types';
import {
	parseSnapshot,
	parseAction,
	emitOk,
	emitRejection,
	ACTION_MOVE,
	ACTION_CAPTURE,
	ACTION_PROMOTE,
	ParsedAction,
} from './canonical';
import {
	getValidMoves,
	isKingInCheck,
	checkWinCondition,
} from './rules';

// ====================================================================
// clonePieces — deep copy that preserves order. Used to keep the
// reducer pure (no mutation of the parsed input snapshot).
// ====================================================================

function clonePieces(src: Piece[]): Piece[] {
	const out: Piece[] = [];
	for (let i = 0; i < src.length; i++) {
		const p = src[i];
		const copy = new Piece();
		copy.id = p.id;
		copy.pieceType = p.pieceType;
		copy.owner = p.owner;
		copy.row = p.row;
		copy.col = p.col;
		copy.hasMoved = p.hasMoved;
		out.push(copy);
	}
	return out;
}

function findPieceIdx(pieces: Piece[], id: string): i32 {
	for (let i = 0; i < pieces.length; i++) {
		if (pieces[i].id == id) return i;
	}
	return -1;
}

// ====================================================================
// refreshDerived — recompute inCheck for both sides + winStatus.
// Mirrors TS refreshDerived: preserve non-terminal slice statuses
// ('setup', 'combat'); promote to terminal only when win-cond fires.
// ====================================================================

function refreshDerived(snap: Snapshot, nextPieces: Piece[]): Snapshot {
	const playerInCheck = isKingInCheck(SIDE_PLAYER, nextPieces);
	const opponentInCheck = isKingInCheck(SIDE_OPPONENT, nextPieces);
	let inCheck: i32 = SIDE_NONE;
	if (playerInCheck) inCheck = SIDE_PLAYER;
	else if (opponentInCheck) inCheck = SIDE_OPPONENT;

	const winStatus = checkWinCondition(nextPieces);
	const out = new Snapshot();
	out.pieces = nextPieces;
	out.currentTurn = snap.currentTurn;
	out.moveCount = snap.moveCount;
	out.inCheck = inCheck;
	// winStatus == STATUS_PLAYING means no terminal change; keep slice status.
	out.gameStatus = winStatus == STATUS_PLAYING ? snap.gameStatus : winStatus;
	return out;
}

// ====================================================================
// reduceMove
// ====================================================================

function reduceMove(snap: Snapshot, action: ParsedAction): string {
	const idx = findPieceIdx(snap.pieces, action.pieceId);
	if (idx < 0) return emitRejection('no-such-piece');
	const piece = snap.pieces[idx];
	if (piece.owner != snap.currentTurn) return emitRejection('wrong-turn');

	const vm = getValidMoves(piece, snap.pieces);
	let legal = false;
	for (let i = 0; i < vm.moves.length; i++) {
		if (vm.moves[i].row == action.toRow && vm.moves[i].col == action.toCol) {
			legal = true;
			break;
		}
	}
	if (!legal) return emitRejection('illegal-target');

	const nextPieces = clonePieces(snap.pieces);
	nextPieces[idx].row = action.toRow;
	nextPieces[idx].col = action.toCol;
	nextPieces[idx].hasMoved = true;

	const next = new Snapshot();
	next.pieces = snap.pieces;
	next.currentTurn = snap.currentTurn;
	next.moveCount = snap.moveCount + 1;
	next.gameStatus = snap.gameStatus;
	next.inCheck = snap.inCheck;
	return emitOk(refreshDerived(next, nextPieces));
}

// ====================================================================
// reduceCapture
// ====================================================================

function reduceCapture(snap: Snapshot, action: ParsedAction): string {
	const aIdx = findPieceIdx(snap.pieces, action.attackerId);
	const vIdx = findPieceIdx(snap.pieces, action.victimId);
	if (aIdx < 0 || vIdx < 0) return emitRejection('no-such-piece');

	const attacker = snap.pieces[aIdx];
	const victim = snap.pieces[vIdx];
	if (attacker.owner != snap.currentTurn) return emitRejection('wrong-turn');
	if (victim.owner == attacker.owner) return emitRejection('illegal-target');
	if (victim.row != action.toRow || victim.col != action.toCol) {
		return emitRejection('illegal-target');
	}

	// Build the next-pieces array: drop the victim, move the attacker.
	const nextPieces: Piece[] = [];
	for (let i = 0; i < snap.pieces.length; i++) {
		if (i == vIdx) continue;
		const p = snap.pieces[i];
		const copy = new Piece();
		copy.id = p.id;
		copy.pieceType = p.pieceType;
		copy.owner = p.owner;
		copy.row = p.row;
		copy.col = p.col;
		copy.hasMoved = p.hasMoved;
		if (i == aIdx) {
			copy.row = action.toRow;
			copy.col = action.toCol;
			copy.hasMoved = true;
		}
		nextPieces.push(copy);
	}

	const next = new Snapshot();
	next.pieces = snap.pieces;
	next.currentTurn = snap.currentTurn;
	next.moveCount = snap.moveCount + 1;
	next.gameStatus = snap.gameStatus;
	next.inCheck = snap.inCheck;
	return emitOk(refreshDerived(next, nextPieces));
}

// ====================================================================
// reducePromote
// ====================================================================

function reducePromote(snap: Snapshot, action: ParsedAction): string {
	const idx = findPieceIdx(snap.pieces, action.pieceId);
	if (idx < 0) return emitRejection('no-such-piece');
	const piece = snap.pieces[idx];
	if (piece.pieceType != PIECE_PAWN) return emitRejection('not-promotable');
	if (action.promoteTo == PIECE_PAWN || action.promoteTo == PIECE_KING) {
		return emitRejection('not-promotable');
	}
	const onFar = (piece.owner == SIDE_PLAYER && piece.row == 6) ||
		(piece.owner == SIDE_OPPONENT && piece.row == 0);
	if (!onFar) return emitRejection('not-promotable');

	const nextPieces = clonePieces(snap.pieces);
	nextPieces[idx].pieceType = action.promoteTo;

	return emitOk(refreshDerived(snap, nextPieces));
}

// ====================================================================
// reduceEndTurn
// ====================================================================

function reduceEndTurn(snap: Snapshot): string {
	if (snap.gameStatus != STATUS_PLAYING && snap.gameStatus != STATUS_SETUP) {
		return emitRejection('game-over');
	}
	const next = new Snapshot();
	next.pieces = snap.pieces;
	next.currentTurn = snap.currentTurn == SIDE_PLAYER ? SIDE_OPPONENT : SIDE_PLAYER;
	next.gameStatus = snap.gameStatus;
	next.moveCount = snap.moveCount;
	next.inCheck = snap.inCheck;
	return emitOk(next);
}

// ====================================================================
// Public entry — JSON in, JSON out.
// ====================================================================

export function applyChessAction(snapshotJson: string, actionJson: string): string {
	const snap = parseSnapshot(snapshotJson);
	const action = parseAction(actionJson);

	if (action.kind == ACTION_MOVE) return reduceMove(snap, action);
	if (action.kind == ACTION_CAPTURE) return reduceCapture(snap, action);
	if (action.kind == ACTION_PROMOTE) return reducePromote(snap, action);
	// ACTION_END_TURN
	return reduceEndTurn(snap);
}
