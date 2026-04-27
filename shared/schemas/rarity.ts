/**
 * Rarity canon — single source of truth for card rarity tiers and their
 * gameplay metadata.
 *
 * Authority: `docs/RULEBOOK.md` Card Rarity table.
 *
 * Adding, removing or renaming a tier is a one-place edit: change
 * `RARITY_TABLE`. Every consumer (server seed, pack routes, inventory
 * queries, deck-building rules, eitr economy) derives from this object —
 * never hardcodes the strings. The UI tokens (color/glow/border) live
 * separately in `client/src/game/utils/rarityUtils.ts` indexed by the same
 * keys; that is presentation concern, not gameplay canon.
 *
 * Non-collectible combat tokens (Spark, Boar, etc.) are NOT a rarity tier;
 * they are modeled as `collectible: false` in the registry.
 */
import { z } from 'zod';

// ── Canonical table ────────────────────────────────────────────────────────

interface RarityMeta {
	readonly order: number;          // ascending scarcity (0 = most common)
	readonly supplyCap: number;      // per-card NFT mint cap
	readonly deckLimit: number;      // max copies per deck
	readonly eitrForge: number;      // eitr cost to craft
	readonly eitrDissolve: number;   // eitr refund on dissolve
}

export const RARITY_TABLE = {
	common: { order: 0, supplyCap: 2_000, deckLimit: 2, eitrForge: 40,    eitrDissolve: 5   },
	rare:   { order: 1, supplyCap: 1_000, deckLimit: 2, eitrForge: 100,   eitrDissolve: 20  },
	epic:   { order: 2, supplyCap: 500,   deckLimit: 2, eitrForge: 400,   eitrDissolve: 100 },
	mythic: { order: 3, supplyCap: 250,   deckLimit: 1, eitrForge: 1_600, eitrDissolve: 400 },
} as const satisfies Record<string, RarityMeta>;

export type Rarity = keyof typeof RARITY_TABLE;
export const RARITY = Object.keys(RARITY_TABLE) as readonly Rarity[];
export const RaritySchema = z.enum(RARITY as readonly [Rarity, ...Rarity[]]);

// ── Derived helpers ────────────────────────────────────────────────────────

export const RARITY_ORDER: Readonly<Record<Rarity, number>> = Object.fromEntries(
	(Object.entries(RARITY_TABLE) as [Rarity, RarityMeta][]).map(([k, v]) => [k, v.order]),
) as Record<Rarity, number>;

export const supplyCap    = (r: Rarity): number => RARITY_TABLE[r].supplyCap;
export const deckLimit    = (r: Rarity): number => RARITY_TABLE[r].deckLimit;
export const eitrForge    = (r: Rarity): number => RARITY_TABLE[r].eitrForge;
export const eitrDissolve = (r: Rarity): number => RARITY_TABLE[r].eitrDissolve;

export const isAtLeast = (r: Rarity, floor: Rarity): boolean =>
	RARITY_ORDER[r] >= RARITY_ORDER[floor];

/**
 * Walk-up fallback: when a target rarity is exhausted, pull from the next
 * scarcer tier rather than failing. The top tier falls back one step down
 * (mythic → epic) so a fully-empty top doesn't block a wildcard slot.
 */
export const fallbackChain = (target: Rarity): readonly Rarity[] => {
	const ascending = [...RARITY].sort((a, b) => RARITY_ORDER[a] - RARITY_ORDER[b]);
	const upward = ascending.slice(RARITY_ORDER[target]);
	const isTop = RARITY_ORDER[target] === ascending.length - 1;
	return isTop && ascending.length > 1
		? [target, ascending[ascending.length - 2]]
		: upward;
};

/**
 * Build a SQL `ORDER BY CASE` fragment that sorts a rarity column from
 * scarcest to most common. Avoids hardcoded SQL strings in route files.
 *   sqlRarityOrderByCase('cs.nft_rarity')
 *   → "CASE cs.nft_rarity WHEN 'mythic' THEN 1 WHEN 'epic' THEN 2 ... END"
 */
export const sqlRarityOrderByCase = (column: string): string => {
	const descending = [...RARITY].sort((a, b) => RARITY_ORDER[b] - RARITY_ORDER[a]);
	const cases = descending.map((r, i) => `WHEN '${r}' THEN ${i + 1}`).join(' ');
	return `CASE ${column} ${cases} END`;
};

// ── Anti-Corruption Layer ──────────────────────────────────────────────────

type Adapter<TExternal extends string> = Readonly<Record<TExternal, Rarity>>;

/**
 * Legacy vocabulary that may still appear in old fixtures or imported data:
 *  - 'basic' was a distribution marker in early data, not a tier → 'common'.
 */
const LEGACY: Adapter<'basic' | Rarity> = {
	basic: 'common',
	common: 'common',
	rare: 'rare',
	epic: 'epic',
	mythic: 'mythic',
};

/** PascalCase variant used by some UI components (`client/src/types/cards.ts`). */
const PASCAL_UI: Adapter<'Common' | 'Rare' | 'Epic' | 'Mythic'> = {
	Common: 'common',
	Rare: 'rare',
	Epic: 'epic',
	Mythic: 'mythic',
};

const ADAPTERS: ReadonlyArray<Readonly<Record<string, Rarity>>> = [LEGACY, PASCAL_UI];

const isCanonical = (input: string): input is Rarity =>
	(RARITY as readonly string[]).includes(input);

/**
 * Normalize any known external rarity string to the canon.
 * Throws on unknown input — callers at trust boundaries should use `tryAdaptRarity`.
 */
export const adaptRarity = (input: string): Rarity => {
	if (isCanonical(input)) return input;
	for (const a of ADAPTERS) {
		if (Object.prototype.hasOwnProperty.call(a, input)) return a[input];
	}
	throw new RangeError(`Unknown rarity: "${input}"`);
};

export const tryAdaptRarity = (input: string): Rarity | null => {
	if (isCanonical(input)) return input;
	for (const a of ADAPTERS) {
		if (Object.prototype.hasOwnProperty.call(a, input)) return a[input];
	}
	return null;
};
