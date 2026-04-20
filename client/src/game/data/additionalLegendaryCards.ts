/**
 * Additional mythic cards for Echoes of Ymir
 * More powerful and unique cards with game-changing effects
 */
import { CardData } from '../types';

/**
 * Collection of additional mythic minions
 * Expanding the mythic roster with more class-specific and neutral options
 */
export const additionalLegendaryCards: CardData[] = [
{
    id: 96001,
    name: "Nidhöggr, Root-Gnawer",
    manaCost: 9,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Set a hero's remaining Health to 15.",
    keywords: [
      "battlecry"
    ],
    heroClass: "neutral",
    class: "Neutral",
    race: "Dragon",
    battlecry: {
      type: "set_health",
      value: 15,
      requiresTarget: true,
      targetType: "any_hero"
    },
    collectible: true
  },
{
    id: 96002,
    name: "Jörmungandr, Dream Serpent",
    manaCost: 9,
    attack: 4,
    health: 12,
    type: "minion",
    rarity: "rare",
    description: "At the end of your turn, add a Dream Card to your hand.",
    keywords: [],
    heroClass: "neutral",
    class: "Neutral",
    race: "Dragon",
    collectible: true
  },
{
    id: 96003,
    name: "Apophis, World Ender",
    manaCost: 10,
    attack: 12,
    health: 12,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Destroy all other minions and discard your hand.",
    keywords: [
      "battlecry"
    ],
    heroClass: "neutral",
    class: "Neutral",
    race: "Dragon",
    battlecry: {
      type: "destroy",
      requiresTarget: false,
      targetType: "all_minions",
      discardCount: -1,
      summonCardId: 96004
    },
    collectible: true
  },
{
    id: 96004,
    name: "Völva Bloodweaver",
    manaCost: 2,
    attack: 1,
    health: 1,
    type: "minion",
    rarity: "rare",
    description: "Spell Damage +1. Deathrattle: Draw a card.",
    keywords: [
      "deathrattle"
    ],
    heroClass: "neutral",
    class: "Neutral",
    spellPower: 1,
    deathrattle: {
      type: "draw",
      value: 1,
      targetType: "none"
    },
    collectible: true
  },
{
    id: 96005,
    name: "Echo of the Bold",
    manaCost: 5,
    attack: 6,
    health: 2,
    type: "minion",
    rarity: "rare",
    description: "Charge. Battlecry: Summon two 1/1 Whelps for your opponent.",
    keywords: [
      "charge",
      "battlecry"
    ],
    heroClass: "neutral",
    class: "Neutral",
    battlecry: {
      type: "summon",
      requiresTarget: false,
      targetType: "none",
      summonCount: 2,
      summonForOpponent: true,
      summonCardId: 96006
    },
    collectible: true
  },
{
    id: 96006,
    name: "Fáfnir, Spell Wyrm",
    manaCost: 9,
    attack: 4,
    health: 12,
    type: "minion",
    rarity: "rare",
    description: "Spell Damage +5",
    keywords: [],
    heroClass: "neutral",
    class: "Neutral",
    race: "Dragon",
    spellPower: 5,
    collectible: true
  },
{
    id: 96007,
    name: "Echo of the Relic Hunter",
    manaCost: 5,
    attack: 5,
    health: 4,
    type: "minion",
    rarity: "epic",
    description: "Battlecry: Destroy your opponent's weapon and draw cards equal to its Durability.",
    keywords: [
      "battlecry"
    ],
    heroClass: "neutral",
    class: "Neutral",
    battlecry: {
      type: "destroy_weapon_draw",
      requiresTarget: false,
      targetType: "enemy_weapon"
    },
    collectible: true
  },
{
    id: 96008,
    name: "Níðhöggr's Champion",
    manaCost: 6,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Destroy an enemy minion with Taunt.",
    keywords: [
      "battlecry"
    ],
    heroClass: "neutral",
    class: "Neutral",
    battlecry: {
      type: "destroy",
      requiresTarget: true,
      targetType: "enemy_taunt"
    },
    collectible: true
  },
{
    id: 96009,
    name: "Nótt Stargazer",
    manaCost: 4,
    attack: 3,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Shuffle the 'Map to the Golden Monkey' into your deck.",
    keywords: [
      "battlecry"
    ],
    heroClass: "neutral",
    class: "Neutral",
    battlecry: {
      type: "shuffle_special",
      cardName: "Map to the Golden Monkey",
      requiresTarget: false
    },
    collectible: true
  },
{
    id: 96010,
    name: "Gaia, Primal Lord",
    manaCost: 8,
    attack: 7,
    health: 7,
    type: "minion",
    rarity: "epic",
    description: "Battlecry: If you played an Elemental last turn, cast an Elemental Invocation.",
    keywords: [
      "battlecry",
      "discover"
    ],
    heroClass: "shaman",
    class: "Shaman",
    race: "Elemental",
    battlecry: {
      type: "discover",
      requiresTarget: false,
      targetType: "none",
      discoveryType: "spell",
      discoveryCount: 4,
      discoveryClass: "shaman"
    },
    collectible: true
  },
{
    id: 96011,
    name: "Helios, Sun Fragment",
    manaCost: 5,
    attack: 3,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Whenever you cast a spell, add a random Priest spell to your hand.",
    keywords: [],
    heroClass: "priest",
    class: "Priest",
    race: "Elemental",
    collectible: true
  },
{
    id: 96012,
    name: "Nyx, the Hollow",
    manaCost: 9,
    type: "hero",
    rarity: 'epic',
    description: "Battlecry: Gain Stealth until your next turn. Passive Hero Power: During your turn, add a Shadow Reflection to your hand.",
    keywords: [
      "battlecry"
    ],
    heroClass: "rogue",
    class: "Rogue",
    armor: 5,
    battlecry: {
      type: "buff",
      requiresTarget: false,
      targetType: "none",
      buffAttack: 1,
      buffHealth: 1
    },
    collectible: true
  },
{
    id: 96013,
    name: "Allfather's Projection's Apprentice",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Your cards that summon minions summon twice as many.",
    keywords: [],
    heroClass: "mage",
    class: "Mage",
    collectible: true
  },
{
    id: 96014,
    name: "Skorpius, the Devourer",
    manaCost: 9,
    attack: 8,
    health: 4,
    type: "minion",
    rarity: "epic",
    description: "Deathrattle: Return this to your hand and summon a 4/4 Undead Warrior.",
    keywords: [
      "deathrattle"
    ],
    heroClass: "rogue",
    class: "Rogue",
    deathrattle: {
      type: "summon",
      summonCardId: 9070,
      targetType: "none"
    },
    collectible: true
  },
{
    id: 96015,
    name: "Vidar, the Relentless",
    manaCost: 10,
    type: "hero",
    rarity: "mythic",
    description: "Battlecry: Cast all spells you've played this game (targets chosen randomly).",
    keywords: [
      "battlecry"
    ],
    heroClass: "hunter",
    class: "Hunter",
    armor: 5,
    battlecry: {
      type: "cast_all_spells",
      requiresTarget: false,
      targetType: "none"
    },
    collectible: true
  },
{
    id: 96016,
    name: "Skull of Hel",
    manaCost: 6,
    type: "spell",
    rarity: "rare",
    description: "Draw 3 cards. Outcast: Reduce their Cost by (3).",
    keywords: [
      "outcast"
    ],
    heroClass: "berserker",
    class: "Berserker",
    spellEffect: {
      type: "draw",
      value: 3,
      requiresTarget: false,
      targetType: "none"
    },
    outcastEffect: {
      type: "mana_reduction",
      value: 3,
      targetRequired: false
    },
    collectible: true
  }
];

// Export the additional mythic cards
export default additionalLegendaryCards;