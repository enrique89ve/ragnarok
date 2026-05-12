/**
 * Random card art picker — selects N random card art paths filtered by rarity.
 * Used as ambient background imagery in pack tiles (vault + catalog).
 *
 * Stable per-call: uses Math.random at pick time. Caller wraps in useMemo to
 * keep the same selection across re-renders.
 */

import { cardRegistry } from '../../data/cardRegistry';
import { getCardArtPath } from './artMapping';

type Rarity = 'common' | 'rare' | 'epic' | 'mythic';

// Pre-build a per-rarity index of cards that actually have resolvable art.
// Done once at module load; cardRegistry is static so this is safe.
const CARDS_BY_RARITY: Record<Rarity, ReadonlyArray<string>> = (() => {
	const buckets: Record<Rarity, string[]> = { common: [], rare: [], epic: [], mythic: [] };
	for (const card of cardRegistry) {
		const r = (card.rarity ?? 'common').toLowerCase() as Rarity;
		if (!(r in buckets)) continue;
		const path = getCardArtPath(card.id);
		if (path) buckets[r].push(path);
	}
	return buckets;
})();

/**
 * Maps a pack key to the rarity pool we draw splash images from.
 * Standard → rare (the most varied tier visually), premium → epic, mythic → mythic.
 * Falls back to rare if a tier is empty.
 */
const PACK_KEY_TO_RARITY: Record<string, Rarity> = {
	standard: 'rare',
	premium: 'epic',
	mythic: 'mythic',
	starter: 'common',
};

export function rarityForPackKey(packKey: string): Rarity {
	return PACK_KEY_TO_RARITY[packKey] ?? 'rare';
}

/**
 * Returns up to `count` distinct random art paths from the given rarity pool.
 * If the pool is too small the function returns whatever is available (length
 * may be < count). Returns empty array if no art is available at all.
 */
export function pickRandomCardArt(rarity: Rarity, count: number): string[] {
	const pool = CARDS_BY_RARITY[rarity];
	if (!pool || pool.length === 0) {
		// Fall back to rare if the requested pool is empty — better something than nothing.
		const fallback = CARDS_BY_RARITY.rare;
		if (!fallback || fallback.length === 0) return [];
		return pickRandomFromArray(fallback, count);
	}
	return pickRandomFromArray(pool, count);
}

function pickRandomFromArray<T>(arr: ReadonlyArray<T>, count: number): T[] {
	const n = Math.min(count, arr.length);
	if (n <= 0) return [];
	if (n === arr.length) return [...arr];
	const seen = new Set<number>();
	const picked: T[] = [];
	while (picked.length < n) {
		const idx = Math.floor(Math.random() * arr.length);
		if (seen.has(idx)) continue;
		seen.add(idx);
		picked.push(arr[idx]);
	}
	return picked;
}
