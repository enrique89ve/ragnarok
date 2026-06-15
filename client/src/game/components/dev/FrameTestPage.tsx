/**
 * Frame Test — dev-only route.
 *
 * Mirrors the actual opponent-hand layout (`<div class="opponent-revealed-card">
 * <SimpleCardCompat/></div>`) so we can verify CardFrame art containment
 * visually WITHOUT sitting through a real match (which requires auth + game
 * state).
 *
 * The art asset and a synthetic card dataset are picked from the same
 * `cardLab/sampleCards` source so paths and dims match production.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { sampleForRarity, resolveSample } from './cardLab/sampleCards';
import { SimpleCardCompat } from '../card/SimpleCardCompat';
import {
	CardCardBack,
	CardRankSuit,
	PokerCardFrame,
} from '../card';
import type { NorseSuit } from '../../utils/cards/norsePokerCard';
import type { Rarity } from '@shared/schemas/rarity';
import '../../combat/styles/opponent-hand.css';
import '../../combat/styles/community-cards.css';
import '../card/CardFrame.css';
import './FrameTestPage.css';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'mythic'];
const POKER_SAMPLES: ReadonlyArray<{ suit: NorseSuit; value: string }> = [
	{ suit: 'spades', value: 'A' },
	{ suit: 'hearts', value: 'K' },
	{ suit: 'diamonds', value: '9' },
];

function makeCard(rarity: Rarity, id: number, withArt: boolean) {
	const sample = sampleForRarity(rarity);
	const found = resolveSample(sample) as any;
	return {
		id: withArt ? id : `${rarity}-noart-${id}`,
		name: found?.name ?? sample.fallbackName,
		manaCost: found?.manaCost ?? 2,
		attack: found?.attack ?? 2,
		health: found?.health ?? 3,
		description: found?.description ?? 'Test card for frame containment.',
		type: 'minion' as const,
		rarity,
		tribe: found?.tribe ?? 'Bear',
		cardClass: found?.cardClass,
		keywords: found?.keywords ?? ['taunt'],
		element: found?.element ?? sample.fallbackElement,
	};
}

export default function FrameTestPage() {
	const cards = RARITIES.slice(0, 3).map((r, i) => makeCard(r, 1001 + i, i === 0));

	const renderCard = (c: ReturnType<typeof makeCard>) => (
		<SimpleCardCompat
			card={{
				id: c.id,
				name: c.name,
				manaCost: c.manaCost,
				attack: c.attack,
				health: c.health,
				description: c.description,
				type: c.type,
				rarity: c.rarity,
				tribe: c.tribe,
				cardClass: c.cardClass,
				keywords: c.keywords,
				element: c.element,
			}}
			size="small"
		/>
	);

	return (
		<div className="frame-test-page">
			<header className="frame-test-page__header">
				<Link to={routes.home} className="frame-test-page__back">← Home</Link>
				<h1>Frame Test — opponent-hand mirror</h1>
				<p>
					Each card is wrapped in the exact opponent-hand DOM the game uses.
					First card has artPath; the other two should render the fallback panel.
				</p>
			</header>

			<section className="frame-test-page__row" data-test="opp-hand">
				<h2>Opponent hand layout</h2>
				<div
					className="opponent-hand-display"
					style={{ ['--opponent-visible-hand-count' as string]: '3' } as React.CSSProperties}
				>
					{cards.map((c, i) => (
						<div
							key={c.id}
							className="opponent-revealed-card"
							data-card-index={i}
						>
							{renderCard(c)}
						</div>
					))}
				</div>
			</section>

			<section className="frame-test-page__row">
				<h2>Plain frame (no scale, no negative margin)</h2>
				<div className="frame-test-page__plain">
					{cards.map((c) => (
						<div key={c.id} className="frame-test-page__plain-slot">
							{renderCard(c)}
						</div>
					))}
				</div>
			</section>

			<section className="frame-test-page__row">
				<h2>Poker frame (production slots)</h2>
				<div className="frame-test-page__poker">
					{POKER_SAMPLES.map((card) => (
						<PokerCardFrame key={`${card.suit}-${card.value}`} size="medium">
							<CardRankSuit suit={card.suit} value={card.value} />
						</PokerCardFrame>
					))}
					<PokerCardFrame size="medium" variant="face-down">
						<CardCardBack />
					</PokerCardFrame>
				</div>
			</section>
		</div>
	);
}
