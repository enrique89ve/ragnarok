/**
 * <CardElementBadge> — slot: element icon, top-right.
 *
 * Distinct from the bottom element band: the badge is a small icon
 * chip that floats in the top-right. Shows the element rune.
 */

import React from 'react';
import type { NorseElement } from '../../../types/NorseTypes';
import { getElementBand } from '../../../utils/art/elementBand';
import { ELEMENT_ICON_MAP } from '../../ui/CardChromeIconsSVG';
import { CARD_CHROME_FAQ_ATTR, getElementChromeFaq } from '../cardChromeFaq';

export interface CardElementBadgeProps {
	element: NorseElement;
}

const CardElementBadge: React.FC<CardElementBadgeProps> = ({ element }) => {
	if (element === 'neutral') return null;
	const band = getElementBand(element);
	const Icon = ELEMENT_ICON_MAP[element];
	const faq = getElementChromeFaq(element);
	return (
		<div
			className="card-frame__element-badge card-frame__chrome-faq"
			aria-label={faq}
			{...{ [CARD_CHROME_FAQ_ATTR]: faq }}
			style={{
				'--cf-eb-from': band.from,
				'--cf-eb-to': band.to,
			} as React.CSSProperties}
		>
			<Icon className="card-frame__chrome-icon" aria-hidden="true" />
		</div>
	);
};

(CardElementBadge as React.FC & { displayName?: string }).displayName = 'CardElementBadge';

export default CardElementBadge;
