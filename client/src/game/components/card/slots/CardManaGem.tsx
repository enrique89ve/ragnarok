/**
 * <CardManaGem> — slot: top-left cost gem.
 *
 * Rounded badge in the upper-left. Position absolute; size + color
 * derive from the context element. Numbers inside use tabular-nums
 * to keep grid columns visually aligned.
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';
import { getElementBand } from '../../../utils/art/elementBand';

export interface CardManaGemProps {
	cost: number;
}

const CardManaGem: React.FC<CardManaGemProps> = ({ cost }) => {
	const { element, size } = useCardFrame();
	const band = getElementBand(element);
	const isPreview = size === 'preview';

	return (
		<div
			className="card-frame__mana-gem"
			data-size={size}
			style={{
				'--cf-mana-from': band.from,
				'--cf-mana-to': band.to,
				fontSize: isPreview ? '1.5rem' : undefined,
			} as React.CSSProperties}
		>
			{cost}
		</div>
	);
};

export default CardManaGem;
