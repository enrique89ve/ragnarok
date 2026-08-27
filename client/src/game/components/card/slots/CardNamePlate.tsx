/**
 * <CardNamePlate> — slot: card name strip.
 *
 * Renders near the bottom of the art layer. Uses the rarity color
 * for the text so the name reads as part of the rarity tier.
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';
import { getRarityCssColor } from '../../../utils/rarityUtils';

export interface CardNamePlateProps {
	name: string;
}

type CardNameDensity = 'standard' | 'long' | 'dense';

const resolveNameDensity = (name: string): CardNameDensity => {
	const length = name.trim().length;
	if (length >= 28) return 'dense';
	if (length >= 18) return 'long';
	return 'standard';
};

const CardNamePlate: React.FC<CardNamePlateProps> = ({ name }) => {
	const { rarity, size } = useCardFrame();
	const rarityColor = getRarityCssColor(rarity);
	const nameDensity = resolveNameDensity(name);

	return (
		<div
			className="card-frame__name-plate"
			data-size={size}
			data-name-density={nameDensity}
			style={{ color: rarityColor } as React.CSSProperties}
		>
			{name}
		</div>
	);
};

export default CardNamePlate;
