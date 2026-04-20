import { v4 as uuidv4 } from 'uuid';
import { CardData, CardInstance } from '../../types';
import allCards, { getCardById } from '../../data/allCards';
import { initializeSpellPower } from '../spells/spellPowerUtils';
import { initializePoisonousEffect } from '../mechanics/poisonousUtils';
import { initializeLifestealEffect } from '../mechanics/lifestealUtils';
import { initializeRushEffect } from '../mechanics/rushUtils';
import { initializeMagneticEffect } from '../mechanics/magneticUtils';
import { initializeFrenzyEffect } from '../mechanics/frenzyUtils';
import { initializeColossalEffect } from '../mechanics/colossalUtils';
import { initializeEchoEffect } from '../mechanics/echoUtils';
import { debug } from '../../config/debugConfig';
import { getCardAtLevel, type EvolutionLevel } from './cardLevelScaling';

/**
 * Creates a new card instance from card data
 */
export function createCardInstance(card: CardData, evolutionLevel?: EvolutionLevel): CardInstance {
  const level = evolutionLevel ?? (card as any)._evolutionLevel ?? 3;
  const scaledCard = level !== 3 ? getCardAtLevel(card, level) : card;

  // Check if the card has Charge, which allows it to attack immediately
  const hasCharge = scaledCard.keywords?.includes('charge') || false;

  const cardHealth = 'health' in scaledCard ? (scaledCard as any).health : 0;
  
  // Create the basic card instance
  const cardInstance: CardInstance = {
    instanceId: uuidv4(),
    card: scaledCard,
    currentHealth: cardHealth,
    canAttack: false,
    isPlayed: false,
    // Charge minions are not affected by summoning sickness
    isSummoningSick: !hasCharge,
    // Initialize hasDivineShield based on card keywords
    hasDivineShield: scaledCard.keywords?.includes('divine_shield') || false,
    // Initialize attacks performed this turn
    attacksPerformed: 0,
    // Initialize new keyword properties
    hasPoisonous: scaledCard.keywords?.includes('poisonous') || false,
    hasLifesteal: scaledCard.keywords?.includes('lifesteal') || false,
    isRush: scaledCard.keywords?.includes('rush') || false,
    isMagnetic: scaledCard.keywords?.includes('magnetic') || false,
    // For mech attachments in magnetic mechanic
    mechAttachments: [],
    // Evolution level
    evolutionLevel: level,
    hasReborn: scaledCard.keywords?.includes('reborn') || false,
  } as CardInstance;
  
  // Apply additional card-specific initializations
  let processedInstance = cardInstance;
  
  // Apply spell power initialization if the card has the spell_damage keyword
  if (scaledCard.keywords?.includes('spell_damage')) {
    processedInstance = initializeSpellPower(processedInstance);
  }

  // Initialize poisonous effect
  if (scaledCard.keywords?.includes('poisonous')) {
    processedInstance = initializePoisonousEffect(processedInstance);
  }

  // Initialize lifesteal effect
  if (scaledCard.keywords?.includes('lifesteal')) {
    processedInstance = initializeLifestealEffect(processedInstance);
  }

  // Initialize rush effect (allows immediate attacks against minions)
  if (scaledCard.keywords?.includes('rush')) {
    processedInstance = initializeRushEffect(processedInstance);
  }

  // Initialize magnetic effect for mechs
  if (scaledCard.keywords?.includes('magnetic')) {
    processedInstance = initializeMagneticEffect(processedInstance);
  }

  // Initialize frenzy effect
  if (scaledCard.keywords?.includes('frenzy') && (scaledCard as any).frenzyEffect) {
    processedInstance = initializeFrenzyEffect(processedInstance);
  }

  // Initialize colossal effect
  if (scaledCard.keywords?.includes('colossal')) {
    processedInstance = initializeColossalEffect(processedInstance);
  }

  // Initialize echo effect
  if (scaledCard.keywords?.includes('echo')) {
    processedInstance = initializeEchoEffect(processedInstance);
  }

  if (scaledCard.keywords?.includes('einherjar')) {
    processedInstance.einherjarGeneration = 0;
  }

  return processedInstance;
}

/**
 * Get random cards from the card database
 */
export function getRandomCards(count: number): CardData[] {
  const shuffled = [...allCards].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Create a starting deck of cards for testing
 * Ensures a mix of cards including special cards for testing various mechanics
 */
export function createStartingDeck(size: number = 20): CardData[] {
  // First, get all deathrattle cards
  const deathrattleCards = allCards.filter((card: CardData) => 
    card.keywords?.includes('deathrattle') || false
  );
  
  // Make sure we include at least some deathrattle cards
  const numDeathrattleCards = Math.min(3, deathrattleCards.length);
  const selectedDeathrattleCards = deathrattleCards
    .sort(() => 0.5 - Math.random())
    .slice(0, numDeathrattleCards);
  
  // Get cards with complex battlecries for testing (AoE damage)
  const aoeBattlecryCards = allCards.filter((card: CardData) => 
    (card as any).battlecry?.type === 'aoe_damage'
  );
  
  // Make sure we include the AoE battlecry cards
  const numAoECards = Math.min(2, aoeBattlecryCards.length);
  const selectedAoECards = aoeBattlecryCards.slice(0, numAoECards);
  
  // Get some taunt cards for testing
  const tauntCards = allCards.filter((card: CardData) => 
    card.keywords?.includes('taunt') || false
  );
  
  const numTauntCards = Math.min(3, tauntCards.length);
  const selectedTauntCards = tauntCards
    .sort(() => 0.5 - Math.random())
    .slice(0, numTauntCards);
    
  // Get overload cards for testing
  const overloadCards = allCards.filter((card: CardData) => 
    card.keywords?.includes('overload') || false
  );
  
  // Make sure we include several overload cards for testing
  const numOverloadCards = Math.min(4, overloadCards.length);
  const selectedOverloadCards = overloadCards.slice(0, numOverloadCards);
  
  // Get mana manipulation cards for testing (The Coin and Innervate)
  // Use allCards (1300+ cards) instead of tiny spellCards database
  const manaCards = allCards.filter(card => 
    card.type === 'spell' && card.spellEffect?.type === 'mana_crystal'
  );
  
  // Make sure we include these mana cards for testing
  const numManaCards = Math.min(2, manaCards.length);
  const selectedManaCards = manaCards.slice(0, numManaCards);
  
  // Get frenzy cards for testing
  const frenzyCards = allCards.filter((card: CardData) => 
    card.keywords?.includes('frenzy') || false
  );
  
  // Make sure we include some frenzy cards
  const numFrenzyCards = Math.min(2, frenzyCards.length);
  const selectedFrenzyCards = frenzyCards
    .sort(() => 0.5 - Math.random())
    .slice(0, numFrenzyCards);
  
  // Get colossal minions for testing
  const colossalCards = allCards.filter((card: CardData) =>
    card.keywords?.includes('colossal') || false
  );
  const numColossalCards = Math.min(2, colossalCards.length);
  const selectedColossalCards = colossalCards
    .sort(() => 0.5 - Math.random())
    .slice(0, numColossalCards);
  
  // Get Naga cards for testing Giga-Fin's battlecry
  const nagaCards = allCards.filter((card: CardData) => {
    const cardAny = card as any;
    const r = (cardAny.race || cardAny.tribe || '').toLowerCase();
    return r === 'naga' || r === 'murloc';
  });

  // Make sure we include enough Naga cards
  const numNagaCards = Math.min(4, nagaCards.length);
  const selectedNagaCards = nagaCards
    .sort(() => 0.5 - Math.random())
    .slice(0, numNagaCards);
  
  // Get random cards for the rest of the deck
  const specialCardIds = [
    ...selectedDeathrattleCards, 
    ...selectedAoECards, 
    ...selectedTauntCards,
    ...selectedOverloadCards,
    ...selectedManaCards,
    ...selectedFrenzyCards,
    ...selectedColossalCards,
    ...selectedNagaCards
  ].map(card => card.id);
  
  const remainingCards = allCards
    .filter((card: CardData) => !specialCardIds.includes(card.id))
    .sort(() => 0.5 - Math.random())
    .slice(0, size - numDeathrattleCards - numAoECards - numTauntCards - numOverloadCards - numManaCards - numFrenzyCards - numColossalCards - numNagaCards);
  
  // Combine and shuffle the deck
  return [
    ...selectedDeathrattleCards, 
    ...selectedAoECards, 
    ...selectedTauntCards, 
    ...selectedOverloadCards,
    ...selectedManaCards,
    ...selectedFrenzyCards,
    ...selectedColossalCards,
    ...selectedNagaCards,
    ...remainingCards
  ].sort(() => 0.5 - Math.random());
}

/**
 * Create a random deck for a specific class without test cards
 * @param heroClass - The hero class for the deck
 * @param size - The number of cards in the deck
 */
export function createClassDeck(heroClass: string, size: number = 30): CardData[] {
  // Filter out undefined cards first
  const validCards = allCards.filter(card => card !== undefined && card !== null);
  
  // Filter cards for the specific class and neutral cards
  const classCards = validCards.filter((card: CardData) => {
    try {
      // Extract the card class safely
      let cardClass = '';
      
      // Check the class property
      if (typeof card.class === 'string') {
        cardClass = card.class;
      } 
      // Check heroClass property if class isn't available
      else if (typeof card.heroClass === 'string') {
        cardClass = card.heroClass;
      }
      
      // Check if the card belongs to the specified class or is neutral
      const matchesClass = cardClass.toLowerCase() === heroClass.toLowerCase() || 
                           cardClass.toLowerCase() === 'neutral';
      
      // Only include collectible cards
      return matchesClass && card.collectible !== false;
    } catch (error) {
      // Log the error safely without breaking the application
      debug.error("Error filtering card:", error);
      return false;
    }
  });
  
  // If we don't have enough class cards, mix in some generic cards
  if (classCards.length < size) {
    // Just get random cards from all collectible cards
    const allCollectibleCards = allCards.filter(card => card && card.collectible !== false);
    return allCollectibleCards
      .sort(() => 0.5 - Math.random())
      .slice(0, size);
  }
  
  // Randomly select cards for the deck
  return classCards
    .sort(() => 0.5 - Math.random())
    .slice(0, size);
}

/**
 * Draw cards and convert them to instances
 */
export function drawCards(deck: CardData[], count: number): {
  drawnCards: CardInstance[];
  remainingDeck: CardData[];
} {
  // Ensure we don't draw more cards than available
  const actualDrawCount = Math.min(count, deck.length);
  
  // Get the cards to draw from the top of the deck
  const drawnCardData = deck.slice(0, actualDrawCount);
  const remainingDeck = deck.slice(actualDrawCount);
  
  // Convert card data to card instances
  const drawnCards = drawnCardData.map(c => createCardInstance(c));
  
  return {
    drawnCards,
    remainingDeck
  };
}

/**
 * Find a card instance by its ID in a list of card instances
 */
/**
 * Safely finds a card instance by its ID in an array of card instances
 * This version handles undefined arrays by returning undefined
 */
export function findCardInstance(
  cards: CardInstance[] | undefined,
  instanceId: string
): { card: CardInstance; index: number } | undefined {
  if (!cards || cards.length === 0) return undefined;
  const index = cards.findIndex(card => card.instanceId === instanceId);
  if (index === -1) return undefined;
  return { card: cards[index], index };
}

/**
 * Converts a CardInstance to CardData
 * This is useful for functions that expect CardData but receive CardInstance
 */
export function instanceToCardData(cardInstance: CardInstance): CardData {
  return cardInstance.card;
}

/**
 * Safely gets keywords from a card, returning an empty array if undefined
 * This prevents "possibly undefined" errors when checking for keywords
 */
export function getCardKeywords(card: CardData): string[] {
  return card.keywords || [];
}

/**
 * Check if a card instance can be played (has enough mana)
 */
export function canPlayCard(card: CardInstance, currentMana: number): boolean {
  const manaCost = card.card.manaCost ?? (card.card as any).cost ?? 0;
  return manaCost <= currentMana;
}

// NOTE: canCardAttack has been consolidated into client/src/game/combat/attackUtils.ts
// The authoritative function checks all attack eligibility including Charge, Rush, Windfury, etc.

/**
 * Find a card by its ID in the full card database
 */
export function findCardById(id: number): CardData | undefined {
  return getCardById(id);
}

/**
 * Get a card's tribe or race consistently
 * Some cards use 'race' while others use 'tribe', this standardizes the access
 */
export function getCardTribe(card: CardData | CardInstance): string | undefined {
  if (!card) return undefined;
  
  // If it's a CardInstance, get the inner card
  const cardData = 'card' in card ? card.card : card;
  const cardAny = cardData as any;
  
  // Check both race and tribe properties
  return cardAny ? (cardAny.tribe || cardAny.race) : undefined;
}

/**
 * Check if a card belongs to a specific tribe/race
 */
export function isCardOfTribe(card: CardData | CardInstance, tribeName: string): boolean {
  const tribe = getCardTribe(card);
  return tribe ? tribe.toLowerCase() === tribeName.toLowerCase() : false;
}

/**
 * Check if a card is a Naga
 */
export function isNagaCard(card: CardData | CardInstance): boolean {
  return isCardOfTribe(card, 'naga');
}

// ============================================================================
// CARD FILTERING UTILITIES
// Pure functions for filtering the card database
// ============================================================================

/**
 * Filter parameters for getCardsByFilter
 */
export interface CardFilterParams {
  class?: string;
  type?: string;
  rarity?: string;
  manaCost?: number | 'all';
  searchText?: string;
}

/**
 * Get cards from the database matching the specified filters
 * 
 * @param filters - Object containing filter criteria
 * @returns Array of cards matching all specified filters
 * 
 * @example
 * // Get all mythic mage spells
 * const cards = getCardsByFilter({ class: 'Mage', type: 'spell', rarity: 'mythic' });
 */
export const getCardsByFilter = (filters: CardFilterParams): CardData[] => {
  return allCards.filter(card => {
    // Filter by collectible
    if (!card.collectible) return false;
    
    // Filter by class - check both 'class' and 'heroClass' fields for compatibility
    // Some cards use 'class' (e.g., "Mage"), others use 'heroClass' (e.g., "mage")
    if (filters.class && filters.class !== 'all') {
      const filterClassLower = filters.class.toLowerCase();
      const cardClass = card.class?.toLowerCase() || '';
      const cardHeroClass = (card as any).heroClass?.toLowerCase() || '';
      
      // Match if either field matches, or if card is Neutral
      const isNeutral = cardClass === 'neutral' || cardHeroClass === 'neutral';
      const matchesClass = cardClass === filterClassLower || cardHeroClass === filterClassLower;
      
      if (!isNeutral && !matchesClass) {
        return false;
      }
    }
    
    // Filter by type
    if (filters.type && filters.type !== 'all' && card.type !== filters.type) {
      return false;
    }
    
    // Filter by rarity
    if (filters.rarity && filters.rarity !== 'all' && card.rarity !== filters.rarity) {
      return false;
    }
    
    // Filter by mana cost
    if (filters.manaCost && filters.manaCost !== 'all') {
      if (filters.manaCost === 7) {
        // 7+ mana cards
        if (!card.manaCost || card.manaCost < 7) return false;
      } else if (card.manaCost !== filters.manaCost) {
        return false;
      }
    }
    
    // Filter by search text (matches name, description, or race)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const nameMatch = card.name.toLowerCase().includes(searchLower);
      const descMatch = card.description ? card.description.toLowerCase().includes(searchLower) : false;
      const raceMatch = card.race ? card.race.toLowerCase().includes(searchLower) : false;
      
      if (!nameMatch && !descMatch && !raceMatch) {
        return false;
      }
    }
    
    return true;
  });
};
