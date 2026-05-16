/**
 * packDerivation.ts — deterministic preview for sealed `pack_burn`.
 *
 * Mirrors the post-seal burn derivation in `shared/protocol-core/apply.ts`.
 * The UI can preview a burn only after the delayed entropy block is irreversible,
 * because the seed includes pack DNA, burn trxId, user salt, and entropy block id.
 *
 * Rarity comes from the card definition (`cardDataProvider.getCardById(id).rarity`),
 * not from a client-side rarity roll.
 */

import {
	filterCollectibleIdsForPack,
	lcgNext,
	sha256Hash,
} from '@shared/protocol-core';
import type { PackAsset } from '@shared/protocol-core/types';
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

export async function deriveSealedPackBurnCards(input: {
	pack: Pick<PackAsset, 'cardCount' | 'dna' | 'packType'>;
	trxId: string;
	salt: string;
	entropyBlockId: string;
}): Promise<DerivedPackCard[]> {
	const provider = getCardDataProvider();
	const mintableIds = filterCollectibleIdsForPack(provider.getAllCards(), input.pack.packType);
	if (mintableIds.length === 0) return [];

	const seed = await sha256Hash(`${input.pack.dna}|${input.trxId}|${input.salt}|${input.entropyBlockId}`);
	let rng = Math.max(parseInt(seed.slice(0, 8), 16) || 1, 1);
	const cards: DerivedPackCard[] = [];

	for (let i = 0; i < input.pack.cardCount; i++) {
		rng = lcgNext(rng);
		const cardId = mintableIds[rng % mintableIds.length];
		const def = provider.getCardById(cardId);
		cards.push({
			uid: `${input.trxId}:${i}`,
			cardId,
			name: def?.name ?? `Card #${cardId}`,
			rarity: def?.rarity ?? 'common',
			type: def?.type ?? 'minion',
			race: def?.race,
			foil: 'standard',
		});
		rng = lcgNext(rng);
	}

	return cards;
}
