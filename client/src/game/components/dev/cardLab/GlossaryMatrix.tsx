/**
 * Glossary matrix — 4 rarities × 8 elements, same card content per row.
 *
 * Visual goal: see at a glance how the rarity stroke color and the
 * element band tint interact. The matrix uses a static SVG-only
 * mini-frame (no shimmer, no PixiJS) so the grid stays cheap to
 * render — it's a reference, not a hero element.
 *
 * Each row is the same sample card; columns toggle the element band.
 */

import React from 'react';
import { NORSE_ELEMENTS } from '../../../types/NorseTypes';
import { RARITY, type Rarity } from '@shared/schemas/rarity';
import { sampleForRarity, resolveSample } from './sampleCards';
import { ELEMENT_BAND } from '../../../utils/art/elementBand';
import { getCardArtPath, DEFAULT_PORTRAIT } from '../../../utils/art/artMapping';
import type { SimpleCardType } from '../../SimpleCard';

interface Props {
	cardType: SimpleCardType;
}

const MINI_W = 120;
const MINI_H = 170;

const MiniFrame: React.FC<{
	rarity: Rarity;
	element: keyof typeof ELEMENT_BAND;
	cardId: number;
}> = ({ rarity, element, cardId }) => {
	const stroke =
		rarity === 'mythic'
			? 'var(--rarity-mythic-color)'
			: rarity === 'epic'
				? 'var(--rarity-epic-color)'
				: rarity === 'rare'
					? 'var(--rarity-rare-color)'
					: 'var(--rarity-common-color)';
	const band = ELEMENT_BAND[element];
	const artPath = getCardArtPath(cardId) ?? DEFAULT_PORTRAIT;

	return (
		<div className="cardlab-mini" style={{ width: MINI_W }}>
			<svg viewBox={`0 0 ${MINI_W} ${MINI_H}`} width={MINI_W} height={MINI_H} aria-hidden="true">
				<defs>
					<linearGradient id={`mini-band-${rarity}-${element}`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor={band.from} stopOpacity="0" />
						<stop offset="1" stopColor={band.to} stopOpacity="0.95" />
					</linearGradient>
				</defs>
				<rect x="1" y="1" width={MINI_W - 2} height={MINI_H - 2} rx="8" fill="var(--rarity-common-bg)" stroke={stroke} strokeWidth="2" />
				<image
					href={artPath}
					x="3"
					y="3"
					width={MINI_W - 6}
					height={MINI_H - 6}
					preserveAspectRatio="xMidYMid slice"
					clipPath={`url(#mini-clip-${rarity}-${element})`}
				/>
				<rect
					x="3"
					y={MINI_H - 40}
					width={MINI_W - 6}
					height="37"
					fill={`url(#mini-band-${rarity}-${element})`}
				/>
				<clipPath id={`mini-clip-${rarity}-${element}`}>
					<rect x="3" y="3" width={MINI_W - 6} height={MINI_H - 6} rx="6" />
				</clipPath>
			</svg>
			<div className="cardlab-mini__caption">
				<span className="cardlab-mini__rarity" style={{ color: stroke }}>{rarity}</span>
				<span className="cardlab-mini__element">{band.label}</span>
			</div>
		</div>
	);
};

export const GlossaryMatrix: React.FC<Props> = ({ cardType }) => {
	const rows = RARITY.map((rarity) => ({
		rarity,
		sample: sampleForRarity(rarity),
	}));

	return (
		<section className="cardlab-section" aria-labelledby="cardlab-glossary-heading">
			<header className="cardlab-section__header">
				<h2 id="cardlab-glossary-heading" className="cardlab-section__title">Glossary matrix</h2>
				<p className="cardlab-section__hint">
					Rarity (rows) × element (columns). All cells use the same card type:{' '}
					<strong>{cardType}</strong>. Each cell renders a static mini-frame so
					the rarity stroke × element band interaction is readable at a glance.
				</p>
			</header>

			<div className="cardlab-matrix" role="table" aria-label="Rarity by element matrix">
				<div className="cardlab-matrix__head" role="row">
					<div className="cardlab-matrix__corner" role="columnheader" aria-label="Rarity axis" />
					{NORSE_ELEMENTS.map((el) => (
						<div key={el} className="cardlab-matrix__colhead" role="columnheader">
							{ELEMENT_BAND[el].label}
						</div>
					))}
				</div>

				{rows.map(({ rarity, sample }) => {
					const card = resolveSample(sample);
					const cardId = Number(card.id);
					return (
						<div key={rarity} className="cardlab-matrix__row" role="row">
							<div
								className={`cardlab-matrix__rowhead cardlab-matrix__rowhead--${rarity}`}
								role="rowheader"
							>
								{rarity}
							</div>
							{NORSE_ELEMENTS.map((el) => (
								<div key={el} className="cardlab-matrix__cell" role="cell">
									<MiniFrame rarity={rarity as Rarity} element={el} cardId={cardId} />
								</div>
							))}
						</div>
					);
				})}
			</div>
		</section>
	);
};
