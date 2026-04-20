import { CardData } from '../types';

/**
 * Collection of mythic cards
 * Powerful unique cards with game-changing effects
 */
export const legendaryCards: CardData[] = [
  {
    id: 20003,
    name: "Unbound Flame of Olympus",
    manaCost: 7,
    attack: 7,
    health: 5,
    type: "minion",
    rarity: "epic",
    description: "At the end of your turn, deal 2 damage to ALL other characters.",
    keywords: [],
    heroClass: "neutral",
    race: "Elemental",
    collectible: true,
    class: "Neutral"
  },
  {
    id: 20005,
    name: "Ares Bloodscream",
    manaCost: 8,
    attack: 4,
    health: 9,
    type: "minion",
    rarity: "rare",
    description: "Charge. Battlecry: If this minion is damaged, gain +6 Attack.",
    keywords: ["charge", "battlecry"],
    heroClass: "warrior",
    class: "Warrior",
    battlecry: {
      type: "buff",
      requiresTarget: false,
      targetType: "none",
      buffAttack: 6,
      buffHealth: 0,
      isBasedOnStats: true
    },
    collectible: true
  },
  {
    id: 20006,
    name: "Týr, Champion of Justice",
    manaCost: 8,
    attack: 6,
    health: 6,
    type: "minion",
    rarity: 'epic',
    description: "Divine Shield. Taunt.   Deathrattle: Equip a 5/3 Ashbringer.",
    keywords: ["divine_shield", "taunt", "deathrattle"],
    heroClass: "paladin",
    class: "Paladin",
    deathrattle: {
      type: "summon",
      targetType: "none",
      summonCardId: 20019
    },
    collectible: true
  },
  {
    id: 20007,
    name: "Cerberus Rex",
    manaCost: 9,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "rare",
    description: "Charge",
    keywords: ["charge"],
    heroClass: "hunter",
    race: "Beast",
    class: "Hunter",
    collectible: true
  },
  {
    id: 20010,
    name: "Erebus, Void Lord",
    manaCost: 9,
    attack: 3,
    health: 15,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Destroy your hero and replace it with Erebus, Void Lord.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    race: "Titan",
    battlecry: {
      type: "change_hero_power",
      requiresTarget: false,
      targetType: "none",
      value: 0 // Placeholder for proper hero power handling
    },
    collectible: true
  },
  {
    id: 20011,
    name: "Al'Akir the Windlord",
    manaCost: 8,
    attack: 3,
    health: 5,
    type: "minion",
    rarity: "mythic",
    description: "Windfury, Charge, Divine Shield, Taunt",
    keywords: ["windfury", "charge", "divine_shield", "taunt"],
    heroClass: "shaman",
    race: "Elemental",
    class: "Shaman",
    collectible: true
  },
  {
    id: 20012,
    name: "Erik the Shadow Lord",
    manaCost: 3,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: 'rare',
    description: "Combo: Gain +2/+2 for each other card you've played this turn.",
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    comboEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 2,
      targetType: "self",
      requiresTarget: false
    },
    collectible: true
  },
  {
    id: 20013,
    name: "Metamorphosis Typhon",
    manaCost: 8,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "epic",
    description: "Battlecry: Transform into Titan Form, gaining +5 Attack and Lifesteal this turn.",
    keywords: ["battlecry"],
    heroClass: "berserker",
    class: "Berserker",
    battlecry: {
      type: "buff",
      requiresTarget: false,
      targetType: "none",
      buffAttack: 5,
      buffHealth: 0
    },
    collectible: true
  },
  {
    id: 20014,
    name: "Cernunnos Staghelm",
    manaCost: 4,
    attack: 3,
    health: 5,
    type: "minion",
    rarity: 'rare',
    description: "Your Choose One cards and powers have both effects combined.",
    keywords: [],
    heroClass: "druid",
    class: "Druid",
    collectible: true
  },
  {
    id: 20015,
    name: "Eternal Flame of Muspel",
    manaCost: 7,
    attack: 4,
    health: 7,
    type: "minion",
    rarity: "mythic",
    description: "Every third spell you cast each turn costs (0).",
    keywords: [],
    heroClass: "mage",
    class: "Mage",
    collectible: true
  },
  {
    id: 20016,
    name: "Blackwater Behemoth",
    manaCost: 9,
    attack: 10,
    health: 10,
    type: "minion",
    rarity: 'epic',
    description: "Colossal +1. Lifesteal.",
    keywords: ["colossal", "lifesteal"],
    heroClass: "neutral",
    race: "Beast",
    class: "Neutral",
    collectible: true
  },
  {
    id: 20017,
    name: "Echo of the Bladedancer",
    manaCost: 4,
    attack: 3,
    health: 4,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Frenzy: Deal damage equal to this minion's Attack to all enemy minions.",
    keywords: ["rush", "frenzy"],
    heroClass: "neutral",
    class: "Neutral",
    frenzyEffect: {
      type: "aoe_damage",
      value: 3,
      targetType: "enemy_minion",
      triggered: false,
      isBasedOnStats: true
    },
    collectible: true
  },
  {
    id: 20018,
    name: "Echo of the Shining",
    manaCost: 8,
    attack: 6,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Deathrattle: Equip a 5/2 Corrupted Ashbringer that gives your other minions +2 Attack.",
    keywords: ["taunt", "deathrattle"],
    heroClass: "paladin",
    class: "Paladin",
    deathrattle: {
      type: "summon",
      targetType: "none"
    },
    collectible: true
  },
  {
    id: 20019,
    name: "Xyrella, the Devout",
    manaCost: 7,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "epic",
    description: "Battlecry: For each spell in your hand, summon a 3/3 copy of a minion that died this game.",
    keywords: ["battlecry"],
    heroClass: "necromancer",
    class: "Necromancer",
    battlecry: {
      type: "summon",
      requiresTarget: false,
      targetType: "none",
      isRandom: true,
      fromGraveyard: true,
      summonCardId: 20020
    },
    collectible: true
  },
  {
    id: 20021,
    name: "Drowned Sovereign",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: If you've cast a spell that costs (5) or more this game, choose a Relic of the Deep.",
    keywords: ["battlecry", "discover"],
    heroClass: "neutral",
    class: "Neutral",
    battlecry: {
      type: "discover",
      requiresTarget: false,
      targetType: "none",
      discoveryType: "spell",
      discoveryCount: 3
    },
    collectible: true
  },
  {
    id: 20022,
    name: "The Soularium",
    manaCost: 1,
    type: "spell",
    rarity: 'rare',
    description: "Draw 3 cards. At the end of your turn, discard them.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    spellEffect: {
      type: "draw",
      value: 3,
      requiresTarget: false,
      targetType: "none",
      temporaryEffect: true,
      delayedEffect: true,
      delayedTrigger: "end_of_turn"
    },
    collectible: true
  },
  {
    id: 20023,
    name: "Faithful Keeper of Loki",
    manaCost: 7,
    attack: 4,
    health: 6,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Add a copy of each spell you've cast on friendly characters this game to your hand.",
    keywords: ["battlecry"],
    heroClass: "paladin",
    class: "Paladin",
    battlecry: {
      type: "draw",
      requiresTarget: false,
      targetType: "none",
      value: 1
    },
    collectible: true
  },
  {
    id: 20024,
    name: "Perfect Envoy of Olympus",
    manaCost: 2,
    attack: 3,
    health: 2,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: If your deck has no duplicates, wish for the perfect card.",
    keywords: ["battlecry"],
    heroClass: "neutral",
    class: "Neutral",
    battlecry: {
      type: "discover",
      requiresTarget: false,
      targetType: "none",
      discoveryType: "any",
      discoveryCount: 3
    },
    collectible: true
  },
  {
    id: 20025,
    name: "Reno the Wanderer",
    manaCost: 6,
    attack: 4,
    health: 6,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: If your deck has no duplicates, fully heal your hero.",
    keywords: ["battlecry"],
    heroClass: "neutral",
    class: "Neutral",
    battlecry: {
      type: "heal",
      value: 30,
      requiresTarget: false,
      targetType: "friendly_hero"
    },
    collectible: true
  },
  {
    id: 20026,
    name: "Yggdrasil's Blight",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Enemy spells cost (5) more next turn.",
    keywords: ["battlecry"],
    heroClass: "neutral",
    class: "Neutral",
    battlecry: {
      type: "buff",
      value: 5,
      requiresTarget: false,
      targetType: "none",
      temporaryEffect: true
    },
    collectible: true
  },
  {
    id: 20027,
    name: "Hel's Bloodreaver",
    manaCost: 10,
    type: "hero",
    rarity: 'epic',
    description: "Battlecry: Summon all friendly Draugr that died this game.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    armor: 5,
    battlecry: {
      type: "summon",
      requiresTarget: false,
      targetType: "none",
      fromGraveyard: true,
      conditionalTarget: "titan"
    },
    collectible: true
  },
  {
    id: 20030,
    name: "Skadi, Frost Queen",
    manaCost: 9,
    type: "hero",
    rarity: "mythic",
    description: "Battlecry: Summon a 3/6 Water Elemental. Your Elementals have Lifesteal this game.",
    keywords: ["battlecry", "lifesteal"],
    heroClass: "mage",
    class: "Mage",
    armor: 5,
    battlecry: {
      type: "summon",
      requiresTarget: false,
      targetType: "none",
      summonCardId: 20031
    },
    collectible: true
  },
  {
    id: 20031,
    name: "Frost Wraith",
    manaCost: 4,
    attack: 3,
    health: 6,
    type: "minion",
    rarity: "common",
    description: "Freeze any character damaged by this minion.",
    flavorText: "A spectral being of pure cold, summoned by Skadi, Frost Queen.",
    keywords: [],
    race: "Elemental",
    heroClass: "mage",
    class: "Mage",
    collectible: true
  },
  {
    id: 20032,
    name: "Deathstalker Orion",
    manaCost: 6,
    type: "hero",
    rarity: 'epic',
    description: "Battlecry: Deal 2 damage to all enemy minions.",
    keywords: ["battlecry"],
    heroClass: "hunter",
    class: "Hunter",
    armor: 5,
    battlecry: {
      type: "damage",
      value: 2,
      requiresTarget: false,
      targetType: "all_enemy_minions"
    },
    collectible: true
  },
  {
    id: 20034,
    name: "Sphere of Sapience",
    manaCost: 1,
    attack: 0,
    durability: 4,
    type: "weapon",
    rarity: 'epic',
    description: "At the start of your turn, look at the top card of your deck. You can put it at the bottom and lose 1 Durability.",
    keywords: [],
    heroClass: "neutral",
    class: "Neutral",
    collectible: true
  },
  {
    id: 20035,
    name: "Gungnir's Fury",
    manaCost: 7,
    attack: 7,
    durability: 1,
    type: "weapon",
    rarity: "epic",
    description: "Attacking a minion costs 1 Attack instead of 1 Durability.",
    keywords: [],
    heroClass: "warrior",
    class: "Warrior",
    collectible: true
  },
  {
    id: 20036,
    name: "Skull of the Man'ari",
    manaCost: 5,
    attack: 0,
    durability: 3,
    type: "weapon",
    rarity: 'rare',
    description: "At the start of your turn, summon a Titan from your hand.",
    keywords: [],
    heroClass: "warlock",
    class: "Warlock",
    collectible: true
  }
];

// Export the mythic cards
export default legendaryCards;