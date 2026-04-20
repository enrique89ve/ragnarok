/**
 * Card JSON System - Public API
 * 
 * This module provides tools for rapid card authoring using JSON data files.
 * 
 * ## Quick Start
 * 
 * 1. Create a new card with auto-assigned ID:
 *    npx tsx scripts/card-cli.ts new-card fire_minions "Ember Hound"
 * 
 * 2. List available ID ranges:
 *    npx tsx scripts/card-cli.ts list-ranges
 * 
 * 3. Validate card JSON files:
 *    npx tsx scripts/card-cli.ts validate client/src/game/data/cardJson/cards/fire.json
 * 
 * 4. Rebuild the card database from JSON:
 *    npx tsx scripts/build-card-db.ts
 */

export { generatedCards } from './generatedCards';
export { validateCards, validateSingleCard, CardDataSchema } from './schema';
