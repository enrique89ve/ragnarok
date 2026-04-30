import type {
	CardXPReward,
	CardLevelBonus,
	CardUidMapping,
	HiveCardAsset
} from './types';
import type { CardCategory } from '@shared/schemas/cardCategory';
import {
	ECONOMIC_XP_CONFIG,
	getEconomicLevelForXP,
	getEconomicXPConfig,
	type EconomicXPKey,
} from '../../../../shared/protocol-core/cardProgression';

export const MAX_CARD_LEVEL = 3;

/**
 * XP progression key. Only economic NFT cards earn transferable card XP.
 * Starter cards are account-bound off-chain entitlements and are tracked by
 * starter reputation, not by CardXP.
 */
export type XPKey = EconomicXPKey;

/**
 * XP curves per economic progression key.
 */
export const XP_CONFIG = ECONOMIC_XP_CONFIG;

/**
 * Resolve the economic XP progression key for a card. Starter cards and tokens
 * are filtered upstream and never earn CardXP.
 */
export const xpKeyFor = (card: { rarity?: string; category?: CardCategory }): XPKey => {
	const r = (card.rarity ?? 'common').toLowerCase();
	return (r === 'rare' || r === 'epic' || r === 'mythic' || r === 'common')
		? r as EconomicXPKey
		: 'common';
};

const LEVEL_BONUSES: CardLevelBonus[] = [
	{ level: 1, attackBonus: 0, healthBonus: 0 },
	{ level: 2, attackBonus: 0, healthBonus: 0 },
	{ level: 3, attackBonus: 0, healthBonus: 0 },
];

export function getLevelForXP(rarity: string, xp: number): number {
	return getEconomicLevelForXP(rarity, xp);
}

export function getXPForLevel(rarity: string, level: number): number {
	const config = getEconomicXPConfig(rarity);
	const idx = Math.max(0, Math.min(level - 1, config.thresholds.length - 1));
	return config.thresholds[idx];
}

export function getXPToNextLevel(rarity: string, currentXP: number): number | null {
	const config = getEconomicXPConfig(rarity);
	const currentLevel = getLevelForXP(rarity, currentXP);
	if (currentLevel >= config.maxLevel) return null;
	const nextThreshold = config.thresholds[currentLevel];
	return nextThreshold - currentXP;
}

export function isMaxLevel(rarity: string, level: number): boolean {
	const config = getEconomicXPConfig(rarity);
	return level >= config.maxLevel;
}

export function calculateXPGain(rarity: string, isWin: boolean, isMvp: boolean): number {
	if (!isWin) return 0;
	const config = getEconomicXPConfig(rarity);
	let xp = config.xpPerWin;
	if (isMvp) xp += config.xpPerMvp;
	return xp;
}

export function getLevelBonuses(_rarity: string, level: number): CardLevelBonus {
	const idx = Math.max(0, Math.min(level - 1, LEVEL_BONUSES.length - 1));
	return LEVEL_BONUSES[idx];
}

export function calculateXPRewards(
	cardUids: CardUidMapping[],
	cardCollection: HiveCardAsset[] | null | undefined,
	cardRarities: Map<number, string>,
	mvpCardUid: string | null
): CardXPReward[] {
	const rewards: CardXPReward[] = [];

	for (const mapping of cardUids) {
		if (mapping.source !== 'nft') continue;

		const rarity = cardRarities.get(mapping.cardId) || 'common';
		const isMvp = mapping.uid === mvpCardUid;
		const xpGained = calculateXPGain(rarity, true, isMvp);

		if (xpGained === 0) continue;

		// Default xp=0 when card isn't in the collection yet (new card, first time earning XP)
		const asset = cardCollection?.find(c => c.uid === mapping.uid);
		const xpBefore = asset?.xp ?? 0;
		const xpAfter = xpBefore + xpGained;
		const levelBefore = getLevelForXP(rarity, xpBefore);
		const levelAfter = getLevelForXP(rarity, xpAfter);

		rewards.push({
			cardUid: mapping.uid,
			cardId: mapping.cardId,
			source: 'nft',
			xpBefore,
			xpGained,
			xpAfter,
			levelBefore,
			levelAfter,
			didLevelUp: levelAfter > levelBefore,
		});
	}

	return rewards;
}

export function getMasteryTier(xp: number, rarity: string): 0 | 2 | 3 {
	const level = getLevelForXP(rarity, xp);
	const config = getEconomicXPConfig(rarity);
	if (level <= 1) return 0;
	if (level >= config.maxLevel) return 3;
	return 2;
}
