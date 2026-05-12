/**
 * packDraw — Deterministic pack card-ID draw shared by protocol and clients.
 *
 * Source of truth for the LCG used by `applyLegacyPackOpen` (pre-seal) and
 * `applyPackReveal`'s `drawPackCards` (post-seal). Pure functions only — no
 * supply state, no rarity rolls. Rarity is determined by the card definition
 * (`CardDataProvider.getCardById(id).rarity`), so callers do not need to roll
 * anything: pick the ID, then read the card's canonical rarity.
 *
 * Clients that show an "optimistic preview" of a pack open must use these
 * helpers so the preview equals what the replay engine will mint.
 */

import { PACK_SIZES } from './packCatalog';

/**
 * Mintable card-id ranges per pack type. Canonical — mutating this changes
 * what the replay engine produces for every existing and future pack open.
 */
export const PACK_ID_RANGES: Record<string, readonly [number, number][]> = {
	starter: [[1000, 3999], [20000, 29999]],
	booster: [[1000, 3999], [20000, 31999]],
	standard: [[1000, 8999], [20000, 31999]],
	premium: [[1000, 8999], [20000, 40999], [50000, 50999]],
	mythic: [[20000, 29999], [30001, 31999], [95001, 96999]],
	class: [[4000, 8999], [35001, 40999]],
	mega: [[1000, 8999], [20000, 40999], [50000, 50999], [85001, 86999]],
	norse: [[20000, 29999], [30001, 31999]],
};

export function getPackIdRanges(packType: string): readonly [number, number][] {
	return PACK_ID_RANGES[packType] ?? PACK_ID_RANGES.standard;
}

/**
 * Park-Miller LCG step. 32-bit safe; `(seed * 16807) % (2^31 - 1)`.
 */
export function lcgNext(seed: number): number {
	return (seed * 16807) % 2147483647;
}

/**
 * Seed derivation for the legacy (pre-seal) `legacy_pack_open` flow.
 * Uses the first 8 hex chars of the Hive trxId, with a deterministic
 * fallback hash when the trxId is too short.
 */
export function deriveLegacyPackSeed(trxId: string): number {
	const hex = trxId.replace(/[^0-9a-f]/gi, '').slice(0, 8);
	if (hex.length >= 4) {
		return parseInt(hex, 16);
	}

	let hash = 0;
	for (let i = 0; i < trxId.length; i++) {
		hash = ((hash << 5) - hash + trxId.charCodeAt(i)) | 0;
	}

	const fallback = (Math.abs(hash) >>> 0).toString(16).slice(0, 8);
	return parseInt(fallback || 'a7f3', 16);
}

/**
 * Number of cards a `legacy_pack_open` op (or its optimistic preview)
 * produces for a given pack type + quantity.
 */
export function getLegacyPackCardCount(packType: string, quantity: number): number {
	return (PACK_SIZES[packType] ?? 5) * quantity;
}

/**
 * Pure LCG draw of card-ids for the pre-seal `legacy_pack_open` flow.
 * Mirrors `getLegacyPackCardIds` in `apply.ts` exactly — any change here
 * MUST change replay determinism for already-broadcast legacy packs.
 *
 * @param seed     Integer seed from `deriveLegacyPackSeed(trxId)`.
 * @param packType Pack key (e.g. `'starter' | 'standard' | …`).
 * @param quantity Number of packs being opened in the same op (1..10).
 * @param mintableIds Collectible card-ids inside `PACK_ID_RANGES[packType]`.
 *                    Empty array → returns `[]` (caller decides how to reject).
 */
export function pickLegacyPackCardIds(
	seed: number,
	packType: string,
	quantity: number,
	mintableIds: readonly number[],
): number[] {
	if (mintableIds.length === 0) return [];
	const cardCount = getLegacyPackCardCount(packType, quantity);
	let s = Math.max(seed, 1);
	return Array.from({ length: cardCount }, () => {
		s = lcgNext(s);
		return mintableIds[s % mintableIds.length];
	});
}

/**
 * Intersect a list of cards (with `id` and optional `collectible` flag) with
 * the given id ranges. Used by `CardDataProvider.getCollectibleIdsInRanges`
 * implementations that have a flat card list. The output preserves the order
 * of `cards` so the LCG draw stays deterministic.
 */
export function filterCollectibleIdsInRanges<T extends { id: number; collectible?: boolean }>(
	cards: readonly T[],
	ranges: readonly [number, number][],
): number[] {
	const ids: number[] = [];
	for (const card of cards) {
		if (card.collectible === false) continue;
		for (const [start, end] of ranges) {
			if (card.id >= start && card.id <= end) {
				ids.push(card.id);
				break;
			}
		}
	}
	return ids;
}

/**
 * Same as `filterCollectibleIdsInRanges` but looks up the pack type's canonical
 * ranges. Used by clients that derive an optimistic pack preview.
 */
export function filterCollectibleIdsForPack<T extends { id: number; collectible?: boolean }>(
	cards: readonly T[],
	packType: string,
): number[] {
	return filterCollectibleIdsInRanges(cards, getPackIdRanges(packType));
}
