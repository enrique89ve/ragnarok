/**
 * chessRules.ts — pure rule predicates for the chess phase.
 *
 * These functions take a board snapshot (`pieces: ChessProtocolPiece[]`)
 * and return a derived value. They contain no Zustand `get()` access, no
 * `set()`, no cross-slice calls, no I/O, no Math.random / Date.now.
 * Identical inputs always yield identical outputs — safe to call from any
 * context (the Zustand slice, the P2P wire receiver, a future server-side
 * validator).
 *
 * SCOPE C.fase1 of the layer-separation plan. The slice methods in
 * `chessCombatSlice` are now thin wrappers over these functions.
 *
 * The piece shape is `ChessProtocolPiece` from `./types` — the minimal
 * id/type/owner/position/hasMoved tuple. Client `ChessPiece` extends it
 * structurally, so callers can pass their richer model without translation.
 */

import type {
	ChessProtocolPiece,
	ChessBoardPosition,
	ChessGameStatus,
	ChessPlayerSide
} from './types';
import {
	BOARD_ROWS,
	BOARD_COLS,
	PIECE_MOVEMENT_PATTERNS
} from './types';

/** Commanders do not fight. Mines are their weapon; they have no capture. */
const pieceCanCapture = (piece: ChessProtocolPiece): boolean => piece.type !== 'king';

/**
 * Inspect a target cell relative to a moving piece. Returns whether the
 * cell is off-board, empty, or occupied (by ally/enemy).
 */
type CellStatus = 'empty' | 'ally' | 'enemy' | 'invalid';

const inspectCell = (
	row: number,
	col: number,
	mover: ChessProtocolPiece,
	pieces: ReadonlyArray<ChessProtocolPiece>
): CellStatus => {
	if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
		return 'invalid';
	}
	const occupant = pieces.find(p => p.position.row === row && p.position.col === col);
	if (!occupant) return 'empty';
	return occupant.owner === mover.owner ? 'ally' : 'enemy';
};

/**
 * Returns the list of opposing pieces whose movement pattern reaches
 * `kingPosition`. Used by `isKingInCheck` and the move-validation guard
 * (a move is illegal if it would expose the mover's king).
 */
export const getThreateningPieces = <P extends ChessProtocolPiece>(
	kingPosition: ChessBoardPosition,
	attackerSide: ChessPlayerSide,
	pieces: ReadonlyArray<P>
): P[] => {
	const threateners: P[] = [];
	const attackerPieces = pieces.filter(p => p.owner === attackerSide);

	for (const piece of attackerPieces) {
		if (!pieceCanCapture(piece)) continue;
		const pattern = PIECE_MOVEMENT_PATTERNS[piece.type];
		if (!pattern.directions) continue;

		if (piece.type === 'pawn') {
			const forwardDir = piece.owner === 'player' ? 1 : -1;
			const leftAttack = { row: piece.position.row + forwardDir, col: piece.position.col - 1 };
			const rightAttack = { row: piece.position.row + forwardDir, col: piece.position.col + 1 };

			if ((leftAttack.row === kingPosition.row && leftAttack.col === kingPosition.col) ||
				(rightAttack.row === kingPosition.row && rightAttack.col === kingPosition.col)) {
				threateners.push(piece);
			}
			continue;
		}

		if (pattern.type === 'line') {
			for (const dir of pattern.directions) {
				let row = piece.position.row + dir.row;
				let col = piece.position.col + dir.col;

				while (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
					if (row === kingPosition.row && col === kingPosition.col) {
						threateners.push(piece);
						break;
					}
					const blocking = pieces.find(p => p.position.row === row && p.position.col === col);
					if (blocking) break;

					row += dir.row;
					col += dir.col;
				}
			}
			continue;
		}

		for (const dir of pattern.directions) {
			const targetRow = piece.position.row + dir.row;
			const targetCol = piece.position.col + dir.col;

			if (targetRow === kingPosition.row && targetCol === kingPosition.col) {
				threateners.push(piece);
				break;
			}
		}
	}

	return threateners;
};

/**
 * True if `side`'s king is currently under attack on the given board.
 * If the king is missing (already captured by some upstream code path),
 * returns false — callers should treat king-absence via `checkWinCondition`.
 */
export const isKingInCheck = (
	side: ChessPlayerSide,
	pieces: ReadonlyArray<ChessProtocolPiece>
): boolean => {
	const king = pieces.find(p => p.type === 'king' && p.owner === side);
	if (!king) return false;

	const enemySide: ChessPlayerSide = side === 'player' ? 'opponent' : 'player';
	return getThreateningPieces(king.position, enemySide, pieces).length > 0;
};

/**
 * Move/attack candidates for a piece, already filtered to only the moves
 * that do NOT leave the mover's king in check. Kings generate quiet
 * steps only. Capturing a king is a legal instant-kill attack.
 */
export interface ValidMoves {
	moves: ChessBoardPosition[];
	attacks: ChessBoardPosition[];
}

export const getValidMoves = (
	piece: ChessProtocolPiece,
	pieces: ReadonlyArray<ChessProtocolPiece>
): ValidMoves => {
	const moves: ChessBoardPosition[] = [];
	const attacks: ChessBoardPosition[] = [];
	const pattern = PIECE_MOVEMENT_PATTERNS[piece.type];
	if (!pattern.directions) return { moves, attacks };

	if (piece.type === 'pawn') {
		const forwardDir = piece.owner === 'player' ? 1 : -1;

		const oneStep = { row: piece.position.row + forwardDir, col: piece.position.col };
		if (inspectCell(oneStep.row, oneStep.col, piece, pieces) === 'empty') {
			moves.push(oneStep);
			if (!piece.hasMoved) {
				const twoStep = { row: piece.position.row + 2 * forwardDir, col: piece.position.col };
				if (inspectCell(twoStep.row, twoStep.col, piece, pieces) === 'empty') {
					moves.push(twoStep);
				}
			}
		}

		const leftAttack = { row: piece.position.row + forwardDir, col: piece.position.col - 1 };
		const rightAttack = { row: piece.position.row + forwardDir, col: piece.position.col + 1 };
		if (inspectCell(leftAttack.row, leftAttack.col, piece, pieces) === 'enemy') attacks.push(leftAttack);
		if (inspectCell(rightAttack.row, rightAttack.col, piece, pieces) === 'enemy') attacks.push(rightAttack);
	} else if (pattern.type === 'line') {
		for (const dir of pattern.directions) {
			let row = piece.position.row + dir.row;
			let col = piece.position.col + dir.col;
			while (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
				const status = inspectCell(row, col, piece, pieces);
				if (status === 'empty') {
					moves.push({ row, col });
				} else if (status === 'enemy') {
					attacks.push({ row, col });
					break;
				} else {
					break;
				}
				row += dir.row;
				col += dir.col;
			}
		}
	} else {
		for (const dir of pattern.directions) {
			const targetRow = piece.position.row + dir.row;
			const targetCol = piece.position.col + dir.col;
			const status = inspectCell(targetRow, targetCol, piece, pieces);
			if (status === 'empty') {
				moves.push({ row: targetRow, col: targetCol });
			} else if (status === 'enemy' && pieceCanCapture(piece)) {
				attacks.push({ row: targetRow, col: targetCol });
			}
		}
	}

	const wouldExposeKing = (target: ChessBoardPosition, isCapture: boolean): boolean => {
		const simulated = pieces
			.map(p => (p.id === piece.id ? { ...p, position: target } : p))
			.filter(p => {
				if (!isCapture) return true;
				const captured = pieces.find(tp => tp.position.row === target.row && tp.position.col === target.col);
				return !captured || p.id !== captured.id;
			});
		return isKingInCheck(piece.owner, simulated);
	};

	const safeMoves = moves.filter(move => !wouldExposeKing(move, false));
	const safeAttacks = attacks.filter(attack => !wouldExposeKing(attack, true));

	return { moves: safeMoves, attacks: safeAttacks };
};

/**
 * True if `side` is in check AND has zero legal moves on the given board.
 * Iterates `side`'s pieces; bails early on the first piece that has any
 * legal move/attack.
 */
export const isCheckmate = (
	side: ChessPlayerSide,
	pieces: ReadonlyArray<ChessProtocolPiece>
): boolean => {
	if (!isKingInCheck(side, pieces)) return false;

	const sidePieces = pieces.filter(p => p.owner === side);
	for (const piece of sidePieces) {
		const { moves, attacks } = getValidMoves(piece, pieces);
		if (moves.length > 0 || attacks.length > 0) return false;
	}
	return true;
};

/**
 * True if the piece is a pawn that has reached the far rank for its side
 * and should be promoted. Caller decides which type to promote into
 * (current canon is queen — see `chessCombatSlice.promotePawn`).
 */
export const checkPawnPromotion = (piece: ChessProtocolPiece): boolean => {
	if (piece.type !== 'pawn') return false;
	if (piece.owner === 'player' && piece.position.row === BOARD_ROWS - 1) return true;
	if (piece.owner === 'opponent' && piece.position.row === 0) return true;
	return false;
};

const hasDecisiveBareKingMaterial = (
	material: ReadonlyArray<ChessProtocolPiece>
): boolean => material.some(piece =>
	piece.type === 'queen' || piece.type === 'rook' || piece.type === 'pawn'
);

const winnerForSide = (side: ChessPlayerSide): ChessGameStatus =>
	side === 'player' ? 'player_wins' : 'opponent_wins';

const opponentOf = (side: ChessPlayerSide): ChessPlayerSide =>
	side === 'player' ? 'opponent' : 'player';

/**
 * Terminal status for the board. Capturing the commander (missing king)
 * is a win. Bare-king material is resolved explicitly:
 *
 * - King vs King: draw.
 * - King + lone Bishop/Knight vs King: draw, because it cannot force mate.
 * - King + Queen/Rook/Pawn vs bare King: decisive material wins, avoiding
 *   endless local-AI chases without making every non-king piece a win.
 */
export const checkWinCondition = (
	pieces: ReadonlyArray<ChessProtocolPiece>
): ChessGameStatus => {
	const playerKing = pieces.find(p => p.type === 'king' && p.owner === 'player');
	const opponentKing = pieces.find(p => p.type === 'king' && p.owner === 'opponent');
	const playerMaterial = pieces.filter(p => p.owner === 'player' && p.type !== 'king');
	const opponentMaterial = pieces.filter(p => p.owner === 'opponent' && p.type !== 'king');

	if (!opponentKing) return 'player_wins';
	if (!playerKing) return 'opponent_wins';
	if (playerMaterial.length === 0 && opponentMaterial.length === 0) return 'draw';
	if (opponentMaterial.length === 0 && hasDecisiveBareKingMaterial(playerMaterial)) return 'player_wins';
	if (playerMaterial.length === 0 && hasDecisiveBareKingMaterial(opponentMaterial)) return 'opponent_wins';
	if (
		(playerMaterial.length === 0 && opponentMaterial.length === 1) ||
		(opponentMaterial.length === 0 && playerMaterial.length === 1)
	) {
		return 'draw';
	}
	return 'playing';
};

/**
 * Terminal status when `side` has no legal move. Checkmate is a win for the
 * opponent; stalemate is an explicit draw. If the board is already terminal
 * by material/king presence, preserve that result.
 */
export const getNoLegalMovesStatus = (
	side: ChessPlayerSide,
	pieces: ReadonlyArray<ChessProtocolPiece>
): ChessGameStatus => {
	const materialStatus = checkWinCondition(pieces);
	if (materialStatus !== 'playing') return materialStatus;

	const sidePieces = pieces.filter(p => p.owner === side);
	for (const piece of sidePieces) {
		const { moves, attacks } = getValidMoves(piece, pieces);
		if (moves.length > 0 || attacks.length > 0) return 'playing';
	}

	return isKingInCheck(side, pieces) ? winnerForSide(opponentOf(side)) : 'draw';
};
