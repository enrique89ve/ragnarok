/**
 * @deprecated LEGACY FILE - DO NOT ADD NEW CARDS HERE
 * 
 * This file is deprecated. All new cards should be added to:
 * client/src/game/data/cardSets/rogueCards.ts
 * 
 * This file remains for backwards compatibility but will be removed in a future update.
 * The authoritative source for Rogue cards is now cardSets/rogueCards.ts using the
 * createCard() builder API pattern.
 */
import { CardData } from '../types';

/**
 * Collection of Rogue class cards
 * Card IDs: 
 * - Regular Rogue cards: 12xxx series
 * - Rogue spell cards: 31xxx series
 * - Combo-specific tokens: 12xxx series (usually 500+)
 */
export const rogueCards: CardData[] = [
  // ROGUE SPELLS
  {
    id: 12101,
    name: "Shadow of Loki",
    manaCost: 0,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage to an undamaged minion.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "undamaged_minion",
      requiresTarget: true
    }
  },
  {
    id: 12102,
    name: "Óðinn's Foresight",
    manaCost: 0,
    type: "spell",
    rarity: "common",
    description: "The next spell you cast this turn costs (3) less.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "reduce_spell_cost",
      value: 3,
      targetType: "none",
      duration: "this_turn"
    }
  },
  {
    id: 12103,
    name: "Hel's Path",
    manaCost: 0,
    type: "spell",
    rarity: "common",
    description: "Return a friendly minion to your hand. It costs (2) less.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "return_to_hand",
      targetType: "friendly_minion",
      requiresTarget: true,
      costReduction: 2
    }
  },
  {
    id: 12104,
    name: "Jörmungandr Venom",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Give your weapon +2 Attack.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "buff_weapon",
      value: 2,
      targetType: "player_weapon",
      requiresTarget: false
    }
  },
  {
    id: 12105,
    name: "Shadow Strike",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage to the enemy hero.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "enemy_hero",
      requiresTarget: false
    }
  },
  {
    id: 12106,
    name: "Mist of Niflheim",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Return an enemy minion to your opponent's hand.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "return_to_hand",
      targetType: "enemy_minion",
      requiresTarget: true
    }
  },
  {
    id: 12107,
    name: "Serpent's Fang",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage. Combo: Deal 4 damage instead.",
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "any",
      requiresTarget: true
    },
    comboEffect: {
      type: "damage",
      value: 4,
      targetType: "any"
    }
  },
  {
    id: 12108,
    name: "Daggers of Víðarr",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 1 damage to all enemy minions. Draw a card.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "aoe_damage",
      value: 1,
      targetType: "enemy_minions",
      drawCards: 1
    }
  },
  {
    id: 12109,
    name: "Aegis Tempest",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Destroy your weapon and deal its damage to all enemy minions.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "weapon_damage_aoe",
      targetType: "enemy_minions",
      destroyWeapon: true
    }
  },
  {
    id: 12110,
    name: "Hel's Execution",
    manaCost: 5,
    type: "spell",
    rarity: "common",
    description: "Destroy an enemy minion.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "destroy",
      targetType: "enemy_minion",
      requiresTarget: true
    }
  },

  // ROGUE MINIONS
  {
    id: 12201,
    name: "Loki's Shadow Ringleader",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Combo: Summon a 2/1 Shadow Thief.",
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    combo: {
      type: "summon",
      value: 1,
      summonCardId: 12501 // Shadow Thief token
    }
  },
  {
    id: 12202,
    name: "Odin's Raven Scout",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Combo: Deal 2 damage.",
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    combo: {
      type: "damage",
      value: 2,
      targetType: "any",
      requiresTarget: true
    }
  },
  {
    id: 12203,
    name: "Loki's Disciple",
    manaCost: 4,
    attack: 4,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Give a friendly minion Stealth until your next turn.",
    keywords: ["battlecry"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    battlecry: {
      type: "give_stealth",
      targetType: 'friendly_minion',
      requiresTarget: true,
      // Note: duration is handled internally by the effect logic
    }
  },
  {
    id: 12204,
    name: "Kidnapper",
    manaCost: 6,
    attack: 5,
    health: 3,
    type: "minion",
    rarity: "rare",
    description: "Combo: Return a minion to its owner's hand.",
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    combo: {
      type: "return_to_hand",
      targetType: "any_minion",
      requiresTarget: true
    }
  },
  {
    id: 12205,
    name: "Earthen Ring Farseer",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Battlecry: Restore 3 Health.",
    keywords: ["battlecry"],
    heroClass: "neutral",
    class: "Rogue",
    collectible: true,
    battlecry: {
      type: "heal",
      value: 3,
      targetType: 'any',
      requiresTarget: true
    }
  },

  // ROGUE WEAPONS
  {
    id: 12301,
    name: "Wicked Knife",
    manaCost: 1,
    attack: 1,
    durability: 2,
    type: "weapon",
    rarity: "common",
    description: "The Rogue's trusty dagger.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: false // This is the basic Hero Power weapon
  },
  {
    id: 12302,
    name: "Poisoned Blade",
    manaCost: 4,
    attack: 1,
    durability: 3,
    type: "weapon",
    rarity: "rare",
    description: "Your Hero Power gives this weapon +1 Attack instead of replacing it.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    weaponEffect: {
      type: "hero_power_enhances",
      interactsWithHeroPower: true
    }
  },
  {
    id: 12303,
    name: "Assassin's Blade",
    manaCost: 5,
    attack: 3,
    durability: 4,
    type: "weapon",
    rarity: "common",
    description: "A lethal blade with a long reach.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true
  },
  {
    id: 12304,
    name: "Perdition's Blade",
    manaCost: 3,
    attack: 2,
    durability: 2,
    type: "weapon",
    rarity: "common",
    description: "Battlecry: Deal 1 damage. Combo: Deal 2 instead.",
    keywords: ["battlecry", "combo"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    battlecry: {
      type: "damage",
      value: 1,
      targetType: 'any',
      requiresTarget: true
    }
  },

  // ADVANCED ROGUE CARDS
  {
    id: 12401,
    name: "Raven's Striking Curse",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage to the enemy hero. Combo: Return this to your hand next turn.",
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "enemy_hero"
    },
    comboEffect: {
      type: "return_to_hand_next_turn",
      targetType: "self"
    }
  },
  {
    id: 12402,
    name: "Shadow Dancer",
    manaCost: 5,
    attack: 4,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Stealth. After this attacks, gain Stealth.",
    keywords: ["stealth"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    onAttack: {
      type: "after_attack",
      effect: "gain_stealth"
    }
  },
  {
    id: 12403,
    name: "Fade Shadow",
    manaCost: 0,
    type: "spell",
    rarity: "rare",
    description: "Give a friendly minion Stealth until your next turn. Combo: And +2/+2.",
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    spellEffect: {
      type: "give_stealth",
      targetType: "friendly_minion",
      requiresTarget: true,
      duration: "next_turn"
    },
    comboEffect: {
      type: "buff",
      targetType: "friendly_minion",
      attack: 2,
      health: 2
    }
  },
  {
    id: 12404,
    name: "Erik the Shadow Lord",
    manaCost: 3,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: 'rare',
    description: "Combo: Gain +2/+2 for each card played earlier this turn.",
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    combo: {
      type: "buff_per_card_played",
      attack: 2,
      health: 2
    }
  },
  {
    id: 12405,
    name: "Poison Master",
    manaCost: 4,
    attack: 4,
    health: 3,
    type: "minion",
    rarity: "rare",
    description: "Combo: Give your weapon Poisonous.",
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    collectible: true,
    combo: {
      type: "give_weapon_effect",
      effect: "poisonous"
    }
  },

  // TOKEN CARDS
  {
    id: 12501,
    name: "Shadow Thief",
    manaCost: 1,
    attack: 2,
    health: 1,
    type: "minion",
    rarity: "common",
    description: "A shadow servant of Loki's realm.",
    keywords: [],
    heroClass: "rogue",
    class: "Rogue",
    collectible: false // Token card
  }
];

// Export the array to be used in other files
export default rogueCards;