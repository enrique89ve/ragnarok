import type { ChessPieceType } from '../../types/ChessTypes';

export const PIECE_ICON_BY_TYPE: Readonly<Record<ChessPieceType, string>> = {
	king: '♔',
	queen: '♕',
	rook: '♖',
	bishop: '♗',
	knight: '♘',
	pawn: '♙',
};

export const PIECE_COLOR_BY_TYPE: Readonly<Record<ChessPieceType, string>> = {
	king: '#FFD700',
	queen: '#69CCF0',
	rook: '#C79C6E',
	bishop: '#FFFFFF',
	knight: '#FFF569',
	pawn: '#999999',
};
