import { CardData } from '../../../../../types';

export const warlockCards: CardData[] = [
  {
    id: 17001,
    name: "Ginnungagap Wanderer",
    manaCost: 1,
    attack: 1,
    health: 3,
    description: "Taunt",
    flavorText: "It walks the space between Niflheim and Muspelheim, where creation began.",
    type: "minion",
    rarity: "common",
    class: "Warlock",
    race: "Titan",
    keywords: ["taunt"],
    collectible: true,
    set: "core"
  },
  {
    id: 17002,
    name: "Rune of Shadows",
    manaCost: 3,
    description: "Deal 4 damage to a minion.",
    flavorText: "The rune burns cold. Its target burns colder.",
    type: "spell",
    rarity: "common",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "minion_only",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17003,
    name: "Muspel's Inferno",
    manaCost: 4,
    description: "Deal 3 damage to ALL characters.",
    flavorText: "Surtr's fire does not discriminate. Everything burns equally.",
    type: "spell",
    rarity: "common",
    class: "Warlock",
    spellEffect: {
      type: "aoe_damage",
      value: 3,
      targetType: "all_characters"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17004,
    name: "Doomed Guardian",
    manaCost: 5,
    attack: 5,
    health: 7,
    description: "Rush. Battlecry: Discard two random cards.",
    flavorText: "It fights knowing it will fall. Its fury comes from that certainty.",
    type: "minion",
    rarity: "rare",
    class: "Warlock",
    race: "Titan",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "discard_random",
      discardCount: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17005,
    name: "Hel's Flame",
    manaCost: 1,
    description: "Deal 4 damage. Discard a random card.",
    flavorText: "Hel takes a portion of everything. She always collects.",
    type: "spell",
    rarity: "common",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17006,
    name: "Soul's Siphon",
    manaCost: 6,
    description: "Destroy a minion. Restore 3 Health to your hero.",
    flavorText: "The soul departs. The body crumbles. The caster heals.",
    type: "spell",
    rarity: "common",
    class: "Warlock",
    spellEffect: {
      type: "destroy",
      targetType: "minion_only",
      requiresTarget: true,
      healValue: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17007,
    name: "Ginnungagap Shade",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Battlecry: Destroy both adjacent minions and gain their Attack and Health.",
    flavorText: "Born from the darkness before the Nine Realms took shape.",
    type: "minion",
    rarity: "rare",
    class: "Warlock",
    race: "Titan",
    keywords: ["battlecry"],
    battlecry: {
      type: "consume_adjacent"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17008,
    name: "Shadow Keeper",
    manaCost: 2,
    attack: 3,
    health: 2,
    description: "Battlecry: Discard a random card. Deathrattle: Draw a card.",
    flavorText: "It hoards secrets the way dragons hoard gold — jealously, and to the death.",
    type: "minion",
    rarity: "rare",
    class: "Warlock",
    keywords: ["battlecry", "deathrattle"],
    battlecry: {
      type: "discard_random",
      discardCount: 1
    },
    deathrattle: {
      type: "draw",
      count: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17009,
    name: "Ginnungagap Abyss",
    manaCost: 8,
    description: "Destroy all minions.",
    flavorText: "The abyss between worlds swallows all who dare peer into it.",
    type: "spell",
    rarity: "rare",
    class: "Warlock",
    spellEffect: {
      type: "destroy_all_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17010,
    name: "Loki's Spark",
    manaCost: 1,
    attack: 1,
    health: 3,
    description: "Battlecry: Deal 3 damage to your hero.",
    flavorText: "Small, angry, and on fire. Loki's idea of a pet.",
    type: "minion",
    rarity: "common",
    class: "Warlock",
    race: "Titan",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage",
      value: 3,
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17101,
    name: "Flame-Lord of Muspelheim",
    manaCost: 9,
    attack: 3,
    health: 15,
    description: "Battlecry: Replace your hero with Erebus, Void Lord.",
    flavorText: "When Surtr rises, even the gods retreat. His flames will consume the World Tree itself.",
    type: "minion",
    rarity: 'epic',
    class: "Warlock",
    race: "Titan",
    keywords: ["battlecry"],
    battlecry: {
      type: "replace_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17102,
    name: "Titan Sense",
    manaCost: 3,
    description: "Draw 2 Titans from your deck.",
    flavorText: "The blood of titans calls to blood. They always find each other.",
    type: "spell",
    rarity: "common",
    class: "Warlock",
    spellEffect: {
      type: "draw_specific",
      count: 2,
      condition: "titan"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17103,
    name: "Hel's Covenant",
    manaCost: 0,
    description: "Destroy a Titan. Restore 5 Health to your hero.",
    flavorText: "A bargain sealed in Helheim — power at the cost of the soul.",
    type: "spell",
    rarity: "common",
    class: "Warlock",
    spellEffect: {
      type: "destroy",
      targetType: "titan_only",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17105,
    name: "Shadow Flame",
    manaCost: 4,
    description: "Destroy a friendly minion and deal its Attack damage to all enemy minions.",
    flavorText: "Its death becomes everyone's problem.",
    type: "spell",
    rarity: "common",
    class: "Warlock",
    spellEffect: {
      type: "shadowflame",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17501,
    name: "Infernal",
    manaCost: 6,
    attack: 6,
    health: 6,
    description: "Summoned by Erebus, Void Lord.",
    flavorText: "Summoned from Muspelheim's deepest pit. It wants to go home. It cannot.",
    type: "minion",
    rarity: "common",
    class: "Warlock",
    race: "Titan",
    collectible: false,
    set: "core"
  },
  {
    id: 17506,
    name: "Imp",
    manaCost: 1,
    attack: 2,
    health: 2,
    description: "A mischievous titan.",
    flavorText: "Small, spiteful, and surprisingly flammable.",
    type: "minion",
    rarity: "common",
    class: "Warlock",
    race: "Titan",
    collectible: false,
    set: "core"
  },
  {
    id: 20022,
    name: "Lethe, Soul Vessel",
    manaCost: 1,
    type: "spell",
    rarity: 'rare',
    description: "Draw 3 cards. At the end of your turn, discard them.",
    flavorText: "The river of forgetfulness grants brief visions.",
    keywords: [],
    class: "Warlock",
    collectible: true,
    set: "core",
    spellEffect: {
      type: "draw",
      value: 3,
      requiresTarget: false,
      targetType: "none",
      temporaryEffect: true,
      delayedEffect: true,
      delayedTrigger: "end_of_turn"
    }
  },
  {
    id: 20027,
    name: "Hades, Titan Reaver",
    manaCost: 10,
    type: "hero",
    rarity: "mythic",
    description: "Battlecry: Summon all friendly Titans that died this game.",
    flavorText: "When the three brothers drew lots for dominion, Zeus took the sky, Poseidon the sea, and Hades the world below. He did not choose it — but he rules it absolutely, and none who enter his gates return. (Iliad XV.187-193)",
    keywords: ["battlecry"],
    class: "Warlock",
    armor: 5,
    collectible: true,
    set: "core",
    battlecry: {
      type: "summon",
      requiresTarget: false,
      targetType: "none",
      fromGraveyard: true,
      conditionalTarget: "titan"
    }
  },
  {
    id: 20036,
    name: "Skull of Erebus",
    manaCost: 5,
    attack: 0,
    durability: 3,
    type: "weapon",
    rarity: 'rare',
    description: "At the start of your turn, summon a Titan from your hand.",
    flavorText: "The primordial darkness gives form to titans.",
    keywords: [],
    class: "Warlock",
    collectible: true,
    set: "core"
  },
  {
    id: 20118,
    name: "Orthrus, Twin Mind",
    manaCost: 7,
    attack: 7,
    health: 7,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: The next spell you cast this turn costs Health instead of Mana.",
    flavorText: "The two-headed hound guards the cattle of Geryon.",
    keywords: ["battlecry"],
    class: "Warlock",
    collectible: true,
    set: "core",
    battlecry: {
      type: "buff",
      requiresTarget: false,
      targetType: "none",
      temporaryEffect: true
    }
  },
  {
    id: 20804,
    name: "Gullveig, Thrice-Born Witch",
    manaCost: 6,
    attack: 3,
    health: 7,
    type: "minion",
    rarity: 'rare',
    description: "Minions in your hand have Echo.",
    flavorText: "The Æsir burned her three times. Three times she rose, each time with a new name: Gullveig, Heiðr, and something they dare not speak. (Völuspá 21-22)",
    keywords: [],
    class: "Warlock",
    collectible: true,
    set: "core"
  },
  // === Dormant Card ===
  {
    id: 10010,
    name: "Bound Void Sprite",
    manaCost: 2,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "common",
    race: "Titan",
    description: "Dormant for 2 turns. When this awakens, give all minions in your hand +2/+2.",
    flavorText: "A mischievous spirit of Loki, trapped until chaos calls again.",
    keywords: ["dormant"],
    class: "Warlock",
    collectible: true,
    set: "core",
    dormantTurns: 2,
    awakenEffect: {
      type: "buff_hand",
      targetType: "none",
      buffAttack: 2,
      buffHealth: 2
    }
  },
  // === Frenzy Card ===
  {
    id: 9002,
    name: "Death's Herald",
    manaCost: 3,
    attack: 2,
    health: 4,
    type: "minion",
    rarity: "common",
    description: "Taunt. Frenzy: Restore 4 Health to your hero.",
    flavorText: "Clamp down. Never let go. Eventually, everything stops struggling.",
    keywords: ["frenzy", "taunt"],
    class: "Warlock",
    collectible: true,
    set: "core",
    frenzyEffect: {
      type: "heal",
      targetType: "friendly_hero",
      value: 4,
      triggered: false
    }
  },
  // === Discover Card ===
  {
    id: 29004,
    name: "Shadow Revelation",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Foresee a Titan.",
    flavorText: "The void shows you what you need. It does not show you what you want.",
    keywords: ["discover"],
    class: "Warlock",
    spellEffect: {
      type: "discover",
      requiresTarget: false,
      discoveryPoolId: "titan",
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  // === Lifesteal Card ===
  {
    id: 17202,
    name: "Soul Rend",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Lifesteal. Deal 2 damage to a minion.",
    flavorText: "Tear out enough souls and you start to feel whole again.",
    keywords: ["lifesteal"],
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  // === Migrated from legacy warlockCards.ts ===
  {
    id: 17104,
    name: "Surtr's Fist",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "When you play or discard this, deal 4 damage to a random enemy.",
    flavorText: "The titan lord's fury strikes from beyond.",
    class: "Warlock",
    spellEffect: {
      type: "damage_random_enemy",
      value: 4,
      triggerOnDiscard: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17106,
    name: "Soul Renderer",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Deal 5 damage to a minion. If it dies, summon a 5/5 Titan.",
    flavorText: "A dark gift from the void itself.",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 5,
      targetType: "minion_only",
      requiresTarget: true,
      deathEffect: {
        type: "summon",
        cardId: 17502
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17107,
    name: "Muspel's Ravager",
    manaCost: 6,
    attack: 8,
    health: 8,
    type: "minion",
    race: "Titan",
    rarity: "rare",
    description: "Whenever your opponent plays a card, discard the top 3 cards of your deck.",
    flavorText: "A construct forged in the fires of Hel—dangerous to foes and allies alike.",
    class: "Warlock",
    triggeredEffect: {
      type: "mill_on_opponent_play",
      count: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17108,
    name: "Void Breaker",
    manaCost: 5,
    attack: 5,
    health: 4,
    type: "minion",
    race: "Titan",
    rarity: "common",
    description: "Inspire: Destroy a random minion on each side.",
    flavorText: "In the void, all are equal prey.",
    keywords: ["inspire"],
    class: "Warlock",
    inspireEffect: {
      type: "destroy_random_minion_both_sides"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17109,
    name: "Titan's Heart",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Deal 5 damage to a minion. If it's a friendly Titan, give it +5/+5 instead.",
    flavorText: "The heart of a titan beats with dark power.",
    class: "Warlock",
    spellEffect: {
      type: "conditional_effect",
      targetType: "minion_only",
      requiresTarget: true,
      condition: {
        type: "is_friendly_titan"
      },
      trueEffect: {
        type: "buff",
        attack: 5,
        health: 5
      },
      falseEffect: {
        type: "damage",
        value: 5
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 17110,
    name: "Shadow Imp",
    manaCost: 1,
    attack: 1,
    health: 3,
    type: "minion",
    race: "Titan",
    rarity: "common",
    description: "Whenever you discard a card, draw a card.",
    flavorText: "The imp serves as a living conduit to the titan prince.",
    class: "Warlock",
    triggeredEffect: {
      type: "draw_on_discard",
      count: 1
    },
    collectible: true,
    set: "core"
  },
  // === Warlock Spell Cards ===
  {
    id: 37001,
    name: "Corruption Curse",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Choose an enemy minion. At the start of your turn, destroy it.",
    flavorText: "All things fall to entropy in time.",
    class: "Warlock",
    spellEffect: {
      type: "apply_corruption",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 37002,
    name: "Muspel Covenant",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Destroy a friendly minion. Restore 8 Health to your hero.",
    flavorText: "Sealed in Surtr's flame, this pact burns from within.",
    class: "Warlock",
    spellEffect: {
      type: "destroy",
      targetType: "friendly_minion",
      requiresTarget: true,
      sideEffect: {
        type: "restore_health",
        value: 8,
        targetType: "own_hero"
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 37003,
    name: "Vampire's Kiss of Hel",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage. Restore 2 Health to your hero.",
    flavorText: "Life flows from the weak to the strong.",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "any",
      requiresTarget: true,
      sideEffect: {
        type: "restore_health",
        value: 2,
        targetType: "own_hero"
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 37004,
    name: "Doom's Curse",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Deal 2 damage to a character. If that kills it, summon a random Titan.",
    flavorText: "From death comes terrible new life.",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "any",
      requiresTarget: true,
      deathEffect: {
        type: "summon_random_titan"
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 37005,
    name: "Hag's Summons",
    manaCost: 5,
    type: "spell",
    rarity: "common",
    description: "Summon a 1/1 Flame Wisp, a 2/2 Enchanted Besom, and a 3/3 Cauldron Imp.",
    flavorText: "Óðinn's Prophet loved entertaining guests with magical helpers.",
    class: "Warlock",
    spellEffect: {
      type: "summon_multiple",
      minions: [
        { cardId: 17503 },
        { cardId: 17504 },
        { cardId: 17505 }
      ]
    },
    collectible: true,
    set: "core"
  },
  {
    id: 37006,
    name: "Seed of Ruin",
    manaCost: 7,
    type: "spell",
    rarity: "rare",
    description: "Deal 5 damage to all enemy minions. Summon two 2/2 Imps.",
    flavorText: "From chaos, the Legion finds new soldiers.",
    class: "Warlock",
    spellEffect: {
      type: "aoe_damage",
      value: 5,
      targetType: "enemy_minions",
      sideEffect: {
        type: "summon_multiple",
        minions: [
          { cardId: 17506 },
          { cardId: 17506 }
        ]
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 37007,
    name: "Blood Rune",
    manaCost: 2,
    type: "spell",
    rarity: "rare",
    description: "Your next spell this turn costs Health instead of Mana.",
    flavorText: "Blood is just liquid mana, really.",
    class: "Warlock",
    spellEffect: {
      type: "next_spell_costs_health"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 37008,
    name: "Shadow Project",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Each player transforms a random minion in their hand into a Titan.",
    flavorText: "Everyone deserves a chance to embrace chaos.",
    class: "Warlock",
    spellEffect: {
      type: "transform_random_in_hand",
      transformType: "titan",
      affectBothPlayers: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 37009,
    name: "Void Bargain",
    manaCost: 8,
    type: "spell",
    rarity: "rare",
    description: "Destroy half of each player's deck.",
    flavorText: "A bargain with the void has... consequences.",
    class: "Warlock",
    spellEffect: {
      type: "destroy_half_deck",
      affectBothPlayers: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 37010,
    name: "Ritual of Blood",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage to your hero. Draw 3 cards.",
    flavorText: "Power demands sacrifice.",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "own_hero",
      sideEffect: {
        type: "draw",
        count: 3
      }
    },
    collectible: true,
    set: "core"
  },
  // === Warlock Tokens ===
  {
    id: 17502,
    name: "Soul Remnant",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    race: "Titan",
    rarity: "common",
    description: "Drawn from the void.",
    flavorText: "What remains when the soul is drained.",
    class: "Warlock",
    collectible: false,
    set: "core"
  },
  {
    id: 17503,
    name: "Flame Wisp",
    manaCost: 1,
    attack: 1,
    health: 1,
    type: "minion",
    rarity: "common",
    description: "Summoned by Hag's Summons.",
    flavorText: "It's lit.",
    class: "Warlock",
    collectible: false,
    set: "core"
  },
  {
    id: 17504,
    name: "Enchanted Besom",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Summoned by Hag's Summons.",
    flavorText: "It sweeps on its own. Best not to ask why.",
    class: "Warlock",
    collectible: false,
    set: "core"
  },
  {
    id: 17505,
    name: "Cauldron Imp",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Summoned by Hag's Summons.",
    flavorText: "Brews something foul. Drinks are not recommended.",
    class: "Warlock",
    collectible: false,
    set: "core"
  },
  // === Self-Damage Cards (from selfDamageCards.ts) ===
  {
    id: 47001,
    name: "Blood-Fury Brewer",
    manaCost: 4,
    attack: 4,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Deal 3 damage to your hero. Gain +3 Attack.",
    flavorText: "His brew is infused with his own blood—literally.",
    keywords: ["battlecry"],
    class: "Warlock",
    battlecry: {
      type: "self_damage_buff",
      value: 3,
      buffAttack: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 47002,
    name: "Lord of the Pit",
    manaCost: 4,
    attack: 5,
    health: 6,
    type: "minion",
    race: "Titan",
    rarity: "rare",
    description: "Battlecry: Deal 5 damage to your hero.",
    flavorText: "Mannoroth's lesser kin, still quite formidable.",
    keywords: ["battlecry"],
    class: "Warlock",
    battlecry: {
      type: "damage",
      value: 5,
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 47003,
    name: "Ritual of Bleeding",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage to your hero. Draw 2 cards.",
    flavorText: "Knowledge always comes at a price.",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "friendly_hero",
      sideEffect: {
        type: "draw",
        count: 2
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 47004,
    name: "Rune Weaver",
    manaCost: 4,
    attack: 5,
    health: 4,
    type: "minion",
    rarity: "common",
    description: "Battlecry: Give your Titans +1/+1.",
    flavorText: "She adorns her titans with crystals of power.",
    keywords: ["battlecry"],
    class: "Warlock",
    battlecry: {
      type: "buff_tribe",
      tribe: "titan",
      buffs: {
        attack: 1,
        health: 1
      },
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 47005,
    name: "Blood Covenant",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage to your hero. Gain 3 armor and draw a card.",
    flavorText: "A contract sealed in blood never fades.",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "friendly_hero",
      sideEffect: {
        type: "gain_armor_and_draw",
        armor: 3,
        draw: 1
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 47006,
    name: "Pain Acceptor",
    manaCost: 2,
    attack: 2,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Whenever your hero takes damage, gain +1/+1.",
    flavorText: "What doesn't kill you makes you stronger.",
    class: "Warlock",
    triggeredEffect: {
      type: "buff_on_hero_damage",
      attack: 1,
      health: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 47007,
    name: "Soul Tear",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 2-4 damage to a minion. Deal the same amount to your hero.",
    flavorText: "Shared pain is halved pain. Or doubled.",
    class: "Warlock",
    spellEffect: {
      type: "random_damage_with_self_damage",
      minValue: 2,
      maxValue: 4,
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 47008,
    name: "Blood Drinker",
    manaCost: 6,
    attack: 7,
    health: 5,
    type: "minion",
    race: "Titan",
    rarity: "epic",
    description: "Battlecry: Deal 5 damage to your hero. Lifesteal.",
    flavorText: "It takes life to give life.",
    keywords: ["battlecry", "lifesteal"],
    class: "Warlock",
    battlecry: {
      type: "damage",
      value: 5,
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 47009,
    name: "Shadow Whisperer",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Give a friendly Titan +2/+2.",
    flavorText: "His whispers carry promises of power.",
    keywords: ["battlecry"],
    class: "Warlock",
    battlecry: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 2,
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 47010,
    name: "Lesser Void Contract",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Deal 4 damage to your hero. Destroy a random card in your opponent's hand.",
    flavorText: "The fine print is always where they get you.",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "friendly_hero",
      sideEffect: {
        type: "destroy_random_opponent_card"
      }
    },
    collectible: true,
    set: "core"
  },
  // === Highlander Card ===
  {
    id: 80003,
    name: "Krul the Unchained",
    manaCost: 9,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: 'epic',
    race: "Titan",
    description: "Battlecry: If your deck has no duplicates, summon all Titans from your hand.",
    flavorText: "Freed from his chains in Tartarus, he commands the titan legions.",
    keywords: ["battlecry"],
    class: "Warlock",
    battlecry: {
      type: "summon_from_hand",
      condition: "no_duplicates",
      targetType: "titan"
    },
    collectible: true,
    set: "core"
  },
  // === Zoo & Discard Expansion ===
  {
    id: 38901,
    name: "Void Imp",
    manaCost: 1,
    attack: 2,
    health: 1,
    description: "Battlecry: Deal 1 damage to your hero.",
    flavorText: "A sliver of the void, given teeth and a bad attitude.",
    type: "minion",
    rarity: "common",
    class: "Warlock",
    race: "Titan",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage",
      value: 1,
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38902,
    name: "Hel's Wretch",
    manaCost: 1,
    attack: 1,
    health: 3,
    description: "Whenever you discard a card, gain +1/+1.",
    flavorText: "She discards her past willingly. Each loss makes her hungrier.",
    type: "minion",
    rarity: "common",
    class: "Warlock",
    keywords: [],
    triggeredEffect: {
      type: "buff_on_discard",
      attack: 1,
      health: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38903,
    name: "Soulfire of Muspel",
    manaCost: 1,
    description: "Deal 4 damage. Discard a random card.",
    flavorText: "The flame burns memory as fuel. What you forget, it destroys.",
    type: "spell",
    rarity: "common",
    class: "Warlock",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "any",
      requiresTarget: true,
      sideEffect: {
        type: "discard_random",
        count: 1
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38904,
    name: "Clutch of Hel",
    manaCost: 2,
    description: "Discard 2 cards. Draw 3 cards.",
    flavorText: "Let go of what you were. Grasp what you will become.",
    type: "spell",
    rarity: "common",
    class: "Warlock",
    spellEffect: {
      type: "discard_and_draw",
      discardCount: 2,
      drawCount: 3,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  }
];
