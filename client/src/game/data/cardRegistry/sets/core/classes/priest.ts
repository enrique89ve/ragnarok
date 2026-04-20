import { CardData } from '../../../../../types';

export const priestCards: CardData[] = [
  {
    id: 9013,
    name: "Essence of Vitality",
    manaCost: 4,
    attack: 0,
    health: 5,
    description: "This minion's Attack is always equal to its Health.",
    flavorText: "I'm all for personal growth, but this little guy takes it too far.",
    type: "minion",
    rarity: "common",
    class: "Priest",
    collectible: true,
    set: "core"
  },
  {
    id: 9014,
    name: "Hel's Priestess",
    manaCost: 4,
    attack: 3,
    health: 5,
    description: "Your cards and powers that restore Health now deal damage instead.",
    flavorText: "The priests of Hel know the end is coming, but they're not sure when.",
    type: "minion",
    rarity: "common",
    class: "Priest",
    aura: {
      type: "transform_healing_to_damage",
      affects: "all_healing_effects"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9016,
    name: "Berserker's Fury",
    manaCost: 1,
    description: "Change a minion's Attack to be equal to its Health.",
    flavorText: "Incinerating your opponent makes you feel all warm and tingly inside.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "attack_equals_health",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9017,
    name: "Odin's All-Sight",
    manaCost: 1,
    description: "Put a copy of a random card in your opponent's hand into your hand.",
    flavorText: "Good artists copy, great artists steal.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    collectible: true,
    set: "core"
  },
  {
    id: 9019,
    name: "Loki's Deception",
    manaCost: 4,
    description: "Gain control of an enemy minion with 3 or less Attack until end of turn.",
    flavorText: "You can see into their hearts, and there you will find... MADNESS!",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "mind_control_temporary",
      targetType: "enemy_minion",
      condition: "attack_less_than_4",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9021,
    name: "Well of Vitality",
    manaCost: 2,
    attack: 1,
    health: 5,
    description: "At the start of your turn, restore 3 Health to a damaged friendly character. Deathrattle: Restore 3 Health to your hero.",
    flavorText: "It isn't clear if people ignore the Lightwell, or if it is just invisible.",
    type: "minion",
    rarity: "common",
    class: "Priest",
    keywords: ["deathrattle"],
    deathrattle: { type: "heal_hero", value: 3 },
    collectible: true,
    set: "core"
  },
  {
    id: 9022,
    name: "Baldur's Flame",
    manaCost: 6,
    description: "Deal 5 damage. Restore 5 Health to your hero.",
    flavorText: "Often followed by Holy Extinguisher.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "damage",
      value: 5,
      targetType: "any_character",
      requiresTarget: true,
      healValue: 5
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9023,
    name: "Radiant Smite",
    manaCost: 1,
    description: "Deal 3 damage to a minion.",
    flavorText: "It's hard to argue with that level of commitment.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9024,
    name: "Baldur's Light",
    manaCost: 4,
    description: "Deal 2 damage to all enemy minions. Restore 2 Health to all friendly characters.",
    flavorText: "If you listen carefully, you can hear the holy music.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "aoe_damage_and_heal",
      value: 2,
      targetType: "all_enemy_minions",
      healValue: 2,
      healTarget: "all_friendly_characters"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9025,
    name: "Hel's Whisper",
    manaCost: 2,
    description: "Destroy a minion with 3 or less Attack.",
    flavorText: "A quieter alternative to shouting the minion's name.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "destroy",
      targetType: "any_minion",
      condition: "attack_less_than_4",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9026,
    name: "Hel's Decree",
    manaCost: 3,
    description: "Destroy a minion with 5 or more Attack.",
    flavorText: "Hel, daughter of Loki, judges the dead with one living eye and one dead. Those she decrees must fall — fall. (Gylfaginning 34)",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "destroy",
      targetType: "any_minion",
      condition: "attack_5_or_more",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9027,
    name: "Mind Theft",
    manaCost: 3,
    description: "Copy 2 cards from your opponent's deck and add them to your hand.",
    flavorText: "Stealing ideas is the sincerest form of flattery.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "copy_from_opponent_deck",
      value: 2,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9028,
    name: "Odin's Domination",
    manaCost: 10,
    description: "Take control of an enemy minion.",
    flavorText: "Nominated as the most popular spell to complain about.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "mind_control",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9029,
    name: "Spirit's Blessing",
    manaCost: 2,
    description: "Double a minion's Health.",
    flavorText: "Holy synergy with Inner Fire!",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "double_health",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9030,
    name: "Healing Ring",
    manaCost: 1,
    description: "Restore 4 Health to ALL minions.",
    flavorText: "This spell has saved more arena runs than any other card.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "aoe_heal",
      value: 4,
      targetType: "all_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9031,
    name: "Banishing Release",
    manaCost: 4,
    description: "Silence all enemy minions. Draw a card.",
    flavorText: "It's only truly massive with 4 or more minions silenced.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "silence_all",
      targetType: "all_enemy_minions",
      drawCards: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9032,
    name: "Odin's Ward",
    manaCost: 1,
    description: "Give a minion +2 Health. Draw a card.",
    flavorText: "Sure, it gives a minion +2 Health. But it also gives +2 cards to your hand!",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "buff",
      buffHealth: 2,
      targetType: "any_minion",
      requiresTarget: true,
      drawCards: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5112,
    name: "Stern Mentor",
    manaCost: 4,
    attack: 3,
    health: 6,
    description: "After you play a minion, destroy it and summon a 4/4 Failed Student.",
    flavorText: "The lesson is harsh. The lesson is necessary. The student does not survive it.",
    type: "minion",
    rarity: "common",
    class: "Priest",
    collectible: true,
    set: "core"
  },
  {
    id: 5113,
    name: "Soul Devourer",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Battlecry: Choose an enemy minion. Deathrattle: Summon a copy of it.",
    flavorText: "It studies its prey carefully. In death, it becomes what it studied.",
    type: "minion",
    rarity: "epic",
    class: "Priest",
    keywords: ["battlecry", "deathrattle"],
    collectible: true,
    set: "core"
  },
  {
    id: 5114,
    name: "Eternal Echo of Nidhogg",
    manaCost: 8,
    attack: 8,
    health: 8,
    description: "Battlecry: Play all cards your opponent played last turn.",
    flavorText: "The dragon remembers every move its enemies made. It replays them with malice.",
    type: "minion",
    rarity: 'rare',
    class: "Priest",
    keywords: ["battlecry"],
    collectible: true,
    set: "core"
  },
  {
    id: 9501,
    name: "Failed Student",
    manaCost: 4,
    attack: 4,
    health: 4,
    description: "Summoned by Priest transformation.",
    flavorText: "Not every lesson ends well. This one ended very poorly indeed.",
    type: "minion",
    rarity: "common",
    class: "Priest",
    collectible: false,
    set: "core"
  },
  {
    id: 20019,
    name: "Selene, the Devout",
    manaCost: 7,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "epic",
    description: "Battlecry: For each spell in your hand, summon a 3/3 copy of a minion that died this game.",
    flavorText: "Moon goddess devoted to resurrecting the faithful.",
    keywords: ["battlecry"],
    class: "Priest",
    collectible: true,
    set: "core",
    battlecry: {
      type: "summon",
      requiresTarget: false,
      targetType: "none",
      isRandom: true,
      fromGraveyard: true
    }
  },
  {
    id: 48104,
    name: "Nightmother's Inquisitor",
    manaCost: 7,
    attack: 5,
    health: 7,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Reduce the Cost of Corrupt cards in your hand and deck by (2).",
    flavorText: "Goddess of night, she corrupts all she touches.",
    keywords: ["battlecry"],
    class: "Priest",
    collectible: true,
    set: "core",
    battlecry: {
      type: "reduce_cost",
      value: 2,
      targets: "corrupt_cards",
      targetsLocation: ["hand", "deck"]
    }
  },
  {
    id: 5108,
    name: "Shade-Queen's Revenant",
    manaCost: 8,
    attack: 6,
    health: 8,
    type: "minion",
    rarity: "epic",
    description: "At the end of your turn, summon a friendly minion that died this game.",
    flavorText: "Queen of the underworld, she commands the dead to rise.",
    keywords: [],
    class: "Priest",
    collectible: true,
    set: "core",
    endOfTurn: {
      type: "summon",
      source: "graveyard",
      count: 1,
      targetType: "friendly_minion"
    }
  },
  {
    id: 5111,
    name: "Asclepius, High Priest",
    manaCost: 4,
    attack: 2,
    health: 7,
    type: "minion",
    rarity: "rare",
    description: "Whenever you summon a minion, set its Health equal to this minion's.",
    flavorText: "God of medicine, he blesses all who serve under him.",
    keywords: [],
    class: "Priest",
    collectible: true,
    set: "core"
  },
  {
    id: 48116,
    name: "Styx Reliquary",
    manaCost: 1,
    attack: 1,
    health: 3,
    type: "minion",
    rarity: "rare",
    description: "Lifesteal. Deathrattle: Shuffle 'Styx Prime' into your deck.",
    flavorText: "Souls flow through the river Styx into this vessel.",
    keywords: ["lifesteal", "deathrattle"],
    class: "Priest",
    collectible: true,
    set: "core",
    deathrattle: {
      type: "shuffle_into_deck",
      cardId: "styx_prime"
    }
  },
  {
    id: 20801,
    name: "Loom of Chronos",
    manaCost: 7,
    attack: 6,
    health: 6,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Your opponent takes two turns. Then you take two turns.",
    flavorText: "The primordial god of time bends reality at will.",
    keywords: ["battlecry"],
    race: "Dragon",
    class: "Priest",
    collectible: true,
    set: "core",
    battlecry: {
      type: "extra_turns",
      requiresTarget: false,
      targetType: "none"
    }
  },
  {
    id: 20810,
    name: "Moirai Confessor",
    manaCost: 7,
    attack: 5,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Inspire: Summon a random Mythic minion.",
    flavorText: "The Fates hear confessions and grant legendary blessings.",
    keywords: ["inspire"],
    class: "Priest",
    collectible: true,
    set: "core",
    inspireEffect: {
      type: "summon",
      condition: "random_mythic",
      summonCount: 1
    }
  },
  {
    id: 48032,
    name: "Helios Sunshard",
    manaCost: 5,
    attack: 3,
    health: 5,
    type: "minion",
    rarity: "common",
    description: "Whenever you cast a spell, add a random Priest spell to your hand.",
    flavorText: "A shard of the sun god's radiance, endlessly generating light.",
    keywords: [],
    race: "Elemental",
    class: "Priest",
    collectible: true,
    set: "core"
  },
  // === Dormant Card ===
  {
    id: 10011,
    name: "Bound Homunculus",
    manaCost: 1,
    attack: 2,
    health: 5,
    type: "minion",
    rarity: "common",
    race: "Titan",
    description: "Dormant for 2 turns. Taunt",
    flavorText: "Sealed by the oracles of Delphi, this alchemical servant awaits its master's call.",
    keywords: ["dormant", "taunt"],
    class: "Priest",
    dormantTurns: 2,
    collectible: true,
    set: "core"
  },
  // === Reborn Card ===
  {
    id: 19002,
    name: "Risen Guardian",
    manaCost: 2,
    attack: 1,
    health: 2,
    type: "minion",
    rarity: "rare",
    description: "Reborn. Deathrattle: Give a random friendly minion +1/+1.",
    flavorText: "It fell defending the temple. It rose defending the faith.",
    keywords: ["reborn", "deathrattle"],
    class: "Priest",
    deathrattle: {
      type: "buff",
      buffAttack: 1,
      buffHealth: 1,
      targetType: "all_friendly"
    },
    collectible: true,
    set: "core"
  },
  // === Discover Cards ===
  {
    id: 29001,
    name: "Dark Glimpses",
    manaCost: 2,
    type: "spell",
    rarity: "rare",
    description: "Foresee a copy of a spell in your deck.",
    flavorText: "The shadows show what lies ahead. Not all futures are kind.",
    keywords: ["discover"],
    class: "Priest",
    spellEffect: {
      type: "discover",
      requiresTarget: false,
      discoveryType: "spell",
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 29002,
    name: "Dragon Kin Guardian",
    manaCost: 5,
    attack: 5,
    health: 6,
    type: "minion",
    rarity: "rare",
    race: "Dragon",
    description: "Battlecry: If you are holding a Dragon, Foresee a copy of a card in your opponent's deck.",
    flavorText: "The dragons whisper their secrets to those who carry their blood.",
    keywords: ["battlecry", "discover"],
    class: "Priest",
    battlecry: {
      type: "discover",
      requiresTarget: false,
      targetType: "none",
      discoveryType: "any"
    },
    collectible: true,
    set: "core"
  },
  // === Migrated from additionalClassMinions.ts ===
  {
    id: 40012,
    name: "Dark Priestess",
    manaCost: 6,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "epic",
    description: "Battlecry: Take control of an enemy minion with 2 or less Attack.",
    flavorText: "The Cabal's whispers can turn even the meekest servant against their master.",
    keywords: ["battlecry"],
    class: "Priest",
    battlecry: {
      type: "mind_control",
      requiresTarget: true,
      targetType: "enemy_minion",
      condition: {
        type: "attack_less_than_or_equal",
        value: 2
      }
    },
    collectible: true,
    set: "core"
  },
  // === Quest Cards ===
  {
    id: 70004,
    name: "Call of the Moirai",
    manaCost: 1,
    type: "spell",
    rarity: 'rare',
    description: "Quest: Summon 7 Deathrattle minions. Reward: Amara, Shield of Persephone.",
    flavorText: "The Fates call upon the souls bound to return from death.",
    keywords: ["quest"],
    class: "Priest",
    questProgress: {
      goal: 7,
      current: 0,
      condition: "summon_deathrattle_minions"
    },
    questReward: {
      cardId: 70014
    },
    collectible: true,
    set: "core"
  },
  {
    id: 70014,
    name: "Amara, Shield of Persephone",
    manaCost: 5,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Battlecry: Set your hero's Health to 40.",
    flavorText: "Persephone's guardian shields mortals from the underworld.",
    keywords: ["taunt", "battlecry"],
    class: "Priest",
    battlecry: {
      type: "set_hero_health",
      value: 40
    },
    collectible: false,
    set: "core"
  },
  // === Gullveig Card ===
  {
    id: 60004,
    name: "Sibyl of Gullveig",
    manaCost: 4,
    attack: 3,
    health: 6,
    type: "minion",
    rarity: "common",
    description: "Whenever a character is healed, give your Gullveig +2/+2 (wherever she is).",
    flavorText: "Her prophecies speak of the Thrice-Burned's inevitable return from the pyre.",
    keywords: [],
    class: "Priest",
    minionEffect: {
      type: "buff_cthun_on_heal",
      buffAttack: 2,
      buffHealth: 2
    },
    collectible: true,
    set: "core"
  },
  // === Highlander Card ===
  {
    id: 80002,
    name: "The Abyss Bound",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: If your deck has no duplicates, your Hero Power costs (0) this game.",
    flavorText: "Chained in the abyss, he grants power to those who walk alone.",
    keywords: ["battlecry"],
    class: "Priest",
    battlecry: {
      type: "reduce_hero_power_cost",
      condition: "no_duplicates",
      value: 0,
      permanent: true
    },
    collectible: true,
    set: "core"
  },
  // === New Holy Spells ===
  {
    id: 80020,
    name: "Rune of Renewal",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Restore 5 Health to a friendly minion. If you control a minion with Rune Activation, trigger its ability.",
    flavorText: "Ancient symbols mend what time has broken.",
    keywords: [],
    class: "Priest",
    spellEffect: {
      type: "heal",
      value: 5,
      targetType: "friendly_minion",
      requiresTarget: true,
      triggerRuneActivation: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 80021,
    name: "Ancient Insight",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Draw a card. If you control a minion with Rune Activation, trigger its ability.",
    flavorText: "Whispers of the past guide the present.",
    keywords: [],
    class: "Priest",
    spellEffect: {
      type: "draw",
      value: 1,
      triggerRuneActivation: true
    },
    collectible: true,
    set: "core"
  },
  // === Shadow Priest Expansion ===
  {
    id: 38501,
    name: "Shadow Word: Bane",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Destroy a minion with 3 or less Attack.",
    flavorText: "The shadow consumes those too weak to resist.",
    class: "Priest",
    spellEffect: {
      type: "destroy",
      targetType: "enemy_minion",
      requiresTarget: true,
      condition: "attack_3_or_less"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38502,
    name: "Shadow Word: Ruin",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Destroy a minion with 5 or more Attack.",
    flavorText: "Even the mightiest warriors fall before the shadow's judgment.",
    class: "Priest",
    spellEffect: {
      type: "destroy",
      targetType: "enemy_minion",
      requiresTarget: true,
      condition: "attack_5_or_more"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38503,
    name: "Hel's Shadow Bolt",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 4 damage to a minion. If it dies, deal 2 damage to the enemy hero.",
    flavorText: "Hel's bolts pursue the soul even beyond death.",
    class: "Priest",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "enemy_minion",
      requiresTarget: true,
      overkillEffect: { type: "damage_hero", value: 2 }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38504,
    name: "Mind Seize",
    manaCost: 4,
    type: "spell",
    rarity: "rare",
    description: "Take control of an enemy minion with 3 or less Attack.",
    flavorText: "The weak-willed are easy prey for those who walk between worlds.",
    class: "Priest",
    spellEffect: {
      type: "mind_control",
      targetType: "enemy_minion",
      requiresTarget: true,
      condition: "attack_3_or_less"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38505,
    name: "Shadow Priestess of Hel",
    manaCost: 4,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "common",
    description: "Your healing effects also deal that much damage to a random enemy.",
    flavorText: "She walks the line between mercy and malice.",
    class: "Priest",
    aura: {
      type: "shadowform",
      effect: "heal_also_damages"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38506,
    name: "Shadow-Warden of Helheim",
    manaCost: 8,
    attack: 6,
    health: 6,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Take control of an enemy minion. Deathrattle: Return it to your opponent.",
    flavorText: "Half living, half dead, she claims all who enter her domain — but never forever.",
    keywords: ["battlecry", "deathrattle"],
    class: "Priest",
    battlecry: {
      type: "mind_control",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    deathrattle: {
      type: "return_stolen_minion"
    },
    collectible: true,
    set: "core"
  },
  // ==================== COMMON GAP-FILL (Starter Deck Viability — draw + removal) ====================
  {
    id: 39214,
    name: "Norn's Counsel",
    manaCost: 1,
    description: "Draw a card. If you have 3 or more cards in hand, draw another.",
    flavorText: "The Norns weave and whisper. Those who listen gain wisdom.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "conditional_draw",
      value: 1,
      condition: { minHandSize: 3 },
      bonusValue: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39215,
    name: "Hel's Rebuke",
    manaCost: 3,
    description: "Deal 2 damage to all enemy minions. Restore 2 Health to your hero.",
    flavorText: "Even the dead flinch when Hel speaks.",
    type: "spell",
    rarity: "common",
    class: "Priest",
    spellEffect: {
      type: "damage_aoe_and_heal_hero",
      value: 2,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  }
];
