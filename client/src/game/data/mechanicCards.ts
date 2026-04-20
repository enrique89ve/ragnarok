/**
 * Cards focused on Battlecry and Deathrattle mechanics
 * Designed to showcase these key card game mechanics
 */
import { CardData } from '../types';

/**
 * Collection of cards with Battlecry and Deathrattle mechanics
 * These cards are designed to showcase these mechanics with powerful effects
 */
export const   mechanicCards: CardData[] = [{
      id: 1005, // Added missing ID for first card
      name: "Damaging Spell", // Added missing name
      manaCost: 1, // Added missing mana cost
      description: "Deal 1 damage to any target", // Added missing description
      
      type: "spell", // Corrected type to be a valid CardType
      rarity: "common", // Added missing rarity
      class: "Neutral", // Added class
      collectible: true, // Added collectible property
      
      spellEffect: { // Converted to a proper spellEffect
        type: "damage",
        value: 1,
        requiresTarget: true,
        targetType: "any"
      }
    },
  {
    id: 1006, // Changed from 40002 to match the ID in cards.ts
      name: "Dwarven Tinker",

      manaCost: 2,
      attack: 1,

      health: 1,
      type: "minion",

      rarity: "common",
      description: "Battlecry: Draw a card.",

      keywords: ["battlecry"],
      heroClass: "neutral",
      class: "Neutral",

                  battlecry: {
        type: "draw",

        value: 1,
      requiresTarget: false,

      targetType: "none"
    },
      collectible: true
      },
  {
      id: 40003,

      name: "Ironbeak Owl",
      manaCost: 3,

      attack: 2,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Silence a minion.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Beast",

                  battlecry: {
        type: "silence",

          requiresTarget: true,
      targetType: "any_minion"

       },
      collectible: true
      },
  {
      id: 40004,

      name: "Spellbreaker",
      manaCost: 4,

      attack: 4,
      health: 3,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Silence a minion.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "silence",


        requiresTarget: true,

      targetType: "any_minion"
    },
      collectible: true
      },
  {
      id: 40005,

      name: "Berserker's Herald",
      manaCost: 1,

      attack: 1,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Give a minion +2 Attack this turn.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "buff",


        requiresTarget: true,

      targetType: "any_minion",
      buffAttack: 2,

      buffHealth: 0,
      temporaryEffect: true

       },
      collectible: true
      },
  {
      id: 40006,

      name: "Svartálfar Smith",
      manaCost: 4,

      attack: 4,
      health: 4,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Give a minion +2 Attack this turn.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "buff",


        requiresTarget: true,

      targetType: "any_minion",
      buffAttack: 2,

      buffHealth: 0,
      temporaryEffect: true

       },
      collectible: true
      },
  {
      id: 40007,

      name: "Sól's Acolyte",
      manaCost: 3,

      attack: 3,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Give a friendly minion +1/+1.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "buff",


        requiresTarget: true,

      targetType: "friendly_minion",
      buffAttack: 1,

      buffHealth: 1
    },
      collectible: true
      },
  {
      id: 40008,

      name: "Shield of Asgard",
      manaCost: 4,

      attack: 2,
      health: 3,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Give adjacent minions +1/+1 and Taunt.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "buff",


        requiresTarget: false,

      targetType: "none",
      buffAttack: 1,

      buffHealth: 1,
      adjacentOnly: true,

      grantTaunt: true
    },
      collectible: true
      },
  {
      id: 40010,

      name: "Muspel Firebrand",
      manaCost: 6,

      attack: 6,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Deal 3 damage.",
      flavorText: "Forged in the heart of Muspelheim, it carries the fire giant's wrath.",
      keywords: ["battlecry"],

      heroClass: "shaman",
      class: "Shaman",
      race: "Elemental",

                  battlecry: {
        type: "damage",

        value: 3,
      requiresTarget: true,

      targetType: "any"
    },
      collectible: true
      },
  {
      id: 40011,

      name: "Fáfnir's Thrall",
      manaCost: 2,

      attack: 2,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Draw a card.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      deathrattle: {
        type: "draw",
      value: 1,

      targetType: "none"
    },
      collectible: true
      },
  {
      id: 40012,

      name: "Dwarven Construct",
      manaCost: 3,

      attack: 2,
      health: 3,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Summon a 2/1 Damaged Golem.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",

      deathrattle: {
        type: "summon",

        summonCardId: 40112, // ID for 2/1 Damaged Golem (would need to be defined)
      targetType: "none"

       },
      collectible: true
      },
  {
      id: 40014,

      name: "Auðumbla the Primordial",
      manaCost: 6,

      attack: 4,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Deathrattle: Summon a 4/5 Primordial Calf.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      deathrattle: {
        type: "summon",
    summonCardId: 40114, // ID for 4/5 Baine Bloodhoof (would need to be defined)
      targetType: "none"

       },
      collectible: true
      },
  {
      id: 40015,

      name: "Hel's Guardian",
      manaCost: 5,

      attack: 3,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Taunt.   Deathrattle: Summon a 1/2 Slime with Taunt.",
    keywords: ["deathrattle", "taunt"],
      heroClass: "neutral",
      class: "Neutral",

      deathrattle: {
        type: "summon",

        summonCardId: 9070, // ID for 1/2 Slime token
      targetType: "none"

       },
      collectible: true
      },
  {
      id: 4516,

      name: "Clockwork Whelp",
      manaCost: 6,

      attack: 2,
      health: 2,

      type: "minion",
      rarity: "rare",

      description: "Deathrattle: Summon a 7/7 Automaton Dragon.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",

      deathrattle: {
        type: "summon",

        summonCardId: 40116, // ID for 7/7 Mechanical Dragon (would need to be defined)
      targetType: "none"

       },
      collectible: true
      },
  {
      id: 4517,

      name: "Explosive Sheep",
      manaCost: 2,

      attack: 1,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Deal 2 damage to all minions.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",

      deathrattle: {
        type: "damage",

        value: 2,
      targetType: "all"

       },
      collectible: true
      },
  {
      id: 40018,

      name: "Khartut Defender",
      manaCost: 6,

      attack: 3,
      health: 4,

      type: "minion",
      rarity: "rare",

      description: "Taunt, Reborn.   Deathrattle: Restore 3 Health to your hero.",
    keywords: ["deathrattle", "taunt", "reborn"],
      heroClass: "neutral",
      class: "Neutral",

      deathrattle: {
        type: "heal",

        value: 3,
      targetType: "friendly_hero"

       },
      collectible: true
      },
  {
      id: 40021,

      name: "Twilight Summoner",
      manaCost: 4,

      attack: 1,
      health: 1,

      type: "minion",
      rarity: "rare",

      description: "Deathrattle: Summon a 5/5 Faceless Destroyer.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      deathrattle: {
        type: "summon",
    summonCardId: 40121, // ID for 5/5 Faceless Destroyer (would need to be defined)
      targetType: "none"

       },
      collectible: true
      },
  {
      id: 40022,

      name: "Corrupted Healbot",
      manaCost: 5,

      attack: 6,
      health: 6,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Restore 8 Health to the enemy hero.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",

      deathrattle: {
        type: "heal",

        value: 8,
      targetType: "enemy_hero"

       },
      collectible: true
      },
  {
      id: 40023,

      name: "Unearthed Raptor",
      manaCost: 3,

      attack: 3,
      health: 4,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Copy a friendly minion's Deathrattle.",
      keywords: ["battlecry"],

      heroClass: "rogue",
      class: "Rogue",
      race: "Beast",

                  battlecry: {
        type: "transform", // Special handling to copy deathrattle
      requiresTarget: true,

      targetType: "friendly_minion"
    },
      collectible: true
      },
  {
      id: 40024,

      name: "Abomination",
      manaCost: 5,

      attack: 4,
      health: 4,

      type: "minion",
      rarity: "rare",

      description: "Taunt.   Deathrattle: Deal 2 damage to ALL characters.",
    keywords: ["taunt", "deathrattle"],
      heroClass: "neutral",
      class: "Neutral",

      deathrattle: {
        type: "damage",

        value: 2,
      targetType: "all"

       },
      collectible: true
      },
  {
      id: 40025,

      name: "Dwarven Destroyer",
      manaCost: 4,

      attack: 4,
      health: 3,

      type: "minion",
      rarity: "rare",

      description: "Deathrattle: Summon a random 2-Cost minion.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",

      deathrattle: {
        type: "summon",

        targetType: "none",
      isRandom: true,

      specificManaCost: 2,
        summonCardId: 40026

         },
      collectible: true
      },
  {
      id: 40026,

      name: "Mistress of Mixtures",
      manaCost: 1,

      attack: 2,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Restore 4 Health to both heroes.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      deathrattle: {
        type: "heal",
      value: 4,

      targetType: "all"
    },
      collectible: true
      },
  {
      id: 40027,

      name: "Mad Scientist",
      manaCost: 2,

      attack: 2,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Put a Rune from your deck into the battlefield.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      deathrattle: {
        type: "draw",
      targetType: "none",

      isSecret: true,
        value: 1

         },
      collectible: true
      },
  {
  id: 40028,
  
  name: "Odin's Raven Scout",
  manaCost: 3,
  
  attack: 3,
  health: 3,
  
  type: "minion",
  rarity: "rare",
  
  description: "Combo: Deal 2 damage.",
  keywords: ["combo"],
  
  heroClass: "rogue",
  class: "Rogue",
  collectible: true,
  comboEffect: {
    type: "damage",
    value: 2,
  
    requiresTarget: true,
    targetType: "any"
  }
},
{
      id: 40029,
      name: "Void Caller",
      manaCost: 4,
      attack: 3,
      health: 4,
      type: "minion",
      rarity: "common",
      description: "Deathrattle: Put a random Titan from your hand into the battlefield.",
      keywords: ["deathrattle"],
      heroClass: "warlock",
      class: "Warlock",
      race: "Titan",
      deathrattle: {
        type: "summon",
        targetType: "none",
        fromHand: true,
        specificRace: "titan",
        summonCardId: 40030
      },
      collectible: true
    },
];

// Define the tokens needed for deathrattle summons and other summoning effects
export const tokenCards: CardData[] = [
  // Token for Release the Garmr
  {
    id: 9091,
    name: "Hound",
    manaCost: 1,
    attack: 1,
    health: 1,
    type: "minion",
    rarity: "common",
    description: "Charge",
    keywords: ["charge"],
    heroClass: "hunter",
    class: 'Hunter',
    race: "Beast",
    collectible: false
  },
  // Token for Fenrir's Call (formerly Feral Spirit)
  {
    id: 30087,
    name: "Spirit Wolf",
    manaCost: 2,
    attack: 2,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Taunt",
    keywords: ["taunt"],
    heroClass: "shaman", // Token card, not collectible
    class: "Shaman",
    collectible: false
  },
  {
    id: 40200,
    name: "Damaged Golem",
    manaCost: 1,
    attack: 2,
    health: 1,
    type: "minion",
    rarity: "common",
    description: "A broken mechanical minion.",
    keywords: [],
    heroClass: "neutral",
    class: "Neutral",
    race: "Automaton",
    collectible: false
  },
  {
    id: 40201,
    name: "Baine Bloodhoof",
    manaCost: 4,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "epic",
    description: "Famed warrior of the Nine Realms.",
    keywords: [],
    heroClass: "neutral",
    class: "Neutral",
    collectible: false
  },
  {
    id: 9070,
    name: "Slime",
    manaCost: 1,
    attack: 1,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Taunt",
    keywords: ["taunt"],
    heroClass: "neutral",
    class: "Neutral",
    collectible: false
  },
  {
    id: 40202,
    name: "Mechanical Dragon",
    manaCost: 7,
    attack: 7,
    health: 7,
    type: "minion",
    rarity: "rare",
    description: "A mechanical dragon construct.",
    keywords: [],
    heroClass: "neutral",
    class: "Neutral",
    race: "Automaton",
    collectible: false
  },
  {
    id: 40121,
    name: "Faceless Destroyer",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "common",
    description: "A shapeshifting entity without form.",
    keywords: [],
    heroClass: "neutral",
    class: "Neutral",
    collectible: false
  },
  // Token for the Twin Slice "Second Slice" effect
  {
    id: 9092,
    name: "Second Slice",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Give your hero +1 Attack this turn.",
    keywords: [],
    heroClass: "berserker",
    class: "Berserker",
    spellEffect: {
      type: "buff",
      buffAttack: 1,
      buffHealth: 0,
      requiresTarget: true,
      targetType: "friendly_hero",
      temporaryEffect: true
    },
    collectible: false
  }
];

// Export both card collections
export default { mechanicCards, tokenCards };