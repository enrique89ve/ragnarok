import type { HiveCardAsset } from '@/data/schemas/HiveTypes';
import { buildDeckClaimsFromCardIds } from '@shared/protocol-core/deckVerification';
import {
	buildPlayerCollection,
	type NftCustodyCard,
	type PlayerCollectionEntry,
} from '@shared/protocol-core/playerCollection';
import type { INFTBridge } from '../nft/INFTBridge';
import { getNFTBridge } from '../nft';
import { getQaFullCatalogCardsForRuntime } from './qaFullCatalogEntitlement';

function toNftCustodyCard(card: HiveCardAsset): NftCustodyCard | null {
	if (card.ownershipSource !== 'nft') return null;
	return {
		nftUid: card.uid,
		cardId: card.cardId,
		owner: card.ownerId,
		xp: card.xp,
		level: card.level,
		acquisition: card.acquisition,
	};
}

export function buildClientPlayerCollection(
	bridge: INFTBridge = getNFTBridge(),
): readonly PlayerCollectionEntry[] {
	const nftCards = bridge
		.getCardCollection()
		.map(toNftCustodyCard)
		.filter((card): card is NftCustodyCard => card !== null);

	return buildPlayerCollection({
		nftCards,
		qaFullCatalogCards: getQaFullCatalogCardsForRuntime(),
	});
}

export function buildClientDeckClaimsFromCardIds(
	cardIds: readonly number[],
	bridge: INFTBridge = getNFTBridge(),
) {
	return buildDeckClaimsFromCardIds({
		cardIds,
		collection: buildClientPlayerCollection(bridge),
	});
}
