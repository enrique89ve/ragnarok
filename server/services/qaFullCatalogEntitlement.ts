import genesisCollection from '../../client/public/data/genesisCollection.json';
import {
	isQaFullCatalogEntitlementEnabled,
	type RagnarokRuntimeConfig,
} from '../../shared/runtimeConfig';
import type { QaFullCatalogCard } from '../../shared/protocol-core/playerCollection';

function getQaOwnedCopies(rarity: string): number {
	return rarity === 'mythic' ? 1 : 2;
}

export function getQaFullCatalogCardsForServerRuntime(
	config: RagnarokRuntimeConfig,
): readonly QaFullCatalogCard[] {
	if (!isQaFullCatalogEntitlementEnabled(config)) return [];
	return genesisCollection.cards.map(card => ({
		cardId: Number(card.id),
		ownedCopies: getQaOwnedCopies(card.rarity),
		resetEpoch: config.resetEpoch,
	}));
}
