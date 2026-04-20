import { CardData } from '../../../../../types';

export const deathknightCards: CardData[] = [
  {
    id: 3001,
    name: "Death Coil",
    manaCost: 2,
    description: "Deal 3 damage to an enemy, or restore 3 Health to a friendly undead minion.",
    flavorText: "The prime currency of Helheim. Trades particularly well against life.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "death_coil",
      value: 3,
      targetType: "any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3005,
    name: "Army of the Dead",
    manaCost: 6,
    description: "Summon three 2/2 Ghouls with Taunt.",
    flavorText: "Like a good neighbor, the undead are there!",
    type: "spell",
    rarity: "rare",
    class: "DeathKnight",
    spellEffect: {
      type: "summon",
      summonCardId: 9051,
      value: 3,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3007,
    name: "Remorseless Winter",
    manaCost: 4,
    description: "Freeze all enemy minions. Deal 2 damage to all Frozen enemies.",
    flavorText: "The bitter cold of Niflheim seeps into the marrow of its victims' bones.",
    type: "spell",
    rarity: "rare",
    class: "DeathKnight",
    spellEffect: {
      type: "freeze_and_damage",
      value: 2,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3009,
    name: "Hel's Edge",
    manaCost: 7,
    attack: 5,
    durability: 3,
    description: "After your hero attacks and kills a minion, summon that minion to your side.",
    flavorText: "Whomsoever takes up this blade shall wield power eternal.",
    type: "weapon",
    rarity: 'rare',
    class: "DeathKnight",
    collectible: true,
    set: "core"
  },
  {
    id: 3011,
    name: "Blood Boil",
    manaCost: 2,
    description: "Deal 1 damage to all minions. If any die, restore 3 Health to your hero.",
    flavorText: "Boiling blood is a staple in the death knight diet.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "aoe_with_on_kill",
      value: 1,
      targetType: "all_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3012,
    name: "Runeforged Blade",
    manaCost: 3,
    attack: 2,
    durability: 3,
    description: "Your weapon has +1 Attack for each Rune you have active.",
    flavorText: "Enchanted with runes of power.",
    type: "weapon",
    rarity: "rare",
    class: "DeathKnight",
    collectible: true,
    set: "core"
  },
  {
    id: 3013,
    name: "Icebound Fortitude",
    manaCost: 4,
    description: "Give your hero +5 Armor and Immunity this turn.",
    flavorText: "Death knights can encase themselves in an icy fortress of invulnerability.",
    type: "spell",
    rarity: "rare",
    class: "DeathKnight",
    spellEffect: {
      type: "gain_armor_and_immunity",
      value: 5,
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3014,
    name: "Dark Command",
    manaCost: 3,
    description: "Take control of an enemy minion with 3 or less Attack until end of turn.",
    flavorText: "Death knights are masters of manipulation.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "mind_control_temporary",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3015,
    name: "The Draugr King",
    manaCost: 9,
    description: "Battlecry: Equip Hel's Edge and gain 5 Armor.",
    flavorText: "When a prince becomes a death knight, it's a royal pain.",
    type: "hero",
    rarity: 'rare',
    class: "DeathKnight",
    keywords: ["battlecry"],
    collectible: true,
    set: "core"
  },
  {
    id: 3017,
    name: "Death Gate",
    manaCost: 4,
    description: "Summon a random friendly minion that died this game.",
    flavorText: "Death knights can open portals to the realm of the dead.",
    type: "spell",
    rarity: "rare",
    class: "DeathKnight",
    spellEffect: {
      type: "resurrect_random",
      value: 1,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3018,
    name: "Bone Shield",
    manaCost: 2,
    description: "Give a minion +2 Health and \"After this minion survives damage, summon a 1/1 Skeleton.\"",
    flavorText: "A shield made of bones. Pretty self-explanatory, actually.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "buff_and_enchant",
      buffHealth: 2,
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3021,
    name: "Blood Presence",
    manaCost: 3,
    description: "Give your hero +4 Armor and Lifesteal this turn.",
    flavorText: "Blood death knights are vampiric fighters.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "gain_armor_and_lifesteal",
      value: 4,
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3022,
    name: "Frost Presence",
    manaCost: 3,
    description: "Freeze an enemy and all adjacent minions.",
    flavorText: "Frost death knights bring the bitter cold of Niflheim with them.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "freeze_adjacent",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3024,
    name: "Runeblade",
    manaCost: 2,
    attack: 2,
    durability: 2,
    description: "A 1/1 weapon forged from runic energy.",
    flavorText: "A basic runeblade, the iconic weapon of the death knight.",
    type: "weapon",
    rarity: "common",
    class: "DeathKnight",
    collectible: true,
    set: "core"
  },
  {
    id: 3025,
    name: "Chains of Ice",
    manaCost: 2,
    description: "Freeze an enemy. Draw a card.",
    flavorText: "Death knights can conjure chains of pure ice to bind their opponents.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "freeze_and_draw",
      targetType: "any_enemy",
      requiresTarget: true,
      drawCards: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3027,
    name: "Death Knight Initiate",
    manaCost: 2,
    attack: 2,
    health: 3,
    description: "Battlecry: Give your weapon +1/+1.",
    flavorText: "Every death knight starts somewhere.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff_weapon",
      buffAttack: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3029,
    name: "Draugr Champion",
    manaCost: 4,
    attack: 3,
    health: 3,
    description: "Battlecry: Give a friendly minion +2/+2 and Taunt.",
    flavorText: "Champions of Helheim command legions of undead.",
    type: "minion",
    rarity: "rare",
    class: "DeathKnight",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff_and_taunt",
      buffAttack: 2,
      buffHealth: 2,
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3019,
    name: "Skeleton",
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "Summoned by Death Knight abilities.",
    flavorText: "Just your average, run-of-the-mill undead skeleton.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    collectible: false,
    set: "core"
  },
  {
    id: 3031,
    name: "Frozen Acolyte",
    manaCost: 1,
    attack: 1,
    health: 2,
    description: "Battlecry: Freeze a minion.",
    flavorText: "She once prayed to the Aesir for warmth. Now she answers with frost.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    keywords: ["battlecry"],
    battlecry: {
      type: "freeze",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3032,
    name: "Plague Spreader",
    manaCost: 2,
    attack: 2,
    health: 3,
    description: "Deathrattle: Give adjacent minions -1 Attack.",
    flavorText: "The draugr carry plagues that felled entire villages along the fjords.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["deathrattle"],
    deathrattle: {
      type: "debuff_adjacent",
      buffAttack: -1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3033,
    name: "Runebound Ghoul",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Gains +1/+1 when an enemy minion dies.",
    flavorText: "Carved with runes of binding, it feeds on the passing of the slain.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    race: "Undead",
    keywords: [],
    minionEffect: {
      type: "buff_on_enemy_death",
      buffAttack: 1,
      buffHealth: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3034,
    name: "Frost Revenant",
    manaCost: 3,
    attack: 2,
    health: 4,
    description: "Your frozen enemies take +1 damage.",
    flavorText: "Born in the howling winds of Niflheim, where even the dead shiver.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    keywords: [],
    aura: {
      type: "frozen_damage_bonus",
      value: 1,
      targetType: "frozen_enemies"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3035,
    name: "Abomination Smith",
    manaCost: 4,
    attack: 3,
    health: 5,
    description: "Battlecry: Destroy a friendly Undead to gain its stats.",
    flavorText: "In Helheim's forges, the dead are not mourned — they are repurposed.",
    type: "minion",
    rarity: "epic",
    class: "DeathKnight",
    keywords: ["battlecry"],
    battlecry: {
      type: "consume_friendly",
      targetType: "friendly_minion",
      requiresTarget: true,
      raceFilter: "Undead",
      gainStats: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3036,
    name: "Deathcharger",
    manaCost: 4,
    attack: 5,
    health: 2,
    description: "Charge. Deathrattle: Deal 3 damage to your hero.",
    flavorText: "Sleipnir's shadow breeds steeds that gallop between the realms of the living and the dead.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["charge", "deathrattle"],
    deathrattle: {
      type: "damage_hero",
      value: 3,
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3037,
    name: "Val'kyr Shadowguard",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "Deathrattle: Resummon this minion with 1 Health.",
    flavorText: "The Valkyries of shadow do not choose the slain — they refuse to become them.",
    type: "minion",
    rarity: "epic",
    class: "DeathKnight",
    keywords: ["deathrattle"],
    deathrattle: {
      type: "resummon_self",
      health: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 3038,
    name: "Frost Wyrm",
    manaCost: 8,
    attack: 6,
    health: 8,
    description: "Battlecry: Freeze all enemy minions.",
    flavorText: "Nidhogg's lesser kin, reborn in ice atop the peaks of Jotunheim.",
    type: "minion",
    rarity: 'rare',
    class: "DeathKnight",
    race: "Dragon",
    keywords: ["battlecry"],
    battlecry: {
      type: "freeze",
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },

  // ═══════════════════════════════════════════════════════════════
  // DEATH KNIGHT EXPANSION (14 new cards — filling mana 5-8, mythics)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 36001,
    name: "Soul Reaper",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "Lifesteal. Deathrattle: Deal damage equal to this minion's Attack to a random enemy.",
    flavorText: "It harvests life the way a farmer harvests grain — methodically, without remorse.",
    type: "minion",
    rarity: "rare",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["lifesteal", "deathrattle"],
    deathrattle: { type: "deal_attack_damage_random_enemy" },
    collectible: true,
    set: "core"
  },
  {
    id: 36002,
    name: "Plague Bearer",
    manaCost: 3,
    attack: 2,
    health: 4,
    description: "At the end of your turn, deal 1 damage to all enemy minions.",
    flavorText: "It walks among the living, and the living do not walk for long.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    race: "Undead",
    collectible: true,
    set: "core"
  },
  {
    id: 36003,
    name: "Niflheim Harbinger",
    manaCost: 6,
    attack: 5,
    health: 6,
    description: "Battlecry: Destroy a Frozen enemy minion. Draw a card.",
    flavorText: "Where frost kills, she follows. Where she follows, frost kills.",
    type: "minion",
    rarity: "rare",
    class: "DeathKnight",
    keywords: ["battlecry"],
    battlecry: {
      type: "destroy_frozen_draw",
      targetType: "frozen_enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36004,
    name: "Corpse Explosion",
    manaCost: 5,
    description: "Destroy a friendly minion. Deal its Health as damage to all enemy minions.",
    flavorText: "In death, even the weakest become devastating.",
    type: "spell",
    rarity: "rare",
    class: "DeathKnight",
    spellEffect: {
      type: "sacrifice_aoe",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36005,
    name: "Hel-Walker",
    manaCost: 1,
    attack: 2,
    health: 1,
    description: "Deathrattle: Add a random DeathKnight card to your hand.",
    flavorText: "It walks the road between Helheim and Midgard. Both realms wish it would stay in the other.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["deathrattle"],
    deathrattle: { type: "add_random_class_card" },
    collectible: true,
    set: "core"
  },
  {
    id: 36006,
    name: "Obliterate",
    manaCost: 5,
    description: "Destroy a minion. Your hero takes damage equal to its Health.",
    flavorText: "Destruction so complete that even the spirit has nowhere to go.",
    type: "spell",
    rarity: "rare",
    class: "DeathKnight",
    spellEffect: {
      type: "destroy_take_damage",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36007,
    name: "Frost Lich",
    manaCost: 5,
    attack: 4,
    health: 4,
    description: "Battlecry: Freeze a minion. If it's already Frozen, destroy it.",
    flavorText: "It was a shaman once. The cold changed its mind about mercy.",
    type: "minion",
    rarity: "rare",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "freeze_or_destroy",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36008,
    name: "Death Grip",
    manaCost: 3,
    description: "Steal a minion from your opponent's deck. It costs (2) less.",
    flavorText: "The hand reaches from beyond the grave and drags the living down.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "steal_from_deck",
      value: 2,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36009,
    name: "Niflheim's Fury",
    manaCost: 7,
    description: "Deal 8 damage randomly split among all enemies. Freeze any that survive.",
    flavorText: "The ice wyrm's breath freezes the soul before it reaches the body.",
    type: "spell",
    rarity: 'rare',
    class: "DeathKnight",
    spellEffect: {
      type: "random_damage_freeze",
      value: 8,
      targetType: "all_enemies"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36010,
    name: "Death Gate",
    manaCost: 6,
    description: "Summon a random minion from your opponent's graveyard. Give it Rush and Lifesteal.",
    flavorText: "The gate swings open. Something walks through. It is not what was expected.",
    type: "spell",
    rarity: "rare",
    class: "DeathKnight",
    spellEffect: {
      type: "steal_from_graveyard",
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36011,
    name: "Draugr Lord, Bone Storm",
    manaCost: 8,
    attack: 7,
    health: 7,
    description: "Rush. Battlecry: Deal 3 damage to all enemy minions. Deathrattle: Resummon this with 1 Health.",
    flavorText: "Its bones fly apart and reform, shredding everything between. Death is merely inconvenient.",
    type: "minion",
    rarity: 'epic',
    class: "DeathKnight",
    race: "Undead",
    keywords: ["rush", "battlecry", "deathrattle"],
    battlecry: {
      type: "aoe_damage",
      value: 3,
      targetType: "all_enemy_minions"
    },
    deathrattle: { type: "resummon_self", health: 1 },
    collectible: true,
    set: "core"
  },
  {
    id: 36012,
    name: "Blood Tap",
    manaCost: 1,
    description: "Deal 2 damage to your hero. Draw a card.",
    flavorText: "A small wound, freely given. The knowledge it buys is worth the blood.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "self_damage_draw",
      value: 2,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36013,
    name: "Ebon Champion",
    manaCost: 4,
    attack: 3,
    health: 4,
    description: "Taunt. Whenever this minion takes damage, gain +1 Attack.",
    flavorText: "Every blow makes him angrier. Every wound makes him stronger.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    keywords: ["taunt"],
    collectible: true,
    set: "core"
  },
  {
    id: 36014,
    name: "Helheim's Chosen",
    manaCost: 9,
    attack: 8,
    health: 8,
    description: "Battlecry: Destroy all minions with 3 or less Attack. Gain +1/+1 for each destroyed.",
    flavorText: "The realm of the dishonored dead consumes all who linger.",
    type: "minion",
    rarity: 'epic',
    class: "DeathKnight",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "destroy_low_attack_buff",
      value: 3,
      targetType: "all_low_attack"
    },
    collectible: true,
    set: "core"
  },

  // === Rune & Corpse Expansion ===

  {
    id: 38101,
    name: "Blood Rune: Siphon",
    manaCost: 2,
    description: "Deal 2 damage to a minion. Restore 2 Health to your hero.",
    flavorText: "The rune drinks deep. What it takes from one, it gives to another.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    keywords: ["lifesteal"],
    spellEffect: {
      type: "drain",
      value: 2,
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38102,
    name: "Frost Rune: Howling Gale",
    manaCost: 3,
    description: "Freeze all enemy minions. Draw a card.",
    flavorText: "Niflheim's wind carries the screams of the frozen dead.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "freeze_and_draw",
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38103,
    name: "Unholy Rune: Raise Dead",
    manaCost: 2,
    description: "Return two random friendly minions that died this game to your hand. They cost (1) less.",
    flavorText: "The rune glows sickly green. The earth stirs. The dead remember.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "resurrect_to_hand",
      value: 2,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38104,
    name: "Draugr Conscript",
    manaCost: 1,
    attack: 2,
    health: 1,
    description: "Deathrattle: Add a Blood Rune: Siphon to your hand.",
    flavorText: "It served in life. It serves in death. It has no opinion on the matter.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["deathrattle"],
    deathrattle: {
      type: "add_to_hand",
      cardId: 38101
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38105,
    name: "Runeforger",
    manaCost: 3,
    attack: 2,
    health: 4,
    description: "Battlecry: Foresee a Rune spell (Blood, Frost, or Unholy).",
    flavorText: "He carves runes into bone. The bone does not need to be his own.",
    type: "minion",
    rarity: "rare",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "discover",
      discoveryType: "dk_rune"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38106,
    name: "Helheim Abomination",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "Taunt. Deathrattle: Deal 2 damage to all minions.",
    flavorText: "Stitched together from the dishonored dead. It fights because it knows nothing else.",
    type: "minion",
    rarity: "common",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["taunt", "deathrattle"],
    deathrattle: {
      type: "damage",
      value: 2,
      targetType: "all_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38107,
    name: "Corpse Harvester",
    manaCost: 4,
    attack: 3,
    health: 4,
    description: "Battlecry: For each Undead that died this game, gain +1/+1 (up to +5/+5).",
    flavorText: "The more that die, the stronger it becomes. It is always patient.",
    type: "minion",
    rarity: "epic",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff_from_graveyard_count",
      condition: { check: "graveyard_count", race: "Undead", minimum: 1 },
      value: 1,
      maxValue: 5
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38108,
    name: "Niflheim's Grasp",
    manaCost: 6,
    description: "Destroy an enemy minion. Summon a 3/3 Ghoul with Taunt.",
    flavorText: "The cold reaches out and takes what it wants. What it wants is everything.",
    type: "spell",
    rarity: "rare",
    class: "DeathKnight",
    spellEffect: {
      type: "destroy_and_summon",
      targetType: "enemy_minion",
      requiresTarget: true,
      summonAttack: 3,
      summonHealth: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38109,
    name: "Hel's Chosen",
    manaCost: 7,
    attack: 6,
    health: 6,
    description: "Battlecry: Summon all friendly Undead that died this game (up to 4). They have Rush.",
    flavorText: "Half her face is beautiful. Half is rotting. All of her is absolute.",
    type: "minion",
    rarity: 'epic',
    class: "DeathKnight",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "mass_resurrect",
      condition: { check: "race", value: "Undead" },
      maxCount: 4,
      grantKeywords: ["rush"]
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38110,
    name: "Root-Gnawer's Maw",
    manaCost: 8,
    attack: 5,
    health: 7,
    description: "Battlecry: Destroy all Undead in both graveyards. Gain +2/+2 for each.",
    flavorText: "It has gnawed Yggdrasil's root since before time had a name.",
    type: "minion",
    rarity: 'epic',
    class: "DeathKnight",
    race: "Dragon",
    keywords: ["battlecry"],
    battlecry: {
      type: "consume_graveyard",
      race: "Undead",
      buffPerCard: { attack: 2, health: 2 }
    },
    collectible: true,
    set: "core"
  },
  // ==================== COMMON GAP-FILL (Starter Deck Viability) ====================
  {
    id: 39206,
    name: "Frost Strike",
    manaCost: 2,
    description: "Deal 3 damage to a minion. If it's Frozen, deal 5 instead.",
    flavorText: "The cold doesn't kill you. The sword does.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "conditional_damage",
      value: 3,
      bonusValue: 5,
      condition: "frozen",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39207,
    name: "Blood Tap",
    manaCost: 1,
    description: "Take 2 damage. Draw a card. Gain 1 Corpse.",
    flavorText: "A small sacrifice for forbidden knowledge.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "draw_and_self_damage",
      value: 1,
      selfDamage: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39208,
    name: "Unholy Grasp",
    manaCost: 3,
    description: "Deal 2 damage to an enemy. Restore that much Health to your hero.",
    flavorText: "Life flows from the living to the unliving.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "damage_and_heal_hero",
      value: 2,
      targetType: "enemy_any",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39209,
    name: "Runic Shield",
    manaCost: 2,
    description: "Gain 4 Armor. Draw a card.",
    flavorText: "Runes carved in bone last longer than runes carved in stone.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "gain_armor_and_draw",
      armorValue: 4,
      value: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 39210,
    name: "Helheim's Grasp",
    manaCost: 4,
    description: "Destroy a minion with 4 or less Attack.",
    flavorText: "The dead reach up from below and drag the weak down with them.",
    type: "spell",
    rarity: "common",
    class: "DeathKnight",
    spellEffect: {
      type: "conditional_destroy",
      condition: { maxAttack: 4 },
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 9051,
    name: "Ghoul",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Taunt",
    type: "minion",
    rarity: "basic",
    class: "DeathKnight",
    race: "Undead",
    keywords: ["taunt"],
    collectible: false,
    flavorText: "The dead of Helheim rise to serve."
  }
];
