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
import type { NorseElement } from '../../../types/NorseTypes';

export interface CardManaGemProps {
	cost: number;
}

const ELEMENT_GLYPH: Record<NorseElement, string> = {
	fire: 'F',
	water: 'W',
	grass: 'E',
	electric: 'A',
	light: 'L',
	dark: 'D',
	ice: 'I',
	neutral: 'N',
};

const CardManaGem: React.FC<CardManaGemProps> = ({ cost }) => {
	const { element, size } = useCardFrame();
	const band = getElementBand(element);
	const isPreview = size === 'preview';
	const digitCount = Math.min(2, String(Math.abs(Math.trunc(cost))).length);

	return (
		<div
			className="card-frame__mana-gem"
			data-size={size}
			data-element={element}
			style={{
				'--cf-mana-from': band.from,
				'--cf-mana-to': band.to,
				fontSize: isPreview ? '1.95rem' : undefined,
			} as React.CSSProperties}
		>
			<span className="card-frame__mana-element" aria-hidden="true">
				{ELEMENT_GLYPH[element]}
			</span>
			<span className="card-frame__mana-cost" data-digit-count={digitCount}>
				{cost}
			</span>
		</div>
	);
};

export default CardManaGem;
