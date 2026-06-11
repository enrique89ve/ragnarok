/**
 * <CardEvolutionStars> — slot: pet-evolution sparkle row, top-right.
 *
 * Renders N sparkles (max 3). Sparkles fill the slot to the right of
 * the blood-price or count-badge. Hidden when level <= 0.
 */

import React from 'react';

export interface CardEvolutionStarsProps {
	level: number;
}

const CardEvolutionStars: React.FC<CardEvolutionStarsProps> = ({ level }) => {
	const safeLevel = Math.max(0, Math.min(3, level));
	if (safeLevel === 0) return null;
	return (
		<div className="card-frame__evolution-stars" aria-label={`Evolution level ${safeLevel}`}>
			{Array.from({ length: safeLevel }, (_, i) => (
				<span key={i} className="card-frame__evolution-star" aria-hidden="true">
					{'✨'}
				</span>
			))}
		</div>
	);
};

(CardEvolutionStars as React.FC & { displayName?: string }).displayName = 'CardEvolutionStars';

export default CardEvolutionStars;
