import {
	isQaFullCatalogEntitlementEnabled,
	type RagnarokRuntimeConfig,
} from '@shared/runtimeConfig';
import type { QaFullCatalogCard } from '@shared/protocol-core/playerCollection';
import { cardRegistry } from '../data/cardRegistry';
import { getMaxCopies, isCardDeckCollectible } from '../deck/heroDeckRules';
import { RAGNAROK_NETWORK_CONFIG } from '../config/networkConfig';

export const QA_FULL_CATALOG_SOURCE = 'qa_full_catalog' as const;
export const QA_FULL_CATALOG_LABEL = 'QA Access';

function isQaCatalogCard(card: (typeof cardRegistry)[number]): boolean {
	return card.category === 'genesis' && isCardDeckCollectible(card);
}

export function getQaFullCatalogCardsForRuntime(
	config: RagnarokRuntimeConfig = RAGNAROK_NETWORK_CONFIG,
): readonly QaFullCatalogCard[] {
	if (!isQaFullCatalogEntitlementEnabled(config)) return [];

	return cardRegistry
		.filter(isQaCatalogCard)
		.map(card => ({
			cardId: Number(card.id),
			ownedCopies: getMaxCopies(card),
			resetEpoch: config.resetEpoch,
		}));
}

export function getQaFullCatalogOwnedCopies(
	cardId: number,
	config: RagnarokRuntimeConfig = RAGNAROK_NETWORK_CONFIG,
): number {
	if (!isQaFullCatalogEntitlementEnabled(config)) return 0;
	const card = cardRegistry.find(entry => Number(entry.id) === cardId);
	if (!card || !isQaCatalogCard(card)) return 0;
	return getMaxCopies(card);
}

export function isQaFullCatalogRuntime(
	config: RagnarokRuntimeConfig = RAGNAROK_NETWORK_CONFIG,
): boolean {
	return isQaFullCatalogEntitlementEnabled(config);
}
