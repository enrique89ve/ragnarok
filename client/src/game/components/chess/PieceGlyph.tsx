import React, { type CSSProperties } from 'react';
import type { ChessPieceType } from '../../types/ChessTypes';
import { PIECE_ICON_BY_TYPE } from './pieceVisuals';

type PieceGlyphStyle = CSSProperties & {
	readonly '--piece-glyph-color'?: string;
	readonly '--piece-glyph-text-shadow'?: string;
	readonly '--piece-glyph-stroke-color'?: string;
	readonly '--piece-glyph-stroke-width'?: string;
};

interface PieceGlyphProps {
	readonly pieceType: ChessPieceType;
	readonly fallbackColor: string;
	readonly size?: string;
	readonly className?: string;
	readonly style?: PieceGlyphStyle;
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
	const glyphStyle = style as PieceGlyphStyle;
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
				color: glyphStyle?.['--piece-glyph-color'] ?? fallbackColor,
				textShadow: glyphStyle?.['--piece-glyph-text-shadow'] ?? fallbackTextShadow,
				'--piece-glyph-stroke-color': glyphStyle?.['--piece-glyph-stroke-color'] ?? 'transparent',
				'--piece-glyph-stroke-width': glyphStyle?.['--piece-glyph-stroke-width'] ?? '0px',
				pointerEvents: 'none',
				...glyphStyle,
			}}
			aria-hidden="true"
		>
			{PIECE_ICON_BY_TYPE[pieceType]}
		</span>
	);
};
