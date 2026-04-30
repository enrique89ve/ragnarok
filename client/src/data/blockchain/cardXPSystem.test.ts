import { describe, expect, it } from 'vitest';
import { calculateXPRewards } from './cardXPSystem';
import { STARTER_ENTITLEMENT_OWNER_ID } from '../schemas/HiveTypes';
import type { HiveCardAsset } from '../schemas/HiveTypes';

describe('calculateXPRewards', () => {
	it('uses the starter XP curve and preserves off-chain ownership source', () => {
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

		expect(rewards).toEqual([
			{
				cardUid: starterAsset.uid,
				cardId: starterAsset.cardId,
				source: 'starter',
				xpBefore: 45,
				xpGained: 5,
				xpAfter: 50,
				levelBefore: 2,
				levelAfter: 3,
				didLevelUp: true,
			},
		]);
	});
});
