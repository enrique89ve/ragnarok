import React from 'react';
import type { NorseSuit } from '../../../utils/cards/norsePokerCard';

interface NorseSuitEmblemProps {
	suit: NorseSuit;
	className?: string;
}

const NORSE_EMBLEM_STROKE = 4;

/**
 * One deterministic mark for each poker suit.
 *
 * These are deliberately compact silhouettes rather than font glyphs: the
 * board must render the same Ragnarok language at every viewport and OS.
 */
const NorseSuitEmblem: React.FC<NorseSuitEmblemProps> = ({ suit, className }) => (
	<svg
		className={className}
		viewBox="0 0 64 64"
		fill="none"
		aria-hidden="true"
		focusable="false"
	>
		{renderSuitMark(suit)}
	</svg>
);

function renderSuitMark(suit: NorseSuit) {
	switch (suit) {
		case 'spades':
			return (
				<g fill="none" stroke="currentColor" strokeWidth={NORSE_EMBLEM_STROKE} strokeLinecap="square" strokeLinejoin="miter">
					<path d="M10 12h12M16 8v12M16 18l30 30" />
					<path d="M54 12H42M48 8v12M48 18 18 48" />
					<path d="M32 38v19M24 57h16" />
				</g>
			);
		case 'hearts':
			return (
				<g stroke="currentColor" strokeWidth={NORSE_EMBLEM_STROKE} strokeLinecap="square" strokeLinejoin="miter">
					<path d="M32 4v10M32 50v10M4 32h10M50 32h10M12.2 12.2l7 7M44.8 44.8l7 7M51.8 12.2l-7 7M19.2 44.8l-7 7" />
					<circle cx="32" cy="32" r="15" fill="none" />
					<circle cx="32" cy="32" r="5" fill="currentColor" stroke="none" />
				</g>
			);
		case 'diamonds':
			return (
				<g fill="none" stroke="currentColor" strokeWidth={NORSE_EMBLEM_STROKE} strokeLinecap="square" strokeLinejoin="miter">
					<path d="M32 5 57 32 32 59 7 32 32 5Z" />
					<path d="M32 17 45 32 32 47 19 32 32 17Z" />
					<path d="M23 32h18M32 23v18" />
				</g>
			);
		case 'clubs':
			return (
				<g fill="none" stroke="currentColor" strokeWidth={NORSE_EMBLEM_STROKE} strokeLinecap="square" strokeLinejoin="miter">
					<path d="M8 14h18M13 8v12M13 19l30 30" />
					<path d="M56 14H38M51 8v12M51 19 21 49" />
					<path d="M32 38v19M23 57h18" />
				</g>
			);
	}
}

export default NorseSuitEmblem;
