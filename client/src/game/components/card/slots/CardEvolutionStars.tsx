/**
 * <CardEvolutionStars> — slot: pet-evolution sparkle row, top-right.
 *
 * Renders N sparkles (max 3). Sparkles fill the slot to the right of
 * the blood-price or count-badge. Hidden when level <= 0.
 */

import React from 'react';
import { CARD_CHROME_ICON_MAP } from '../../ui/CardChromeIconsSVG';
import { CARD_CHROME_FAQ_ATTR, getEvolutionChromeFaq } from '../cardChromeFaq';

export interface CardEvolutionStarsProps {
	level: number;
}

const EvolutionIcon = CARD_CHROME_ICON_MAP.evolution;

const CardEvolutionStars: React.FC<CardEvolutionStarsProps> = ({ level }) => {
	const safeLevel = Math.max(0, Math.min(3, level));
	if (safeLevel === 0) return null;
	const faq = getEvolutionChromeFaq(safeLevel);
	return (
		<div
			className="card-frame__evolution-stars card-frame__chrome-faq"
			aria-label={faq}
			{...{ [CARD_CHROME_FAQ_ATTR]: faq }}
		>
			{Array.from({ length: safeLevel }, (_, i) => (
				<EvolutionIcon key={i} className="card-frame__evolution-star" aria-hidden="true" />
			))}
		</div>
	);
};

(CardEvolutionStars as React.FC & { displayName?: string }).displayName = 'CardEvolutionStars';

export default CardEvolutionStars;
