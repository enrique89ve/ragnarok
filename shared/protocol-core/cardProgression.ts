import type { Rarity } from '../schemas/rarity';
import { MAX_CARD_LEVEL } from './types';

export type EconomicXPKey = Rarity;

export interface EconomicXPConfig {
	rarity: EconomicXPKey;
	xpPerWin: number;
	xpPerMvp: number;
	maxLevel: number;
	thresholds: readonly number[];
}

export const ECONOMIC_XP_CONFIG: Record<EconomicXPKey, EconomicXPConfig> = {
	common: { rarity: 'common', xpPerWin: 10, xpPerMvp: 3, maxLevel: MAX_CARD_LEVEL, thresholds: [0, 50, 150] },
	rare: { rarity: 'rare', xpPerWin: 15, xpPerMvp: 5, maxLevel: MAX_CARD_LEVEL, thresholds: [0, 100, 300] },
	epic: { rarity: 'epic', xpPerWin: 20, xpPerMvp: 8, maxLevel: MAX_CARD_LEVEL, thresholds: [0, 160, 480] },
	mythic: { rarity: 'mythic', xpPerWin: 25, xpPerMvp: 10, maxLevel: MAX_CARD_LEVEL, thresholds: [0, 200, 500] },
};

export function getEconomicXPConfig(rarity: string): EconomicXPConfig {
	const normalizedRarity = rarity.toLowerCase();
	return normalizedRarity === 'rare' ||
		normalizedRarity === 'epic' ||
		normalizedRarity === 'mythic' ||
		normalizedRarity === 'common'
		? ECONOMIC_XP_CONFIG[normalizedRarity]
		: ECONOMIC_XP_CONFIG.common;
}

export function getEconomicLevelForXP(rarity: string, xp: number): number {
	const config = getEconomicXPConfig(rarity);
	let level = 1;
	for (let i = config.thresholds.length - 1; i >= 0; i--) {
		if (xp >= config.thresholds[i]) {
			level = i + 1;
			break;
		}
	}
	return Math.min(level, config.maxLevel);
}

export function getEconomicXPPerWin(rarity: string): number {
	return getEconomicXPConfig(rarity).xpPerWin;
}

export function getXPToNextLevel(rarity: string, currentXP: number): number | null {
	const config = getEconomicXPConfig(rarity);
	const currentLevel = getEconomicLevelForXP(rarity, currentXP);
	if (currentLevel >= config.maxLevel) return null;
	const nextThreshold = config.thresholds[currentLevel];
	return nextThreshold - currentXP;
}
