/**
 * types.ts — protocol-core chess geometry.
 *
 * Pure board/movement primitives shared between the client engine and any
 * deterministic rule consumer (P2P validator, future server-side checker).
 * No hero/health/element/deck data here — those are gameplay model details
 * that live in `client/src/game/types/ChessTypes.ts`. The client `ChessPiece`
 * structurally extends `ChessProtocolPiece`, so client values are accepted
 * anywhere a protocol piece is required.
 */

export type ChessPieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type ChessPlayerSide = 'player' | 'opponent';
export type ChessGameStatus = 'setup' | 'playing' | 'combat' | 'player_wins' | 'opponent_wins' | 'draw';

export interface ChessBoardPosition {
	row: number;
	col: number;
}

export const BOARD_ROWS = 7;
export const BOARD_COLS = 5;

export interface ChessProtocolPiece {
	id: string;
	type: ChessPieceType;
	owner: ChessPlayerSide;
	position: ChessBoardPosition;
	hasMoved: boolean;
}

export interface MovementPattern {
	type: 'line' | 'point' | 'l_shape' | 'surround';
	directions?: { row: number; col: number }[];
	maxDistance?: number;
}

export const PIECE_MOVEMENT_PATTERNS: Record<ChessPieceType, MovementPattern> = {
	queen: {
		type: 'line',
		directions: [
			{ row: 1, col: 0 }, { row: -1, col: 0 },
			{ row: 0, col: 1 }, { row: 0, col: -1 },
			{ row: 1, col: 1 }, { row: -1, col: -1 },
			{ row: 1, col: -1 }, { row: -1, col: 1 }
		]
	},
	king: {
		type: 'surround',
		directions: [
			{ row: 1, col: 0 }, { row: -1, col: 0 },
			{ row: 0, col: 1 }, { row: 0, col: -1 },
			{ row: 1, col: 1 }, { row: -1, col: -1 },
			{ row: 1, col: -1 }, { row: -1, col: 1 }
		],
		maxDistance: 1
	},
	rook: {
		type: 'line',
		directions: [
			{ row: 1, col: 0 }, { row: -1, col: 0 },
			{ row: 0, col: 1 }, { row: 0, col: -1 }
		]
	},
	bishop: {
		type: 'line',
		directions: [
			{ row: 1, col: 1 }, { row: -1, col: -1 },
			{ row: 1, col: -1 }, { row: -1, col: 1 }
		]
	},
	knight: {
		type: 'l_shape',
		directions: [
			{ row: -2, col: -1 }, { row: 2, col: -1 },
			{ row: -1, col: -2 }, { row: -1, col: 2 },
			{ row: -2, col: 1 }, { row: 2, col: 1 },
			{ row: 1, col: -2 }, { row: 1, col: 2 }
		]
	},
	pawn: {
		type: 'point',
		directions: [{ row: 1, col: 0 }],
		maxDistance: 1
	}
};
