/**
 * Adapt Mechanic Cards
 * Migrated from client/src/game/data/adaptCards.ts on 2026-02-02
 * 
 * Adapt allows players to choose one of three adaptations to enhance a minion.
 * ID Range: 16001-16299
 */

import { CardData } from '../../../../../types';

// ============================================
// ADAPTATION OPTIONS (16001-16010)
// ============================================
export const adaptationOptions: CardData[] = [
  {
    id: 16001,
    name: "Crackling Shield",
    manaCost: 0,
    description: "Give a friendly minion Divine Shield (prevents the next damage it takes)",
    flavorText: 'Lightning made solid. Touch it and learn.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 16002,
    name: "Flaming Claws",
    manaCost: 0,
    description: "Give a friendly minion +3 Attack",
    flavorText: 'The beast\'s claws ignite. Its prey has nowhere to hide.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      buffAttack: 3,
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 16003,
    name: "Living Spores",
    manaCost: 0,
    description: "Give a friendly minion 'Deathrattle: Summon two 1/1 Plants'",
    flavorText: 'Even in death, life persists.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 16004,
    name: "Lightning Speed",
    manaCost: 0,
    description: "Give a friendly minion Windfury (can attack twice per turn)",
    flavorText: 'Faster than thought. Almost faster than fear.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 16005,
    name: "Massive",
    manaCost: 0,
    description: "Give a friendly minion Taunt (must be attacked first)",
    flavorText: 'What it lacks in grace, it makes up for in sheer immovability.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 16006,
    name: "Poison Spit",
    manaCost: 0,
    description: "Give a friendly minion Poisonous (kills any minion it damages)",
    flavorText: 'One drop is enough. Two drops is personal.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 16007,
    name: "Rocky Carapace",
    manaCost: 0,
    description: "Give a friendly minion +3 Health",
    flavorText: 'Layers of stone-hard chitin. Swords shatter against it.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      buffHealth: 3,
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 16008,
    name: "Shrouding Mist",
    manaCost: 0,
    description: "Stealth until your next turn",
    flavorText: 'The mist rises. The beast vanishes. The prey trembles.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 16009,
    name: "Volcanic Might",
    manaCost: 0,
    description: "Give a friendly minion +1/+1",
    flavorText: 'The earth\'s fire flows through its veins.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      buffAttack: 1,
      buffHealth: 1,
      targetType: "friendly_minion",
      requiresTarget: true
    }
  },
  {
    id: 16010,
    name: "Liquid Membrane",
    manaCost: 0,
    description: "Can't be targeted by spells or Hero Powers",
    flavorText: 'Spells slide off its surface like water off oil.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt_option"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "buff",
      targetType: "friendly_minion",
      requiresTarget: true
    }
  }
];

// ============================================
// ADAPT MINIONS & SPELLS (16101-16199)
// ============================================
export const adaptMinions: CardData[] = [
  {
    id: 16101,
    name: "Verdant Longneck",
    manaCost: 5,
    attack: 5,
    health: 4,
    description: "Battlecry: Adapt.",
    flavorText: 'It adapted to survive. Then it adapted to thrive.',
    rarity: "common",
    type: "minion",
    keywords: ["battlecry", "adapt"],
    class: "Neutral",
    set: "core",
    collectible: false,
    battlecry: {
      type: "transform",
      requiresTarget: false,
      targetType: "none"
    }
  },
  {
    id: 16102,
    name: "Elder Longneck",
    manaCost: 3,
    attack: 3,
    health: 1,
    description: "Battlecry: If you're holding a minion with 5 or more Attack, Adapt.",
    flavorText: 'Older than the forests it wanders. Wiser too.',
    rarity: "common",
    type: "minion",
    keywords: ["battlecry", "adapt"],
    class: "Neutral",
    set: "core",
    collectible: false,
    battlecry: {
      type: "transform",
      requiresTarget: false,
      targetType: "none"
    }
  },
  {
    id: 16103,
    name: "Volcanosaur",
    manaCost: 7,
    attack: 5,
    health: 6,
    description: "Battlecry: Adapt, then Adapt.",
    flavorText: 'Born in volcanic vents, hardened by millennia of evolution.',
    rarity: "rare",
    type: "minion",
    keywords: ["battlecry", "adapt"],
    class: "Neutral",
    set: "core",
    collectible: false,
    battlecry: {
      type: "transform",
      requiresTarget: false,
      targetType: "none"
    }
  },
  {
    id: 16104,
    name: "Ravenous Pterrordax",
    manaCost: 4,
    attack: 4,
    health: 4,
    description: "Battlecry: Destroy a friendly minion to Adapt twice.",
    flavorText: 'It consumes the weak to become stronger. Nature is efficient.',
    rarity: "common",
    type: "minion",
    keywords: ["battlecry", "adapt"],
    class: "Neutral",
    set: "core",
    collectible: false,
    battlecry: {
      type: "transform",
      requiresTarget: true,
      targetType: "friendly_minion"
    }
  },
  {
    id: 16105,
    name: "Adapt",
    manaCost: 1,
    description: "Adapt a friendly minion.",
    flavorText: 'Evolution, accelerated.',
    rarity: "common",
    type: "spell",
    keywords: ["adapt"],
    class: "Neutral",
    set: "core",
    collectible: false,
    spellEffect: {
      type: "transform",
      targetType: "friendly_minion",
      requiresTarget: true
    }
  }
];

// ============================================
// ADAPT TOKENS (16201-16299)
// ============================================
export const adaptTokens: CardData[] = [
  {
    id: 16201,
    name: "Plant",
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "Summoned by Living Spores.",
    flavorText: 'Tiny, tenacious, and surprisingly vengeful.',
    rarity: "common",
    type: "minion",
    keywords: [],
    class: "Neutral",
    set: "core",
    collectible: false
  }
];

export const allAdaptCards: CardData[] = [
  ...adaptationOptions,
  ...adaptMinions,
  ...adaptTokens
];

export default allAdaptCards;
