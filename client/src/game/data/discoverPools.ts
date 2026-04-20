/**
 * Predefined discovery pools for different types of discoveries
 * This implements typed discovery pools like "discover a dragon" or "discover a deathrattle minion"
 */
import { CardData } from '../types';
import { debug } from '../config/debugConfig';
// Use allCards as the single source of truth for card data (1300+ cards)
import allCards from './allCards';
// Alias for backward compatibility within this file
const fullCardDatabase = allCards;
// Import helpers from discoveryHelper to avoid circular dependencies
import { DiscoverPoolOption, hasRace, getAllDiscoverPoolOptions } from './discoveryHelper';

// Type for the discovery pool
export interface DiscoveryPool {
      id: string;

      name: string;
      description: string;

      filter: (card: CardData) => boolean;
}

// Base discovery pools
const createDiscoveryPools = (): DiscoveryPool[] => [
  {
      id: 'dragon',

      name: 'Dragon',
      description: 'Foresee a Dragon',

      filter: (card: CardData): boolean => Boolean(hasRace(card, 'dragon'))
  },

{
      id: 'beast',

      name: 'Beast',
      description: 'Foresee a Beast',

      filter: (card: CardData): boolean => Boolean(hasRace(card, 'beast'))
  },

{
      id: 'automaton',

      name: 'Automaton',
      description: 'Foresee an Automaton',

      filter: (card: CardData): boolean => Boolean(hasRace(card, 'automaton') || hasRace(card, 'mech'))
  },

{
      id: 'naga',

      name: 'Naga',
      description: 'Foresee a Naga',

      filter: (card: CardData): boolean => Boolean(hasRace(card, 'naga') || hasRace(card, 'murloc'))
  },

{
      id: 'titan',

      name: 'Titan',
      description: 'Foresee a Titan',

      filter: (card: CardData): boolean => Boolean(hasRace(card, 'titan') || hasRace(card, 'Titan'))
  },

{
      id: 'elemental',

      name: 'Elemental',
      description: 'Foresee an Elemental',

      filter: (card: CardData): boolean => Boolean(hasRace(card, 'elemental'))
  },

{
      id: 'einherjar',

      name: 'Einherjar',
      description: 'Foresee an Einherjar',

      filter: (card: CardData): boolean => Boolean(hasRace(card, 'einherjar') || hasRace(card, 'pirate'))
  },

{
      id: 'totem',

      name: 'Spirit',
      description: 'Foresee a Spirit',

      filter: (card: CardData): boolean => Boolean(hasRace(card, 'spirit') || hasRace(card, 'totem'))
  },

{
      id: 'deathrattle',

      name: 'Deathrattle',
      description: 'Foresee a minion with Deathrattle',

      filter: (card: CardData): boolean => Boolean(card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
      typeof keyword === 'string' && keyword.toLowerCase() === 'deathrattle'))
  },

{
      id: 'battlecry',

      name: 'Battlecry',
      description: 'Foresee a minion with Battlecry',

      filter: (card: CardData): boolean => Boolean(card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
      typeof keyword === 'string' && keyword.toLowerCase() === 'battlecry'))
  },

{
      id: 'taunt',

      name: 'Taunt',
      description: 'Foresee a minion with Taunt',

      filter: (card: CardData): boolean => Boolean(card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
      typeof keyword === 'string' && keyword.toLowerCase() === 'taunt'))
  },

{
      id: 'divine_shield',

      name: 'Divine Shield',
      description: 'Foresee a minion with Divine Shield',

      filter: (card: CardData): boolean => Boolean(card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
      typeof keyword === 'string' && keyword.toLowerCase() === 'divine shield'))
  },

{
      id: 'spell_damage',

      name: 'Spell Damage',
      description: 'Foresee a minion with Spell Damage',

      filter: (card: CardData): boolean => Boolean(card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
      typeof keyword === 'string' && keyword.toLowerCase() === 'spell damage'))
  },

{
      id: 'rush',

      name: 'Rush',
      description: 'Foresee a minion with Rush',

      filter: (card: CardData): boolean => Boolean(card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
      typeof keyword === 'string' && keyword.toLowerCase() === 'rush'))
  },

{
      id: 'charge',

      name: 'Charge',
      description: 'Foresee a minion with Charge',

      filter: (card: CardData): boolean => Boolean(card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
      typeof keyword === 'string' && keyword.toLowerCase() === 'charge'))
  },

{
      id: 'lifesteal',

      name: 'Lifesteal',
      description: 'Foresee a card with Lifesteal',

      filter: (card: CardData): boolean => Boolean(card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
      typeof keyword === 'string' && keyword.toLowerCase() === 'lifesteal'))
  },

{
      id: 'windfury',

      name: 'Windfury',
      description: 'Foresee a minion with Windfury',

      filter: (card: CardData): boolean => Boolean(card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
      typeof keyword === 'string' && keyword.toLowerCase() === 'windfury'))
  },

{
      id: 'mythic',

      name: 'Mythic',
      description: 'Foresee a Mythic minion',

      filter: (card: CardData): boolean => Boolean(card.type === 'minion' && card.rarity === 'mythic')
  },

{
      id: 'epic',

      name: 'Epic',
      description: 'Foresee an Epic card',

      filter: (card: CardData): boolean => Boolean(card.rarity === 'epic')
  },

{
      id: 'one_cost',

      name: '1-Cost',
      description: 'Foresee a 1-Cost card',

      filter: (card: CardData): boolean => Boolean(card.manaCost === 1)
  },

{
      id: 'two_cost',

      name: '2-Cost',
      description: 'Foresee a 2-Cost card',

      filter: (card: CardData): boolean => Boolean(card.manaCost === 2)
  },

{
      id: 'three_cost',

      name: '3-Cost',
      description: 'Foresee a 3-Cost card',

      filter: (card: CardData): boolean => Boolean(card.manaCost === 3)
  },

{
      id: 'damaged_minion',

      name: 'Damaged Minion',
      description: 'Foresee a minion that has been damaged',

      filter: (card: CardData): boolean => Boolean(card.type === 'minion' && 
      card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
        typeof keyword === 'string' && keyword.toLowerCase() === 'battlecry') && 
      card.name.toLowerCase().includes('damaged'))
  },

{
      id: 'secret',

      name: 'Rune',
      description: 'Foresee a Rune',

      filter: (card: CardData): boolean => Boolean(card.type === 'secret')
  },

{
      id: 'spell',

      name: 'Spell',
      description: 'Foresee a Spell',

      filter: (card: CardData): boolean => Boolean(card.type === 'spell')
  },

{
      id: 'weapon',

      name: 'Weapon',
      description: 'Foresee a Weapon',

      filter: (card: CardData): boolean => Boolean(card.type === 'weapon')
  }
];

// Initialize discoveryPools using our creator function
export const discoveryPools: DiscoveryPool[] = createDiscoveryPools();

/**
 * Get cards that match a specific discovery pool
 */
export function getCardsFromPool(poolId: string): CardData[] {
          // Find the pool
  const pool = discoveryPools.find((p: DiscoveryPool) => p.id === poolId);
  if (!pool) {
  debug.error(`Discovery pool with ID ${poolId} not found`);
    return [];
  }
  
  // Log total cards in the database for debugging
  debug.log(`Total cards in   database: ${fullCardDatabase.length}`);
   // Enhanced debug for beast cards
  if (poolId === 'beast') {
            debug.log('Searching for beast cards in database...');
    // Find cards with race 'Beast' (case-insensitive)
    const beasts = fullCardDatabase.filter(card => 
      card.race && card.race.toLowerCase() === 'beast'
    );
    debug.log(`Found ${beasts.length} beast cards in the card database`);
    
    // Log beast cards for debugging
    beasts.forEach(card => {
              debug.log(`Beast card found: ${card.name}
ID: ${card.id}
Race: ${card.race}`);
    });
    
    return beasts;
    }
  
  // Enhanced debug for taunt minions
  if (poolId === 'taunt') {
            debug.log('Searching for taunt minions in card database...');
    const taunts = fullCardDatabase.filter(card => 
      card.keywords && Array.isArray(card.keywords) && card.keywords.some(keyword => 
        typeof keyword === 'string' && keyword.toLowerCase() === 'taunt')
    );
    debug.log(`Found ${taunts.length} taunt minions with proper taunt keyword`);
    
    // Log some sample taunt cards
    taunts.slice(0, 3).forEach(card => {
              debug.log(`Taunt card found: ${card.name}
ID: ${card.id}
Keywords: ${card.keywords}`);
    });
    
    return taunts;
    }
  
  // Filter cards based on the pool's filter
  const result = fullCardDatabase.filter(pool.filter);
  debug.log(`Found ${result.length} cards for discovery   pool: ${poolId}`);
   return result;
}

/**
 * Get formatted pool options for use in card selection UIs
 */
export function getDiscoverPoolOptions(): DiscoverPoolOption[] {
  return discoveryPools.map((pool: DiscoveryPool) => ({
      id: pool.id,

      name: pool.name,
    description: pool.description
  }));
}

// Note: We're now using the getAllDiscoverPoolOptions from discoveryHelper,

export function getRandomCardsFromPool(poolId: string,   count: number = 3): CardData[] {
   // Get all cards that match the pool
  const allCards = getCardsFromPool(poolId);
  
  // If we don't have enough cards, return all we have
  if (allCards.length <= count) {
  return allCards;
  }
  
  // Select random cards
  const   result: CardData[] = [];
   const usedIndices = new Set<number>();
  
  while (result.length < count && usedIndices.size < allCards.length) {
            const randomIndex = Math.floor(Math.random() * allCards.length);
    
    if (!usedIndices.has(randomIndex)) {
              usedIndices.add(randomIndex);
      result.push(allCards[randomIndex]);
    }
  }
  
  return result;
}