/**
 * Utility functions for random number generation.
 *
 * All randomness is routed through `cryptoRng` (CSPRNG) so that:
 *  - Single-player / local-AI paths are crypto-grade (no Math.random bias)
 *  - P2P paths can later swap in a SeededRng without touching callers
 */
import { getCardsRng } from './cardsCommandRng';

/**
 * Get a random integer between min and max (inclusive).
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(getCardsRng()() * (max - min + 1)) + min;
}

/**
 * Shuffle an array in-place using Fisher-Yates algorithm.
 * Returns the same array (mutated).
 */
export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getRandomInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Pick a random element from an array.
 * Returns `undefined` if the array is empty.
 */
export function getRandomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[getRandomInt(0, array.length - 1)];
}

/**
 * Pick a random subset of elements from an array (non-mutating).
 */
export function getRandomSubset<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array];
  const shuffled = shuffleArray([...array]);
  return shuffled.slice(0, count);
}
