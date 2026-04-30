import { describe, expect, it } from 'vitest';
import { calculateXPRewards, getLevelForXP, getXPToNextLevel, MAX_CARD_LEVEL } from './cardXPSystem';
import { STARTER_ENTITLEMENT_OWNER_ID } from '../schemas/HiveTypes';
import type { HiveCardAsset } from '../schemas/HiveTypes';

describe('calculateXPRewards', () => {
	it('does not emit economic XP rewards for starter cards', () => {
		const starterAsset: HiveCardAsset = {
			uid: 'starter-140',
			cardId: 140,
			ownerId: STARTER_ENTITLEMENT_OWNER_ID,
			ownershipSource: 'starter',
			edition: 'alpha',
			foil: 'standard',
			rarity: 'common',
			level: 2,
			xp: 45,
			name: 'Starter Card',
			type: 'minion',
		};

		const rewards = calculateXPRewards(
			[{ uid: starterAsset.uid, cardId: starterAsset.cardId, source: 'starter' }],
			[starterAsset],
			new Map([[starterAsset.cardId, 'starter']]),
			null,
		);

		expect(rewards).toEqual([]);
	});

	it('emits economic XP rewards for NFT cards', () => {
		const nftAsset: HiveCardAsset = {
			uid: 'nft-1',
			cardId: 20001,
			ownerId: 'alice',
			ownershipSource: 'nft',
			edition: 'alpha',
			foil: 'standard',
			rarity: 'common',
			level: 1,
			xp: 0,
			name: 'Genesis Card',
			type: 'minion',
		};

		const rewards = calculateXPRewards(
			[{ uid: nftAsset.uid, cardId: nftAsset.cardId, source: 'nft' }],
			[nftAsset],
			new Map([[nftAsset.cardId, 'common']]),
			null,
		);

		expect(rewards).toEqual([
			{
				cardUid: nftAsset.uid,
				cardId: nftAsset.cardId,
				source: 'nft',
				xpBefore: 0,
				xpGained: 10,
				xpAfter: 10,
				levelBefore: 1,
				levelAfter: 1,
				didLevelUp: false,
			},
		]);
	});

	it('caps derived card level while allowing XP to remain an accumulated counter', () => {
		expect(getLevelForXP('common', 999_999)).toBe(MAX_CARD_LEVEL);
		expect(getXPToNextLevel('common', 999_999)).toBeNull();
	});
});
