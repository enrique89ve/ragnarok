import type { ChessPieceType } from '../../types/ChessTypes';
import type { ChessPlayerSide } from '../../types/ChessTypes';

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

export type ChessPieceTone = Readonly<{
	readonly fill: string;
	readonly outline: string;
}>;

export const PIECE_PIECE_TONE_BY_OWNER: Readonly<Record<ChessPlayerSide, ChessPieceTone>> = {
	player: {
		fill: '#E9E6DC',
		outline: '#5E5A54',
	},
	opponent: {
		fill: '#9DA6B2',
		outline: '#2F333A',
	},
};
