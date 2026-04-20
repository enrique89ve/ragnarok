/**
 * Card Schema Validator
 * 
 * This utility provides functions to validate and normalize card data against a consistent schema.
 * It ensures all cards have the required fields and follow a consistent structure.
 */

import { CardData } from '../../types';
import { debug } from '../../config/debugConfig';

/**
 * Required fields for all cards regardless of type
 */
const REQUIRED_CARD_FIELDS = ['id', 'name', 'type', 'rarity', 'class', 'collectible'];

/**
 * Type-specific required fields
 */
const TYPE_SPECIFIC_REQUIRED_FIELDS = {
  minion: ['manaCost', 'attack', 'health'],
  spell: ['manaCost', 'description'],
  weapon: ['manaCost', 'attack', 'durability'],
  hero: ['manaCost', 'armor'],
  secret: ['manaCost', 'description'],
  location: ['manaCost', 'durability']
};

/**
 * Valid card types
 */
const VALID_CARD_TYPES = ['minion', 'spell', 'weapon', 'hero', 'secret', 'location'];

/**
 * Valid card rarities
 */
const VALID_RARITIES = ['free', 'basic', 'common', 'rare', 'epic', 'mythic'];

/**
 * Ensures a card has all required fields based on its type
 * 
 * @param card Card data to validate
 * @returns Whether the card has all required fields
 */
export function hasAllRequiredFields(card: any): boolean {
  if (!card || typeof card !== 'object') {
    return false;
  }

  // Check common required fields
  for (const field of REQUIRED_CARD_FIELDS) {
    if (card[field] === undefined) {
      return false;
    }
  }

  // Check type-specific required fields
  const cardType = card.type;
  if (!VALID_CARD_TYPES.includes(cardType)) {
    return false;
  }

  const typeSpecificFields = TYPE_SPECIFIC_REQUIRED_FIELDS[cardType as keyof typeof TYPE_SPECIFIC_REQUIRED_FIELDS];
  if (typeSpecificFields) {
    for (const field of typeSpecificFields) {
      // Only manaCost is strictly required, other fields can be 0
      if (field === 'manaCost' && card[field] === undefined) {
        return false;
      } else if (card[field] === undefined && card[field] !== 0) {
        // Allow 0 values for attack, health, etc.
        return false;
      }
    }
  }

  return true;
}

/**
 * Provides a consistent valid value for undefined fields
 */
type DefaultValueMap = {
  [key: string]: any;
};

/**
 * Default values for common fields
 */
const DEFAULT_VALUES: DefaultValueMap = {
  rarity: 'common',
  collectible: false,
  keywords: [],
  flavorText: '',
  description: ''
};

/**
 * Type-specific default values
 */
const TYPE_DEFAULT_VALUES: Record<string, DefaultValueMap> = {
  minion: {
    attack: 1,
    health: 1
  },
  spell: {},
  weapon: {
    attack: 1,
    durability: 2
  },
  hero: {
    armor: 0
  },
  secret: {},
  location: {
    durability: 3
  }
};

/**
 * Normalizes a card by ensuring all required fields have valid values
 * If fields are missing, it adds default values to make the card valid
 * 
 * @param card Card data to normalize
 * @returns Normalized card data
 */
export function normalizeCard<T extends Partial<CardData>>(card: T): T & Required<Pick<CardData, 'id' | 'name' | 'type' | 'class' | 'collectible'>> {
  if (!card || typeof card !== 'object') {
    throw new Error('Cannot normalize invalid card data');
  }

  // Check if card has minimum required properties
  if (!card.id || !card.name || !card.type) {
    throw new Error('Cannot normalize card missing essential properties (id, name, or type)');
  }

  // Type must be valid
  if (!VALID_CARD_TYPES.includes(card.type)) {
    throw new Error(`Invalid card type: ${card.type}`);
  }

  // Create a copy to avoid mutating the original
  const normalized = { ...card };

  // Apply common default values for undefined fields
  for (const [field, defaultValue] of Object.entries(DEFAULT_VALUES)) {
    if (normalized[field as keyof typeof normalized] === undefined) {
      normalized[field as keyof typeof normalized] = defaultValue;
    }
  }

  // Apply type-specific default values
  const typeDefaults = TYPE_DEFAULT_VALUES[card.type];
  if (typeDefaults) {
    for (const [field, defaultValue] of Object.entries(typeDefaults)) {
      if (normalized[field as keyof typeof normalized] === undefined) {
        normalized[field as keyof typeof normalized] = defaultValue;
      }
    }
  }

  // Ensure class is capitalized
  if (normalized.class) {
    const className = normalized.class as string;
    normalized.class = className.charAt(0).toUpperCase() + className.slice(1);
  } else if (normalized.heroClass) {
    // Copy heroClass to class if class is missing
    const heroClass = normalized.heroClass as string;
    normalized.class = heroClass.charAt(0).toUpperCase() + heroClass.slice(1);
  } else {
    // Default to Neutral if no class information is available
    normalized.class = 'Neutral';
  }

  // Ensure consistent array types
  if (!normalized.keywords || !Array.isArray(normalized.keywords)) {
    normalized.keywords = [];
  }

  return normalized as T & Required<Pick<CardData, 'id' | 'name' | 'type' | 'class' | 'collectible'>>;
}

/**
 * Performs a deep validation of the card schema
 * This goes beyond basic field presence to check valid values, field types, etc.
 * 
 * @param card Card data to validate
 * @returns An object with validation result and any errors
 */
export function validateCardSchema(card: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!card || typeof card !== 'object') {
    return { valid: false, errors: ['Not a valid card object'] };
  }

  // Check ID
  if (card.id === undefined) {
    errors.push('Missing required field: id');
  } else if (typeof card.id !== 'number' && typeof card.id !== 'string') {
    errors.push(`Invalid id type: ${typeof card.id}, should be number or string`);
  }

  // Check name
  if (!card.name) {
    errors.push('Missing required field: name');
  } else if (typeof card.name !== 'string') {
    errors.push(`Invalid name type: ${typeof card.name}, should be string`);
  }

  // Check type
  if (!card.type) {
    errors.push('Missing required field: type');
  } else if (!VALID_CARD_TYPES.includes(card.type)) {
    errors.push(`Invalid type: ${card.type}. Valid types are: ${VALID_CARD_TYPES.join(', ')}`);
  }

  // Check rarity
  if (card.rarity && !VALID_RARITIES.includes(card.rarity)) {
    errors.push(`Invalid rarity: ${card.rarity}. Valid rarities are: ${VALID_RARITIES.join(', ')}`);
  }

  // Type-specific validations
  if (card.type === 'minion') {
    if (card.attack === undefined && card.health === undefined) {
      errors.push('Minion cards require attack and health properties');
    }
  } else if (card.type === 'spell') {
    if (card.manaCost === undefined) {
      errors.push('Spell cards require manaCost property');
    }
  } else if (card.type === 'weapon') {
    if (card.attack === undefined && card.durability === undefined) {
      errors.push('Weapon cards require attack and durability properties');
    }
  }

  // Check for any effect objects that have collectible set to true
  if (card.collectible === true) {
    // Verify it's not an effect object
    if ((card.requiresTarget !== undefined && card.targetType !== undefined) &&
        (card.id === undefined || card.name === undefined)) {
      errors.push('Effect object incorrectly marked as collectible');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Bulk process an array of cards to normalize them all
 * 
 * @param cards Array of card data
 * @returns Array of normalized cards (invalid cards are filtered out)
 */
export function normalizeCardArray(cards: any[]): CardData[] {
  if (!Array.isArray(cards)) {
    debug.warn('Expected an array of cards for normalization');
    return [];
  }

  const result: CardData[] = [];
  let invalidCount = 0;

  for (const card of cards) {
    try {
      // Skip non-normalizable cards
      if (!card || typeof card !== 'object' || !card.id || !card.name || !card.type) {
        invalidCount++;
        continue;
      }

      const normalized = normalizeCard(card);
      result.push(normalized);
    } catch (error) {
      debug.warn('Could not normalize card:', error, card);
      invalidCount++;
    }
  }

  if (invalidCount > 0) {
  }

  return result;
}

export default {
  hasAllRequiredFields,
  normalizeCard,
  validateCardSchema,
  normalizeCardArray,
  VALID_CARD_TYPES,
  VALID_RARITIES
};