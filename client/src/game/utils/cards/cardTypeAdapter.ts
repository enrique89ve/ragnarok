/**
 * cardTypeAdapter.ts
 * 
 * This module provides a sophisticated type system and adapter functions to bridge
 * between the legacy card system and the new premium card system.
 * 
 * It implements best practices for TypeScript type safety with:
 * - Type guards for runtime validation
 * - Adapter functions with proper error handling
 * - Comprehensive type definitions
 * - No compromises on type safety or performance
 */

import { 
  CardData, 
  CardType, 
  CardTransformObject, 
  CardEffectObject, 
  CardQuality 
} from '../../types';
import { CardInstanceWithCardData, isCardInstanceWithCardData } from '../../types/interfaceExtensions';
import { 
  isValidCard as isValidCardBase,
  isCardTransformObject,
  isCardEffectObject 
} from './cardDataValidator';
import { debug } from '../../config/debugConfig';

/**
 * Unified card type that can represent both legacy CardData and CardInstanceWithCardData
 */
export type UnifiedCard = CardData | CardInstanceWithCardData;

/**
 * Extended options for premium card rendering
 */
export interface PremiumCardOptions {
  quality: CardQuality;
  showStats: boolean;
  showText: boolean;
  showFrame: boolean;
  showEffects: boolean;
  // Advanced rendering options
  useAdvancedShaders: boolean;
  useNoiseEffects: boolean;
  usePremiumTransitions: boolean;
  useHighResolution: boolean;
  useDetailedTextures: boolean;
  useReflections: boolean;
  scale: number;
}

/**
 * Default premium card options with high-quality settings
 */
export const DEFAULT_PREMIUM_OPTIONS: PremiumCardOptions = {
  quality: 'normal',
  showStats: true,
  showText: true,
  showFrame: true,
  showEffects: true,
  useAdvancedShaders: true,
  useNoiseEffects: true,
  usePremiumTransitions: true,
  useHighResolution: true,
  useDetailedTextures: true,
  useReflections: true,
  scale: 1.0
};

/**
 * Type guard to check if an object is a valid CardData
 * Uses the central validation logic from cardDataValidator for consistency
 */
export function isCardData(obj: any): obj is CardData {
  return isValidCardBase(obj);
}

/**
 * Checks if an object might be a card effect rather than a card itself
 * Uses the central validation logic from cardDataValidator for consistency
 */
export function isCardEffect(obj: any): obj is CardEffectObject {
  return isCardEffectObject(obj);
}

/**
 * Checks if an object is a transform object rather than a card
 */
export function isTransformObject(obj: any): obj is CardTransformObject {
  return isCardTransformObject(obj);
}

/**
 * Type guard that ensures a card exists and is valid
 * This uses the central validation logic and adds handling for CardInstanceWithCardData
 */
export function validateCard(card: any): card is UnifiedCard {
  if (!card) {
    debug.warn('Null or undefined card data was passed', card);
    return false;
  }
  
  // First check for transform objects or effect objects that aren't cards
  if (isTransformObject(card) || isCardEffect(card)) {
    return false;
  }
  
  // Check if it's a CardInstanceWithCardData
  if (isCardInstanceWithCardData(card)) {
    // Ensure the nested card is valid
    if (!card.card) {
      debug.warn('Card instance has no card data:', card);
      return false;
    }
    return isCardData(card.card);
  }
  
  // Otherwise, validate it directly as a card
  return isCardData(card);
}

/**
 * Extracts the CardData from any UnifiedCard type
 * Handles error cases with descriptive error messages and includes safety checks
 * 
 * @param card The card object to extract data from
 * @returns The extracted CardData
 * @throws Error if card is invalid
 */
export function extractCardData(card: UnifiedCard): CardData {
  if (!card) {
    throw new Error('Cannot extract card data from undefined or null');
  }
  
  // Check for invalid object types
  if (isCardEffect(card)) {
    throw new Error(`Cannot extract card data from a card effect object: ${JSON.stringify(card)}`);
  }
  
  if (isTransformObject(card)) {
    throw new Error(`Cannot extract card data from a transform object: ${JSON.stringify(card)}`);
  }

  // If it's a CardInstanceWithCardData, return the nested card
  if (isCardInstanceWithCardData(card)) {
    if (!card.card) {
      throw new Error('Card instance has no card data');
    }
    // Ensure the nested card is valid
    if (!isCardData(card.card)) {
      throw new Error(`Card instance contains invalid card data: ${JSON.stringify(card.card)}`);
    }
    return card.card;
  }

  // Handle CardInstance objects from the hand array that don't follow CardInstanceWithCardData pattern
  // but still have a card property
  if (typeof card === 'object' && card !== null && 'card' in card && card.card) {
    // The card might be a raw CardInstance from the old system
    const nestedCard = (card as { card: CardData }).card;
    if (isCardData(nestedCard)) {
      return nestedCard;
    }
  }
  
  // If it's already a CardData, return it directly
  if (isCardData(card)) {
    return card;
  }

  // Additional safety for malformed card objects
  if (typeof card === 'object' && Object.keys(card).length === 0) {
    throw new Error('Cannot extract card data from empty object');
  }

  throw new Error(`Invalid card data: ${JSON.stringify(card)}`);
}

/**
 * Creates a CardInstanceWithCardData from a CardData
 * This allows legacy card data to be used with the premium system
 * 
 * @param card The card data to wrap
 * @returns A CardInstanceWithCardData object
 */
export function createCardInstance(card: CardData): CardInstanceWithCardData {
  if (!isCardData(card)) {
    throw new Error(`Cannot create card instance from invalid card: ${JSON.stringify(card)}`);
  }

  // Get health based on card type
  let currentHealth: number | undefined;
  if ('health' in card) {
    currentHealth = card.health;
  }

  return {
    instanceId: `instance-${card.id}-${Date.now()}`,
    card,
    // Add default instance properties
    currentHealth,
    canAttack: false,
    isPlayed: false,
    isSummoningSick: true,
    hasDivineShield: card.keywords?.includes('divine_shield') ?? false,
    attacksPerformed: 0,
    isPoisonous: card.keywords?.includes('poisonous') ?? false,
    hasLifesteal: card.keywords?.includes('lifesteal') ?? false
  };
}

/**
 * Gets the appropriate quality setting based on card rarity
 */
export function getCardQualityFromRarity(card: UnifiedCard): CardQuality {
  const cardData = extractCardData(card);
  
  switch (cardData.rarity) {
    case 'mythic':
      return 'golden';
    case 'epic':
      return 'premium';
    default:
      return 'normal';
  }
}

/**
 * Determines if a card should use the premium renderer
 * The logic can be customized based on requirements
 */
export function shouldUsePremiumRenderer(card: UnifiedCard, isInHand: boolean = false): boolean {
  const cardData = extractCardData(card);
  
  // Always use premium rendering for cards in hand 
  if (isInHand) {
    return true;
  }
  
  // Premium rendering for all collectible cards
  if (cardData.collectible) {
    return true;
  }
  
  // For tokens and other cards, only use premium for special rarities
  return cardData.rarity === 'mythic' || cardData.rarity === 'epic';
}

/**
 * Get premium options for a card based on its properties
 */
export function getPremiumOptionsForCard(card: UnifiedCard): PremiumCardOptions {
  const cardData = extractCardData(card);
  
  return {
    ...DEFAULT_PREMIUM_OPTIONS,
    quality: getCardQualityFromRarity(card),
    // Special cards get enhanced effects
    useNoiseEffects: cardData.rarity === 'mythic' || cardData.rarity === 'epic' || DEFAULT_PREMIUM_OPTIONS.useNoiseEffects,
    scale: cardData.type === 'minion' ? 0.95 : 0.9 // Slightly smaller scale for non-minions
  };
}

/**
 * Add debugging information to help track card rendering
 */
export function logCardRendering(card: UnifiedCard, renderer: string): void {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const cardData = extractCardData(card);
      debug.card(
        `Rendering card ${cardData.name} (ID: ${cardData.id}) with ${renderer} renderer`
      );
    } catch (err) {
      debug.error('Error logging card rendering:', err);
    }
  }
}