#!/usr/bin/env npx tsx
/**
 * Card CLI - Rapid Card Authoring Tool
 * 
 * Commands:
 *   new-card <range> <name>   Create a new card with auto-allocated ID
 *   list-ranges              Show available ID ranges and capacity
 *   validate <file>          Validate a JSON card file
 *   bulk-import <file>       Import cards from JSON and allocate IDs
 * 
 * Examples:
 *   npx tsx scripts/card-cli.ts new-card fire_minions "Ember Hound"
 *   npx tsx scripts/card-cli.ts list-ranges
 *   npx tsx scripts/card-cli.ts validate client/src/game/data/cardJson/cards/fire.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { validateCards as validateCardsWithSchema } from '../client/src/game/data/cardJson/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, '../client/src/game/data/cardJson/idRegistry.json');

interface IdRange {
  start: number;
  end: number;
  nextAvailable: number;
  description: string;
  locked?: boolean;
}

interface IdRegistry {
  ranges: Record<string, IdRange>;
  usedIds: Record<string, number[]>;
}

function loadRegistry(): IdRegistry {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  return JSON.parse(content);
}

function saveRegistry(registry: IdRegistry): void {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function allocateId(rangeKey: string): number {
  const registry = loadRegistry();
  const range = registry.ranges[rangeKey];
  
  if (!range) {
    console.error(`Unknown range: ${rangeKey}`);
    console.log('Available ranges:', Object.keys(registry.ranges).join(', '));
    process.exit(1);
  }
  
  if (range.locked) {
    console.error(`Range '${rangeKey}' is locked: ${range.description}`);
    process.exit(1);
  }
  
  if (range.nextAvailable > range.end) {
    console.error(`Range '${rangeKey}' is exhausted`);
    process.exit(1);
  }
  
  const id = range.nextAvailable;
  range.nextAvailable++;
  
  if (!registry.usedIds[rangeKey]) {
    registry.usedIds[rangeKey] = [];
  }
  registry.usedIds[rangeKey].push(id);
  
  saveRegistry(registry);
  return id;
}

function listRanges(): void {
  const registry = loadRegistry();
  
  console.log('\n=== Card ID Ranges ===\n');
  console.log('Range Key'.padEnd(25) + 'Available'.padEnd(12) + 'Range'.padEnd(15) + 'Description');
  console.log('-'.repeat(80));
  
  for (const [key, range] of Object.entries(registry.ranges)) {
    const total = range.end - range.start + 1;
    const used = range.nextAvailable - range.start;
    const available = total - used;
    const status = range.locked ? ' (LOCKED)' : '';
    
    console.log(
      key.padEnd(25) +
      `${available}/${total}`.padEnd(12) +
      `${range.start}-${range.end}`.padEnd(15) +
      range.description + status
    );
  }
  console.log();
}

function newCard(rangeKey: string, name: string): void {
  const id = allocateId(rangeKey);
  
  const template = {
    id,
    name,
    manaCost: 3,
    attack: 2,
    health: 3,
    description: "TODO: Add description",
    flavorText: "TODO: Add flavor text",
    rarity: "common",
    type: "minion",
    heroClass: "neutral",
    keywords: [],
    categories: [],
    collectible: true
  };
  
  console.log('\n=== New Card Created ===\n');
  console.log(`ID: ${id} (from range: ${rangeKey})`);
  console.log(`Name: ${name}`);
  console.log('\nJSON Template:');
  console.log(JSON.stringify(template, null, 2));
  console.log('\nCopy this to your card JSON file and customize the values.');
}

function validateFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const cards = JSON.parse(content);
    
    if (!Array.isArray(cards)) {
      console.error('File must contain an array of cards');
      process.exit(1);
    }
    
    console.log(`\n=== Validating ${cards.length} cards with schema ===\n`);
    
    // Validate cards against zod schema (applies defaults)
    const validation = validateCardsWithSchema(cards);
    
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
    const ids = new Set<number>();
    const collisionErrors: string[] = [];
    
    for (const card of validation.cards) {
      if (ids.has(card.id)) {
        collisionErrors.push(`ID collision: ${card.id} used by multiple cards`);
      } else {
        ids.add(card.id);
      }
    }
    
    if (collisionErrors.length > 0) {
      console.error('\nID Collision errors:');
      collisionErrors.forEach(e => console.error(`  - ${e}`));
      console.error(`\nFailed: ${collisionErrors.length} collision error(s) detected`);
      process.exit(1);
    }
    
    console.log(`✓ All ${validation.cards.length} cards passed validation with defaults applied.`);
  } catch (e) {
    console.error(`Error parsing file: ${e}`);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list-ranges':
      listRanges();
      break;
      
    case 'new-card':
      if (args.length < 3) {
        console.log('Usage: card-cli new-card <range> <name>');
        console.log('Example: card-cli new-card fire_minions "Ember Hound"');
        process.exit(1);
      }
      newCard(args[1], args.slice(2).join(' '));
      break;
      
    case 'validate':
      if (args.length < 2) {
        console.log('Usage: card-cli validate <file>');
        process.exit(1);
      }
      validateFile(args[1]);
      break;
      
    default:
      console.log(`
Card CLI - Rapid Card Authoring Tool

Commands:
  new-card <range> <name>   Create a new card with auto-allocated ID
  list-ranges               Show available ID ranges and capacity
  validate <file>           Validate a JSON card file

Examples:
  npx tsx scripts/card-cli.ts new-card fire_minions "Ember Hound"
  npx tsx scripts/card-cli.ts list-ranges
`);
  }
}

main();
