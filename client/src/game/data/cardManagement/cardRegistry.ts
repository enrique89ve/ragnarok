/**
 * Legacy card-management compatibility adapter.
 *
 * All reads delegate to data/cardRegistry, the immutable runtime authority.
 * The deprecated authoring mutations remain callable for old builders but do
 * not create a second runtime dataset.
 */
import type { CardData } from '../../types';
import {
	getAllCards as getCanonicalCards,
	getCardById as getCanonicalCardById,
	getCardByName as getCanonicalCardByName,
	getCardsByPredicate as getCanonicalCardsByPredicate,
} from '../cardRegistry';

/** @deprecated Card definitions must be added to data/cardRegistry. */
export function registerCard(card: CardData, _categories: string[] = []): void {
	if (!card.id || !card.name || !card.type || !card.rarity) {
		throw new Error(`Card missing required fields: ${JSON.stringify(card)}`);
	}
}

export const getCardById = getCanonicalCardById;
export const getCardByName = getCanonicalCardByName;
export const getAllCards = getCanonicalCards;
export const getCardsByPredicate = getCanonicalCardsByPredicate;

function authoredCategories(card: CardData): readonly string[] {
	if (!('categories' in card)) return [];
	const categories: unknown = card.categories;
	return Array.isArray(categories)
		? categories.filter((category): category is string => typeof category === 'string')
		: [];
}

function matchesCategory(card: CardData, category: string): boolean {
	if (card.type === category || card.rarity === category) return true;
	if ((card.heroClass || 'neutral') === category) return true;
	if (card.race === category || card.keywords?.includes(category)) return true;
	if (authoredCategories(card).includes(category)) return true;
	return `mana_${card.manaCost}` === category;
}

export function getCardsByCategory(category: string): CardData[] {
	return getCanonicalCardsByPredicate(card => matchesCategory(card, category));
}

export function getCardsByCategories(categories: string[]): CardData[] {
	if (categories.length === 0) return [];
	return getCanonicalCardsByPredicate(card => categories.every(category => matchesCategory(card, category)));
}

export function hasCardWithId(id: CardData['id']): boolean {
	return getCanonicalCardById(id) !== undefined;
}

export function getCardCount(): number {
	return getCanonicalCards().length;
}

export function getAllCategories(): string[] {
	const categories = new Set<string>();
	for (const card of getCanonicalCards()) {
		categories.add(card.type);
		categories.add(card.rarity);
		categories.add(card.heroClass || 'neutral');
		categories.add(`mana_${card.manaCost}`);
		if (card.race) categories.add(card.race);
		for (const keyword of card.keywords ?? []) categories.add(keyword);
		for (const category of authoredCategories(card)) categories.add(category);
	}
	return [...categories];
}

/** @deprecated The canonical registry is immutable and cannot be cleared. */
export function clearRegistry(): void {
	// Compatibility no-op: clearing the canonical runtime dataset is forbidden.
}
