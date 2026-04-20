import { CardData } from '../types';

/**
 * Collection of spell cards
 * Organized by class with various spell effects
 */
export const spellCards: CardData[] = [
{
    id: 6000,
    name: "Spirit Echo",
    manaCost: 7,
    type: "spell",
    rarity: "rare",
    description: "Summon copies of enemy minions. They have 1 Health remaining.",
    keywords: [],
    heroClass: "priest",
    class: "Priest",
    spellEffect: {
      type: "summon_copies",
      source: "enemy_board",
      modifyHealth: 1
    },
    collectible: true
  },
{
    id: 6001,
    name: "Wave of Stasis",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Set the Attack of all enemy minions to 1 until your next turn.",
    keywords: [],
    heroClass: "priest",
    class: "Priest",
    spellEffect: {
      type: "attack_modifier",
      value: 1,
      targetType: "all_enemy_minions",
      duration: "until_next_turn"
    },
    collectible: true
  },
{
    id: 6002,
    name: "Raise Dead",
    manaCost: 0,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage to your hero. Return two friendly minions that died this game to your hand.",
    keywords: [],
    heroClass: "necromancer",
    class: "Necromancer",
    spellEffect: {
      type: "damage_hero",
      value: 3,
      returnFromDead: {
        count: 2,
        type: "minion"
      }
    },
    collectible: true
  },
{
    id: 6003,
    name: "Soul Schism",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Give a minion +1/+2. Summon a copy of it.",
    keywords: [],
    heroClass: "priest",
    class: "Priest",
    spellEffect: {
      type: "buff_and_copy",
      buffAttack: 1,
      buffHealth: 2,
      requiresTarget: true,
      targetType: "any_minion"
    },
    collectible: true
  },
{
    id: 6004,
    name: "Blessing of Strength",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Give a minion +2/+6.",
    keywords: [],
    heroClass: "priest",
    class: "Priest",
    spellEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 6,
      requiresTarget: true,
      targetType: "any_minion"
    },
    collectible: true
  },
{
    id: 6005,
    name: "Renew",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Restore 3 Health. Foresee a spell.",
    keywords: [
      "discover"
    ],
    heroClass: "priest",
    class: "Priest",
    spellEffect: {
      type: "heal",
      value: 3,
      targetType: "any_character",
      secondaryEffect: {
        type: "discover",
        cardType: "spell",
        fromClass: "self"
      }
    },
    collectible: true
  },
{
    id: 6006,
    name: "Apotheosis",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Give a minion +2/+3 and Lifesteal.",
    keywords: [
      "lifesteal"
    ],
    heroClass: "priest",
    class: "Priest",
    spellEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 3,
      addKeywords: [
        "lifesteal"
      ],
      requiresTarget: true,
      targetType: "any_minion"
    },
    collectible: true
  },
{
    id: 6007,
    name: "Blessing of Baldur",
    manaCost: 3,
    type: "spell",
    rarity: "rare",
    description: "Give a minion Divine Shield, then summon a 1/1 copy of it.",
    keywords: [
      "divine_shield"
    ],
    heroClass: "paladin",
    class: "Paladin",
    spellEffect: {
      type: "buff_and_copy",
      addKeywords: [
        "divine_shield"
      ],
      requiresTarget: true,
      targetType: "any_minion",
      copyStats: {
        attack: 1,
        health: 1
      }
    },
    collectible: true
  },
{
    id: 6008,
    name: "Hand of the Divine",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Give a minion +2/+1. Draw a card.",
    keywords: [],
    heroClass: "paladin",
    class: "Paladin",
    spellEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 1,
      requiresTarget: true,
      targetType: "any_minion",
      drawCards: 1
    },
    collectible: true
  },
{
    id: 6009,
    name: "Tome of Wisdom",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Give a minion +1/+1 and 'Deathrattle: Add a Libram of Wisdom to your hand.'",
    keywords: [
      "deathrattle"
    ],
    heroClass: "paladin",
    class: "Paladin",
    spellEffect: {
      type: "buff",
      buffAttack: 1,
      buffHealth: 1,
      addDeathrattle: "add_libram_of_wisdom_to_hand",
      requiresTarget: true,
      targetType: "any_minion"
    },
    collectible: true
  }
];

// Export default
export default spellCards;
