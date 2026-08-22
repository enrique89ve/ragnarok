import { describe, expect, it } from 'vitest';
import {
	baseFramePixelsToStagePercent,
	createCenteredStageVariables,
	createResponsiveCornerVariables,
	POKER_HERO_BOARD_COMPOSITION,
	POKER_HERO_FRAME_SIZE,
} from './pokerHeroComposition';

describe('poker hero composition geometry', () => {
	it('normalizes base-frame offsets to the responsive stage', () => {
		expect(baseFramePixelsToStagePercent(POKER_HERO_FRAME_SIZE.width, 'x')).toBe(100);
		expect(baseFramePixelsToStagePercent(POKER_HERO_FRAME_SIZE.height, 'y')).toBe(100);
		expect(baseFramePixelsToStagePercent(48, 'x')).toBeCloseTo(4.42, 2);
		expect(baseFramePixelsToStagePercent(48, 'y')).toBeCloseTo(3.315, 2);
	});

	it('keeps corner scale and edge insets in one responsive coordinate system', () => {
		expect(createResponsiveCornerVariables(
			{ scale: 14, x: 48, y: 48 },
			{ scale: 14, x: 48, y: 48 },
		)).toEqual({
			'--corner-left-scale': '0.14',
			'--corner-left-x': '4.41988950276243%',
			'--corner-left-y': '3.314917127071823%',
			'--corner-right-scale': '0.14',
			'--corner-right-x': '4.41988950276243%',
			'--corner-right-y': '3.314917127071823%',
		});
	});

	it('anchors centered ornaments to the same stage percentages', () => {
		expect(createCenteredStageVariables({ x: 91, y: 70, scale: 13, rotation: -180 })).toEqual({
			'--ornament-x': '91%',
			'--ornament-y': '70%',
			'--ornament-size': '13%',
			'--ornament-rotation': '-180deg',
		});
	});

	it('pins the approved board composition to the exported preset', () => {
		expect(POKER_HERO_BOARD_COMPOSITION.corners.left.transform).toEqual({ scale: 14, x: 48, y: 48 });
		expect(POKER_HERO_BOARD_COMPOSITION.corners.right.transform).toEqual({ scale: 14, x: 48, y: 48 });
		expect(POKER_HERO_BOARD_COMPOSITION.identity.player.layers.find((layer) => layer.id === 'side')?.transform).toEqual({
			enabled: true,
			x: 91,
			y: 25,
			scale: 8,
			rotation: 0,
		});
		expect(POKER_HERO_BOARD_COMPOSITION.identity.opponent.layers.find((layer) => layer.id === 'relic')?.transform).toEqual({
			enabled: true,
			x: 91,
			y: 70,
			scale: 13,
			rotation: -180,
		});
	});
});
