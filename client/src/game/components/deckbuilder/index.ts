/**
 * Deck Builder Module
 * 
 * Feature-first modular structure:
 * - useDeckBuilder.ts  → Hook with all state and logic
 * - utils.ts           → Pure functions (no React)
 * - tokens.css         → Design tokens
 * - index.ts           → Public exports
 * 
 * The main HeroDeckBuilder.tsx component lives in the parent folder
 * and imports from this module.
 */

export { useDeckBuilder } from './useDeckBuilder';
export type { UseDeckBuilderProps, UseDeckBuilderReturn, CardGroup } from './useDeckBuilder';

export {
  DECK_SIZE,
  MAX_COPIES,
  MAX_MYTHIC_COPIES,
  countCards,
  isCardMythic,
  getMaxCopies,
  canAddCardToDeck,
  getCardClass,
  isClassCard,
  filterCardsByClass,
  filterCards,
  sortCards,
  filterAndSortCards,
  getDeckCardsWithCounts,
  generateAutoFillCards,
} from './utils';
export type { SortOption, FilterType, CardFilters } from './utils';
