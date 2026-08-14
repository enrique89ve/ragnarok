/**
 * Card Lab — dev-only route.
 *
 * The card frame R&D surface. Lets a designer / engineer pick any
 * (rarity, element, cardType) and see the same card rendered through
 * three different frame directions side by side, then sweep the full
 * glossary matrix below.
 *
 * Access: only mounted when `import.meta.env.DEV` is true (gated in
 * App.tsx). The lazy chunk is excluded from production builds via
 * `import.meta.glob`, matching the /prototype/poker-viewport precedent.
 *
 * Trust boundary: this page never touches matchmaking, account state,
 * or chain APIs. It's a pure visual lab.
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { RARITY, type Rarity } from '@shared/schemas/rarity';
import { NORSE_ELEMENTS, type NorseElement } from '../../types/NorseTypes';
import { CARD_TYPES } from '../../data/schemas/primitives/cardType';
import { sampleForRarity, resolveSample } from './cardLab/sampleCards';
import { ELEMENT_BAND } from '../../utils/art/elementBand';
import { getCardArtPath, DEFAULT_PORTRAIT } from '../../utils/art/artMapping';
import { FrameSvgOnly } from './cardLab/FrameSvgOnly';
import { FrameSvgCss } from './cardLab/FrameSvgCss';
import { FrameSvgPixi } from './cardLab/FrameSvgPixi';
import { FrameStatic } from './cardLab/FrameStatic';
import { GlossaryMatrix } from './cardLab/GlossaryMatrix';
import {
	FRAME_DIRECTIONS,
	FRAME_DIRECTION_LABEL,
	FRAME_DIRECTION_NOTE,
	type FrameDirection,
} from './cardLab/types';
import type { SimpleCardType } from '../card/SimpleCardCompat';
import './cardLab/CardLabPage.css';

const TYPE_OPTIONS: readonly SimpleCardType[] = CARD_TYPES as readonly SimpleCardType[];

export default function CardLabPage() {
	const [rarity, setRarity] = useState<Rarity>('mythic');
	const [element, setElement] = useState<NorseElement>('fire');
	const [cardType, setCardType] = useState<SimpleCardType>('minion');
	const [hovered, setHovered] = useState<FrameDirection | null>(null);

	const sample = useMemo(() => sampleForRarity(rarity), [rarity]);
	const card = useMemo(() => resolveSample(sample), [sample]);
	const cardIdNum = Number(card.id);
	const artPath = useMemo(() => getCardArtPath(cardIdNum) ?? DEFAULT_PORTRAIT, [cardIdNum]);

	const cardFields = {
		id: cardIdNum,
		name: card.name,
		manaCost: card.manaCost,
		attack: (card as { attack?: number }).attack,
		health: (card as { health?: number }).health,
	};

	return (
		<div className="cardlab-page">
			<header className="cardlab-page__header">
				<div className="cardlab-page__crumbs">
					<Link to={routes.home} className="cardlab-page__back">← Home</Link>
					<span className="cardlab-page__chip">DEV</span>
				</div>
				<h1 className="cardlab-page__title">Card Frame Lab</h1>
				<p className="cardlab-page__sub">
					Three frame directions, one card. Toggle rarity, element, and type
					below to see how each direction reacts. The matrix at the bottom
					walks the full rarity × element grid.
				</p>
			</header>

			<section className="cardlab-controls" aria-label="Frame controls">
				<label className="cardlab-controls__field">
					<span className="cardlab-controls__label">Rarity</span>
					<select
						className="cardlab-controls__select"
						value={rarity}
						onChange={(e) => setRarity(e.target.value as typeof RARITY[number])}
					>
						{RARITY.map((r) => (
							<option key={r} value={r}>{r}</option>
						))}
					</select>
				</label>

				<label className="cardlab-controls__field">
					<span className="cardlab-controls__label">Element</span>
					<select
						className="cardlab-controls__select"
						value={element}
						onChange={(e) => setElement(e.target.value as NorseElement)}
					>
						{NORSE_ELEMENTS.map((el) => (
							<option key={el} value={el}>{ELEMENT_BAND[el].label} ({el})</option>
						))}
					</select>
				</label>

				<label className="cardlab-controls__field">
					<span className="cardlab-controls__label">Card type</span>
					<select
						className="cardlab-controls__select"
						value={cardType}
						onChange={(e) => setCardType(e.target.value as SimpleCardType)}
					>
						{TYPE_OPTIONS.map((t) => (
							<option key={t} value={t}>{t}</option>
						))}
					</select>
				</label>

				<div className="cardlab-controls__cardinfo">
					<span className="cardlab-controls__label">Sample</span>
					<strong className="cardlab-controls__cardname">{card.name}</strong>
					<span className="cardlab-controls__cardid">id #{card.id}</span>
				</div>
			</section>

			<section className="cardlab-section" aria-label="Frame comparison">
				<header className="cardlab-section__header">
					<h2 className="cardlab-section__title">Frame directions</h2>
					<p className="cardlab-section__hint">
						Same card, three rendering paths. Hover a frame to spotlight it.
					</p>
				</header>

				<div className="cardlab-compare">
					{FRAME_DIRECTIONS.map((dir) => {
						const isFaded = hovered !== null && hovered !== dir;
						return (
							<div
								key={dir}
								className={[
									'cardlab-compare__cell',
									isFaded ? 'cardlab-compare__cell--faded' : '',
								].join(' ')}
								onMouseEnter={() => setHovered(dir)}
								onMouseLeave={() => setHovered(null)}
							>
								<div className="cardlab-compare__stage">
									{dir === 'svg-only' && (
										<FrameSvgOnly
											card={cardFields}
											rarity={rarity}
											element={element}
											cardType={cardType}
											artPath={artPath}
										/>
									)}
									{dir === 'svg-css' && (
										<FrameSvgCss
											card={cardFields}
											rarity={rarity}
											element={element}
											cardType={cardType}
											artPath={artPath}
										/>
									)}
									{dir === 'svg-pixi' && (
										<FrameSvgPixi
											card={cardFields}
											rarity={rarity}
											element={element}
											cardType={cardType}
											artPath={artPath}
										/>
									)}
									{dir === 'static-png' && (
										<FrameStatic
											card={cardFields}
											rarity={rarity}
											element={element}
											cardType={cardType}
											artPath={artPath}
										/>
									)}
								</div>
								<footer className="cardlab-compare__caption">
									<strong className="cardlab-compare__label">{FRAME_DIRECTION_LABEL[dir]}</strong>
									<span className="cardlab-compare__note">{FRAME_DIRECTION_NOTE[dir]}</span>
								</footer>
							</div>
						);
					})}
				</div>
			</section>

			<GlossaryMatrix cardType={cardType} />

			<footer className="cardlab-page__footer">
				<p>
					Confidence on the SVG / CSS / PixiJS split: <strong>high</strong> on
					chrome vs. effects; <strong>medium</strong> on the PixiJS v8 API
					(this page is the first local PixiJS application outside the
					existing particle canvas). The static PNG frames are baked by{' '}
					<code>pnpm run build:card-frames</code> (resvg-js, 32 frames,
					~1.2 MB total at 2× DPR). Routes are dev-only and gated by{' '}
					<code>import.meta.env.DEV</code>; the lazy chunk is excluded from
					prod via <code>import.meta.glob</code>.
				</p>
			</footer>
		</div>
	);
}
