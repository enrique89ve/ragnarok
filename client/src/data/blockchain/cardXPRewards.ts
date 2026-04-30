import type {
	CardXPReward,
	CardUidMapping,
	HiveCardAsset
} from './types';
import type { CardCategory } from '@shared/schemas/cardCategory';
import {
	getEconomicLevelForXP,
	getEconomicXPConfig,
	type EconomicXPKey,
} from '@shared/protocol-core/cardProgression';

/**
 * Starter cards and tokens are filtered upstream and never reach this resolver.
 * Unknown rarities collapse to `common` instead of throwing — the caller may
 * pass partial card data during deck construction.
 */
export const xpKeyFor = (card: { rarity?: string; category?: CardCategory }): EconomicXPKey => {
	const r = (card.rarity ?? 'common').toLowerCase();
	return (r === 'rare' || r === 'epic' || r === 'mythic' || r === 'common')
		? r as EconomicXPKey
		: 'common';
};

function calculateXPGain(rarity: string, isMvp: boolean): number {
	const config = getEconomicXPConfig(rarity);
	return isMvp ? config.xpPerWin + config.xpPerMvp : config.xpPerWin;
}

export function calculateXPRewards(
	cardUids: CardUidMapping[],
	cardCollection: HiveCardAsset[] | null | undefined,
	cardRarities: Map<number, string>,
	mvpCardUid: string | null,
): CardXPReward[] {
	const rewards: CardXPReward[] = [];

	for (const mapping of cardUids) {
		if (mapping.source !== 'nft') continue;

		const rarity = cardRarities.get(mapping.cardId) || 'common';
		const isMvp = mapping.uid === mvpCardUid;
		const xpGained = calculateXPGain(rarity, isMvp);
		if (xpGained === 0) continue;

		// Default xp=0 when card isn't in the collection yet (first XP gain after mint).
		const asset = cardCollection?.find(c => c.uid === mapping.uid);
		const xpBefore = asset?.xp ?? 0;
		const xpAfter = xpBefore + xpGained;
		const levelBefore = getEconomicLevelForXP(rarity, xpBefore);
		const levelAfter = getEconomicLevelForXP(rarity, xpAfter);

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
	const level = getEconomicLevelForXP(rarity, xp);
	const config = getEconomicXPConfig(rarity);
	if (level <= 1) return 0;
	if (level >= config.maxLevel) return 3;
	return 2;
}
