/**
 * Utility functions for random number generation
 */

/**
 * Get a random integer between min and max (inclusive)
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns Random integer between min and max
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle an array using the Fisher-Yates algorithm
 * @param array Array to shuffle
 * @returns Shuffled array (modifies the original)
 */
export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getRandomInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Pick a random element from an array
 * @param array Array to pick from
 * @returns Random element from the array or undefined if the array is empty
 */
export function getRandomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[getRandomInt(0, array.length - 1)];
}

/**
 * Pick a random subset of elements from an array
 * @param array Array to pick from
 * @param count Number of elements to pick
 * @returns Array of randomly selected elements
 */
export function getRandomSubset<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array]; // Return a copy if count is larger than array
  const shuffled = shuffleArray([...array]); // Create a copy and shuffle
  return shuffled.slice(0, count);
}