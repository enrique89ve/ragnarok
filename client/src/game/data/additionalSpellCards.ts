/**
 * @deprecated LEGACY FILE - DO NOT ADD NEW CARDS HERE
 * 
 * This file is deprecated. All new cards should be added to their respective class files:
 * - client/src/game/data/cardSets/mageCards.ts
 * - client/src/game/data/cardSets/warriorCards.ts
 * - client/src/game/data/cardSets/priestCards.ts
 * - (etc. for each class)
 * 
 * Cards in this file have been/are being migrated to the cardSets/ folder using the
 * createCard() builder API pattern. This file remains for backwards compatibility.
 */
import { CardData } from '../types';

/**
 * Collection of additional spell cards
 * These are accurate implementations of classic cards
 */
export const additionalSpellCards: CardData[] = [
  {
      id: 31002,
      name: 'Unstable Portal',
      manaCost: 2,
      type: "spell",
      rarity: "rare",
      description: "Add a random minion to your hand. It costs (3) less.",
      keywords: ["discover"],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "discover",
        discoveryType: "minion",
        discoveryCount: 1,
        manaReduction: 3,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  // BEGIN NEW MAGE SPELLS - IDs 32001-32030
  {
      id: 32001,
      name: 'Rune Bolt',
      manaCost: 1,
      type: "spell",
      rarity: "common",
      description: "Deal 2 damage to a minion. This spell gets +2 damage from Spell Damage.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "damage",
        value: 2,
        requiresTarget: true,
        targetType: "any_minion",
        spellDamageMultiplier: 2
      },
      collectible: true
  },
  {
      id: 32002,
      name: 'Runic Barrage',
      manaCost: 1,
      type: "spell",
      rarity: "common",
      description: "Deal 3 damage randomly split among all enemy characters.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "damage",
        value: 3,
        requiresTarget: false,
        targetType: "all_enemy_characters",
        isRandom: true,
        isSplit: true
      },
      collectible: true
  },
  {
      id: 32003,
      name: 'Surtr\'s Wrath',
      manaCost: 4,
      type: "spell",
      rarity: "common",
      description: "Deal 6 damage.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "damage",
        value: 6,
        requiresTarget: true,
        targetType: "any_character"
      },
      collectible: true
  },
  {
      id: 32004,
      name: 'Jötunheim Freeze',
      manaCost: 3,
      type: "spell",
      rarity: "common",
      description: "Freeze all enemy minions.",
      keywords: ["freeze"],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "freeze",
        value: 0,
        requiresTarget: false,
        targetType: "all_enemy_minions"
      },
      collectible: true
  },
  {
      id: 32005,
      name: 'Skadi\'s Arrow',
      manaCost: 2,
      type: "spell",
      rarity: "common",
      description: "Deal 3 damage to a character and Freeze it.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "damage",
        value: 3,
        requiresTarget: true,
        targetType: "any_character",
        freezeTarget: true
      },
      collectible: true
  },
  {
      id: 32006,
      name: 'Athena\'s Wisdom',
      manaCost: 3,
      type: "spell",
      rarity: "common",
      description: "Draw 2 cards.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "draw",
        value: 2,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 32007,
      name: 'Loki\'s Shapecraft',
      manaCost: 4,
      type: "spell",
      rarity: "common",
      description: "Transform a minion into a 1/1 Sheep.",
      keywords: ["transform"],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "transform",
        requiresTarget: true,
        targetType: "any_minion",
        transformInto: 31025 // Sheep token ID
      },
      collectible: true
  },
  {
      id: 32008,
      name: 'Gemini Illusion',
      manaCost: 1,
      type: "spell",
      rarity: "common",
      description: "Summon two 0/2 minions with Taunt.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "summon",
        summonCardId: 32031, // Mirror Image token
        count: 2,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 32009,
      name: 'Niflheim\'s Embrace',
      manaCost: 6,
      type: "spell",
      rarity: "common",
      description: "Deal 2 damage to all enemy minions and Freeze them.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "aoe_damage",
        value: 2,
        requiresTarget: false,
        targetType: "all_enemy_minions",
        freezeTarget: true
      },
      collectible: true
  },
  {
      id: 32010,
      name: 'Muspelheim\'s Fury',
      manaCost: 7,
      type: "spell",
      rarity: "common",
      description: "Deal 4 damage to all enemy minions.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "aoe_damage",
        value: 4,
        requiresTarget: false,
        targetType: "all_enemy_minions"
      },
      collectible: true
  },
  {
      id: 32011,
      name: 'Thrymr\'s Breath',
      manaCost: 4,
      type: "spell",
      rarity: "common",
      description: "Deal 1 damage to a minion and the minions next to it, and Freeze them.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "cleave_damage",
        value: 1,
        requiresTarget: true,
        targetType: "any_minion",
        freezeTarget: true
      },
      collectible: true
  },
  {
      id: 32012,
      name: 'Seidr Burst',
      manaCost: 2,
      type: "spell",
      rarity: "common",
      description: "Deal 1 damage to all enemy minions.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "aoe_damage",
        value: 1,
        requiresTarget: false,
        targetType: "all_enemy_minions"
      },
      collectible: true
  },
  {
      id: 32013,
      name: 'Helios Inferno',
      manaCost: 10,
      type: "spell",
      rarity: "rare",
      description: "Deal 10 damage.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "damage",
        value: 10,
        requiresTarget: true,
        targetType: "any_character"
      },
      collectible: true
  },
  {
      id: 32014,
      name: 'Flame Lance',
      manaCost: 5,
      type: "spell",
      rarity: "common",
      description: "Deal 8 damage to a minion.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "damage",
        value: 8,
        requiresTarget: true,
        targetType: "any_minion"
      },
      collectible: true
  },
  {
      id: 32015,
      name: 'Dragon\'s Breath',
      manaCost: 5,
      type: "spell",
      rarity: "common",
      description: "Deal 4 damage. Costs (1) less for each minion that died this turn.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "damage",
        value: 4,
        requiresTarget: true,
        targetType: "any_character",
        costReductionPerDeadMinion: 1
      },
      collectible: true
  },
  {
      id: 32016,
      name: 'Rune Brilliance',
      manaCost: 6,
      type: "spell",
      rarity: "common",
      description: "Add 3 random Mage spells to your hand.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "discover",
        discoveryType: "spell",
        discoveryClass: "Mage",
        discoveryCount: 3,
        requiresTarget: false,
        targetType: "none",
        autoSelect: true
      },
      collectible: true
  },
  {
      id: 32017,
      name: 'Spellbender',
      manaCost: 3,
      type: "secret",
      rarity: "rare",
      description: "Rune: When an enemy casts a spell on a minion, summon a 1/3 as the new target.",
      keywords: ["secret"],
      heroClass: "mage",
      class: "Mage",
      secretEffect: {
        triggerType: "on_spell_cast",
        effect: {
          type: "redirect_spell",
          summonCardId: 32032, // Spellbender minion
          requiresTarget: false,
          targetType: "none"
        }
      },
      collectible: true
  },
  {
      id: 32018,
      name: 'Mirror Entity',
      manaCost: 3,
      type: "secret",
      rarity: "common",
      description: "Rune: After your opponent plays a minion, summon a copy of it.",
      keywords: ["secret"],
      heroClass: "mage",
      class: "Mage",
      secretEffect: {
        triggerType: "on_minion_summon",
        effect: {
          type: "summon_copy",
          requiresTarget: false,
          targetType: "none"
        }
      },
      collectible: true
  },
  {
      id: 32019,
      name: 'Counterspell',
      manaCost: 3,
      type: "secret",
      rarity: "common",
      description: "Rune: When your opponent casts a spell, Counter it.",
      keywords: ["secret"],
      heroClass: "mage",
      class: "Mage",
      secretEffect: {
        triggerType: "on_spell_cast",
        effect: {
          type: "counter_spell",
          requiresTarget: false,
          targetType: "none"
        }
      },
      collectible: true
  },
  {
      id: 32020,
      name: 'Vaporize',
      manaCost: 3,
      type: "secret",
      rarity: "common",
      description: "Rune: When a minion attacks your hero, destroy it.",
      keywords: ["secret"],
      heroClass: "mage",
      class: "Mage",
      secretEffect: {
        triggerType: "on_hero_attack",
        effect: {
          type: "destroy",
          requiresTarget: false,
          targetType: "none"
        }
      },
      collectible: true
  },
  {
      id: 32021,
      name: 'Galdor Barrage',
      manaCost: 3,
      type: "spell",
      rarity: "rare",
      description: "Deal 3 damage to a minion and 3 damage to adjacent ones.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "cleave_damage",
        value: 3,
        requiresTarget: true,
        targetType: "any_minion",
      },
      collectible: true
  },
  {
      id: 32022,
      name: 'Shatter',
      manaCost: 2,
      type: "spell",
      rarity: "common",
      description: "Destroy a Frozen minion.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "destroy",
        requiresTarget: true,
        targetType: "frozen_minion",
        condition: "is_frozen"
      },
      collectible: true
  },
  {
      id: 32023,
      name: 'Forgotten Torch',
      manaCost: 3,
      type: "spell",
      rarity: "common",
      description: "Deal 3 damage. Shuffle a 'Roaring Torch' into your deck that deals 6 damage.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "damage_and_shuffle",
        value: 3,
        requiresTarget: true,
        targetType: "any_character",
        shuffleCardId: 32033 // Roaring Torch
      },
      collectible: true
  },
  {
      id: 32024,
      name: 'Cabalist\'s Tome',
      manaCost: 5,
      type: "spell",
      rarity: "epic",
      description: "Add 3 random Mage spells to your hand.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "discover",
        discoveryType: "spell",
        discoveryClass: "Mage",
        discoveryCount: 3,
        requiresTarget: false,
        targetType: "none",
        autoSelect: true
      },
      collectible: true
  },
  {
      id: 32025,
      name: 'Frost Lance',
      manaCost: 2,
      type: "spell",
      rarity: "common",
      description: "Deal 4 damage to a minion. If it's Frozen, deal 8 damage instead.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "conditional_damage",
        value: 4,
        enhancedValue: 8,
        requiresTarget: true,
        targetType: "any_minion",
        condition: "is_frozen"
      },
      collectible: true
  },
  {
      id: 32026,
      name: 'Glacial Spike',
      manaCost: 5,
      type: "spell",
      rarity: "rare",
      description: "Deal 4 damage to a minion and Freeze adjacent ones.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "cleave_damage_with_freeze",
        value: 4,
        requiresTarget: true,
        targetType: "any_minion",
        freezeAdjacent: true
      },
      collectible: true
  },
  {
      id: 32027,
      name: 'Rune Surge',
      manaCost: 4,
      type: "spell",
      rarity: "rare",
      description: "Draw a card. Deal damage equal to its Cost.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "draw_and_damage",
        requiresTarget: true,
        targetType: "any_character",
        drawCards: 1,
        damageBasedOnDrawnCardCost: true
      },
      collectible: true
  },
  {
      id: 32028,
      name: 'Elemental Evocation',
      manaCost: 0,
      type: "spell",
      rarity: "common",
      description: "The next Elemental you play this turn costs (2) less.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "cost_reduction",
        value: 2,
        requiresTarget: false,
        targetType: "none",
        specificRace: "elemental",
        temporaryEffect: true
      },
      collectible: true
  },
  {
      id: 32029,
      name: 'Research Project',
      manaCost: 2,
      type: "spell",
      rarity: "common",
      description: "Each player draws 2 cards.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "draw_both",
        value: 2,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 32030,
      name: 'Snap Freeze',
      manaCost: 2,
      type: "spell",
      rarity: "common",
      description: "Freeze a minion. If it's already Frozen, destroy it.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "conditional_freeze_or_destroy",
        requiresTarget: true,
        targetType: "any_minion",
        condition: "is_frozen"
      },
      collectible: true
  },
  // TOKEN CARDS
  {
      id: 32031,
      name: "Gemini Illusion",
      manaCost: 0,
      attack: 0,
      health: 2,
      type: "minion",
      rarity: "common",
      description: "Taunt",
      keywords: ["taunt"],
      heroClass: "mage",
      class: "Mage",
      collectible: false
  },
  {
      id: 32032,
      name: "Spellbender",
      manaCost: 0,
      attack: 1,
      health: 3,
      type: "minion",
      rarity: "common",
      description: "Summoned by Spellbender Rune to block spells.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      collectible: false
  },
  {
      id: 32033,
      name: "Roaring Torch",
      manaCost: 3,
      type: "spell",
      rarity: "common",
      description: "Deal 6 damage.",
      keywords: [],
      heroClass: "mage",
      class: "Mage",
      spellEffect: {
        type: "damage",
        value: 6,
        requiresTarget: true,
        targetType: "any_character"
      },
      collectible: false
  },
  // END NEW MAGE SPELLS
  {
      id: 31004,
      name: 'Ice Block',
      manaCost: 3,
      type: "secret",
      rarity: "epic",
      description: "Rune: When your hero takes fatal damage, prevent it and become Immune this turn.",
      keywords: ["secret"],
      heroClass: "mage",
      class: "Mage",
      secretEffect: {
        triggerType: "on_hero_attack",
        effect: {
          type: "damage",
          value: 0,
          requiresTarget: true,
          targetType: "friendly_hero",
          immuneEffect: true
        }
      },
      collectible: true
  },
  {
      id: 31005,
      name: 'Yggdrasil\'s Rejection',
      manaCost: 2,
      type: "spell",
      rarity: "rare",
      description: "Return an enemy minion to your opponent's hand.",
      keywords: [],
      heroClass: "rogue",
      class: "Rogue",
      spellEffect: {
        type: "transform",
        requiresTarget: true,
        targetType: "enemy_minion",
        returnToHand: true
      },
      collectible: true
  },
  {
      id: 31006,
      name: 'Jörmungandr Venom',
      manaCost: 1,
      type: "spell",
      rarity: "common",
      description: "Give your weapon +2 Attack.",
      keywords: [],
      heroClass: "rogue",
      class: "Rogue",
      spellEffect: {
        type: "buff",
        buffAttack: 2,
        buffHealth: 0,
        requiresTarget: true,
        targetType: "friendly_weapon"
      },
      collectible: true
  },
  {
      id: 31007,
      name: 'Hel\'s Path',
      manaCost: 0,
      type: "spell",
      rarity: "epic",
      description: "Return a friendly minion to your hand. It costs (2) less.",
      keywords: [],
      heroClass: "rogue",
      class: "Rogue",
      spellEffect: {
        type: "transform",
        requiresTarget: true,
        targetType: "friendly_minion",
        returnToHand: true,
        manaReduction: 2
      },
      collectible: true
  },
  {
      id: 31008,
      name: "Baldur's Wrath",
      manaCost: 6,
      type: "spell",
      rarity: "epic",
      description: "Deal 8 damage randomly split among all enemies.",
      keywords: [],
      heroClass: "paladin",
      class: "Paladin",
      spellEffect: {
        type: "damage",
        value: 8,
        requiresTarget: false,
        targetType: "all_enemy_minions_and_hero",
        isRandom: true,
        isSplit: true
      },
      collectible: true
  },
  {
      id: 31017,
      name: "Hunter's Mark",
      manaCost: 1,
      type: "spell",
      rarity: "common",
      description: "Change a minion's Health to 1.",
      keywords: [],
      heroClass: "hunter",
      class: "Hunter",
      spellEffect: {
        type: "set_health",
        value: 1,
        requiresTarget: true,
        targetType: "any_minion"
      },
      collectible: true
  },
  {
      id: 31019,
      name: 'Savage Roar',
      manaCost: 3,
      type: "spell",
      rarity: "common",
      description: "Give your characters +2 Attack this turn.",
      keywords: [],
      heroClass: "druid",
      class: "Druid",
      spellEffect: {
        type: "buff",
        buffAttack: 2,
        requiresTarget: false,
        targetType: "all_friendly_minions",
        temporaryEffect: true,
        includeHeroes: true
      },
      collectible: true
  },
  {
      id: 31022,
      name: 'Aegis Defense',
      manaCost: 3,
      type: "spell",
      rarity: "common",
      description: "Gain 5 Armor. Draw a card.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "armor",
        value: 5,
        requiresTarget: false,
        targetType: "friendly_hero",
        drawCards: 1
      },
      collectible: true
  },
  {
      id: 31050,
      name: 'Defensive Stance',
      manaCost: 2,
      type: "spell",
      rarity: "common",
      description: "Gain 4 Armor. Your next weapon costs (1) less.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "gain_armor_reduce_cost",
        value: 4,
        costReduction: 1,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 31051,
      name: 'Reckless Strike',
      manaCost: 1,
      type: "spell",
      rarity: "common",
      description: "Deal 3 damage to a minion and 1 damage to your hero.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "damage_with_self_damage",
        value: 3,
        selfDamage: 1,
        requiresTarget: true,
        targetType: "any_minion"
      },
      collectible: true
  },
  {
      id: 31052,
      name: "Warrior's Will",
      manaCost: 3,
      type: "spell",
      rarity: "common",
      description: "Deal damage to a minion equal to your Armor (minimum 2).",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "damage_based_on_armor",
        minimumDamage: 2,
        requiresTarget: true,
        targetType: "any_minion"
      },
      collectible: true
  },
  {
      id: 31053,
      name: 'Blade Sharpening',
      manaCost: 1,
      type: "spell",
      rarity: "common",
      description: "Give your weapon +1/+1.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "buff_weapon",
        buffAttack: 1,
        buffDurability: 1,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 31054,
      name: 'Warcry',
      manaCost: 2,
      type: "spell",
      rarity: "common",
      description: "Give all damaged friendly minions +2 Attack.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "buff_damaged_minions",
        buffAttack: 2,
        buffHealth: 0,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 31055,
      name: 'Battle Preparations',
      manaCost: 4,
      type: "spell",
      rarity: "rare",
      description: "Draw a weapon from your deck and gain Armor equal to its Cost.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "draw_weapon_gain_armor",
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 31056,
      name: 'Iron Fortitude',
      manaCost: 5,
      type: "spell",
      rarity: "rare",
      description: "Gain 8 Armor. Reduce the Cost of your Hero Power by (2) this turn.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "gain_armor_reduce_hero_power",
        value: 8,
        heroReduction: 2,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 31057,
      name: 'Cleaving Slash',
      manaCost: 3,
      type: "spell",
      rarity: "common",
      description: "Deal 2 damage to a minion and adjacent ones.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "cleave_damage",
        value: 2,
        requiresTarget: true,
        targetType: "any_minion"
      },
      collectible: true
  },
  {
      id: 31058,
      name: 'Last Stand',
      manaCost: 7,
      type: "spell",
      rarity: "rare",
      description: "Gain Armor equal to your missing Health. Draw a card for each 5 Armor gained.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "armor_based_on_missing_health",
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 31059,
      name: "Champion's Legacy",
      manaCost: 8,
      type: "spell",
      rarity: "rare",
      description: "Equip a 5/2 Weapon. Whenever it attacks, gain 5 Armor.",
      keywords: [],
      heroClass: "warrior",
      class: "Warrior",
      spellEffect: {
        type: "equip_special_weapon",
        weaponAttack: 5,
        weaponDurability: 2,
        armorPerAttack: 5,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true
  },
  {
      id: 31023,
      name: "Gateway to Hel's Siphon",
      manaCost: 6,
      type: "spell",
      rarity: "rare",
      description: "Destroy a minion. Restore 3 Health to your hero.",
      keywords: [],
      heroClass: "warlock",
      class: "Warlock",
      spellEffect: {
        type: "destroy",
        requiresTarget: true,
        targetType: "any_minion",
        healValue: 3,
        secondaryEffect: {
          type: "heal",
          value: 3,
          requiresTarget: false,
          targetType: "friendly_hero"
        }
      },
      collectible: true
  },
  {
      id: 31025,
      name: "Frog",
      manaCost: 0,
      attack: 0,
      health: 1,
      type: "minion",
      rarity: "common",
      description: "Taunt",
      keywords: ["taunt"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: false
  }
];

// Export default
export default additionalSpellCards;