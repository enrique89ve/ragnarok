/**
 * Definition of Colossal minion cards for the game
 * Colossal minions have multiple parts that are summoned together
 */
import { CardData } from '../types';

// Array of colossal main minions 
export const colossalMinionCards: CardData[] = [
   // Neptulon the Tidehunter - Main body
  {
      id: 3001,

      name: "Neptulon the Tidehunter",
      manaCost: 8,

      attack: 7,
      health: 7,

      description: "Colossal +2. Battlecry: Summon two Neptulon's Hands. Whenever a Neptulon's Hand attacks, add a random Elemental to your hand.",
      rarity: 'epic',

      type: "minion",
      keywords: ['colossal', 'battlecry'],
      battlecry: {
        type: 'summon_parts',  // Special type for colossal parts summoning
        requiresTarget: false,
        targetType: 'none'
      },
      collectible: true,
      class: "Neutral"
  },
  // Giga-Fin - Main body
  {
      id: 3003,
      
      name: "Giga-Fin",
      manaCost: 7,
      
      attack: 5,
      health: 8,
      
      description: "Colossal +2. Taunt.   Battlecry: Draw 3 Nagas from your deck.",
      rarity: 'epic',
      type: "minion",
      
      keywords: ['colossal', 'taunt', 'battlecry'],
      battlecry: {
        type: 'draw',
        value: 3,
        
        requiresTarget: false,
        targetType: 'none',
        
        cardType: 'naga'
      },
      collectible: true,
      class: "Neutral"
  },
  // Colossus of the Moon - Main body
  {
      id: 3006,
      
      name: "Colossus of the Moon",
      manaCost: 10,
      
      attack: 10,
      health: 10,
      
      description: "Colossal +3. Divine Shield. Summons three Protective Shield parts that protect the main body.",
      rarity: 'epic',
      
      type: "minion",
      keywords: ['colossal', 'divine_shield', 'battlecry'],
      battlecry: {
        type: 'summon',
        summonCardId: 3007, // ID of the Protective Shield part
        value: 3, // Summon 3 shields
        requiresTarget: false,
        
        targetType: 'none'
      },
      collectible: true,
      class: "Neutral"
  }
];

// Array of colossal minion parts
export const colossalPartCards: CardData[] = [
  // Neptulon's Hand - Part
  {
      id: 3002,
      
      name: "Neptulon's Hand",
      manaCost: 2, // Lower cost for when summoned independently
      attack: 4,
      
      health: 2,
      description: "Part of Neptulon the Tidehunter. After this attacks, add a random Elemental to your hand.",
      rarity: 'rare',
      
      type: "minion",
      keywords: [],
      class: "Neutral",
      collectible: true
  },
  // Giga-Fin's Fin - Part
  {
      id: 3004,
      
      name: "Giga-Fin's Fin",
      manaCost: 3, // Lower cost for when summoned independently
      attack: 3,
      
      health: 3,
      description: "Part of Giga-Fin. Taunt. Deathrattle: Deal 2 damage to all enemy minions.",
      
      rarity: 'rare',
      type: "minion",
      
      keywords: ['taunt', 'deathrattle'],
      deathrattle: {
          type: 'damage',
          value: 2,
          
          targetType: 'all_enemies'
      },
      collectible: true,
      class: "Neutral"
  },
  // Giga-Fin's Tail - Part
  {
      id: 3005,
      
      name: "Giga-Fin's Tail",
      manaCost: 3, // Lower cost for when summoned independently
      attack: 2,
      
      health: 4,
      description: "Part of Giga-Fin. Taunt. Battlecry: Give adjacent minions +1/+1.",
      
      rarity: 'rare',
      type: "minion",
      
      keywords: ['taunt', 'battlecry'],
      battlecry: {
          type: 'buff',
          buffAttack: 1,
          
          buffHealth: 1,
          requiresTarget: false,
          
          targetType: 'none' // Adjacent buff doesn't use targeting
      },
      collectible: true,
      class: "Neutral"
  },
  // Protective Shield - Part
  {
      id: 3007,
      
      name: "Protective Shield",
      manaCost: 4, // Lower cost for when summoned independently
      attack: 0,
      
      health: 5,
      description: "Part of Colossus of the Moon. Taunt. Divine Shield. Can't attack.",
      
      rarity: 'rare',
      type: "minion",
      
      keywords: ['taunt', 'divine_shield'],
      class: "Neutral",
      collectible: true
  }
];

// Combine both arrays for export (main minions + parts)
export const colossalCards: CardData[] = [...colossalMinionCards, ...colossalPartCards];