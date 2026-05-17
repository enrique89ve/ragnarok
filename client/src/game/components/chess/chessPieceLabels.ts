import type { ChessPieceType as PieceType, ElementType } from '../../types/ChessTypes';

export const PIECE_TYPE_NAMES: Record<PieceType, string> = {
	king: 'Protogenoi',
	queen: 'Sovereign',
	rook: 'Shaper',
	bishop: 'Luminary',
	knight: 'Ethereal',
	pawn: 'Einherjar',
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
	fire: 'Fire',
	water: 'Water',
	wind: 'Wind',
	earth: 'Earth',
	holy: 'Holy',
	shadow: 'Shadow',
	neutral: 'Neutral',
};
