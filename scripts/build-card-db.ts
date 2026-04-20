#!/usr/bin/env npx tsx
/**
 * Build Card Database Script
 * 
 * Reads JSON card files, validates them, checks for ID collisions,
 * and generates a TypeScript file for the card database.
 * 
 * Usage:
 *   npx tsx scripts/build-card-db.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { validateCards as validateCardsWithSchema, ValidatedCardData } from '../client/src/game/data/cardJson/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CARDS_JSON_DIR = path.join(__dirname, '../client/src/game/data/cardJson/cards');
const OUTPUT_FILE = path.join(__dirname, '../client/src/game/data/cardJson/generatedCards.ts');
const REGISTRY_PATH = path.join(__dirname, '../client/src/game/data/cardJson/idRegistry.json');

interface RawCardData {
  id: number;
  name: string;
  type: string;
  [key: string]: any;
}

function loadJsonFiles(): RawCardData[] {
  const allCards: RawCardData[] = [];
  
  if (!fs.existsSync(CARDS_JSON_DIR)) {
    console.log('No JSON cards directory found. Creating empty generated file.');
    return allCards;
  }
  
  const files = fs.readdirSync(CARDS_JSON_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(CARDS_JSON_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cards = JSON.parse(content);
      
      if (Array.isArray(cards)) {
        allCards.push(...cards);
        console.log(`Loaded ${cards.length} cards from ${file}`);
      }
    } catch (e) {
      console.error(`Error loading ${file}: ${e}`);
    }
  }
  
  return allCards;
}

function checkCollisions(cards: ValidatedCardData[]): { hasErrors: boolean; duplicates: number[] } {
  const ids = new Map<number, string>();
  const duplicates: number[] = [];
  
  for (const card of cards) {
    if (ids.has(card.id)) {
      console.error(`ID COLLISION: ${card.id} used by both "${ids.get(card.id)}" and "${card.name}"`);
      duplicates.push(card.id);
    } else {
      ids.set(card.id, card.name);
    }
  }
  
  return {
    hasErrors: duplicates.length > 0,
    duplicates,
  };
}

function generateTypeScript(cards: ValidatedCardData[]): string {
  const header = `/**
 * Generated Card Database
 * 
 * DO NOT EDIT MANUALLY - This file is auto-generated from JSON card files.
 * To add/modify cards, edit the JSON files in client/src/game/data/cardJson/cards/
 * Then run: npx tsx scripts/build-card-db.ts
 * 
 * Generated: ${new Date().toISOString()}
 * Total cards: ${cards.length}
 */
import { CardData } from '../../types';

export const generatedCards: CardData[] = `;
  
  const cardsJson = JSON.stringify(cards, null, 2);
  
  return header + cardsJson + ';\n\nexport default generatedCards;\n';
}

function main(): void {
  console.log('\n=== Building Card Database ===\n');
  
  const rawCards = loadJsonFiles();
  console.log(`\nTotal cards loaded: ${rawCards.length}`);
  
  if (rawCards.length === 0) {
    const emptyOutput = `/**
 * Generated Card Database
 * 
 * DO NOT EDIT MANUALLY - This file is auto-generated from JSON card files.
 * Add JSON files to client/src/game/data/cardJson/cards/ then run build.
 */
import { CardData } from '../../types';

export const generatedCards: CardData[] = [];

export default generatedCards;
`;
    fs.writeFileSync(OUTPUT_FILE, emptyOutput);
    console.log('Created empty generated cards file.');
    return;
  }
  
  // Validate cards against zod schema (applies defaults)
  const validation = validateCardsWithSchema(rawCards);
  
  if (!validation.valid) {
    console.error('\nValidation errors:');
    validation.errors.forEach(error => {
      const cardInfo = error.cardId ? `Card ${error.cardId}${error.cardName ? ` (${error.cardName})` : ''}` : 'Card';
      console.error(`  - ${cardInfo} - ${error.field}: ${error.message}`);
    });
    console.error(`\nFailed: ${validation.errors.length} validation error(s) detected`);
    process.exit(1);
  }
  
  // Check for ID collisions in validated cards
  const collisionCheck = checkCollisions(validation.cards);
  if (collisionCheck.hasErrors) {
    console.error('\nID collisions detected! Fix before continuing.');
    process.exit(1);
  }
  
  const output = generateTypeScript(validation.cards);
  fs.writeFileSync(OUTPUT_FILE, output);
  
  console.log(`\nGenerated: ${OUTPUT_FILE}`);
  console.log(`Total valid cards: ${validation.cards.length}`);
}

main();
