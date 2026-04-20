/**
 * Graveyard Tracker Module
 * 
 * This module manages the tracking of dead minions in a graveyard for use
 * with Necromancer class cards and other grave-related mechanics.
 * 
 * The graveyard is implemented as a FIFO (First In, First Out) queue with a maximum size.
 * When a new minion dies, it's added to the end of the queue, and if the queue exceeds
 * the maximum size, the oldest entry is removed.
 */

// Define the maximum number of minions to track in the graveyard
const MAX_GRAVEYARD_SIZE = 5;

// Define the structure of a minion in the graveyard
export interface GraveyardMinion {
  id: number;
  name: string;
  attack: number;
  health: number;
  maxHealth: number;
  type: string;
  race?: string;
  manaCost: number;
  keywords: string[];
  effects: Record<string, any>; // Any special effects the minion had
  class: string;
  rarity: string;
  description?: string;
  flavorText?: string;
}

// Initialize the graveyard as an empty array
import { debug } from '../../config/debugConfig';

let graveyard: GraveyardMinion[] = [];

/**
 * Add a minion to the graveyard
 * 
 * @param minion The minion card to add to the graveyard
 */
export function addToGraveyard(minion: GraveyardMinion): void {
  // Add the minion to the end of the graveyard
  graveyard.push(minion);
  
  // If graveyard exceeds maximum size, remove the oldest entry
  if (graveyard.length > MAX_GRAVEYARD_SIZE) {
    graveyard.shift();
  }
  
  debug.card(`Added ${minion.name} to graveyard. Current graveyard size: ${graveyard.length}`);
}

/**
 * Get all minions currently in the graveyard
 * 
 * @returns Array of minions in the graveyard
 */
export function getGraveyard(): GraveyardMinion[] {
  return [...graveyard]; // Return a copy to prevent external modification
}

/**
 * Get minions in the graveyard that match a specific race
 * 
 * @param race The race to filter by (e.g., "undead", "beast", etc.)
 * @returns Array of minions in the graveyard matching the specified race
 */
export function getGraveyardByRace(race: string): GraveyardMinion[] {
  return graveyard.filter(minion => minion.race?.toLowerCase() === race.toLowerCase());
}

/**
 * Count the number of minions in the graveyard that match a specific race
 * 
 * @param race The race to count (e.g., "undead", "beast", etc.)
 * @returns Number of minions of the specified race in the graveyard
 */
export function countGraveyardByRace(race: string): number {
  return getGraveyardByRace(race).length;
}

/**
 * Clear the graveyard (typically used when starting a new game)
 */
export function clearGraveyard(): void {
  graveyard = [];
  debug.card('Graveyard cleared');
}

/**
 * Get a random minion from the graveyard
 * 
 * @returns A random minion from the graveyard, or undefined if the graveyard is empty
 */
export function getRandomGraveyardMinion(): GraveyardMinion | undefined {
  if (graveyard.length === 0) {
    return undefined;
  }
  
  const randomIndex = Math.floor(Math.random() * graveyard.length);
  return graveyard[randomIndex];
}

/**
 * Find a specific minion in the graveyard by ID
 * 
 * @param id The ID of the minion to find
 * @returns The minion if found, undefined otherwise
 */
export function findGraveyardMinionById(id: number): GraveyardMinion | undefined {
  return graveyard.find(minion => minion.id === id);
}