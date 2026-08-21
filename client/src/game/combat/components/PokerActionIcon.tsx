import React from 'react';
import type { PokerActionGlyph } from '../decision/pokerActionCatalog';

type PokerActionIconProps = {
	readonly glyph: PokerActionGlyph;
	readonly className?: string;
	readonly size?: number;
};

const GLYPH_PATHS = {
	single_sword: (
		<path d="M16.5 1l-1 3.5-1.2 1.2-5.8 5.8-1.4-1.4 5.8-5.8L14 3.1 15.5 1h1zM7.6 11l1.4 1.4-2.3 2.3 1.1 1.1a1 1 0 01-1.4 1.4l-1.1-1.1-1.8 1.8a1 1 0 01-1.4-1.4l1.8-1.8-1.1-1.1a1 1 0 011.4-1.4l1.1 1.1L7.6 11z" />
	),
	crossed_swords: (
		<>
			<path d="M3.5 1l1 3.5 1.2 1.2 4.3 4.3 4.3-4.3L15.5 4.5l1-3.5h1L16 5.3l-1.2 1.2L10 11.3l-1.5 1.5 1.1 1.1a1 1 0 01-1.4 1.4l-1.1-1.1-1.8 1.8a1 1 0 01-1.4-1.4l1.8-1.8-1.1-1.1a1 1 0 011.4-1.4l1.1 1.1L8.6 10 4.3 5.7 3.1 4.5 1 5.5V4.5L2.5 1h1z" />
			<path d="M11.4 12.4l1.5-1.5 4.8 4.8-1.2 1.2L18 18.5a1 1 0 01-1.4 1.4l-1.6-1.6-1.2 1.2-4.8-4.8z" opacity="0.85" />
		</>
	),
	shield: (
		<>
			<path d="M10 1L3 4v5c0 4.5 3 8.3 7 9.8 4-1.5 7-5.3 7-9.8V4l-7-3zm0 2.2L15 5.8v3.4c0 3.5-2.2 6.5-5 7.8-2.8-1.3-5-4.3-5-7.8V5.8L10 3.2z" />
			<circle cx="10" cy="9.5" r="2.5" opacity="0.6" />
		</>
	),
	helm: (
		<>
			<path d="M10 2C6.5 2 3.5 4.5 3 8v3c0 .6.4 1 1 1h1v2.5c0 .8.7 1.5 1.5 1.5h1c.6 0 1-.3 1.2-.8L10 13l1.3 2.2c.2.5.6.8 1.2.8h1c.8 0 1.5-.7 1.5-1.5V12h1c.6 0 1-.4 1-1V8c-.5-3.5-3.5-6-7-6zM5 8.5c.3-2.5 2.5-4.5 5-4.5s4.7 2 5 4.5V10H5V8.5z" />
			<path d="M9.2 7h1.6v3H9.2V7z" opacity="0.5" />
		</>
	),
	frontline: (
		<>
			<path d="M3 1h2v18H3z" />
			<path d="M5 2h11l-2.7 4L16 10H5z" />
		</>
	),
} as const satisfies Record<PokerActionGlyph, React.ReactNode>;

export function PokerActionIcon({ glyph, className, size = 48 }: PokerActionIconProps): React.ReactElement {
	return (
		<svg
			className={className}
			viewBox="0 0 20 20"
			fill="currentColor"
			width={size}
			height={size}
			aria-hidden="true"
			focusable="false"
		>
			{GLYPH_PATHS[glyph]}
		</svg>
	);
}
