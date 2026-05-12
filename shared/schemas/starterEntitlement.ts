/**
 * Canonical starter entitlement.
 *
 * Single source of truth for the universal off-chain starter ownership.
 * Every Hive account owns these cards from day one — there is no acquisition
 * event that grants ownership. The `STARTER_ENTITLEMENT` constant is
 * eager-precomputed at module load: hero decks are pre-built, copy counts
 * indexed by card-id, and lookup is O(1) at runtime.
 *
 * Consumers MUST read from `STARTER_ENTITLEMENT` — never duplicate the
 * card lists, deck composition, or copy counts in client/server modules.
 *
 * See: docs/SET_AXIS.md (starter category model), CONTEXT.md (Starter
 * Entitlement Source of Truth).
 */

// ── Internal canonical dataset (single source) ──

const CLASS_IDS = {
	mage:    [100, 101, 102, 103, 104, 105, 106, 107, 108, 109],
	warrior: [110, 111, 112, 113, 114, 115, 116, 117, 118, 119],
	priest:  [120, 121, 122, 123, 124, 125, 126, 127, 128, 129],
	rogue:   [130, 131, 132, 133, 134, 135, 136, 137, 138, 139],
} as const satisfies Record<string, readonly number[]>;

const NEUTRAL_IDS = [140, 141, 142, 143, 144] as const;

const COPIES_PER_CARD = 2;

// ── Pre-computation helpers ──

function doubled<T extends number>(ids: readonly T[]): T[] {
	return ids.flatMap(id => Array<T>(COPIES_PER_CARD).fill(id));
}

const FLAT_IDS: readonly number[] = Object.freeze([
	...Object.values(CLASS_IDS).flat(),
	...NEUTRAL_IDS,
]);

const FLAT_ID_SET: ReadonlySet<number> = new Set(FLAT_IDS);

// ── Public canonical constant ──

export const STARTER_ENTITLEMENT = Object.freeze({
	/** Card-ids per class (lowercase keys, matching `ChessPieceHero.heroClass` canon). */
	cardIdsByClass: CLASS_IDS,

	/** Universal neutral cards. Available across all 4 hero decks. */
	neutralIds: NEUTRAL_IDS,

	/** Copies of each card per hero deck (2 for common, mirrors HERO_DECK_MAX_COPIES). */
	copiesPerCard: COPIES_PER_CARD,

	/** Flat list of all 45 unique card-ids. */
	cardIds: FLAT_IDS,

	/** O(1) membership check. */
	cardIdSet: FLAT_ID_SET,

	/** O(1) lookup: how many copies of cardId every account owns by entitlement. */
	copiesPerCardId: Object.freeze(
		Object.fromEntries(FLAT_IDS.map(id => [id, COPIES_PER_CARD])),
	) as Readonly<Record<number, number>>,

	/**
	 * Pre-built 30-card hero decks for the 4 default classes. Each deck:
	 * 10 class cards × 2 copies + 5 neutral cards × 2 copies = 30 cards.
	 * Indexed by lowercase heroClass to match `ChessPieceHero.heroClass`.
	 */
	heroDecks: Object.freeze({
		mage:    Object.freeze([...doubled(CLASS_IDS.mage),    ...doubled(NEUTRAL_IDS)]),
		warrior: Object.freeze([...doubled(CLASS_IDS.warrior), ...doubled(NEUTRAL_IDS)]),
		priest:  Object.freeze([...doubled(CLASS_IDS.priest),  ...doubled(NEUTRAL_IDS)]),
		rogue:   Object.freeze([...doubled(CLASS_IDS.rogue),   ...doubled(NEUTRAL_IDS)]),
	}),
});

export type StarterHeroClass = keyof typeof STARTER_ENTITLEMENT.heroDecks;

export function isStarterHeroClass(value: string): value is StarterHeroClass {
	return value in STARTER_ENTITLEMENT.heroDecks;
}

export function isStarterEntitlementCardId(cardId: number | undefined): boolean {
	return typeof cardId === 'number' && FLAT_ID_SET.has(cardId);
}

// ── Legacy exports — derived from canonical constant ──
// Kept for compatibility during the Phase 2 migration. Phase 3 deletes them.

/** @deprecated Use `STARTER_ENTITLEMENT.cardIdsByClass` (lowercase keys) instead. */
export const STARTER_ENTITLEMENT_CARD_IDS_BY_CLASS = {
	Mage:    CLASS_IDS.mage,
	Warrior: CLASS_IDS.warrior,
	Priest:  CLASS_IDS.priest,
	Rogue:   CLASS_IDS.rogue,
	Neutral: NEUTRAL_IDS,
} as const satisfies Record<string, readonly number[]>;

/** @deprecated Use `STARTER_ENTITLEMENT.cardIds` instead. */
export const STARTER_ENTITLEMENT_CARD_IDS = FLAT_IDS;

/** @deprecated Use `STARTER_ENTITLEMENT.copiesPerCard` instead. */
export const STARTER_ENTITLEMENT_COPIES_PER_DECK = COPIES_PER_CARD;
