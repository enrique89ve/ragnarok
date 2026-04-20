import { CardData } from '../../../../types';
import norseArtifacts from './artifacts';
import norseArmorCards from './armorCards';

// ============================================
// NORSE MYTHOLOGY SET
// ============================================
// All cards themed around Norse mythology
// Organized by category for maintainability

// ============================================
// NORSE GODS (Legendary Divine Minions)
// ============================================
const norseGods: CardData[] = [
  {
    id: 4392,
    name: "Echo of the Light God",
    manaCost: 7,
    attack: 6,
    health: 6,
    description: "Divine Shield. Battlecry: Give all friendly minions Divine Shield. Deathrattle: Restore 4 Health to your hero.",
    flavorText: "The god of light and beauty, whose divine shield protects all who stand with him.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: ["divine_shield", "battlecry", "deathrattle"],
    battlecry: {
      type: "grant_divine_shield",
      targetType: "friendly_minions"
    },
    deathrattle: {
      type: "heal_hero",
      value: 4,
      targetType: "friendly_hero"
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'vulnerable',
      targetType: 'target'
    },
    categories: ["norse_mythology", "holy_legendary"],
    collectible: true
  },
  {
    id: 4393,
    name: "Echo of the Sun Goddess",
    manaCost: 6,
    attack: 4,
    health: 5,
    description: "At the start of your turn, restore 2 Health to all friendly characters and deal 1 damage to all enemies.",
    flavorText: "The sun goddess whose warmth heals the faithful and burns the wicked.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: [],
    startOfTurn: {
      type: "compound",
      effects: [
        { type: "heal_all", targetType: "friendly_characters", value: 2 },
        { type: "damage", targetType: "all_enemies", value: 1 }
      ]
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'burn',
      targetType: 'target'
    },
    categories: ["norse_mythology", "holy_legendary"],
    collectible: true
  },
  {
    id: 4394,
    name: "Echo of the Bifrost Guardian",
    manaCost: 8,
    attack: 5,
    health: 10,
    description: "Taunt. Battlecry: Reveal 3 cards from your deck. Choose one to add to your hand.",
    flavorText: "The guardian of Bifrost, who watches all paths and gates of the Nine Realms.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "discover",
      targetType: 'none',
      discoverCount: 3,
      discoverSource: "deck"
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'marked',
      targetType: 'target'
    },
    categories: ["norse_mythology", "holy_legendary"],
    collectible: true
  },
  {
    id: 4382,
    name: "Sovereign of the Drowned",
    manaCost: 8,
    attack: 5,
    health: 8,
    description: "Battlecry: Summon two 2/3 Rán's Thralls with 'Deathrattle: Freeze a random enemy.'",
    flavorText: "The goddess of the sea, whose drowned servants pull enemies to the depths.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: ["battlecry"],
    battlecry: {
      type: "summon",
      targetType: 'none',
      summonCardId: 4385,
      summonCount: 2
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'weakness',
      targetType: 'target'
    },
    categories: ["norse_mythology", "water_legendary"],
    collectible: true
  },
  {
    id: 4384,
    name: "Tidelord of the Abyss",
    manaCost: 7,
    attack: 6,
    health: 7,
    description: "Battlecry: Draw a card for each frozen enemy. Freeze any unfrozen enemies.",
    flavorText: "The sea god whose domain spans all waters, cold and frozen.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: ["battlecry"],
    battlecry: {
      type: "draw_and_freeze",
      targetType: "enemy_minions"
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    },
    categories: ["norse_mythology", "water_legendary"],
    collectible: true
  },
];

// ============================================
// NORSE LEGENDARY CREATURES
// ============================================
const norseLegendaryCreatures: CardData[] = [
  {
    id: 20620,
    name: "World Serpent Spawn",
    manaCost: 7,
    attack: 6,
    health: 6,
    description: "Battlecry: Summon two 0/5 Jormungandr's Coils with \"At the end of your turn, deal 1 damage to all enemy minions.\" Deathrattle: Destroy all Jormungandr's Coils and deal 2 damage to all enemy minions.",
    flavorText: "The World Serpent circles the realm, lying in wait. When its coils tighten, the end draws near.",
    rarity: "mythic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry", "deathrattle"],
    battlecry: {
      type: "summon",
      targetType: 'none',
      summonCardId: 20621,
      summonCount: 2
    },
    deathrattle: {
      type: "compound",
      effects: [
        { type: "destroy", targetType: "specific_minion_type", specificCardId: 20621 },
        { type: "damage", targetType: "enemy_minions", value: 2 }
      ]
    },
    categories: ["norse_mythology"],
    collectible: true
  },
  {
    id: 4300,
    name: "Gleipnir's Captive",
    manaCost: 8,
    attack: 7,
    health: 7,
    description: "Rush. Battlecry: Destroy an enemy minion. At the end of each turn, gain +1 Attack.",
    flavorText: "The monstrous wolf, destined to break free and devour the gods.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "destroy",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    endOfTurn: {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'bleed',
      targetType: 'target'
    },
    categories: ["norse_mythology", "dark_legendary"],
    collectible: true
  },
  {
    id: 4301,
    name: "Garm, the Hellhound",
    manaCost: 7,
    attack: 5,
    health: 6,
    description: "Taunt. Battlecry: Revive a random friendly minion that died this game with +1/+1. When a friendly minion dies, summon a 2/2 Shadow Hound with Taunt.",
    flavorText: "The ferocious guard dog of Hel's gates.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "resurrect_random_buffed",
      targetType: "none",
      buffAttack: 1,
      buffHealth: 1
    },
    onFriendlyDeath: {
      type: "summon",
      summonCardId: 4310,
      value: 1
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'poison_dot',
      targetType: 'target'
    },
    categories: ["norse_mythology", "dark_legendary"],
    collectible: true
  },
  {
    id: 4302,
    name: "Moon-Devourer Wolf",
    manaCost: 6,
    attack: 5,
    health: 5,
    description: "Stealth. Battlecry: Deal 1 damage to all enemy minions. At the end of your turn, if this has Stealth, give another random friendly minion Stealth.",
    flavorText: "The wolf that stalks the moon, bringing eternal night.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["stealth", "battlecry"],
    battlecry: {
      type: "damage_all",
      targetType: "enemy_minions",
      value: 1
    },
    endOfTurn: {
      type: "grant_stealth_conditional",
      condition: "self_has_stealth",
      targetType: "random_friendly_minion"
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'weakness',
      targetType: 'target'
    },
    categories: ["norse_mythology", "dark_legendary"],
    collectible: true
  },
  {
    id: 4303,
    name: "Root-Gnawer of Yggdrasil",
    manaCost: 10,
    attack: 8,
    health: 8,
    description: "Taunt. Battlecry: Destroy all enemy minions with 2 or less Health. At the end of each turn, deal 1 damage to all enemy minions.",
    flavorText: "The dragon that chews at Yggdrasil's roots, heralding decay.",
    rarity: "mythic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Dragon",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "destroy_low_health",
      targetType: "enemy_minions",
      healthThreshold: 2
    },
    endOfTurn: {
      type: "damage",
      value: 1,
      targetType: "enemy_minions"
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'poison_dot',
      targetType: 'target'
    },
    categories: ["norse_mythology", "dark_legendary"],
    collectible: true
  },
  {
    id: 4304,
    name: "Shadowmaw Alpha",
    manaCost: 6,
    attack: 4,
    health: 4,
    description: "Stealth. Battlecry: Summon two 2/2 Shadow Wolves with Stealth. Whenever you summon a Shadow Wolf, give it +1/+1.",
    flavorText: "The leader of the pack, its howl commands the night.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["stealth", "battlecry"],
    battlecry: {
      type: "summon",
      targetType: "none",
      summonCardId: 4311,
      summonCount: 2
    },
    onSummon: {
      type: "buff_summoned",
      condition: { cardNameContains: "Shadow Wolf" },
      buffAttack: 1,
      buffHealth: 1
    },
    categories: ["norse_mythology", "dark_legendary"],
    collectible: true
  },
  {
    id: 4305,
    name: "Shadowmaw Direwolf",
    manaCost: 7,
    attack: 6,
    health: 6,
    description: "Stealth. Battlecry: Destroy an enemy minion with 4 or less Attack and summon a 3/3 Shadow Wolf in its place. After this attacks and kills a minion, summon a 1/1 Shadow Pup with Stealth.",
    flavorText: "A pack leader of the night, its jaws claim the weak.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["stealth", "battlecry"],
    battlecry: {
      type: "destroy_and_summon",
      targetType: "enemy_minion",
      requiresTarget: true,
      attackThreshold: 4,
      summonCardId: 4312
    },
    onKill: {
      type: "summon",
      summonCardId: 4313,
      value: 1
    },
    categories: ["norse_mythology", "dark_legendary"],
    collectible: true
  },
  {
    id: 4320,
    name: "Hafgufa, the Sea-Mist",
    manaCost: 10,
    attack: 8,
    health: 12,
    description: "Battlecry: Deal 3 damage to ALL other minions. Your spells cost (1) less. Enemy minions take 1 extra damage. Deathrattle: Deal 5 damage to all enemies.",
    flavorText: "The legendary Norse sea monster, shrouded in mist, rising from the depths to engulf ships whole.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry", "deathrattle"],
    battlecry: {
      type: "damage_all",
      targetType: "all_other_minions",
      value: 3
    },
    aura: {
      type: "compound",
      effects: [
        { type: "spell_cost_reduction", value: 1, targetType: "friendly" },
        { type: "damage_increase", value: 1, targetType: "enemy_minions" }
      ]
    },
    deathrattle: {
      type: "damage",
      targetType: "all_enemies",
      value: 5
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4321,
    name: "Briareos, the Hundred-Armed",
    manaCost: 10,
    attack: 10,
    health: 14,
    description: "Taunt. Can't be Silenced. Cannot have Attack reduced. Takes 1 less damage. Whenever this attacks, deal 3 damage to all other minions.",
    flavorText: "One of the mighty Hecatoncheires, the hundred-handed giants who helped Zeus overthrow the Titans.",
    rarity: 'rare',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: ["taunt"],
    cantBeSilenced: true,
    passive: {
      type: "compound",
      effects: [
        { type: "attack_reduction_immunity" },
        { type: "damage_reduction", value: 1 }
      ]
    },
    onAttack: {
      type: "damage_all",
      targetType: "all_other_minions",
      value: 3
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4322,
    name: "Typhon's Brood",
    manaCost: 9,
    attack: 8,
    health: 10,
    description: "Battlecry: Summon a Ginnungagap's Fury. The first damage this takes each turn is ignored. Deathrattle: Deal 5 damage to all enemies.",
    flavorText: "Offspring of Typhon, the father of all monsters in Greek mythology, spawned from primordial chaos.",
    rarity: "mythic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Dragon",
    keywords: ["battlecry", "deathrattle"],
    battlecry: {
      type: "summon",
      targetType: "none",
      summonCardId: 4340,
      summonCount: 1
    },
    passive: {
      type: "first_damage_immunity"
    },
    deathrattle: {
      type: "damage",
      targetType: "all_enemies",
      value: 5
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4323,
    name: "Mánagarm, the Blood Moon",
    manaCost: 9,
    attack: 9,
    health: 9,
    description: "Lifesteal. Battlecry: Enemy minions have -2 Attack while this is alive. Whenever this deals damage, restore that much Health to your hero.",
    flavorText: "The great wolf destined to swallow the moon during Ragnarök, staining the sky blood-red.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["lifesteal", "battlecry"],
    battlecry: {
      type: "aura_debuff",
      targetType: "enemy_minions",
      debuffAttack: -2,
      condition: "while_alive"
    },
    onDamage: {
      type: "heal_hero",
      targetType: "friendly_hero",
      value: "damage_dealt"
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4324,
    name: "Ladon, the Hundred-Eyed",
    manaCost: 8,
    attack: 7,
    health: 10,
    description: "Whenever this attacks, it attacks twice. After attacking, give a random enemy minion Poisonous this turn.",
    flavorText: "The hundred-headed dragon that guarded the golden apples in the Garden of the Hesperides.",
    rarity: 'rare',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["windfury"],
    onAttack: {
      type: "grant_keyword",
      targetType: "random_enemy_minion",
      keyword: "poisonous",
      duration: "this_turn"
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4325,
    name: "Viðófnir, the Tree Guardian",
    manaCost: 8,
    attack: 6,
    health: 12,
    description: "Taunt. Your opponent's minions have -1 Attack. At the end of your turn, gain +2 Health.",
    flavorText: "The golden rooster perched atop Yggdrasil, ever watchful over the World Tree's sacred branches.",
    rarity: 'rare',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt"],
    aura: {
      type: "attack_debuff",
      targetType: "enemy_minions",
      value: -1
    },
    endOfTurn: {
      type: "buff_self",
      buffAttack: 0,
      buffHealth: 2
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4326,
    name: "Vánagand, the Eclipse Dragon",
    manaCost: 9,
    attack: 7,
    health: 11,
    description: "Flying. Battlecry: Disable all enemy minion abilities until your next turn. Whenever this deals damage, restore 3 Health to it.",
    flavorText: "Monster of the river Ván, whose shadow darkens the heavens when it takes flight.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Dragon",
    keywords: ["battlecry", "flying"],
    battlecry: {
      type: "silence_all",
      targetType: "enemy_minions",
      duration: "until_next_turn"
    },
    onDamage: {
      type: "heal_self",
      value: 3
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4327,
    name: "Lernaean Flame",
    manaCost: 8,
    attack: 8,
    health: 8,
    description: "Whenever this attacks, deal 2 damage to all enemies. After this survives damage, gain +1 Attack.",
    flavorText: "A fiery incarnation of the Lernaean Hydra, each severed head regrows stronger than before.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Dragon",
    onAttack: {
      type: "damage",
      targetType: "all_enemies",
      value: 2
    },
    onSurviveDamage: {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4328,
    name: "Draugr, the Deathless Hunger",
    manaCost: 7,
    attack: 7,
    health: 7,
    description: "Lifesteal. Whenever a minion dies, gain +1 Attack. After this kills a minion, gain Stealth until your next turn.",
    flavorText: "An undead Norse revenant, cursed to walk between worlds with an insatiable hunger for the living.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: ["lifesteal"],
    onAnyDeath: {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    },
    onKill: {
      type: "grant_keyword",
      targetType: "self",
      keyword: "stealth",
      duration: "until_next_turn"
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4329,
    name: "World-Rending Terror",
    manaCost: 8,
    attack: 6,
    health: 13,
    description: "Taunt. Whenever this takes damage, restore 2 Health to it. Battlecry: Destroy a random enemy minion.",
    flavorText: "The six-headed Greek sea monster that devoured sailors passing through the Strait of Messina.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "battlecry"],
    onDamageTaken: {
      type: "heal_self",
      value: 2
    },
    battlecry: {
      type: "destroy",
      targetType: "random_enemy_minion",
      requiresTarget: false
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
  {
    id: 4330,
    name: "Stheno, the Stone-Gazer",
    manaCost: 6,
    attack: 6,
    health: 6,
    description: "At the end of your turn, Freeze a random enemy minion. Whenever this attacks a Frozen minion, destroy it.",
    flavorText: "The immortal Gorgon sister whose gaze turns all who meet her eyes to cold, unmoving stone.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    endOfTurn: {
      type: "freeze",
      targetType: "random_enemy_minion"
    },
    onAttack: {
      type: "destroy_frozen",
      condition: "target_is_frozen"
    },
    categories: ["norse_mythology", "mythological_legendary"],
    collectible: true
  },
];

// ============================================
// FIRE ELEMENT LEGENDARY CREATURES
// ============================================
const fireElementLegendaries: CardData[] = [
  {
    id: 4351,
    name: "Muspel's Wyrm",
    manaCost: 7,
    attack: 5,
    health: 6,
    description: "Battlecry: Deal 2 damage to all enemy minions. Gain +1 Attack for each minion destroyed.",
    flavorText: "A dragon born of Muspelheim's eternal flames, growing mightier with each soul consumed.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Dragon",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage_and_scale",
      targetType: "enemy_minions",
      value: 2
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'burn',
      targetType: 'target'
    },
    categories: ["norse_mythology", "fire_legendary"],
    collectible: true
  },
  {
    id: 4352,
    name: "Múspellsmegir, the Fire Titan",
    manaCost: 8,
    attack: 7,
    health: 8,
    description: "Taunt. At the end of your turn, deal 1 damage to all enemies.",
    flavorText: "One of the Sons of Muspel, destined to march at Ragnarök and set the world ablaze.",
    rarity: 'rare',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt"],
    endOfTurn: {
      type: "damage",
      value: 1,
      targetType: "all_enemies"
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'vulnerable',
      targetType: 'target'
    },
    categories: ["norse_mythology", "fire_legendary"],
    collectible: true
  },
  {
    id: 4353,
    name: "Golden War-Boar",
    manaCost: 6,
    attack: 5,
    health: 5,
    description: "Rush. Battlecry: Give a friendly minion +2/+2 and 'Deathrattle: Summon a 2/2 Glóð's Spark.'",
    flavorText: "The golden boar blessed by magic, spreading its flames to allies.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "buff_and_grant_deathrattle",
      targetType: "friendly_minion",
      buffAttack: 2,
      buffHealth: 2,
      summonCardId: 4361,
      requiresTarget: true
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'burn',
      targetType: 'target'
    },
    categories: ["norse_mythology", "fire_legendary"],
    collectible: true
  },
  {
    id: 4354,
    name: "Eldþurs, the Lava Giant",
    manaCost: 9,
    attack: 8,
    health: 8,
    description: "Battlecry: Destroy all frozen minions. Deal 3 damage to the enemy hero for each destroyed.",
    flavorText: "A fire giant from Norse legend, its molten form melts ice and stone alike.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["battlecry"],
    battlecry: {
      type: "destroy_frozen_and_damage",
      targetType: "enemy_minions",
      damagePerMinion: 3
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'burn',
      targetType: 'target'
    },
    categories: ["norse_mythology", "fire_legendary"],
    collectible: true
  },
  {
    id: 4355,
    name: "Sun-Chaser of the Eclipse",
    manaCost: 6,
    attack: 6,
    health: 4,
    description: "Rush. Battlecry: Deal 3 damage to an enemy. If this kills them, gain Immune this turn.",
    flavorText: "The wolf that hunts the sun, swift and merciless.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "conditional_damage",
      targetType: "enemy_character",
      value: 3,
      requiresTarget: true
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'burn',
      targetType: 'target'
    },
    categories: ["norse_mythology", "fire_legendary"],
    collectible: true
  },
];

// ============================================
// EARTH ELEMENT LEGENDARY CREATURES
// ============================================
const earthElementLegendaries: CardData[] = [
  {
    id: 4371,
    name: "Eikthyrnir, the Stag of Valhalla",
    manaCost: 6,
    attack: 5,
    health: 6,
    description: "Taunt. Battlecry: Give adjacent minions +1/+2. When this takes damage, give a random friendly minion +1 Health.",
    flavorText: "The majestic stag of the sacred halls, its presence grants strength to allies.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "buff_adjacent",
      targetType: "adjacent_minions",
      buffAttack: 1,
      buffHealth: 2
    },
    onDamageTaken: {
      type: "heal_random",
      targetType: "random_friendly_minion",
      value: 1
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    },
    categories: ["norse_mythology", "earth_legendary"],
    collectible: true
  },
  {
    id: 4372,
    name: "Fafnir, the Gold-Hoarding Dragon",
    manaCost: 9,
    attack: 8,
    health: 8,
    description: "Taunt. Battlecry: Gain +1/+1 for each card in your hand. Deathrattle: Draw 2 cards.",
    flavorText: "The ancient dragon who guards the golden riches, hoarding wealth and treasures.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Dragon",
    keywords: ["taunt", "battlecry", "deathrattle"],
    battlecry: {
      type: "buff_by_hand_size",
      targetType: "self"
    },
    deathrattle: {
      type: "draw",
      value: 2
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'poison_dot',
      targetType: 'target'
    },
    categories: ["norse_mythology", "earth_legendary"],
    collectible: true
  },
  {
    id: 4373,
    name: "Dvalinn, the Root Stag",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "Taunt. Battlecry: Summon a 1/3 Yggdrasil's Tendril with Taunt for each other friendly minion.",
    flavorText: "Dvalinn, one of the four great stags that gnaw upon Yggdrasil's roots.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "summon_by_condition",
      targetType: "none",
      summonCardId: 4377,
      summonCountCondition: "friendly_minion_count"
    },
    categories: ["norse_mythology", "earth_legendary"],
    collectible: true
  },
  {
    id: 4374,
    name: "Jörð's Guardian",
    manaCost: 8,
    attack: 6,
    health: 10,
    description: "Taunt. At the end of your turn, restore 2 Health to this minion and give it +1 Attack.",
    flavorText: "A guardian blessed by Jörð, the Norse goddess of the earth and mother of Thor.",
    rarity: 'rare',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt"],
    endOfTurn: {
      type: "buff_self_with_heal",
      buffAttack: 1,
      buffHealth: 2
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    },
    categories: ["norse_mythology", "earth_legendary"],
    collectible: true
  },
  {
    id: 4375,
    name: "Élivágar's Beast",
    manaCost: 10,
    attack: 7,
    health: 14,
    description: "Taunt. Battlecry: Restore 5 Health to your hero. At the end of each turn, gain +2 Health.",
    flavorText: "Born from the Élivágar, the eleven primordial rivers that flowed from Niflheim.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "heal_hero",
      targetType: "friendly_hero",
      value: 5
    },
    endOfTurn: {
      type: "buff_self",
      buffAttack: 0,
      buffHealth: 2
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    },
    categories: ["norse_mythology", "earth_legendary"],
    collectible: true
  },
  {
    id: 4376,
    name: "Audhumla, the Primordial Cow",
    manaCost: 8,
    attack: 6,
    health: 8,
    description: "Taunt. At the start of your turn, restore 2 Health to all friendly minions.",
    flavorText: "The first being, whose milk nourished the gods and giants alike.",
    rarity: 'rare',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt"],
    startOfTurn: {
      type: "heal_all",
      targetType: "friendly_minions",
      value: 2
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    },
    categories: ["norse_mythology", "earth_legendary"],
    collectible: true
  },
  {
    id: 4378,
    name: "Duneyrr, the Roaring Stag",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "Battlecry: Deal 2 damage to all enemy minions. When this deals damage, restore 1 Health to all friendly minions.",
    flavorText: "Its roar shakes the World Tree.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage_all",
      targetType: "enemy_minions",
      value: 2
    },
    onDamage: {
      type: "heal_all",
      targetType: "friendly_minions",
      value: 1
    },
    categories: ["norse_mythology", "earth_legendary"],
    collectible: true
  },
  {
    id: 4379,
    name: "Durathror, the Enduring Stag",
    manaCost: 6,
    attack: 5,
    health: 6,
    description: "Taunt. Can't be targeted by spells or Hero Powers. At the start of your turn, gain +1 Health.",
    flavorText: "It stands firm as the roots of Yggdrasil.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "elusive"],
    startOfTurn: {
      type: "buff_self",
      buffAttack: 0,
      buffHealth: 1
    },
    categories: ["norse_mythology", "earth_legendary"],
    collectible: true
  },
];

// ============================================
// HOLY/LIGHT ELEMENT LEGENDARY CREATURES
// ============================================
const holyElementLegendaries: CardData[] = [
  {
    id: 4390,
    name: "Thought-Raven of the Allfather's Raven of Thought",
    manaCost: 4,
    attack: 3,
    health: 3,
    description: "Flying. Battlecry: Draw a card. If Muninn is in play, draw 2 instead.",
    flavorText: "Odin's raven of thought, soaring across the Nine Realms to bring knowledge.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry", "flying"],
    battlecry: {
      type: "draw_conditional",
      targetType: 'none',
      condition: "muninn_in_play",
      value: 1,
      conditionValue: 2
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'marked',
      targetType: 'target'
    },
    categories: ["norse_mythology", "holy_legendary"],
    collectible: true
  },
  {
    id: 4391,
    name: "Memory-Raven of the Allfather's Raven of Memory",
    manaCost: 4,
    attack: 3,
    health: 3,
    description: "Flying. Battlecry: Return a card from your graveyard to your hand. If Huginn is in play, return 2 instead.",
    flavorText: "Odin's raven of memory, carrying the wisdom of all that has come before.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry", "flying"],
    battlecry: {
      type: "resurrect_conditional",
      targetType: "graveyard_card",
      condition: "huginn_in_play",
      value: 1,
      conditionValue: 2,
      requiresTarget: true
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'marked',
      targetType: 'target'
    },
    categories: ["norse_mythology", "holy_legendary"],
    collectible: true
  },
  {
    id: 4395,
    name: "Valkyrie Commander",
    manaCost: 5,
    attack: 4,
    health: 4,
    description: "Battlecry: Give a friendly minion 'Deathrattle: Summon this minion again with 1 Health.'",
    flavorText: "A commander of the Valkyries, granting her warriors eternal resurrection.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: ["battlecry"],
    battlecry: {
      type: "grant_deathrattle_resurrect",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'marked',
      targetType: 'target'
    },
    categories: ["norse_mythology", "holy_legendary"],
    collectible: true
  },
];

// ============================================
// WATER ELEMENT LEGENDARY CREATURES
// ============================================
const waterElementLegendaries: CardData[] = [
  {
    id: 4380,
    name: "Abyssal Kraken",
    manaCost: 9,
    attack: 7,
    health: 9,
    description: "Battlecry: Freeze all enemy minions. At the end of your turn, deal 2 damage to all frozen enemies.",
    flavorText: "The ancient tentacled horror from the abyss, bringing eternal winter wherever it dwells.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "freeze_all",
      targetType: "enemy_minions"
    },
    endOfTurn: {
      type: "damage_frozen",
      targetType: "enemy_minions",
      value: 2
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    },
    categories: ["norse_mythology", "water_legendary"],
    collectible: true
  },
  {
    id: 4381,
    name: "Ísormr, the Frost Serpent",
    manaCost: 6,
    attack: 4,
    health: 6,
    description: "Poisonous. Battlecry: Freeze an enemy. If it's already frozen, destroy it instead.",
    flavorText: "The ice serpent of Niflheim, whose frozen fangs bring eternal winter.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["poisonous", "battlecry"],
    battlecry: {
      type: "freeze_or_destroy",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    },
    categories: ["norse_mythology", "water_legendary"],
    collectible: true
  },
  {
    id: 4383,
    name: "Nokken, the Water Spirit",
    manaCost: 5,
    attack: 3,
    health: 5,
    description: "Stealth. At the start of your turn, transform into a copy of a random enemy minion.",
    flavorText: "The shape-shifting water spirit, taking the form of its enemies to confound them.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["stealth"],
    startOfTurn: {
      type: "transform_random_enemy",
      targetType: "random_enemy_minion"
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'weakness',
      targetType: 'target'
    },
    categories: ["norse_mythology", "water_legendary"],
    collectible: true
  },
  {
    id: 4386,
    name: "Nyk, the Water Horse",
    manaCost: 3,
    attack: 2,
    health: 3,
    description: "Battlecry: Return a minion to its owner's hand. When this returns a minion, deal 1 damage to it.",
    flavorText: "It lures the unwary into the deep.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "bounce_and_damage",
      targetType: "any_minion",
      value: 1,
      requiresTarget: true
    },
    categories: ["norse_mythology", "water_legendary"],
    collectible: true
  },
];

// ============================================
// LIGHTNING ELEMENT LEGENDARY CREATURES
// ============================================
const lightningElementLegendaries: CardData[] = [
  {
    id: 4410,
    name: "Hábrók, the Storm Hawk",
    manaCost: 5,
    attack: 4,
    health: 3,
    description: "Flying. Charge. Has +1 Attack for each other friendly Lightning minion.",
    flavorText: "Hábrók, named 'best of hawks' in Norse lore, rides the storm winds with deadly precision.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["flying", "charge"],
    aura: {
      type: "self_buff_per_ally",
      condition: { element: "lightning" },
      buffAttack: 1,
      buffHealth: 0
    },
    categories: ["norse_mythology", "lightning_legendary"],
    collectible: true
  },
  {
    id: 4411,
    name: "Bygul, Freyja's Swiftclaw",
    manaCost: 5,
    attack: 5,
    health: 3,
    description: "Charge. Each time this minion attacks, it gains +1 Attack permanently.",
    flavorText: "Bygul's speed is unmatched, striking twice before the enemy can blink.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["charge"],
    onAttack: {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    },
    categories: ["norse_mythology", "lightning_legendary"],
    collectible: true
  },
  {
    id: 4412,
    name: "Hraesvelgr, the Wind-Bringer",
    manaCost: 7,
    attack: 5,
    health: 6,
    description: "Flying. Your other Flying minions have +1 Attack. Battlecry: Reduce the Attack of all enemy minions by 2 until end of turn.",
    flavorText: "The eagle whose wings whip the world into a frenzy.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["flying", "battlecry"],
    aura: {
      type: "buff_friendly",
      condition: { keyword: "flying" },
      buffAttack: 1,
      buffHealth: 0
    },
    battlecry: {
      type: "debuff_attack",
      targetType: "enemy_minions",
      value: -2,
      duration: "end_of_turn"
    },
    categories: ["norse_mythology", "lightning_legendary"],
    collectible: true
  },
  {
    id: 4413,
    name: "Stormcaller Wyvern",
    manaCost: 7,
    attack: 5,
    health: 5,
    description: "Flying. Battlecry: Deal 3 damage to all enemy minions and stun them for one turn. Gains +1 Attack when dealing damage to multiple enemies.",
    flavorText: "A dragon of the skies, its roar summons tempests.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Dragon",
    keywords: ["flying", "battlecry"],
    battlecry: {
      type: "damage_and_stun",
      targetType: "enemy_minions",
      value: 3
    },
    onSurviveDamage: {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    },
    categories: ["norse_mythology", "lightning_legendary"],
    collectible: true
  },
  {
    id: 4414,
    name: "Veðrfölnir's Kin",
    manaCost: 6,
    attack: 5,
    health: 4,
    description: "Flying. Each time this minion attacks, reduce the cost of your next spell by 1.",
    flavorText: "Kin to Veðrfölnir, the hawk perched between the eyes of the eagle atop Yggdrasil.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["flying"],
    onAttack: {
      type: "reduce_spell_cost",
      value: 1,
      duration: "next_spell"
    },
    categories: ["norse_mythology", "lightning_legendary"],
    collectible: true
  },
  {
    id: 4415,
    name: "Trjegul, Freyja's Stormpouncer",
    manaCost: 4,
    attack: 4,
    health: 4,
    description: "Charge. Whenever this minion attacks, deal 2 damage to all enemy minions.",
    flavorText: "Trjegul's strength surges like a tempest, overwhelming its foes.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["charge"],
    onAttack: {
      type: "damage_all",
      targetType: "enemy_minions",
      value: 2
    },
    categories: ["norse_mythology", "lightning_legendary"],
    collectible: true
  },
  {
    id: 4416,
    name: "Tanngrisnir, the Charging Goat",
    manaCost: 4,
    attack: 3,
    health: 3,
    description: "Charge. When this minion attacks, deal 1 damage to all enemy minions.",
    flavorText: "Tanngrisnir charges into battle, its hooves sparking with lightning.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["charge"],
    onAttack: {
      type: "damage_all",
      targetType: "enemy_minions",
      value: 1
    },
    categories: ["norse_mythology", "lightning_legendary"],
    collectible: true
  },
  {
    id: 4417,
    name: "Tanngnjostr, the Summoning Goat",
    manaCost: 5,
    attack: 2,
    health: 4,
    description: "Battlecry: Summon a 2/2 Goat with Charge. Whenever you summon a minion with Charge, give it +1 Health.",
    flavorText: "Tanngnjostr calls upon its kin, bolstering the ranks with thunderous allies.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "summon",
      targetType: 'none',
      summonCardId: 4418,
      summonCount: 1
    },
    onSummon: {
      type: "buff_summoned",
      condition: { keyword: "charge" },
      buffAttack: 0,
      buffHealth: 1
    },
    categories: ["norse_mythology", "lightning_legendary"],
    collectible: true
  },
];

// ============================================
// FIRE ELEMENT MINIONS (Basic Pets)
// ============================================
const fireMinions: CardData[] = [
  {
    id: 5000,
    name: "Ember Whelp",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Battlecry: Deal 1 damage to an enemy minion.",
    flavorText: "A young spawn of Muspelheim, spitting sparks with glee.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage",
      targetType: "enemy_minion",
      value: 1,
      requiresTarget: true
    },
    categories: ["norse_mythology", "fire_minion"],
    collectible: true
  },
];

// ============================================
// DARK ELEMENT MINIONS
// ============================================
const darkMinions: CardData[] = [
  {
    id: 5400,
    name: "Helhest, the Death Mare",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Stealth. Battlecry: Deal 1 damage to an enemy minion.",
    flavorText: "The three-legged horse of Norse legend that carries souls to Hel's domain.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["stealth", "battlecry"],
    battlecry: {
      type: "damage",
      targetType: "enemy_minion",
      value: 1,
      requiresTarget: true
    },
    categories: ["norse_mythology", "dark_minion", "dark_common"],
    collectible: true
  },
  {
    id: 5401,
    name: "Myrkrkló",
    manaCost: 3,
    attack: 2,
    health: 3,
    description: "Battlecry: Reduce an enemy minion's Attack by 2 this turn.",
    flavorText: "The darkness claw, a creature born of Niflheim's eternal night.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "debuff",
      targetType: "enemy_minion",
      debuffAttack: -2,
      duration: "this_turn",
      requiresTarget: true
    },
    categories: ["norse_mythology", "dark_minion", "dark_common"],
    collectible: true
  },
  {
    id: 5402,
    name: "Garmr's Pup",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Battlecry: Deal 1 damage to an enemy minion and reduce its Attack by 1 this turn.",
    flavorText: "A young pup of the Hellhound, learning the ways of darkness.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "compound",
      targetType: "enemy_minion",
      effects: [
        { type: "damage", value: 1 },
        { type: "debuff", debuffAttack: -1, duration: "this_turn" }
      ],
      requiresTarget: true
    },
    categories: ["norse_mythology", "dark_minion", "dark_common"],
    collectible: true
  },
  {
    id: 5403,
    name: "Náströnd's Serpent",
    manaCost: 4,
    attack: 3,
    health: 4,
    description: "Poisonous. Battlecry: Deal 2 damage to an enemy minion and apply Poison (1 damage at end of turn).",
    flavorText: "A serpent from Náströnd, the shore of corpses where Níðhöggr gnaws upon the dead.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["poisonous", "battlecry"],
    battlecry: {
      type: "compound",
      targetType: "enemy_minion",
      effects: [
        { type: "damage", value: 2 },
        { type: "apply_debuff", debuffType: "poison", damagePerTurn: 1 }
      ],
      requiresTarget: true
    },
    categories: ["norse_mythology", "dark_minion", "dark_rare"],
    collectible: true
  },
  {
    id: 5404,
    name: "Hel's Stallion",
    manaCost: 5,
    attack: 4,
    health: 4,
    description: "Stealth. Passive: When attacking from Stealth, deal 1 extra damage. Battlecry: Deal 3 damage to an enemy.",
    flavorText: "The steed of Hel herself, galloping forth from the realm of the dead.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["stealth", "battlecry"],
    passive: {
      type: "stealth_bonus_damage",
      condition: "attacking_from_stealth",
      bonusDamage: 1
    },
    battlecry: {
      type: "damage",
      targetType: "enemy",
      value: 3,
      requiresTarget: true
    },
    categories: ["norse_mythology", "dark_minion", "dark_legendary"],
    collectible: true
  },
  {
    id: 5405,
    name: "Voidfang",
    manaCost: 6,
    attack: 4,
    health: 5,
    description: "When this attacks, reduce the target's Attack by 1 permanently. Battlecry: Destroy an enemy minion with 2 or less Attack.",
    flavorText: "A beast of the abyss, devouring light itself.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    onAttack: {
      type: "debuff",
      targetType: "attack_target",
      debuffAttack: -1,
      duration: "permanent"
    },
    battlecry: {
      type: "destroy",
      targetType: "enemy_minion",
      attackThreshold: 2,
      requiresTarget: true
    },
    categories: ["norse_mythology", "dark_minion", "dark_legendary"],
    collectible: true
  },
  {
    id: 5406,
    name: "Garmr's Howl",
    manaCost: 5,
    attack: 4,
    health: 4,
    description: "When this attacks, reduce target's Attack by 1. Passive: When this reduces Attack, deal 1 damage to all enemies. Battlecry: Deal 2 damage to all enemies.",
    flavorText: "The howl of Hel's guardian echoes across the battlefield.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    onAttack: {
      type: "debuff",
      targetType: "attack_target",
      debuffAttack: -1
    },
    passive: {
      type: "on_attack_reduce",
      effect: {
        type: "damage",
        targetType: "all_enemies",
        value: 1
      }
    },
    battlecry: {
      type: "damage_all",
      targetType: "all_enemies",
      value: 2
    },
    categories: ["norse_mythology", "dark_minion", "dark_legendary"],
    collectible: true
  },
];

// ============================================
// LIGHT ELEMENT MINIONS
// ============================================
const lightMinions: CardData[] = [
  {
    id: 5500,
    name: "Álfheimr's Light",
    manaCost: 1,
    attack: 1,
    health: 2,
    description: "Battlecry: Restore 2 Health to a friendly minion.",
    flavorText: "A guiding light from Álfheimr, the realm of the light elves.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["battlecry"],
    battlecry: {
      type: "heal",
      targetType: "friendly_minion",
      value: 2,
      requiresTarget: true
    },
    categories: ["norse_mythology", "light_minion", "light_common"],
    collectible: true
  },
  {
    id: 5501,
    name: "Valkyrie Pegasus",
    manaCost: 5,
    attack: 4,
    health: 4,
    description: "Charge. When this attacks, give a friendly minion +1 Attack.",
    flavorText: "A divine steed that carries warriors to glory.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["charge"],
    onAttack: {
      type: "buff",
      targetType: "random_friendly_minion",
      buffAttack: 1,
      buffHealth: 0
    },
    categories: ["norse_mythology", "light_minion", "light_common"],
    collectible: true
  },
  {
    id: 5502,
    name: "Dáinn's Glow",
    manaCost: 4,
    attack: 3,
    health: 5,
    description: "Taunt. Battlecry: Restore 3 Health to this minion.",
    flavorText: "The radiant spirit of Dáinn, one of the four stags that feast upon Yggdrasil.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "heal_self",
      targetType: "none",
      value: 3
    },
    categories: ["norse_mythology", "light_minion", "light_rare"],
    collectible: true
  },
  {
    id: 5503,
    name: "Ljósálfr",
    manaCost: 4,
    attack: 3,
    health: 4,
    description: "Start of turn: Restore 1 Health to all friendly minions. Battlecry: Give all friendly minions +2 Health this turn.",
    flavorText: "A light elf of Álfheimr, whose radiance brings hope to all who witness it.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["battlecry"],
    startOfTurn: {
      type: "heal_all",
      targetType: "friendly_minions",
      value: 1
    },
    battlecry: {
      type: "buff_temporary_all",
      targetType: "friendly_minions",
      buffAttack: 0,
      buffHealth: 2,
      duration: "this_turn"
    },
    categories: ["norse_mythology", "light_minion", "light_legendary"],
    collectible: true
  },
];

// ============================================
// NEUTRAL MINIONS
// ============================================
const neutralMinions: CardData[] = [
  {
    id: 5550,
    name: "Stone Pup",
    manaCost: 2,
    attack: 1,
    health: 3,
    description: "Taunt. Battlecry: Gain +2 Health this turn.",
    flavorText: "A rocky cub, steadfast and unyielding.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "buff_temporary_self",
      targetType: "none",
      buffAttack: 0,
      buffHealth: 2,
      duration: "this_turn"
    },
    categories: ["norse_mythology", "neutral_minion", "neutral_common"],
    collectible: true
  },
  {
    id: 5551,
    name: "Mistfang Pup",
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "Battlecry: If you control another Beast, gain +1/+1.",
    flavorText: "A young wolf, strengthened by its pack.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "conditional_buff_self",
      targetType: "none",
      condition: "control_another_beast",
      buffAttack: 1,
      buffHealth: 1
    },
    categories: ["norse_mythology", "neutral_minion", "neutral_common"],
    collectible: true
  },
  {
    id: 5552,
    name: "Stonebleat Buckling",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Battlecry: If you control another Beast, gain Taunt.",
    flavorText: "A young goat, bracing itself to protect the herd.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "conditional_grant_keyword",
      targetType: "none",
      condition: "control_another_beast",
      keyword: "taunt"
    },
    categories: ["norse_mythology", "neutral_minion", "neutral_common"],
    collectible: true
  },
  {
    id: 5553,
    name: "Trollhound",
    manaCost: 4,
    attack: 4,
    health: 3,
    description: "Battlecry: If you control a Beast, gain +1/+1.",
    flavorText: "A fierce hound that hunts alongside trolls.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "conditional_buff_self",
      targetType: "none",
      condition: "control_beast",
      buffAttack: 1,
      buffHealth: 1
    },
    categories: ["norse_mythology", "neutral_minion", "neutral_common"],
    collectible: true
  },
  {
    id: 5554,
    name: "Runeclaw Wolf",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Battlecry: Give a friendly Beast +1/+1.",
    flavorText: "A wolf marked with ancient runes, empowering its pack.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff",
      targetType: "friendly_minion",
      targetRace: "beast",
      buffAttack: 1,
      buffHealth: 1,
      requiresTarget: true
    },
    categories: ["norse_mythology", "neutral_minion", "neutral_common"],
    collectible: true
  },
  {
    id: 5555,
    name: "Iron Boar",
    manaCost: 4,
    attack: 4,
    health: 4,
    description: "Rush. Battlecry: Gain +2 Attack this turn.",
    flavorText: "A beast of metal and might, forged in the earth's core.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "buff_temporary_self",
      targetType: "none",
      buffAttack: 2,
      buffHealth: 0,
      duration: "this_turn"
    },
    categories: ["norse_mythology", "neutral_minion", "neutral_rare"],
    collectible: true
  },
  {
    id: 5556,
    name: "Hræsvelgr's Kin",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Flying. Battlecry: Deal 2 damage to an enemy minion with 2 or less Health.",
    flavorText: "Kin to Hræsvelgr, the giant eagle whose wings create the world's winds.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["flying", "battlecry"],
    battlecry: {
      type: "damage_conditional",
      targetType: "enemy_minion",
      value: 2,
      healthThreshold: 2,
      requiresTarget: true
    },
    categories: ["norse_mythology", "neutral_minion", "neutral_rare"],
    collectible: true
  },
  {
    id: 5557,
    name: "Ironhide Sow",
    manaCost: 6,
    attack: 5,
    health: 6,
    description: "Taunt. Can't be targeted by spells or Hero Powers.",
    flavorText: "A massive boar with iron-hard hide, impervious to magic.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "elusive"],
    categories: ["norse_mythology", "neutral_minion", "neutral_rare"],
    collectible: true
  },
  {
    id: 5558,
    name: "Granite Hound",
    manaCost: 5,
    attack: 3,
    health: 6,
    description: "Taunt. Passive: When attacked, reduce damage taken by 1. Battlecry: Gain +3 Health this turn.",
    flavorText: "A guardian of stone, its bark is as hard as its bite.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "battlecry"],
    passive: {
      type: "damage_reduction",
      value: 1
    },
    battlecry: {
      type: "buff_temporary_self",
      targetType: "none",
      buffAttack: 0,
      buffHealth: 3,
      duration: "this_turn"
    },
    categories: ["norse_mythology", "neutral_minion", "neutral_legendary"],
    collectible: true
  },
];

// ============================================
// GREEK/NORDIC LEGENDARY CREATURES
// ============================================
const greekLegendaries: CardData[] = [
  {
    id: 4400,
    name: "Skinfaxi, the Day Horse",
    manaCost: 3,
    attack: 3,
    health: 2,
    description: "Battlecry: Give a minion +2 Attack until end of turn. At the start of your turn, give a random friendly minion +1 Attack.",
    flavorText: "The horse whose mane brings the light of day, empowering allies at dawn.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff_temporary",
      targetType: "any_minion",
      buffAttack: 2,
      buffHealth: 0,
      duration: "this_turn",
      requiresTarget: true
    },
    startOfTurn: {
      type: "buff",
      targetType: "random_friendly_minion",
      buffAttack: 1,
      buffHealth: 0
    },
    categories: ["norse_mythology", "greek_legendary"],
    collectible: true
  },
  {
    id: 4401,
    name: "Hildisvini, Freyja's Boar",
    manaCost: 4,
    attack: 3,
    health: 4,
    description: "Battlecry: Restore 5 Health to your hero. When this restores health to your hero, give a random friendly minion +1/+1.",
    flavorText: "Freyja's loyal companion, bringing warmth and blessings to all allies.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "heal_hero",
      targetType: "friendly_hero",
      value: 5
    },
    passive: {
      type: "on_hero_heal",
      effect: {
        type: "buff",
        targetType: "random_friendly_minion",
        buffAttack: 1,
        buffHealth: 1
      }
    },
    categories: ["norse_mythology", "greek_legendary"],
    collectible: true
  },
  {
    id: 4402,
    name: "Huldra, the Forest Spirit",
    manaCost: 6,
    attack: 4,
    health: 5,
    description: "Battlecry: Force an enemy minion to attack an adjacent ally. When an enemy minion attacks this and survives, reduce its Attack by 1 permanently.",
    flavorText: "A beguiling spirit of the forest, her charm leads enemies to their doom.",
    rarity: "epic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["battlecry"],
    battlecry: {
      type: "force_attack_adjacent",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    passive: {
      type: "on_attacked_survive",
      effect: {
        type: "debuff",
        targetType: "attacker",
        debuffAttack: -1,
        permanent: true
      }
    },
    categories: ["norse_mythology", "greek_legendary"],
    collectible: true
  },
  {
    id: 4403,
    name: "Vedrfolnir, the Sky Hawk",
    manaCost: 4,
    attack: 3,
    health: 4,
    description: "Flying. Battlecry: Look at the top 3 cards of your deck. Draw one. When you draw a card, give a random friendly minion +1 Attack.",
    flavorText: "The hawk perched atop the World Tree, seeing all that unfolds.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry", "flying"],
    battlecry: {
      type: "discover",
      targetType: 'none',
      discoverCount: 3,
      discoverSource: "deck_top"
    },
    passive: {
      type: "on_draw",
      effect: {
        type: "buff",
        targetType: "random_friendly_minion",
        buffAttack: 1,
        buffHealth: 0
      }
    },
    categories: ["norse_mythology", "greek_legendary"],
    collectible: true
  },
  {
    id: 4404,
    name: "Gullinkambi, the Ragnarok Rooster",
    manaCost: 2,
    attack: 1,
    health: 1,
    description: "Deathrattle: If you have 7 minions, deal 5 damage to the enemy hero. At the end of your turn, if you have 7 minions, deal 1 damage to the enemy hero.",
    flavorText: "The golden rooster whose crow heralds the end of days.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["deathrattle"],
    deathrattle: {
      type: "damage_conditional",
      targetType: "enemy_hero",
      value: 5,
      condition: "minion_count_7"
    },
    endOfTurn: {
      type: "damage_conditional",
      targetType: "enemy_hero",
      value: 1,
      condition: "minion_count_7"
    },
    categories: ["norse_mythology", "greek_legendary"],
    collectible: true
  },
  {
    id: 4405,
    name: "Heidrun, the Mead Goat",
    manaCost: 4,
    attack: 3,
    health: 4,
    description: "At the end of your turn, restore 2 Health to all friendly minions. When a friendly minion is healed, it gains +1 Health permanently.",
    flavorText: "The goat whose mead sustains the gods, granting vigor to all.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: [],
    endOfTurn: {
      type: "heal_all",
      targetType: "friendly_minions",
      value: 2
    },
    passive: {
      type: "on_friendly_heal",
      effect: {
        type: "buff",
        targetType: "healed_minion",
        buffAttack: 0,
        buffHealth: 1,
        permanent: true
      }
    },
    categories: ["norse_mythology", "greek_legendary"],
    collectible: true
  },
  {
    id: 4406,
    name: "Hrímfaxi, the Night Horse",
    manaCost: 3,
    attack: 2,
    health: 3,
    description: "Battlecry: Give a minion Stealth until your next turn. At the end of your turn, if you have a minion with Stealth, draw a card.",
    flavorText: "The horse whose mane drips with dew, shrouding allies in night's embrace.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "grant_stealth_temporary",
      targetType: "any_minion",
      duration: "until_next_turn",
      requiresTarget: true
    },
    endOfTurn: {
      type: "draw_conditional",
      condition: "has_stealthed_minion",
      value: 1
    },
    categories: ["norse_mythology", "greek_legendary"],
    collectible: true
  },
];

// ============================================
// EXPORT: Combined Norse Mythology Cards
// ============================================
export const norseMythologyCards: CardData[] = [
  ...norseGods,
  ...norseLegendaryCreatures,
  ...fireElementLegendaries,
  ...earthElementLegendaries,
  ...holyElementLegendaries,
  ...waterElementLegendaries,
  ...lightningElementLegendaries,
  ...fireMinions,
  ...darkMinions,
  ...lightMinions,
  ...neutralMinions,
  ...greekLegendaries,
  ...(norseArtifacts as unknown as CardData[]),
  ...(norseArmorCards as unknown as CardData[]),
];

export default norseMythologyCards;
