import { CardData } from '../../../../../types';

export const berserkerCards: CardData[] = [
  {
    id: 9101,
    name: "Chaos Strike",
    manaCost: 2,
    description: "Give your hero +2 Attack this turn. Draw a card.",
    flavorText: "First lesson of Berserker training: Hit face.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "hero_attack_buff",
      value: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9102,
    name: "Soul Cleave",
    manaCost: 3,
    description: "Deal 2 damage to two random enemy minions. Restore 2 Health to your hero.",
    flavorText: "It's like a hot knife through butter, except the knife is runic.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "multi_target_damage_heal",
      value: 2,
      targetType: "random_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9103,
    name: "Blur",
    manaCost: 1,
    description: "Your hero can't take damage this turn.",
    flavorText: "The first rule of Berserker fight club is: you can't hit what you can't see.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "grant_immunity",
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9104,
    name: "Rune Burn",
    manaCost: 1,
    description: "Your opponent has 2 fewer Mana Crystals next turn.",
    flavorText: "The best defense is a good offense.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "reduce_opponent_mana",
      value: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9105,
    name: "Skull of Mímir",
    manaCost: 6,
    description: "Draw 3 cards. Outcast: Reduce their Cost by (3).",
    flavorText: "After the Vanir severed Mímir's head, Odin preserved it with herbs and seiðr. It still whispers secrets to those who dare listen. (Ynglinga Saga 4)",
    type: "spell",
    rarity: 'rare',
    class: "Berserker",
    keywords: ["outcast"],
    spellEffect: {
      type: "draw",
      value: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9111,
    name: "Ulfhednar Adept",
    manaCost: 5,
    attack: 6,
    health: 4,
    description: "Battlecry: If your hero attacked this turn, deal 4 damage.",
    flavorText: "She bound her glaives so she would stop losing them around the house.",
    type: "minion",
    rarity: "rare",
    class: "Berserker",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage",
      value: 4,
      targetType: "any",
      requiresTarget: true,
      condition: "hero_attacked_this_turn"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9112,
    name: "Titan-Branded Outcast",
    manaCost: 4,
    attack: 4,
    health: 3,
    description: "After you play the left- or right-most card in your hand, deal 1 damage to all enemies.",
    flavorText: "Cast out by the gods, his fire still burns against all who oppose him.",
    type: "minion",
    rarity: 'rare',
    class: "Berserker",
    keywords: ["outcast"],
    collectible: true,
    set: "core"
  },
  {
    id: 9113,
    name: "Berserkergang",
    manaCost: 5,
    description: "Swap your Hero Power to \"Deal 4 damage.\" After 2 uses, swap back.",
    flavorText: "It's just a phase.",
    type: "spell",
    rarity: 'rare',
    class: "Berserker",
    spellEffect: {
      type: "swap_hero_power"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9116,
    name: "Coordinated Strike",
    manaCost: 3,
    description: "Summon three 1/1 Ulfhednar with Rush.",
    flavorText: "The Ulfhednar coordinate all their attacks because otherwise they look very silly.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "summon",
      value: 3,
      summonCardId: 9117
    },
    collectible: true,
    set: "core"
  },
  {
    id: 48001,
    name: "Fenrir's Gaze",
    manaCost: 3,
    description: "Lifesteal. Deal 3 damage to a minion. Outcast: This costs (1).",
    flavorText: "The great wolf's eyes pierce through the darkness of Ragnarok.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    keywords: ["outcast", "lifesteal"],
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
    id: 48002,
    name: "Odin's Vision",
    manaCost: 2,
    description: "Draw a card. Outcast: Draw another.",
    flavorText: "He sacrificed his eye for wisdom - but gained sight beyond mortal ken.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    keywords: ["outcast"],
    spellEffect: {
      type: "draw",
      value: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 10008,
    name: "Flamereaper",
    manaCost: 7,
    attack: 3,
    durability: 2,
    description: "Also attacks the minions next to whomever your hero attacks.",
    flavorText: "A whirlwind of burning fury. Stand clear.",
    type: "weapon",
    rarity: "rare",
    class: "Berserker",
    collectible: true,
    set: "core"
  },
  {
    id: 10009,
    name: "Bound Titan-Spawn",
    manaCost: 5,
    attack: 10,
    health: 6,
    description: "Dormant for 2 turns. When this awakens, deal 10 damage randomly split among all enemies.",
    flavorText: "Chained by the Olympians, the spawn of the Titans awaits its moment of vengeance.",
    type: "minion",
    rarity: "common",
    class: "Berserker",
    race: "Titan",
    keywords: ["dormant"],
    collectible: true,
    set: "core"
  },
  {
    id: 9114,
    name: "Berserker Blast",
    manaCost: 1,
    description: "Deal 4 damage.",
    flavorText: "After 2 uses, swap back.",
    type: "spell",
    rarity: 'epic',
    class: "Berserker",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "any",
      requiresTarget: true
    },
    collectible: false,
    set: "core"
  },
  {
    id: 9117,
    name: "Ulfhednar Initiate",
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "Rush",
    flavorText: "They're very eager to prove themselves.",
    type: "minion",
    rarity: "common",
    class: "Berserker",
    keywords: ["rush"],
    collectible: false,
    set: "core"
  },
  {
    id: 20013,
    name: "Surtr, Ragnarök Form",
    manaCost: 8,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "epic",
    description: "Battlecry: Transform into Berserker Form, gaining +5 Attack and Lifesteal this turn.",
    flavorText: "At the end of all things, Surtr raises his flaming sword and the Nine Realms burn. What he becomes in that moment has no name. (Völuspá 52)",
    keywords: ["battlecry"],
    class: "Berserker",
    collectible: true,
    set: "core",
    battlecry: {
      type: "buff",
      requiresTarget: false,
      targetType: "none",
      buffAttack: 5,
      buffHealth: 0
    }
  },
  // === Dormant Card ===
  {
    id: 10005,
    name: "Bound Forge-Imp",
    manaCost: 1,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "common",
    race: "Titan",
    description: "Dormant for 2 turns. When this awakens, equip a 3/2 Flamereaper.",
    flavorText: "Shackled in the forges of Hephaestus, it yearns to craft once more.",
    keywords: ["dormant"],
    class: "Berserker",
    collectible: true,
    set: "core",
    dormantTurns: 2,
    awakenEffect: {
      type: "equip_weapon",
      value: 3,
      durability: 2
    }
  },
  // === Migrated from additionalClassMinions.ts ===
  {
    id: 40019,
    name: "Battlefiend",
    manaCost: 1,
    attack: 1,
    health: 2,
    type: "minion",
    rarity: "common",
    race: "Titan",
    description: "After your hero attacks, gain +1 Attack.",
    flavorText: "Born for battle, it grows stronger with each strike.",
    class: "Berserker",
    minionEffect: {
      type: "buff_on_hero_attack",
      buffAttack: 1
    },
    collectible: true,
    set: "core"
  },
  // === Migrated Outcast Cards ===
  {
    id: 48005,
    name: "Einherjar Berserker",
    manaCost: 4,
    attack: 5,
    health: 3,
    type: "minion",
    rarity: "rare",
    description: "Rush. Outcast: Gain +2/+2.",
    flavorText: "Chosen warriors from Valhalla, eternally hungry for battle.",
    class: "Berserker",
    keywords: ["rush", "outcast"],
    collectible: true,
    set: "core"
  },
  {
    id: 48006,
    name: "Priestess of Nemesis",
    manaCost: 7,
    attack: 6,
    health: 7,
    type: "minion",
    rarity: "common",
    description: "At the end of your turn, deal 6 damage randomly split among all enemies.",
    flavorText: "She serves the goddess of divine retribution with unyielding fury.",
    class: "Berserker",
    collectible: true,
    set: "core"
  },
  {
    id: 8501,
    name: "Jötunn Thornback",
    manaCost: 5,
    attack: 2,
    health: 6,
    type: "minion",
    rarity: "common",
    description: "Taunt. Whenever this minion takes damage, deal 1 damage to all enemies.",
    flavorText: "Touch his spines at your own peril - the frost giant feels no pain.",
    class: "Berserker",
    keywords: ["taunt"],
    collectible: true,
    set: "core"
  },
  // === Berserker Expansion — filling class gaps ===
  {
    id: 31501,
    name: "Ulfhednar Hatchet",
    manaCost: 1,
    attack: 2,
    durability: 2,
    description: "After your hero attacks, gain +1 Attack.",
    flavorText: "Small but vicious — the first weapon of every berserker initiate.",
    type: "weapon",
    rarity: "common",
    class: "Berserker",
    collectible: true,
    set: "core"
  },
  {
    id: 31502,
    name: "Berserker's Reckoning",
    manaCost: 3,
    description: "Destroy an enemy minion with 4 or less Attack.",
    flavorText: "The berserker does not negotiate. The berserker recalibrates.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "destroy",
      value: 4,
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31503,
    name: "Frenzied Cleave",
    manaCost: 4,
    description: "Deal 3 damage to all enemy minions.",
    flavorText: "When the red mist descends, everything in reach falls.",
    type: "spell",
    rarity: "rare",
    class: "Berserker",
    spellEffect: {
      type: "aoe_damage",
      value: 3,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31504,
    name: "Blood-Drunk Fury",
    manaCost: 2,
    description: "Draw 2 cards. Take 2 damage.",
    flavorText: "Pain is just the price of knowledge in Valhalla.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "damage_and_heal",
      value: 2,
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31505,
    name: "Fenrir's Fang",
    manaCost: 2,
    attack: 3,
    durability: 2,
    description: "Outcast: Give your hero +2 Attack this turn.",
    flavorText: "A tooth pulled from the great wolf's maw. He didn't notice.",
    type: "weapon",
    rarity: "common",
    class: "Berserker",
    keywords: ["outcast"],
    collectible: true,
    set: "core"
  },
  {
    id: 31506,
    name: "Ulfhednar Veteran",
    manaCost: 2,
    attack: 3,
    health: 2,
    description: "Outcast: Gain +1/+1 and Rush.",
    flavorText: "Decades of war have sharpened both blade and instinct.",
    type: "minion",
    rarity: "common",
    class: "Berserker",
    keywords: ["outcast"],
    collectible: true,
    set: "core"
  },
  {
    id: 31507,
    name: "Rage of the Fallen",
    manaCost: 6,
    description: "Give your hero +4 Attack this turn. Draw a card for each enemy minion.",
    flavorText: "Every foe in sight only feeds the rage.",
    type: "spell",
    rarity: "rare",
    class: "Berserker",
    spellEffect: {
      type: "hero_attack_buff",
      value: 4
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31508,
    name: "Valhalla Berserker",
    manaCost: 3,
    attack: 4,
    health: 3,
    description: "Rush. After this attacks and kills a minion, gain +2 Attack.",
    flavorText: "Death is not the end — it is the beginning of true fury.",
    type: "minion",
    rarity: "common",
    class: "Berserker",
    keywords: ["rush"],
    collectible: true,
    set: "core"
  },
  {
    id: 31509,
    name: "Tyr's Warmonger",
    manaCost: 6,
    attack: 5,
    health: 7,
    description: "Taunt. Battlecry: Gain Armor equal to your hero's Attack.",
    flavorText: "He fights with one hand and shields with the other — Tyr's legacy.",
    type: "minion",
    rarity: "epic",
    class: "Berserker",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "gain_armor_equal_to_attack",
      targetType: "none",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31510,
    name: "Shadow-Chaser of Hati",
    manaCost: 4,
    attack: 4,
    health: 4,
    description: "Rush. Overkill: Draw a card.",
    flavorText: "The wolf who chases the moon never tires, never stops.",
    type: "minion",
    rarity: "rare",
    class: "Berserker",
    keywords: ["rush", "overkill"],
    collectible: true,
    set: "core"
  },
  {
    id: 31511,
    name: "Ragnarok Unleashed",
    manaCost: 8,
    description: "Deal 5 damage to all characters. Give your hero +5 Attack this turn.",
    flavorText: "When all hope is lost, the berserker becomes the storm itself.",
    type: "spell",
    rarity: "mythic",
    class: "Berserker",
    spellEffect: {
      type: "aoe_damage",
      value: 5,
      targetType: "all_characters"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31512,
    name: "Silent Blade of Vidar",
    manaCost: 7,
    attack: 7,
    health: 5,
    description: "Battlecry: Destroy an enemy minion. Gain its Attack as Armor.",
    flavorText: "At Ragnarok, Vidar avenged his father Odin in silence. Words are wasted on the dead.",
    type: "minion",
    rarity: "epic",
    class: "Berserker",
    keywords: ["battlecry"],
    battlecry: {
      type: "destroy_and_steal",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },

  // ═══════════════════════════════════════════════════════════════
  // BERSERKER EXPANSION (10 new cards — mana 8+ finishers, curve fill)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 36201,
    name: "Ragnarok's Wrath",
    manaCost: 8,
    description: "Deal 5 damage to all minions. Give your hero +5 Attack this turn.",
    flavorText: "The world ends. Everything burns. From the ashes, something new may grow.",
    type: "spell",
    rarity: "rare",
    class: "Berserker",
    spellEffect: {
      type: "aoe_and_hero_buff",
      value: 5,
      targetType: "all_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36202,
    name: "Muspelheim Overlord",
    manaCost: 10,
    attack: 10,
    health: 10,
    description: "Rush. Mega-Windfury. Overkill: Deal the excess damage to the enemy hero.",
    flavorText: "He carries the sword that will set the World Tree ablaze. Not today — but soon.",
    type: "minion",
    rarity: 'epic',
    class: "Berserker",
    race: "Elemental",
    keywords: ["rush", "mega_windfury", "overkill"],
    collectible: true,
    set: "core"
  },
  {
    id: 36203,
    name: "Battle Fury",
    manaCost: 2,
    description: "Give a friendly minion +3 Attack. If it's damaged, give +5 instead.",
    flavorText: "Thought stops. Instinct takes over. The axe knows the way.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "conditional_buff",
      value: 3,
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36204,
    name: "Blood-Drunk Berserker",
    manaCost: 3,
    attack: 4,
    health: 3,
    description: "Frenzy: Gain +3 Attack and Immune until end of turn.",
    flavorText: "Beyond pain, beyond fear, beyond reason. Only the fury remains.",
    type: "minion",
    rarity: "common",
    class: "Berserker",
    keywords: ["frenzy"],
    collectible: true,
    set: "core"
  },
  {
    id: 36205,
    name: "Bifrost Cleaver",
    manaCost: 5,
    attack: 3,
    durability: 3,
    description: "After your hero attacks, deal 2 damage to all enemy minions.",
    flavorText: "It cuts through the rainbow bridge itself. No shield is harder.",
    type: "weapon",
    rarity: "rare",
    class: "Berserker",
    collectible: true,
    set: "core"
  },
  {
    id: 36206,
    name: "Fenrir's Howl",
    manaCost: 9,
    description: "Destroy all enemy minions. Deal 2 damage to your hero for each destroyed.",
    flavorText: "The chains snap. The wolf runs free. The gods tremble.",
    type: "spell",
    rarity: "mythic",
    class: "Berserker",
    spellEffect: {
      type: "destroy_all_self_damage",
      value: 2,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36207,
    name: "War-Scarred Veteran",
    manaCost: 4,
    attack: 3,
    health: 5,
    description: "Taunt. Has +2 Attack while your hero is damaged.",
    flavorText: "Every scar is a lesson. He has learned many.",
    type: "minion",
    rarity: "common",
    class: "Berserker",
    keywords: ["taunt"],
    collectible: true,
    set: "core"
  },
  {
    id: 36208,
    name: "Undying Rage",
    manaCost: 1,
    description: "Give a minion 'Can't be reduced below 1 Health this turn.' Draw a card.",
    flavorText: "The body should have fallen long ago. The rage won't allow it.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "immune_to_lethal_draw",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36209,
    name: "Jotunheim Destroyer",
    manaCost: 8,
    attack: 8,
    health: 6,
    description: "Rush. Battlecry: Deal damage equal to your hero's Attack to a minion.",
    flavorText: "Pain is currency. He has spent a fortune.",
    type: "minion",
    rarity: "rare",
    class: "Berserker",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "deal_hero_attack_damage",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36210,
    name: "Bloodlust Incarnate",
    manaCost: 6,
    attack: 5,
    health: 5,
    description: "Whenever this attacks and kills a minion, gain +2/+2 and attack again.",
    flavorText: "It kills and grows stronger. It grows stronger and kills again. The cycle has no end.",
    type: "minion",
    rarity: "rare",
    class: "Berserker",
    keywords: ["rush"],
    collectible: true,
    set: "core"
  },

  // === Lifesteal & Outcast Expansion ===
  {
    id: 38801,
    name: "Leech of Niflheim",
    manaCost: 3,
    attack: 3,
    health: 4,
    description: "Lifesteal. Outcast: Gain +2 Attack.",
    flavorText: "It feeds on the warmth of the living. In Niflheim, warmth is scarce.",
    type: "minion",
    rarity: "common",
    class: "Berserker",
    keywords: ["lifesteal", "outcast"],
    collectible: true,
    set: "core"
  },
  {
    id: 38802,
    name: "Blood Drinker",
    manaCost: 5,
    attack: 4,
    health: 6,
    description: "Lifesteal. Rush. After this attacks and kills a minion, gain +2/+2.",
    flavorText: "The blood sustains. The killing merely satisfies.",
    type: "minion",
    rarity: "rare",
    class: "Berserker",
    keywords: ["lifesteal", "rush"],
    collectible: true,
    set: "core"
  },
  {
    id: 38803,
    name: "Outcast's Reward",
    manaCost: 2,
    description: "Draw 2 cards. Outcast: They cost (1) less.",
    flavorText: "Exiled from the clan, the outcast draws strength from solitude.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    keywords: ["outcast"],
    spellEffect: {
      type: "draw",
      value: 2,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38804,
    name: "Soulrend Blade",
    manaCost: 4,
    attack: 4,
    durability: 2,
    description: "Lifesteal.",
    flavorText: "The blade drinks life with every cut. The wielder drinks it from the blade.",
    type: "weapon",
    rarity: "rare",
    class: "Berserker",
    keywords: ["lifesteal"],
    collectible: true,
    set: "core"
  },
  {
    id: 38805,
    name: "Muspel Lifedrinker",
    manaCost: 7,
    attack: 5,
    health: 7,
    description: "Lifesteal. Taunt. Outcast: Deal 5 damage to all enemy minions.",
    flavorText: "Born of fire, sustained by the living warmth of others.",
    type: "minion",
    rarity: 'epic',
    class: "Berserker",
    race: "Elemental",
    keywords: ["lifesteal", "taunt", "outcast"],
    collectible: true,
    set: "core"
  },
  // === Outcast Payoff Expansion ===
  {
    id: 38806,
    name: "Svartalf Exile",
    manaCost: 1,
    attack: 2,
    health: 1,
    description: "Outcast: Gain +1/+2 and Rush.",
    flavorText: "Cast out of Svartalfheim. The surface world will learn to fear what the dark elves discarded.",
    type: "minion",
    rarity: "common",
    class: "Berserker",
    keywords: ["outcast"],
    collectible: true,
    set: "core"
  },
  {
    id: 38807,
    name: "Ulfhednar Howl",
    manaCost: 2,
    description: "Deal 3 damage to a minion. Outcast: Also deal 2 damage to adjacent minions.",
    flavorText: "The wolf-warriors howl as one. The sound carries across three realms.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    keywords: ["outcast"],
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
    id: 38808,
    name: "Bolthorn, the Twice-Banished",
    manaCost: 5,
    attack: 5,
    health: 5,
    description: "Outcast: Return this to your hand after it attacks. It costs (1) less each time.",
    flavorText: "Grandfather of Odin, exiled by gods and giants alike. He always comes back.",
    type: "minion",
    rarity: 'rare',
    class: "Berserker",
    keywords: ["outcast"],
    collectible: true,
    set: "core"
  },
  // ==================== COMMON GAP-FILL (Starter Deck Viability) ====================
  {
    id: 39201,
    name: "Ulfhednar's Howl",
    manaCost: 1,
    description: "Deal 1 damage to all enemy minions. Draw a card.",
    flavorText: "The wolf-warriors howl before they strike. The howl is worse.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "damage_aoe_and_draw",
      value: 1,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39202,
    name: "Reckless Charge",
    manaCost: 1,
    description: "Give a friendly minion Rush and +2 Attack this turn.",
    flavorText: "Who needs a plan when you have axes?",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "buff_and_grant_keyword",
      value: 2,
      grantKeyword: "rush",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39203,
    name: "Blood Frenzy",
    manaCost: 2,
    description: "Draw 2 cards. Take 2 damage.",
    flavorText: "Pain is just weakness leaving the body. Along with blood.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "draw_and_self_damage",
      value: 2,
      selfDamage: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39204,
    name: "Fury Slash",
    manaCost: 3,
    description: "Deal 4 damage to a minion. If it dies, gain +1 Attack this turn.",
    flavorText: "One swing to end it. Two swings to enjoy it.",
    type: "spell",
    rarity: "common",
    class: "Berserker",
    spellEffect: {
      type: "damage_and_conditional_buff",
      value: 4,
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39205,
    name: "Fenrir's Bite",
    manaCost: 2,
    attack: 2,
    durability: 2,
    description: "After your hero attacks, deal 1 damage to adjacent minions.",
    flavorText: "The great wolf's jaws close on everything nearby.",
    type: "weapon",
    rarity: "common",
    class: "Berserker",
    collectible: true,
    set: "core"
  }
];
