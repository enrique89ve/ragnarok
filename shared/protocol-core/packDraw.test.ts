import { describe, expect, it } from 'vitest';
import {
	PACK_ID_RANGES,
	deriveLegacyPackSeed,
	filterCollectibleIdsForPack,
	filterCollectibleIdsInRanges,
	getLegacyPackCardCount,
	getPackIdRanges,
	lcgNext,
	pickLegacyPackCardIds,
} from './packDraw';

const collectibleCards = [
	{ id: 1000, collectible: true },
	{ id: 1500, collectible: true },
	{ id: 2500 },
	{ id: 3999, collectible: false },
	{ id: 25000, collectible: true },
	{ id: 99999, collectible: true },
];

describe('packDraw — id ranges', () => {
	it('exposes every canonical pack type', () => {
		for (const pack of ['starter', 'booster', 'standard', 'premium', 'mythic', 'mega']) {
			expect(PACK_ID_RANGES[pack]).toBeDefined();
		}
	});

	it('falls back to standard for unknown pack types', () => {
		expect(getPackIdRanges('does-not-exist')).toBe(PACK_ID_RANGES.standard);
	});
});

describe('packDraw — lcgNext + seed derivation', () => {
	it('park-miller step matches the canonical formula', () => {
		expect(lcgNext(1)).toBe(16807);
		expect(lcgNext(16807)).toBe((16807 * 16807) % 2147483647);
	});

	it('derives the same seed from short and long hex trxIds', () => {
		expect(deriveLegacyPackSeed('deadbeef-cafe-1234')).toBe(parseInt('deadbeef', 16));
		expect(deriveLegacyPackSeed('abcd')).toBe(parseInt('abcd', 16));
	});

	it('falls back to a deterministic hash for non-hex trxIds', () => {
		const a = deriveLegacyPackSeed('zzz');
		const b = deriveLegacyPackSeed('zzz');
		expect(a).toBe(b);
		expect(a).toBeGreaterThan(0);
	});
});

describe('packDraw — filter helpers', () => {
	it('drops cards explicitly marked collectible:false but keeps undefined as collectible', () => {
		const ids = filterCollectibleIdsInRanges(collectibleCards, [[1000, 3999]]);
		expect(ids).toEqual([1000, 1500, 2500]);
	});

	it('preserves input order across multiple ranges', () => {
		const ids = filterCollectibleIdsInRanges(collectibleCards, [[20000, 29999], [1000, 1999]]);
		expect(ids).toEqual([1000, 1500, 25000]);
	});

	it('looks up canonical ranges per pack type', () => {
		const ids = filterCollectibleIdsForPack(collectibleCards, 'starter');
		expect(ids).toEqual([1000, 1500, 2500, 25000]);
	});
});

describe('packDraw — pickLegacyPackCardIds', () => {
	it('produces a deterministic sequence for a known seed', () => {
		const ids = pickLegacyPackCardIds(deriveLegacyPackSeed('deadbeef'), 'standard', 1, [10, 20, 30]);
		expect(ids).toHaveLength(getLegacyPackCardCount('standard', 1));
		expect(pickLegacyPackCardIds(deriveLegacyPackSeed('deadbeef'), 'standard', 1, [10, 20, 30]))
			.toEqual(ids);
	});

	it('returns an empty array when the mintable pool is empty', () => {
		expect(pickLegacyPackCardIds(1, 'standard', 1, [])).toEqual([]);
	});

	it('respects quantity by scaling card count', () => {
		const single = pickLegacyPackCardIds(1, 'standard', 1, [10, 20, 30]);
		const triple = pickLegacyPackCardIds(1, 'standard', 3, [10, 20, 30]);
		expect(triple).toHaveLength(single.length * 3);
	});
});
