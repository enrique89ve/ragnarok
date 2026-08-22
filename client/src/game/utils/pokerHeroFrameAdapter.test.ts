import { describe, expect, it } from 'vitest';
import { POKER_HERO_BOARD_COMPOSITION } from './pokerHeroComposition';
import {
	adaptPokerHeroComposition,
	createPokerHeroFrameRenderPlan,
	createPokerHeroPortraitProfile,
} from './pokerHeroFrameAdapter';

describe('poker hero frame adapter', () => {
	it('adapts the approved v1 composition into a canonical 3:4 frame kit', () => {
		const kit = adaptPokerHeroComposition(POKER_HERO_BOARD_COMPOSITION);

		expect(kit.schema).toBe('norse-poker-hero-frame/v2');
		expect(kit.stage).toEqual({ width: 1086, height: 1448 });
		expect(kit.stage.width / kit.stage.height).toBe(0.75);
		expect(kit.artWindow).toEqual({ x: 11.1, y: 7.1, width: 77.7, height: 85.8 });
		expect(kit.portraitDefaults).toEqual({ mode: 'cover', focalPoint: { x: 50, y: 43 }, zoom: 1.1 });
	});

	it.each([
		{ width: 700, height: 1050 },
		{ width: 788, height: 1050 },
		{ width: 700, height: 1122 },
	])('fills the alpha-visible frame bounds for a $width x $height portrait', (intrinsicSize) => {
		const kit = adaptPokerHeroComposition(POKER_HERO_BOARD_COMPOSITION);
		const portrait = createPokerHeroPortraitProfile('/art/example.webp', { intrinsicSize });
		const plan = createPokerHeroFrameRenderPlan(kit, portrait);

		expect(plan.stageAspectRatio).toBe('1086 / 1448');
		expect(Number.parseFloat(plan.surfaceStyle['--poker-hero-frame-layer-x'])).toBeCloseTo(-(79 / 927) * 100);
		expect(Number.parseFloat(plan.surfaceStyle['--poker-hero-frame-layer-y'])).toBeCloseTo(-(61 / 1327) * 100);
		expect(Number.parseFloat(plan.surfaceStyle['--poker-hero-frame-layer-width'])).toBeCloseTo((1086 / 927) * 100);
		expect(Number.parseFloat(plan.surfaceStyle['--poker-hero-frame-layer-height'])).toBeCloseTo((1448 / 1327) * 100);
		expect(Number.parseFloat(plan.surfaceStyle['--poker-hero-art-window-x'])).toBeCloseTo((((11.1 / 100) * 1086) - 79) / 927 * 100);
		expect(Number.parseFloat(plan.surfaceStyle['--poker-hero-art-window-width'])).toBeCloseTo(((77.7 / 100) * 1086) / 927 * 100);
		expect(plan.portraitStyle.objectFit).toBe('cover');
		expect(plan.portraitStyle.objectPosition).toBe('50% 43%');
		expect(plan.portraitStyle.transform).toBe('scale(1.1)');
	});

	it('uses the frame kit dimensions when normalizing corner offsets', () => {
		const scaleX = 900 / POKER_HERO_BOARD_COMPOSITION.baseFrame.width;
		const scaleY = 1200 / POKER_HERO_BOARD_COMPOSITION.baseFrame.height;
		const kit = adaptPokerHeroComposition({
			...POKER_HERO_BOARD_COMPOSITION,
			baseFrame: {
				...POKER_HERO_BOARD_COMPOSITION.baseFrame,
				width: 900,
				height: 1200,
				visibleBounds: {
					x: POKER_HERO_BOARD_COMPOSITION.baseFrame.visibleBounds.x * scaleX,
					y: POKER_HERO_BOARD_COMPOSITION.baseFrame.visibleBounds.y * scaleY,
					width: POKER_HERO_BOARD_COMPOSITION.baseFrame.visibleBounds.width * scaleX,
					height: POKER_HERO_BOARD_COMPOSITION.baseFrame.visibleBounds.height * scaleY,
				},
			},
		});
		const plan = createPokerHeroFrameRenderPlan(kit, createPokerHeroPortraitProfile('/art/example.webp'));

		expect(plan.surfaceStyle['--corner-left-x']).toBe(`${(48 / 900) * 100}%`);
		expect(plan.surfaceStyle['--corner-left-y']).toBe('4%');
	});

	it('rejects frame sources that would deform the canonical stage', () => {
		expect(() => adaptPokerHeroComposition({
			...POKER_HERO_BOARD_COMPOSITION,
			baseFrame: { ...POKER_HERO_BOARD_COMPOSITION.baseFrame, width: 1000, height: 1000 },
		})).toThrow(/3:4/);
	});

	it('rejects art windows that leave the canonical stage', () => {
		const kit = adaptPokerHeroComposition(POKER_HERO_BOARD_COMPOSITION);
		const invalidKit = { ...kit, artWindow: { ...kit.artWindow, width: 95 } };

		expect(() => createPokerHeroFrameRenderPlan(
			invalidKit,
			createPokerHeroPortraitProfile('/art/example.webp'),
		)).toThrow(/inside the canonical stage/);
	});

	it('rejects visible frame bounds that leave the canonical stage', () => {
		expect(() => adaptPokerHeroComposition({
			...POKER_HERO_BOARD_COMPOSITION,
			baseFrame: {
				...POKER_HERO_BOARD_COMPOSITION.baseFrame,
				visibleBounds: { x: 79, y: 61, width: 1086, height: 1327 },
			},
		})).toThrow(/visible bounds must remain inside/);
	});

	it('rejects portrait profiles that could produce unstable transforms', () => {
		expect(() => createPokerHeroPortraitProfile('/art/example.webp', {
			fit: { focalPoint: { x: 101 }, zoom: 0 },
		})).toThrow(/focal x/);
		expect(() => createPokerHeroPortraitProfile('/art/example.webp', {
			fit: { zoom: 0 },
		})).toThrow(/zoom/);
	});
});
