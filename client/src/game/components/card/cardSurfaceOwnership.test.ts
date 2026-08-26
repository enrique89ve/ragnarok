import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

const stripCssComments = (css: string): string =>
	css.replace(/\/\*[\s\S]*?\*\//g, '');

const readCss = (relativePath: string): string =>
	stripCssComments(readFileSync(resolve(here, relativePath), 'utf8'));

const collectionCss = readCss('../collection/collection.css');
const battlefieldCss = readCss('../SimpleBattlefield.css');
const cardFrameCss = readCss('./CardFrame.css');
const geometryCss = readCss('./CardFrameGeometry.css');
const motionCss = readCss('./CardMotion.css');
const surfaceCss = readCss('./cardSurfaceContract.css');
const motionHelper = readFileSync(resolve(here, './applyCardMotion.ts'), 'utf8');
const directDragSource = readFileSync(resolve(here, '../DirectCardDrag.tsx'), 'utf8');

describe('card surface CSS ownership', () => {
	it('keeps collection page CSS off CardFrame internals', () => {
		expect(collectionCss).not.toMatch(/\.card-frame__/);
	});

	it('keeps battlefield board CSS off CardFrame internals and retired SimpleCard classes', () => {
		expect(battlefieldCss).not.toMatch(/\.card-frame__/);
		expect(battlefieldCss).not.toMatch(/\.simple-card\b/);
		expect(battlefieldCss).not.toMatch(/\.card-description\b/);
		expect(battlefieldCss).not.toMatch(/\.keyword-icons-container\b/);
		expect(battlefieldCss).not.toMatch(/\.keyword-icon-badge\b/);
	});

	it('owns collection and poker surface contracts in cardSurfaceContract.css', () => {
		expect(surfaceCss).toMatch(/\.norse-card-frame--surface-poker\b/);
		expect(surfaceCss).toMatch(/\.norse-card-frame--surface-collection\b/);
		expect(surfaceCss).toMatch(/\.norse-card-frame--surface-mulligan\b/);
		expect(surfaceCss).toContain('--norse-card-keyword-bottom');
	});

	it('does not let viewport width rewrite Norse mana anatomy', () => {
		expect(geometryCss).toMatch(
			/\.card-frame:not\(\.norse-card-frame\)\s+\.card-frame__mana-gem/,
		);
		expect(geometryCss).not.toContain('@keyframes');
	});

	it('keeps CardFrame hover off the geometry transform channel', () => {
		expect(cardFrameCss).not.toMatch(
			/\.card-frame\[data-interactive='true'\]:hover\s*\{[^}]*transform:/,
		);
		expect(motionCss).toContain('[data-card-motion]');
		expect(motionCss).toContain('var(--card-motion-x)');
	});

	it('writes card motion through CSS variables, not element.style.transform', () => {
		expect(motionHelper).toContain("setProperty('--card-motion-x'");
		expect(motionHelper).toContain("removeProperty('transform')");
		expect(motionHelper).not.toMatch(/element\.style\.transform\s*=/);
		expect(directDragSource).toContain('applyCardMotion');
		expect(directDragSource).not.toMatch(/style\.transform\s*=/);
	});

	it('composes battlefield hover and shake on CSS variables, not competing transform writes', () => {
		const hoverRule = battlefieldCss.match(/\.bf-card-wrapper:hover\s*\{[^}]+\}/)?.[0] ?? '';
		expect(battlefieldCss).toMatch(/\.bf-card-position\s*\{/);
		expect(battlefieldCss).toContain('var(--bf-motion-x)');
		expect(battlefieldCss).toContain('@keyframes bf-hit-x');
		expect(battlefieldCss).toContain('@keyframes bf-hit-rotate');
		expect(hoverRule).toContain('--bf-motion-y: -14px');
		expect(hoverRule).not.toContain('transform:');
		expect(battlefieldCss).not.toContain('@keyframes damageShake');
		expect(battlefieldCss).not.toContain('@keyframes invalidShake');
	});

	it('keeps HandFan shake off the fan placement transform string', () => {
		const handFanCss = readCss('../HandFan.css');
		const handFanSource = readFileSync(resolve(here, '../HandFan.tsx'), 'utf8');
		expect(handFanCss).toContain('--hand-shake-x');
		expect(handFanCss).toContain('var(--hand-fan-push-x)');
		expect(handFanSource).toContain('--hand-fan-lift');
		expect(handFanSource).not.toMatch(/transform:\s*`translateY/);
	});

	it('enforces the testnet ownership gates from the architecture report', () => {
		const stateCss = readCss('./CardFrameState.css');
		const pokerBoardCss = readCss('../../poker/styles/canvas.css');
		const appSource = readFileSync(resolve(here, '../../../App.tsx'), 'utf8');
		const animationLayer = readFileSync(resolve(here, '../AnimationLayer.tsx'), 'utf8');
		const cardsBarrel = readFileSync(resolve(here, '../../utils/cards/index.ts'), 'utf8');

		expect(pokerBoardCss).not.toMatch(/\.card-frame__/);
		expect(stateCss).not.toMatch(/\.card-frame[^{]*\{[^}]*(width|height)\s*:/);
		expect(stateCss).not.toMatch(/--norse-card-(name|keyword|mana|atk|hp)-/);
		expect(cardFrameCss).not.toMatch(/\.card-frame--highlighted\s*\{[^}]*transform:/);
		expect(surfaceCss).toContain('@container');
		expect(surfaceCss).not.toMatch(/@media \(max-width:\s*640px\)/);
		expect(appSource).not.toContain('CardTransformBridgeInitializer');
		expect(appSource).not.toContain('CardTransformProvider');
		expect(cardsBarrel).not.toContain('CardTransformationManager');
		expect(cardsBarrel).not.toContain('CardTransformBridge');
		expect(animationLayer).toContain('battle-fx-layer');
		expect(motionCss).toContain('scale(var(--card-motion-scale))');
	});
});
