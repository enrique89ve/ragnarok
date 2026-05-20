import { describe, expect, it } from 'vitest';
import {
	classifyHiveCollectionSource,
	countCardsByCollectionSource,
	filterCollectionBySource,
} from './collectionAcquisition';
import type { CollectionSource } from './collectionAcquisition';

type TestCollectionCard = {
	readonly id: number;
	readonly quantity: number;
	readonly collectionSource: CollectionSource;
};

describe('collection acquisition filters', () => {
	it('classifies DUAT-acquired NFT cards separately from generic NFT custody', () => {
		const source = classifyHiveCollectionSource({
			ownershipSource: 'nft',
			acquisition: {
				source: 'duat_airdrop',
				account: 'alice',
				claimTrxId: 'duat-claim-trx',
				claimBlockNum: 100,
				packsEarned: 1,
				packUid: 'duat_duat-claim-trx:0',
				burnTrxId: 'duat-burn-trx',
				burnBlockNum: 140,
			},
		});

		expect(source).toBe('duat_airdrop');
	});

	it('keeps DUAT filter scoped away from QA full-catalog access and starter entitlement', () => {
		const cards: TestCollectionCard[] = [
			{ id: 140, quantity: 2, collectionSource: 'starter' },
			{ id: 20_001, quantity: 1, collectionSource: 'duat_airdrop' },
			{ id: 20_002, quantity: 1, collectionSource: 'nft' },
			{ id: 20_003, quantity: 2, collectionSource: 'qa_full_catalog' },
		];

		expect(filterCollectionBySource(cards, 'duat_airdrop')).toEqual([
			{ id: 20_001, quantity: 1, collectionSource: 'duat_airdrop' },
		]);
		expect(countCardsByCollectionSource(cards, 'duat_airdrop')).toEqual({
			uniqueCards: 1,
			totalCards: 1,
		});
	});

	it('keeps a QA-full-catalog-enabled account from inflating the DUAT view', () => {
		const cards: TestCollectionCard[] = [
			{ id: 20_001, quantity: 1, collectionSource: 'duat_airdrop' },
			{ id: 20_004, quantity: 2, collectionSource: 'qa_full_catalog' },
			{ id: 20_005, quantity: 2, collectionSource: 'qa_full_catalog' },
		];

		const duatCards = filterCollectionBySource(cards, 'duat_airdrop');
		const qaCards = filterCollectionBySource(cards, 'qa_full_catalog');

		expect(duatCards).toHaveLength(1);
		expect(qaCards).toHaveLength(2);
		expect(duatCards.every(card => card.collectionSource !== 'qa_full_catalog')).toBe(true);
	});
});
