/**
 * Mythic Cards - Core Set
 * Migrated from multiple source files on 2026-02-02:
 * - client/src/game/data/legendaryCards.ts
 * - client/src/game/data/additionalLegendaryCards.ts
 * - client/src/game/data/modernLegendaryCards.ts
 * - client/src/game/data/iconicLegendaryCards.ts
 * - client/src/game/data/finalLegendaryCards.ts
 * - client/src/game/data/expansionLegendaryCards.ts
 * 
 * Powerful unique cards with game-changing effects.
 * ID Range: 20003-20999
 * 
 * Note: Duplicate IDs removed on 2026-02-02 to avoid conflicts with existing cardRegistry entries.
 */

import { CardData } from '../../../../../types';

// ============================================
// NEUTRAL MYTHIC MINIONS (from legendaryCards.ts)
// ============================================
export const neutralLegendaryMinions: CardData[] = [];

// ============================================
// CLASS MYTHIC MINIONS (from legendaryCards.ts)
// ============================================
export const classLegendaryMinions: CardData[] = [
  {
    id: 20006,
    name: "Echo of the Champion",
    manaCost: 8,
    attack: 6,
    health: 6,
    type: "minion",
    rarity: "epic",
    description: "Divine Shield. Taunt. Deathrattle: Equip a 5/3 Ashbringer.",
    flavorText: 'Tyr\'s echo fights on, even after the god has fallen. Honor does not die.',
    keywords: ["divine_shield", "taunt", "deathrattle"],
    heroClass: "paladin",
    class: "Paladin",
    set: "core",
    collectible: true,
    deathrattle: {
      type: "summon",
      targetType: "none",
      summonCardId: 20019
    }
  },
  {
    id: 20011,
    name: "Kari, Lord of Storms",
    manaCost: 8,
    attack: 3,
    health: 5,
    type: "minion",
    rarity: "epic",
    description: "Windfury, Charge, Divine Shield, Taunt",
    flavorText: 'Son of Fornjot, master of the wind. When he breathes, ships capsize.',
    keywords: ["windfury", "charge", "divine_shield", "taunt"],
    heroClass: "shaman",
    race: "Elemental",
    class: "Shaman",
    set: "core",
    collectible: true
  },
  {
    id: 20012,
    name: "Erik the Shadow Lord",
    manaCost: 3,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "rare",
    description: "Combo: Gain +2/+2 for each other card you've played this turn.",
    flavorText: 'He strikes from darkness, and darkness strikes with him.',
    keywords: ["combo"],
    heroClass: "rogue",
    class: "Rogue",
    set: "core",
    collectible: true,
    comboEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 2,
      targetType: "self",
      requiresTarget: false
    }
  }
];

// ============================================
// MYTHIC HERO CARDS
// ============================================
export const legendaryHeroCards: CardData[] = [];

// ============================================
// MYTHIC WEAPONS
// ============================================
export const legendaryWeapons: CardData[] = [];

// ============================================
// MYTHIC SPELLS
// ============================================
export const legendarySpells: CardData[] = [];

// ============================================
// MYTHIC TOKENS
// ============================================
export const legendaryTokens: CardData[] = [];

export const allLegendaryCards: CardData[] = [
  ...neutralLegendaryMinions,
  ...classLegendaryMinions,
  ...legendaryHeroCards,
  ...legendaryWeapons,
  ...legendarySpells,
  ...legendaryTokens
];

export default allLegendaryCards;
