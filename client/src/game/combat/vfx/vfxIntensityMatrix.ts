/**
 * vfxIntensityMatrix.ts
 *
 * 3x3 Dynamic Intensity Matrix (BoardDensity x PressureTier) + Organic Variation.
 *
 * Guarantees two core visual principles:
 * 1. Intensity scales proportionally with BOTH board occupancy (0 vs 1-2 vs 3+
 *    opposing cards) AND wager/combat pressure (light vs escalated vs overdrive).
 *    Empty boards ALWAYS receive restrained, subtle effects.
 * 2. Organic variation (alternating arc curvature, ribbon <-> magic tunnel
 *    alternation, staggered echo ripples across formations) keeps consecutive
 *    actions feeling dynamic and handcrafted rather than repetitive.
 */

import type { ArenaShakeIntensity } from './arenaShake';
import type { EmotionalImpulseKind } from './emotionalAtmosphere';

export type BoardDensity = 'empty' | 'skirmish' | 'formation';
export type PressureTier = 'light' | 'escalated' | 'overdrive';
export type DeliveryVisualMode = 'ribbon' | 'tunnel';

export interface IntensityProfile {
	readonly density: BoardDensity;
	readonly pressure: PressureTier;
	readonly delivery: DeliveryVisualMode;
	/** When true, consecutive actions alternate between ribbon and magic tunnel. */
	readonly alternateDelivery: boolean;
	readonly strands: 1 | 2 | 3;
	readonly tunnelRings: number;
	readonly travelMs: number;
	readonly lingerMs: number;
	readonly runeScale: number;
	/** 0 disables starburst completely (used on subtle empty-board hits). */
	readonly starburstScale: number;
	readonly shardCount: number;
	readonly burstCount: number;
	readonly vibration: 'none' | 'normal' | 'heavy';
	readonly cameraShake: ArenaShakeIntensity | 'none';
	readonly impulse: { readonly kind: EmotionalImpulseKind; readonly strength: number } | null;
	/** How many distinct opposing cards receive primary + staggered echo ripples (1..3). */
	readonly echoTargets: 1 | 2 | 3;
}

export interface ResolvedDynamicIntensity extends IntensityProfile {
	/** Resolved per-action curve bow direction (+1 or -1) for organic variety. */
	readonly arcSign: 1 | -1;
	/** Resolved per-action Bezier bend factor (0.12..0.24). */
	readonly arcFactor: number;
}

export const VFX_INTENSITY_MATRIX: Record<BoardDensity, Record<PressureTier, IntensityProfile>> = {
	empty: {
		light: {
			density: 'empty',
			pressure: 'light',
			delivery: 'ribbon',
			alternateDelivery: false,
			strands: 1,
			tunnelRings: 0,
			travelMs: 300,
			lingerMs: 240,
			runeScale: 0.95,
			starburstScale: 0,
			shardCount: 0,
			burstCount: 0,
			vibration: 'none',
			cameraShake: 'none',
			impulse: null,
			echoTargets: 1,
		},
		escalated: {
			density: 'empty',
			pressure: 'escalated',
			delivery: 'ribbon',
			alternateDelivery: false,
			strands: 2,
			tunnelRings: 0,
			travelMs: 320,
			lingerMs: 300,
			runeScale: 1.12,
			starburstScale: 0,
			shardCount: 4,
			burstCount: 6,
			vibration: 'none',
			cameraShake: 'none',
			impulse: null,
			echoTargets: 1,
		},
		overdrive: {
			density: 'empty',
			pressure: 'overdrive',
			delivery: 'ribbon',
			alternateDelivery: false,
			strands: 2,
			tunnelRings: 6,
			travelMs: 340,
			lingerMs: 360,
			runeScale: 1.28,
			starburstScale: 0.85,
			shardCount: 6,
			burstCount: 10,
			vibration: 'none',
			cameraShake: 'mild',
			impulse: { kind: 'climax', strength: 0.45 },
			echoTargets: 1,
		},
	},
	skirmish: {
		light: {
			density: 'skirmish',
			pressure: 'light',
			delivery: 'ribbon',
			alternateDelivery: false,
			strands: 2,
			tunnelRings: 0,
			travelMs: 310,
			lingerMs: 340,
			runeScale: 1.18,
			starburstScale: 0.85,
			shardCount: 6,
			burstCount: 9,
			vibration: 'normal',
			cameraShake: 'none',
			impulse: null,
			echoTargets: 1,
		},
		escalated: {
			density: 'skirmish',
			pressure: 'escalated',
			delivery: 'tunnel',
			alternateDelivery: true,
			strands: 3,
			tunnelRings: 7,
			travelMs: 340,
			lingerMs: 400,
			runeScale: 1.35,
			starburstScale: 1.05,
			shardCount: 9,
			burstCount: 12,
			vibration: 'normal',
			cameraShake: 'none',
			impulse: { kind: 'climax', strength: 0.4 },
			echoTargets: 1,
		},
		overdrive: {
			density: 'skirmish',
			pressure: 'overdrive',
			delivery: 'tunnel',
			alternateDelivery: false,
			strands: 3,
			tunnelRings: 9,
			travelMs: 370,
			lingerMs: 460,
			runeScale: 1.55,
			starburstScale: 1.35,
			shardCount: 13,
			burstCount: 16,
			vibration: 'heavy',
			cameraShake: 'mild',
			impulse: { kind: 'climax', strength: 0.72 },
			echoTargets: 1,
		},
	},
	formation: {
		light: {
			density: 'formation',
			pressure: 'light',
			delivery: 'ribbon',
			alternateDelivery: false,
			strands: 2,
			tunnelRings: 0,
			travelMs: 315,
			lingerMs: 360,
			runeScale: 1.24,
			starburstScale: 0.95,
			shardCount: 7,
			burstCount: 10,
			vibration: 'normal',
			cameraShake: 'none',
			impulse: null,
			echoTargets: 1,
		},
		escalated: {
			density: 'formation',
			pressure: 'escalated',
			delivery: 'tunnel',
			alternateDelivery: true,
			strands: 3,
			tunnelRings: 8,
			travelMs: 350,
			lingerMs: 420,
			runeScale: 1.42,
			starburstScale: 1.15,
			shardCount: 10,
			burstCount: 14,
			vibration: 'normal',
			cameraShake: 'mild',
			impulse: { kind: 'climax', strength: 0.5 },
			echoTargets: 2,
		},
		overdrive: {
			density: 'formation',
			pressure: 'overdrive',
			delivery: 'tunnel',
			alternateDelivery: false,
			strands: 3,
			tunnelRings: 10,
			travelMs: 385,
			lingerMs: 480,
			runeScale: 1.7,
			starburstScale: 1.45,
			shardCount: 14,
			burstCount: 18,
			vibration: 'heavy',
			cameraShake: 'heavy',
			impulse: { kind: 'shock', strength: 0.8 },
			echoTargets: 3,
		},
	},
};

export function classifyBoardDensity(cardCount: number): BoardDensity {
	if (cardCount <= 0) return 'empty';
	if (cardCount <= 2) return 'skirmish';
	return 'formation';
}

export function classifyPressureTier(input: {
	readonly amount?: number;
	readonly reraiseLevel?: number;
	readonly isAllIn?: boolean;
	readonly stakeStrength?: 'subtle' | 'firm';
}): PressureTier {
	const amount = input.amount ?? 0;
	const reraise = input.reraiseLevel ?? 0;
	if (input.isAllIn || amount >= 26 || reraise >= 2) {
		return 'overdrive';
	}
	if (input.stakeStrength === 'firm' || amount >= 12 || reraise === 1) {
		return 'escalated';
	}
	return 'light';
}

let dynamicBeatCounter = 0;

export function resetIntensityVariationCounter(): void {
	dynamicBeatCounter = 0;
}

/**
 * Resolves the exact IntensityProfile from the 3x3 matrix and layers organic
 * per-beat dynamism (alternating curve arc + ribbon/tunnel alternation).
 */
export function resolveDynamicVfxIntensity(input: {
	readonly opposingCardCount: number;
	readonly amount?: number;
	readonly reraiseLevel?: number;
	readonly isAllIn?: boolean;
	readonly stakeStrength?: 'subtle' | 'firm';
	readonly beatIndex?: number;
}): ResolvedDynamicIntensity {
	const density = classifyBoardDensity(input.opposingCardCount);
	const pressure = classifyPressureTier(input);
	const base = VFX_INTENSITY_MATRIX[density][pressure];

	const beat = input.beatIndex ?? dynamicBeatCounter++;
	const arcSign: 1 | -1 = beat % 2 === 0 ? 1 : -1;
	const arcFactors = [0.14, 0.21, 0.17, 0.24] as const;
	const arcFactor = arcFactors[beat % arcFactors.length];

	const delivery: DeliveryVisualMode = base.alternateDelivery && beat % 2 === 1
		? 'ribbon'
		: base.delivery;

	return {
		...base,
		delivery,
		arcSign,
		arcFactor,
	};
}
