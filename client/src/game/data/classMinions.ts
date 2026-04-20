/**
 * Class-specific minions for Echoes of Ymir
 * Each class gets unique minions with class identity mechanics
 */
import { CardData, HeroClass } from '../types';

/**
 * Collection of minions for different classes
 * Includes minions with various class-specific mechanics
 */
export const classMinions: CardData[] = [
{
  id: 16510,
  name: "Twilight Acolyte",
  manaCost: 3,
  attack: 2,
  health: 4,
  type: "minion",
  rarity: "rare",
  description: "Battlecry: If you're holding a Dragon, swap a minion's Attack and Health.",
  keywords: ["battlecry"],
  heroClass: "priest",
  class: "Priest",
  battlecry: {
    type: "swap_stats",
    requiresTarget: true,
    targetType: "any_minion",
    condition: {
      holdingDragon: true
    }
  },
  collectible: true
},

{
  id: 16511,
  name: "Crystalline Oracle",
  manaCost: 1,
  attack: 1,
  health: 1,
  type: "minion",
  rarity: "rare",
  description: "Deathrattle: Copy a card from your opponent's deck and add it to your hand.",
  keywords: ["deathrattle"],
  heroClass: "priest",
  class: "Priest",
  deathrattle: {
    type: "copy_from_opponent_deck",
    count: 1
  },
  collectible: true
},

{
  id: 16512,
  name: "Shadowy Figure",
  manaCost: 2,
  attack: 2,
  health: 2,
  type: "minion",
  rarity: "epic",
  description: "Battlecry: Transform into a 2/2 copy of a friendly Deathrattle minion.",
  keywords: ["battlecry"],
  heroClass: "priest",
  class: "Priest",
  battlecry: {
    type: "transform_into_copy",
    requiresTarget: true,
    targetType: "friendly_deathrattle_minion",
    copyStats: {
      attack: 2,
      health: 2
    }
  },
  collectible: true
},

{
  id: 16513,
  name: "Cleric of Scales",
  manaCost: 1,
  attack: 1,
  health: 1,
  type: "minion",
  rarity: "rare",
  description: "Battlecry: If you're holding a Dragon, Foresee a spell from your deck.",
  keywords: ["battlecry", "discover"],
  heroClass: "priest",
  class: "Priest",
  battlecry: {
    type: "discover",
    cardType: "spell",
    source: "deck",
    condition: {
      holdingDragon: true
    }
  },
  collectible: true
},

{
  id: 16514,
  name: "Light-Touched Zealot's Warden",
  manaCost: 1,
  attack: 1,
  health: 2,
  type: "minion",
  rarity: "common",
  description: "Whenever a character is healed, gain +2 Attack.",
  keywords: [],
  heroClass: "priest",
  class: "Priest",
  triggeredEffect: {
    type: "on_heal",
    value: 2
  },
  collectible: true
}
];

// Export the class minions
export default classMinions;