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

import { getCardById } from './cardManagement/cardRegistry';
import type { CardData } from '../types';
import { BASE_CARD_IDS_BY_CLASS } from './cardRegistry/sets/core/neutrals/baseCards';
import { useHiveDataStore } from '@/data/HiveDataLayer';
import type { HiveCardAsset } from '@/data/schemas/HiveTypes';

// Hero class → card IDs mapping (matches getDefaultArmySelection heroes)
const CLASS_CARD_SETS: Record<string, number[]> = {
	Mage: BASE_CARD_IDS_BY_CLASS.Mage,       // Erik Flameheart (Queen)
	Warrior: BASE_CARD_IDS_BY_CLASS.Warrior,  // Ragnar Ironside (Rook)
	Priest: BASE_CARD_IDS_BY_CLASS.Priest,    // Brynhild (Bishop)
	Rogue: BASE_CARD_IDS_BY_CLASS.Rogue,      // Sigurd (Knight)
};

// King neutral cards (Leif the Wayfinder)
const KING_CARD_IDS = BASE_CARD_IDS_BY_CLASS.Neutral.slice(0, 5); // IDs 140-144

/**
 * Get the 45 starter cards for a new player.
 * 10 per class (Mage, Warrior, Priest, Rogue) + 5 king neutrals.
 */
export function getStarterCards(): CardData[] {
	const cards: CardData[] = [];

	// Add all 4 class sets (10 each)
	for (const classIds of Object.values(CLASS_CARD_SETS)) {
		for (const id of classIds) {
			const card = getCardById(id);
			if (card) cards.push(card);
		}
	}

	// Add king neutral cards (5)
	for (const id of KING_CARD_IDS) {
		const card = getCardById(id);
		if (card) cards.push(card);
	}

	return cards;
}

function toStarterAsset(card: CardData): HiveCardAsset {
	return {
		uid: `starter-${card.id as number}`,
		cardId: card.id as number,
		ownerId: 'local',
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
			.filter(card => card.ownerId === 'local')
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

	localStorage.setItem('ragnarok-decks', JSON.stringify(decks));
	return decks;
}

/**
 * Rebuild starter decks if they are missing from localStorage. This is safe to
 * run on every startup because it only writes when no deck payload exists.
 */
export function ensureStarterDecks(): void {
	const existing = localStorage.getItem('ragnarok-decks');
	if (existing) return;
	buildStarterDecks();
}
