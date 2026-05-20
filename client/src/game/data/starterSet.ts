/**
 * starterSet.ts — Fixed Starter Entitlement
 *
 * Every account receives the same 45-card starter entitlement matched to the
 * default heroes:
 * - 10 Mage cards (for Erik Flameheart)
 * - 10 Warrior cards (for Ragnar Ironside)
 * - 10 Priest cards (for Brynhild)
 * - 10 Rogue cards (for Sigurd)
 * - 5 King neutral cards (for Leif)
 *
 * Base cards are infinite supply — they don't count toward the 3.3M NFT cap.
 * Power level: slightly below common, with "value gems" to keep decks competitive.
 *
 * Important: the starter is intentionally fixed, not random. Randomness belongs
 * in pack/reward systems, not in account bootstrap.
 */

import { getCardById } from './allCards';
import type { CardData } from '../types';
import { useHiveDataStore } from '@/data/HiveDataLayer';
import {
	STARTER_ENTITLEMENT_OWNER_ID,
	STARTER_UID_PREFIX,
	getStarterUid,
	isStarterEntitlementAsset,
	type HiveCardAsset,
} from '@/data/schemas/HiveTypes';
import {
	STARTER_ENTITLEMENT,
	STARTER_ENTITLEMENT_CARD_IDS_BY_CLASS,
	isStarterHeroClass,
} from '@shared/schemas/starterEntitlement';
import { useHeroDeckStore } from '../stores/heroDeckStore';
import { HERO_DECK_PIECE_TYPES } from '../deck/heroDeckRules';
import { getDefaultArmySelection } from './ChessPieceConfig';
import { createRuntimeStorageKey } from '../config/networkConfig';

// Hero class → card IDs mapping (matches getDefaultArmySelection heroes).
// @deprecated — derived from STARTER_ENTITLEMENT_CARD_IDS_BY_CLASS for back-compat.
// Phase 3 deletes this alias.
const CLASS_CARD_SETS: Record<string, readonly number[]> = STARTER_ENTITLEMENT_CARD_IDS_BY_CLASS;
const LEGACY_STARTER_DECKS_STORAGE_KEY = createRuntimeStorageKey('ragnarok-decks');

/**
 * Get the 45 starter cards for a new player.
 * 10 per class (Mage, Warrior, Priest, Rogue) + 5 king neutrals.
 */
export function getStarterCards(): CardData[] {
	const cards: CardData[] = [];

	// Add all 4 class sets (10 each) and the 5 neutral king cards.
	for (const classIds of Object.values(CLASS_CARD_SETS)) {
		for (const id of classIds) {
			const card = getCardById(id);
			if (card) cards.push(card);
		}
	}

	return cards;
}

function toStarterAsset(card: CardData): HiveCardAsset {
	return {
		uid: getStarterUid(card.id as number),
		cardId: card.id as number,
		ownerId: STARTER_ENTITLEMENT_OWNER_ID,
		ownershipSource: 'starter',
		edition: 'alpha',
		foil: 'standard',
		rarity: card.rarity || 'common',
		level: 1,
		xp: 0,
		name: card.name,
		type: card.type,
	};
}

/**
 * Materialize the fixed starter entitlement into the local collection cache.
 * The source of truth is the fixed starter set in code, not persisted card IDs.
 *
 * Returns the number of cards newly inserted into the local collection.
 */
export function materializeStarterEntitlement(): number {
	const hiveStore = useHiveDataStore.getState();
	const starterCards = getStarterCards();
	const ownedStarterIds = new Set(
		hiveStore.cardCollection
			.filter(isStarterEntitlementAsset)
			.map(card => card.cardId),
	);

	let added = 0;
	for (const card of starterCards) {
		const cardId = card.id as number;
		if (ownedStarterIds.has(cardId)) continue;
		hiveStore.addCard(toStarterAsset(card));
		added++;
	}

	return added;
}

/**
 * Get class-specific base cards for a given hero class.
 * Used when giving bonus cards for a specific hero.
 */
export function getBaseCardsByClass(heroClass: string): CardData[] {
	const ids = CLASS_CARD_SETS[heroClass] ?? [];
	return ids.map(id => getCardById(id)).filter(Boolean) as CardData[];
}

export const STARTER_PACK_NAME = 'Birthright of the Norns';
export const STARTER_CARD_COUNT = 45;

/**
 * Build 4 starter card pools (one per default hero).
 * NOT full 30-card decks — just the 10 class cards per hero.
 * Players can play with 0 cards (just heroes), these are bonus firepower.
 * Saves to localStorage so cards are available in deck builder when they choose to customize.
 */
export function buildStarterDecks(): Array<{ name: string; heroId: string; cardIds: number[] }> {
	const heroDecks: Array<{ name: string; heroId: string; heroClass: string }> = [
		{ name: "Erik's Fire Deck", heroId: 'hero-erik-flameheart', heroClass: 'Mage' },
		{ name: "Ragnar's Iron Deck", heroId: 'hero-ragnar-ironside', heroClass: 'Warrior' },
		{ name: "Brynhild's Light Deck", heroId: 'hero-brynhild', heroClass: 'Priest' },
		{ name: "Sigurd's Shadow Deck", heroId: 'hero-sigurd', heroClass: 'Rogue' },
	];

	const decks: Array<{ name: string; heroId: string; cardIds: number[] }> = [];

	for (const hero of heroDecks) {
		const classIds = CLASS_CARD_SETS[hero.heroClass] || [];
		decks.push({ name: hero.name, heroId: hero.heroId, cardIds: [...classIds] });
	}

	localStorage.setItem(LEGACY_STARTER_DECKS_STORAGE_KEY, JSON.stringify(decks));
	return decks;
}

/**
 * Rebuild starter decks if they are missing from localStorage. This is safe to
 * run on every startup because it only writes when no deck payload exists.
 *
 * @deprecated Use seedStarterHeroDecks() — Phase 3 deletes this function.
 */
export function ensureStarterDecks(): void {
	const existing = localStorage.getItem(LEGACY_STARTER_DECKS_STORAGE_KEY);
	if (existing) return;
	buildStarterDecks();
}

// ── Source-of-truth-aligned API (Phase 1 additions) ──

/**
 * Seed the 4 starter hero decks (queen/rook/bishop/knight) into useHeroDeckStore
 * by copying the pre-built 30-card decks from STARTER_ENTITLEMENT.heroDecks.
 *
 * Idempotent and respectful: if a piece already has a deck, it is NOT overwritten.
 * The player's custom decks survive any re-seed call.
 *
 * The king piece has no deck (passive ability only) — only the 4 spell pieces are seeded.
 *
 * Called from:
 *   - claimStarterEntitlement (after the ceremony's claim action)
 *   - bridgeRuntime when the account has previously claimed (re-seed for new device, etc.)
 */
export function seedStarterHeroDecks(): void {
	const army = getDefaultArmySelection();
	const store = useHeroDeckStore.getState();

	for (const piece of HERO_DECK_PIECE_TYPES) {
		if (store.getDeck(piece) !== null) continue;

		const hero = army[piece];
		const heroClass = hero.heroClass;
		if (!isStarterHeroClass(heroClass)) continue;

		store.setDeck(piece, {
			pieceType: piece,
			heroId: hero.id,
			heroClass,
			cardIds: [...STARTER_ENTITLEMENT.heroDecks[heroClass]],
		});
	}
}

/**
 * One-shot migration: remove starter rows that legacy materializeStarterEntitlement
 * persisted in cardCollection (via Zustand `persist` middleware to localStorage).
 *
 * Identifies legacy rows by uid prefix or owner placeholder. Idempotent — once
 * cleaned, repeated calls are no-ops because no path writes those uids anymore.
 *
 * Safe to run on every bridge boot.
 */
export function purgeLegacyStarterRows(): void {
	useHiveDataStore.setState(state => {
		const filtered = state.cardCollection.filter(c =>
			!c.uid.startsWith(STARTER_UID_PREFIX) && c.ownerId !== STARTER_ENTITLEMENT_OWNER_ID,
		);
		if (filtered.length === state.cardCollection.length) return state;
		return { ...state, cardCollection: filtered };
	});
}
