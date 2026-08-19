/**
 * <CardBloodPrice> — slot: red blood-cost circle, top-right.
 *
 * Pulsing animation driven by CSS. Hides when value <= 0.
 */

import React from 'react';
import { CARD_CHROME_ICON_MAP } from '../../ui/CardChromeIconsSVG';
import { CARD_CHROME_FAQ_ATTR, getBloodPriceChromeFaq } from '../cardChromeFaq';

export interface CardBloodPriceProps {
	value: number;
}

const BloodIcon = CARD_CHROME_ICON_MAP.bloodPrice;

const CardBloodPrice: React.FC<CardBloodPriceProps> = ({ value }) => {
	if (value <= 0) return null;
	const faq = getBloodPriceChromeFaq(value);
	return (
		<div
			className="card-frame__blood-price card-frame__chrome-faq"
			aria-label={faq}
			{...{ [CARD_CHROME_FAQ_ATTR]: faq }}
		>
			<BloodIcon className="card-frame__chrome-icon" aria-hidden="true" />
			<span className="card-frame__blood-price-value">{value}</span>
		</div>
	);
};

(CardBloodPrice as React.FC & { displayName?: string }).displayName = 'CardBloodPrice';

export default CardBloodPrice;
