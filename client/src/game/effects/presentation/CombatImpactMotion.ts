import type { ImpactLevel } from './types';

export type CombatImpactMass = ImpactLevel | 'lethal';

export type CombatImpactMotionProfile = {
	readonly mass: CombatImpactMass;
	readonly lungePx: number;
	readonly recoilPx: number;
	readonly rotationDeg: number;
	readonly hitStopMs: number;
	readonly recoveryMs: number;
	readonly travelMs: number;
	readonly flashMs: number;
};

export type CombatImpactPoint = {
	readonly x: number;
	readonly y: number;
};

export type CombatAttackDirection = {
	readonly x: number;
	readonly y: number;
};

const MOTION_PROFILES: Record<CombatImpactMass, CombatImpactMotionProfile> = {
	light: {
		mass: 'light',
		lungePx: 20,
		recoilPx: 4,
		rotationDeg: 0.4,
		hitStopMs: 22,
		recoveryMs: 115,
		travelMs: 280,
		flashMs: 135,
	},
	normal: {
		mass: 'normal',
		lungePx: 29,
		recoilPx: 7,
		rotationDeg: 0.8,
		hitStopMs: 38,
		recoveryMs: 160,
		travelMs: 300,
		flashMs: 170,
	},
	heavy: {
		mass: 'heavy',
		lungePx: 38,
		recoilPx: 10,
		rotationDeg: 1.4,
		hitStopMs: 58,
		recoveryMs: 205,
		travelMs: 315,
		flashMs: 210,
	},
	lethal: {
		mass: 'lethal',
		lungePx: 42,
		recoilPx: 12,
		rotationDeg: 1.7,
		hitStopMs: 78,
		recoveryMs: 250,
		travelMs: 320,
		flashMs: 230,
	},
};

export function combatImpactMotionProfile(
	level: ImpactLevel,
	lethal: boolean | null = false,
): CombatImpactMotionProfile {
	return MOTION_PROFILES[lethal === true ? 'lethal' : level];
}

export function attackDirectionBetween(
	source: CombatImpactPoint | null,
	target: CombatImpactPoint,
	fallbackY: 1 | -1 = 1,
): CombatAttackDirection {
	if (!source) return { x: 0, y: fallbackY };

	const deltaX = target.x - source.x;
	const deltaY = target.y - source.y;
	const length = Math.hypot(deltaX, deltaY);
	if (length <= Number.EPSILON) return { x: 0, y: fallbackY };

	return { x: deltaX / length, y: deltaY / length };
}

export function motionVector(
	direction: CombatAttackDirection,
	distance: number,
): CombatImpactPoint {
	return {
		x: direction.x * distance,
		y: direction.y * distance,
	};
}

