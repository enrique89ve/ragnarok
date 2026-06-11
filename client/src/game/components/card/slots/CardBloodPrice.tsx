/**
 * <CardBloodPrice> — slot: red blood-cost circle, top-right.
 *
 * Pulsing animation driven by CSS. Hides when value <= 0.
 */

import React from 'react';

export interface CardBloodPriceProps {
	value: number;
}

const CardBloodPrice: React.FC<CardBloodPriceProps> = ({ value }) => {
	if (value <= 0) return null;
	return (
		<div className="card-frame__blood-price" aria-label={`Blood cost ${value}`}>
			{value}
		</div>
	);
};

(CardBloodPrice as React.FC & { displayName?: string }).displayName = 'CardBloodPrice';

export default CardBloodPrice;
