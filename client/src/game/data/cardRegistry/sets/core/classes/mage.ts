import { CardData } from '../../../../../types';

export const mageCards: CardData[] = [
  {
    id: 14001,
    name: "Ymir's Mana Wyrm",
    manaCost: 1,
    attack: 1,
    health: 3,
    description: "Whenever you cast a spell, gain +1 Attack.",
    flavorText: "The frost giant's magical serpent feeds on arcane energy.",
    type: "minion",
    rarity: "common",
    class: "Mage",
    keywords: ["spell_trigger"],
    collectible: true,
    set: "core"
  },
  {
    id: 14002,
    name: "Runescribe Initiate",
    manaCost: 2,
    attack: 3,
    health: 2,
    description: "Your spells cost (1) less.",
    flavorText: "A student of Norse rune magic, channeling ancient power.",
    type: "minion",
    rarity: "common",
    class: "Mage",
    aura: {
      type: "spell_cost_reduction",
      value: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 14003,
    name: "Bifrost Arcanist",
    manaCost: 3,
    attack: 4,
    health: 3,
    description: "Battlecry: The next Rune you play this turn costs (0).",
    flavorText: "A sorcerer who draws power from the rainbow bridge between realms.",
    type: "minion",
    rarity: "common",
    class: "Mage",
    keywords: ["battlecry"],
    collectible: true,
    set: "core"
  },
  {
    id: 14004,
    name: "Æther Weaver",
    manaCost: 4,
    attack: 3,
    health: 3,
    description: "If you control a Rune at the end of your turn, gain +2/+2.",
    flavorText: "She spins raw magic into wards and watches. The runes do the rest.",
    type: "minion",
    rarity: "common",
    class: "Mage",
    collectible: true,
    set: "core"
  },
  {
    id: 14005,
    name: "Flame-Bearer of Surtr",
    manaCost: 7,
    attack: 5,
    health: 7,
    description: "Whenever you cast a spell, add a 'Muspel Flame' spell to your hand.",
    flavorText: "Surtr's flame-bearers carry embers from his sword — each one hot enough to ignite a realm. (Völuspá 52)",
    type: "minion",
    rarity: "mythic",
    class: "Mage",
    keywords: ["spell_trigger"],
    collectible: true,
    set: "core"
  },
  {
    id: 14006,
    name: "Frostweaver Spirit",
    manaCost: 4,
    attack: 3,
    health: 6,
    description: "Freeze any character damaged by this minion.",
    flavorText: "Born from the icy mists of Niflheim, it weaves frost into every strike.",
    type: "minion",
    rarity: "common",
    class: "Mage",
    race: "Elemental",
    keywords: ["freeze_on_damage"],
    collectible: true,
    set: "core"
  },
  {
    id: 14009,
    name: "Loki's Shapecraft",
    manaCost: 4,
    description: "Transform a minion into a 1/1 Sheep.",
    flavorText: "Loki became a mare, a salmon, a fly, and an old woman. Turning you into a sheep is barely an inconvenience. (Gylfaginning 33-51)",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "transform",
      targetType: "any_minion",
      requiresTarget: true,
      summonCardId: 14010
    },
    collectible: true,
    set: "core"
  },
  {
    id: 14010,
    name: "Sheep",
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "Transformed by Mage polymorph.",
    flavorText: "Baaaaaaa.",
    type: "minion",
    rarity: "common",
    class: "Neutral",
    race: "Beast",
    collectible: false,
    set: "core"
  },
  {
    id: 14012,
    name: "Vaporize",
    manaCost: 3,
    description: "Rune: When a minion attacks your hero, destroy it.",
    flavorText: "Surtr's fire recognizes no armor, no shield, no plea for mercy.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    keywords: ["secret"],
    collectible: true,
    set: "core"
  },
  {
    id: 14013,
    name: "Ice Lance",
    manaCost: 1,
    description: "Freeze a character. If it was already Frozen, deal 4 damage instead.",
    flavorText: "The first touch freezes. The second shatters.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    keywords: ["freeze"],
    spellEffect: {
      type: "conditional_freeze_or_damage",
      value: 4,
      targetType: "any",
      requiresTarget: true,
      condition: "is_frozen"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32001,
    name: "Rune Burst",
    manaCost: 1,
    description: "Deal 2 damage to a minion. This spell gets +2 damage from Spell Damage.",
    flavorText: "Ancient runes shatter with explosive force.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "any_minion",
      requiresTarget: true,
      spellDamageMultiplier: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32002,
    name: "Runic Barrage",
    manaCost: 1,
    description: "Deal 3 damage randomly split among all enemy characters.",
    flavorText: "Fragments of celestial fire rain down from the heavens.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "random_enemies",
      requiresTarget: false,
      isSplit: true,
      isRandom: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32003,
    name: "Surtr's Wrath",
    manaCost: 4,
    description: "Deal 6 damage.",
    flavorText: "Fire from Muspelheim, the realm of flames.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 6,
      targetType: "any_character",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32004,
    name: "Jötunheim Freeze",
    manaCost: 3,
    description: "Freeze all enemy minions.",
    flavorText: "The cold of Jotunheim stops time itself.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "freeze",
      value: 0,
      targetType: "all_enemy_minions",
      requiresTarget: false
    },
    keywords: ["freeze"],
    collectible: true,
    set: "core"
  },
  {
    id: 32005,
    name: "Skadi's Arrow",
    manaCost: 2,
    description: "Deal 3 damage to a character and Freeze it.",
    flavorText: "A frozen lance from the realm of ice and mist.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "any_character",
      requiresTarget: true,
      freezeTarget: true
    },
    keywords: ["freeze"],
    collectible: true,
    set: "core"
  },
  {
    id: 32006,
    name: "Athena's Wisdom",
    manaCost: 3,
    description: "Draw 2 cards.",
    flavorText: "Wisdom flows from the well of knowledge.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "draw",
      value: 2,
      targetType: "none",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32008,
    name: "Gemini Illusion",
    manaCost: 1,
    description: "Summon two 0/2 minions with Taunt.",
    flavorText: "Spectral shieldmaidens answer the call to battle.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "summon",
      summonCardId: 32031,
      count: 2,
      targetType: "none",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32009,
    name: "Niflheim's Embrace",
    manaCost: 6,
    description: "Deal 2 damage to all enemy minions and Freeze them.",
    flavorText: "When Niflheim breathes, the world holds still.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "aoe_damage",
      value: 2,
      targetType: "all_enemy_minions",
      requiresTarget: false,
      freezeTarget: true
    },
    keywords: ["freeze"],
    collectible: true,
    set: "core"
  },
  {
    id: 32010,
    name: "Muspelheim's Fury",
    manaCost: 7,
    description: "Deal 4 damage to all enemy minions.",
    flavorText: "The fire giant's passage leaves only ashes behind.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "aoe_damage",
      value: 4,
      targetType: "all_enemy_minions",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32011,
    name: "Thrymr's Breath",
    manaCost: 4,
    description: "Deal 1 damage to a minion and the minions next to it, and Freeze them.",
    flavorText: "Thrymr exhales, and everything before him becomes ice.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "cleave_damage",
      value: 1,
      targetType: "any_minion",
      requiresTarget: true,
      freezeTarget: true
    },
    keywords: ["freeze"],
    collectible: true,
    set: "core"
  },
  {
    id: 32012,
    name: "Runic Detonation",
    manaCost: 2,
    description: "Deal 1 damage to all enemy minions.",
    flavorText: "The runes pulse once, then shatter violently.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "aoe_damage",
      value: 1,
      targetType: "all_enemy_minions",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32013,
    name: "Helios Inferno",
    manaCost: 10,
    description: "Deal 10 damage.",
    flavorText: "The flames that will consume the world at the end of days.",
    type: "spell",
    rarity: "rare",
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 10,
      targetType: "any_character",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32015,
    name: "Dragon's Breath",
    manaCost: 5,
    description: "Deal 4 damage. Costs (1) less for each minion that died this turn.",
    flavorText: "The dragon falls. Its last breath incinerates what killed it.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "any_character",
      requiresTarget: true,
      costReductionPerDeadMinion: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 32019,
    name: "Ward of Gjallarhorn",
    manaCost: 3,
    description: "Rune: When your opponent casts a spell, Counter it.",
    flavorText: "Heimdall's horn sounds, negating all hostile magic.",
    type: "secret",
    rarity: "common",
    class: "Mage",
    keywords: ["secret"],
    collectible: true,
    set: "core"
  },
  {
    id: 32018,
    name: "Mirror Entity",
    manaCost: 3,
    description: "Rune: After your opponent plays a minion, summon a copy of it.",
    flavorText: "The rune watches. When the enemy acts, it answers in kind.",
    type: "secret",
    rarity: "common",
    class: "Mage",
    keywords: ["secret"],
    collectible: true,
    set: "core"
  },
  {
    id: 32031,
    name: "Gemini Illusion",
    manaCost: 0,
    attack: 0,
    health: 2,
    description: "Taunt",
    flavorText: "A spectral shieldmaiden stands ready.",
    type: "minion",
    rarity: "common",
    class: "Mage",
    keywords: ["taunt"],
    collectible: false,
    set: "core"
  },
  {
    id: 20015,
    name: "Helios, Sun Strider",
    manaCost: 7,
    attack: 4,
    health: 7,
    type: "minion",
    rarity: "mythic",
    description: "Every third spell you cast each turn costs (0).",
    flavorText: "Helios drives his golden chariot from east to west each day, seeing all that occurs beneath him. He told Demeter where Persephone was taken, and Hephaestus of Aphrodite's betrayal — the sun keeps no secrets. (Odyssey VIII, Homeric Hymn to Demeter)",
    keywords: [],
    class: "Mage",
    collectible: true,
    set: "core"
  },
  {
    id: 20117,
    name: "Chaos-Spawn of Typhon",
    manaCost: 8,
    attack: 8,
    health: 6,
    type: "minion",
    rarity: 'epic',
    description: "Deathrattle: Deal 8 damage to all minions.",
    flavorText: "Father of monsters, his death unleashes primordial chaos.",
    keywords: ["deathrattle"],
    race: "Elemental",
    class: "Mage",
    collectible: true,
    set: "core",
    deathrattle: {
      type: "damage",
      targetType: "all_minions",
      value: 8
    }
  },
  {
    id: 20405,
    name: "Ember Herald of Sinmara",
    manaCost: 6,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "mythic",
    description: "After you cast a spell, deal 2 damage to a random enemy.",
    flavorText: "Sinmara, wife of Surtr, keeps the flame-sword Lævateinn in a chest sealed by nine locks. Her heralds carry its embers. (Fjölsvinnsmál 26)",
    keywords: [],
    class: "Mage",
    collectible: true,
    set: "core"
  },
  {
    id: 20808,
    name: "Swift Herald of Hermes",
    manaCost: 8,
    attack: 7,
    health: 7,
    type: "minion",
    rarity: "mythic",
    description: "Deathrattle: Add 3 copies of Starfire Shards to your hand.",
    flavorText: "Hermes invented the lyre from a tortoise shell on the day he was born, then stole Apollo's cattle before nightfall. The gods made him their herald — better to have a thief working for you than against you. (Homeric Hymn to Hermes 17-67)",
    keywords: ["deathrattle"],
    class: "Mage",
    collectible: true,
    set: "core",
    deathrattle: {
      type: "add_card",
      targetType: "none",
      condition: "starfire_shards",
      value: 3
    }
  },
  {
    id: 20034,
    name: "Echo of the Light Weaver",
    manaCost: 7,
    attack: 4,
    health: 4,
    type: "minion",
    rarity: "epic",
    description: "Your cards that summon minions summon twice as many.",
    flavorText: "A fragment of divine light that refracts every blessing into two.",
    keywords: [],
    class: "Mage",
    collectible: true,
    set: "core"
  },
  {
    id: 20030,
    name: "Skadi, Frost Queen",
    manaCost: 9,
    type: "hero",
    rarity: "mythic",
    description: "Battlecry: Summon a 3/6 Water Elemental. Your Elementals have Lifesteal this game.",
    flavorText: "Skaði chose her husband by his feet alone — she picked the fairest pair, certain they belonged to Baldr, but found herself wed to Njörðr of the sea. She could not bear his gulls; he could not bear her wolves. They parted. (Gylfaginning 23)",
    keywords: ["battlecry", "lifesteal"],
    class: "Mage",
    armorGain: 5,
    collectible: true,
    set: "core",
    battlecry: {
      type: "summon",
      requiresTarget: false,
      targetType: "none",
      summonCardId: 20031
    }
  },
  {
    id: 20031,
    name: "Frost Wraith",
    manaCost: 4,
    attack: 3,
    health: 6,
    type: "minion",
    rarity: "common",
    description: "Freeze any character damaged by this minion.",
    flavorText: "A spectral being of pure cold, summoned by Skadi.",
    keywords: [],
    race: "Elemental",
    class: "Mage",
    collectible: false,
    set: "core"
  },
  // === Dormant Card ===
  {
    id: 10001,
    name: "Bound Watcher",
    manaCost: 3,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "common",
    race: "Titan",
    description: "Dormant for 2 turns. When this awakens, deal 2 damage to all enemy minions.",
    flavorText: "Argus Panoptes, the hundred-eyed giant, sealed by Hermes' lullaby.",
    keywords: ["dormant"],
    class: "Mage",
    collectible: true,
    set: "core",
    dormantTurns: 2,
    awakenEffect: {
      type: "damage",
      targetType: "all_enemy_minions",
      value: 2
    }
  },
  // === Discover Cards ===
  {
    id: 5011,
    name: "Primordial Glyph",
    manaCost: 2,
    type: "spell",
    rarity: "rare",
    description: "Foresee a spell. Reduce its cost by (2).",
    flavorText: "A glyph from the dawn of magic. It teaches what no living mage remembers.",
    keywords: ["discover"],
    class: "Mage",
    spellEffect: {
      type: "discover",
      requiresTarget: false,
      discoveryType: "spell",
      manaDiscount: 2,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 29003,
    name: "Arcanologist",
    manaCost: 2,
    attack: 2,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Battlecry: Draw a Rune from your deck.",
    flavorText: "She studies runes the way others study weather — always looking for the storm.",
    keywords: ["battlecry"],
    class: "Mage",
    battlecry: {
      type: "draw",
      value: 1,
      requiresTarget: false,
      targetType: "none",
      conditionalTarget: "secret"
    },
    collectible: true,
    set: "core"
  },
  // === Spellburst Card ===
  {
    id: 18004,
    name: "Firebrand",
    manaCost: 3,
    attack: 3,
    health: 4,
    type: "minion",
    rarity: "common",
    description: "Spellburst: Deal 4 damage randomly split among all enemy minions.",
    flavorText: "The spark ignites. The flames find their own targets.",
    keywords: ["spellburst"],
    class: "Mage",
    spellburstEffect: {
      type: "damage",
      value: 4,
      targetType: "enemy_minion",
      consumed: false
    },
    collectible: true,
    set: "core"
  },
  // === Quest Cards ===
  {
    id: 70001,
    name: "Chronos's Gateway",
    manaCost: 1,
    type: "spell",
    rarity: "epic",
    description: "Quest: Cast 8 spells that didn't start in your deck. Reward: Time Warp.",
    flavorText: "The god of time opens pathways through reality itself.",
    keywords: ["quest"],
    class: "Mage",
    questProgress: {
      goal: 8,
      current: 0,
      condition: "cast_spells_not_in_deck"
    },
    questReward: {
      cardId: 70011
    },
    collectible: true,
    set: "core"
  },
  {
    id: 70011,
    name: "Time Warp of Chronos",
    manaCost: 5,
    type: "spell",
    rarity: "mythic",
    description: "Take an extra turn.",
    flavorText: "Kronos swallowed each of his children whole, fearing the prophecy that one would overthrow him. When Zeus forced him to disgorge them, the Olympians burst forth fully grown and furious. Time devours — but time also returns. (Theogony 453-500)",
    keywords: [],
    class: "Mage",
    spellEffect: {
      type: "extra_turn"
    },
    collectible: false,
    set: "core"
  },
  // === Highlander Card ===
  {
    id: 80001,
    name: "Sibyl of Delphi",
    manaCost: 7,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: If your deck has no duplicates, the next spell you cast this turn costs (0).",
    flavorText: "The Greek oracle's prophecies favor those who walk a unique path.",
    keywords: ["battlecry"],
    class: "Mage",
    battlecry: {
      type: "reduce_next_spell_cost",
      condition: "no_duplicates",
      value: 0
    },
    collectible: true,
    set: "core"
  },
  // === New Elemental Spells ===
  {
    id: 80010,
    name: "Ember Shower",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage to a minion and 1 damage to all adjacent minions.",
    flavorText: "Sparks rain down, igniting the battlefield.",
    keywords: [],
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "minion",
      requiresTarget: true,
      adjacentDamage: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 80011,
    name: "Ember Storm",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Deal 3 damage to all enemy minions. Apply Burn to each.",
    flavorText: "A tempest of flame sweeps the battlefield.",
    keywords: [],
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "all_enemy_minions",
      requiresTarget: false,
      applyStatus: "burn"
    },
    collectible: true,
    set: "core"
  },
  // === Seidr & Spell Damage Expansion ===
  {
    id: 38001,
    name: "Runestorm",
    manaCost: 1,
    description: "Deal 3 damage randomly split among all enemies.",
    flavorText: "Bolts of runic energy scatter across the battlefield like hail from Niflheim.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "random_enemy",
      requiresTarget: false,
      isSplit: true,
      isRandom: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38002,
    name: "Wisdom of Mímir",
    manaCost: 3,
    description: "Draw 2 cards.",
    flavorText: "The severed head of Mímir whispers forbidden knowledge.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "draw",
      value: 2,
      targetType: "none",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38003,
    name: "Seidr Eruption",
    manaCost: 2,
    description: "Deal 1 damage to all enemy minions.",
    flavorText: "Runes carved into the earth detonate in a wave of seidr force.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "damage",
      value: 1,
      targetType: "all_enemy_minions",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38004,
    name: "Rune of Amplification",
    manaCost: 2,
    description: "Spell Damage +3 this turn only.",
    flavorText: "A volatile rune that amplifies all magic for a fleeting moment.",
    type: "spell",
    rarity: "common",
    class: "Mage",
    spellEffect: {
      type: "spell_damage_boost",
      value: 3,
      targetType: "none",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38005,
    name: "Rune Familiar",
    manaCost: 1,
    attack: 1,
    health: 2,
    description: "Spell Damage +1.",
    flavorText: "A tiny spirit drawn from the ley lines of Alfheim, attuned to runic magic.",
    type: "minion",
    rarity: "common",
    class: "Mage",
    race: "Elemental",
    keywords: ["spell_damage"],
    collectible: true,
    set: "core"
  },
  {
    id: 38006,
    name: "Seiðr Flamecaller",
    manaCost: 4,
    attack: 3,
    health: 5,
    description: "Spell Damage +2. After you cast a spell, deal 1 damage to all enemies.",
    flavorText: "She channels the old Norse magic through living flame.",
    type: "minion",
    rarity: "common",
    class: "Mage",
    keywords: ["spell_damage"],
    collectible: true,
    set: "core"
  },
  {
    id: 38007,
    name: "Astral Rift",
    manaCost: 5,
    description: "Deal 4 damage to all enemy minions. Draw a card for each killed.",
    flavorText: "The rift tears open, consuming the weak and revealing hidden truths.",
    type: "spell",
    rarity: "rare",
    class: "Mage",
    spellEffect: {
      type: "damage_and_draw",
      value: 4,
      targetType: "all_enemy_minions",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38008,
    name: "Chrono-Weaver",
    manaCost: 6,
    attack: 4,
    health: 6,
    description: "Battlecry: Add a random Mage spell to your hand. It costs (0) this turn.",
    flavorText: "She plucks spells from timelines that never were.",
    type: "minion",
    rarity: "epic",
    class: "Mage",
    keywords: ["battlecry"],
    battlecry: {
      type: "add_random_class_spell",
      targetClass: "Mage",
      costReduction: true,
      requiresTarget: false,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38009,
    name: "Odin's Seidr Mastery",
    manaCost: 8,
    description: "Deal 8 damage to an enemy. Draw 3 cards. Gain 3 Armor.",
    flavorText: "Odin hung himself from Yggdrasil for nine nights, pierced by his own spear, with neither food nor drink — and seized the runes screaming. That is the price of wisdom. (Hávamál 138-141)",
    type: "spell",
    rarity: "mythic",
    class: "Mage",
    spellEffect: {
      type: "damage_draw_armor",
      value: 8,
      drawValue: 3,
      armorValue: 3,
      targetType: "any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38010,
    name: "Sun-Archon of Hyperion",
    manaCost: 7,
    attack: 5,
    health: 5,
    description: "Spell Damage +3. Your spells cost (2) less.",
    flavorText: "Titan of the sun, his radiance fuels every incantation.",
    type: "minion",
    rarity: "epic",
    class: "Mage",
    race: "Titan",
    keywords: ["spell_damage"],
    aura: {
      type: "spell_cost_reduction",
      value: 2
    },
    collectible: true,
    set: "core"
  }
];
