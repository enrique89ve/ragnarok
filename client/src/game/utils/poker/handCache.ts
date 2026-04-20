/**
 * Hand Ranking Cache Utility
 * 
 * Caches evaluated poker hands to reduce redundant computations.
 * Uses card signature as cache key for O(1) lookups.
 * 
 * Architecture: Pure utility layer (no React dependencies)
 * Pattern: TSX → Hook → Store → Utils (this file)
 */

import { PokerCard, EvaluatedHand } from '../../types/PokerCombatTypes';
import { findBestHand } from '../../combat/modules/HandEvaluator';

/**
 * Maximum cache entries before eviction.
 * Sized for typical combat session (multiple hands per game).
 */
const MAX_CACHE_SIZE = 100;

/**
 * Cache storage: Maps card signature → evaluated hand
 */
const handCache = new Map<string, EvaluatedHand>();

/**
 * Generate unique signature for a set of cards.
 * Cards are sorted to ensure same hand always produces same key.
 * 
 * @param holeCards - Player's hole cards (2 cards)
 * @param communityCards - Community cards (0-5 cards)
 * @returns Unique string signature for this card combination
 */
function generateCacheKey(holeCards: PokerCard[], communityCards: PokerCard[]): string {
  const allCards = [...holeCards, ...communityCards];
  const sorted = allCards
    .map(c => `${c.suit[0]}${c.numericValue}`)
    .sort()
    .join(',');
  return sorted;
}

/**
 * Get cached hand evaluation or compute and cache if not present.
 * 
 * @param holeCards - Player's hole cards
 * @param communityCards - Community cards on the board
 * @returns Evaluated hand with rank, cards, and multiplier
 */
export function getCachedHandEvaluation(
  holeCards: PokerCard[],
  communityCards: PokerCard[]
): EvaluatedHand {
  const cacheKey = generateCacheKey(holeCards, communityCards);
  
  const cached = handCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const evaluated = findBestHand(holeCards, communityCards);
  
  if (handCache.size >= MAX_CACHE_SIZE) {
    const firstKey = handCache.keys().next().value;
    if (firstKey) {
      handCache.delete(firstKey);
    }
  }
  
  handCache.set(cacheKey, evaluated);
  return evaluated;
}

/**
 * Clear the hand cache.
 * Call at the start of a new combat session.
 */
export function clearHandCache(): void {
  handCache.clear();
}

/**
 * Get current cache size (for debugging/monitoring).
 */
export function getHandCacheSize(): number {
  return handCache.size;
}
