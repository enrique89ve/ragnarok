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
const battlefieldSource = readFileSync(resolve(here, '../SimpleBattlefield.tsx'), 'utf8');
const cardFrameCss = readCss('./CardFrame.css');
const geometryCss = readCss('./CardFrameGeometry.css');
const norseCardCss = readCss('./NorseCardFrame.css');
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

	it('scales card names from the frame and reserves the minion lower rail', () => {
		expect(surfaceCss).toContain('container-type: inline-size');
		expect(norseCardCss).toContain(
			'calc(var(--norse-card-name-font-size) * var(--norse-card-name-font-scale))',
		);
		expect(norseCardCss).toContain('--norse-card-name-height: calc(15px * var(--norse-card-ui-scale));');
		expect(norseCardCss).not.toMatch(/\.card-frame__name-plate\[data-size="(?:small|medium|large)"\]\s*\{[^}]*font-size/);
		expect(surfaceCss).toContain(
			'.collection-card-frame.collection-card-frame--profile-minion.norse-card-frame--surface-collection',
		);
		expect(surfaceCss).toContain('var(--norse-card-stat-overhang)');
	});

	it('does not let viewport width rewrite Norse mana anatomy', () => {
		expect(geometryCss).toMatch(
			/\.card-frame:not\(\.norse-card-frame\)\s+\.card-frame__mana-gem/,
		);
		expect(geometryCss).not.toContain('@keyframes');
	});

	it('keeps CardFrame hover off the geometry transform channel', () => {
		const keyframeBody = (name: string): string => {
			const start = cardFrameCss.search(
				new RegExp(`@keyframes\\s+${name}\\s*\\{`),
			);
			if (start < 0) return '';
			const open = cardFrameCss.indexOf('{', start);
			let depth = 0;
			for (let i = open; i < cardFrameCss.length; i += 1) {
				const ch = cardFrameCss[i];
				if (ch === '{') depth += 1;
				else if (ch === '}') {
					depth -= 1;
					if (depth === 0) return cardFrameCss.slice(open + 1, i);
				}
			}
			return '';
		};

		expect(cardFrameCss).not.toMatch(
			/\.card-frame(?!__)[^{]*\{[^}]*\btransform\s*:/,
		);
		expect(keyframeBody('pokerSpellCastGlow')).not.toContain('transform');
		expect(keyframeBody('wagerActivateGlow')).not.toContain('transform');
		expect(motionCss).toContain('[data-card-motion]');
		expect(motionCss).toContain('var(--card-motion-x)');
		expect(motionCss).toContain('var(--card-reaction-x)');
		expect(motionCss).toContain('var(--card-action-x)');
		expect(motionCss).toContain('--card-motion-duration');
		expect(motionCss).toContain('card-action-spell-cast');
		expect(motionCss).toContain('card-action-wager-activate');
		expect(motionCss).toContain('scale(calc(1 + var(--card-reaction-scale)))');
		expect(motionCss).toContain('scale(calc(1 + var(--card-action-scale)))');
		expect(motionCss).toContain('animation-composition: add, add');
		expect(motionCss).not.toMatch(
			/@keyframes\s+card-action-spell-cast\s*\{[^}]*--card-motion-scale/,
		);
		expect(motionCss).not.toContain('--card-fx-');
	});

	it('writes card motion through CSS variables, not element.style.transform', () => {
		expect(motionHelper).toContain("setProperty('--card-motion-x'");
		expect(motionHelper).toContain("removeProperty('transform')");
		expect(motionHelper).toContain('stampCardMotionClass');
		expect(motionHelper).not.toMatch(/element\.style\.transform\s*=/);
		expect(directDragSource).toContain('applyCardMotion');
		expect(directDragSource).toContain('data-card-motion');
		expect(directDragSource).toContain('--card-motion-scale');
		expect(directDragSource).not.toMatch(/\btransform\s*:/);
	});

	it('composes battlefield hover and shake on CSS variables, not competing transform writes', () => {
		const hoverRule = battlefieldCss.match(/\.bf-card-wrapper:hover\s*\{[^}]+\}/)?.[0] ?? '';
		const hitXBody = (() => {
			const start = battlefieldCss.search(/@keyframes\s+bf-reaction-hit-x\s*\{/);
			if (start < 0) return '';
			const open = battlefieldCss.indexOf('{', start);
			let depth = 0;
			for (let i = open; i < battlefieldCss.length; i += 1) {
				const ch = battlefieldCss[i];
				if (ch === '{') depth += 1;
				else if (ch === '}') {
					depth -= 1;
					if (depth === 0) return battlefieldCss.slice(open + 1, i);
				}
			}
			return '';
		})();
		expect(battlefieldCss).toMatch(/\.bf-card-position\s*\{/);
		expect(battlefieldCss).toContain('var(--bf-motion-x)');
		expect(battlefieldCss).toContain('var(--bf-reaction-x)');
		expect(battlefieldCss).toContain('var(--bf-action-x)');
		expect(battlefieldCss).toContain('@keyframes bf-reaction-hit-x');
		expect(battlefieldCss).toContain('@keyframes bf-reaction-hit-rotate');
		expect(battlefieldCss).toContain('@keyframes bf-action-wager-activate');
		expect(battlefieldCss).toContain('.bf-card-wrapper.shake.is-activating');
		expect(battlefieldCss).toContain('.bf-summon-fx');
		expect(battlefieldSource).toContain('className="bf-summon-fx"');
		expect(hoverRule).toContain('--bf-motion-y: -14px');
		expect(hoverRule).not.toContain('transform:');
		expect(hoverRule).not.toContain('--bf-reaction-');
		expect(hoverRule).not.toContain('--bf-action-');
		expect(hitXBody).toContain('--bf-reaction-x');
		expect(hitXBody).not.toContain('--bf-motion-x');
		expect(battlefieldCss).not.toContain('--bf-fx-');
		expect(battlefieldCss).not.toMatch(/\.bf-card-wrapper\s*\{[^}]*animation:\s*summonFlash/);
		expect(battlefieldCss).not.toContain('@keyframes damageShake');
		expect(battlefieldCss).not.toContain('@keyframes invalidShake');
	});

	it('keeps battlefield reflow cards direct, stable, and layout-owned', () => {
		expect(battlefieldSource).toContain('buildBattlefieldLayoutItems');
		expect(battlefieldSource).toContain('<LayoutGroup>');
		expect(battlefieldSource).toContain('layout="position"');
		expect(battlefieldSource).toContain('key={key}');
		expect(battlefieldSource).not.toContain('cards[index]');
		expect(battlefieldSource).not.toContain('key={`${side}-slot-${index}`}');
		expect(battlefieldCss).toContain('flex: 0 0 var(--bf-card-width)');
	});

	it('keeps HandFan shake off the fan placement transform string', () => {
		const handFanCss = readCss('../HandFan.css');
		const handFanSource = readFileSync(resolve(here, '../HandFan.tsx'), 'utf8');
		expect(handFanCss).toContain('--hand-shake-x');
		expect(handFanCss).toContain('var(--hand-fan-push-x)');
		expect(handFanSource).toContain('--hand-fan-lift');
		expect(handFanSource).not.toMatch(/transform:\s*`translateY/);
	});

	it('keeps HandFan visual lift tied to hover instead of click selection', () => {
		const handFanSource = readFileSync(resolve(here, '../HandFan.tsx'), 'utf8');
		expect(handFanSource).toContain('const activeIndex = hoveredIndex;');
		expect(handFanSource).not.toContain('selectedCardId');
		expect(handFanSource).not.toContain('setSelectedCardId');
	});

	it('enforces the testnet ownership gates from the architecture report', () => {
		const stateCss = readCss('./CardFrameState.css');
		const fxCss = readCss('./CardFX.css');
		const pokerBoardCss = readCss('../../poker/styles/canvas.css');
		const appSource = readFileSync(resolve(here, '../../../App.tsx'), 'utf8');
		const frameSource = readFileSync(resolve(here, './CardFrame.tsx'), 'utf8');
		const animationLayer = readFileSync(resolve(here, '../AnimationLayer.tsx'), 'utf8');
		const cardsBarrel = readFileSync(resolve(here, '../../utils/cards/index.ts'), 'utf8');

		expect(pokerBoardCss).not.toMatch(/\.card-frame__/);
		expect(stateCss).not.toMatch(/\.card-frame[^{]*\{[^}]*(width|height)\s*:/);
		expect(fxCss).not.toMatch(/\.card-frame[^{]*\{[^}]*(width|height)\s*:/);
		expect(fxCss).not.toMatch(/\btransform\s*:/);
		expect(stateCss).not.toMatch(/--norse-card-(name|keyword|mana|atk|hp)-/);
		expect(stateCss).not.toContain('.bf-card-wrapper');
		expect(stateCss).not.toContain('.hand-fan-card');
		expect(stateCss).not.toContain('.damage-shake');
		expect(cardFrameCss).not.toMatch(/\.card-frame(?!__)[^{]*\{[^}]*\btransform\s*:/);
		expect(surfaceCss).toContain('@container');
		expect(surfaceCss).not.toMatch(/@media \(max-width:\s*640px\)/);
		expect(appSource).not.toContain('CardTransformBridgeInitializer');
		expect(appSource).not.toContain('CardTransformProvider');
		expect(cardsBarrel).not.toContain('CardTransformationManager');
		expect(cardsBarrel).not.toContain('CardTransformBridge');
		expect(animationLayer).toContain('battle-fx-layer');
		expect(motionCss).toContain('scale(var(--card-motion-scale))');
		expect(motionCss).toContain('scale(calc(1 + var(--card-action-scale)))');
		expect(frameSource).toContain('card-state-layer');
		expect(frameSource).toContain('card-fx-layer');
		expect(frameSource).toContain('card-fx-layer__flash');
		expect(frameSource).toContain('card-fx-layer__shine');
		expect(frameSource).toContain('card-fx-layer__local-glow');
	});
});
