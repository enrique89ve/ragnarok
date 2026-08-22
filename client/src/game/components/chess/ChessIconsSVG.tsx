import React from 'react';

type ChessIconProps = React.SVGProps<SVGSVGElement>;

const svgBase: ChessIconProps = {
	viewBox: '0 0 24 24',
	width: '1em',
	height: '1em',
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 1.8,
	strokeLinecap: 'square',
	strokeLinejoin: 'miter',
	'aria-hidden': true,
	focusable: false,
};

/** Shared geometric stat marks used by chess overlays and status panels. */
export const ChessHealthIcon: React.FC<ChessIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path d="M12 21S4 16 4 10a4 4 0 0 1 8-3 4 4 0 0 1 8 3c0 6-8 11-8 11Z" fill="currentColor" stroke="none" />
		<path d="M8 12h8M12 8v8" stroke="#18090a" strokeWidth="1.3" />
	</svg>
);

export const ChessStaminaIcon: React.FC<ChessIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path d="m14 2-7 10h5l-1 10 7-12h-5l1-8Z" fill="currentColor" stroke="none" />
	</svg>
);

export const ChessManaIcon: React.FC<ChessIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path d="m12 2 7 7-2 10-5 3-5-3L5 9l7-7Z" fill="currentColor" stroke="none" />
		<path d="m12 6 3 3-1 5-2 2-2-2-1-5 3-3Z" fill="#06101a" stroke="none" opacity=".7" />
	</svg>
);
