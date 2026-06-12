/**
 * Direction 2 — SVG + CSS.
 *
 * Renders the same SVG chrome as FrameSvgOnly, then layers CSS-driven
 * effects on top: a rarity-tinted halo (box-shadow keyframe), a
 * diagonal shimmer band (`::before` translate), and a slow inner
 * border pulse for epic/mythic.
 *
 * The class names are all `cardlab-frame-css-*` and live in
 * CardLabPage.css so this file stays layout-only.
 */

import React from 'react';
import type { Rarity } from '@shared/schemas/rarity';
import type { NorseElement } from '../../../types/NorseTypes';
import type { SimpleCardType } from '../../card/SimpleCardCompat';
import { FrameSvgOnly } from './FrameSvgOnly';

interface Props {
	card: { id: number; name: string; manaCost?: number; attack?: number; health?: number };
	rarity: Rarity;
	element: NorseElement;
	cardType: SimpleCardType;
	artPath: string;
}

export const FrameSvgCss: React.FC<Props> = ({ card, rarity, element, cardType, artPath }) => {
	const tier = rarity === 'mythic' ? 'mythic' : rarity === 'epic' ? 'epic' : rarity === 'rare' ? 'rare' : 'common';
	const pulseTier = tier === 'mythic' || tier === 'epic' ? tier : 'none';

	return (
		<div
			className={[
				'cardlab-frame-css',
				`cardlab-frame-css--${tier}`,
				`cardlab-frame-css--pulse-${pulseTier}`,
			].join(' ')}
			data-rarity={rarity}
			data-element={element}
		>
			<FrameSvgOnly card={card} rarity={rarity} element={element} cardType={cardType} artPath={artPath} />
			<span aria-hidden="true" className="cardlab-frame-css__shimmer" />
		</div>
	);
};
