/**
 * Card Data Validator
 * 
 * This utility contains robust validation functions to ensure data integrity
 * in the card system. It prevents transform objects and other invalid data
 * from entering the card database, and ensures all cards follow a consistent schema.
 */
import { 
  CardData, 
  CardType, 
  CardTransformObject,
  CardEffectObject
} from '../../types';
import { hasAllRequiredFields, normalizeCard } from './cardSchemaValidator';
import { debug } from '../../config/debugConfig';

/**
 * Type guard to check if an object is a card transform object
 * 
 * @param obj Any object to check
 * @returns Whether the object is a card transform object
 */
export function isCardTransformObject(obj: any): obj is CardTransformObject {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check for explicit transform type
  if (obj.type === 'transform') return true;
  
  // Check for 3D transform properties
  if (obj.position !== undefined && 
      obj.rotation !== undefined && 
      obj.scale !== undefined) return true;
  
  return false;
}

/**
 * Type guard to check if an object is a card effect object
 * 
 * @param obj Any object to check
 * @returns Whether the object is a card effect object
 */
export function isCardEffectObject(obj: any): obj is CardEffectObject {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check for properties unique to effect objects
  if (obj.targetType !== undefined && obj.requiresTarget !== undefined) {
    // If it has these effect properties but is missing essential card properties,
    // it's likely an effect object, not a card
    if (!obj.id || !obj.name) {
      return true;
    }
  }
  
  // Check for other effect properties
  if ((obj.value !== undefined && typeof obj.value === 'number') &&
      (obj.isRepeatable !== undefined || obj.effectType !== undefined) &&
      // Spells can have similar properties but aren't effects
      obj.type !== 'spell' && 
      // Must be missing essential card properties
      (!obj.id || !obj.name)) {
    return true;
  }
  
  return false;
}

/**
 * Type predicate for determining if an object is a valid card with required properties
 * 
 * @param obj Any object to validate as a card
 * @returns Type predicate indicating if the object is a valid CardData
 */
export function isValidCard(obj: any): obj is CardData {
  // Skip null or undefined entries
  if (!obj) return false;
  
  // Check for required card properties that all cards must have
  const hasRequiredProps = 
    obj.id !== undefined && 
    obj.name !== undefined && 
    obj.type !== undefined;
  
  if (!hasRequiredProps) {
    if (obj.collectible) {
      debug.warn('❌ Card validation: Invalid card object without required properties:', obj);
    }
    return false;
  }
  
  // First check if this is a transform or effect object (not a card)
  if (isCardTransformObject(obj) || isCardEffectObject(obj)) {
    if (obj.collectible) {
      debug.warn('❌ Card validation: Filtered out transform/effect object wrongly marked as collectible:', obj);
    }
    return false;
  }
  
  // Check for valid card types 
  const validTypes: CardType[] = ['minion', 'spell', 'weapon', 'hero', 'secret', 'location'];
  if (!validTypes.includes(obj.type)) {
    debug.warn(`❌ Card validation: Filtered out card with invalid type (${obj.type}):`, obj);
    return false;
  }
  
  // Type-specific validation
  switch (obj.type) {
    case 'minion':
      // Minions should have attack and health properties (even if they're 0)
      if (obj.attack === undefined && obj.health === undefined) {
        debug.warn('❌ Card validation: Invalid minion card missing attack/health:', obj);
        return false;
      }
      break;
      
    case 'weapon':
      // Weapons should have attack and durability
      if (obj.attack === undefined && obj.durability === undefined) {
        debug.warn('❌ Card validation: Invalid weapon card missing attack/durability:', obj);
        return false;
      }
      break;
      
    case 'spell':
      // Spells should have manaCost and description
      if (obj.manaCost === undefined) {
        debug.warn('❌ Card validation: Invalid spell card missing manaCost:', obj);
        return false;
      }
      break;
  }
  
  // Passed all checks - this appears to be a valid card
  return true;
}

/**
 * Enhanced card validation that also ensures schema consistency
 * This checks both the basic validity and schema requirements
 * 
 * @param obj Any object to validate as a card
 * @returns Type predicate indicating if the object is a valid card meeting schema requirements
 */
export function isSchemaValidCard(obj: any): obj is CardData {
  // First check basic validity
  if (!isValidCard(obj)) {
    return false;
  }
  
  // Then check schema requirements
  return hasAllRequiredFields(obj);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use isCardEffectObject instead
 */
export function isEffectObject(obj: any): boolean {
  return isCardEffectObject(obj);
}

/**
 * Sanitize an array of potential card data objects
 * Removes any objects that are not valid cards.
 * 
 * @param cards Array of potential card objects
 * @param normalizeCards Whether to normalize cards to ensure schema consistency
 * @returns Filtered array with only valid cards
 */
export function sanitizeCardArray(cards: any[], normalizeCards: boolean = true): CardData[] {
  if (!Array.isArray(cards)) {
    debug.warn('❌ Card validation: Expected an array but received:', cards);
    return [];
  }
  
  const originalLength = cards.length;
  let validCards = cards.filter(isValidCard);
  
  if (validCards.length !== originalLength) {
  }
  
  // Optionally normalize the cards to ensure schema consistency
  if (normalizeCards) {
    try {
      const normalizedResult: CardData[] = [];
      let normalizeFailures = 0;
      
      for (const card of validCards) {
        try {
          normalizedResult.push(normalizeCard(card));
        } catch (error) {
          normalizeFailures++;
          debug.warn(`Failed to normalize card:`, error, card);
        }
      }
      
      if (normalizeFailures > 0) {
      }
      
      validCards = normalizedResult;
    } catch (error) {
      debug.error('Error during card normalization:', error);
      // Fall back to just the filtered cards without normalization
    }
  }
  
  return validCards;
}

/**
 * Safe wrapper for card arrays that ensures type safety and data validity
 * Use this when importing card collections to ensure they're properly sanitized
 * 
 * @param cards Card array or any data that should be a card array
 * @param normalizeCards Whether to normalize cards to ensure schema consistency
 * @returns Sanitized array of valid cards
 */
export function safeCardArray(cards: any, normalizeCards: boolean = true): CardData[] {
  // Handle null or undefined
  if (!cards) {
    debug.warn('❌ Card validation: Received null or undefined instead of card array');
    return [];
  }
  
  // Handle non-arrays
  if (!Array.isArray(cards)) {
    debug.warn('❌ Card validation: Expected card array but received:', typeof cards);
    return [];
  }
  
  return sanitizeCardArray(cards, normalizeCards);
}

/**
 * Export validation functions to be used in other modules
 */
export default {
  isValidCard,
  isSchemaValidCard,
  isEffectObject,
  sanitizeCardArray,
  safeCardArray
};