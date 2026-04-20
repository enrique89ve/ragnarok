/**
 * Card Registry System
 * 
 * Provides a centralized registry for all card data in the game.
 * Cards are registered once and can be accessed by ID or filtered by various properties.
 */
import { CardData } from '../../types';
import { isMinion, getAttack, getHealth } from '../../utils/cards/typeGuards';
import { debug } from '../../config/debugConfig';

const IS_DEV = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';
const VERBOSE_CARD_LOGGING = false;

// Central registry of all cards - maps card ID to card data
const cardRegistry: Map<number | string, CardData> = new Map();

// Category indexing - maps category name to array of card IDs
const cardsByCategory: Record<string, (number | string)[]> = {};

// Name lookup - maps card name to card ID for quick lookup
const cardNameLookup: Map<string, number | string> = new Map();

/**
 * Register a card in the central registry
 * 
 * @param card - The card data to register
 * @param categories - Optional additional categories to tag this card with
 * @throws Error if card is missing required fields or has a duplicate ID
 */
export function registerCard(card: CardData, categories: string[] = []): void {
  // Validate the card has required fields
  if (!card.id || !card.name || !card.type || !card.rarity) {
    throw new Error(`Card missing required fields: ${JSON.stringify(card)}`);
  }
  
  // Check for duplicate ID - skip silently if already registered
  if (cardRegistry.has(card.id)) {
    // Already registered, skip to avoid errors on hot reload
    return;
  }
  
  // Add to main registry
  cardRegistry.set(card.id, card);
  
  // Add to name lookup
  cardNameLookup.set(card.name, card.id);
  
  // Add to category indexes
  categories.forEach(category => {
    if (!cardsByCategory[category]) {
      cardsByCategory[category] = [];
    }
    cardsByCategory[category].push(card.id);
  });
  
  // Also index by built-in categories
  const builtInCategories = [
    card.type,                   // minion, spell, weapon, etc
    card.rarity,                 // common, rare, epic, mythic
    card.heroClass || 'neutral', // class or neutral
  ];
  
  // Add race if present
  if (card.race) builtInCategories.push(card.race);
  
  // Add keywords as categories
  if (card.keywords && Array.isArray(card.keywords)) {
    builtInCategories.push(...card.keywords);
  }
  
  // Add mana cost as a category
  builtInCategories.push(`mana_${card.manaCost}`);
  
  // Index by these categories
  builtInCategories.forEach(category => {
    if (!cardsByCategory[category]) {
      cardsByCategory[category] = [];
    }
    cardsByCategory[category].push(card.id);
  });
  
  if (IS_DEV && VERBOSE_CARD_LOGGING) {
    debug.card(`Registered card: ${card.name} (ID: ${card.id})`);
  }
}

/**
 * Get a card by its ID
 * 
 * @param id - The ID of the card to retrieve
 * @returns The card data or undefined if not found
 */
export function getCardById(id: number): CardData | undefined {
  return cardRegistry.get(id);
}

/**
 * Get a card by its name
 * 
 * @param name - The name of the card to retrieve
 * @returns The card data or undefined if not found
 */
export function getCardByName(name: string): CardData | undefined {
  const id = cardNameLookup.get(name);
  return id ? cardRegistry.get(id) : undefined;
}

/**
 * Get all cards in the registry
 * 
 * @returns Array of all registered card data
 */
export function getAllCards(): CardData[] {
  return Array.from(cardRegistry.values());
}

/**
 * Get all cards in a specific category
 * 
 * @param category - The category to filter by
 * @returns Array of cards in the specified category
 */
export function getCardsByCategory(category: string): CardData[] {
  const cardIds = cardsByCategory[category] || [];
  return cardIds.map(id => cardRegistry.get(id)!).filter(Boolean);
}

/**
 * Get cards matching multiple categories (AND logic)
 * 
 * @param categories - Array of categories to filter by
 * @returns Array of cards that match ALL specified categories
 */
export function getCardsByCategories(categories: string[]): CardData[] {
  if (categories.length === 0) return [];
  if (categories.length === 1) return getCardsByCategory(categories[0]);
  
  // Start with the smallest category to optimize
  const sortedCategories = [...categories].sort(
    (a, b) => (cardsByCategory[a]?.length || 0) - (cardsByCategory[b]?.length || 0)
  );
  
  // Get the initial set of cards from the smallest category
  const initialCategory = sortedCategories[0];
  const initialCardIds = new Set(cardsByCategory[initialCategory] || []);
  
  // Filter by each additional category
  const resultIds = sortedCategories.slice(1).reduce((matchingIds, category) => {
    const categoryIds = new Set(cardsByCategory[category] || []);
    return new Set(Array.from(matchingIds).filter(id => categoryIds.has(id)));
  }, initialCardIds);
  
  // Convert IDs to card data
  return Array.from(resultIds)
    .map(id => cardRegistry.get(id)!)
    .filter(Boolean);
}

/**
 * Get cards filtered by a custom predicate function
 * 
 * @param predicate - Function that returns true for cards to include
 * @returns Array of cards that match the predicate
 */
export function getCardsByPredicate(predicate: (card: CardData) => boolean): CardData[] {
  return Array.from(cardRegistry.values()).filter(predicate);
}

/**
 * Check if the registry contains a card with the specified ID
 * 
 * @param id - The ID to check
 * @returns True if a card with the ID exists, false otherwise
 */
export function hasCardWithId(id: number): boolean {
  return cardRegistry.has(id);
}

/**
 * Get the total number of registered cards
 * 
 * @returns The number of cards in the registry
 */
export function getCardCount(): number {
  return cardRegistry.size;
}

/**
 * Get all available categories
 * 
 * @returns Array of all category names
 */
export function getAllCategories(): string[] {
  return Object.keys(cardsByCategory);
}

/**
 * Clear the registry (primarily for testing)
 */
export function clearRegistry(): void {
  cardRegistry.clear();
  Object.keys(cardsByCategory).forEach(key => {
    delete cardsByCategory[key];
  });
  cardNameLookup.clear();
}