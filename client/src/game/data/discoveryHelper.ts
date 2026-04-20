/**
 * Helper module to break circular dependencies between discover pools, cards and other systems
 * This file serves as an intermediary layer between different card systems
 */
import { CardData } from '../types';

// Interface for simplified discover pool options
export interface DiscoverPoolOption {
      id: string;

      name: string;
    description: string;
}

// We store the pool options here to avoid circular imports
const poolOptions: DiscoverPoolOption[] = [
   { id: 'dragon', name: 'Dragon',   description: 'Foresee a Dragon' },

{ id: 'beast', name: 'Beast',   description: 'Foresee a Beast' },

{ id: 'mech', name: 'Automaton',   description: 'Foresee an Automaton' },

{ id: 'murloc', name: 'Naga',   description: 'Foresee a Naga' },

{ id: 'titan', name: 'Titan',   description: 'Foresee a Titan' },

{ id: 'elemental', name: 'Elemental',   description: 'Foresee an Elemental' },

{ id: 'pirate', name: 'Pirate',   description: 'Foresee a Pirate' },

{ id: 'totem', name: 'Totem',   description: 'Foresee a Totem' },

{ id: 'deathrattle', name: 'Deathrattle',   description: 'Foresee a minion with Deathrattle' },

{ id: 'battlecry', name: 'Battlecry',   description: 'Foresee a minion with Battlecry' },

{ id: 'taunt', name: 'Taunt',   description: 'Foresee a minion with Taunt' },

{ id: 'divine_shield', name: 'Divine Shield',   description: 'Foresee a minion with Divine Shield' },

{ id: 'spell_damage', name: 'Spell Damage',   description: 'Foresee a minion with Spell Damage' },

{ id: 'rush', name: 'Rush',   description: 'Foresee a minion with Rush' },

{ id: 'charge', name: 'Charge',   description: 'Foresee a minion with Charge' },

{ id: 'lifesteal', name: 'Lifesteal',   description: 'Foresee a card with Lifesteal' },

{ id: 'windfury', name: 'Windfury',   description: 'Foresee a minion with Windfury' },

{ id: 'mythic', name: 'Mythic',   description: 'Foresee a Mythic minion' },

{ id: 'epic', name: 'Epic',   description: 'Foresee an Epic card' },

{ id: 'one_cost', name: '1-Cost',   description: 'Foresee a 1-Cost card' },

{ id: 'two_cost', name: '2-Cost',   description: 'Foresee a 2-Cost card' },

{ id: 'three_cost', name: '3-Cost',   description: 'Foresee a 3-Cost card' },

{ id: 'damaged_minion', name: 'Damaged Minion',   description: 'Foresee a minion that has been damaged' },

{ id: 'secret', name: 'Rune',   description: 'Foresee a Rune' },

{ id: 'spell', name: 'Spell',   description: 'Foresee a Spell' },

{ id: 'weapon', name: 'Weapon', description: 'Foresee a Weapon' }
];

/**
 * Returns all discovery pool options as an array
 * This avoids circular dependencies with the card system
 */
export function getAllDiscoverPoolOptions(): DiscoverPoolOption[] {
  return poolOptions;
}

// Helper function to safely check if card.race matches a specific race
export function hasRace(card: CardData, race: string): boolean {
   // Add case-insensitive comparison for race
  return card.race !== undefined && card.race.toLowerCase() === race.toLowerCase();
}