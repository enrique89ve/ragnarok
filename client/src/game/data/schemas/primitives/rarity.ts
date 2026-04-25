/**
 * Rarity canon — single source of truth for card rarity tiers.
 *
 * Five tiers, ordered by ascending scarcity:
 *   common < uncommon < rare < epic < legendary
 *
 * Anti-Corruption Layer (ACL) adapters translate external/legacy vocabularies
 * into the canon. Adding a new external vocabulary = one entry in ADAPTERS.
 * The canon is immutable — once Genesis is sealed on-chain, this enum is frozen.
 */
import { z } from 'zod';

export const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITY)[number];
export const RaritySchema = z.enum(RARITY);

// ── Ordering (for sort, comparisons, drop-rate tables) ─────────────────────

export const RARITY_ORDER: Readonly<Record<Rarity, number>> = {
	common: 0,
	uncommon: 1,
	rare: 2,
	epic: 3,
	legendary: 4,
};

export const isAtLeast = (r: Rarity, floor: Rarity): boolean =>
	RARITY_ORDER[r] >= RARITY_ORDER[floor];

// ── Anti-Corruption Layer ──────────────────────────────────────────────────

type Adapter<TExternal extends string> = Readonly<Record<TExternal, Rarity>>;

/**
 * Legacy 5-tier vocabulary used by `shared/schema.ts` (DB) and `cardJson/schema.ts`.
 *  - 'basic'  → 'common'    (basic was a distribution marker, not a rarity tier)
 *  - 'mythic' → 'legendary' (top-tier renamed to lore-aligned 'legendary')
 *
 * Note: cards previously labeled `rarity: 'basic'` should ALSO be migrated to
 * `set: 'free'` — see primitives/set.ts. This adapter only fixes the rarity field.
 */
const LEGACY_5T: Adapter<'basic' | 'common' | 'rare' | 'epic' | 'mythic'> = {
	basic: 'common',
	common: 'common',
	rare: 'rare',
	epic: 'epic',
	mythic: 'legendary',
};

/** PascalCase variant used by some UI components (`client/src/types/cards.ts`). */
const PASCAL_UI: Adapter<'Common' | 'Rare' | 'Epic' | 'Mythic'> = {
	Common: 'common',
	Rare: 'rare',
	Epic: 'epic',
	Mythic: 'legendary',
};

const ADAPTERS: ReadonlyArray<Readonly<Record<string, Rarity>>> = [LEGACY_5T, PASCAL_UI];

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
