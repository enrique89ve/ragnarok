import { describe, expect, it } from 'vitest';
import type { ChessPieceType, ChessPlayerSide, ChessProtocolPiece } from './types';
import { checkWinCondition, getNoLegalMovesStatus, getValidMoves } from './chessRules';

const piece = (
	id: string,
	type: ChessPieceType,
	owner: ChessPlayerSide,
	row: number,
	col: number
): ChessProtocolPiece => ({
	id,
	type,
	owner,
	position: { row, col },
	hasMoved: true,
});

const hasSquare = (
	squares: ReadonlyArray<{ readonly row: number; readonly col: number }>,
	row: number,
	col: number
): boolean => squares.some(square => square.row === row && square.col === col);

describe('chessRules', () => {
	it('does not expose direct king captures as legal attacks', () => {
		const playerQueen = piece('player-queen', 'queen', 'player', 0, 0);
		const opponentKing = piece('opponent-king', 'king', 'opponent', 0, 2);
		const { attacks } = getValidMoves(playerQueen, [playerQueen, opponentKing]);

		expect(hasSquare(attacks, 0, 2)).toBe(false);
	});

	it('awards the side with decisive material against a bare king', () => {
		const playerKing = piece('player-king', 'king', 'player', 0, 0);
		const opponentKing = piece('opponent-king', 'king', 'opponent', 6, 4);
		const opponentQueen = piece('opponent-queen', 'queen', 'opponent', 4, 4);

		expect(checkWinCondition([playerKing, opponentKing, opponentQueen])).toBe('opponent_wins');
	});

	it('draws a double bare-king board', () => {
		const playerKing = piece('player-king', 'king', 'player', 0, 0);
		const opponentKing = piece('opponent-king', 'king', 'opponent', 6, 4);

		expect(checkWinCondition([playerKing, opponentKing])).toBe('draw');
	});

	it('draws a bare king against one insufficient minor piece', () => {
		const playerKing = piece('player-king', 'king', 'player', 0, 0);
		const opponentKing = piece('opponent-king', 'king', 'opponent', 6, 4);
		const opponentKnight = piece('opponent-knight', 'knight', 'opponent', 4, 3);

		expect(checkWinCondition([playerKing, opponentKing, opponentKnight])).toBe('draw');
	});

	it('draws stalemate when the side to move has no legal moves but is not in check', () => {
		const playerKing = piece('player-king', 'king', 'player', 2, 0);
		const playerRook = piece('player-rook', 'rook', 'player', 6, 4);
		const opponentKing = piece('opponent-king', 'king', 'opponent', 0, 0);
		const opponentPawn = piece('opponent-pawn', 'pawn', 'opponent', 0, 1);

		expect(getNoLegalMovesStatus('opponent', [playerKing, playerRook, opponentKing, opponentPawn])).toBe('draw');
	});
});
