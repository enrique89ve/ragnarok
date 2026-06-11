/**
 * <CardPetStageBadge> — slot: pet-evolution roman numeral badge.
 *
 * Renders I/II/III for stages 1-3. Hidden when stage <= 0.
 */

import React from 'react';

export interface CardPetStageBadgeProps {
	stage: number;
}

const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };

const CardPetStageBadge: React.FC<CardPetStageBadgeProps> = ({ stage }) => {
	if (stage <= 0 || stage > 3) return null;
	return (
		<div className="card-frame__pet-stage" aria-label={`Pet stage ${stage}`}>
			{ROMAN[stage]}
		</div>
	);
};

(CardPetStageBadge as React.FC & { displayName?: string }).displayName = 'CardPetStageBadge';

export default CardPetStageBadge;
