/**
 * Spell Cards - Core Set
 * Migrated from multiple source files on 2026-02-02:
 * - client/src/game/data/spellCards.ts
 * - client/src/game/data/additionalSpellCards.ts
 * 
 * Various spell cards organized by class.
 * ID Range: 6000-6999, 31000-32999
 * 
 * Note: Duplicate IDs removed on 2026-02-02 to avoid conflicts with existing cardRegistry entries.
 */

import { CardData } from '../../../../../types';

// ============================================
// PRIEST SPELLS (6000-6006)
// ============================================
export const priestSpells: CardData[] = [
  {
    id: 6000,
    name: "Spirit Echo",
    manaCost: 7,
    type: "spell",
    rarity: "rare",
    description: "Summon copies of enemy minions. They have 1 Health remaining.",
    flavorText: 'The dead leave echoes. Sometimes the echoes fight back.',
    keywords: [],
    heroClass: "priest",
    class: "Priest",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "summon_copies",
      source: "enemy_board",
      modifyHealth: 1
    }
  },
  {
    id: 6001,
    name: "Wave of Stasis",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Set the Attack of all enemy minions to 1 until your next turn.",
    flavorText: 'Frozen in time. Frozen in place. Frozen in terror.',
    keywords: [],
    heroClass: "priest",
    class: "Priest",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "attack_modifier",
      value: 1,
      targetType: "all_enemy_minions",
      duration: "until_next_turn"
    }
  },
  {
    id: 6002,
    name: "Call of Helheim",
    manaCost: 0,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage to your hero. Return two friendly minions that died this game to your hand.",
    flavorText: 'The gates of Hel swing both ways — for a price.',
    keywords: [],
    heroClass: "necromancer",
    class: "Necromancer",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "damage_hero",
      value: 3,
      returnFromDead: {
        count: 2,
        type: "minion"
      }
    }
  },
  {
    id: 6003,
    name: "Soul Schism",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Give a minion +1/+2. Summon a copy of it.",
    flavorText: 'One soul, two bodies. Neither is quite whole.',
    keywords: [],
    heroClass: "priest",
    class: "Priest",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "buff_and_copy",
      buffAttack: 1,
      buffHealth: 2,
      requiresTarget: true,
      targetType: "any_minion"
    }
  },
  {
    id: 6004,
    name: "Blessing of Strength",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Give a minion +2/+6.",
    flavorText: 'The runes glow. The muscles swell. The enemy retreats.',
    keywords: [],
    heroClass: "priest",
    class: "Priest",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 6,
      requiresTarget: true,
      targetType: "any_minion"
    }
  },
  {
    id: 6005,
    name: "Eir's Renewal",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Restore 3 Health. Foresee a spell.",
    flavorText: 'Eir\'s touch mends what blades have torn. Even the dying find strength.',
    keywords: ["discover"],
    heroClass: "priest",
    class: "Priest",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "heal",
      value: 3,
      targetType: "any_character",
      secondaryEffect: {
        type: "discover",
        cardType: "spell",
        fromClass: "self"
      }
    }
  },
  {
    id: 6006,
    name: "Divine Ascension",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Give a minion +2/+3 and Lifesteal.",
    flavorText: 'To transcend mortality is to carry its weight forever.',
    keywords: ["lifesteal"],
    heroClass: "priest",
    class: "Priest",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 3,
      addKeywords: ["lifesteal"],
      requiresTarget: true,
      targetType: "any_minion"
    }
  }
];

// ============================================
// PALADIN SPELLS (6007-6009)
// ============================================
export const paladinSpells: CardData[] = [
  {
    id: 6007,
    name: "Blessing of Baldur",
    manaCost: 3,
    type: "spell",
    rarity: "rare",
    description: "Give a minion Divine Shield, then summon a 1/1 copy of it.",
    flavorText: 'Baldur\'s light shields the faithful. Even his shadow wards off death.',
    keywords: ["divine_shield"],
    heroClass: "paladin",
    class: "Paladin",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "buff_and_copy",
      addKeywords: ["divine_shield"],
      requiresTarget: true,
      targetType: "any_minion",
      copyStats: {
        attack: 1,
        health: 1
      }
    }
  },
  {
    id: 6008,
    name: "Hand of the Divine",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Give a minion +2/+1. Draw a card.",
    flavorText: 'The gods reach down. The worthy are lifted up.',
    keywords: [],
    heroClass: "paladin",
    class: "Paladin",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 1,
      requiresTarget: true,
      targetType: "any_minion",
      drawCards: 1
    }
  },
  {
    id: 6009,
    name: "Tome of Wisdom",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Give a minion +1/+1 and 'Deathrattle: Add a Tome of Wisdom to your hand.'",
    flavorText: 'Each page contains a rune of power. The book writes more as it is read.',
    keywords: ["deathrattle"],
    heroClass: "paladin",
    class: "Paladin",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "buff",
      buffAttack: 1,
      buffHealth: 1,
      addDeathrattle: "add_libram_of_wisdom_to_hand",
      requiresTarget: true,
      targetType: "any_minion"
    }
  }
];

// ============================================
// MAGE SPELLS (32001-32030)
// ============================================
export const mageSpells: CardData[] = [
  {
    id: 32007,
    name: "Loki's Shapecraft",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Transform a minion into a 1/1 Sheep.",
    flavorText: 'Loki once became a mare to distract Svaðilfari — and bore Sleipnir. A sheep is mercy by comparison. (Gylfaginning 42)',
    keywords: ["transform"],
    heroClass: "mage",
    class: "Mage",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "transform",
      requiresTarget: true,
      targetType: "any_minion",
      transformInto: 31025
    }
  }
];

// ============================================
// SECRET CARDS (32017-32020)
// ============================================
export const secretCards: CardData[] = [
  {
    id: 32017,
    name: 'Seidr Deflection',
    manaCost: 3,
    type: "secret",
    rarity: "rare",
    description: "Rune: When an enemy casts a spell on a minion, summon a 1/3 as the new target.",
    flavorText: 'The spell finds a different target. The caster finds a different problem.',
    keywords: ["secret"],
    heroClass: "mage",
    class: "Mage",
    set: "core",
    collectible: true,
    secretEffect: {
      triggerType: "on_spell_cast",
      effect: {
        type: "redirect_spell",
        summonCardId: 32032,
        requiresTarget: false,
        targetType: "none"
      }
    }
  },
  {
    id: 32020,
    name: "Surtr's Vengeance",
    manaCost: 3,
    type: "secret",
    rarity: "common",
    description: "Rune: When a minion attacks your hero, destroy it.",
    flavorText: 'Surtr\'s flame recognizes no armor, no shield, no plea for mercy.',
    keywords: ["secret"],
    heroClass: "mage",
    class: "Mage",
    set: "core",
    collectible: true,
    secretEffect: {
      triggerType: "on_hero_attack",
      effect: {
        type: "destroy",
        requiresTarget: false,
        targetType: "none"
      }
    }
  }
];

// ============================================
// ROGUE SPELLS (31005-31007)
// ============================================
export const rogueSpells: CardData[] = [];

// ============================================
// WARRIOR SPELLS (31022, 31050-31052)
// ============================================
export const warriorSpells: CardData[] = [
  {
    id: 31022,
    name: 'Aegis Defense',
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Gain 5 Armor. Draw a card.",
    flavorText: 'The shield of the gods holds against all — for now.',
    keywords: [],
    heroClass: "warrior",
    class: "Warrior",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "armor",
      value: 5,
      requiresTarget: false,
      targetType: "friendly_hero",
      drawCards: 1
    }
  }
];

// ============================================
// OTHER CLASS SPELLS
// ============================================
export const otherClassSpells: CardData[] = [
  {
    id: 31017,
    name: "Skadi's Mark",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Change a minion's Health to 1.",
    flavorText: 'Skadi marks her prey. The hunt is already over.',
    keywords: [],
    heroClass: "hunter",
    class: "Hunter",
    set: "core",
    collectible: true,
    spellEffect: {
      type: "set_health",
      value: 1,
      requiresTarget: true,
      targetType: "any_minion"
    }
  }
];

// ============================================
// SPELL TOKENS
// ============================================
export const spellTokens: CardData[] = [
  {
    id: 32033,
    name: "Roaring Torch",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 6 damage.",
    flavorText: 'A torch lit from Muspelheim\'s eternal fire. It burns hotter than mortal flame.',
    keywords: [],
    heroClass: "mage",
    class: "Mage",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "damage",
      value: 6,
      requiresTarget: true,
      targetType: "any_character"
    }
  }
];

export const allSpellCards: CardData[] = [
  ...priestSpells,
  ...paladinSpells,
  ...mageSpells,
  ...secretCards,
  ...rogueSpells,
  ...warriorSpells,
  ...otherClassSpells,
  ...spellTokens
];

export default allSpellCards;
