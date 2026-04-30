import { describe, expect, it } from 'vitest';
import type { HiveCardAsset } from '../../../data/schemas/HiveTypes';
import type { CardCategory } from '@shared/schemas/cardCategory';
import type { CardData } from '../../types';
import { enrichDeckWithNFTLevels } from './cardLevelScaling';

function makeMinion(id: number, category: CardCategory): CardData {
	return {
		id,
		name: `Card ${id}`,
		type: 'minion',
		rarity: 'common',
		category,
		attack: 10,
		health: 10,
	};
}

function makeAsset(cardId: number, ownershipSource: 'starter' | 'nft'): HiveCardAsset {
	return {
		uid: `${ownershipSource}-${cardId}`,
		cardId,
		ownerId: ownershipSource === 'starter' ? 'starter-entitlement' : 'alice',
		ownershipSource,
		edition: 'alpha',
		foil: 'standard',
		rarity: 'common',
		level: 1,
		xp: 0,
		name: `Asset ${cardId}`,
		type: 'minion',
	};
}

describe('enrichDeckWithNFTLevels', () => {
	it('does not apply NFT level scaling to starter entitlements', () => {
		const [enriched] = enrichDeckWithNFTLevels(
			[makeMinion(140, 'starter')],
			[makeAsset(140, 'starter')],
		);

		expect(enriched).toEqual(makeMinion(140, 'starter'));
	});

	it('tags economic NFT assets for level scaling', () => {
		const [enriched] = enrichDeckWithNFTLevels(
			[makeMinion(20001, 'genesis')],
			[makeAsset(20001, 'nft')],
		);

		expect(enriched).toMatchObject({
			id: 20001,
			_evolutionLevel: 1,
		});
	});
});
