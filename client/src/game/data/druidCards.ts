/**
 * @deprecated LEGACY FILE - DO NOT ADD NEW CARDS HERE
 * 
 * This file is deprecated. All new cards should be added to:
 * client/src/game/data/cardSets/druidCards.ts
 * 
 * This file remains for backwards compatibility but will be removed in a future update.
 * The authoritative source for Druid cards is now cardSets/druidCards.ts using the
 * createCard() builder API pattern.
 * 
 * Druid cards focus on "Choose One" mechanics, mana manipulation, and 
 * transformations themed around natural elements and beasts.
 */
import { CardData } from '../types';

// Druid cards will use 11xxx range for regular cards and 33xxx range for Choose One mechanic cards
export const druidCards: CardData[] = [
  // Cards from cards.ts
  {
    id: 11003,
    name: 'Gaia\'s Gift',
    description: 'Gain 1 Mana Crystal this turn only.',
    flavorText: 'Idunn channels the life-force of Yggdrasil itself — raw creation energy older than the Nine Realms.',
    type: 'spell',
    rarity: 'common',
    manaCost: 0,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: 'gain_mana',
      value: 1,
      isTemporaryMana: true
    }
  },
  {
    id: 11015,
    name: 'Rune of the Wild',
    description: 'Give a minion Taunt and +2/+2.',
    flavorText: 'Not to be confused with Mark of the Mild, which only gives +1/+1 and Taunt. And a free shampoo.',
    type: 'spell',
    rarity: 'common',
    manaCost: 2,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: 'buff',
      buffAttack: 2,
      buffHealth: 2,
      grantKeywords: ['taunt'],
      targetType: 'any_minion',
      requiresTarget: true
    }
  },
  {
    id: 11016,
    name: 'Yggdrasil\'s Essence',
    description: 'Give your minions \'Deathrattle: Summon a 2/2 Treant.\'',
    flavorText: 'Is this Soul of the Forest related to Soul of the Fire Festival? Probably.',
    type: 'spell',
    rarity: 'common',
    manaCost: 4,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: 'grant_deathrattle',
      targetType: 'all_friendly_minions',
      deathrattle: {
        type: 'summon',
        value: 1,
        summonCardId: 11020, // Treant
        targetType: 'none'
      }
    }
  },
  {
    id: 11020,
    name: 'Treant',
    description: '',
    flavorText: 'I am Treant. I speak for the trees!',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: "Druid",
    collectible: false
  },
  
  // Yggdrasil Golem card
  {
    id: 85301,
    name: "Stone Flower",
    manaCost: 3,
    description: "Summon a Yggdrasil Golem. Gain an empty Mana Crystal.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    keywords: ["yggdrasil_golem"],
    collectible: true,
    spellEffect: {
      type: "summon_yggdrasil_golem",
      bonusEffect: {
        type: "gain_mana_crystals",
        value: 1,
        emptyOnly: true
      }
    }
  },
  
  // Card from oldGodsCards.ts
  {
    id: 60007,
    name: "Amber Weaver",
    manaCost: 4,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: If your Gullveig has at least 10 Attack, gain +5 Health.",
    keywords: ["battlecry"],
    class: "Druid",
    battlecry: {
      type: "conditional_self_buff",
      requiresTarget: false,
      targetType: 'none',
      condition: "cthun_attack_10",
      buffHealth: 5
    },
    collectible: true
  },
  {
    id: 11040,
    name: "Healing Spring",
    description: "Restore 8 Health to your hero and gain 3 Armor.",
    flavorText: "A healing touch that mends both body and spirit.",
    type: "spell",
    rarity: "common",
    manaCost: 3,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: "heal",
      targetType: "friendly_hero",
      value: 8,
      bonusEffect: {
        type: "gain_armor",
        value: 3
      }
    }
  },
  {
    id: 11041,
    name: "Root Guardian",
    description: "Taunt. Battlecry: Gain +1/+1 for each other minion you control.",
    flavorText: "The wisest of trees stand firm against all foes.",
    type: "minion",
    rarity: "common",
    manaCost: 6,
    attack: 4,
    health: 6,
    class: "Druid",
    keywords: ["taunt"],
    collectible: true,
    battlecry: {
      type: "buff_self",
      attackBuff: 1,
      healthBuff: 1,
      scaling: {
        type: "friendly_minion_count"
      }
    }
  },
  {
    id: 11042,
    name: "Yggdrasil's Surge",
    description: "Give your minions +1/+1 and they can't be targeted by spells or hero powers this turn.",
    flavorText: "Nature shields those who embrace its ways.",
    type: "spell",
    rarity: "common",
    manaCost: 4,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: "buff",
      targetType: "friendly_minions",
      buffAttack: 1,
      buffHealth: 1,
      bonusEffect: {
        type: "add_ability",
        ability: "elusive",
        duration: 1
      }
    }
  },
  {
    id: 11043,
    name: "Fenrir's Hunger",
    description: "Give your hero +3 Attack this turn and gain 3 Armor.",
    flavorText: "Sometimes you need claws to make your point.",
    type: "spell",
    rarity: "common",
    manaCost: 2,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: "hero_attack",
      value: 3,
      duration: 1,
      bonusEffect: {
        type: "gain_armor",
        value: 3
      }
    }
  },
  {
    id: 11044,
    name: "Ironwood Sage",
    description: "Taunt. At the end of your turn, restore 2 Health to all friendly characters.",
    flavorText: "Its roots run deep, drawing healing energy from the earth itself.",
    type: "minion",
    rarity: "rare",
    manaCost: 7,
    attack: 5,
    health: 8,
    class: "Druid",
    keywords: ["taunt"],
    collectible: true,
    endOfTurn: {
      type: "heal",
      targetType: "all_friendly",
      value: 2
    }
  },
  {
    id: 11045,
    name: "Primal Roar",
    description: "Deal 3 damage. If you have 10 Mana Crystals, deal 6 damage instead.",
    flavorText: "The forest has many voices, and none you wish to hear when angry.",
    type: "spell",
    rarity: "common",
    manaCost: 3,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: "damage",
      targetType: "any",
      value: 3,
      requiresTarget: true,
      condition: {
        type: "mana_crystals",
        value: 10,
        effect: {
          type: "damage",
          targetType: "any",
          value: 6,
          requiresTarget: true
        }
      }
    }
  },
  {
    id: 11046,
    name: "Grove Keeper",
    description: "Battlecry: Each player gains an empty Mana Crystal.",
    flavorText: "Tending to the balance of nature means sometimes helping your opponent too.",
    type: "minion",
    rarity: "rare",
    manaCost: 3,
    attack: 2,
    health: 4,
    class: "Druid",
    collectible: true,
    battlecry: {
      type: "gain_mana_crystals",
      value: 1,
      targetType: "both_players",
      emptyOnly: true
    }
  },
  {
    id: 11047,
    name: "Forest Scout",
    description: "Battlecry: Look at the top 3 cards of your deck. Choose one and draw it.",
    flavorText: "She knows all the shortcuts through the forest, and all the best berries to eat.",
    type: "minion",
    rarity: "common",
    manaCost: 3,
    attack: 2,
    health: 3,
    class: "Druid",
    collectible: true,
    battlecry: {
      type: "discover",
      discoveryType: "top_deck",
      count: 3,
      drawOnDiscover: true
    }
  },
  {
    id: 11048,
    name: "Spirit of Healing",
    description: "Whenever you cast a spell, restore 2 Health to your hero.",
    flavorText: "The magic of nature heals those who wield it.",
    type: "minion",
    rarity: "common",
    manaCost: 2,
    attack: 1,
    health: 3,
    class: "Druid",
    collectible: true,
    triggeredEffect: {
      type: "heal",
      targetType: "friendly_hero",
      value: 2
    }
  },
  {
    id: 11049,
    name: "Guardian of the Woods",
    description: "Taunt. Deathrattle: Add a random Beast to your hand.",
    flavorText: "Even in death, it ensures new life takes its place.",
    type: "minion",
    rarity: "common",
    manaCost: 4,
    attack: 3,
    health: 5,
    race: "Beast",
    class: "Druid",
    keywords: ["taunt", "deathrattle"],
    collectible: true,
    deathrattle: {
      type: "add_to_hand",
      cardType: "Beast",
      count: 1,
      random: true
    }
  },
  {
    id: 11050,
    name: "Yggdrasil's Growth",
    description: "Gain two empty Mana Crystals.",
    flavorText: "Growth takes time, but the results are worth waiting for.",
    type: "spell",
    rarity: "common",
    manaCost: 4,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: "gain_mana_crystals",
      value: 2,
      emptyOnly: true
    }
  },
  {
    id: 11051,
    name: "Root Defender",
    description: "Taunt. Spellburst: Gain +2/+2.",
    flavorText: "Its bark is worse than its bite. And its bite is pretty bad.",
    type: "minion",
    rarity: "common",
    manaCost: 4,
    attack: 2,
    health: 5,
    class: "Druid",
    keywords: ["taunt", "spellburst"],
    collectible: true,
    spellburstEffect: {
      type: "buff_self",
      attackBuff: 2,
      healthBuff: 2
    }
  },
  {
    id: 11052,
    name: "Nature's Bloom",
    description: "Draw 3 cards.",
    flavorText: "When nature flourishes, so do those who serve it.",
    type: "spell",
    rarity: "common",
    manaCost: 5,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: "draw",
      value: 3
    }
  },
  {
    id: 11053,
    name: "Selene's Sage",
    description: "Spell Damage +2. At the start of your turn, reduce the Cost of a random spell in your hand by (2).",
    flavorText: "The light of the moon enhances druidic magic in mysterious ways.",
    type: "minion",
    rarity: "rare",
    manaCost: 5,
    attack: 3,
    health: 4,
    class: "Druid",
    keywords: ["spell_damage"],
    spellDamage: 2,
    collectible: true,
    startOfTurn: {
      type: "reduce_cost",
      targetType: "hand",
      cardType: "spell",
      value: 2,
      random: true,
      count: 1
    }
  },
  {
    id: 11054,
    name: "Gift of the Wild",
    description: "Give a minion +2/+2. If it's a Beast, give it an additional +1/+1 and Taunt.",
    flavorText: "The wilds favor their own.",
    type: "spell",
    rarity: "common",
    manaCost: 2,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: "buff",
      targetType: "minion",
      requiresTarget: true,
      buffAttack: 2,
      buffHealth: 2,
      condition: {
        type: "is_race",
        race: "Beast",
        effect: {
          type: "buff",
          buffAttack: 1,
          buffHealth: 1,
          addKeyword: "taunt"
        }
      }
    }
  },
  {
    id: 11055,
    name: "Beast Tracker",
    description: "Stealth. After this attacks a minion, draw a card.",
    flavorText: "It's not the one you see that you should fear.",
    type: "minion",
    rarity: "common",
    manaCost: 3,
    attack: 3,
    health: 2,
    race: "Beast",
    class: "Druid",
    keywords: ["stealth"],
    collectible: true,
    onAttack: {
      type: "draw",
      value: 1
    }
  },
  {
    id: 11056,
    name: "Primordial Druid",
    description: "Battlecry: Transform a friendly minion into one that costs (2) more.",
    flavorText: "Evolution is just nature's way of upgrading.",
    type: "minion",
    rarity: "epic",
    manaCost: 4,
    attack: 3,
    health: 4,
    class: "Druid",
    collectible: true,
    battlecry: {
      type: "transform",
      targetType: 'friendly_minion',
      requiresTarget: true,
      transformType: "cost_increase",
      value: 2
    }
  },
  {
    id: 11057,
    name: "Yggdrasil Drake",
    description: "Battlecry: Foresee a Dragon.",
    flavorText: "Hatched in the roots of the World Tree, it guards the oldest groves.",
    type: "minion",
    rarity: "common",
    manaCost: 5,
    attack: 4,
    health: 4,
    race: "Dragon",
    class: "Druid",
    collectible: true,
    battlecry: {
      type: "discover",
      discoveryType: "Dragon"
    }
  },
  {
    id: 11058,
    name: "Fury of Gaia",
    description: "Summon three 2/2 Treants.",
    flavorText: "The forest rises to defend its own.",
    type: "spell",
    rarity: "rare",
    manaCost: 5,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: "summon",
      summonCardId: 11059, // Treant
      count: 3
    }
  },
  {
    id: 11059,
    name: "Treant",
    description: "Summoned by Druid spells.",
    flavorText: "It takes years to grow a tree this size. Or seconds with the right spell.",
    type: "minion",
    rarity: "common",
    manaCost: 2,
    attack: 2,
    health: 2,
    class: "Druid",
    collectible: false
  },
  {
    id: 11060,
    name: "Ursol's Wisdom",
    description: "Taunt. Battlecry: Copy a spell in your hand.",
    flavorText: "The bear teaches us wisdom comes in many forms—sometimes with very sharp claws.",
    type: "minion",
    rarity: 'epic',
    manaCost: 6,
    attack: 5,
    health: 5,
    class: "Druid",
    keywords: ["taunt"],
    collectible: true,
    battlecry: {
      type: "copy_card",
      copyType: "hand",
      cardType: "spell",
      count: 1
    }
  }
];

// Choose One cards - one of Druid's signature mechanics
export const chooseOneCards: CardData[] = [
  {
    id: 33001,
    name: "Life's Sustenance",
    description: "Choose One - Gain 2 Mana Crystals; or Draw 3 cards.",
    flavorText: "Druids know the secret of cosmic bogo sales: 'Buy one, get one free!'",
    type: "spell",
    rarity: "common",
    manaCost: 6,
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    chooseOneOptions: [
      {
        id: "mana",
        name: "Divine Power",
        description: "Gain 2 Mana Crystals",
        effect: {
          type: "gain_mana_crystals",
          value: 2,
          emptyOnly: true
        }
      },
      {
        id: "draw",
        name: "Draw",
        description: "Draw 3 cards",
        effect: {
          type: "draw",
          value: 3
        }
      }
    ]
  },
  {
    id: 33002,
    name: "Grove Warden",
    description: "Choose One - Deal 2 damage; or Silence a minion.",
    flavorText: "Wardens of sacred groves choose their path with wisdom.",
    type: "minion",
    rarity: "common",
    manaCost: 4,
    attack: 2,
    health: 3,
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    chooseOneOptions: [
      {
        id: "damage",
        name: "Máni's Wrath",
        description: "Deal 2 damage",
        effect: {
          type: "damage",
          value: 2,
          targetType: "any",
          requiresTarget: true
        }
      },
      {
        id: "silence",
        name: "Dispel",
        description: "Silence a minion",
        effect: {
          type: "silence",
          targetType: "minion",
          requiresTarget: true
        }
      }
    ]
  },
  {
    id: 33003,
    name: "Verdian, Nature's Herald",
    description: "Choose One - Give your other minions +2/+2; or Summon two 2/2 Treants with Taunt.",
    flavorText: "Cenarius was the patron demigod of all druids... until Surtr incinerated him.",
    type: "minion",
    rarity: 'rare',
    manaCost: 9,
    attack: 5,
    health: 8,
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    chooseOneOptions: [
      {
        id: "buff",
        name: "Demigod's Favor",
        description: "Give your other minions +2/+2",
        effect: {
          type: "buff",
          targetType: "other_friendly_minions",
          buffAttack: 2,
          buffHealth: 2
        }
      },
      {
        id: "summon",
        name: "Children of the Forest",
        description: "Summon two 2/2 Treants with Taunt",
        effect: {
          type: "summon_tokens",
          tokenId: 33004, // Treant with Taunt
          count: 2
        }
      }
    ]
  },
  {
    id: 33004,
    name: "Treant with Taunt",
    description: "Taunt",
    flavorText: "A sturdy defender of the forest.",
    type: "minion",
    rarity: "common",
    manaCost: 2,
    attack: 2,
    health: 2,
    keywords: ["taunt"],
    class: "Druid",
    collectible: false
  },
  {
    id: 33005,
    name: "Power of Gaia",
    description: "Choose One - Give your minions +1/+1; or Summon a 3/2 Panther.",
    flavorText: "The wild is a harsh teacher, but its lessons last a lifetime.",
    type: "spell",
    rarity: "common",
    manaCost: 2,
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    chooseOneOptions: [
      {
        id: "leader",
        name: "Leader of the Pack",
        description: "Give your minions +1/+1",
        effect: {
          type: "buff",
          targetType: "friendly_minions",
          buffAttack: 1,
          buffHealth: 1
        }
      },
      {
        id: "panther",
        name: "Summon a Panther",
        description: "Summon a 3/2 Panther",
        effect: {
          type: "summon_tokens",
          tokenId: 33006, // Panther
          count: 1
        }
      }
    ]
  },
  {
    id: 33006,
    name: "Panther",
    description: "Summoned by Druid spells.",
    flavorText: "Sleek and deadly, just how nature intended.",
    type: "minion",
    rarity: "common",
    manaCost: 2,
    attack: 3,
    health: 2,
    race: "Beast",
    class: "Druid",
    collectible: false
  },
  {
    id: 33007,
    name: "Druid of the Bog",
    description: "Choose One - Transform into a 1/2 with Poisonous; or a 1/5 with Taunt.",
    flavorText: "Druids know all about the birds and the bees. And the spiders. And the bears. And the trees.",
    type: "minion",
    rarity: "common",
    manaCost: 2,
    attack: 1,
    health: 2,
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    chooseOneOptions: [
      {
        id: "spider",
        name: "Spider Form",
        description: "Transform into a 1/2 with Poisonous",
        effect: {
          type: "transform",
          summonCardId: 33008 // Spider Form
        }
      },
      {
        id: "turtle",
        name: "Turtle Form",
        description: "Transform into a 1/5 with Taunt",
        effect: {
          type: "transform",
          summonCardId: 33009 // Turtle Form
        }
      }
    ]
  },
  {
    id: 33008,
    name: "Spider Form",
    description: "Poisonous",
    flavorText: "A subtle approach to problem solving.",
    type: "minion",
    rarity: "common",
    manaCost: 2,
    attack: 1,
    health: 2,
    race: "Beast",
    keywords: ["poisonous"],
    class: "Druid",
    collectible: false
  },
  {
    id: 33009,
    name: "Turtle Form",
    description: "Taunt",
    flavorText: "A more direct approach to problem solving.",
    type: "minion",
    rarity: "common",
    manaCost: 2,
    attack: 1,
    health: 5,
    race: "Beast",
    keywords: ["taunt"],
    class: "Druid",
    collectible: false
  },
  {
    id: 33010,
    name: "Fandral the Wise",
    description: "Your Choose One cards and powers have both effects combined.",
    flavorText: "Fandral refused to drain the swamp. Or fight the fire. Or evacuate the city.",
    type: "minion",
    rarity: 'rare',
    manaCost: 5,
    attack: 3,
    health: 5,
    class: "Druid",
    collectible: true,
    aura: {
      type: "choose_one_both",
      targetType: "player"
    }
  },
  {
    id: 33011,
    name: "Roots of Life",
    description: "Choose One - Deal 2 damage; or Summon two 1/1 Saplings.",
    flavorText: "Living roots don't take kindly to being stepped on.",
    type: "spell",
    rarity: "common",
    manaCost: 1,
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    chooseOneOptions: [
      {
        id: "damage",
        name: "Living Spikes",
        description: "Deal 2 damage",
        effect: {
          type: "damage",
          value: 2,
          targetType: "any",
          requiresTarget: true
        }
      },
      {
        id: "summon",
        name: "Living Seeds",
        description: "Summon two 1/1 Saplings",
        effect: {
          type: "summon_tokens",
          tokenId: 11035, // Sapling
          count: 2
        }
      }
    ]
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
    class: "Druid",
    collectible: true,
    chooseOneOptions: [
      {
        id: "draw",
        name: "Ancient of Wisdom: Draw",
        description: "Draw 2 cards.",
        effect: {
          type: "draw",
          value: 2,
          requiresTarget: false,
          targetType: 'none'
        }
      },
      {
        id: "heal",
        name: "Ancient of Wisdom: Heal",
        description: "Restore 5 Health.",
        effect: {
          type: "heal",
          value: 5,
          requiresTarget: true,
          targetType: 'any'
        }
      }
    ]
  }
];

// Additional Druid cards to reach 30 unique cards
export const additionalDruidCards: CardData[] = [
  {
    id: 11061,
    name: "Thornroot Guardian",
    description: "Taunt. Battlecry: If you're holding a spell that costs (5) or more, gain +3/+3.",
    flavorText: "Its roots draw power from ancient magical currents beneath the forest floor.",
    type: "minion",
    rarity: "rare",
    manaCost: 4,
    attack: 2,
    health: 4,
    class: "Druid",
    keywords: ["taunt", "battlecry"],
    collectible: true,
    battlecry: {
      type: "buff_self",
      attackBuff: 3,
      healthBuff: 3,
      condition: {
        type: "holding_card",
        cardType: "spell",
        costCondition: {
          type: "min_cost",
          value: 5
        }
      }
    }
  },
  {
    id: 11062,
    name: "Moonlit Wisp",
    description: "Battlecry: If you've cast a spell this turn, draw a card.",
    flavorText: "These luminous forest spirits appear only when magic flows freely through the wilds.",
    type: "minion",
    rarity: "common",
    manaCost: 2,
    attack: 2,
    health: 2,
    class: "Druid",
    keywords: ["battlecry"],
    collectible: true,
    battlecry: {
      type: "draw",
      value: 1,
      condition: {
        type: "spells_cast_this_turn",
        value: 1
      }
    }
  },
  {
    id: 11063,
    name: "Verdant Rebirth",
    description: "Give a friendly minion +2/+2. When it dies this turn, summon a copy of it.",
    flavorText: "The cycle of life and death is but a doorway in the natural world.",
    type: "spell",
    rarity: "epic",
    manaCost: 3,
    class: "Druid",
    collectible: true,
    spellEffect: {
      type: "buff",
      targetType: "friendly_minion",
      requiresTarget: true,
      buffAttack: 2,
      buffHealth: 2,
      bonusEffect: {
        type: "add_deathrattle",
        duration: 1,
        effect: {
          type: "summon_copy",
          sourceTarget: "self"
        }
      }
    }
  }
];

// Export all Druid cards
export default [...druidCards, ...chooseOneCards, ...additionalDruidCards];