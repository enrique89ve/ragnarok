/**
 * Public surface of the portable chess protocol-core.
 * - `chessRules`: pure rule predicates (queries).
 * - `boardSetup`: canonical initial-state constants.
 * - `types`: shared geometry primitives.
 */
export {
	getValidMoves,
	getThreateningPieces,
	isKingInCheck,
	isCheckmate,
	checkPawnPromotion,
	checkWinCondition,
	getNoLegalMovesStatus
} from './chessRules';
export type { ValidMoves } from './chessRules';

export {
	PIECE_BASE_STATS,
	PLAYER_INITIAL_POSITIONS,
	OPPONENT_INITIAL_POSITIONS
} from './boardSetup';
export type {
	InitialPiecePosition,
	ChessPieceStats
} from './boardSetup';

export {
	BOARD_ROWS,
	BOARD_COLS,
	PIECE_MOVEMENT_PATTERNS
} from './types';
export type {
	ChessPieceType,
	ChessPlayerSide,
	ChessGameStatus,
	ChessBoardPosition,
	ChessProtocolPiece,
	MovementPattern
} from './types';

export type { ChessBoardSnapshot } from './state';

export { applyChessAction } from './reducer';
export type { ChessAction, ChessRejection, ChessReduceResult } from './reducer';

export { canonicalChessSnapshot } from './canonicalize';
