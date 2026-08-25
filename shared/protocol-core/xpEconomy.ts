/**
 * XP Economy Protocol — static rates and pure projections.
 *
 * Replay (`applyWinnerCardXp`) and local preview share this module.
 * Hive persist is a later adapter: it consumes `InstanceXpProjection`
 * and writes `match_result` / `level_up`. This file does not broadcast.
 */

import type { Rarity } from '../schemas/rarity';
import { tryAdaptRarity } from '../schemas/rarity';
import { MAX_CARD_LEVEL } from './types';

export type EconomicXPKey = Rarity;

export type XpAuthority = 'starter-entitlement' | 'nft-custody' | 'qa_full_catalog' | 'local-testnet';

export type MatchXpResult = 'victory' | 'defeat' | 'draw';

export interface EconomicXPConfig {
	rarity: EconomicXPKey;
	xpPerWin: number;
	xpPerMvp: number;
	maxLevel: number;
	thresholds: readonly number[];
}

export type InstanceXpProjection = {
	readonly xpBefore: number;
	readonly xpGained: number;
	readonly xpAfter: number;
	readonly levelBefore: number;
	readonly levelAfter: number;
	readonly didLevelUp: boolean;
};

export const MATCH_XP_BASE = 25;

/**
 * Ranked wins needed for each CardXP step. Level 3 costs
 * `level3StepMultiplier` times the 1→2 step so Divine is the long grind.
 */
export const CARD_LEVEL_CURVE = {
	winsToLevel2: 5,
	level3StepMultiplier: 4,
} as const;

export function instanceLevelThresholds(xpPerWin: number): readonly [number, number, number] {
	const toLevel2 = xpPerWin * CARD_LEVEL_CURVE.winsToLevel2;
	const toLevel3 = toLevel2 + toLevel2 * CARD_LEVEL_CURVE.level3StepMultiplier;
	return [0, toLevel2, toLevel3];
}

export const ECONOMIC_XP_CONFIG: Record<EconomicXPKey, EconomicXPConfig> = {
	common: {
		rarity: 'common',
		xpPerWin: 10,
		xpPerMvp: 3,
		maxLevel: MAX_CARD_LEVEL,
		thresholds: instanceLevelThresholds(10),
	},
	rare: {
		rarity: 'rare',
		xpPerWin: 15,
		xpPerMvp: 5,
		maxLevel: MAX_CARD_LEVEL,
		thresholds: instanceLevelThresholds(15),
	},
	epic: {
		rarity: 'epic',
		xpPerWin: 20,
		xpPerMvp: 8,
		maxLevel: MAX_CARD_LEVEL,
		thresholds: instanceLevelThresholds(20),
	},
	mythic: {
		rarity: 'mythic',
		xpPerWin: 25,
		xpPerMvp: 10,
		maxLevel: MAX_CARD_LEVEL,
		thresholds: instanceLevelThresholds(25),
	},
};

export function isInstanceXpEligible(authority: XpAuthority): boolean {
	return authority === 'nft-custody' || authority === 'local-testnet';
}

export function getEconomicXPConfig(rarity: string): EconomicXPConfig {
	const canonicalRarity = tryAdaptRarity(rarity);
	return ECONOMIC_XP_CONFIG[canonicalRarity ?? 'common'];
}

export function getEconomicXPPerWin(rarity: string): number {
	return getEconomicXPConfig(rarity).xpPerWin;
}

export function getEconomicXPPerMvp(rarity: string): number {
	return getEconomicXPConfig(rarity).xpPerMvp;
}

export function getEconomicLevelForXP(rarity: string, xp: number): number {
	const config = getEconomicXPConfig(rarity);
	const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
	let level = 1;
	for (let i = config.thresholds.length - 1; i >= 0; i--) {
		if (safeXp >= config.thresholds[i]) {
			level = i + 1;
			break;
		}
	}
	return Math.min(level, config.maxLevel);
}

export function getXPToNextLevel(rarity: string, currentXP: number): number | null {
	const config = getEconomicXPConfig(rarity);
	const currentLevel = getEconomicLevelForXP(rarity, currentXP);
	if (currentLevel >= config.maxLevel) return null;
	const nextThreshold = config.thresholds[currentLevel];
	return nextThreshold - currentXP;
}

export function calculateInstanceXpGain(input: {
	readonly rarity: string;
	readonly authority: XpAuthority;
	readonly isMvp?: boolean;
}): number {
	if (!isInstanceXpEligible(input.authority)) return 0;
	const config = getEconomicXPConfig(input.rarity);
	const winXp = config.xpPerWin;
	if (winXp <= 0) return 0;
	return input.isMvp === true ? winXp + config.xpPerMvp : winXp;
}

export function projectInstanceXp(input: {
	readonly rarity: string;
	readonly xpBefore: number;
	readonly xpGained: number;
}): InstanceXpProjection {
	const xpBefore = Number.isFinite(input.xpBefore) ? Math.max(0, input.xpBefore) : 0;
	const xpGained = Number.isFinite(input.xpGained) ? Math.max(0, input.xpGained) : 0;
	const xpAfter = xpBefore + xpGained;
	const levelBefore = getEconomicLevelForXP(input.rarity, xpBefore);
	const levelAfter = getEconomicLevelForXP(input.rarity, xpAfter);
	return {
		xpBefore,
		xpGained,
		xpAfter,
		levelBefore,
		levelAfter,
		didLevelUp: levelAfter > levelBefore,
	};
}

export function projectInstanceXpGain(input: {
	readonly rarity: string;
	readonly authority: XpAuthority;
	readonly xpBefore: number;
	readonly isMvp?: boolean;
}): InstanceXpProjection {
	return projectInstanceXp({
		rarity: input.rarity,
		xpBefore: input.xpBefore,
		xpGained: calculateInstanceXpGain(input),
	});
}

export function normalizeWinnerInstanceUids(raw: readonly string[]): string[] {
	const unique = new Set<string>();
	for (const value of raw) {
		const uid = value.trim();
		if (uid.length > 0) unique.add(uid);
	}
	return [...unique].sort();
}

export function parseWinnerInstanceUids(raw: unknown): string[] {
	if (Array.isArray(raw)) {
		return normalizeWinnerInstanceUids(raw.filter((value): value is string => typeof value === 'string'));
	}
	if (typeof raw === 'string') {
		return normalizeWinnerInstanceUids(raw.split(','));
	}
	return [];
}

export function calculateMatchXp(input: {
	readonly result: MatchXpResult;
	readonly multiplier: number;
}): number {
	if (input.result !== 'victory') return 0;
	if (!Number.isFinite(input.multiplier) || input.multiplier <= 0) return 0;
	return Math.max(0, Math.round(MATCH_XP_BASE * input.multiplier));
}
