import type {
	CardXPConfig,
	CardXPReward,
	CardLevelBonus,
	CardUidMapping,
	XPConfigMap,
	HiveCardAsset
} from './types';

export const MAX_CARD_LEVEL = 3;

export const XP_CONFIG: XPConfigMap = {
	basic:     { rarity: 'basic',     xpPerWin: 5,  xpPerMvp: 0,  maxLevel: MAX_CARD_LEVEL, thresholds: [0, 20, 50] },
	common:    { rarity: 'common',    xpPerWin: 10, xpPerMvp: 3,  maxLevel: MAX_CARD_LEVEL, thresholds: [0, 50, 150] },
	rare:      { rarity: 'rare',      xpPerWin: 15, xpPerMvp: 5,  maxLevel: MAX_CARD_LEVEL, thresholds: [0, 100, 300] },
	epic:      { rarity: 'epic',      xpPerWin: 20, xpPerMvp: 8,  maxLevel: MAX_CARD_LEVEL, thresholds: [0, 160, 480] },
	mythic:    { rarity: 'mythic',    xpPerWin: 25, xpPerMvp: 10, maxLevel: MAX_CARD_LEVEL, thresholds: [0, 200, 500] },
};

const LEVEL_BONUSES: CardLevelBonus[] = [
	{ level: 1, attackBonus: 0, healthBonus: 0 },
	{ level: 2, attackBonus: 0, healthBonus: 0 },
	{ level: 3, attackBonus: 0, healthBonus: 0 },
];

function getConfig(rarity: string): CardXPConfig {
	return XP_CONFIG[rarity.toLowerCase()] || XP_CONFIG.common;
}

export function getLevelForXP(rarity: string, xp: number): number {
	const config = getConfig(rarity);
	let level = 1;
	for (let i = config.thresholds.length - 1; i >= 0; i--) {
		if (xp >= config.thresholds[i]) {
			level = i + 1;
			break;
		}
	}
	return Math.min(level, config.maxLevel);
}

export function getXPForLevel(rarity: string, level: number): number {
	const config = getConfig(rarity);
	const idx = Math.max(0, Math.min(level - 1, config.thresholds.length - 1));
	return config.thresholds[idx];
}

export function getXPToNextLevel(rarity: string, currentXP: number): number | null {
	const config = getConfig(rarity);
	const currentLevel = getLevelForXP(rarity, currentXP);
	if (currentLevel >= config.maxLevel) return null;
	const nextThreshold = config.thresholds[currentLevel];
	return nextThreshold - currentXP;
}

export function isMaxLevel(rarity: string, level: number): boolean {
	const config = getConfig(rarity);
	return level >= config.maxLevel;
}

export function calculateXPGain(rarity: string, isWin: boolean, isMvp: boolean): number {
	if (!isWin) return 0;
	const config = getConfig(rarity);
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
	const config = getConfig(rarity);
	if (level <= 1) return 0;
	if (level >= config.maxLevel) return 3;
	return 2;
}
