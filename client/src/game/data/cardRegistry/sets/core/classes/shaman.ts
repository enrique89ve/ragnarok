import { CardData } from '../../../../../types';

export const shamanCards: CardData[] = [
  {
    id: 5201,
    name: "Muspel's Ember",
    manaCost: 6,
    attack: 6,
    health: 5,
    description: "Battlecry: Deal 3 damage. Overload: (1)",
    flavorText: "A living fragment of Muspelheim's eternal flame.",
    type: "minion",
    rarity: "common",
    class: "Shaman",
    race: "Elemental",
    keywords: ["battlecry", "overload"],
    overload: { amount: 1 },
    battlecry: {
      type: "damage",
      value: 3,
      requiresTarget: true,
      targetType: "any"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5202,
    name: "Surtr's Totem",
    manaCost: 2,
    attack: 0,
    health: 3,
    description: "Adjacent minions have +2 Attack.",
    flavorText: "The fire giant's essence, bound in stone. It seethes.",
    type: "minion",
    rarity: "common",
    class: "Shaman",
    race: "Spirit",
    aura: {
      type: "attack_buff",
      value: 2,
      targetType: "adjacent_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5115,
    name: "Nerida, Wave Keeper",
    manaCost: 3,
    attack: 4,
    health: 3,
    description: "Spell Damage +1. Deathrattle: Shuffle 'Nerida Prime' into your deck.",
    flavorText: "She speaks the language of the tides. The tides listen.",
    type: "minion",
    rarity: 'epic',
    class: "Shaman",
    race: "Naga",
    keywords: ["spell_damage", "deathrattle"],
    deathrattle: {
      type: "shuffle_into_deck",
      summonCardId: 5252,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5116,
    name: "Leviathan's Child",
    manaCost: 6,
    attack: 6,
    health: 5,
    description: "Battlecry: Deal 3 damage to an enemy minion. If it dies, repeat on one of its neighbors. Overload: (2)",
    flavorText: "It dwells where the ocean floor drops away into nothing.",
    type: "minion",
    rarity: 'epic',
    class: "Shaman",
    race: "Beast",
    keywords: ["battlecry", "overload"],
    overload: { amount: 2 },
    battlecry: {
      type: "damage",
      value: 3,
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5221,
    name: "Thor's Strike",
    manaCost: 1,
    description: "Deal 3 damage. Overload: (1)",
    flavorText: "Thor casts a bolt. Something stops existing.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    keywords: ["overload"],
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5222,
    name: "Thor's Fury",
    manaCost: 3,
    description: "Deal 2-3 damage to all enemy minions. Overload: (2)",
    flavorText: "When Thor is truly angry, the sky remembers for days.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    keywords: ["overload"],
    spellEffect: {
      type: "aoe_damage",
      value: 2,
      minValue: 2,
      maxValue: 3,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5223,
    name: "Loki's Trick",
    manaCost: 4,
    description: "Transform a minion into a 0/1 Frog with Taunt.",
    flavorText: "Loki's favorite trick. Dignity is the first casualty.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    spellEffect: {
      type: "transform",
      targetType: "any_minion",
      requiresTarget: true,
      summonCardId: 5251
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5118,
    name: "Berserker's Rage",
    manaCost: 5,
    description: "Give your minions +3 Attack this turn. Overload: (2)",
    flavorText: "The battle-fury spreads like wildfire. Friend and foe alike feel it.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    keywords: ["overload"],
    overload: { amount: 2 },
    spellEffect: {
      type: "buff",
      buffAttack: 3,
      targetType: "friendly_minions",
      duration: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5119,
    name: "Gaia's Tremor",
    manaCost: 1,
    description: "Silence a minion, then deal 1 damage to it.",
    flavorText: "The earth mother cleanses corruption. She is not gentle about it.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    spellEffect: {
      type: "silence_and_damage",
      value: 1,
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5120,
    name: "Surtr's Flame",
    manaCost: 3,
    description: "Deal 5 damage. Overload: (2)",
    flavorText: "A fragment of Muspelheim's fire, flung from the realm of flame.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    keywords: ["overload"],
    spellEffect: {
      type: "damage",
      value: 5,
      targetType: "any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5121,
    name: "Eir's Touch",
    manaCost: 2,
    description: "Give a minion 'Deathrattle: Resummon this minion.' Overload: (2)",
    flavorText: "The healing goddess blesses the worthy. She decides who is worthy.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    keywords: ["overload"],
    overload: { amount: 2 },
    spellEffect: {
      type: "grant_deathrattle",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5122,
    name: "Fenrir's Spirit",
    manaCost: 3,
    description: "Summon two 2/3 Spirit Wolves with Taunt. Overload: (2)",
    flavorText: "They answer to no master, but they will fight beside those who share their fury.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    keywords: ["overload"],
    spellEffect: {
      type: "summon",
      count: 2,
      summonCardId: 5253,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5123,
    name: "Aesir's Wrath",
    manaCost: 2,
    description: "Give a minion Windfury. Overload: (1)",
    flavorText: "The wind that carries Odin's whispers. It carries his wrath too.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    keywords: ["overload"],
    overload: { amount: 1 },
    spellEffect: {
      type: "grant_keyword",
      keyword: "windfury",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5124,
    name: "Stone Breaker",
    manaCost: 2,
    description: "Give a friendly character +3 Attack this turn. Overload: (1)",
    flavorText: "The stone cracks. The mountain trembles. The shaman barely notices.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    keywords: ["overload"],
    overload: { amount: 1 },
    spellEffect: {
      type: "buff",
      buffAttack: 3,
      targetType: "friendly_character",
      requiresTarget: true,
      duration: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5125,
    name: "Odin's Eye",
    manaCost: 3,
    description: "Draw a card. That card costs (3) less. Overload: (1)",
    flavorText: "The Allfather sees all. Occasionally, he shares.",
    type: "spell",
    rarity: "common",
    class: "Shaman",
    keywords: ["overload"],
    overload: { amount: 1 },
    spellEffect: {
      type: "draw",
      value: 1,
      targetType: "none",
      costReduction: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 5253,
    name: "Spirit Wolf",
    manaCost: 2,
    attack: 2,
    health: 3,
    description: "Taunt",
    flavorText: "Summoned from the spirit realm. It guards the living as it once guarded the dead.",
    type: "minion",
    rarity: "common",
    class: "Shaman",
    race: "Beast",
    keywords: ["taunt"],
    collectible: false,
    set: "core"
  },
  {
    id: 5251,
    name: "Frog",
    manaCost: 0,
    attack: 0,
    health: 1,
    description: "Taunt",
    flavorText: "Ribbit.",
    type: "minion",
    rarity: "common",
    class: "Shaman",
    race: "Beast",
    keywords: ["taunt"],
    collectible: false,
    set: "core"
  },
  {
    id: 5252,
    name: "Nerida Prime",
    manaCost: 7,
    attack: 5,
    health: 4,
    description: "Spell Damage +1. Battlecry: Draw 3 spells. Reduce their Cost by (3).",
    flavorText: "She dove to the ocean's floor and returned changed. The deep teaches its own magic.",
    type: "minion",
    rarity: 'epic',
    class: "Shaman",
    race: "Naga",
    keywords: ["spell_damage", "battlecry"],
    collectible: false,
    set: "core"
  },
  {
    id: 20102,
    name: "Echo of the World Serpent",
    manaCost: 9,
    attack: 6,
    health: 6,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Repeat all other Battlecries from cards you played this game (targets chosen randomly).",
    flavorText: "The World Serpent echoes all that came before.",
    keywords: ["battlecry"],
    class: "Shaman",
    collectible: true,
    set: "core",
    battlecry: {
      type: "replay_battlecries",
      requiresTarget: false,
      targetType: "none",
      isRandom: true
    }
  },
  {
    id: 20119,
    name: "Echo of the Tidal Healer",
    manaCost: 5,
    attack: 4,
    health: 6,
    type: "minion",
    rarity: "epic",
    description: "Whenever your spells deal damage, restore that much Health to your hero.",
    flavorText: "The tide remembers the healer's touch — every wave both destroys and restores.",
    keywords: [],
    race: "Elemental",
    class: "Shaman",
    collectible: true,
    set: "core"
  },
  {
    id: 20126,
    name: "Argus, Storm Watcher",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: 'epic',
    description: "Taunt. Deathrattle: Shuffle 'The Storm Guardian' into your deck.",
    flavorText: "The hundred-eyed giant watches over the storm's power.",
    keywords: ["taunt", "deathrattle"],
    class: "Shaman",
    collectible: true,
    set: "core",
    deathrattle: {
      type: "shuffle",
      targetType: "none",
      summonCardId: 20127
    }
  },
  {
    id: 20127,
    name: "The Storm Guardian",
    manaCost: 5,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: 'epic',
    description: "Taunt. Battlecry: Deal 3 damage to all enemy minions.",
    flavorText: "Born of lightning and thunder, it guards the realm.",
    keywords: ["taunt", "battlecry"],
    battlecry: { type: "aoe_damage", targetType: "all_enemy_minions", value: 3 },
    class: "Shaman",
    collectible: false,
    set: "core"
  },
  {
    id: 20702,
    name: "Boreas, Ice Collector",
    manaCost: 6,
    attack: 4,
    health: 4,
    type: "minion",
    rarity: 'rare',
    description: "Whenever another minion is Frozen, add a copy of it to your hand.",
    flavorText: "The north wind god collects frozen souls.",
    keywords: [],
    class: "Shaman",
    collectible: true,
    set: "core"
  },
  {
    id: 20407,
    name: "Proteus, Mist Shaper",
    manaCost: 5,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Add a Mass Polymorph to your hand. It costs (1).",
    flavorText: "The old sea god shapes mist into sheep.",
    keywords: ["battlecry"],
    class: "Shaman",
    collectible: true,
    set: "core",
    battlecry: {
      type: "add_card",
      requiresTarget: false,
      targetType: "none",
      cardName: "Mass Polymorph",
      costReduction: 1
    }
  },
  {
    id: 20408,
    name: "Gaia, Stone Mother",
    manaCost: 8,
    attack: 5,
    health: 10,
    type: "minion",
    rarity: "epic",
    description: "Taunt. At the end of your turn, summon a 2/3 Elemental with Taunt.",
    flavorText: "Mother Earth herself defends her children.",
    keywords: ["taunt"],
    race: "Elemental",
    class: "Shaman",
    collectible: true,
    set: "core"
  },
  {
    id: 40131,
    name: "Talos, Elemental Titan",
    manaCost: 8,
    attack: 7,
    health: 7,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: If you played an Elemental last turn, cast an Elemental Invocation.",
    flavorText: "The bronze giant guards the elements' power.",
    keywords: ["battlecry", "discover"],
    race: "Elemental",
    class: "Shaman",
    collectible: true,
    set: "core",
    battlecry: {
      type: "discover",
      requiresTarget: false,
      targetType: "none",
      discoveryType: "spell",
      discoveryCount: 4,
      discoveryClass: "shaman"
    }
  },
  // === Overload Cards ===
  {
    id: 35004,
    name: "Zeus' Fork",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage to 2 random enemy minions. Overload: (2)",
    flavorText: "The bolt leaps from target to target. Zeus wastes nothing.",
    keywords: ["overload"],
    class: "Shaman",
    spellEffect: {
      type: "damage",
      value: 2,
      requiresTarget: false,
      targetType: "random_enemy_minions",
      targetCount: 2
    },
    overload: { amount: 2 },
    collectible: true,
    set: "core"
  },
  {
    id: 35006,
    name: "Earth Elemental",
    manaCost: 5,
    attack: 6,
    health: 7,
    type: "minion",
    rarity: "rare",
    description: "Taunt. Overload: (3)",
    flavorText: "It was a mountain once. Now it walks.",
    keywords: ["taunt", "overload"],
    class: "Shaman",
    race: "Elemental",
    overload: { amount: 3 },
    collectible: true,
    set: "core"
  },
  {
    id: 35007,
    name: "Mjölnir's Echo",
    manaCost: 5,
    attack: 2,
    durability: 8,
    type: "weapon",
    rarity: "epic",
    description: "Windfury, Overload: (2)",
    flavorText: "The hammer of Thor. It always returns to his hand.",
    keywords: ["windfury", "overload"],
    class: "Shaman",
    overload: { amount: 2 },
    collectible: true,
    set: "core"
  },
  {
    id: 35008,
    name: "Ragnarok's Wrath",
    manaCost: 3,
    type: "spell",
    rarity: "rare",
    description: "Deal 4-5 damage to all minions. Overload: (5)",
    flavorText: "The elements themselves rebel. Fire, frost, and lightning become one devastation.",
    keywords: ["overload"],
    class: "Shaman",
    spellEffect: {
      type: "damage",
      value: 5,
      minValue: 4,
      isRandom: true,
      requiresTarget: false,
      targetType: "all_minions"
    },
    overload: { amount: 5 },
    collectible: true,
    set: "core"
  },
  {
    id: 35009,
    name: "Thor's Surge",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage to a minion. Overload: (1)",
    flavorText: "A small thunderbolt. Thor considers it a warning shot.",
    keywords: ["overload"],
    class: "Shaman",
    overload: { amount: 1 },
    spellEffect: {
      type: "damage",
      value: 3,
      requiresTarget: true,
      targetType: "any_minion"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 35010,
    name: "Storm Elemental",
    manaCost: 4,
    type: "minion",
    rarity: "rare",
    race: "Elemental",
    attack: 4,
    health: 4,
    description: "Battlecry: Deal 1 damage to all enemy minions. Overload: (1)",
    flavorText: "Born from the clash of warm and cold air. It lives only to strike.",
    keywords: ["overload", "battlecry"],
    class: "Shaman",
    overload: { amount: 1 },
    battlecry: {
      type: "damage",
      value: 1,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 35011,
    name: "Tidal Surge",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Restore 4 Health to all friendly characters. Overload: (1)",
    flavorText: "The sea heals what fire has burned. Njord's gift to the wounded.",
    keywords: ["overload"],
    class: "Shaman",
    overload: { amount: 1 },
    spellEffect: {
      type: "heal",
      value: 4,
      requiresTarget: false,
      targetType: "all_friendly"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 35012,
    name: "Chain of Mjolnir",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage to a minion and adjacent ones. Overload: (1)",
    flavorText: "Thor's hammer strikes once. The lightning that follows strikes everything nearby.",
    keywords: ["overload"],
    class: "Shaman",
    overload: { amount: 1 },
    spellEffect: {
      type: "damage_adjacent",
      value: 2,
      requiresTarget: true,
      targetType: "any_minion"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 35013,
    name: "Stone Guardian",
    manaCost: 5,
    type: "minion",
    rarity: "epic",
    race: "Elemental",
    attack: 3,
    health: 6,
    description: "Taunt. Battlecry: Deal 1 damage to all minions. Overload: (1)",
    flavorText: "A sentinel carved from the living rock of Jotunheim. It does not sleep.",
    keywords: ["overload", "taunt", "battlecry"],
    class: "Shaman",
    overload: { amount: 1 },
    battlecry: {
      type: "damage",
      value: 1,
      targetType: "all_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 35015,
    name: "Thunder Titan",
    manaCost: 4,
    type: "minion",
    rarity: "rare",
    race: "Elemental",
    attack: 3,
    health: 5,
    description: "After you play a card with Overload, summon two 1/1 Rune Sparks with Rush.",
    flavorText: "Where it walks, storms follow. Where it rests, nothing grows.",
    class: "Shaman",
    collectible: true,
    set: "core",
    onPlayCardEffect: {
      type: "summon",
      value: 2,
      summonCardId: 35016,
      triggerCondition: "play_overload_card"
    }
  },
  {
    id: 35016,
    name: "Rune Spark",
    manaCost: 1,
    type: "minion",
    rarity: "common",
    attack: 1,
    health: 1,
    description: "Rush",
    flavorText: "A tiny fragment of Thor's power. Handle with extreme caution.",
    keywords: ["rush"],
    class: "Shaman",
    collectible: false,
    set: "core"
  },
  {
    id: 35017,
    name: "Spirit Summons",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Summon a random minion from each player's hand. Overload: (2)",
    flavorText: "The spirit realm answers when called. It does not always send what you expect.",
    keywords: ["overload"],
    class: "Shaman",
    overload: { amount: 2 },
    spellEffect: {
      type: "summon_from_hand",
      value: 1,
      requiresTarget: false,
      targetType: "both_players_hand"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 35018,
    name: "Storm Weaver",
    manaCost: 6,
    type: "spell",
    rarity: 'rare',
    description: "Transform your minions into random Mythic minions. Overload: (3)",
    flavorText: "She weaves lightning into flesh and flesh into legend.",
    keywords: ["overload"],
    class: "Shaman",
    overload: { amount: 3 },
    spellEffect: {
      type: "transform_all",
      requiresTarget: false,
      targetType: "friendly_minions",
      transformType: "random_mythic_minion"
    },
    collectible: true,
    set: "core"
  },
  // === Echo Card ===
  {
    id: 47249,
    name: "Valkyrie's Apprentice",
    manaCost: 1,
    attack: 0,
    health: 1,
    type: "minion",
    rarity: "common",
    description: "Taunt. Echo. Battlecry: Add a random Shaman spell to your hand.",
    flavorText: "The Valkyrie's cry echoes across the battlefield, and new warriors answer the call.",
    keywords: ["taunt", "echo", "battlecry"],
    class: "Shaman",
    battlecry: {
      type: "discover",
      requiresTarget: false,
      targetType: "none",
      discoveryType: "spell",
      discoveryCount: 1
    },
    collectible: true,
    set: "core"
  },
  // === Spellburst Card ===
  {
    id: 18002,
    name: "Rune Scholar",
    manaCost: 2,
    attack: 2,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Spellburst: Return the spell to your hand.",
    flavorText: "He reads the runes carved into Yggdrasil's bark. Each one teaches a different truth.",
    keywords: ["spellburst"],
    class: "Shaman",
    spellburstEffect: {
      type: "draw",
      targetType: "spell",
      consumed: false
    },
    collectible: true,
    set: "core"
  },
  // === Migrated from additionalClassMinions.ts ===
  {
    id: 40015,
    name: "Primordial Fury",
    manaCost: 3,
    attack: 2,
    health: 4,
    type: "minion",
    rarity: "common",
    race: "Elemental",
    description: "Whenever you play a card with Overload, gain +1/+1.",
    flavorText: "The storm's fury made manifest.",
    class: "Shaman",
    minionEffect: {
      type: "buff_on_overload",
      buffAttack: 1,
      buffHealth: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 40016,
    name: "Overload Unleasher",
    manaCost: 3,
    attack: 2,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Gain +1/+1 for each Overloaded Mana Crystal.",
    flavorText: "The chains that bind become the fist that strikes.",
    class: "Shaman",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff_from_overload",
      buffAttack: 1,
      buffHealth: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 40017,
    name: "Stormforged Axe",
    manaCost: 2,
    attack: 2,
    durability: 3,
    type: "weapon",
    rarity: "common",
    description: "Overload: (1)",
    flavorText: "Forged in the heart of a thunderstorm, it crackles with borrowed power.",
    class: "Shaman",
    keywords: ["overload"],
    overload: { amount: 1 },
    collectible: true,
    set: "core"
  },
  // === Yggdrasil Golem Cards ===
  {
    id: 85201,
    name: "Emerald Strike",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Deal 4 damage. Summon a Yggdrasil Golem.",
    flavorText: "Lightning infused with the World Tree's mystical power.",
    keywords: ["yggdrasil_golem"],
    class: "Shaman",
    spellEffect: {
      type: "damage_and_summon_yggdrasil_golem",
      value: 4,
      targetType: "any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 85203,
    name: "Emerald Talons",
    manaCost: 2,
    attack: 2,
    durability: 2,
    type: "weapon",
    rarity: "rare",
    description: "Battlecry: Summon an Emerald Golem. Overload: (1)",
    flavorText: "Talons shaped from the bark of the World Tree.",
    keywords: ["battlecry", "overload", "yggdrasil_golem"],
    class: "Shaman",
    overload: { amount: 1 },
    battlecry: {
      type: "summon_yggdrasil_golem"
    },
    collectible: true,
    set: "core"
  },
  // === New Elemental Spells ===
  {
    id: 85210,
    name: "Thunderstrike",
    manaCost: 4,
    type: "spell",
    rarity: "common",
    description: "Deal 4 damage to an enemy minion. If it survives, deal 2 damage to your hero.",
    flavorText: "A bolt from the sky, reckless and fierce.",
    keywords: [],
    class: "Shaman",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "enemy_minion",
      requiresTarget: true,
      selfDamageOnSurvive: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 85211,
    name: "Tide's Grace",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Restore 4 Health to a friendly minion. Overload: (1). Restore 6 Health instead.",
    flavorText: "The ocean's embrace heals all wounds.",
    keywords: ["overload"],
    class: "Shaman",
    spellEffect: {
      type: "heal",
      value: 4,
      bonusValue: 6,
      targetType: "friendly_minion",
      requiresTarget: true,
      bonusCondition: "overloaded_last_turn"
    },
    overload: {
      amount: 1
    },
    collectible: true,
    set: "core"
  },

  /**
   * Overload Cards
   * Migrated from client/src/game/data/overloadCards.ts on 2026-02-02
   * Contains Shaman Overload mechanic cards
   */
  // === Evolve, Totem & Overload Expansion ===
  {
    id: 38201,
    name: "Mjölnir's Bolt",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Deal 3 damage. Overload: (1)",
    flavorText: "The hammer falls. The world shakes.",
    keywords: ["overload"],
    class: "Shaman",
    overload: { amount: 1 },
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38202,
    name: "Ancestral Totem",
    manaCost: 2,
    attack: 0,
    health: 4,
    type: "minion",
    rarity: "common",
    description: "At the end of your turn, give a random friendly minion +1/+1.",
    flavorText: "The spirits of fallen shamans linger in the totem, lending their strength to the living.",
    race: "Spirit",
    class: "Shaman",
    effects: [{
      type: "end_of_turn",
      endOfTurnEffect: "buff_random_friendly",
      value: 1
    }],
    collectible: true,
    set: "core"
  },
  {
    id: 38203,
    name: "Totemic Surge",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Summon two 1/1 Spirit Totems.",
    flavorText: "The spirits answer in pairs. They are stronger together.",
    class: "Shaman",
    spellEffect: {
      type: "summon_token",
      value: 2,
      summonName: "Spirit Totem",
      summonAttack: 1,
      summonHealth: 1,
      summonRace: "Spirit",
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38204,
    name: "Primal Fury",
    manaCost: 5,
    type: "spell",
    rarity: "common",
    description: "Give your minions +3 Attack this turn.",
    flavorText: "The old magic, raw and untamed. It burns through every vein.",
    class: "Shaman",
    spellEffect: {
      type: "buff_attack",
      value: 3,
      targetType: "all_friendly_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38205,
    name: "Runic Evolution",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Transform a friendly minion into a random one that costs (2) more.",
    flavorText: "The runes reshape flesh and bone. What emerges is greater than what entered.",
    class: "Shaman",
    spellEffect: {
      type: "evolve",
      value: 2,
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38206,
    name: "Gaia's Earthquake",
    manaCost: 4,
    type: "spell",
    rarity: "rare",
    description: "Silence and destroy all enemy minions with 2 or less Attack. Overload: (2)",
    flavorText: "The earth mother's patience has limits. You have found them.",
    keywords: ["overload"],
    class: "Shaman",
    overload: { amount: 2 },
    spellEffect: {
      type: "mass_destroy",
      condition: "attack_2_or_less",
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38207,
    name: "Spirit of the Tides",
    manaCost: 3,
    attack: 2,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Your Overload cards cost (1) less. Overload payoff: After you play an Overloaded card, draw a card.",
    flavorText: "It rides the current between worlds, easing the burden of those who channel too deeply.",
    race: "Spirit",
    class: "Shaman",
    aura: {
      type: "overload_cost_reduction",
      value: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38208,
    name: "Echo of the Tidal Titan",
    manaCost: 8,
    attack: 6,
    health: 8,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Transform all enemy minions into 1/1 Frogs.",
    flavorText: "Aegir's echo transforms the battlefield. What once was fearsome becomes... amphibious.",
    race: "Elemental",
    class: "Shaman",
    keywords: ["battlecry"],
    battlecry: {
      type: "mass_transform",
      transformTo: "frog",
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
];
