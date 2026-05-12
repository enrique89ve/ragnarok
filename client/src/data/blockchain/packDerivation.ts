/**
 * packDerivation.ts — Optimistic preview of `legacy_pack_open` (pre-seal).
 *
 * Pure function that mirrors `applyLegacyPackOpen` in `shared/protocol-core/apply.ts`
 * exactly. Given the Hive trxId returned by Keychain right after broadcast, derives
 * the same cards the replay engine will mint — so the UI can show them immediately
 * without waiting for the chain to confirm.
 *
 * Rarity comes from the card definition (`cardDataProvider.getCardById(id).rarity`),
 * NOT from a client-side roll. The previous fake roll (mythic<1, epic<6, rare<20)
 * was inconsistent with the canon and produced previews that did not match the
 * chain-replayed state.
 *
 * Post-seal pack opens go through `pack_commit` + `pack_reveal` and CANNOT be
 * previewed instantly — the seed depends on the entropy block id which is only
 * known once the block is irreversible. Callers must not use this helper after
 * genesis seal.
 */

import {
	deriveLegacyPackSeed,
	filterCollectibleIdsForPack,
	pickLegacyPackCardIds,
} from '@shared/protocol-core';
import { getCardDataProvider } from './ICardDataProvider';

export interface DerivedPackCard {
	uid: string;
	cardId: number;
	name: string;
	rarity: string;
	type: string;
	race?: string;
	foil: 'standard' | 'gold';
}

export function derivePackCards(
	trxId: string,
	packType: string,
	quantity: number = 1,
): DerivedPackCard[] {
	const provider = getCardDataProvider();
	const mintableIds = filterCollectibleIdsForPack(provider.getAllCards(), packType);
	if (mintableIds.length === 0) return [];

	const seed = deriveLegacyPackSeed(trxId);
	const clampedQuantity = Math.min(quantity, 10);
	const cardIds = pickLegacyPackCardIds(seed, packType, clampedQuantity, mintableIds);

	return cardIds.map((cardId, i) => {
		const def = provider.getCardById(cardId);
		return {
			uid: `${trxId}-${i}`,
			cardId,
			name: def?.name ?? `Card #${cardId}`,
			rarity: def?.rarity ?? 'common',
			type: def?.type ?? 'minion',
			race: def?.race,
			foil: 'standard',
		};
	});
}
