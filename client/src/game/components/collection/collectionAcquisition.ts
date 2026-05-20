import { isDuatAcquisitionProvenance } from '@shared/protocol-core/acquisitionProvenance';
import type { HiveCardAsset } from '../../../data/schemas/HiveTypes';

export type CollectionSource = 'starter' | 'duat_airdrop' | 'nft' | 'qa_full_catalog';
export type CollectionFilterSource = 'all' | CollectionSource;

export const DUAT_COLLECTION_LABEL = 'DUAT';

export function classifyHiveCollectionSource(
	card: Pick<HiveCardAsset, 'ownershipSource' | 'acquisition'>,
): Exclude<CollectionSource, 'qa_full_catalog'> {
	if (card.ownershipSource === 'starter') return 'starter';
	if (isDuatAcquisitionProvenance(card.acquisition)) return 'duat_airdrop';
	return 'nft';
}

export function collectionSourceLabel(source: CollectionSource, qaLabel: string): string {
	switch (source) {
		case 'starter':
			return 'Starter';
		case 'duat_airdrop':
			return DUAT_COLLECTION_LABEL;
		case 'nft':
			return 'NFT';
		case 'qa_full_catalog':
			return qaLabel;
	}
}

export function filterCollectionBySource<T extends { readonly collectionSource: CollectionSource }>(
	cards: readonly T[],
	source: CollectionFilterSource,
): T[] {
	if (source === 'all') return [...cards];
	return cards.filter(card => card.collectionSource === source);
}

export function countCardsByCollectionSource<T extends {
	readonly collectionSource: CollectionSource;
	readonly quantity: number;
}>(
	cards: readonly T[],
	source: CollectionSource,
): { uniqueCards: number; totalCards: number } {
	const matching = cards.filter(card => card.collectionSource === source);
	return {
		uniqueCards: matching.length,
		totalCards: matching.reduce((total, card) => total + card.quantity, 0),
	};
}
