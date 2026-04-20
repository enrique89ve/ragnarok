import { CardData } from '../../../../../types';

export const rogueCards: CardData[] = [
  {
    id: 12101,
    name: "Shadow of Loki",
    manaCost: 1,
    description: "Deal 2 damage to an undamaged minion.",
    flavorText: "Loki's shadow moves independently. It has its own agenda.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "undamaged_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12102,
    name: "Óðinn's Foresight",
    manaCost: 1,
    description: "The next spell you cast this turn costs (3) less.",
    flavorText: "The Allfather plans nine moves ahead. This is move one.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "cost_reduction",
      value: 3,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12103,
    name: "Hel's Path",
    manaCost: 1,
    description: "Return a friendly minion to your hand. It costs (2) less.",
    flavorText: "One step into shadow, one step out. The distance between is irrelevant.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "return_to_hand",
      targetType: "friendly_minion",
      requiresTarget: true,
      value: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12104,
    name: "Jörmungandr Venom",
    manaCost: 1,
    description: "Give your weapon +2 Attack.",
    flavorText: "The World Serpent's venom corrodes everything — including resolve.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "buff_weapon",
      value: 2,
      targetType: "player_weapon",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12105,
    name: "Shadow Strike",
    manaCost: 1,
    description: "Deal 3 damage to the enemy hero.",
    flavorText: "You never see the blade. You only see the blood.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "enemy_hero",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12106,
    name: "Mist of Niflheim",
    manaCost: 2,
    description: "Return an enemy minion to your opponent's hand.",
    flavorText: "The mist swallows them whole. When it clears, they are far from the battle.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "return_to_hand",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12107,
    name: "Serpent's Fang",
    manaCost: 2,
    description: "Deal 2 damage. Combo: Deal 4 damage instead.",
    flavorText: "The first strike tests the guard. The second finds the gap.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    keywords: ["combo"],
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12108,
    name: "Daggers of Víðarr",
    manaCost: 3,
    description: "Deal 1 damage to all enemy minions. Draw a card.",
    flavorText: "Vidar's blades cut silently. Silence is the whole point.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "aoe_damage",
      value: 1,
      targetType: "enemy_minions",
      drawCards: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12109,
    name: "Aegis Tempest",
    manaCost: 4,
    description: "Destroy your weapon and deal its damage to all enemy minions.",
    flavorText: "The weapon shatters. The shards become the storm.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "weapon_damage_aoe",
      targetType: "enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12110,
    name: "Hel's Execution",
    manaCost: 5,
    description: "Destroy an enemy minion.",
    flavorText: "Hel does not negotiate. She collects.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "destroy",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12201,
    name: "Loki's Shadow Ringleader",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Combo: Summon a 2/1 Shadow Thief.",
    flavorText: "The frost giants strike from the shadows of Jotunheim.",
    type: "minion",
    rarity: "common",
    class: "Rogue",
    keywords: ["combo"],
    collectible: true,
    set: "core"
  },
  {
    id: 12202,
    name: "Odin's Raven Scout",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Combo: Deal 2 damage.",
    flavorText: "Trained by Odin's ravens, Huginn and Muninn, to strike unseen.",
    type: "minion",
    rarity: "common",
    class: "Rogue",
    keywords: ["combo"],
    collectible: true,
    set: "core"
  },
  {
    id: 12203,
    name: "Loki's Disciple",
    manaCost: 4,
    attack: 4,
    health: 4,
    description: "Battlecry: Give a friendly minion Stealth until your next turn.",
    flavorText: "They work for Loki. Or they think they do. Loki works for no one.",
    type: "minion",
    rarity: "rare",
    class: "Rogue",
    keywords: ["battlecry"],
    battlecry: {
      type: "give_stealth",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12204,
    name: "Kidnapper",
    manaCost: 6,
    attack: 5,
    health: 3,
    description: "Combo: Return a minion to its owner's hand.",
    flavorText: "Vanished without a trace. The ransom note arrived before anyone noticed.",
    type: "minion",
    rarity: "rare",
    class: "Rogue",
    keywords: ["combo"],
    collectible: true,
    set: "core"
  },
  {
    id: 12404,
    name: "Erik the Shadow Lord",
    manaCost: 3,
    attack: 2,
    health: 2,
    description: "Combo: Gain +2/+2 for each card played earlier this turn.",
    flavorText: "Bound by chains of shadow, he grows stronger with each broken link.",
    type: "minion",
    rarity: 'rare',
    class: "Rogue",
    keywords: ["combo"],
    collectible: true,
    set: "core"
  },
  {
    id: 12303,
    name: "Assassin's Blade",
    manaCost: 5,
    attack: 3,
    durability: 4,
    description: "A lethal blade with a long reach.",
    flavorText: "No ornament, no inscription. Just an edge that never dulls.",
    type: "weapon",
    rarity: "common",
    class: "Rogue",
    collectible: true,
    set: "core"
  },
  {
    id: 12304,
    name: "Perdition's Blade",
    manaCost: 3,
    attack: 2,
    durability: 2,
    description: "Battlecry: Deal 1 damage. Combo: Deal 2 instead.",
    flavorText: "Named for where it sends its victims.",
    type: "weapon",
    rarity: "common",
    class: "Rogue",
    keywords: ["battlecry", "combo"],
    collectible: true,
    set: "core"
  },
  {
    id: 12301,
    name: "Wicked Knife",
    manaCost: 1,
    attack: 1,
    durability: 2,
    description: "The Rogue's trusty dagger.",
    flavorText: "Standard issue for Svartalfheim's finest.",
    type: "weapon",
    rarity: "common",
    class: "Rogue",
    collectible: false,
    set: "core"
  },
  {
    id: 12501,
    name: "Shadow Thief",
    manaCost: 1,
    attack: 2,
    health: 1,
    description: "A shadow servant of Loki's realm.",
    flavorText: "Swift and deadly, like the winter wind.",
    type: "minion",
    rarity: "common",
    class: "Rogue",
    collectible: false,
    set: "core"
  },
  {
    id: 20033,
    name: "Nyx, Shadow Stalker",
    manaCost: 9,
    type: "hero",
    rarity: "mythic",
    description: "Battlecry: Gain Stealth until your next turn. Passive Hero Power: During your turn, add a Shadow Reflection to your hand.",
    flavorText: "Primordial goddess of night, she walks unseen.",
    keywords: ["battlecry"],
    class: "Rogue",
    armor: 5,
    collectible: true,
    set: "core",
    battlecry: {
      type: "buff",
      requiresTarget: false,
      targetType: "none"
    }
  },
  {
    id: 20035,
    name: "Silk-Lord of Arachne",
    manaCost: 9,
    attack: 8,
    health: 4,
    type: "minion",
    rarity: 'epic',
    description: "Deathrattle: Return this to your hand and summon a 4/4 Draugr Spider.",
    flavorText: "The weaver transformed into a spider, she spins eternal schemes.",
    keywords: ["deathrattle"],
    class: "Rogue",
    collectible: true,
    set: "core",
    deathrattle: {
      type: "summon",
      summonCardId: 9070,
      targetType: "none"
    }
  },
  {
    id: 20708,
    name: "Eris, Mind Thief",
    manaCost: 4,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Replace spells in your hand with random spells (from your opponent's class).",
    flavorText: "Goddess of discord, she steals thoughts and schemes.",
    keywords: ["battlecry"],
    class: "Rogue",
    collectible: true,
    set: "core",
    battlecry: {
      type: "replace_spells",
      requiresTarget: false,
      targetType: "none",
      replaceWith: "opponent_class_spells"
    }
  },
  {
    id: 20807,
    name: "Proteus, Face Collector",
    manaCost: 3,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: 'epic',
    description: "Echo. Battlecry: Add a random Mythic minion to your hand.",
    flavorText: "The shape-shifting sea god collects faces like trophies.",
    keywords: ["echo", "battlecry"],
    class: "Rogue",
    collectible: true,
    set: "core",
    battlecry: {
      type: "add_card",
      requiresTarget: false,
      targetType: "none",
      condition: "random_mythic_minion",
      value: 1
    }
  },
  {
    id: 20213,
    name: "Medusa's Bane",
    manaCost: 4,
    attack: 3,
    health: 2,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry and Deathrattle: Add a random Toxin card to your hand.",
    flavorText: "Touched by the gorgon's venom, it carries deadly gifts.",
    keywords: ["battlecry", "deathrattle"],
    race: "Beast",
    class: "Rogue",
    collectible: true,
    set: "core",
    battlecry: {
      type: "give_cards",
      requiresTarget: false,
      targetType: "none",
      cardCount: 1,
      isRandom: true
    },
    deathrattle: {
      type: "draw",
      targetType: "none",
      value: 1
    }
  },
  // === Combo Cards ===
  {
    id: 85001,
    name: "Svartalfheim Trader",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Combo: If you control a Pirate, gain +2/+2.",
    flavorText: "The dark elves trade in secrets — and secrets always have a price.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core",
    combo: {
      type: "buff_conditional",
      condition: "control_pirate",
      attack: 2,
      health: 2
    }
  },
  {
    id: 85002,
    name: "Niflheim's Touch",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Give a minion +2 Attack. Combo: +4 Attack instead.",
    flavorText: "The cold makes the blade sharper. Or perhaps it just numbs the conscience.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core",
    spellEffect: {
      type: "buff_attack",
      value: 2,
      targetType: "any_minion",
      requiresTarget: true
    },
    comboEffect: {
      type: "buff_attack",
      value: 4,
      targetType: "any_minion"
    }
  },
  {
    id: 85003,
    name: "Shadow Panther",
    manaCost: 4,
    attack: 4,
    health: 3,
    type: "minion",
    race: "Beast",
    rarity: "common",
    description: "Combo: Gain Stealth until your next turn.",
    flavorText: "It hunts between heartbeats, in the silence between screams.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core",
    combo: {
      type: "gain_stealth",
      duration: "next_turn"
    }
  },
  {
    id: 85004,
    name: "Sabotage",
    manaCost: 4,
    type: "spell",
    rarity: "rare",
    description: "Destroy a random enemy minion. Combo: And their weapon.",
    flavorText: "The weapon breaks. The owner realizes too late.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core",
    spellEffect: {
      type: "destroy_random",
      targetType: "enemy_minion"
    },
    comboEffect: {
      type: "destroy",
      targetType: "enemy_weapon"
    }
  },
  {
    id: 85005,
    name: "Helheim Valiant",
    manaCost: 2,
    attack: 3,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Combo: Deal 1 damage.",
    flavorText: "Those who serve in Hel's domain strike with cold fury.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core",
    combo: {
      type: "damage",
      value: 1,
      targetType: "any",
      requiresTarget: true
    }
  },
  {
    id: 85006,
    name: "Shadow Strike",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 4 damage to an undamaged character. Combo: And 2 damage to adjacent minions.",
    flavorText: "Strike the one. Wound the many.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "undamaged_character",
      requiresTarget: true
    },
    comboEffect: {
      type: "adjacent_damage",
      value: 2
    }
  },
  {
    id: 85007,
    name: "Loki's Pickpocket",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Combo: Add a Coin to your hand.",
    flavorText: "Loki once cut Sif's golden hair while she slept. His followers are no less bold.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core",
    combo: {
      type: "add_card_to_hand",
      cardId: 9050,
      count: 1
    }
  },
  {
    id: 85008,
    name: "Loki's Veil",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Give your minions Stealth until your next turn. Combo: Draw a card.",
    flavorText: "The trickster's cloak hides all. Even from the wearer.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core",
    spellEffect: {
      type: "give_stealth",
      targetType: "friendly_minions",
      duration: "next_turn"
    },
    comboEffect: {
      type: "draw",
      value: 1
    }
  },
  {
    id: 85009,
    name: "Swift Poisoner",
    manaCost: 3,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Combo: Give your weapon +1 Attack and Poisonous.",
    flavorText: "Quick hands, quiet work. The poison does the talking.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core",
    combo: {
      type: "buff_weapon",
      attack: 1,
      effect: "poisonous"
    }
  },
  {
    id: 85010,
    name: "Nyxshade Assassin",
    manaCost: 9,
    type: "hero",
    rarity: 'epic',
    description: "Battlecry: Gain Stealth until your next turn and gain 5 Armor.",
    flavorText: "Blessed by Nyx, goddess of night, she moves unseen between worlds.",
    keywords: ["battlecry"],
    class: "Rogue",
    collectible: true,
    set: "core",
    battlecry: {
      type: "gain_stealth_and_armor",
      armor: 5
    },
    heroPower: {
      name: "Night's Embrace",
      description: "During your turn, add a Shadow Reflection to your hand.",
      cost: 0,
      used: false,
      effect: {
        type: "add_shadow_reflection"
      }
    }
  },
  {
    id: 9050,
    name: "The Coin",
    manaCost: 0,
    type: "spell",
    rarity: "common",
    description: "Gain 1 Mana Crystal this turn only.",
    flavorText: "A single coin, stamped with Odin's eye. Spend it wisely.",
    keywords: [],
    class: "Neutral",
    collectible: false,
    set: "core",
    spellEffect: {
      type: "gain_temp_mana",
      value: 1
    }
  },
  // === Spellburst Card ===
  {
    id: 18001,
    name: "Wand Thief",
    manaCost: 1,
    attack: 1,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Spellburst: Foresee a Mage spell.",
    flavorText: "She borrows spells the way Loki borrows trust — without returning them.",
    keywords: ["spellburst"],
    class: "Rogue",
    spellburstEffect: {
      type: "discover",
      targetType: "self",
      consumed: false
    },
    collectible: true,
    set: "core"
  },
  // === Migrated from legacy rogueCards.ts ===
  {
    id: 12302,
    name: "Poisoned Blade",
    manaCost: 4,
    attack: 1,
    durability: 3,
    type: "weapon",
    rarity: "rare",
    description: "Your Hero Power gives this weapon +1 Attack instead of replacing it.",
    flavorText: "A blade coated in the venom of the shadow serpent.",
    class: "Rogue",
    weaponEffect: {
      type: "hero_power_enhances",
      interactsWithHeroPower: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12401,
    name: "Raven's Striking Curse",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Deal 2 damage to the enemy hero. Combo: Return this to your hand next turn.",
    flavorText: "A persistent pain that never truly goes away.",
    keywords: ["combo"],
    class: "Rogue",
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "enemy_hero",
      requiresTarget: false
    },
    comboEffect: {
      type: "return_to_hand_next_turn",
      targetType: "self"
    },
    collectible: true,
    set: "core"
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
    flavorText: "In the darkness, she finds her strength.",
    keywords: ["stealth"],
    class: "Rogue",
    onAttack: {
      type: "gain_stealth"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 12403,
    name: "Fade Shadow",
    manaCost: 0,
    type: "spell",
    rarity: "rare",
    description: "Give a friendly minion Stealth until your next turn. Combo: And +2/+2.",
    flavorText: "Now you see them, now you don't.",
    keywords: ["combo"],
    class: "Rogue",
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
    },
    collectible: true,
    set: "core"
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
    flavorText: "She learned her craft from the serpent goddess herself.",
    keywords: ["combo"],
    class: "Rogue",
    combo: {
      type: "give_weapon_effect",
      effect: "poisonous"
    },
    collectible: true,
    set: "core"
  },
  // === Quest Cards ===
  {
    id: 70003,
    name: "Descent to Hades",
    manaCost: 1,
    type: "spell",
    rarity: "mythic",
    description: "Quest: Play four minions with the same name. Reward: Core of Tartarus.",
    flavorText: "The path to the underworld reveals itself to those who walk in shadows.",
    keywords: ["quest"],
    class: "Rogue",
    spellEffect: {
      type: "quest",
      goal: 4,
      condition: "play_same_name_minions",
      rewardCardId: 70013
    },
    collectible: true,
    set: "core"
  },
  {
    id: 70013,
    name: "Core of Tartarus",
    manaCost: 5,
    type: "spell",
    rarity: "mythic",
    description: "For the rest of the game, your minions are 4/4.",
    flavorText: "The prison of the Titans transforms all who approach.",
    keywords: [],
    class: "Rogue",
    spellEffect: {
      type: "permanent_minion_buff",
      setAttack: 4,
      setHealth: 4
    },
    collectible: false,
    set: "core"
  },
  // === Yggdrasil Golem Card ===
  {
    id: 85021,
    name: "Yggdrasil Shadowblade",
    manaCost: 2,
    attack: 1,
    health: 1,
    type: "minion",
    rarity: "common",
    description: "Stealth. Deathrattle: Summon a Yggdrasil Golem.",
    flavorText: "Silent as bark, deadly as shadow.",
    keywords: ["stealth", "deathrattle", "yggdrasil_golem"],
    class: "Rogue",
    deathrattle: {
      type: "summon_yggdrasil_golem"
    },
    collectible: true,
    set: "core"
  },
  // === New Shadow Spell ===
  {
    id: 85020,
    name: "Spectral Howl",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Give a friendly minion +1 Attack and Stealth until your next turn.",
    flavorText: "A cry from the void cloaks its allies in shadow.",
    keywords: [],
    class: "Rogue",
    spellEffect: {
      type: "buff",
      buffAttack: 1,
      grantKeywords: ["stealth"],
      targetType: "friendly_minion",
      requiresTarget: true,
      duration: 1
    },
    collectible: true,
    set: "core"
  },
  // === Rogue Expansion — Combo keyword depth ===
  {
    id: 31801,
    name: "Loki's Sleight",
    manaCost: 0,
    type: "spell",
    rarity: "common",
    description: "Combo: Deal 2 damage to an enemy minion.",
    flavorText: "The trickster's hands are quicker than the eye.",
    keywords: ["combo"],
    class: "Rogue",
    spellEffect: {
      type: "damage",
      value: 2,
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31802,
    name: "Shadow Viper",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Combo: Gain Poisonous.",
    flavorText: "It strikes from the shadows, its venom honed by centuries of patience.",
    keywords: ["combo"],
    class: "Rogue",
    collectible: true,
    set: "core"
  },
  {
    id: 31803,
    name: "Niflheim Cutthroat",
    manaCost: 4,
    attack: 4,
    health: 3,
    type: "minion",
    rarity: "rare",
    description: "Combo: Return an enemy minion to their hand. It costs (2) more.",
    flavorText: "In the fog of Niflheim, even the keenest eyes are blind to her approach.",
    keywords: ["combo", "battlecry"],
    class: "Rogue",
    battlecry: {
      type: "return",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31804,
    name: "Shadowstep of Hel",
    manaCost: 1,
    type: "spell",
    rarity: "common",
    description: "Return a friendly minion to your hand. Combo: It costs (4) less instead of (2).",
    flavorText: "Hel opens a path through the shadow realm — for a price.",
    keywords: ["combo"],
    class: "Rogue",
    spellEffect: {
      type: "return_all_minions_to_hand",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31805,
    name: "Loki's Grand Scheme",
    manaCost: 5,
    type: "spell",
    rarity: "rare",
    description: "Draw 3 cards. Combo: They cost (2) less.",
    flavorText: "The trickster always has a plan within a plan within a plan.",
    keywords: ["combo"],
    class: "Rogue",
    spellEffect: {
      type: "draw",
      value: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 31806,
    name: "Svartalf Combo Master",
    manaCost: 6,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: 'epic',
    description: "Combo: Trigger up to 3 random Combo effects of cards you played this turn again.",
    flavorText: "The dark elf strikes last — after ensuring every other blow hits twice.",
    keywords: ["combo", "battlecry"],
    class: "Rogue",
    battlecry: {
      type: "replay_battlecries",
      targetType: "combo_cards_this_turn",
      requiresTarget: false,
      maxTargets: 3
    },
    collectible: true,
    set: "core"
  },

  // ═══════════════════════════════════════════════════════════════
  // ROGUE EXPANSION — filling mana 7-8 gap (3 new cards)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 36301,
    name: "Nótt, Shadow Sovereign",
    manaCost: 7,
    attack: 5,
    health: 5,
    description: "Stealth. Battlecry: Add 3 random spells from other classes to your hand. They cost (2) less.",
    flavorText: "The goddess of night collects secrets the way others collect gold.",
    type: "minion",
    rarity: 'epic',
    class: "Rogue",
    keywords: ["stealth", "battlecry"],
    battlecry: {
      type: "add_random_class_spells",
      value: 3,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36302,
    name: "Vanish into Shadow",
    manaCost: 7,
    description: "Return all minions to their owners' hands. Combo: Your minions cost (2) less this turn.",
    flavorText: "The battlefield empties. Only shadows remain, and shadows have no loyalty.",
    type: "spell",
    rarity: "rare",
    class: "Rogue",
    keywords: ["combo"],
    spellEffect: {
      type: "return_all_to_hand",
      targetType: "all_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36303,
    name: "Svartalf Assassin",
    manaCost: 8,
    attack: 7,
    health: 5,
    description: "Stealth. Combo: Destroy an enemy minion. Deathrattle: Add a copy to your hand.",
    flavorText: "The dark elves train their killers from birth. By adulthood, they are invisible.",
    type: "minion",
    rarity: "epic",
    class: "Rogue",
    keywords: ["stealth", "combo", "deathrattle"],
    deathrattle: { type: "add_copy_to_hand" },
    collectible: true,
    set: "core"
  },
  // === Burgle & Draw Expansion ===
  {
    id: 39001,
    name: "Pilfer of Loki",
    manaCost: 1,
    description: "Add a random card from your opponent's class to your hand.",
    flavorText: "Loki takes what he wants. He always has. He always will.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "add_random_class_card",
      source: "opponent_class",
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39002,
    name: "Hallowed Fencer",
    manaCost: 2,
    attack: 2,
    health: 3,
    description: "Battlecry: Add a random weapon from another class to your hand.",
    flavorText: "She fights with blades forged for gods. They were not given willingly.",
    type: "minion",
    rarity: "rare",
    class: "Rogue",
    keywords: ["battlecry"],
    battlecry: {
      type: "add_random_weapon",
      source: "other_class",
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39003,
    name: "Rain of Daggers",
    manaCost: 3,
    description: "Deal 1 damage to all enemy minions. Draw a card.",
    flavorText: "A dozen blades, thrown in a single breath. Each one finds a different mark.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "damage_and_draw",
      value: 1,
      drawValue: 1,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39004,
    name: "Sprint of Shadows",
    manaCost: 7,
    description: "Draw 4 cards.",
    flavorText: "Run fast enough, and even time loses track of you.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: {
      type: "draw",
      value: 4,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },

  // ── v1.1: Stealth Archetype Expansion (8 cards) ──

  {
    id: 39005,
    name: "Mist-Walker",
    manaCost: 1,
    attack: 2,
    health: 1,
    description: "Stealth. Battlecry: The next card you play this turn has Stealth.",
    flavorText: "She walks between raindrops. You'll never hear her coming.",
    type: "minion",
    rarity: "common",
    class: "Rogue",
    race: "Undead",
    keywords: ["stealth", "battlecry"],
    battlecry: { type: "grant_stealth_next_play", targetType: "none" },
    collectible: true,
    set: "core"
  },
  {
    id: 39006,
    name: "Svartalfheim Shade",
    manaCost: 2,
    attack: 3,
    health: 2,
    description: "Stealth. After this attacks and kills a minion, gain Stealth.",
    flavorText: "The dark elves don't vanish — the light simply refuses to touch them.",
    type: "minion",
    rarity: "common",
    class: "Rogue",
    keywords: ["stealth"],
    collectible: true,
    set: "core"
  },
  {
    id: 39007,
    name: "Daggers of Niflheim",
    manaCost: 2,
    description: "Give a friendly minion Stealth and +2 Attack. If it already has Stealth, draw a card.",
    flavorText: "Forged in mist, sharpened by silence.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    spellEffect: { type: "buff_and_stealth", value: 2, targetType: "friendly_minion", requiresTarget: true },
    collectible: true,
    set: "core"
  },
  {
    id: 39008,
    name: "Ambush Predator",
    manaCost: 3,
    attack: 4,
    health: 3,
    description: "Stealth. After this attacks, deal 2 damage to the adjacent minions.",
    flavorText: "It strikes from three angles at once — and all three are the wrong direction to look.",
    type: "minion",
    rarity: "rare",
    class: "Rogue",
    race: "Beast",
    keywords: ["stealth"],
    collectible: true,
    set: "core"
  },
  {
    id: 39009,
    name: "Veil of Hel",
    manaCost: 3,
    description: "Give all friendly minions Stealth until your next turn. Draw a card for each.",
    flavorText: "The dead do not see. The dead do not speak. The dead do not warn.",
    type: "spell",
    rarity: "rare",
    class: "Rogue",
    spellEffect: { type: "mass_stealth_and_draw", targetType: "friendly_minions" },
    collectible: true,
    set: "core"
  },
  {
    id: 39010,
    name: "Shadow Ambusher",
    manaCost: 4,
    attack: 5,
    health: 4,
    description: "Stealth. Combo: Deal 3 damage to an enemy minion.",
    flavorText: "The combo isn't two attacks — it's the moment between them.",
    type: "minion",
    rarity: "common",
    class: "Rogue",
    keywords: ["stealth", "combo"],
    comboEffect: { type: "deal_damage", value: 3, targetType: "enemy_minion", requiresTarget: true },
    collectible: true,
    set: "core"
  },
  {
    id: 39011,
    name: "Hel's Unseen",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "Stealth. Deathrattle: Add a random Rogue spell to your hand. It costs (0).",
    flavorText: "You don't find spies from Helheim. They find your secrets.",
    type: "minion",
    rarity: "epic",
    class: "Rogue",
    race: "Undead",
    keywords: ["stealth", "deathrattle"],
    deathrattle: { type: "add_random_class_spell_free", class: "Rogue" },
    collectible: true,
    set: "core"
  },
  {
    id: 39012,
    name: "Nótt's Cloak",
    manaCost: 1,
    description: "Rune: When your opponent plays a minion, give a random friendly minion Stealth and +1/+1.",
    flavorText: "Night falls when Nótt rides. Her cloak drapes the worthy in shadow.",
    type: "spell",
    rarity: "common",
    class: "Rogue",
    keywords: ["secret"],
    spellEffect: { type: "secret", targetType: "none" },
    collectible: true,
    set: "core"
  }
];
