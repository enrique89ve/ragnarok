/**
 * Additional classic class minions for Echoes of Ymir
 * Iconic class-specific minions with class-relevant abilities
 */
import { CardData } from '../types';

/**
 * Collection of additional class minions
 * More iconic class-specific minions for each hero class
 */
export const additionalClassMinions: CardData[] = [
  {
    id: 40002,
    name: "Sorcerer's Apprentice",
    manaCost: 2,
    attack: 3,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Your spells cost (1) less.",
    keywords: [],
    heroClass: "mage", // Special handling in game logic for spell cost reduction
    class: "Mage",
    collectible: true
  },
  {
    id: 40003,
    name: "Dwarven Armorer",
    manaCost: 2,
    attack: 1,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Whenever a friendly minion takes damage, gain 1 Armor.",
    keywords: [],
    heroClass: "warrior", // Special handling in game logic for armor gain
    class: "Warrior",
    collectible: true
  },
  {
    id: 40004,
    name: "Berserker of Óðinn",
  manaCost: 3,
  
  attack: 2,
  health: 4,
  
  type: "minion",
  rarity: "rare",
  
  description: "Whenever a minion takes damage, gain +1 Attack.",
  keywords: [],
  
  heroClass: "warrior", // Special handling in game logic for attack gain
  
  class: "Warrior",
      collectible: true
  },
  {
    id: 40020,
    name: 'Armored Warhorse',
  manaCost: 4,
  
  attack: 5,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "Whenever your hero gains Armor, gain +1/+1.",
  keywords: [],
  
  heroClass: "warrior",
      class: "Warrior",
      collectible: true
  },
  {
    id: 40021,
    name: 'Muspelheim Defender',
      manaCost: 2,

      attack: 2,
      health: 3,

      type: "minion",
      rarity: "common",

      description: "Taunt. Battlecry: If you have a weapon equipped, gain +1 Health.",
      keywords: ["taunt", "battlecry"],

      heroClass: "warrior",
      class: "Warrior",
                  battlecry: {
        type: "conditional_buff",
        condition: "weapon_equipped",
        buffAttack: 0,
        buffHealth: 1,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
    id: 40022,
    name: 'Reckless Berserker',
  manaCost: 3,
  
  attack: 2,
  health: 4,
  
  type: "minion",
  rarity: "common",
  
  description: "Whenever this minion takes damage, deal 2 damage to a random enemy.",
  keywords: ["enrage"],
  
  heroClass: "warrior",
      class: "Warrior",
      collectible: true
  },
  {
    id: 40023,
    name: 'Ironforge Captain',
      manaCost: 5,

      attack: 4,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Gain Armor equal to this minion's Attack.",
      keywords: ["battlecry"],

      heroClass: "warrior",
      class: "Warrior",
                  battlecry: {
        type: "gain_armor_equal_to_attack",
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
    id: 40024,
    name: 'Bloodthirsty Raider',
      manaCost: 2,

      attack: 3,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Deal 1 damage to a friendly minion.",
      keywords: ["battlecry"],

      heroClass: "warrior",
      class: "Warrior",
                  battlecry: {
        type: "damage",
        value: 1,
        requiresTarget: true,
        targetType: "friendly_minion"
      },
      collectible: true
  },
  {
    id: 40025,
    name: "Gladiator's Champion",
    manaCost: 4,
    attack: 3,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Whenever you equip a weapon, gain +2 Attack.",
    keywords: [],
    heroClass: "warrior",
    class: "Warrior",
    collectible: true
  },
  {
    id: 40026,
    name: 'Battle-Hardened Veteran',
      manaCost: 6,

      attack: 5,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Gain 5 Armor. If you already have Armor, draw a card.",
      keywords: ["battlecry"],

      heroClass: "warrior",
      class: "Warrior",
                  battlecry: {
        type: "gain_armor_conditional_draw",
        value: 5,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
    id: 40027,
    name: 'Enraged Berserker',
  manaCost: 5,
  
  attack: 3,
  health: 6,
  
  type: "minion",
  rarity: "common",
  
  description: "Has +3 Attack while damaged.",
  keywords: ["enrage"],
  
  heroClass: "warrior",
      class: "Warrior",
      collectible: true
  },
  {
    id: 40028,
    name: 'Weapons Master',
      manaCost: 3,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Give your weapon +1/+1.",
      keywords: ["battlecry"],

      heroClass: "warrior",
      class: "Warrior",
                  battlecry: {
        type: "buff_weapon",
        buffAttack: 1,
        buffDurability: 1,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
    id: 40029,
    name: 'Heroic Challenger',
      manaCost: 7,

      attack: 6,
      health: 6,

      type: "minion",
      rarity: 'epic',

      description: "Battlecry: Equip a random weapon from your deck. Gain Armor equal to its Attack.",
      keywords: ["battlecry"],

      heroClass: "warrior",
      class: "Warrior",
                  battlecry: {
        type: "equip_weapon_from_deck_gain_armor",
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
    id: 40005,
    name: "Týr's Peacekeeper",
      manaCost: 3,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Change an enemy minion's Attack to 1.",
      keywords: ["battlecry"],

      heroClass: "paladin",
      class: "Paladin",
                  battlecry: {
        type: "debuff",


        requiresTarget: true,

      targetType: "enemy_minion",
    buffAttack: -1000, // Special value for setting to 1
      buffHealth: 0

       },
      collectible: true
      },
  {
    id: 40006,
    name: 'Sunwalker',
  manaCost: 6,
  
  attack: 4,
  health: 5,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt, Divine Shield",
  keywords: ["taunt", "divine_shield"],
  heroClass: "paladin",
      class: "Paladin",
      collectible: true
  },
  {
    id: 40007,
    name: 'Nemean Lion',
      manaCost: 6,

      attack: 6,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Deathrattle: Summon two 2/2 Hyenas.",
      keywords: ["deathrattle"],

      heroClass: "hunter",
      class: "Hunter",
      race: "Beast",

      deathrattle: {
        type: "summon",
        value: 2, // Number of minions to summon
        targetType: "none",
        summonCardId: 40008
    },
      collectible: true
      },
  {
    id: 40008,
    name: "Garmr's Pack",
  manaCost: 2,
  
  attack: 2,
  health: 2,
  
  type: "minion",
  rarity: "common",
  
  description: "Whenever a friendly Beast dies, gain +2/+1.",
  keywords: [],
  
  heroClass: "hunter", race: "Beast",
  
  // Special handling in game logic for buff on beast death
  
  class: "Hunter",
      collectible: true
  },
  {
    id: 40009,
    name: 'Keeper of the Grove',
      manaCost: 4,

      attack: 2,
      health: 2,

      type: "minion",
      rarity: "rare",

      description: "Choose One - Deal 2 damage; or Silence a minion.",
      keywords: ["choose_one"],

      heroClass: "druid",
      class: "Druid",
      chooseOneOptions: [
        {
          id: 40009.1,
          name: "Keeper of the Grove: Damage",
          manaCost: 4,
          type: "spell",
          rarity: "rare",
          description: "Deal 2 damage.",
          keywords: [],
          heroClass: "druid",
          class: "Druid",
          collectible: false,
          spellEffect: {
            type: "damage",
            value: 2,
            requiresTarget: true,
            targetType: "any"
          }
        },
        {
          id: 40009.2,
          name: "Keeper of the Grove: Silence",
          manaCost: 4,
          type: "spell",
          rarity: "rare",
          description: "Silence a minion.",
          keywords: [],
          heroClass: "druid",
          class: "Druid",
          collectible: false,
          spellEffect: {
            type: "silence",
            requiresTarget: true,
            targetType: "any_minion"
          }
        }
      ],
      collectible: true
  },
  {
    id: 40010,
    name: 'Ancient of Wisdom',
      manaCost: 7,

      attack: 5,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Choose One - Draw 2 cards; or Restore 5 Health.",
      keywords: ["choose_one"],

      heroClass: "druid",
      class: "Druid",
      chooseOneOptions: [
        {
          id: 40010.1,
          name: "Ancient of Wisdom: Draw",
          manaCost: 7,
          type: "spell",
          rarity: "rare",
          description: "Draw 2 cards.",
          keywords: [],
          heroClass: "druid",
          class: "Druid",
          collectible: false,
          spellEffect: {
            type: "draw",
            value: 2,
            requiresTarget: false,
            targetType: "none"
          }
        },
        {
          id: 40010.2,
          name: "Ancient of Wisdom: Heal",
          manaCost: 7,
          type: "spell",
          rarity: "rare",
          description: "Restore 5 Health.",
          keywords: [],
          heroClass: "druid",
          class: "Druid",
          collectible: false,
          spellEffect: {
            type: "heal",
            value: 5,
            requiresTarget: true,
            targetType: "any"
          }
        }
      ],
      collectible: true
  },
  {
    id: 40012,
    name: "Helheim Dreadknight's Shadow Priest",
      manaCost: 6,

      attack: 4,
      health: 5,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Take control of an enemy minion with 2 or less Attack.",
      keywords: ["battlecry"],

      heroClass: "priest",
      class: "Priest",
                  battlecry: {
        type: "transform", // Special handling for mind control
      requiresTarget: true,

      targetType: "enemy_minion",
      conditionalTarget: "enemy_minion_low_attack"

       },
      collectible: true
      },
  {
    id: 40013,
    name: 'Muspel Imp',
      manaCost: 1,

      attack: 3,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Deal 3 damage to your hero.",
      keywords: ["battlecry"],

      heroClass: "warlock",
      class: "Warlock",
      race: "Titan",

                  battlecry: {
        type: "damage",

        value: 3,
      requiresTarget: true,

      targetType: "friendly_hero"
    },
      collectible: true
      },
  {
    id: 40014,
    name: 'Helheim Guardian',
      manaCost: 5,

      attack: 5,
      health: 7,

      type: "minion",
      rarity: "rare",

      description: "Charge.   Battlecry: Discard two random cards.",
    keywords: ["charge", "battlecry"],
      heroClass: "warlock",
      class: "Warlock",

      race: "Titan",
                  battlecry: {
        type: "draw", // Special handling for discard
    value: -2, // Negative to indicate discard
      requiresTarget: false,

      targetType: "none"
    },
      collectible: true
      },
  {
    id: 40015,
    name: "Primordial Fury",
  manaCost: 3,
  
  attack: 2,
  health: 4,
  
  type: "minion",
  rarity: "common",
  
  description: "Whenever you play a card with Overload, gain +1/+1.",
  keywords: [],
  
  heroClass: "shaman", race: "Elemental",
  
  // Special handling in game logic for buff on Overload
  
  class: "Shaman",
      collectible: true
  },
  {
    id: 40019,
    name: "Battlefiend",
    manaCost: 1,
    attack: 1,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "After your hero attacks, gain +1 Attack.",
    keywords: [],
    heroClass: "berserker", 
    race: "Titan",
    // Special handling in game logic for attack gain
    class: "Berserker",
    collectible: true
  }
];

// Export the additional class minions
export default additionalClassMinions;