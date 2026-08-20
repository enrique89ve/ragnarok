/**
 * rules.ts — AS twin of shared/protocol-core/chess/chessRules.ts.
 *
 * Pure rule predicates. Identical inputs always yield identical outputs
 * — safe to call from any deterministic context. No Math.random, no
 * Date.now, no host-environment reach (audit-wasm-determinism.mjs
 * enforces this).
 *
 * Mirrors the TS predicate set: getValidMoves, getThreateningPieces,
 * isKingInCheck, isCheckmate, checkPawnPromotion, checkWinCondition.
 */

import {
	Piece,
	Position,
	BOARD_ROWS,
	BOARD_COLS,
	PIECE_KING,
	PIECE_QUEEN,
	PIECE_ROOK,
	PIECE_PAWN,
	SIDE_PLAYER,
	SIDE_OPPONENT,
	PATTERN_LINE,
	STATUS_PLAYING,
	STATUS_PLAYER_WINS,
	STATUS_OPPONENT_WINS,
	STATUS_DRAW,
	getPatternType,
	getPatternDirections,
} from './types';

// ====================================================================
// Cell inspection (empty / ally / enemy / invalid).
// ====================================================================

const CELL_EMPTY: i32 = 0;
const CELL_ALLY: i32 = 1;
const CELL_ENEMY: i32 = 2;
const CELL_INVALID: i32 = 3;

function inspectCell(
	row: i32,
	col: i32,
	moverOwner: i32,
	pieces: Piece[],
): i32 {
	if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
		return CELL_INVALID;
	}
	for (let i = 0; i < pieces.length; i++) {
		const p = pieces[i];
		if (p.row == row && p.col == col) {
			return p.owner == moverOwner ? CELL_ALLY : CELL_ENEMY;
		}
	}
	return CELL_EMPTY;
}

function findPieceAt(row: i32, col: i32, pieces: Piece[]): i32 {
	for (let i = 0; i < pieces.length; i++) {
		if (pieces[i].row == row && pieces[i].col == col) return i;
	}
	return -1;
}

// ====================================================================
// Threatening pieces — opposing pieces whose pattern reaches the king.
// Used by isKingInCheck and the would-expose-king filter.
// ====================================================================

export function getThreateningPieces(
	kingRow: i32,
	kingCol: i32,
	attackerSide: i32,
	pieces: Piece[],
): Piece[] {
	const out: Piece[] = [];
	for (let i = 0; i < pieces.length; i++) {
		const piece = pieces[i];
		if (piece.owner != attackerSide) continue;
		if (piece.pieceType == PIECE_KING) continue;

		if (piece.pieceType == PIECE_PAWN) {
			const forwardDir = piece.owner == SIDE_PLAYER ? 1 : -1;
			const leftRow = piece.row + forwardDir;
			const leftCol = piece.col - 1;
			const rightRow = piece.row + forwardDir;
			const rightCol = piece.col + 1;
			if ((leftRow == kingRow && leftCol == kingCol) ||
				(rightRow == kingRow && rightCol == kingCol)) {
				out.push(piece);
			}
			continue;
		}

		const patternType = getPatternType(piece.pieceType);
		const dirs = getPatternDirections(piece.pieceType);
		const dirCount = dirs.length / 2;

		if (patternType == PATTERN_LINE) {
			for (let d = 0; d < dirCount; d++) {
				const dr = dirs[2 * d];
				const dc = dirs[2 * d + 1];
				let row = piece.row + dr;
				let col = piece.col + dc;
				let reached = false;
				while (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
					if (row == kingRow && col == kingCol) {
						out.push(piece);
						reached = true;
						break;
					}
					if (findPieceAt(row, col, pieces) >= 0) break;
					row += dr;
					col += dc;
				}
				if (reached) break;
			}
			continue;
		}

		// PATTERN_L_SHAPE or PATTERN_SURROUND: single-step jumps.
		for (let d = 0; d < dirCount; d++) {
			const targetRow = piece.row + dirs[2 * d];
			const targetCol = piece.col + dirs[2 * d + 1];
			if (targetRow == kingRow && targetCol == kingCol) {
				out.push(piece);
				break;
			}
		}
	}
	return out;
}

// ====================================================================
// isKingInCheck — true if `side`'s king is under attack.
// ====================================================================

export function isKingInCheck(side: i32, pieces: Piece[]): bool {
	let kingRow: i32 = -1;
	let kingCol: i32 = -1;
	for (let i = 0; i < pieces.length; i++) {
		const p = pieces[i];
		if (p.pieceType == PIECE_KING && p.owner == side) {
			kingRow = p.row;
			kingCol = p.col;
			break;
		}
	}
	if (kingRow < 0) return false; // king missing — checkWinCondition handles

	const enemySide = side == SIDE_PLAYER ? SIDE_OPPONENT : SIDE_PLAYER;
	return getThreateningPieces(kingRow, kingCol, enemySide, pieces).length > 0;
}

// ====================================================================
// ValidMoves — separated move/attack lists, filtered by would-expose-king.
// ====================================================================

export class ValidMoves {
	moves: Position[];
	attacks: Position[];

	constructor() {
		this.moves = [];
		this.attacks = [];
	}
}

/**
 * Copy pieces + apply a simulated move/capture to test king exposure.
 * Pure: returns a new array; never mutates the input.
 */
function simulateMove(
	pieces: Piece[],
	moverIdx: i32,
	targetRow: i32,
	targetCol: i32,
	isCapture: bool,
): Piece[] {
	const out: Piece[] = [];
	const moverId = pieces[moverIdx].id;
	for (let i = 0; i < pieces.length; i++) {
		const p = pieces[i];
		if (isCapture && p.row == targetRow && p.col == targetCol && p.id != moverId) {
			// Drop the captured piece.
			continue;
		}
		const copy = new Piece();
		copy.id = p.id;
		copy.pieceType = p.pieceType;
		copy.owner = p.owner;
		copy.row = p.row;
		copy.col = p.col;
		copy.hasMoved = p.hasMoved;
		if (p.id == moverId) {
			copy.row = targetRow;
			copy.col = targetCol;
		}
		out.push(copy);
	}
	return out;
}

function wouldExposeKing(
	pieces: Piece[],
	moverIdx: i32,
	targetRow: i32,
	targetCol: i32,
	isCapture: bool,
): bool {
	const sim = simulateMove(pieces, moverIdx, targetRow, targetCol, isCapture);
	const owner = pieces[moverIdx].owner;
	return isKingInCheck(owner, sim);
}

function appendPawnMoves(
	piece: Piece,
	pieces: Piece[],
	moves: Position[],
	attacks: Position[],
): void {
	const forwardDir = piece.owner == SIDE_PLAYER ? 1 : -1;

	const oneRow = piece.row + forwardDir;
	const oneCol = piece.col;
	if (inspectCell(oneRow, oneCol, piece.owner, pieces) == CELL_EMPTY) {
		moves.push(new Position(oneRow, oneCol));
		if (!piece.hasMoved) {
			const twoRow = piece.row + 2 * forwardDir;
			if (inspectCell(twoRow, oneCol, piece.owner, pieces) == CELL_EMPTY) {
				moves.push(new Position(twoRow, oneCol));
			}
		}
	}

	const leftRow = piece.row + forwardDir;
	const leftCol = piece.col - 1;
	const rightRow = piece.row + forwardDir;
	const rightCol = piece.col + 1;
	if (inspectCell(leftRow, leftCol, piece.owner, pieces) == CELL_ENEMY) {
		attacks.push(new Position(leftRow, leftCol));
	}
	if (inspectCell(rightRow, rightCol, piece.owner, pieces) == CELL_ENEMY) {
		attacks.push(new Position(rightRow, rightCol));
	}
}

function appendLineMoves(
	piece: Piece,
	pieces: Piece[],
	dirs: i32[],
	moves: Position[],
	attacks: Position[],
): void {
	const dirCount = dirs.length / 2;
	for (let d = 0; d < dirCount; d++) {
		const dr = dirs[2 * d];
		const dc = dirs[2 * d + 1];
		let row = piece.row + dr;
		let col = piece.col + dc;
		while (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
			const cell = inspectCell(row, col, piece.owner, pieces);
			if (cell == CELL_EMPTY) {
				moves.push(new Position(row, col));
			} else if (cell == CELL_ENEMY) {
				attacks.push(new Position(row, col));
				break;
			} else {
				break;
			}
			row += dr;
			col += dc;
		}
	}
}

function appendJumpMoves(
	piece: Piece,
	pieces: Piece[],
	dirs: i32[],
	moves: Position[],
	attacks: Position[],
): void {
	const dirCount = dirs.length / 2;
	for (let d = 0; d < dirCount; d++) {
		const targetRow = piece.row + dirs[2 * d];
		const targetCol = piece.col + dirs[2 * d + 1];
		const cell = inspectCell(targetRow, targetCol, piece.owner, pieces);
		if (cell == CELL_EMPTY) {
			moves.push(new Position(targetRow, targetCol));
		} else if (cell == CELL_ENEMY) {
			attacks.push(new Position(targetRow, targetCol));
		}
	}
}

export function getValidMoves(piece: Piece, pieces: Piece[]): ValidMoves {
	const rawMoves: Position[] = [];
	const rawAttacks: Position[] = [];

	if (piece.pieceType == PIECE_PAWN) {
		appendPawnMoves(piece, pieces, rawMoves, rawAttacks);
	} else {
		const patternType = getPatternType(piece.pieceType);
		const dirs = getPatternDirections(piece.pieceType);
		if (patternType == PATTERN_LINE) {
			appendLineMoves(piece, pieces, dirs, rawMoves, rawAttacks);
		} else {
			appendJumpMoves(piece, pieces, dirs, rawMoves, rawAttacks);
		}
	}

	const moverIdx = findPieceIdxById(piece.id, pieces);
	const result = new ValidMoves();

	for (let i = 0; i < rawMoves.length; i++) {
		const m = rawMoves[i];
		if (!wouldExposeKing(pieces, moverIdx, m.row, m.col, false)) {
			result.moves.push(m);
		}
	}
	if (piece.pieceType != PIECE_KING) {
		for (let i = 0; i < rawAttacks.length; i++) {
			const a = rawAttacks[i];
			if (wouldExposeKing(pieces, moverIdx, a.row, a.col, true)) continue;
			result.attacks.push(a);
		}
	}

	return result;
}

function findPieceIdxById(id: string, pieces: Piece[]): i32 {
	for (let i = 0; i < pieces.length; i++) {
		if (pieces[i].id == id) return i;
	}
	return -1;
}

// ====================================================================
// isCheckmate — `side` in check AND has zero legal moves.
// ====================================================================

export function isCheckmate(side: i32, pieces: Piece[]): bool {
	if (!isKingInCheck(side, pieces)) return false;
	for (let i = 0; i < pieces.length; i++) {
		if (pieces[i].owner != side) continue;
		const vm = getValidMoves(pieces[i], pieces);
		if (vm.moves.length > 0 || vm.attacks.length > 0) return false;
	}
	return true;
}

// ====================================================================
// checkPawnPromotion — pawn on the far rank for its side.
// ====================================================================

export function checkPawnPromotion(piece: Piece): bool {
	if (piece.pieceType != PIECE_PAWN) return false;
	if (piece.owner == SIDE_PLAYER && piece.row == BOARD_ROWS - 1) return true;
	if (piece.owner == SIDE_OPPONENT && piece.row == 0) return true;
	return false;
}

// ====================================================================
// checkWinCondition — terminal status based on king presence/material.
// ====================================================================

export function checkWinCondition(pieces: Piece[]): i32 {
	let playerKing = false;
	let opponentKing = false;
	let playerMaterialCount = 0;
	let opponentMaterialCount = 0;
	let playerDecisiveMaterial = false;
	let opponentDecisiveMaterial = false;
	for (let i = 0; i < pieces.length; i++) {
		const p = pieces[i];
		if (p.owner == SIDE_PLAYER) {
			if (p.pieceType == PIECE_KING) playerKing = true;
			else {
				playerMaterialCount++;
				if (p.pieceType == PIECE_QUEEN || p.pieceType == PIECE_ROOK || p.pieceType == PIECE_PAWN) {
					playerDecisiveMaterial = true;
				}
			}
		} else if (p.owner == SIDE_OPPONENT) {
			if (p.pieceType == PIECE_KING) opponentKing = true;
			else {
				opponentMaterialCount++;
				if (p.pieceType == PIECE_QUEEN || p.pieceType == PIECE_ROOK || p.pieceType == PIECE_PAWN) {
					opponentDecisiveMaterial = true;
				}
			}
		}
	}
	// Match TS: player_wins has precedence when both kings are absent.
	if (!opponentKing) return STATUS_PLAYER_WINS;
	if (!playerKing) return STATUS_OPPONENT_WINS;
	if (playerMaterialCount == 0 && opponentMaterialCount == 0) return STATUS_DRAW;
	if (opponentMaterialCount == 0 && playerDecisiveMaterial) return STATUS_PLAYER_WINS;
	if (playerMaterialCount == 0 && opponentDecisiveMaterial) return STATUS_OPPONENT_WINS;
	if (
		(playerMaterialCount == 0 && opponentMaterialCount == 1) ||
		(opponentMaterialCount == 0 && playerMaterialCount == 1)
	) {
		return STATUS_DRAW;
	}
	return STATUS_PLAYING;
}
