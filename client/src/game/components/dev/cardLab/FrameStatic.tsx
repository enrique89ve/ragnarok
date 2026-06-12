/**
 * Direction 4 — static PNG (League-style pre-rendered frame).
 *
 * Composites the card art inside a transparent-centered PNG frame
 * baked by `scripts/exportCardFrames.ts`. Two layers:
 *   1. The character art <img> on the bottom (object-fit: cover).
 *   2. The pre-rendered PNG frame on top, pointer-events: none.
 *
 * The mana gem, attack/health emblems, and name plate are NOT baked
 * into the PNG — they're DOM so they stay sharp, themable, and
 * accessible (text scrappable, screen-reader friendly).
 *
 * If the PNG 404s (e.g. the export script wasn't run), the component
 * falls back to the SVG-only direction so the lab never blanks.
 */

import React, { useState } from 'react';
import { getRarityColor } from '../../../utils/rarityUtils';
import { getCardArtPath, DEFAULT_PORTRAIT } from '../../../utils/art/artMapping';
import { framePathFor } from '../../../utils/art/frameArt';
import type { Rarity } from '@shared/schemas/rarity';
import type { NorseElement } from '../../../types/NorseTypes';
import type { SimpleCardType } from '../../card/SimpleCardCompat';
import { ELEMENT_BAND } from '../../../utils/art/elementBand';
import { FrameSvgOnly } from './FrameSvgOnly';

interface Props {
	card: { id: number; name: string; manaCost?: number; attack?: number; health?: number };
	rarity: Rarity;
	element: NorseElement;
	cardType: SimpleCardType;
	artPath: string;
}

const STAGE_W = 280;
const STAGE_H = 400;

export const FrameStatic: React.FC<Props> = ({ card, rarity, element, cardType, artPath }) => {
	const [pngFailed, setPngFailed] = useState(false);
	const stroke = getRarityColor(rarity);
	const band = ELEMENT_BAND[element];
	const resolvedArt = artPath || getCardArtPath(card.id) || DEFAULT_PORTRAIT;
	const frameSrc = framePathFor(rarity, element);

	if (pngFailed) {
		return (
			<FrameSvgOnly
				card={card}
				rarity={rarity}
				element={element}
				cardType={cardType}
				artPath={resolvedArt}
			/>
		);
	}

	const showStats = cardType === 'minion' || cardType === 'hero' || cardType === 'armor';

	return (
		<div
			className="cardlab-frame-static"
			style={{ width: STAGE_W, height: STAGE_H }}
			data-rarity={rarity}
			data-element={element}
		>
			{/* Art layer (bottom) */}
			<img
				src={resolvedArt}
				alt=""
				className="cardlab-frame-static__art"
				draggable={false}
				width={STAGE_W}
				height={STAGE_H}
			/>

			{/* Element-tinted bottom band (sits on top of art, under frame PNG) */}
			<div
				className="cardlab-frame-static__band"
				style={{
					background: `linear-gradient(180deg, ${band.from}00 0%, ${band.from}66 60%, ${band.to}cc 100%)`,
				}}
			/>

			{/* Pre-rendered PNG frame (top, transparent center) */}
			<img
				src={frameSrc}
				alt=""
				className="cardlab-frame-static__png"
				draggable={false}
				onError={() => setPngFailed(true)}
			/>

			{/* DOM-rendered stats (not baked into the PNG) */}
			<div className="cardlab-frame-static__mana" aria-label={`Mana cost ${card.manaCost ?? 0}`}>
				<svg viewBox="-14 -14 28 28" width="28" height="28">
					<circle r="12" fill="var(--obsidian-900)" stroke={stroke} strokeWidth="2" />
					<text
						textAnchor="middle"
						dominantBaseline="central"
						fontSize="14"
						fontFamily="var(--font-display)"
						fill="var(--rarity-mythic-bright)"
					>
						{card.manaCost ?? 0}
					</text>
				</svg>
			</div>

			{showStats && (
				<div className="cardlab-frame-static__attack" aria-label={`Attack ${card.attack ?? 0}`}>
					<svg viewBox="-12 -12 24 24" width="24" height="24">
						<polygon points="0,-10 10,0 0,10 -10,0" fill="var(--rarity-rare-deep)" stroke={stroke} strokeWidth="1.2" />
						<text textAnchor="middle" dominantBaseline="central" fontSize="11" fontFamily="var(--font-display)" fill="var(--rarity-rare-bright)">
							{card.attack ?? 0}
						</text>
					</svg>
				</div>
			)}

			<div className="cardlab-frame-static__nameplate">
				<div className="cardlab-frame-static__type">{cardType.toUpperCase()}</div>
				<div className="cardlab-frame-static__name">{card.name}</div>
			</div>
		</div>
	);
};
