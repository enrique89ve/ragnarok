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

const CardNamePlate: React.FC<CardNamePlateProps> = ({ name }) => {
	const { rarity, size } = useCardFrame();
	const isPreview = size === 'preview';
	const rarityColor = getRarityCssColor(rarity);

	return (
		<div
			className="card-frame__name-plate"
			data-size={size}
			style={{
				color: rarityColor,
				fontSize: isPreview ? '1.25rem' : undefined,
			} as React.CSSProperties}
		>
			{name}
		</div>
	);
};

export default CardNamePlate;
