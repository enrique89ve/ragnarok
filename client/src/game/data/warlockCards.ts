/**
 * @deprecated LEGACY FILE - DO NOT ADD NEW CARDS HERE
 * 
 * This file is deprecated. All new cards should be added to:
 * client/src/game/data/cardSets/warlockCards.ts
 * 
 * This file remains for backwards compatibility but will be removed in a future update.
 * The authoritative source for Warlock cards is now cardSets/warlockCards.ts using the
 * createCard() builder API pattern.
 */
import { CardData } from '../types';

/**
 * Collection of Warlock class cards
 * Card IDs: 
 * - Regular Warlock cards: 17xxx series
 * - Warlock spell cards: 37xxx series
 * - Titan-specific tokens: 17xxx series (usually 500+)
 */
export const warlockCards: CardData[] = [
  // BASIC WARLOCK CARDS
  {
    id: 17001,
    name: "Ginnungagap Wanderer",
    manaCost: 1,
    attack: 1,
    health: 3,
    type: "minion",
    race: "titan",
    rarity: "common",
    description: "Taunt",
    keywords: ["taunt"],
    heroClass: "warlock",
    class: "Warlock", 
    collectible: true
  },
  {
    id: 17002,
    name: "Rune of Shadows",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 4 damage to a minion.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "minion_only",
      requiresTarget: true
    }
  },
  {
    id: 17003,
    name: "Muspel's Inferno",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage to ALL characters.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "aoe_damage",
      value: 3,
      targetType: "all_characters"
    }
  },
  {
    id: 17004,
    name: "Doomed Guardian",
    manaCost: 5,
    attack: 5,
    health: 7,
    type: "minion",
    race: "titan",
    rarity: "rare",
    description: "Charge. Battlecry: Discard two random cards.",
    keywords: ["charge", "battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "discard_random",
      discardCount: 2
    }
  },
  {
    id: 17005,
    name: "Hel's Flame",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Deal 4 damage. Discard a random card.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: 'any',
      requiresTarget: true,
      sideEffect: {
        type: "discard_random",
        count: 1
      }
    }
  },
  {
    id: 17006,
    name: "Soul's Siphon",
    manaCost: 6,
    type: "spell",
    rarity: "common",
    description: "Destroy a minion. Restore 3 Health to your hero.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "destroy",
      targetType: "minion_only",
      requiresTarget: true,
      sideEffect: {
        type: "restore_health",
        value: 3,
        targetType: "own_hero"
      }
    }
  },
  {
    id: 17007,
    name: "Ginnungagap Shade",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    race: "titan",
    rarity: "rare",
    description: "Battlecry: Destroy both adjacent minions and gain their Attack and Health.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "consume_adjacent"
    }
  },
  {
    id: 17008,
    name: "Shadow Keeper",
    manaCost: 2,
    attack: 3,
    health: 2,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Discard a random card. Deathrattle: Draw a card.",
    keywords: ["battlecry", "deathrattle"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "discard_random",
      discardCount: 1
    },
    deathrattle: {
      type: "draw",
      count: 1
    }
  },
  {
    id: 17009,
    name: "Ginnungagap Abyss",
    manaCost: 8,
    type: "spell",
    rarity: "rare",
    description: "Destroy all minions.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "destroy_all_minions"
    }
  },
  {
    id: 17010,
    name: "Loki's Spark",
    manaCost: 1,
    attack: 3,
    health: 2,
    type: "minion",
    race: "titan",
    rarity: "common",
    description: "Battlecry: Deal 3 damage to your hero.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "damage",
      value: 3,
      targetType: 'friendly_hero'
    }
  },

  // ADVANCED WARLOCK CARDS
  {
    id: 17101,
    name: "Flame-Lord of Muspelheim",
    manaCost: 9,
    attack: 3,
    health: 15,
    type: "minion",
    race: "titan",
    rarity: 'epic',
    description: "Battlecry: Replace your hero with Erebus, Void Lord.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    battlecry: {
      type: "replace_hero"
      // Special handling for Jaraxxus is implemented in the game logic
      // with health, weapon, and hero power defined there
    }
  },
  {
    id: 17102,
    name: "Titan Sense",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Draw 2 Titans from your deck.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "draw_specific",
      count: 2,
      cardType: "titan"
    }
  },
  {
    id: 17103,
    name: "Hel's Covenant",
    manaCost: 0,
    type: "spell",
    rarity: "common",
    description: "Destroy a Titan. Restore 5 Health to your hero.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "destroy",
      targetType: "titan_only",
      requiresTarget: true,
      sideEffect: {
        type: "restore_health",
        value: 5,
        targetType: "own_hero"
      }
    }
  },
  {
    id: 17104,
    name: "Surtr's Fist",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "When you play or discard this, deal 4 damage to a random enemy.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage_random_enemy",
      value: 4
    }
  },
  {
    id: 17105,
    name: "Shadow Flame",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Destroy a friendly minion and deal its Attack damage to all enemy minions.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "shadowflame",
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 17106,
    name: "Soul Renderer",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Deal 5 damage to a minion. If it dies, summon a 5/5 Titan.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 5,
      targetType: "minion_only",
      requiresTarget: true,
      deathEffect: {
        type: "summon",
        cardId: 17502 // Soul Remnant token
      }
    }
  },
  {
    id: 17107,
    name: "Void Devourer",
    manaCost: 6,
    attack: 8,
    health: 8,
    type: "minion",
    race: "titan",
    rarity: "rare",
    description: "Whenever your opponent plays a card, discard the top 3 cards of your deck.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    triggeredEffect: {
      type: "mill_on_opponent_play",
      count: 3
    }
  },
  {
    id: 17108,
    name: "Void Breaker",
    manaCost: 5,
    attack: 5,
    health: 4,
    type: "minion",
    race: "titan",
    rarity: "common",
    description: "Inspire: Destroy a random minion on each side.",
    keywords: ["inspire"],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    inspireEffect: {
      type: "destroy_random_minion_both_sides"
    }
  },
  {
    id: 17109,
    name: "Titan's Heart",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Deal 5 damage to a minion. If it's a friendly Titan, give it +5/+5 instead.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "conditional_effect",
      targetType: "minion_only",
      requiresTarget: true,
      condition: {
        type: "is_friendly_titan"
      },
      trueEffect: {
        type: "buff",
        attack: 5,
        health: 5
      },
      falseEffect: {
        type: "damage",
        value: 5
      }
    }
  },
  {
    id: 17110,
    name: "Shadow Imp",
    manaCost: 1,
    attack: 1,
    health: 3,
    type: "minion",
    race: "titan",
    rarity: "common",
    description: "Whenever you discard a card, draw a card.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    triggeredEffect: {
      type: "draw_on_discard",
      count: 1
    }
  },

  // SPELL-FOCUSED WARLOCK CARDS
  {
    id: 37001,
    name: "Corruption Curse",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Choose an enemy minion. At the start of your turn, destroy it.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "apply_corruption",
      targetType: "enemy_minion",
      requiresTarget: true
    }
  },
  {
    id: 37002,
    name: "Muspel Covenant",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Destroy a friendly minion. Restore 8 Health to your hero.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "destroy",
      targetType: "friendly_minion",
      requiresTarget: true,
      sideEffect: {
        type: "restore_health",
        value: 8,
        targetType: "own_hero"
      }
    }
  },
  {
    id: 37003,
    name: "Vampire's Kiss of Hel",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage. Restore 2 Health to your hero.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: 'any',
      requiresTarget: true,
      sideEffect: {
        type: "restore_health",
        value: 2,
        targetType: "own_hero"
      }
    }
  },
  {
    id: 37004,
    name: "Doom's Curse",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Deal 2 damage to a character. If that kills it, summon a random Titan.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: 'any',
      requiresTarget: true,
      deathEffect: {
        type: "summon_random_titan"
      }
    }
  },
  {
    id: 37005,
    name: "Hag's Summons",
    manaCost: 5,
    type: "spell",
    rarity: "common",
    description: "Summon a 1/1 Candle, a 2/2 Broom, and a 3/3 Teapot.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "summon_multiple",
      minions: [
        { cardId: 17503 }, // Candle token
        { cardId: 17504 }, // Broom token
        { cardId: 17505 }  // Teapot token
      ]
    }
  },
  {
    id: 37006,
    name: "Seed of Ruin",
    manaCost: 7,
    type: "spell",
    rarity: "rare",
    description: "Deal 5 damage to all enemy minions. Summon two 2/2 Imps.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "aoe_damage",
      value: 5,
      targetType: "enemy_minions",
      sideEffect: {
        type: "summon_multiple",
        minions: [
          { cardId: 17506 }, // Imp token
          { cardId: 17506 }  // Imp token
        ]
      }
    }
  },
  {
    id: 37007,
    name: "Blood Rune",
    manaCost: 2,
    type: "spell",
    rarity: "rare",
    description: "Your next spell this turn costs Health instead of Mana.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "next_spell_costs_health"
    }
  },
  {
    id: 37008,
    name: "Shadow Project",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Each player transforms a random minion in their hand into a Titan.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "transform_random_in_hand",
      transformType: "titan",
      affectBothPlayers: true
    }
  },
  {
    id: 37009,
    name: "Void Bargain",
    manaCost: 8,
    type: "spell",
    rarity: "rare",
    description: "Destroy half of each player's deck.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "destroy_half_deck",
      affectBothPlayers: true
    }
  },
  {
    id: 37010,
    name: "Ritual of Blood",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage to your hero. Draw 3 cards.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "own_hero",
      sideEffect: {
        type: "draw",
        count: 3
      }
    }
  },

  // TOKEN CARDS
  {
    id: 17501,
    name: "Surtr's Infernal",
    manaCost: 6,
    attack: 6,
    health: 6,
    type: "minion",
    race: "titan",
    rarity: "common",
    description: "Summoned by Erebus, Void Lord.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: false // Token card
  },
  {
    id: 17502,
    name: "Soul Remnant",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    race: "titan",
    rarity: "common",
    description: "Drawn from the void.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: false // Token card
  },
  {
    id: 17503,
    name: "Candle",
    manaCost: 1,
    attack: 1,
    health: 1,
    type: "minion",
    rarity: "common",
    description: "Summoned by Kara Kazham!",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: false // Token card
  },
  {
    id: 17504,
    name: "Broom",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Summoned by Kara Kazham!",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: false // Token card
  },
  {
    id: 17505,
    name: "Teapot",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Summoned by Kara Kazham!",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: false // Token card
  },
  {
    id: 17506,
    name: "Imp",
    manaCost: 1,
    attack: 2,
    health: 2,
    type: "minion",
    race: "titan",
    rarity: "common",
    description: "A mischievous titan.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: false // Token card
  }
];

// Export the array to be used in other files
export default warlockCards;