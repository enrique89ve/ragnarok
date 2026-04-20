/**
 * packDerivation.ts — Deterministic pack card derivation
 *
 * Pure function that mirrors replayRules.applyPackOpen() exactly.
 * Given a trxId (returned by Keychain after broadcast), derives the same
 * cards the replay engine will produce — so we can show them immediately
 * without waiting for chain replay.
 */

import { getCardDataProvider } from './ICardDataProvider';

const PACK_SIZES: Record<string, number> = {
	starter: 5,
	booster: 5,
	standard: 5,
	premium: 7,
	mythic: 7,
	mega: 15,
};

function lcgNext(seed: number): number {
	return (seed * 16807) % 2147483647;
}

const CARD_RANGES: Record<string, [number, number]> = {
	starter:  [1000, 1999],
	booster:  [1000, 3999],
	standard: [1000, 3999],
	premium:  [1000, 8999],
	mythic:   [20000, 29999],
	class:    [4000, 8999],
	mega:     [1000, 8999],
	norse:    [20000, 29999],
};

function mintedCardId(packType: string, lcgValue: number): number {
	const [start, end] = CARD_RANGES[packType] ?? CARD_RANGES.standard;
	return start + (lcgValue % (end - start + 1));
}

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
	const cardCount = (PACK_SIZES[packType] ?? 5) * Math.min(quantity, 10);

	let seedHex = trxId.replace(/[^0-9a-f]/gi, '').slice(0, 8);
	if (seedHex.length < 4) {
		let hash = 0;
		for (let i = 0; i < trxId.length; i++) {
			hash = ((hash << 5) - hash + trxId.charCodeAt(i)) | 0;
		}
		seedHex = (Math.abs(hash) >>> 0).toString(16).slice(0, 8);
	}
	const seed = parseInt(seedHex || 'a7f3', 16);

	let s = Math.max(seed, 1);
	const cardIds: number[] = Array.from({ length: cardCount }, () => {
		s = lcgNext(s);
		return mintedCardId(packType, s);
	});

	const isGold = (lcgNext(seed) % 20) === 0;

	const cards: DerivedPackCard[] = [];
	for (let i = 0; i < cardIds.length; i++) {
		s = lcgNext(s);
		const rarityRoll = s % 100;
		const rarity = rarityRoll < 1 ? 'mythic' : rarityRoll < 6 ? 'epic' : rarityRoll < 20 ? 'rare' : 'common';

		const cardDef = getCardDataProvider().getCardById(cardIds[i]);
		cards.push({
			uid: `${trxId}-${i}`,
			cardId: cardIds[i],
			name: cardDef?.name ?? `Card #${cardIds[i]}`,
			rarity,
			type: cardDef?.type ?? 'minion',
			race: cardDef?.race || undefined,
			foil: isGold ? 'gold' : 'standard',
		});
	}

	return cards;
}
