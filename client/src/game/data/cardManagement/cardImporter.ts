/**
 * Card Importer System
 * 
 * Provides utilities for importing cards from external data sources.
 * This makes it easier to batch import cards from JSON or other formats.
 */
import { CardData } from '../../types';
import { createCard } from './cardBuilder';
import { debug } from '../../config/debugConfig';

/**
 * External card data format (e.g., from JSON)
 */
interface ExternalCardData {
  id: number;
  name: string;
  cost: number;
  description?: string;
  type: string;
  rarity: string;
  attack?: number;
  health?: number;
  durability?: number;
  class?: string;
  race?: string;
  tribe?: string;
  keywords?: string[];
  set?: string;
  collectible?: boolean;
  mechanics?: string[];
  effects?: {
    type: string;
    value?: number;
    targetType?: string;
    [key: string]: any;
  }[];
  [key: string]: any;
}

/**
 * Import cards from external data format (JSON, etc.)
 * 
 * @param externalCards - Array of external card data to import
 * @returns Array of successfully imported cards
 */
export function importCards(externalCards: ExternalCardData[]): CardData[] {
  const importedCards: CardData[] = [];
  const errors: string[] = [];
  
  for (const externalCard of externalCards) {
    try {
      // Start building the card with required fields
      let cardBuilder = createCard()
        .id(externalCard.id)
        .name(externalCard.name)
        .manaCost(externalCard.cost)
        .type(externalCard.type as any)
        .rarity(externalCard.rarity as any);
      
      // Add optional properties if they exist
      if (externalCard.description) {
        cardBuilder = cardBuilder.description(externalCard.description);
      }
      
      if (externalCard.attack !== undefined) {
        cardBuilder = cardBuilder.attack(externalCard.attack);
      }
      
      if (externalCard.health !== undefined) {
        cardBuilder = cardBuilder.health(externalCard.health);
      }
      
      if (externalCard.durability !== undefined) {
        cardBuilder = cardBuilder.durability(externalCard.durability);
      }
      
      if (externalCard.class) {
        cardBuilder = cardBuilder.heroClass(externalCard.class);
      }
      
      if (externalCard.race) {
        cardBuilder = cardBuilder.race(externalCard.race);
      }
      
      if (externalCard.tribe) {
        cardBuilder = cardBuilder.tribe(externalCard.tribe);
      }
      
      if (externalCard.set) {
        cardBuilder = cardBuilder.set(externalCard.set);
      }
      
      if (externalCard.collectible !== undefined) {
        cardBuilder = cardBuilder.collectible(externalCard.collectible);
      }
      
      // Add keywords
      if (externalCard.keywords && Array.isArray(externalCard.keywords)) {
        for (const keyword of externalCard.keywords) {
          cardBuilder = cardBuilder.addKeyword(keyword as any);
        }
      }
      
      // Add mechanics for compatibility
      if (externalCard.mechanics && Array.isArray(externalCard.mechanics)) {
        cardBuilder = cardBuilder.mechanics(externalCard.mechanics);
      }
      
      // Process effects
      if (externalCard.effects && Array.isArray(externalCard.effects)) {
        for (const effect of externalCard.effects) {
          // Determine effect type from context or explicit type
          const effectCategory = 
            (externalCard.keywords?.includes('battlecry') && !effect.effectType) ? 'battlecry' :
            (externalCard.keywords?.includes('deathrattle') && !effect.effectType) ? 'deathrattle' :
            (externalCard.type === 'spell' && !effect.effectType) ? 'spell' :
            effect.effectType || 'unknown';
          
          switch (effectCategory) {
            case 'battlecry':
              cardBuilder = cardBuilder.battlecry(effect as any);
              break;
            case 'deathrattle':
              cardBuilder = cardBuilder.deathrattle(effect as any);
              break;
            case 'spell':
              cardBuilder = cardBuilder.spellEffect(effect as any);
              break;
            default:
              debug.warn(`Unknown effect type for card ${externalCard.name}: ${effectCategory}`);
          }
        }
      }
      
      // Build and register the card
      const card = cardBuilder.build();
      importedCards.push(card);
    } catch (error) {
      const errorMessage = `Error importing card ${externalCard.name} (ID: ${externalCard.id}): ${error instanceof Error ? error.message : String(error)}`;
      debug.error(errorMessage);
      errors.push(errorMessage);
    }
  }
  
  // Report import results
  debug.card(`Imported ${importedCards.length} cards successfully`);
  if (errors.length > 0) {
    debug.warn(`Failed to import ${errors.length} cards`);
  }
  
  return importedCards;
}

/**
 * Import cards from a JSON string
 * 
 * @param jsonData - JSON string containing card data
 * @returns Array of successfully imported cards
 */
export function importCardsFromJson(jsonData: string): CardData[] {
  try {
    const parsedData = JSON.parse(jsonData) as ExternalCardData[];
    return importCards(parsedData);
  } catch (error) {
    debug.error('Error parsing JSON card data:', error);
    return [];
  }
}

/**
 * Import cards directly from a file (for Node.js environments)
 * This is primarily used in build scripts, not in the browser
 * 
 * @param filePath - Path to the JSON file
 * @returns Array of successfully imported cards
 */
export async function importCardsFromFile(filePath: string): Promise<CardData[]> {
  // This assumes a Node.js environment, so we check for it
  if (typeof window !== 'undefined') {
    debug.error('importCardsFromFile can only be used in Node.js environments');
    return [];
  }

  try {
    // Dynamic import to avoid bundling fs module in browser builds
    const fs = await import('fs/promises');
    const jsonData = await fs.readFile(filePath, 'utf8');
    return importCardsFromJson(jsonData);
  } catch (error) {
    debug.error(`Error importing cards from file ${filePath}:`, error);
    return [];
  }
}