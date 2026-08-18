import type {
	CardXPReward,
	CardUidMapping,
	HiveCardAsset
} from './types';
import type { CardCategory } from '@shared/schemas/cardCategory';
import {
	getEconomicLevelForXP,
	getEconomicXPConfig,
	projectInstanceXpGain,
	type EconomicXPKey,
	type XpAuthority,
} from '@shared/protocol-core/xpEconomy';

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

function xpAuthorityForSource(source: CardUidMapping['source']): XpAuthority {
	if (source === 'nft') return 'nft-custody';
	return 'starter-entitlement';
}

export function calculateXPRewards(
	cardUids: CardUidMapping[],
	cardCollection: HiveCardAsset[] | null | undefined,
	cardRarities: Map<number, string>,
	mvpCardUid: string | null,
): CardXPReward[] {
	const rewards: CardXPReward[] = [];

	for (const mapping of cardUids) {
		const rarity = cardRarities.get(mapping.cardId) || 'common';
		const asset = cardCollection?.find(c => c.uid === mapping.uid);
		const projection = projectInstanceXpGain({
			rarity,
			authority: xpAuthorityForSource(mapping.source),
			xpBefore: asset?.xp ?? 0,
			isMvp: mapping.uid === mvpCardUid,
		});
		if (projection.xpGained === 0) continue;

		rewards.push({
			cardUid: mapping.uid,
			cardId: mapping.cardId,
			xpBefore: projection.xpBefore,
			xpGained: projection.xpGained,
			xpAfter: projection.xpAfter,
			levelBefore: projection.levelBefore,
			levelAfter: projection.levelAfter,
			didLevelUp: projection.didLevelUp,
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
