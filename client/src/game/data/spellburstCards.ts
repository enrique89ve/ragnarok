/**
 * Spellburst cards for Norse mythos card game
 * Spellburst is a one-time effect that triggers after you cast a spell
 */
import { CardData } from '../types';

/**
 * Collection of cards with the Spellburst mechanic
 * These effects trigger once after you cast a spell while the minion is in play
 */
export const spellburstCards: CardData[] = [
  {
    id: 95801,
    name: "Rune Thief",
    manaCost: 1,
    attack: 1,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Spellburst: Foresee a Mage spell.",
    keywords: ["spellburst"],
    heroClass: "rogue", 
    class: "Rogue",
    spellburstEffect: {
      type: "discover",
      targetType: "self",
      consumed: false
    },
    collectible: true
  },
  {
    id: 95802,
    name: "Saga Keeper",
    manaCost: 2,
    attack: 2,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Spellburst: Return the spell to your hand.",
    keywords: ["spellburst"],
    heroClass: "shaman", 
    class: "Shaman",
    spellburstEffect: {
      type: "draw",
      targetType: "spell",
      consumed: false
    },
    collectible: true
  },
  {
    id: 95803,
    name: "Valkyrie Two-Shields",
    manaCost: 3,
    attack: 4,
    health: 2,
    type: "minion",
    rarity: "epic",
    description: "Divine Shield. Spellburst: Gain Divine Shield.",
    keywords: ["divine_shield", "spellburst"],
    heroClass: "paladin", 
    class: "Paladin",
    spellburstEffect: {
      type: "buff",
      targetType: "self",
      consumed: false
    },
    collectible: true
  },
  {
    id: 95804,
    name: "Muspel Brand",
    manaCost: 3,
    attack: 3,
    health: 4,
    type: "minion",
    rarity: "common",
    description: "Spellburst: Deal 4 damage randomly split among all enemy minions.",
    keywords: ["spellburst"],
    heroClass: "mage", 
    class: "Mage",
    spellburstEffect: {
      type: "damage",
      value: 4,
      targetType: "enemy_minion",
      consumed: false
    },
    collectible: true
  },
  {
    id: 95805,
    name: "Speaker of Yggdrasil",
    manaCost: 3,
    attack: 1,
    health: 4,
    type: "minion",
    rarity: "epic",
    description: "Rush, Windfury. Spellburst: Gain Attack and Health equal to the spell's Cost.",
    keywords: ["rush", "windfury", "spellburst"],
    heroClass: "druid", 
    class: "Druid",
    spellburstEffect: {
      type: "buff",
      targetType: "self",
      consumed: false
    },
    collectible: true
  },
  {
    id: 95806,
    name: "Obsidian Runescribe",
    manaCost: 6,
    attack: 4,
    health: 9,
    type: "minion",
    rarity: "common",
    description: "Spellburst: Add 2 random spells from your class to your hand.",
    keywords: ["spellburst"],
    heroClass: "neutral", 
    class: "Neutral",
    race: "Dragon",
    spellburstEffect: {
      type: "discover",
      value: 2,
      targetType: "none",
      consumed: false
    },
    collectible: true
  },
  {
    id: 95807,
    name: "Grove Warden Idunn",
    manaCost: 6,
    attack: 5,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Spellburst: Refresh your Mana Crystals.",
    keywords: ["spellburst"],
    heroClass: "druid", 
    class: "Druid",
    spellburstEffect: {
      type: "buff", // Special handling for mana refresh
      targetType: "none",
      consumed: false
    },
    collectible: true
  },
  {
    id: 95808,
    name: "Headmaster of Niflheim",
    manaCost: 5,
    attack: 4,
    health: 6,
    type: "minion",
    rarity: "rare",
    description: "Spellburst: If the spell destroys any minions, summon them.",
    keywords: ["spellburst"],
    heroClass: "neutral", 
    class: "Neutral",
    spellburstEffect: {
      type: "summon",
      targetType: "none",
      consumed: false
    },
    collectible: true
  }
];

// Export the spellburst cards
export default spellburstCards;