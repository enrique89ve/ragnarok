/**
 * Card Lab — shared types.
 *
 * One place to declare the three frame directions and the inputs they
 * react to. Keep the union small: a frame is just (card content) +
 * (rarity) + (element) + (cardType) + (direction).
 */

import type { Rarity } from '@shared/schemas/rarity';
import type { NorseElement } from '../../../types/NorseTypes';
import type { SimpleCardType } from '../../SimpleCard';

export type FrameDirection = 'svg-only' | 'svg-css' | 'svg-pixi' | 'static-png';

export interface FrameCardInput {
	rarity: Rarity;
	element: NorseElement;
	cardType: SimpleCardType;
}

export const FRAME_DIRECTIONS: readonly FrameDirection[] = [
	'svg-only',
	'svg-css',
	'svg-pixi',
	'static-png',
] as const;

export const FRAME_DIRECTION_LABEL: Record<FrameDirection, string> = {
	'svg-only': 'SVG only',
	'svg-css': 'SVG + CSS',
	'svg-pixi': 'SVG + PixiJS',
	'static-png': 'Static PNG',
};

export const FRAME_DIRECTION_NOTE: Record<FrameDirection, string> = {
	'svg-only':
		'Static vector chrome. Sharpest, cheapest, fully accessible. Baseline.',
	'svg-css': 'SVG frame + CSS pseudo-element halo + rarity shimmer keyframe.',
	'svg-pixi':
		'SVG frame + local PixiJS v8 overlay. GPU foil for mythic/epic only.',
	'static-png':
		'League-style: pre-rendered PNG overlay (baked by exportCardFrames). DOM-rendered stats on top.',
};
