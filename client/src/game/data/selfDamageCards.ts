/**
 * Self-Damage Cards Collection
 * 
 * This file contains cards with the self-damage mechanic, primarily associated with the Warlock class.
 * These cards offer powerful effects at the cost of damaging the player's own hero.
 * This mechanic embodies the Warlock's theme of sacrificing health for power.
 */
import { CardData } from '../types';

/**
 * Collection of cards with self-damage mechanics
 * Most of these are Warlock cards, as self-sacrifice is their class-specific theme
 * Card IDs: 47xxx series
 */
export const selfDamageCards: CardData[] = [
  {
    id: 47001,
    name: "Bloodfury Brewmaster",
    manaCost: 4,
    attack: 4,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Deal 3 damage to your hero. Gain +3 Attack.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "self_damage_buff",
      value: 3, // The damage value
      buffAttack: 3 // Using the property defined in BattlecryEffect
    }
  },
  {
    id: 47002,
    name: "Surtr's General",
    manaCost: 4,
    attack: 5,
    health: 6,
    type: "minion",
    race: "titan",
    rarity: "rare",
    description: "Battlecry: Deal 5 damage to your hero.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "damage",
      value: 5,
      targetType: 'friendly_hero'
    }
  },
  {
    id: 47003,
    name: "Bleeding Ritual",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage to your hero. Draw 2 cards.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: 'friendly_hero', // Using the enum for consistency
      sideEffect: {
        type: "draw",
        count: 2
      }
    }
  },
  {
    id: 47004,
    name: "Crystalweaver",
    manaCost: 4,
    attack: 5,
    health: 4,
    type: "minion",
    rarity: "common",
    description: "Battlecry: Give your Titans +1/+1.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "buff_tribe", // Using a standard type for tribe buffs
      tribe: "titan", // The tribe to buff
      buffs: {
        attack: 1,
        health: 1
      },
      targetType: 'none' // No specific target - affects all friendly titans
    }
  },
  {
    id: 47005,
    name: "Blood Pact",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage to your hero. Gain 3 armor and draw a card.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: 'friendly_hero', // Using the same enum for consistency
      sideEffect: {
        type: "gain_armor_and_draw",
        armor: 3,
        draw: 1
      }
    }
  },
  {
    id: 47006,
    name: "Pain Embracer",
    manaCost: 2,
    attack: 2,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Whenever your hero takes damage, gain +1/+1.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    minionEffect: {
      type: "buff_on_hero_damage",
      attack: 1,
      health: 1
    }
  },
  {
    id: 47007,
    name: "Soul Rip",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 2-4 damage to a minion. Deal the same amount to your hero.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "random_damage_with_self_damage",
      minValue: 2,
      maxValue: 4,
      targetType: 'any_minion', // Using the enum for consistency
      requiresTarget: true
    }
  },
  {
    id: 47008,
    name: "Blood Reaver",
    manaCost: 6,
    attack: 7,
    health: 5,
    type: "minion",
    race: "titan",
    rarity: "epic",
    description: "Battlecry: Deal 5 damage to your hero. Lifesteal.",
    keywords: ["battlecry", "lifesteal"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "damage",
      value: 5,
      targetType: 'friendly_hero'
    }
  },
  {
    id: 47009,
    name: "Dark Whisperer",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Corrupt a friendly Titan, giving it +2/+2.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "buff",
      buffAttack: 2, // Using the property defined in BattlecryEffect
      buffHealth: 2, // Using the property defined in BattlecryEffect
      targetType: 'friendly_minion', // Using existing enum value for friendly minion
      requiresTarget: true
    }
  },
  {
    id: 47010,
    name: "Lesser Void Contract",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Deal 4 damage to your hero. Destroy a random card in your opponent's hand.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: 'friendly_hero', // Using the enum for consistency
      sideEffect: {
        type: "destroy_random_opponent_card"
      }
    }
  }
];

// Export the array to be used in other files
export default selfDamageCards;