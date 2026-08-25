import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PokerCard } from '../../types/PokerCombatTypes';
import { HoleCardsOverlay } from './HoleCardsOverlay';

const ACE_SPADES: PokerCard = { suit: 'spades', value: 'A', numericValue: 14 };
const KING_HEARTS: PokerCard = { suit: 'hearts', value: 'K', numericValue: 13 };

function renderOverlay(
	overrides: Partial<React.ComponentProps<typeof HoleCardsOverlay>> = {},
): string {
	return renderToStaticMarkup(React.createElement(HoleCardsOverlay, {
		cards: [ACE_SPADES, KING_HEARTS],
		variant: 'player',
		...overrides,
	}));
}

describe('HoleCardsOverlay reading chrome', () => {
	it('always mounts the hero-pocket path for player and opponent', () => {
		const player = renderOverlay({ variant: 'player' });
		const opponent = renderOverlay({ variant: 'opponent', faceDown: true });

		expect(player).toContain('hero-pocket-cards hero-pocket-cards--player');
		expect(player).toContain('data-hole-owner="player"');
		expect(player).toContain('aria-label="Your hole cards"');
		expect(player).not.toMatch(/[\s"]hole-cards--player/);
		expect(player).not.toContain('absolute left-1/2');

		expect(opponent).toContain('hero-pocket-cards hero-pocket-cards--opponent');
		expect(opponent).toContain('data-hole-owner="opponent"');
		expect(opponent).toContain('aria-label="Opponent hole cards"');
	});

	it('lets the player inspect face-up hole cards and keeps opponent cards inert', () => {
		const player = renderOverlay({ variant: 'player' });
		const opponent = renderOverlay({ variant: 'opponent', faceDown: true });

		expect(player).toContain('type="button"');
		expect(player).toContain('Hold to inspect poker card A of spades');
		expect(player).toContain('data-face="up"');
		expect(player).toContain('data-rank="A"');
		expect(player).toContain('data-suit="hearts"');

		expect(opponent).not.toContain('type="button"');
		expect(opponent).toContain('data-face="down"');
		expect(opponent).toContain('card-card-back');
	});

	it('shows placeholder backs when the pocket is empty', () => {
		const html = renderOverlay({ cards: [] });

		expect(html).toContain('data-hole-slot="0"');
		expect(html).toContain('data-hole-slot="1"');
		expect(html).toContain('data-face="down"');
		expect(html).not.toContain('type="button"');
		expect(html).not.toContain('data-rank="A"');
	});

	it('marks the acting player pocket and winning cards without a second layout path', () => {
		const html = renderOverlay({
			activeTurn: true,
			isShowdown: true,
			winningCards: [ACE_SPADES],
		});

		expect(html).toContain('hole-cards-active-turn');
		expect(html).toContain('winning-card-glow celebration');
		expect(html).toContain('data-face="up"');
	});

	it('reveals opponent hole cards at showdown', () => {
		const html = renderOverlay({
			variant: 'opponent',
			faceDown: true,
			isShowdown: true,
		});

		expect(html).toContain('data-face="up"');
		expect(html).toContain('data-rank="K"');
		expect(html).not.toContain('type="button"');
	});
});
