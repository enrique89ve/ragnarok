import React, { type CSSProperties } from 'react';
import type { ChessPieceType } from '../../types/ChessTypes';
import { PIECE_ICON_BY_TYPE } from './pieceVisuals';

interface PieceGlyphProps {
	readonly pieceType: ChessPieceType;
	readonly fallbackColor: string;
	readonly size?: string;
	readonly className?: string;
	readonly style?: CSSProperties;
	readonly fallbackTextShadow?: string;
}

export const PieceGlyph: React.FC<PieceGlyphProps> = ({
	pieceType,
	fallbackColor,
	size = 'clamp(16px, 42cqw, 36px)',
	className,
	style,
	fallbackTextShadow = '2px 2px 4px rgba(0,0,0,0.5)',
}) => {
	return (
		<span
			className={`piece-glyph piece-glyph-fallback ${className || ''}`}
			style={{
				width: size,
				height: size,
				fontSize: size,
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: fallbackColor,
				textShadow: fallbackTextShadow,
				pointerEvents: 'none',
				...style,
			}}
			aria-hidden="true"
		>
			{PIECE_ICON_BY_TYPE[pieceType]}
		</span>
	);
};
