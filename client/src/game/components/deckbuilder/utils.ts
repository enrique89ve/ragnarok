/**
 * deckBuilderUtils.ts
 * Pure utility functions for deck builder logic.
 * No React, no side effects - just data transformations.
 */

import { CardData } from '../../types';

export const DECK_SIZE = 30;
export const MAX_COPIES = 2;
export const MAX_MYTHIC_COPIES = 1;

export type SortOption = 'cost' | 'name' | 'type';
export type FilterType = 'all' | 'minion' | 'spell' | 'weapon' | 'artifact' | 'armor' | 'pet';

export interface CardFilters {
  searchTerm: string;
  filterType: FilterType;
  sortBy: SortOption;
  minCost: number | null;
  maxCost: number | null;
}

/**
 * Count occurrences of each card ID in a deck
 */
export function countCards(cardIds: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const id of cardIds) {
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

/**
 * Check if a card is mythic rarity (max 1 copy per deck)
 */
export function isCardMythic(card: CardData): boolean {
  return (card.rarity || '').toLowerCase() === 'mythic';
}

/**
 * Get max allowed copies for a card
 */
export function getMaxCopies(card: CardData): number {
  return isCardMythic(card) ? MAX_MYTHIC_COPIES : MAX_COPIES;
}

/**
 * Check if a card can be added to the deck
 */
export function canAddCardToDeck(
  cardId: number,
  deckCardIds: number[],
  card: CardData
): boolean {
  if (deckCardIds.length >= DECK_SIZE) return false;
  
  const currentCount = countCards(deckCardIds)[cardId] || 0;
  const maxAllowed = getMaxCopies(card);
  return currentCount < maxAllowed;
}

/**
 * Get the card's class (normalized to lowercase)
 */
export function getCardClass(card: CardData): string {
  return (card.class || (card as any).heroClass || 'neutral').toLowerCase();
}

/**
 * Check if a card is a class card (not neutral)
 */
export function isClassCard(card: CardData): boolean {
  return getCardClass(card) !== 'neutral';
}

/**
 * Filter cards by hero class (returns neutral + matching class cards)
 * Artifacts are further restricted to their specific heroId.
 */
export function filterCardsByClass(cards: CardData[], heroClass: string, heroId?: string): CardData[] {
  const normalizedHeroClass = heroClass.toLowerCase();
  return cards.filter(card => {
    if (card.collectible === false || card.type === 'hero') return false;
    const cardClass = getCardClass(card);
    const classMatch = cardClass === 'neutral' || cardClass === normalizedHeroClass;
    if (!classMatch) return false;
    if (card.type === 'artifact' && (card as any).heroId && heroId) {
      return (card as any).heroId === heroId;
    }
    return true;
  });
}

/**
 * Apply search and filter criteria to cards
 */
export function filterCards(cards: CardData[], filters: CardFilters): CardData[] {
  let filtered = cards;

  // Search term filter
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(card =>
      card.name.toLowerCase().includes(term) ||
      (card.description || '').toLowerCase().includes(term)
    );
  }

  // Card type filter
  if (filters.filterType === 'pet') {
    filtered = filtered.filter(card => !!(card as any).petStage);
  } else if (filters.filterType !== 'all') {
    filtered = filtered.filter(card => card.type === filters.filterType);
  }

  // Mana cost range filter
  if (filters.minCost !== null) {
    filtered = filtered.filter(card => (card.manaCost ?? 0) >= filters.minCost!);
  }
  if (filters.maxCost !== null) {
    filtered = filtered.filter(card => (card.manaCost ?? 0) <= filters.maxCost!);
  }

  return filtered;
}

/**
 * Sort cards by the specified option
 */
export function sortCards(cards: CardData[], sortBy: SortOption): CardData[] {
  return [...cards].sort((a, b) => {
    switch (sortBy) {
      case 'cost':
        return (a.manaCost ?? 0) - (b.manaCost ?? 0);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'type':
        return a.type.localeCompare(b.type);
      default:
        return 0;
    }
  });
}

/**
 * Filter and sort cards in one pass
 */
export function filterAndSortCards(cards: CardData[], filters: CardFilters): CardData[] {
  const filtered = filterCards(cards, filters);
  return sortCards(filtered, filters.sortBy);
}

/**
 * Get unique cards from deck IDs with counts, sorted by mana cost
 */
export function getDeckCardsWithCounts(
  deckCardIds: number[],
  cardRegistry: CardData[]
): { card: CardData; count: number }[] {
  const counts = countCards(deckCardIds);
  const uniqueIds = [...new Set(deckCardIds)];
  
  return uniqueIds
    .map(id => {
      const card = cardRegistry.find(c => Number(c.id) === id);
      return card ? { card, count: counts[id] } : null;
    })
    .filter((entry): entry is { card: CardData; count: number } => entry !== null)
    .sort((a, b) => (a.card.manaCost ?? 0) - (b.card.manaCost ?? 0));
}

/**
 * Auto-fill deck with random valid cards
 */
export function generateAutoFillCards(
  currentDeckIds: number[],
  validCards: CardData[],
  targetSize: number = DECK_SIZE
): number[] {
  const remaining = targetSize - currentDeckIds.length;
  if (remaining <= 0) return [];

  const currentCounts = countCards(currentDeckIds);
  const newCards: number[] = [];
  
  // Shuffle cards for randomness
  const shuffled = [...validCards].sort(() => Math.random() - 0.5);
  
  for (const card of shuffled) {
    if (newCards.length >= remaining) break;
    
    const cardId = Number(card.id);
    const currentCount = currentCounts[cardId] || 0;
    const maxAllowed = getMaxCopies(card);
    
    if (currentCount < maxAllowed) {
      const toAdd = Math.min(maxAllowed - currentCount, remaining - newCards.length);
      for (let i = 0; i < toAdd; i++) {
        newCards.push(cardId);
        currentCounts[cardId] = (currentCounts[cardId] || 0) + 1;
      }
    }
  }

  return newCards;
}
