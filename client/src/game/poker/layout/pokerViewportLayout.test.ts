import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	buildPokerViewportLayoutStyle,
	POKER_VIEWPORT_LAYOUT,
	POKER_VIEWPORT_LAYOUT_STYLE,
	POKER_VIEWPORT_ZONE_IDS,
} from './pokerViewportLayout';

const layoutDir = dirname(fileURLToPath(import.meta.url));
const canvasCss = readFileSync(resolve(layoutDir, '../styles/canvas.css'), 'utf8');
const atmosphereCss = readFileSync(resolve(layoutDir, '../../combat/styles/norse-atmosphere.css'), 'utf8');
const cardFrameCss = readFileSync(resolve(layoutDir, '../../combat/styles/card-frame.css'), 'utf8');
const reactionsCss = readFileSync(resolve(layoutDir, '../../combat/styles/hero-reactions.css'), 'utf8');
const pokerDramaCss = readFileSync(resolve(layoutDir, '../../combat/styles/poker-drama.css'), 'utf8');
const manaCss = readFileSync(resolve(layoutDir, '../../components/ManaBar.css'), 'utf8');
const timerCss = readFileSync(resolve(layoutDir, '../../combat/styles/timer.css'), 'utf8');

describe('pokerViewportLayout', () => {
	it('emits every zone box as CSS variables', () => {
		const style = buildPokerViewportLayoutStyle();

		for (const zoneId of POKER_VIEWPORT_ZONE_IDS) {
			const zone = POKER_VIEWPORT_LAYOUT.zones[zoneId];
			expect(style[`--poker-zone-${zoneId}-x`]).toBe(`${zone.x}px`);
			expect(style[`--poker-zone-${zoneId}-y`]).toBe(`${zone.y}px`);
			expect(style[`--poker-zone-${zoneId}-w`]).toBe(`${zone.width}px`);
			expect(style[`--poker-zone-${zoneId}-h`]).toBe(`${zone.height}px`);
			expect(style[`--poker-zone-${zoneId}-rot`]).toBe(`${zone.rotation}deg`);
		}
	});

	it('keeps the published style in lockstep with the builder', () => {
		expect(POKER_VIEWPORT_LAYOUT_STYLE).toEqual(buildPokerViewportLayoutStyle());
	});

	it('does not let canvas.css redeclare zone coordinates', () => {
		expect(canvasCss).not.toMatch(/--poker-zone-[A-Za-z]+-(?:x|y|w|h|rot)\s*:/);
		expect(canvasCss).not.toMatch(/--poker-reference-(?:width|height)\s*:/);
		expect(canvasCss).not.toMatch(/--poker-bottom-rail-y\s*:/);
	});

	it('parks the feedback stack above the flop without leaving the hero column', () => {
		const { communityCards, feedbackStack } = POKER_VIEWPORT_LAYOUT.zones;
		expect(feedbackStack.x).toBe(communityCards.x);
		expect(feedbackStack.width).toBe(communityCards.width);
		expect(feedbackStack.y + feedbackStack.height).toBeLessThanOrEqual(communityCards.y);
		expect(communityCards.y - (feedbackStack.y + feedbackStack.height)).toBeLessThanOrEqual(8);
	});

	it('aligns the flop with the hero column between both avatars', () => {
		const { communityCards, opponentHero, playerHero } = POKER_VIEWPORT_LAYOUT.zones;
		expect(communityCards.y).toBe(474);
		expect(communityCards.x).toBe(opponentHero.x);
		expect(communityCards.x).toBe(playerHero.x);
		expect(communityCards.y).toBeGreaterThan(opponentHero.y + opponentHero.height);
		expect(communityCards.y + communityCards.height).toBeLessThan(playerHero.y);
		expect(playerHero.y - (communityCards.y + communityCards.height)).toBeGreaterThanOrEqual(96);
	});

	it('places the opponent pocket pair under the mana dock with half-card reveal room', () => {
		const { opponentHero, opponentHeroCards, communityCards } = POKER_VIEWPORT_LAYOUT.zones;
		expect(opponentHeroCards.y).toBe(opponentHero.y + opponentHero.height - 4);
		expect(opponentHeroCards.y + opponentHeroCards.height).toBeLessThan(communityCards.y);
		expect(canvasCss).toMatch(/\.opponent-hero-container \.hero-pocket-cards--opponent\s*\{[\s\S]*?top:\s*calc\([\s\S]*?var\(--poker-zone-opponentHeroCards-y\)[\s\S]*?-\s*var\(--poker-zone-opponentHero-y\)[\s\S]*?\)/);
		expect(canvasCss).toMatch(/\.opponent-hero-container \.hero-pocket-cards--opponent\s*\{[\s\S]*?z-index:\s*40/);
		expect(canvasCss).toMatch(/\.opponent-hero-container \.hero-pocket-cards--opponent\s*\{[\s\S]*?align-items:\s*flex-start/);
		expect(canvasCss).toMatch(/\.opponent-hero-container \.hero-pocket-cards--opponent\s*\{[\s\S]*?transform-origin:\s*center top/);
	});

	it('raises the lower player hand by the requested 15 percent', () => {
		expect(POKER_VIEWPORT_LAYOUT.zones.playerHand.height).toBe(192);
		expect(POKER_VIEWPORT_LAYOUT_STYLE['--poker-player-hand-card-rise']).toBe('96px');
	});

	it('raises the hourglass by 25 percent and enlarges its countdown by 50 percent', () => {
		expect(POKER_VIEWPORT_LAYOUT.zones.hourglass.y).toBe(90);
		expect(POKER_VIEWPORT_LAYOUT.zones.hourglass.height).toBe(128);
		expect(timerCss).toMatch(/\.hg-countdown-text\s*\{[\s\S]*?font-size:\s*21px/);
	});

	it('raises the central battlefield group by 10 percent', () => {
		const { battlefield, opponentBattlefieldCards, playerBattlefieldCards } = POKER_VIEWPORT_LAYOUT.zones;
		expect(battlefield.y).toBe(211);
		expect(opponentBattlefieldCards.y).toBe(235);
		expect(playerBattlefieldCards.y).toBe(475);
		expect(playerBattlefieldCards.y - opponentBattlefieldCards.y).toBe(240);
	});

	it('keeps edge chrome outside the minion field', () => {
		const { opponentHero, communityCards, opponentBattlefieldCards, battleLog, deckCounters } = POKER_VIEWPORT_LAYOUT.zones;
		expect(communityCards.x + communityCards.width).toBeLessThan(opponentBattlefieldCards.x);
		expect(opponentHero.x).toBeLessThan(communityCards.x + 1);
		expect(battleLog.x).toBeGreaterThan(opponentBattlefieldCards.x + opponentBattlefieldCards.width);
		expect(deckCounters.x + deckCounters.width).toBe(1920 - 32);
	});
});

describe('persistent hero resource visibility', () => {
	it('keeps HP danger effects off the structural hero wrappers', () => {
		expect(pokerDramaCss).not.toMatch(/\[data-hero-role=[^\]]+\]\s*\{[^}]*\bfilter\s*:/);
		expect(pokerDramaCss).toContain('--hero-portrait-state-wash');
		expect(cardFrameCss).toContain('var(--hero-portrait-state-wash, transparent)');
	});

	it('animates turn and power decoration without fading hero structure', () => {
		const turnPulse = atmosphereCss.match(/@keyframes turn-glow-pulse\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
		expect(turnPulse).not.toMatch(/\bopacity\s*:/);
		expect(reactionsCss).not.toMatch(/\.hero-portrait\.power-activating\s*\{[^}]*\banimation\s*:/);
		expect(reactionsCss).toMatch(/\.hero-portrait\.power-activating::before\s*\{/);
	});

	it('represents mana states with opaque color and stroke', () => {
		expect(manaCss).not.toContain('--mana-crystal-opacity');
		expect(manaCss).toMatch(/\.mana-crystal\s*\{[^}]*\bopacity:\s*1/);
		const fillBurst = manaCss.match(/@keyframes mana-fill-burst\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
		const spendCrack = manaCss.match(/@keyframes mana-spend-crack\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
		expect(fillBurst).not.toMatch(/\bopacity\s*:/);
		expect(spendCrack).not.toMatch(/\bopacity\s*:/);
	});
});
