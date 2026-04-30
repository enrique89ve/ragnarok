import { describe, expect, it } from 'vitest';
import type { HiveCardAsset } from '../../../data/schemas/HiveTypes';
import type { CardCategory } from '@shared/schemas/cardCategory';
import type { CardData } from '../../types';
import { enrichDeckWithNFTLevels, getEvolutionLevel } from './cardLevelScaling';

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

describe('getEvolutionLevel', () => {
	it('maps card level 1:1 to evolution tier within the [1, 3] cap', () => {
		expect(getEvolutionLevel(1)).toBe(1);
		expect(getEvolutionLevel(2)).toBe(2);
		expect(getEvolutionLevel(3)).toBe(3);
	});

	it('clamps out-of-range levels to the [1, 3] interval', () => {
		expect(getEvolutionLevel(0)).toBe(1);
		expect(getEvolutionLevel(-5)).toBe(1);
		expect(getEvolutionLevel(99)).toBe(3);
	});
});

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
