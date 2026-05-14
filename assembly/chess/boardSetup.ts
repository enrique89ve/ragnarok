/**
 * boardSetup.ts — AS twin of shared/protocol-core/chess/boardSetup.ts.
 *
 * Canonical initial-state primitives. Both peers must agree on the
 * starting positions and per-type base stats so initial-state hashes
 * match. Stats here are gameplay-canon, not UI.
 *
 * Note on Phase 1 scope (DECISIONS.md D1): the AS reducer does not
 * use baseHealth / spellSlots / hasSpells — those are TS slice hooks
 * around the reducer. The fields are mirrored here for completeness
 * and for future Phase 2 use; they are unused by `assembly/chess/`
 * itself.
 */

import { PIECE_KING, PIECE_QUEEN, PIECE_ROOK, PIECE_BISHOP, PIECE_KNIGHT, PIECE_PAWN } from './types';

export class InitialPiecePosition {
	pieceType: i32;
	col: i32;
	row: i32;

	constructor(pieceType: i32, col: i32, row: i32) {
		this.pieceType = pieceType;
		this.col = col;
		this.row = row;
	}
}

export class PieceStats {
	baseHealth: i32;
	spellSlots: i32;
	hasSpells: bool;

	constructor(baseHealth: i32, spellSlots: i32, hasSpells: bool) {
		this.baseHealth = baseHealth;
		this.spellSlots = spellSlots;
		this.hasSpells = hasSpells;
	}
}

/**
 * Base stats per piece type (mirrors PIECE_BASE_STATS in TS twin).
 * Lookup via getPieceStats(pieceType).
 */
export function getPieceStats(pieceType: i32): PieceStats {
	if (pieceType == PIECE_KING) return new PieceStats(100, 0, false);
	if (pieceType == PIECE_QUEEN) return new PieceStats(100, 33, true);
	if (pieceType == PIECE_ROOK) return new PieceStats(100, 30, true);
	if (pieceType == PIECE_BISHOP) return new PieceStats(100, 30, true);
	if (pieceType == PIECE_KNIGHT) return new PieceStats(100, 30, true);
	// PIECE_PAWN
	return new PieceStats(100, 0, false);
}

/**
 * Player starting positions (back row + pawn row).
 * Row 0 = player back row, row 1 = player pawn row.
 * Order MUST match TS twin's PLAYER_INITIAL_POSITIONS (seeded id-gen
 * iterates this in fixed order to derive piece ids).
 */
export function getPlayerInitialPositions(): InitialPiecePosition[] {
	const out: InitialPiecePosition[] = [];
	out.push(new InitialPiecePosition(PIECE_KNIGHT, 0, 0));
	out.push(new InitialPiecePosition(PIECE_QUEEN, 1, 0));
	out.push(new InitialPiecePosition(PIECE_KING, 2, 0));
	out.push(new InitialPiecePosition(PIECE_BISHOP, 3, 0));
	out.push(new InitialPiecePosition(PIECE_ROOK, 4, 0));
	out.push(new InitialPiecePosition(PIECE_PAWN, 0, 1));
	out.push(new InitialPiecePosition(PIECE_PAWN, 1, 1));
	out.push(new InitialPiecePosition(PIECE_PAWN, 2, 1));
	out.push(new InitialPiecePosition(PIECE_PAWN, 3, 1));
	out.push(new InitialPiecePosition(PIECE_PAWN, 4, 1));
	return out;
}

/**
 * Opponent starting positions (mirrored, row 6 back, row 5 pawns).
 */
export function getOpponentInitialPositions(): InitialPiecePosition[] {
	const out: InitialPiecePosition[] = [];
	out.push(new InitialPiecePosition(PIECE_ROOK, 0, 6));
	out.push(new InitialPiecePosition(PIECE_QUEEN, 3, 6));
	out.push(new InitialPiecePosition(PIECE_BISHOP, 1, 6));
	out.push(new InitialPiecePosition(PIECE_KING, 2, 6));
	out.push(new InitialPiecePosition(PIECE_KNIGHT, 4, 6));
	out.push(new InitialPiecePosition(PIECE_PAWN, 0, 5));
	out.push(new InitialPiecePosition(PIECE_PAWN, 1, 5));
	out.push(new InitialPiecePosition(PIECE_PAWN, 2, 5));
	out.push(new InitialPiecePosition(PIECE_PAWN, 3, 5));
	out.push(new InitialPiecePosition(PIECE_PAWN, 4, 5));
	return out;
}
