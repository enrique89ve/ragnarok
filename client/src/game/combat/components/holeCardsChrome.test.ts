import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const holeCardsCss = readFileSync(resolve(here, '../styles/hole-cards.css'), 'utf8');
const heroCardCss = readFileSync(resolve(here, '../styles/hero-card.css'), 'utf8');
const canvasCss = readFileSync(resolve(here, '../../poker/styles/canvas.css'), 'utf8');
const cardFrameCss = readFileSync(resolve(here, '../../components/card/CardFrame.css'), 'utf8');
const pokerFrameCss = readFileSync(resolve(here, '../../components/card/PokerCardFrame.css'), 'utf8');

describe('hole-card chrome contract', () => {
	it('glows the live pocket slot, not the retired arena-poker-card path', () => {
		expect(holeCardsCss).toMatch(
			/\.hero-pocket-cards--player\.hole-cards-active-turn \.hole-card-slot/,
		);
		expect(holeCardsCss).toMatch(
			/\.hero-pocket-cards--opponent\.hole-cards-active-turn \.hole-card-slot/,
		);
		expect(holeCardsCss).toContain('prefers-reduced-motion');
		expect(holeCardsCss).not.toContain('.arena-poker-card');
		expect(holeCardsCss).not.toContain('.player-hole-cards');
		expect(holeCardsCss).not.toContain('.opponent-hole-cards');
	});

	it('keeps pocket geometry on the canvas tokens and 8px card radius', () => {
		expect(canvasCss).toMatch(
			/\.opponent-hero-container \.hero-pocket-cards--opponent\s*\{[\s\S]*?transform-origin:\s*center top/,
		);
		expect(canvasCss).toMatch(
			/\.poker-hero-container \.hero-pocket-cards--player\s*\{[\s\S]*?transform-origin:\s*center bottom/,
		);
		expect(heroCardCss).toContain('--pocket-card-width: 112px');
		expect(heroCardCss).not.toContain('.arena-poker-card');
		expect(cardFrameCss).toMatch(/border-radius:\s*var\(--cf-radius,\s*8px\)/);
		expect(pokerFrameCss).toContain('--cf-radius: 8px');
	});
});
