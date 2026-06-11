/**
 * <CardElementBadge> — slot: element icon, top-right.
 *
 * Distinct from the bottom element band: the badge is a small icon
 * chip that floats in the top-right. Shows the element rune.
 */

import React from 'react';
import type { NorseElement } from '../../../types/NorseTypes';
import { ELEMENT_BAND, getElementBand } from '../../../utils/art/elementBand';

export interface CardElementBadgeProps {
	element: NorseElement;
}

const CardElementBadge: React.FC<CardElementBadgeProps> = ({ element }) => {
	if (element === 'neutral') return null;
	const band = getElementBand(element);
	const label = ELEMENT_BAND[element]?.label ?? element;
	return (
		<div
			className="card-frame__element-badge"
			aria-label={label}
			style={{
				'--cf-eb-from': band.from,
				'--cf-eb-to': band.to,
			} as React.CSSProperties}
		>
			{label.charAt(0).toUpperCase()}
		</div>
	);
};

(CardElementBadge as React.FC & { displayName?: string }).displayName = 'CardElementBadge';

export default CardElementBadge;
