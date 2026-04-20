import { CardData } from '../../../../../types';

export const druidCards: CardData[] = [
  {
    id: 11003,
    name: "Gaia's Gift",
    manaCost: 0,
    description: "Gain 1 Mana Crystal this turn only.",
    flavorText: "The earth goddess grants a fleeting blessing of energy.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "gain_mana",
      value: 1,
      isTemporaryMana: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11015,
    name: "Rune of the Wild",
    manaCost: 2,
    description: "Give a minion Taunt and +2/+2.",
    flavorText: "Ancient runes empower those who bear them.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 2,
      grantKeywords: ["taunt"],
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11016,
    name: "Yggdrasil's Essence",
    manaCost: 4,
    description: "Give your minions 'Deathrattle: Summon a 2/2 Treant.'",
    flavorText: "The essence of the World Tree ensures life endures through death.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "grant_deathrattle",
      targetType: "all_friendly_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11040,
    name: "Healing Spring",
    manaCost: 3,
    description: "Restore 8 Health to your hero and gain 3 Armor.",
    flavorText: "The sacred spring restores both flesh and spirit.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "heal",
      targetType: "friendly_hero",
      value: 8
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11041,
    name: "Root Guardian",
    manaCost: 6,
    attack: 4,
    health: 6,
    description: "Taunt. Battlecry: Gain +1/+1 for each other minion you control.",
    flavorText: "Deep roots grant strength in battle.",
    type: "minion",
    rarity: "common",
    class: "Druid",
    keywords: ["taunt", "battlecry"],
    collectible: true,
    set: "core"
  },
  {
    id: 11044,
    name: "Ironwood Sage",
    manaCost: 7,
    attack: 5,
    health: 8,
    description: "Taunt. At the end of your turn, restore 2 Health to all friendly characters.",
    flavorText: "The ancient sage draws healing from the deepest roots.",
    type: "minion",
    rarity: "rare",
    class: "Druid",
    keywords: ["taunt"],
    collectible: true,
    set: "core"
  },
  {
    id: 11050,
    name: "Beast's Call",
    manaCost: 3,
    description: "Give your characters +2 Attack this turn.",
    flavorText: "The boundary between druid and beast blurs. Both are stronger for it.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "buff",
      buffAttack: 2,
      targetType: "all_friendly_characters",
      requiresTarget: false,
      duration: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11052,
    name: "Nature's Bloom",
    manaCost: 5,
    description: "Draw 3 cards.",
    flavorText: "When nature blooms, abundance flows to those who tend it.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "draw",
      value: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11058,
    name: "Fury of Gaia",
    manaCost: 5,
    description: "Summon three 2/2 Treants.",
    flavorText: "The earth mother's wrath manifests as living wood.",
    type: "spell",
    rarity: "rare",
    class: "Druid",
    spellEffect: {
      type: "summon",
      summonCardId: 11059,
      count: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 33001,
    name: "Life's Sustenance",
    manaCost: 6,
    description: "Choose One - Gain 2 Mana Crystals; or Draw 3 cards.",
    flavorText: "Life itself sustains those who commune with nature.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    set: "core"
  },
  {
    id: 33002,
    name: "Grove Warden",
    manaCost: 4,
    attack: 2,
    health: 3,
    description: "Choose One - Deal 2 damage; or Silence a minion.",
    flavorText: "Wardens of the sacred groves protect nature's balance with fierce dedication.",
    type: "minion",
    rarity: "common",
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    set: "core"
  },
  {
    id: 33003,
    name: "Verdian, Nature's Herald",
    manaCost: 9,
    attack: 5,
    health: 8,
    description: "Choose One - Give your other minions +2/+2; or Summon two 2/2 Treants with Taunt.",
    flavorText: "The green herald announces the will of nature with unbending authority.",
    type: "minion",
    rarity: 'rare',
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    set: "core"
  },
  {
    id: 11020,
    name: "Treant",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Summoned by Druid nature spells.",
    flavorText: "I am Treant. I speak for the trees!",
    type: "minion",
    rarity: "common",
    class: "Druid",
    collectible: false,
    set: "core"
  },
  {
    id: 11059,
    name: "Treant",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Summoned by Druid nature spells.",
    flavorText: "It takes years to grow a tree this size. Or seconds with the right spell.",
    type: "minion",
    rarity: "common",
    class: "Druid",
    collectible: false,
    set: "core"
  },
  {
    id: 20014,
    name: "Pan, Nature's Avatar",
    manaCost: 4,
    attack: 3,
    health: 5,
    type: "minion",
    rarity: 'rare',
    description: "Your Choose One cards and powers have both effects combined.",
    flavorText: "God of the wild, he embraces all of nature's choices.",
    keywords: [],
    class: "Druid",
    collectible: true,
    set: "core"
  },
  {
    id: 20703,
    name: "Web-Mother of Arachne",
    manaCost: 9,
    attack: 3,
    health: 7,
    type: "minion",
    rarity: 'epic',
    description: "Deathrattle: Summon your Taunt minions that died this game.",
    flavorText: "The weaver spins a web of protection from the fallen.",
    keywords: ["deathrattle"],
    race: "Beast",
    class: "Druid",
    collectible: true,
    set: "core",
    deathrattle: {
      type: "resurrect",
      targetType: "none",
      condition: "taunt_only"
    }
  },
  {
    id: 20809,
    name: "Heartwood of Idunn",
    manaCost: 9,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "epic",
    description: "Your minions cost (1).",
    flavorText: "Guardian of Yggdrasil's roots, she nurtures all living things.",
    keywords: [],
    class: "Druid",
    collectible: true,
    set: "core"
  },
  // === Dormant Card ===
  {
    id: 10002,
    name: "Bound Forest-Satyr",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "common",
    race: "Titan",
    description: "Dormant for 2 turns. When this awakens, reduce the Cost of a random minion in your hand by (5).",
    flavorText: "Trapped in the sacred groves of Pan, the satyr dreams of wild revelry.",
    keywords: ["dormant"],
    class: "Druid",
    collectible: true,
    set: "core",
    dormantTurns: 2,
    awakenEffect: {
      type: "mana_discount",
      targetType: "hand_minion",
      value: 5,
      isRandom: true
    }
  },
  // === Frenzy Cards ===
  {
    id: 9003,
    name: "Druid of the Plains",
    manaCost: 5,
    attack: 3,
    health: 6,
    type: "minion",
    rarity: "common",
    description: "Frenzy: Transform into a 6/7 Dire Cat Form with Rush.",
    flavorText: "Peaceful, until provoked. Then the horns come out.",
    keywords: ["frenzy"],
    class: "Druid",
    collectible: true,
    set: "core",
    frenzyEffect: {
      type: "transform",
      transformId: 9004,
      triggered: false
    }
  },
  {
    id: 9004,
    name: "Dire Cat Form",
    manaCost: 5,
    attack: 6,
    health: 7,
    type: "minion",
    rarity: "common",
    race: "Beast",
    description: "Rush",
    flavorText: "Claws like scythes, eyes like embers. Nature's answer to armor.",
    keywords: ["rush"],
    class: "Druid",
    collectible: false,
    set: "core"
  },
  {
    id: 9010,
    name: "Bear of the Wilds",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "common",
    race: "Beast",
    description: "Taunt. Frenzy: Gain +2/+2.",
    flavorText: "It guards the ancient groves with claws and fury. Wounds only make it angrier.",
    keywords: ["frenzy", "taunt"],
    class: "Druid",
    collectible: true,
    set: "core",
    frenzyEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 2,
      triggered: false
    }
  },
  // === Spellburst Cards ===
  {
    id: 18005,
    name: "Voice of Yggdrasil",
    manaCost: 3,
    attack: 1,
    health: 4,
    type: "minion",
    rarity: 'epic',
    description: "Rush, Windfury. Spellburst: Gain Attack and Health equal to the spell's Cost.",
    flavorText: "The World Tree speaks through her. Every word carries the weight of roots.",
    keywords: ["rush", "windfury", "spellburst"],
    class: "Druid",
    spellburstEffect: {
      type: "buff",
      targetType: "self",
      consumed: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 18009,
    name: "Warden of the World Tree",
    manaCost: 6,
    attack: 5,
    health: 4,
    type: "minion",
    rarity: 'rare',
    description: "Spellburst: Refresh your Mana Crystals.",
    flavorText: "Where she walks, mana wells up from the roots of Yggdrasil.",
    keywords: ["spellburst"],
    class: "Druid",
    spellburstEffect: {
      type: "buff",
      targetType: "none",
      consumed: false
    },
    collectible: true,
    set: "core"
  },
  // === Migrated from legacy druidCards.ts ===
  {
    id: 11042,
    name: "Yggdrasil's Surge",
    manaCost: 4,
    description: "Give your minions +1/+1 and they can't be targeted by spells or hero powers this turn.",
    flavorText: "The World Tree's boundless growth shields those under its boughs.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "buff",
      targetType: "friendly_minions",
      buffAttack: 1,
      buffHealth: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11043,
    name: "Fenrir's Hunger",
    manaCost: 2,
    description: "Give your hero +3 Attack this turn and gain 3 Armor.",
    flavorText: "The great wolf's primal hunger gives strength to those who claim it.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "hero_attack",
      value: 3,
      duration: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11045,
    name: "Primal Roar",
    manaCost: 3,
    description: "Deal 3 damage. If you have 10 Mana Crystals, deal 6 damage instead.",
    flavorText: "The ancient roar shakes the very foundations of the earth.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "damage",
      targetType: "any",
      value: 3,
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11046,
    name: "Grove Keeper",
    manaCost: 3,
    attack: 2,
    health: 4,
    description: "Battlecry: Each player gains an empty Mana Crystal.",
    flavorText: "Keepers of the sacred groves tend both friend and foe.",
    type: "minion",
    rarity: "rare",
    class: "Druid",
    keywords: ["battlecry"],
    battlecry: {
      type: "gain_mana_crystals",
      value: 1,
      targetType: "both_players"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11047,
    name: "Forest Scout",
    manaCost: 3,
    attack: 2,
    health: 3,
    description: "Battlecry: Look at the top 3 cards of your deck. Choose one and draw it.",
    flavorText: "Scouts of the wild know the forest's secrets better than any map.",
    type: "minion",
    rarity: "common",
    class: "Druid",
    keywords: ["battlecry"],
    battlecry: {
      type: "discover",
      discoveryType: "top_deck",
      count: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11048,
    name: "Spirit of Healing",
    manaCost: 2,
    attack: 1,
    health: 3,
    description: "Whenever you cast a spell, restore 2 Health to your hero.",
    flavorText: "Spirits of healing answer the call of nature's champions.",
    type: "minion",
    rarity: "common",
    class: "Druid",
    collectible: true,
    set: "core"
  },
  {
    id: 11049,
    name: "Guardian of the Woods",
    manaCost: 4,
    attack: 3,
    health: 5,
    description: "Taunt. Deathrattle: Add a random Beast to your hand.",
    flavorText: "Guardians of the sacred woods endure even beyond death.",
    type: "minion",
    rarity: "common",
    race: "Beast",
    class: "Druid",
    keywords: ["taunt", "deathrattle"],
    deathrattle: {
      type: "add_to_hand",
      cardType: "beast",
      count: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11051,
    name: "Root Defender",
    manaCost: 4,
    attack: 2,
    health: 5,
    description: "Taunt. Spellburst: Gain +2/+2.",
    flavorText: "Ancient roots gather strength with each magical surge.",
    type: "minion",
    rarity: "common",
    class: "Druid",
    keywords: ["taunt", "spellburst"],
    spellburstEffect: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 2,
      consumed: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11053,
    name: "Selene's Sage",
    manaCost: 5,
    attack: 3,
    health: 4,
    description: "Spell Damage +2. At the start of your turn, reduce the Cost of a random spell in your hand by (2).",
    flavorText: "The moon goddess's blessing empowers druidic magic.",
    type: "minion",
    rarity: "rare",
    class: "Druid",
    keywords: ["spell_damage"],
    spellDamage: 2,
    collectible: true,
    set: "core"
  },
  {
    id: 11054,
    name: "Gift of the Wild",
    manaCost: 2,
    description: "Give a minion +2/+2. If it's a Beast, give it an additional +1/+1 and Taunt.",
    flavorText: "The wild grants its favor to those who commune with beasts.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    spellEffect: {
      type: "buff",
      targetType: "minion",
      requiresTarget: true,
      buffAttack: 2,
      buffHealth: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11055,
    name: "Beast Tracker",
    manaCost: 3,
    attack: 3,
    health: 2,
    description: "Stealth. After this attacks a minion, draw a card.",
    flavorText: "Trackers of beasts are rarely seen, but never missed.",
    type: "minion",
    rarity: "common",
    race: "Beast",
    class: "Druid",
    keywords: ["stealth"],
    collectible: true,
    set: "core"
  },
  {
    id: 11056,
    name: "Primordial Druid",
    manaCost: 4,
    attack: 3,
    health: 4,
    description: "Battlecry: Transform a friendly minion into one that costs (2) more.",
    flavorText: "Druids of ancient times guide their minions toward greater power.",
    type: "minion",
    rarity: "epic",
    class: "Druid",
    keywords: ["battlecry"],
    battlecry: {
      type: "transform",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11057,
    name: "Yggdrasil Drake",
    manaCost: 5,
    attack: 4,
    health: 4,
    description: "Battlecry: Foresee a Dragon.",
    flavorText: "Hatched in the roots of the World Tree, it guards the oldest groves.",
    type: "minion",
    rarity: "common",
    race: "Dragon",
    class: "Druid",
    keywords: ["battlecry"],
    battlecry: {
      type: "discover",
      discoveryType: "dragon"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 11060,
    name: "Ursol's Wisdom",
    manaCost: 6,
    attack: 5,
    health: 5,
    description: "Taunt. Battlecry: Copy a spell in your hand.",
    flavorText: "The ancient bear's wisdom manifests through nature's spells.",
    type: "minion",
    rarity: 'epic',
    class: "Druid",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "copy_card",
      copyType: "hand",
      cardType: "spell"
    },
    collectible: true,
    set: "core"
  },
  // === Choose One Tokens and Cards ===
  {
    id: 33004,
    name: "Treant with Taunt",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Taunt",
    flavorText: "A sturdy defender of the forest.",
    type: "minion",
    rarity: "common",
    class: "Druid",
    keywords: ["taunt"],
    collectible: false,
    set: "core"
  },
  {
    id: 33005,
    name: "Power of Gaia",
    manaCost: 2,
    description: "Choose One - Give your minions +1/+1; or Summon a 3/2 Panther.",
    flavorText: "The earth mother's power flows through those who answer her call.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    set: "core"
  },
  {
    id: 33006,
    name: "Panther",
    manaCost: 2,
    attack: 3,
    health: 2,
    description: "Summoned by Druid beast spells.",
    flavorText: "Sleek and deadly, just how nature intended.",
    type: "minion",
    rarity: "common",
    race: "Beast",
    class: "Druid",
    collectible: false,
    set: "core"
  },
  {
    id: 33007,
    name: "Druid of the Bog",
    manaCost: 2,
    attack: 1,
    health: 2,
    description: "Choose One - Transform into a 1/2 with Poisonous; or a 1/5 with Taunt.",
    flavorText: "Druids of the ancient bogs command life and death with equal mastery.",
    type: "minion",
    rarity: "common",
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    set: "core"
  },
  {
    id: 33008,
    name: "Spider Form",
    manaCost: 2,
    attack: 1,
    health: 2,
    description: "Poisonous",
    flavorText: "A subtle approach to problem solving.",
    type: "minion",
    rarity: "common",
    race: "Beast",
    class: "Druid",
    keywords: ["poisonous"],
    collectible: false,
    set: "core"
  },
  {
    id: 33009,
    name: "Turtle Form",
    manaCost: 2,
    attack: 1,
    health: 5,
    description: "Taunt",
    flavorText: "A more direct approach to problem solving.",
    type: "minion",
    rarity: "common",
    race: "Beast",
    class: "Druid",
    keywords: ["taunt"],
    collectible: false,
    set: "core"
  },
  {
    id: 33010,
    name: "Verdandi the Wise",
    manaCost: 5,
    attack: 3,
    health: 5,
    description: "Your Choose One cards and powers have both effects combined.",
    flavorText: "Verdandi the wise combines all paths, pursuing knowledge over caution.",
    type: "minion",
    rarity: 'rare',
    class: "Druid",
    collectible: true,
    set: "core"
  },
  {
    id: 33011,
    name: "Roots of Life",
    manaCost: 1,
    description: "Choose One - Deal 2 damage; or Summon two 1/1 Saplings.",
    flavorText: "Roots of the World Tree give life in many forms.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    keywords: ["choose_one"],
    collectible: true,
    set: "core"
  },
  // === Gullveig Themed ===
  {
    id: 60007,
    name: "Amber Weaver",
    manaCost: 4,
    attack: 4,
    health: 5,
    description: "Battlecry: If your Gullveig has at least 10 Attack, gain +5 Health.",
    flavorText: "She spins resin into armor. The trees approve.",
    type: "minion",
    rarity: "rare",
    class: "Druid",
    keywords: ["battlecry"],
    battlecry: {
      type: "conditional_self_buff",
      requiresTarget: false,
      targetType: "none",
      condition: "cthun_attack_10",
      buffHealth: 5
    },
    collectible: true,
    set: "core"
  },
  // === Yggdrasil Golem ===
  {
    id: 85301,
    name: "Stone Flower",
    manaCost: 3,
    description: "Summon a Yggdrasil Golem. Gain an empty Mana Crystal.",
    flavorText: "From stone, a golem grows. From the golem, a crystal blooms.",
    type: "spell",
    rarity: "common",
    class: "Druid",
    keywords: ["yggdrasil_golem"],
    spellEffect: {
      type: "summon_yggdrasil_golem"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 40010,
    name: "Ancient of Wisdom",
    manaCost: 7,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Choose One - Draw 2 cards; or Restore 5 Health.",
    flavorText: "The ancient's wisdom grants both knowledge and restoration.",
    keywords: ["choose_one"],
    class: "Druid",
    chooseOneOptions: [
      {
        id: 40010.1,
        name: "Ancient of Wisdom: Draw",
        manaCost: 7,
        type: "spell",
        rarity: "rare",
        description: "Draw 2 cards.",
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
    collectible: true,
    set: "core"
  },
  // === Migrated from additionalSpellCards.ts ===
  {
    id: 31019,
    name: "Wild Roar",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Give your characters +2 Attack this turn.",
    flavorText: "The wild's ancient roar empowers all who answer.",
    class: "Druid",
    spellEffect: {
      type: "buff",
      buffAttack: 2,
      requiresTarget: false,
      targetType: "all_friendly_minions",
      temporaryEffect: true,
      includeHeroes: true
    },
    collectible: true,
    set: "core"
  },
  // === Quest Cards ===
  {
    id: 70006,
    name: "Giants of Midgard",
    manaCost: 1,
    type: "spell",
    rarity: 'rare',
    description: "Quest: Summon 5 minions with 5 or more Attack. Reward: Barnabus, World Tree Spirit.",
    flavorText: "The frost giants await the call of those who command true power.",
    keywords: ["quest"],
    class: "Druid",
    questProgress: {
      goal: 5,
      current: 0,
      condition: "summon_5_attack_minions"
    },
    questReward: {
      cardId: 70016
    },
    collectible: true,
    set: "core"
  },
  {
    id: 70016,
    name: "Barnabus, World Tree Spirit",
    manaCost: 5,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Reduce the Cost of minions in your deck to (0).",
    flavorText: "Born from Yggdrasil's roots, he grants nature's ultimate blessing.",
    keywords: ["battlecry"],
    class: "Druid",
    battlecry: {
      type: "reduce_deck_cost",
      targetType: "minion",
      value: 0
    },
    collectible: false,
    set: "core"
  },
  // === New Nature Spells ===
  {
    id: 70020,
    name: "Vine Snare",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Freeze an enemy minion. If you control a Beast, it can't attack next turn either.",
    flavorText: "The wilds ensnare those who trespass.",
    keywords: [],
    class: "Druid",
    spellEffect: {
      type: "freeze",
      targetType: "enemy_minion",
      requiresTarget: true,
      bonusCondition: "control_beast"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 70021,
    name: "Rune of Greed",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Gain 2 Mana Crystals this turn only.",
    flavorText: "A sigil of avarice, tempting fate with fleeting power.",
    keywords: [],
    class: "Druid",
    spellEffect: {
      type: "gain_mana",
      value: 2,
      isTemporaryMana: true
    },
    collectible: true,
    set: "core"
  },
  // === Druid Expansion — board clear + Choose One ===
  {
    id: 31701,
    name: "Wrath of Yggdrasil",
    manaCost: 6,
    type: "spell",
    rarity: "rare",
    description: "Choose One — Deal 2 damage to all enemy minions; or Deal 4 damage to all enemy minions and 2 damage to your own.",
    flavorText: "The World Tree protects its roots — with extreme prejudice.",
    keywords: [],
    class: "Druid",
    spellEffect: {
      type: "aoe_damage",
      value: 2,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31702,
    name: "Thorns of Jotunheim",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Deal 1 damage to all enemy minions. Draw a card for each minion destroyed.",
    flavorText: "The thorns of the frost realm pierce both flesh and hope.",
    keywords: [],
    class: "Druid",
    spellEffect: {
      type: "aoe_with_on_kill",
      value: 1,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  // === Ramp, Treant & Choose One Expansion ===
  {
    id: 38401,
    name: "Yggdrasil's Roots",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Gain an empty Mana Crystal. Draw a card.",
    flavorText: "The World Tree's roots reach into every realm, drawing sustenance from all Nine Worlds.",
    class: "Druid",
    spellEffect: {
      type: "gain_mana_and_draw",
      value: 1,
      drawValue: 1,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38402,
    name: "Sap of the World Tree",
    manaCost: 0,
    type: "spell",
    rarity: "common",
    description: "Gain 2 Mana Crystals this turn only.",
    flavorText: "Golden sap drips from Yggdrasil's bark, brimming with fleeting cosmic energy.",
    class: "Druid",
    spellEffect: {
      type: "gain_mana",
      value: 2,
      isTemporaryMana: true,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38403,
    name: "Norn's Shears",
    manaCost: 1,
    attack: 1,
    durability: 3,
    type: "weapon",
    rarity: "rare",
    description: "After your hero attacks, gain an empty Mana Crystal.",
    flavorText: "The Norns cut threads of fate — and from each severed strand, new growth begins.",
    class: "Druid",
    weaponEffect: {
      trigger: "after_hero_attack",
      effect: "gain_mana",
      value: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38404,
    name: "Force of Yggdrasil",
    manaCost: 6,
    type: "spell",
    rarity: "rare",
    description: "Summon three 2/2 Treants with Rush.",
    flavorText: "The World Tree unleashes its guardians when the Nine Realms are threatened.",
    class: "Druid",
    spellEffect: {
      type: "summon_token",
      value: 3,
      summonName: "Treant",
      summonAttack: 2,
      summonHealth: 2,
      grantKeywords: ["rush"]
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38405,
    name: "Verdant Protector",
    manaCost: 4,
    attack: 2,
    health: 6,
    type: "minion",
    rarity: "common",
    description: "Taunt. Choose One: Give adjacent minions +2/+2; or Summon a copy of this minion.",
    flavorText: "Where one root stands firm, the forest follows.",
    class: "Druid",
    keywords: ["taunt", "choose_one"],
    chooseOneOptions: [
      {
        name: "Empower",
        description: "+2/+2 to adjacent minions",
        effect: "buff_adjacent",
        buffAttack: 2,
        buffHealth: 2
      },
      {
        name: "Multiply",
        description: "Summon a copy",
        effect: "summon_copy"
      }
    ],
    collectible: true,
    set: "core"
  },
  {
    id: 38406,
    name: "Ironbark Guardian",
    manaCost: 8,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "common",
    description: "Taunt. Can't be targeted by spells or Hero Powers.",
    flavorText: "Clad in bark harder than dwarven steel, it answers to no sorcery.",
    class: "Druid",
    keywords: ["taunt", "elusive"],
    collectible: true,
    set: "core"
  },
  {
    id: 38407,
    name: "Nidhogg's Infestation",
    manaCost: 7,
    type: "spell",
    rarity: 'rare',
    description: "Deal 5 damage to an enemy. Draw 3 cards. Gain 5 Armor.",
    flavorText: "The dragon gnaws at Yggdrasil's roots, and from the decay springs terrible power.",
    class: "Druid",
    spellEffect: {
      type: "damage_draw_armor",
      value: 5,
      drawValue: 3,
      armorValue: 5,
      targetType: "any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38408,
    name: "Freya's Warden",
    manaCost: 5,
    attack: 4,
    health: 4,
    type: "minion",
    rarity: "rare",
    race: "Beast",
    description: "Battlecry: For each Beast you control, summon a 2/2 Treant.",
    flavorText: "Freya's chosen guardian commands the wild — where beasts gather, forests rise.",
    class: "Druid",
    keywords: ["battlecry"],
    battlecry: {
      type: "summon_per_condition",
      condition: "beast_count",
      summonName: "Treant",
      summonAttack: 2,
      summonHealth: 2
    },
    collectible: true,
    set: "core"
  }
];
