/**
 * cardInstanceAdapter.ts
 * 
 * This utility provides adapter functions for converting between different card data formats
 * during the transition from legacy card system to premium card system.
 * 
 * It bridges the gap between:
 * - CardInstance (from client/src/game/types/CardTypes.ts)
 * - CardInstanceWithCardData (from client/src/game/types/interfaceExtensions.ts)
 */

import { v4 as uuidv4 } from 'uuid';
import { CardInstance } from '../../types/CardTypes';
import { CardInstanceWithCardData } from '../../types/interfaceExtensions';
import { Position } from '../../types/Position';
import { debug } from '../../config/debugConfig';

/**
 * Debug logging helper for card adapter operations
 * Set DEBUG_CARD_ADAPTER = true to enable debug logging
 */
const DEBUG_CARD_ADAPTER = false;

function debugCardAdapter(message: string, data?: any): void {
  if (DEBUG_CARD_ADAPTER) {
    debug.card(`[CardAdapter] ${message}`, data);
  }
}


/**
 * Converts a CardInstance to a CardInstanceWithCardData format
 * 
 * This allows legacy CardInstance objects to be used with the premium card system
 * without requiring changes to upstream components.
 * 
 * @param card Original card data in either legacy or new format
 * @returns CardInstanceWithCardData format for premium rendering
 */
export function adaptCardInstance(
  card: CardInstance | CardInstanceWithCardData
): CardInstanceWithCardData {
  // Handle null or undefined card
  if (!card) {
    debug.error("Attempted to adapt null or undefined card");
    return createFallbackCardInstance();
  }

  debugCardAdapter("Adapting card instance", card);

  // If it's already in CardInstanceWithCardData format, return a copy with validated fields
  if ('card' in card && typeof card.card === 'object') {
    // Ensure it has all required fields, even in the premium format
    const result = { ...card } as CardInstanceWithCardData;
    
    // Make sure card.card is not null
    if (!result.card) {
      result.card = {
        id: 0,
        name: "Invalid Card",
        type: "minion",
        manaCost: 0,
        collectible: false
      };
    }
    
    // Ensure all required fields are present
    result.card.manaCost = result.card.manaCost ?? (result.card as any).cost ?? 0;
    result.card.description = result.card.description || (result.card as any).text || "";
    result.card.keywords = result.card.keywords || [];
    
    // Ensure instance level properties are set
    result.instanceId = result.instanceId || uuidv4();
    result.currentHealth = result.currentHealth ?? (result.card as any).health;
    result.currentAttack = (result as any).currentAttack ?? (result.card as any).attack;
    result.mechAttachments = result.mechAttachments || [];

    // CRITICAL: Make sure attack-related properties are properly set
    // These are essential for the attack functionality
    result.canAttack = result.canAttack ?? false;
    result.isPlayed = result.isPlayed ?? false;
    result.isSummoningSick = result.isSummoningSick ?? true;
    result.attacksPerformed = result.attacksPerformed ?? 0;
    result.isFrozen = result.isFrozen ?? false;
    
    debugCardAdapter("Adapted from CardInstanceWithCardData format", result);
    return result;
  }
  
  // Otherwise, adapt the legacy CardInstance format with default values for missing fields
  // Type assert to CardInstance since we've already handled CardInstanceWithCardData above
  const legacyCard = card as CardInstance;
  
  const adaptedCard = {
    instanceId: legacyCard.instanceId || uuidv4(),
    card: {
      id: (legacyCard as any).id || 0,
      name: (legacyCard as any).name || "Unknown Card",
      type: (legacyCard as any).type || "minion",
      rarity: (legacyCard as any).rarity || "common",
      manaCost: (legacyCard as any).manaCost ?? (legacyCard as any).cost ?? 0,
      attack: (legacyCard as any).attack,
      health: (legacyCard as any).health,
      durability: (legacyCard as any).durability,
      description: (legacyCard as any).text || (legacyCard as any).description || "",
      flavorText: (legacyCard as any).flavor || "",
      collectible: (legacyCard as any).collectible ?? true,
      keywords: (legacyCard as any).keywords || [],
      // Copy any other properties that might be needed
      battlecry: (legacyCard as any).battlecry,
      deathrattle: (legacyCard as any).deathrattle,
      spellEffect: (legacyCard as any).spellEffect, // Type assertion needed for special properties
    },
    currentHealth: legacyCard.currentHealth ?? (legacyCard as any).health,
    currentAttack: (legacyCard as any).currentAttack ?? (legacyCard as any).attack,
    canAttack: legacyCard.canAttack ?? false,
    isPlayed: legacyCard.isPlayed ?? false,
    isSummoningSick: legacyCard.isSummoningSick ?? true,
    hasDivineShield: legacyCard.hasDivineShield ?? false,
    attacksPerformed: legacyCard.attacksPerformed ?? 0,
    isPoisonous: legacyCard.isPoisonous ?? false,
    hasLifesteal: legacyCard.hasLifesteal ?? false,
    isRush: legacyCard.isRush ?? false,
    isMagnetic: legacyCard.isMagnetic ?? false,
    isFrozen: legacyCard.isFrozen ?? false,
    // Ensure animationPosition is properly converted from old format to new
    animationPosition: (legacyCard as any).animationPosition ? {
      x: (legacyCard as any).animationPosition.x || 0,
      y: (legacyCard as any).animationPosition.y || 0
    } : undefined,
    mechAttachments: legacyCard.mechAttachments || []
  };
  
  debugCardAdapter("Adapted from CardInstance format", adaptedCard);
  return adaptedCard;
}

/**
 * Batch convert an array of cards to CardInstanceWithCardData format
 * 
 * @param cards Array of cards in either format
 * @returns Array of cards in CardInstanceWithCardData format
 */
export function adaptCardInstances(
  cards: (CardInstance | CardInstanceWithCardData)[]
): CardInstanceWithCardData[] {
  return cards.map(card => adaptCardInstance(card));
}

/**
 * Helper utility to safely access the card data property in any format
 * 
 * This function is critical for safely handling all card data formats in the app.
 * It normalizes different representations into a consistent card data object.
 * 
 * @param card Card in any supported format
 * @returns The core card data with guaranteed minimum required fields
 */
export function getCardDataSafely(card: any) {
  // Handle null/undefined case
  if (!card) {
    debug.warn('getCardDataSafely: Received null/undefined card');
    return {
      id: 0,
      name: 'Unknown Card',
      type: 'minion',
      class: 'Neutral',
      manaCost: 0,
      collectible: false,
      description: '',
      keywords: []
    };
  }
  
  // Check for CardInstanceWithCardData format
  if ('card' in card && card.card) {
    // Ensure critical fields exist
    const normalizedCard = { ...card.card };
    normalizedCard.id = normalizedCard.id || 0;
    normalizedCard.name = normalizedCard.name || 'Unnamed Card';
    normalizedCard.type = normalizedCard.type || 'minion';
    normalizedCard.class = normalizedCard.class || normalizedCard.heroClass || 'Neutral';
    normalizedCard.manaCost = normalizedCard.manaCost ?? normalizedCard.cost ?? 0;
    normalizedCard.collectible = normalizedCard.collectible ?? true;
    normalizedCard.keywords = normalizedCard.keywords || [];
    normalizedCard.description = normalizedCard.description || normalizedCard.text || '';
    return normalizedCard;
  }
  
  // For direct CardData format
  if (card.id !== undefined || card.name) {
    // Direct card data object, ensure it has required fields
    const normalizedCard = { ...card };
    normalizedCard.id = normalizedCard.id || 0;
    normalizedCard.name = normalizedCard.name || 'Unnamed Card';
    normalizedCard.type = normalizedCard.type || 'minion';
    normalizedCard.class = normalizedCard.class || normalizedCard.heroClass || 'Neutral';
    normalizedCard.manaCost = normalizedCard.manaCost ?? normalizedCard.cost ?? 0;
    normalizedCard.collectible = normalizedCard.collectible ?? true;
    normalizedCard.keywords = normalizedCard.keywords || [];
    normalizedCard.description = normalizedCard.description || normalizedCard.text || '';
    return normalizedCard;
  }
  
  // If we get here, we have an unexpected format - log and return a minimal object
  debug.error('getCardDataSafely: Unrecognized card format', card);
  return {
    id: card.id || 0,
    name: card.name || 'Invalid Card Format',
    type: 'minion',
    class: 'Neutral',
    manaCost: 0,
    collectible: false,
    description: '',
    keywords: []
  };
}

/**
 * Converts a CardInstanceWithCardData back to a CardInstance format
 * This is the reverse operation of adaptCardInstance
 * 
 * @param card The card instance with card data
 * @returns A standard CardInstance
 */
export function reverseAdaptCardInstance(
  card: CardInstanceWithCardData
): CardInstance {
  debugCardAdapter("Reverse adapting card instance", card);
  
  if (!card) {
    debug.error("Attempted to reverse adapt null or undefined card");
    return createFallbackStandardCardInstance();
  }
  
  // Create a standard CardInstance format that matches the CardTypes.ts definition
  // Sanitize card data to ensure it matches the Card type
  const sanitizedCardData = card.card ? { ...(card.card as any) } : {};
  // Remove any 'class' property that might not exist in Card type
  if ('class' in sanitizedCardData && !('heroClass' in sanitizedCardData)) {
    (sanitizedCardData as any).heroClass = (sanitizedCardData as any).class;
  }
  
  const standardCard: CardInstance = {
    instanceId: card.instanceId,
    card: sanitizedCardData as any,
    currentHealth: card.currentHealth,
    canAttack: card.canAttack ?? false,
    isPlayed: card.isPlayed ?? false, 
    isSummoningSick: card.isSummoningSick ?? true,
    hasDivineShield: card.hasDivineShield ?? false,
    attacksPerformed: card.attacksPerformed ?? 0,
    isPoisonous: card.isPoisonous ?? false,
    hasLifesteal: card.hasLifesteal ?? false,
    isRush: card.isRush ?? false,
    isMagnetic: card.isMagnetic ?? false,
    isFrozen: card.isFrozen ?? false,
    mechAttachments: card.mechAttachments || [],
  };
  
  debugCardAdapter("Reverse adapted to standard CardInstance", standardCard);
  return standardCard;
}

/**
 * Convert an array of CardInstanceWithCardData back to CardInstance array
 */
export function reverseAdaptCardInstances(
  cards: CardInstanceWithCardData[]
): CardInstance[] {
  return cards.map(card => reverseAdaptCardInstance(card));
}

/**
 * Helper to handle position formatting
 */
export function formatPosition(pos: any): Position {
  if (!pos) return { x: 0, y: 0 };
  
  return {
    x: pos.x || 0,
    y: pos.y || 0
  };
}

/**
 * Creates a fallback card instance when adaptation fails
 */
function createFallbackCardInstance(): CardInstanceWithCardData {
  return {
    instanceId: uuidv4(),
    card: {
      id: 0,
      name: "Fallback Card",
      type: "minion",
      rarity: "common",
      manaCost: 0,
      attack: 1,
      health: 1,
      description: "This card was created as a fallback.",
      collectible: false,
      keywords: []
    },
    currentHealth: 1,
    canAttack: false,
    isPlayed: false,
    isSummoningSick: true,
    hasDivineShield: false,
    attacksPerformed: 0,
    isPoisonous: false,
    hasLifesteal: false,
    isRush: false,
    isMagnetic: false,
    mechAttachments: [],
  };
}

/**
 * Creates a fallback standard card instance when reverse adaptation fails
 */
function createFallbackStandardCardInstance(): CardInstance {
  return {
    instanceId: uuidv4(),
    card: {
      id: 0,
      name: "Fallback Card",
      type: "minion",
      rarity: "common",
      manaCost: 0,
      attack: 1,
      health: 1,
      description: "This card was created as a fallback.",
      heroClass: "neutral",
      collectible: false,
      keywords: []
    } as any,
    currentHealth: 1,
    canAttack: false,
    isPlayed: false,
    isSummoningSick: true,
    hasDivineShield: false,
    attacksPerformed: 0,
    isPoisonous: false,
    hasLifesteal: false,
    isRush: false,
    isMagnetic: false,
    mechAttachments: [],
  };
}