/**
 * Card category canon — the single discriminator every consumer should
 * branch on after a card has crossed the validation boundary.
 *
 * Three categories, ordered by ascending economic weight:
 *
 *   token (0) < starter (1) < genesis (2)
 *
 * The numeric `order` mirrors the pattern used by `RARITY_TABLE` in
 * `rarity.ts`. It enables filters like `isAtLeast(c.category, 'starter')`
 * (returns starter + genesis, excludes tokens) without re-enumerating.
 *
 * Why a category table instead of two boolean flags (`set`, `collectible`)
 * combined?
 *
 *   - The two-flag model overloads `collectible` (NFT-mintable +
 *     in-packs + not-token) and uses `set: undefined` as a meaningful
 *     value. TypeScript cannot enforce exhaustiveness on consumers.
 *   - With an explicit `category`, every consumer becomes a `switch` over
 *     a discriminated union; adding a new category is a compile-error
 *     until every branch covers it.
 *
 * Authoring intent (`set`, `collectible` on source cards) is preserved
 * unchanged. The boundary normalizer (`validateCardRegistry`) computes
 * `category` once and stamps it on every output card.
 */

// ── Canonical table ────────────────────────────────────────────────────────

interface CardCategoryMeta {
	readonly order: number;          // ascending weight (0 = ephemeral token)
	readonly onChain: boolean;       // recorded as Hive custom_json ops
	readonly mintable: boolean;      // can a new copy be minted post-genesis
	readonly inPacks: boolean;       // appears in pack opening drop tables
	readonly inDecks: boolean;       // can be added to a player's deck
	readonly ownedByPlayers: boolean;// has owner identity (account binding)
	readonly supplyCapped: boolean;  // bounded by RARITY_TABLE.supplyCap
	readonly description: string;
}

export const CARD_CATEGORY_TABLE = {
	token: {
		order: 0,
		onChain: false,
		mintable: false,
		inPacks: false,
		inDecks: false,
		ownedByPlayers: false,
		supplyCapped: false,
		description: 'Combat-only summon spawned by card effects. No identity, no ownership, no supply.',
	},
	starter: {
		order: 1,
		onChain: false,
		mintable: false,
		inPacks: false,
		inDecks: true,
		ownedByPlayers: true,
		supplyCapped: false,
		description: 'Free base-edition card distributed to every new player. Infinite supply, off-chain.',
	},
	genesis: {
		order: 2,
		onChain: true,
		mintable: true,
		inPacks: true,
		inDecks: true,
		ownedByPlayers: true,
		supplyCapped: true,
		description: 'Sealed NFT collection. Finite per-card supply enforced on-chain at genesis seal.',
	},
} as const satisfies Record<string, CardCategoryMeta>;

export type CardCategory = keyof typeof CARD_CATEGORY_TABLE;

/** Ordered tuple, ascending by `order`. Useful for sorts and iteration. */
export const CARD_CATEGORIES = Object.entries(CARD_CATEGORY_TABLE)
	.sort(([, a], [, b]) => a.order - b.order)
	.map(([k]) => k) as readonly CardCategory[];

// ── Derived helpers ────────────────────────────────────────────────────────

export const categoryOrder = (c: CardCategory): number =>
	CARD_CATEGORY_TABLE[c].order;

/**
 * Hierarchy filter: "is this card at least at category `floor`?"
 *   isAtLeast('genesis', 'starter') === true   (genesis ≥ starter)
 *   isAtLeast('token',   'starter') === false  (token < starter)
 */
export const isAtLeast = (c: CardCategory, floor: CardCategory): boolean =>
	categoryOrder(c) >= categoryOrder(floor);

export const isOnChain        = (c: CardCategory): boolean => CARD_CATEGORY_TABLE[c].onChain;
export const isMintable       = (c: CardCategory): boolean => CARD_CATEGORY_TABLE[c].mintable;
export const isInPacks        = (c: CardCategory): boolean => CARD_CATEGORY_TABLE[c].inPacks;
export const isInDecks        = (c: CardCategory): boolean => CARD_CATEGORY_TABLE[c].inDecks;
export const isOwnedByPlayers = (c: CardCategory): boolean => CARD_CATEGORY_TABLE[c].ownedByPlayers;
export const isSupplyCapped   = (c: CardCategory): boolean => CARD_CATEGORY_TABLE[c].supplyCapped;

// ── Macro splits (derived, for clarity at call sites) ──────────────────────

/** "Is this card part of the NFT collection?" — derived from `onChain`. */
export const isNFT = isOnChain;

/** "Does this card persist outside of combat?" — derived from `inDecks`. */
export const isPersistent = isInDecks;

// ── Boundary classification (pure) ─────────────────────────────────────────

/**
 * Compute `category` from the authoring fields (`set`, `collectible`).
 * Single source of truth for bucket assignment — `validateCardRegistry`
 * uses this and derives the legacy `set` view from the result.
 *
 * Resolution order:
 *   1. `set: 'starter'` → 'starter' (regardless of collectible)
 *   2. `collectible: false` → 'token' (combat-only summon)
 *   3. otherwise → 'genesis' (default for collectible cards)
 */
export const classifyCard = (input: {
	readonly set?: 'starter' | 'genesis' | string;
	readonly collectible?: boolean;
}): CardCategory => {
	if (input.set === 'starter') return 'starter';
	if (input.collectible === false) return 'token';
	return 'genesis';
};

/**
 * Exhaustiveness helper for `switch (card.category)` blocks. Pass the
 * narrowed `never` value in the `default` branch and TypeScript will
 * mark new categories as compile errors until every branch handles them.
 */
export const assertNeverCategory = (c: never): never => {
	throw new Error(`Unhandled card category: ${String(c)}`);
};
