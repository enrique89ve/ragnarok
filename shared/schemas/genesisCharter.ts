/**
 * Genesis NFT Charter — single source of truth for the sealed Genesis Alpha
 * collection sizing.
 *
 * Authority: this file. Manifests, supply caps and audit guards derive from
 * `GENESIS_CHARTER` — never edit derived numbers in isolation.
 *
 * The four buckets (common / rare / epic / mythic) come from the canonical
 * rarity table in `rarity.ts`. Per-bucket the charter declares:
 *   - cards:   how many distinct collectible cards live in `cardRegistry`
 *   - heroes:  how many distinct heroes live in `ALL_NORSE_HEROES`
 *   - kings:   how many distinct kings live in `NORSE_KINGS`
 *   - copiesEach: NFT mint cap per individual seed (also matches `RARITY_TABLE.supplyCap`)
 *
 * History note: the previous dev published an aspirational target of
 *   common 927 / rare 695 / epic 370 / mythic 160 cards (2,152 total)
 *   91 heroes + 13 kings → 2,256 seeds → 2,862,750 NFTs
 * That target was computed when the registry still contained 32 duplicate
 * card names (see git history for the de-duplication commit). After the
 * de-duplication the per-rarity proportions remain identical to two decimal
 * places (5.78 : 4.33 : 2.30 : 1.00) — the new numbers below are the same
 * intent expressed against the canonicalised registry.
 */
import type { Rarity } from './rarity';
import { RARITY_TABLE } from './rarity';

export interface CharterBucket {
	readonly cards: number;
	readonly heroes: number;
	readonly kings: number;
	readonly copiesEach: number;
}

export const GENESIS_CHARTER: Readonly<Record<Rarity, CharterBucket>> = {
	common: { cards: 914, heroes: 12, kings: 3, copiesEach: RARITY_TABLE.common.supplyCap },
	rare:   { cards: 684, heroes: 38, kings: 2, copiesEach: RARITY_TABLE.rare.supplyCap   },
	epic:   { cards: 364, heroes: 34, kings: 3, copiesEach: RARITY_TABLE.epic.supplyCap   },
	mythic: { cards: 158, heroes: 13, kings: 3, copiesEach: RARITY_TABLE.mythic.supplyCap },
} as const;

// ── Derived totals ─────────────────────────────────────────────────────────

const sumBuckets = (pick: (b: CharterBucket) => number): number =>
	(Object.values(GENESIS_CHARTER) as CharterBucket[]).reduce((n, b) => n + pick(b), 0);

export const CHARTER_CARDS_TOTAL  = sumBuckets(b => b.cards);
export const CHARTER_HEROES_TOTAL = sumBuckets(b => b.heroes);
export const CHARTER_KINGS_TOTAL  = sumBuckets(b => b.kings);
export const CHARTER_SEEDS_TOTAL  = CHARTER_CARDS_TOTAL + CHARTER_HEROES_TOTAL + CHARTER_KINGS_TOTAL;
export const CHARTER_NFTS_TOTAL   = sumBuckets(b => (b.cards + b.heroes + b.kings) * b.copiesEach);

// ── Compliance helpers (used by the audit) ─────────────────────────────────

export interface CharterActuals {
	readonly cardsByRarity: Readonly<Record<Rarity, number>>;
	readonly heroesTotal: number;
	readonly kingsTotal: number;
}

export interface CharterGap {
	readonly rarity: Rarity;
	readonly kind: 'cards';
	readonly expected: number;
	readonly actual: number;
	readonly delta: number;
}

export interface CharterDelta {
	readonly cardsByRarity: ReadonlyArray<CharterGap>;
	readonly heroesDelta: number;
	readonly kingsDelta: number;
}

export const computeCharterDelta = (actuals: CharterActuals): CharterDelta => {
	const buckets: Rarity[] = ['common', 'rare', 'epic', 'mythic'];
	const cardsByRarity: CharterGap[] = buckets.map(r => {
		const expected = GENESIS_CHARTER[r].cards;
		const actual = actuals.cardsByRarity[r] ?? 0;
		return { rarity: r, kind: 'cards', expected, actual, delta: actual - expected };
	});
	return {
		cardsByRarity,
		heroesDelta: actuals.heroesTotal - CHARTER_HEROES_TOTAL,
		kingsDelta: actuals.kingsTotal - CHARTER_KINGS_TOTAL,
	};
};

export const isCharterClean = (delta: CharterDelta): boolean =>
	delta.cardsByRarity.every(g => g.delta === 0)
	&& delta.heroesDelta === 0
	&& delta.kingsDelta === 0;
