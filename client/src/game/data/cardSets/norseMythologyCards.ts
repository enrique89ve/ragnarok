/**
 * Norse Mythology Cards
 * 
 * A collection of cards inspired by Norse mythology.
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';
import { CardData } from '../../types';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Static definition of Norse mythology cards for inclusion in the card database
 * This array is used by the deck builder and other components that need direct access to card data
 */
export const norseMythologyCards: CardData[] = [
  // Jormungandr - The World Serpent
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
        {
          type: "destroy",
          targetType: "specific_minion_type",
          specificCardId: 20621
        },
        {
          type: "damage",
          targetType: "enemy_minions",
          value: 2
        }
      ]
    },
    categories: ["norse_mythology"],
    collectible: true
  },
  
  // Jormungandr's Coil - Token
  {
    id: 20621,
    name: "Jormungandr's Coil",
    manaCost: 2,
    attack: 0,
    health: 5,
    description: "At the end of your turn, deal 1 damage to all enemy minions.",
    flavorText: "Each coil tightens, bringing inevitable doom closer.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    endOfTurn: {
      type: "damage",
      value: 1,
      targetType: "enemy_minions"
    },
    categories: ["norse_mythology", "token"],
    collectible: false
  },

  // ===== DARK MYTHIC CREATURES =====

  // Gleipnir's Captive
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
    categories: ["norse_mythology", "dark_mythic"],
    collectible: true
  },

  // Garm, the Hellhound
  {
    id: 4301,
    name: "Garm, the Hellhound",
    manaCost: 7,
    attack: 5,
    health: 6,
    description: "Taunt. Battlecry: Revive a random friendly minion that died this game with +1/+1. When a friendly minion dies, summon a 2/2 Shadow Hound with Taunt.",
    flavorText: "The ferocious guard dog of Hel's gates.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "dark_mythic"],
    collectible: true
  },

  // Moon-Devourer Wolf
  {
    id: 4302,
    name: "Moon-Devourer Wolf",
    manaCost: 6,
    attack: 5,
    health: 5,
    description: "Stealth. Battlecry: Deal 1 damage to all enemy minions. At the end of your turn, if this has Stealth, give another random friendly minion Stealth.",
    flavorText: "The wolf that stalks the moon, bringing eternal night.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "dark_mythic"],
    collectible: true
  },

  // Root-Gnawer of Yggdrasil
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
    categories: ["norse_mythology", "dark_mythic"],
    collectible: true
  },

  // Shadowmaw Alpha
  {
    id: 4304,
    name: "Shadowmaw Alpha",
    manaCost: 6,
    attack: 4,
    health: 4,
    description: "Stealth. Battlecry: Summon two 2/2 Shadow Wolves with Stealth. Whenever you summon a Shadow Wolf, give it +1/+1.",
    flavorText: "The leader of the pack, its howl commands the night.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "dark_mythic"],
    collectible: true
  },

  // Shadowmaw Direwolf
  {
    id: 4305,
    name: "Shadowmaw Direwolf",
    manaCost: 7,
    attack: 6,
    health: 6,
    description: "Stealth. Battlecry: Destroy an enemy minion with 4 or less Attack and summon a 3/3 Shadow Wolf in its place. After this attacks and kills a minion, summon a 1/1 Shadow Pup with Stealth.",
    flavorText: "A pack leader of the night, its jaws claim the weak.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "dark_mythic"],
    collectible: true
  },

  // ===== MYTHOLOGICAL MYTHIC CREATURES =====

  // Hafgufa, the Sea-Mist
  {
    id: 4320,
    name: "Hafgufa, the Sea-Mist",
    manaCost: 10,
    attack: 7,
    health: 9,
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // Briareos, the Hundred-Armed
  {
    id: 4321,
    name: "Briareos, the Hundred-Armed",
    manaCost: 10,
    attack: 8,
    health: 10,
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // Typhon's Brood
  {
    id: 4322,
    name: "Typhon's Brood",
    manaCost: 9,
    attack: 7,
    health: 8,
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // Mánagarm, the Blood Moon
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // Ladon, the Hundred-Eyed
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // Viðófnir, the Tree Guardian
  {
    id: 4325,
    name: "Viðófnir, the Tree Guardian",
    manaCost: 8,
    attack: 5,
    health: 9,
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // Vánagand, the Eclipse Dragon
  {
    id: 4326,
    name: "Vánagand, the Eclipse Dragon",
    manaCost: 9,
    attack: 6,
    health: 8,
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // Lernaean Flame
  {
    id: 4327,
    name: "Lernaean Flame",
    manaCost: 8,
    attack: 6,
    health: 7,
    description: "Whenever this attacks, deal 2 damage to all enemies. After this survives damage, gain +1 Attack.",
    flavorText: "A fiery incarnation of the Lernaean Hydra, each severed head regrows stronger than before.",
    rarity: 'rare',
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // Draugr, the Deathless Hunger
  {
    id: 4328,
    name: "Draugr, the Deathless Hunger",
    manaCost: 7,
    attack: 6,
    health: 6,
    description: "Lifesteal. Whenever a minion dies, gain +1 Attack. After this kills a minion, gain Stealth until your next turn.",
    flavorText: "An undead Norse revenant, cursed to walk between worlds with an insatiable hunger for the living.",
    rarity: 'rare',
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // World-Rending Terror
  {
    id: 4329,
    name: "World-Rending Terror",
    manaCost: 8,
    attack: 6,
    health: 9,
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // Stheno, the Stone-Gazer
  {
    id: 4330,
    name: "Stheno, the Stone-Gazer",
    manaCost: 6,
    attack: 6,
    health: 6,
    description: "At the end of your turn, Freeze a random enemy minion. Whenever this attacks a Frozen minion, destroy it.",
    flavorText: "The immortal Gorgon sister whose gaze turns all who meet her eyes to cold, unmoving stone.",
    rarity: 'rare',
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
    categories: ["norse_mythology", "mythological_mythic"],
    collectible: true
  },

  // ===== DARK MYTHIC TOKEN CARDS =====

  // Shadow Hound (token for Garm)
  {
    id: 4310,
    name: "Shadow Hound",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Taunt",
    flavorText: "Bound to serve the guardian of Hel's gates.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt"],
    categories: ["norse_mythology", "token"],
    collectible: false
  },

  // Shadow Wolf (token for Shadowmaw Alpha)
  {
    id: 4311,
    name: "Shadow Wolf",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Stealth",
    flavorText: "A wolf born of shadow, loyal to the Alpha.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["stealth"],
    categories: ["norse_mythology", "token"],
    collectible: false
  },

  // Shadow Wolf 3/3 (token for Shadowmaw Direwolf battlecry)
  {
    id: 4312,
    name: "Shadow Wolf",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Stealth",
    flavorText: "Emerges from the darkness to claim the weak.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["stealth"],
    categories: ["norse_mythology", "token"],
    collectible: false
  },

  // Shadow Pup (token for Shadowmaw Direwolf on-kill)
  {
    id: 4313,
    name: "Shadow Pup",
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "Stealth",
    flavorText: "A tiny predator, eager to grow into a wolf.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["stealth"],
    categories: ["norse_mythology", "token"],
    collectible: false
  },

  // Ginnungagap's Fury (token for Typhon's Brood)
  {
    id: 4340,
    name: "Ginnungagap's Fury",
    manaCost: 0,
    attack: 0,
    health: 3,
    description: "At the end of each turn, deal 2 damage to ALL characters.",
    flavorText: "The raw fury of Ginnungagap, the primordial void from which all Norse creation emerged.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    endOfTurn: {
      type: "damage",
      value: 2,
      targetType: "all_characters"
    },
    categories: ["norse_mythology", "token"],
    collectible: false
  },

  // ===== FIRE ELEMENT MYTHIC CREATURES =====

  // Muspel's Wyrm
  {
    id: 4351,
    name: "Muspel's Wyrm",
    manaCost: 7,
    attack: 5,
    health: 6,
    description: "Battlecry: Deal 2 damage to all enemy minions. Gain +1 Attack for each minion destroyed.",
    flavorText: "A dragon born of Muspelheim's eternal flames, growing mightier with each soul consumed.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "fire_mythic"],
    collectible: true
  },

  // Múspellsmegir, the Fire Titan
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
    categories: ["norse_mythology", "fire_mythic"],
    collectible: true
  },

  // Golden War-Boar
  {
    id: 4353,
    name: "Golden War-Boar",
    manaCost: 6,
    attack: 5,
    health: 5,
    description: "Rush. Battlecry: Give a friendly minion +2/+2 and 'Deathrattle: Summon a 2/2 Glóð's Spark.'",
    flavorText: "The golden boar blessed by magic, spreading its flames to allies.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "fire_mythic"],
    collectible: true
  },

  // Eldþurs, the Lava Giant
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
    categories: ["norse_mythology", "fire_mythic"],
    collectible: true
  },

  // Sun-Chaser of the Eclipse
  {
    id: 4355,
    name: "Sun-Chaser of the Eclipse",
    manaCost: 6,
    attack: 6,
    health: 4,
    description: "Rush. Battlecry: Deal 3 damage to an enemy. If this kills them, gain Immune this turn.",
    flavorText: "The wolf that hunts the sun, swift and merciless.",
    rarity: 'epic',
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
      statusEffect: 'paralysis',
      targetType: 'target'
    },
    categories: ["norse_mythology", "fire_mythic"],
    collectible: true
  },

  // Glóð's Spark (token for Gullinbursti)
  {
    id: 4361,
    name: "Glóð's Spark",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "A small sprite of pure flame.",
    flavorText: "A spark from Glóð, the Norse goddess of embers and glowing coals.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    categories: ["norse_mythology", "fire_mythic", "token"],
    collectible: false
  },

  // ===== EARTH/GRASS ELEMENT MYTHIC CREATURES =====

  // Eikthyrnir, the Stag of Valhalla
  {
    id: 4371,
    name: "Eikthyrnir, the Stag of Valhalla",
    manaCost: 6,
    attack: 5,
    health: 6,
    description: "Taunt. Battlecry: Give adjacent minions +1/+2. When this takes damage, give a random friendly minion +1 Health.",
    flavorText: "The majestic stag of the sacred halls, its presence grants strength to allies.",
    rarity: 'epic',
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
      statusEffect: 'poison_dot',
      targetType: 'target'
    },
    categories: ["norse_mythology", "earth_mythic"],
    collectible: true
  },

  // Fafnir, the Gold-Hoarding Dragon
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
      statusEffect: 'marked',
      targetType: 'target'
    },
    categories: ["norse_mythology", "earth_mythic"],
    collectible: true
  },

  // Dvalinn, the Root Stag
  {
    id: 4373,
    name: "Dvalinn, the Root Stag",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "Taunt. Battlecry: Summon a 1/3 Yggdrasil's Tendril with Taunt for each other friendly minion.",
    flavorText: "Dvalinn, one of the four great stags that gnaw upon Yggdrasil's roots.",
    rarity: 'epic',
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
    onAttack: {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    },
    categories: ["norse_mythology", "earth_mythic"],
    collectible: true
  },

  // Jörð's Guardian
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
    categories: ["norse_mythology", "earth_mythic"],
    collectible: true
  },

  // Élivágar's Beast
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
    categories: ["norse_mythology", "earth_mythic"],
    collectible: true
  },

  // Yggdrasil's Tendril (token for Dvalinn, the Root Stag)
  {
    id: 4377,
    name: "Yggdrasil's Tendril",
    manaCost: 1,
    attack: 1,
    health: 3,
    description: "Taunt",
    flavorText: "A living tendril of the World Tree, reaching out to ensnare all who draw near.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: ["taunt"],
    categories: ["norse_mythology", "earth_mythic", "token"],
    collectible: false
  },

  // Audhumla, the Primordial Cow
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
    categories: ["norse_mythology", "earth_mythic"],
    collectible: true
  },

  // Duneyrr, the Roaring Stag
  {
    id: 4378,
    name: "Duneyrr, the Roaring Stag",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "Battlecry: Deal 2 damage to all enemy minions. When this deals damage, restore 1 Health to all friendly minions.",
    flavorText: "Its roar shakes the World Tree.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "earth_mythic"],
    collectible: true
  },

  // Durathror, the Enduring Stag
  {
    id: 4379,
    name: "Durathror, the Enduring Stag",
    manaCost: 6,
    attack: 5,
    health: 6,
    description: "Taunt. Can't be targeted by spells or Hero Powers. At the start of your turn, gain +1 Health.",
    flavorText: "It stands firm as the roots of Yggdrasil.",
    rarity: 'rare',
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
    categories: ["norse_mythology", "earth_mythic"],
    collectible: true
  },

  // ===== HOLY/LIGHT ELEMENT MYTHIC CREATURES =====

  // Huginn, Odin's Raven of Thought
  {
    id: 4390,
    name: "Huginn, Odin's Raven of Thought",
    manaCost: 4,
    attack: 3,
    health: 3,
    description: "Flying. Battlecry: Draw a card. If Muninn is in play, draw 2 instead.",
    flavorText: "Odin's raven of thought, soaring across the Nine Realms to bring knowledge.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "holy_mythic"],
    collectible: true
  },

  // Muninn, Odin's Raven of Memory
  {
    id: 4391,
    name: "Muninn, Odin's Raven of Memory",
    manaCost: 4,
    attack: 3,
    health: 3,
    description: "Flying. Battlecry: Return a card from your graveyard to your hand. If Huginn is in play, return 2 instead.",
    flavorText: "Odin's raven of memory, carrying the wisdom of all that has come before.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "holy_mythic"],
    collectible: true
  },

  // Baldur, God of Light
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
    categories: ["norse_mythology", "holy_mythic"],
    collectible: true
  },

  // Sol, the Sun Goddess
  {
    id: 4393,
    name: "Echo of the Sun Goddess",
    manaCost: 6,
    attack: 4,
    health: 5,
    description: "At the start of your turn, restore 2 Health to all friendly characters and deal 1 damage to all enemies.",
    flavorText: "The sun goddess whose warmth heals the faithful and burns the wicked.",
    rarity: 'rare',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    keywords: [],
    startOfTurn: {
      type: "compound",
      effects: [
        {
          type: "heal_all",
          targetType: "friendly_characters",
          value: 2
        },
        {
          type: "damage",
          targetType: "all_enemies",
          value: 1
        }
      ]
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'burn',
      targetType: 'target'
    },
    categories: ["norse_mythology", "holy_mythic"],
    collectible: true
  },

  // Heimdall, Guardian of Bifrost
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
    categories: ["norse_mythology", "holy_mythic"],
    collectible: true
  },

  // Valkyrie Commander
  {
    id: 4395,
    name: "Valkyrie Commander",
    manaCost: 5,
    attack: 4,
    health: 4,
    description: "Battlecry: Give a friendly minion 'Deathrattle: Summon this minion again with 1 Health.'",
    flavorText: "A commander of the Valkyries, granting her warriors eternal resurrection.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "holy_mythic"],
    collectible: true
  },

  // ===== WATER ELEMENT MYTHIC CREATURES =====

  // Abyssal Kraken
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
    categories: ["norse_mythology", "water_mythic"],
    collectible: true
  },

  // Ísormr, the Frost Serpent
  {
    id: 4381,
    name: "Ísormr, the Frost Serpent",
    manaCost: 6,
    attack: 4,
    health: 6,
    description: "Poisonous. Battlecry: Freeze an enemy. If it's already frozen, destroy it instead.",
    flavorText: "The ice serpent of Niflheim, whose frozen fangs bring eternal winter.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "water_mythic"],
    collectible: true
  },

  // Sovereign of the Drowned
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
    categories: ["norse_mythology", "water_mythic"],
    collectible: true
  },

  // Nokken, the Water Spirit
  {
    id: 4383,
    name: "Nokken, the Water Spirit",
    manaCost: 5,
    attack: 3,
    health: 5,
    description: "Stealth. At the start of your turn, transform into a copy of a random enemy minion.",
    flavorText: "The shape-shifting water spirit, taking the form of its enemies to confound them.",
    rarity: 'rare',
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
    categories: ["norse_mythology", "water_mythic"],
    collectible: true
  },

  // Tidelord of the Abyss
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
    categories: ["norse_mythology", "water_mythic"],
    collectible: true
  },

  // Rán's Thrall (token for Ran, Goddess of the Sea)
  {
    id: 4385,
    name: "Rán's Thrall",
    manaCost: 2,
    attack: 2,
    health: 3,
    description: "Deathrattle: Freeze a random enemy.",
    flavorText: "A soul captured by Rán's net, forever bound to serve the goddess of the drowned.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    deathrattle: {
      type: "freeze_random",
      targetType: "random_enemy_minion"
    },
    categories: ["norse_mythology", "water_mythic", "token"],
    collectible: false
  },

  // Nyk, the Water Horse
  {
    id: 4386,
    name: "Nyk, the Water Horse",
    manaCost: 3,
    attack: 2,
    health: 3,
    description: "Battlecry: Return a minion to its owner's hand. When this returns a minion, deal 1 damage to it.",
    flavorText: "It lures the unwary into the deep.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "water_mythic"],
    collectible: true
  },

  // ===== LIGHTNING ELEMENT MYTHIC CREATURES =====

  // Hábrók, the Storm Hawk
  {
    id: 4410,
    name: "Hábrók, the Storm Hawk",
    manaCost: 5,
    attack: 4,
    health: 3,
    description: "Flying. Charge. Has +1 Attack for each other friendly Lightning minion.",
    flavorText: "Hábrók, named 'best of hawks' in Norse lore, rides the storm winds with deadly precision.",
    rarity: 'rare',
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
    categories: ["norse_mythology", "lightning_mythic"],
    collectible: true
  },

  // Bygul, Freyja's Swiftclaw
  {
    id: 4411,
    name: "Bygul, Freyja's Swiftclaw",
    manaCost: 4,
    attack: 5,
    health: 3,
    description: "Charge. Each time this minion attacks, it gains +1 Attack permanently.",
    flavorText: "Bygul's speed is unmatched, striking twice before the enemy can blink.",
    rarity: 'common',
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
    categories: ["norse_mythology", "lightning_mythic"],
    collectible: true
  },

  // Hraesvelgr, the Wind-Bringer
  {
    id: 4412,
    name: "Hraesvelgr, the Wind-Bringer",
    manaCost: 7,
    attack: 5,
    health: 6,
    description: "Flying. Your other Flying minions have +1 Attack. Battlecry: Reduce the Attack of all enemy minions by 2 until end of turn.",
    flavorText: "The eagle whose wings whip the world into a frenzy.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "lightning_mythic"],
    collectible: true
  },

  // Stormcaller Wyvern
  {
    id: 4413,
    name: "Stormcaller Wyvern",
    manaCost: 7,
    attack: 5,
    health: 5,
    description: "Flying. Battlecry: Deal 3 damage to all enemy minions and stun them for one turn. Gains +1 Attack when dealing damage to multiple enemies.",
    flavorText: "A dragon of the skies, its roar summons tempests.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "lightning_mythic"],
    collectible: true
  },

  // Veðrfölnir's Kin
  {
    id: 4414,
    name: "Veðrfölnir's Kin",
    manaCost: 6,
    attack: 5,
    health: 4,
    description: "Flying. Each time this minion attacks, reduce the cost of your next spell by 1.",
    flavorText: "Kin to Veðrfölnir, the hawk perched between the eyes of the eagle atop Yggdrasil.",
    rarity: 'rare',
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
    categories: ["norse_mythology", "lightning_mythic"],
    collectible: true
  },

  // Trjegul, Freyja's Stormpouncer
  {
    id: 4415,
    name: "Trjegul, Freyja's Stormpouncer",
    manaCost: 4,
    attack: 4,
    health: 4,
    description: "Charge. Whenever this minion attacks, deal 2 damage to all enemy minions.",
    flavorText: "Trjegul's strength surges like a tempest, overwhelming its foes.",
    rarity: 'common',
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
    categories: ["norse_mythology", "lightning_mythic"],
    collectible: true
  },

  // Tanngrisnir, the Charging Goat
  {
    id: 4416,
    name: "Tanngrisnir, the Charging Goat",
    manaCost: 4,
    attack: 3,
    health: 3,
    description: "Charge. When this minion attacks, deal 1 damage to all enemy minions.",
    flavorText: "Tanngrisnir charges into battle, its hooves sparking with lightning.",
    rarity: 'common',
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
    categories: ["norse_mythology", "lightning_mythic"],
    collectible: true
  },

  // Tanngnjostr, the Summoning Goat
  {
    id: 4417,
    name: "Tanngnjostr, the Summoning Goat",
    manaCost: 5,
    attack: 2,
    health: 4,
    description: "Battlecry: Summon a 2/2 Goat with Charge. Whenever you summon a minion with Charge, give it +1 Health.",
    flavorText: "Tanngnjostr calls upon its kin, bolstering the ranks with thunderous allies.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "lightning_mythic"],
    collectible: true
  },

  // Charging Goat (token for Tanngnjostr)
  {
    id: 4418,
    name: "Charging Goat",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Charge",
    flavorText: "A loyal companion to Thor's mighty goats.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["charge"],
    categories: ["norse_mythology", "lightning_mythic", "token"],
    collectible: false
  },

  // ===== FIRE MINIONS (Basic Pets) =====

  // Ember Whelp (Basic)
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
    collectible: false
  },

  // Ember Fox (Basic)
  {
    id: 5001,
    name: "Ember Fox",
    manaCost: 2,
    attack: 1,
    health: 3,
    description: "Battlecry: Apply Burn to an enemy minion.",
    flavorText: "A fiery beast from the blazing lands, its tail sparks with embers.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "apply_burn",
      targetType: "enemy_minion",
      requiresTarget: true
    },
    categories: ["norse_mythology", "fire_minion"],
    collectible: false
  },

  // Fire Chick (Basic)
  {
    id: 5002,
    name: "Ember Hatchling",
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "Deathrattle: Summon a 2/2 Phoenix Hatchling.",
    flavorText: "A tiny bird, its feathers flicker with flames. From its ashes, something greater rises.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["deathrattle"],
    deathrattle: {
      type: "summon",
      summonName: "Phoenix Hatchling",
      summonAttack: 2,
      summonHealth: 2
    },
    categories: ["norse_mythology", "fire_minion"],
    collectible: false
  },

  // Magma Imp (Basic)
  {
    id: 5003,
    name: "Magma Imp",
    manaCost: 3,
    attack: 2,
    health: 2,
    description: "Charge. Battlecry: Gain +2 Attack this turn.",
    flavorText: "A mischievous spirit, born in a volcano's heart.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Titan",
    keywords: ["charge", "battlecry"],
    battlecry: {
      type: "buff_self_temporary",
      targetType: 'none',
      buffAttack: 2,
      duration: "this_turn"
    },
    categories: ["norse_mythology", "fire_minion"],
    collectible: false
  },

  // Cinder Whelp (Basic)
  {
    id: 5004,
    name: "Cinder Whelp",
    manaCost: 2,
    attack: 1,
    health: 3,
    description: "Battlecry: Deal 1 damage to all enemy minions.",
    flavorText: "A young flame, eager to engulf the battlefield.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage_all",
      targetType: "enemy_minions",
      value: 1
    },
    categories: ["norse_mythology", "fire_minion"],
    collectible: false
  },

  // Soot Imp (Basic)
  {
    id: 5005,
    name: "Soot Imp",
    manaCost: 2,
    attack: 2,
    health: 3,
    description: "Battlecry: Deal 1 damage to an enemy minion and apply Burn.",
    flavorText: "A tiny fiend from Muspelheim, leaving ashes in its wake.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Titan",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage_and_burn",
      targetType: "enemy_minion",
      value: 1,
      requiresTarget: true
    },
    categories: ["norse_mythology", "fire_minion"],
    collectible: false
  },

  // Flame Raven (Basic)
  {
    id: 5006,
    name: "Flame Raven",
    manaCost: 3,
    attack: 2,
    health: 3,
    description: "Flying. Battlecry: Deal 2 damage to an enemy minion.",
    flavorText: "A bird of cinders, born from the sparks of Ragnarök.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["flying", "battlecry"],
    battlecry: {
      type: "damage",
      targetType: "enemy_minion",
      value: 2,
      requiresTarget: true
    },
    categories: ["norse_mythology", "fire_minion"],
    collectible: false
  },

  // ===== FIRE MINIONS (Standalone Pets - Rare) =====

  // Muspelspawn (Standalone)
  {
    id: 5010,
    name: "Muspelspawn",
    manaCost: 4,
    attack: 4,
    health: 3,
    description: "Rush. Battlecry: Apply Burn to all enemy minions.",
    flavorText: "A molten fiend, its fury melts stone to slag.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "apply_burn_all",
      targetType: "enemy_minions"
    },
    categories: ["norse_mythology", "fire_minion"],
    collectible: false
  },

  // Eldbera, the Flame Bear (Standalone)
  {
    id: 5011,
    name: "Eldbera, the Flame Bear",
    manaCost: 4,
    attack: 4,
    health: 3,
    description: "Rush. Battlecry: Gain +2 Attack this turn.",
    flavorText: "A fierce predator, its claws burn with inner fire.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "buff_self_temporary",
      targetType: 'none',
      buffAttack: 2,
      duration: "this_turn"
    },
    categories: ["norse_mythology", "fire_minion"],
    collectible: false
  },

  // ===== FIRE MINIONS (Evolution Pets - Mythic) =====

  // Surtr's Spawn (Evolution)
  {
    id: 5020,
    name: "Surtr, the Scorched's Spawn",
    manaCost: 5,
    attack: 3,
    health: 5,
    description: "Battlecry: Deal 1 damage to a random enemy. At the end of your turn, deal 1 damage to a random enemy.",
    flavorText: "Born of the fire giant's wrath, it burns all in its path.",
    rarity: "mythic",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage_random",
      targetType: "random_enemy",
      value: 1
    },
    endOfTurn: {
      type: "damage",
      targetType: "random_enemy",
      value: 1
    },
    categories: ["norse_mythology", "fire_minion", "fire_mythic"],
    collectible: false
  },

  // Logi's Fang (Evolution)
  {
    id: 5021,
    name: "Logi, Wildfire Incarnate's Fang",
    manaCost: 5,
    attack: 5,
    health: 3,
    description: "When this deals damage, apply Burn. Passive: When Burn is applied, give a random friendly Fire minion +1 Attack.",
    flavorText: "The fang of Logi, the personification of wildfire in Norse myth, consuming all in its path.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["burn_on_damage"],
    passive: {
      type: "on_burn_applied",
      description: "When Burn is applied, give a random friendly Fire minion +1 Attack."
    },
    categories: ["norse_mythology", "fire_minion", "fire_mythic"],
    collectible: false
  },

  // Phoenix (Evolution)
  {
    id: 5022,
    name: "Phoenix",
    manaCost: 5,
    attack: 4,
    health: 4,
    description: "Flying. Reborn. Battlecry: Deal 3 damage to all enemy minions.",
    flavorText: "A majestic bird, reborn from the ashes of its former self.",
    rarity: 'rare',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["flying", "reborn", "battlecry"],
    battlecry: {
      type: "damage_all",
      targetType: "enemy_minions",
      value: 3
    },
    categories: ["norse_mythology", "fire_minion", "fire_mythic"],
    collectible: false
  },

  // Loki's Ember (Evolution)
  {
    id: 5023,
    name: "Loki's Ember",
    manaCost: 6,
    attack: 4,
    health: 4,
    description: "Charge. Battlecry: Gain +3 Attack this turn and deal 2 damage to a random enemy. When this attacks, deal 1 damage to the enemy hero.",
    flavorText: "Born of the trickster god's flames, mischief and destruction follow in its wake.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Titan",
    keywords: ["charge", "battlecry"],
    battlecry: {
      type: "compound",
      effects: [
        {
          type: "buff_self_temporary",
          buffAttack: 3,
          duration: "this_turn"
        },
        {
          type: "damage_random",
          targetType: "random_enemy",
          value: 2
        }
      ]
    },
    onAttack: {
      type: "damage",
      targetType: "enemy_hero",
      value: 1
    },
    categories: ["norse_mythology", "fire_minion", "fire_mythic"],
    collectible: false
  },

  // Muspeldreki (Evolution)
  {
    id: 5024,
    name: "Muspeldreki",
    manaCost: 5,
    attack: 3,
    health: 5,
    description: "Flying. Battlecry: Deal 2 damage to all enemies.",
    flavorText: "A dreki from Muspelheim, its wings spread the flames of Ragnarök.",
    rarity: 'common',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Dragon",
    keywords: ["flying", "battlecry"],
    battlecry: {
      type: "damage_all",
      targetType: "all_enemies",
      value: 2
    },
    categories: ["norse_mythology", "fire_minion", "fire_mythic"],
    collectible: false
  },

  // Eldjotnar (Evolution)
  {
    id: 5025,
    name: "Eldjotnar",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "When this deals damage, apply Burn. Passive: When Burn triggers, deal 1 damage to a random enemy.",
    flavorText: "A fire giant's kin, its rage scorches the Nine Realms.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["burn_on_damage"],
    passive: {
      type: "on_burn_trigger",
      description: "When Burn triggers, deal 1 damage to a random enemy."
    },
    categories: ["norse_mythology", "fire_minion", "fire_mythic"],
    collectible: false
  },

  // Muspel's Harbinger (Evolution)
  {
    id: 5026,
    name: "Muspel's Harbinger",
    manaCost: 6,
    attack: 4,
    health: 5,
    description: "Flying. Battlecry: Deal 3 damage to all enemies. When this attacks, deal 1 damage to all enemies.",
    flavorText: "A herald of Muspelheim, its wings spread fire across the realms.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["flying", "battlecry"],
    battlecry: {
      type: "damage_all",
      targetType: "all_enemies",
      value: 3
    },
    onAttack: {
      type: "damage",
      targetType: "all_enemies",
      value: 1
    },
    categories: ["norse_mythology", "fire_minion", "fire_mythic"],
    collectible: false
  },

  // ===== LIGHTNING MINIONS =====

  // Þórr's Spark (Basic - Common)
  {
    id: 5300,
    name: "Þórr, Son of Odin's Spark",
    manaCost: 2,
    attack: 3,
    health: 1,
    description: "Battlecry: Deal 1 damage to a random enemy minion.",
    flavorText: "A spark from Mjölnir, Thor's mighty hammer, dancing with electric fury.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage",
      targetType: "random_enemy_minion",
      value: 1
    },
    categories: ["norse_mythology", "lightning_minion", "lightning_common"],
    collectible: false
  },

  // Skoll's Pup (Basic - Common)
  {
    id: 5301,
    name: "Skoll, Sun-Chaser's Pup",
    manaCost: 2,
    attack: 2,
    health: 1,
    description: "Charge. Battlecry: Deal 1 damage to an enemy minion.",
    flavorText: "A young wolf of the storm, eager to chase the sun.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["charge", "battlecry"],
    battlecry: {
      type: "damage",
      targetType: "enemy_minion",
      value: 1,
      requiresTarget: true
    },
    categories: ["norse_mythology", "lightning_minion", "lightning_common"],
    collectible: false
  },

  // Þunordreki (Basic - Common)
  {
    id: 5302,
    name: "Þunordreki",
    manaCost: 3,
    attack: 3,
    health: 2,
    description: "Battlecry: Deal 1 damage to an enemy minion.",
    flavorText: "The thunder dragon of Norse legend, crackling with the storm's fury.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Dragon",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage",
      targetType: "enemy_minion",
      value: 1,
      requiresTarget: true
    },
    categories: ["norse_mythology", "lightning_minion", "lightning_common"],
    collectible: false
  },

  // Sleipnir's Hoof (Basic - Common)
  {
    id: 5303,
    name: "Sleipnir, the Eight-Legged's Hoof",
    manaCost: 3,
    attack: 3,
    health: 2,
    description: "Battlecry: Deal 1 damage to an enemy minion.",
    flavorText: "A fragment of Odin's steed, striking with lightning speed.",
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
    categories: ["norse_mythology", "lightning_minion", "lightning_common"],
    collectible: false
  },

  // Frey's Bolt (Basic - Common)
  {
    id: 5304,
    name: "Freyr, Lord of Alfheim's Bolt",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Battlecry: Deal 1 damage to an enemy minion and gain +1 Attack this turn.",
    flavorText: "A blessing of the harvest god, striking swift as summer lightning.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["battlecry"],
    battlecry: {
      type: "compound",
      effects: [
        {
          type: "damage",
          targetType: "enemy_minion",
          value: 1,
          requiresTarget: true
        },
        {
          type: "buff_self",
          buffAttack: 1,
          buffHealth: 0,
          duration: "this_turn"
        }
      ]
    },
    categories: ["norse_mythology", "lightning_minion", "lightning_common"],
    collectible: false
  },

  // Hrafn Þórs (Standalone - Rare)
  {
    id: 5305,
    name: "Hrafn Þórs",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Flying. Battlecry: Deal 2 damage to a random enemy minion.",
    flavorText: "Thor's raven, riding the thunder clouds and striking with lightning.",
    rarity: "rare",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["flying", "battlecry"],
    battlecry: {
      type: "damage",
      targetType: "random_enemy_minion",
      value: 2
    },
    categories: ["norse_mythology", "lightning_minion", "lightning_rare"],
    collectible: false
  },

  // Þundrvættr, the Storm Spirit (Evolution - Mythic)
  {
    id: 5306,
    name: "Þundrvættr, the Storm Spirit",
    manaCost: 5,
    attack: 4,
    health: 3,
    description: "When an enemy minion is played, deal 1 damage to it. Battlecry: Deal 2 damage to all enemy minions.",
    flavorText: "A vættr of thunder, the storm spirit that heralds Thor's wrath.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["battlecry"],
    battlecry: {
      type: "damage_all",
      targetType: "enemy_minions",
      value: 2
    },
    passive: {
      type: "on_enemy_play",
      description: "When an enemy minion is played, deal 1 damage to it."
    },
    categories: ["norse_mythology", "lightning_minion", "lightning_mythic"],
    collectible: false
  },

  // Skoll's Storm (Evolution - Mythic)
  {
    id: 5307,
    name: "Skoll, the Ravenous's Storm",
    manaCost: 5,
    attack: 5,
    health: 3,
    description: "Charge. When this attacks, deal 1 damage to all enemies. Battlecry: Deal 2 damage to all enemies.",
    flavorText: "The great wolf's fury unleashed, a tempest of fangs and lightning.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["charge", "battlecry"],
    battlecry: {
      type: "damage_all",
      targetType: "all_enemies",
      value: 2
    },
    onAttack: {
      type: "compound",
      effects: [
        {
          type: "damage",
          targetType: "all_enemies",
          value: 1
        },
        {
          type: 'apply_status',
          statusEffect: 'paralysis',
          targetType: 'target'
        }
      ]
    },
    categories: ["norse_mythology", "lightning_minion", "lightning_mythic"],
    collectible: false
  },

  // Sleipnir's Charge (Evolution - Mythic)
  {
    id: 5308,
    name: "Sleipnir, Odin's Mount's Charge",
    manaCost: 6,
    attack: 5,
    health: 4,
    description: "Rush. When this moves, deal 2 damage to a random enemy. Battlecry: Deal 3 damage to an enemy.",
    flavorText: "Odin's eight-legged steed, thundering across the battlefield.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "damage",
      targetType: "enemy",
      value: 3,
      requiresTarget: true
    },
    passive: {
      type: "on_move",
      description: "When this minion moves, deal 2 damage to a random enemy."
    },
    onAttack: {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    },
    categories: ["norse_mythology", "lightning_minion", "lightning_mythic"],
    collectible: false
  },

  // Frey's Thunder (Evolution - Mythic)
  {
    id: 5309,
    name: "Freyr, Harvest God's Thunder",
    manaCost: 5,
    attack: 3,
    health: 5,
    description: "Rush. When this attacks, deal 1 damage to a random enemy. Battlecry: Deal 2 damage to all enemies.",
    flavorText: "The god of sunshine's wrath, a storm of divine retribution.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Elemental",
    keywords: ["rush", "battlecry"],
    battlecry: {
      type: "damage_all",
      targetType: "all_enemies",
      value: 2
    },
    onAttack: {
      type: "compound",
      effects: [
        {
          type: "damage",
          targetType: "random_enemy",
          value: 1
        },
        {
          type: 'apply_status',
          statusEffect: 'freeze',
          targetType: 'target'
        }
      ]
    },
    categories: ["norse_mythology", "lightning_minion", "lightning_mythic"],
    collectible: false
  },

  // ===== DARK MINIONS (Pet Cards) =====

  // Helhest, the Death Mare (Basic - Common)
  {
    id: 5400,
    name: "Helhest, the Death Mare",
    manaCost: 2,
    attack: 1,
    health: 3,
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
    collectible: false
  },

  // Myrkrkló (Basic - Common)
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
    collectible: false
  },

  // Garmr's Pup (Basic - Common)
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
    collectible: false
  },

  // Náströnd's Serpent (Standalone - Rare)
  {
    id: 5403,
    name: "Náströnd's Serpent",
    manaCost: 4,
    attack: 3,
    health: 3,
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
    collectible: false
  },

  // Hel's Stallion (Evolution - Mythic)
  {
    id: 5404,
    name: "Hel's Stallion",
    manaCost: 5,
    attack: 5,
    health: 3,
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
    categories: ["norse_mythology", "dark_minion", "dark_mythic"],
    collectible: false
  },

  // Voidfang (Evolution - Mythic)
  {
    id: 5405,
    name: "Voidfang",
    manaCost: 6,
    attack: 4,
    health: 5,
    description: "When this attacks, reduce the target's Attack by 1 permanently. Battlecry: Destroy an enemy minion with 2 or less Attack.",
    flavorText: "A beast of the abyss, devouring light itself.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "dark_minion", "dark_mythic"],
    collectible: false
  },

  // Garmr's Howl (Evolution - Mythic)
  {
    id: 5406,
    name: "Garmr's Howl",
    manaCost: 5,
    attack: 3,
    health: 5,
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
    categories: ["norse_mythology", "dark_minion", "dark_mythic"],
    collectible: false
  },

  // ===== LIGHT MINIONS =====

  // Álfheimr's Light (Basic - Common)
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
    collectible: false
  },

  // Valkyrie Pegasus (Basic - Common)
  {
    id: 5501,
    name: "Valkyrie Pegasus",
    manaCost: 5,
    attack: 3,
    health: 3,
    description: "Divine Shield. Charge. When this attacks, give a friendly minion +1 Attack.",
    flavorText: "A divine steed that carries warriors to glory.",
    rarity: "common",
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["divine_shield", "charge"],
    onAttack: {
      type: "buff",
      targetType: "random_friendly_minion",
      buffAttack: 1,
      buffHealth: 0
    },
    categories: ["norse_mythology", "light_minion", "light_common"],
    collectible: false
  },

  // Dáinn's Glow (Standalone - Rare)
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
    collectible: false
  },

  // Ljósálfr (Evolution - Mythic)
  {
    id: 5503,
    name: "Ljósálfr",
    manaCost: 4,
    attack: 3,
    health: 5,
    description: "Start of turn: Restore 1 Health to all friendly minions. Battlecry: Give all friendly minions +2 Health this turn.",
    flavorText: "A light elf of Álfheimr, whose radiance brings hope to all who witness it.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "light_minion", "light_mythic"],
    collectible: false
  },

  // ===== NEUTRAL MINIONS =====

  // Stone Pup (Basic - Common)
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
    collectible: false
  },

  // Mistfang Pup (Basic - Common)
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
    collectible: false
  },

  // Stonebleat Buckling (Basic - Common)
  {
    id: 5552,
    name: "Stonebleat Buckling",
    manaCost: 2,
    attack: 2,
    health: 3,
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
    collectible: false
  },

  // Trollhound (Basic - Common)
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
    collectible: false
  },

  // Runeclaw Wolf (Basic - Common)
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
    collectible: false
  },

  // Iron Boar (Standalone - Rare)
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
    collectible: false
  },

  // Hræsvelgr's Kin (Standalone - Rare)
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
    collectible: false
  },

  // Ironhide Sow (Standalone - Rare)
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
    collectible: false
  },

  // Granite Hound (Evolution - Mythic)
  {
    id: 5558,
    name: "Granite Hound",
    manaCost: 5,
    attack: 3,
    health: 6,
    description: "Taunt. Passive: When attacked, reduce damage taken by 1. Battlecry: Gain +3 Health this turn.",
    flavorText: "A guardian of stone, its bark is as hard as its bite.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "neutral_minion", "neutral_mythic"],
    collectible: false
  },

  // ===== GREEK GODS MYTHIC CREATURES =====

  // Skinfaxi, the Day Horse
  {
    id: 4400,
    name: "Skinfaxi, the Day Horse",
    manaCost: 3,
    attack: 3,
    health: 2,
    description: "Battlecry: Give a minion +2 Attack until end of turn. At the start of your turn, give a random friendly minion +1 Attack.",
    flavorText: "The horse whose mane brings the light of day, empowering allies at dawn.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  },

  // Hildisvini, Freyja's Boar
  {
    id: 4401,
    name: "Hildisvini, Freyja's Boar",
    manaCost: 4,
    attack: 2,
    health: 5,
    description: "Battlecry: Restore 5 Health to your hero. When this restores health to your hero, give a random friendly minion +1/+1.",
    flavorText: "Freyja's loyal companion, bringing warmth and blessings to all allies.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  },

  // Huldra, the Forest Spirit
  {
    id: 4402,
    name: "Huldra, the Forest Spirit",
    manaCost: 6,
    attack: 4,
    health: 5,
    description: "Battlecry: Force an enemy minion to attack an adjacent ally. When an enemy minion attacks this and survives, reduce its Attack by 1 permanently.",
    flavorText: "A beguiling spirit of the forest, her charm leads enemies to their doom.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  },

  // Vedrfolnir, the Sky Hawk
  {
    id: 4403,
    name: "Vedrfolnir, the Sky Hawk",
    manaCost: 4,
    attack: 3,
    health: 4,
    description: "Flying. Battlecry: Look at the top 3 cards of your deck. Draw one. When you draw a card, give a random friendly minion +1 Attack.",
    flavorText: "The hawk perched atop the World Tree, seeing all that unfolds.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  },

  // Gullinkambi, the Ragnarok Rooster
  {
    id: 4404,
    name: "Gullinkambi, the Ragnarok Rooster",
    manaCost: 2,
    attack: 1,
    health: 1,
    description: "Deathrattle: If you have 7 minions, deal 5 damage to the enemy hero. At the end of your turn, if you have 7 minions, deal 1 damage to the enemy hero.",
    flavorText: "The golden rooster whose crow heralds the end of days.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  },

  // Heidrun, the Mead Goat
  {
    id: 4405,
    name: "Heidrun, the Mead Goat",
    manaCost: 4,
    attack: 2,
    health: 5,
    description: "At the end of your turn, restore 2 Health to all friendly minions. When a friendly minion is healed, it gains +1 Health permanently.",
    flavorText: "The goat whose mead sustains the gods, granting vigor to all.",
    rarity: 'common',
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
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  },

  // Hrímfaxi, the Night Horse
  {
    id: 4406,
    name: "Hrímfaxi, the Night Horse",
    manaCost: 3,
    attack: 2,
    health: 3,
    description: "Battlecry: Give a minion Stealth until your next turn. At the end of your turn, if you have a minion with Stealth, draw a card.",
    flavorText: "The horse whose mane drips with dew, shrouding allies in night's embrace.",
    rarity: 'epic',
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
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  },

  // Thought-Raven of Odin
  {
    id: 4407,
    name: "Thought-Raven of Odin",
    manaCost: 5,
    attack: 3,
    health: 4,
    description: "Flying. Battlecry: Draw a card. Whenever you draw a card, reveal it. If it's a minion, give it +1/+1 when played.",
    flavorText: "Odin's raven of thought, granting wisdom and power to those it favors.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["battlecry", "flying"],
    battlecry: {
      type: "draw",
      targetType: 'none',
      value: 1
    },
    passive: {
      type: "on_draw_reveal",
      effect: {
        type: "buff_when_played",
        condition: "is_minion",
        buffAttack: 1,
        buffHealth: 1
      }
    },
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  },

  // Memory-Raven of Odin
  {
    id: 4408,
    name: "Memory-Raven of Odin",
    manaCost: 5,
    attack: 2,
    health: 5,
    description: "Flying. Deathrattle: Return a random minion from your graveyard to the battlefield with +2/+2. Minions returned from your graveyard gain +2/+2.",
    flavorText: "Odin's raven of memory, recalling the fallen to fight once more.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["deathrattle", "flying"],
    deathrattle: {
      type: "resurrect_buffed",
      targetType: "random_graveyard_minion",
      buffAttack: 2,
      buffHealth: 2
    },
    passive: {
      type: "on_resurrect",
      effect: {
        type: "buff",
        buffAttack: 2,
        buffHealth: 2
      }
    },
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  },

  // Gullinbursti, the Golden Boar
  {
    id: 4409,
    name: "Gullinbursti, Freyr's Boar",
    manaCost: 5,
    attack: 4,
    health: 6,
    description: "Taunt. Battlecry: Give all friendly minions +1 Attack until end of turn. Whenever a friendly minion with Taunt is attacked, give it +1 Attack.",
    flavorText: "The golden boar forged by dwarves, its brilliance inspires all who stand beside it.",
    rarity: 'epic',
    type: "minion",
    class: "Neutral",
    heroClass: "neutral",
    race: "Beast",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "buff_temporary_all",
      targetType: "friendly_minions",
      buffAttack: 1,
      buffHealth: 0,
      duration: "this_turn"
    },
    passive: {
      type: "on_taunt_attacked",
      effect: {
        type: "buff",
        targetType: "attacked_minion",
        buffAttack: 1,
        buffHealth: 0
      }
    },
    categories: ["norse_mythology", "greek_mythic"],
    collectible: true
  }
];

/**
 * Register Norse mythology cards in the registry
 * This function is called during game initialization to add cards to the registry
 */
export function registerNorseMythologyCards(): void {
  if (IS_DEV) debug.card('Registering Norse mythology cards...');

  // Jormungandr - The World Serpent
  createCard()
    .id(20620)
    .name("Jormungandr")
    .manaCost(7)
    .attack(6)
    .health(6)
    .description("Battlecry: Summon two 0/5 Jormungandr's Coils with \"At the end of your turn, deal 1 damage to all enemy minions.\" Deathrattle: Destroy all Jormungandr's Coils and deal 2 damage to all enemy minions.")
    .flavorText("The World Serpent circles the realm, lying in wait. When its coils tighten, the end draws near.")
    .rarity("mythic")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .addKeyword("deathrattle")
    .battlecry({
      type: "summon",
      targetType: 'none',
      summonCardId: 20621,
      summonCount: 2
    })
    .deathrattle({
      type: "destroy",
      targetType: "specific_minion_type",
      specificCardId: 20621
    })
    .deathrattle({
      type: "damage",
      targetType: "enemy_minions",
      value: 2
    })
    .addCategory("norse_mythology")
    .collectible(true)
    .build();
  
  // Jormungandr's Coil - Token
  createCard()
    .id(20621)
    .name("Jormungandr's Coil")
    .manaCost(2)
    .attack(0)
    .health(5)
    .description("At the end of your turn, deal 1 damage to all enemy minions.")
    .flavorText("Each coil tightens, bringing inevitable doom closer.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .customProperty("endOfTurn", {
      type: "damage",
      value: 1,
      targetType: "enemy_minions"
    })
    .addCategory("norse_mythology")
    .addCategory("token")
    .collectible(false)
    .build();

  // ===== DARK MYTHIC CREATURES =====

  // Fenrir, the Bound Wolf
  createCard()
    .id(4300)
    .name("Fenrir, the Bound Wolf")
    .manaCost(8)
    .attack(7)
    .health(7)
    .description("Rush. Battlecry: Destroy an enemy minion. At the end of each turn, gain +1 Attack.")
    .flavorText("The monstrous wolf, destined to break free and devour the gods.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("rush")
    .addKeyword("battlecry")
    .battlecry({
      type: "destroy",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .customProperty("endOfTurn", {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    })
    .addCategory("norse_mythology")
    .addCategory("dark_mythic")
    .collectible(true)
    .build();

  // Garm, the Hellhound
  createCard()
    .id(4301)
    .name("Garm, the Hellhound")
    .manaCost(7)
    .attack(5)
    .health(6)
    .description("Taunt. Battlecry: Revive a random friendly minion that died this game with +1/+1. When a friendly minion dies, summon a 2/2 Shadow Hound with Taunt.")
    .flavorText("The ferocious guard dog of Hel's gates.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "resurrect_random_buffed",
      targetType: "none",
      buffAttack: 1,
      buffHealth: 1
    })
    .customProperty("onFriendlyDeath", {
      type: "summon",
      summonCardId: 4310,
      value: 1
    })
    .addCategory("norse_mythology")
    .addCategory("dark_mythic")
    .collectible(true)
    .build();

  // Hati, the Moon-Devourer
  createCard()
    .id(4302)
    .name("Hati, the Moon-Devourer")
    .manaCost(6)
    .attack(5)
    .health(5)
    .description("Stealth. Battlecry: Deal 1 damage to all enemy minions. At the end of your turn, if this has Stealth, give another random friendly minion Stealth.")
    .flavorText("The wolf that stalks the moon, bringing eternal night.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_all",
      targetType: "enemy_minions",
      value: 1
    })
    .customProperty("endOfTurn", {
      type: "grant_stealth_conditional",
      condition: "self_has_stealth",
      targetType: "random_friendly_minion"
    })
    .addCategory("norse_mythology")
    .addCategory("dark_mythic")
    .collectible(true)
    .build();

  // Nidhogg, the Root-Gnawer
  createCard()
    .id(4303)
    .name("Nidhogg, the Root-Gnawer")
    .manaCost(10)
    .attack(8)
    .health(8)
    .description("Taunt. Battlecry: Destroy all enemy minions with 2 or less Health. At the end of each turn, deal 1 damage to all enemy minions.")
    .flavorText("The dragon that chews at Yggdrasil's roots, heralding decay.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("dragon")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "destroy_low_health",
      targetType: "enemy_minions",
      healthThreshold: 2
    })
    .customProperty("endOfTurn", {
      type: "damage",
      value: 1,
      targetType: "enemy_minions"
    })
    .addCategory("norse_mythology")
    .addCategory("dark_mythic")
    .collectible(true)
    .build();

  // Shadowmaw Alpha
  createCard()
    .id(4304)
    .name("Shadowmaw Alpha")
    .manaCost(6)
    .attack(4)
    .health(4)
    .description("Stealth. Battlecry: Summon two 2/2 Shadow Wolves with Stealth. Whenever you summon a Shadow Wolf, give it +1/+1.")
    .flavorText("The leader of the pack, its howl commands the night.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .addKeyword("battlecry")
    .battlecry({
      type: "summon",
      targetType: "none",
      summonCardId: 4311,
      summonCount: 2
    })
    .customProperty("onSummon", {
      type: "buff_summoned",
      condition: { cardNameContains: "Shadow Wolf" },
      buffAttack: 1,
      buffHealth: 1
    })
    .addCategory("norse_mythology")
    .addCategory("dark_mythic")
    .collectible(true)
    .build();

  // Shadowmaw Direwolf
  createCard()
    .id(4305)
    .name("Shadowmaw Direwolf")
    .manaCost(7)
    .attack(6)
    .health(6)
    .description("Stealth. Battlecry: Destroy an enemy minion with 4 or less Attack and summon a 3/3 Shadow Wolf in its place. After this attacks and kills a minion, summon a 1/1 Shadow Pup with Stealth.")
    .flavorText("A pack leader of the night, its jaws claim the weak.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .addKeyword("battlecry")
    .battlecry({
      type: "destroy_and_summon",
      targetType: "enemy_minion",
      requiresTarget: true,
      attackThreshold: 4,
      summonCardId: 4312
    })
    .customProperty("onKill", {
      type: "summon",
      summonCardId: 4313,
      value: 1
    })
    .addCategory("norse_mythology")
    .addCategory("dark_mythic")
    .collectible(true)
    .build();

  // ===== DARK MYTHIC TOKEN CARDS =====

  // Shadow Hound (token for Garm)
  createCard()
    .id(4310)
    .name("Shadow Hound")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Taunt")
    .flavorText("Bound to serve the guardian of Hel's gates.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addCategory("norse_mythology")
    .addCategory("token")
    .collectible(false)
    .build();

  // Shadow Wolf (2/2 token for Shadowmaw Alpha)
  createCard()
    .id(4311)
    .name("Shadow Wolf")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Stealth")
    .flavorText("A wolf born of shadow, loyal to the Alpha.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .addCategory("norse_mythology")
    .addCategory("token")
    .collectible(false)
    .build();

  // Shadow Wolf (3/3 token for Shadowmaw Direwolf battlecry)
  createCard()
    .id(4312)
    .name("Shadow Wolf")
    .manaCost(3)
    .attack(3)
    .health(3)
    .description("Stealth")
    .flavorText("Emerges from the darkness to claim the weak.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .addCategory("norse_mythology")
    .addCategory("token")
    .collectible(false)
    .build();

  // Shadow Pup (token for Shadowmaw Direwolf on-kill)
  createCard()
    .id(4313)
    .name("Shadow Pup")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("Stealth")
    .flavorText("A tiny predator, eager to grow into a wolf.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .addCategory("norse_mythology")
    .addCategory("token")
    .collectible(false)
    .build();

  // ===== MYTHOLOGICAL MYTHIC CREATURES =====

  // Hafgufa, the Sea-Mist
  createCard()
    .id(4320)
    .name("Hafgufa, the Sea-Mist")
    .manaCost(10)
    .attack(8)
    .health(12)
    .description("Battlecry: Deal 3 damage to ALL other minions. Your spells cost (1) less. Enemy minions take 1 extra damage. Deathrattle: Deal 5 damage to all enemies.")
    .flavorText("The legendary Norse sea monster, shrouded in mist, rising from the depths to engulf ships whole.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .addKeyword("deathrattle")
    .battlecry({
      type: "damage_all",
      targetType: "all_other_minions",
      value: 3
    })
    .customProperty("aura", {
      type: "compound",
      effects: [
        { type: "spell_cost_reduction", value: 1, targetType: "friendly" },
        { type: "damage_increase", value: 1, targetType: "enemy_minions" }
      ]
    })
    .deathrattle({
      type: "damage",
      targetType: "all_enemies",
      value: 5
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Briareos, the Hundred-Armed
  createCard()
    .id(4321)
    .name("Briareos, the Hundred-Armed")
    .manaCost(10)
    .attack(10)
    .health(14)
    .description("Taunt. Can't be Silenced. Cannot have Attack reduced. Takes 1 less damage. Whenever this attacks, deal 3 damage to all other minions.")
    .flavorText("One of the mighty Hecatoncheires, the hundred-handed giants who helped Zeus overthrow the Titans.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .addKeyword("taunt")
    .customProperty("cantBeSilenced", true)
    .customProperty("passive", {
      type: "compound",
      effects: [
        { type: "attack_reduction_immunity" },
        { type: "damage_reduction", value: 1 }
      ]
    })
    .customProperty("onAttack", {
      type: "damage_all",
      targetType: "all_other_minions",
      value: 3
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Typhon's Brood
  createCard()
    .id(4322)
    .name("Typhon's Brood")
    .manaCost(9)
    .attack(8)
    .health(10)
    .description("Battlecry: Summon a Ginnungagap's Fury. The first damage this takes each turn is ignored. Deathrattle: Deal 5 damage to all enemies.")
    .flavorText("Offspring of Typhon, the father of all monsters in Greek mythology, spawned from primordial chaos.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("dragon")
    .addKeyword("battlecry")
    .addKeyword("deathrattle")
    .battlecry({
      type: "summon",
      targetType: "none",
      summonCardId: 4340,
      summonCount: 1
    })
    .customProperty("passive", {
      type: "first_damage_immunity"
    })
    .deathrattle({
      type: "damage",
      targetType: "all_enemies",
      value: 5
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Mánagarm, the Blood Moon
  createCard()
    .id(4323)
    .name("Mánagarm, the Blood Moon")
    .manaCost(9)
    .attack(9)
    .health(9)
    .description("Lifesteal. Battlecry: Enemy minions have -2 Attack while this is alive. Whenever this deals damage, restore that much Health to your hero.")
    .flavorText("The great wolf destined to swallow the moon during Ragnarök, staining the sky blood-red.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("lifesteal")
    .addKeyword("battlecry")
    .battlecry({
      type: "aura_debuff",
      targetType: "enemy_minions",
      debuffAttack: -2,
      condition: "while_alive"
    })
    .customProperty("onDamage", {
      type: "heal_hero",
      targetType: "friendly_hero",
      value: "damage_dealt"
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Ladon, the Hundred-Eyed
  createCard()
    .id(4324)
    .name("Ladon, the Hundred-Eyed")
    .manaCost(8)
    .attack(7)
    .health(10)
    .description("Whenever this attacks, it attacks twice. After attacking, give a random enemy minion Poisonous this turn.")
    .flavorText("The hundred-headed dragon that guarded the golden apples in the Garden of the Hesperides.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("windfury")
    .customProperty("onAttack", {
      type: "grant_keyword",
      targetType: "random_enemy_minion",
      keyword: "poisonous",
      duration: "this_turn"
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Viðófnir, the Tree Guardian
  createCard()
    .id(4325)
    .name("Viðófnir, the Tree Guardian")
    .manaCost(8)
    .attack(6)
    .health(12)
    .description("Taunt. Your opponent's minions have -1 Attack. At the end of your turn, gain +2 Health.")
    .flavorText("The golden rooster perched atop Yggdrasil, ever watchful over the World Tree's sacred branches.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .customProperty("aura", {
      type: "attack_debuff",
      targetType: "enemy_minions",
      value: -1
    })
    .customProperty("endOfTurn", {
      type: "buff_self",
      buffAttack: 0,
      buffHealth: 2
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Vánagand, the Eclipse Dragon
  createCard()
    .id(4326)
    .name("Vánagand, the Eclipse Dragon")
    .manaCost(9)
    .attack(7)
    .health(11)
    .description("Flying. Battlecry: Disable all enemy minion abilities until your next turn. Whenever this deals damage, restore 3 Health to it.")
    .flavorText("Monster of the river Ván, whose shadow darkens the heavens when it takes flight.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("dragon")
    .addKeyword("battlecry")
    .addKeyword("flying")
    .battlecry({
      type: "silence_all",
      targetType: "enemy_minions",
      duration: "until_next_turn"
    })
    .customProperty("onDamage", {
      type: "heal_self",
      value: 3
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Lernaean Flame
  createCard()
    .id(4327)
    .name("Lernaean Flame")
    .manaCost(8)
    .attack(8)
    .health(8)
    .description("Whenever this attacks, deal 2 damage to all enemies. After this survives damage, gain +1 Attack.")
    .flavorText("A fiery incarnation of the Lernaean Hydra, each severed head regrows stronger than before.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("dragon")
    .customProperty("onAttack", {
      type: "damage",
      targetType: "all_enemies",
      value: 2
    })
    .customProperty("onSurviveDamage", {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Draugr, the Deathless Hunger
  createCard()
    .id(4328)
    .name("Draugr, the Deathless Hunger")
    .manaCost(7)
    .attack(7)
    .health(7)
    .description("Lifesteal. Whenever a minion dies, gain +1 Attack. After this kills a minion, gain Stealth until your next turn.")
    .flavorText("An undead Norse revenant, cursed to walk between worlds with an insatiable hunger for the living.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .addKeyword("lifesteal")
    .customProperty("onAnyDeath", {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    })
    .customProperty("onKill", {
      type: "grant_keyword",
      targetType: "self",
      keyword: "stealth",
      duration: "until_next_turn"
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Scylla, the World-Render
  createCard()
    .id(4329)
    .name("Scylla, the World-Render")
    .manaCost(8)
    .attack(6)
    .health(13)
    .description("Taunt. Whenever this takes damage, restore 2 Health to it. Battlecry: Destroy a random enemy minion.")
    .flavorText("The six-headed Greek sea monster that devoured sailors passing through the Strait of Messina.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .customProperty("onDamageTaken", {
      type: "heal_self",
      value: 2
    })
    .battlecry({
      type: "destroy",
      targetType: "random_enemy_minion",
      requiresTarget: false
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Stheno, the Stone-Gazer
  createCard()
    .id(4330)
    .name("Stheno, the Stone-Gazer")
    .manaCost(6)
    .attack(6)
    .health(6)
    .description("At the end of your turn, Freeze a random enemy minion. Whenever this attacks a Frozen minion, destroy it.")
    .flavorText("The immortal Gorgon sister whose gaze turns all who meet her eyes to cold, unmoving stone.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .customProperty("endOfTurn", {
      type: "freeze",
      targetType: "random_enemy_minion"
    })
    .customProperty("onAttack", {
      type: "destroy_frozen",
      condition: "target_is_frozen"
    })
    .addCategory("norse_mythology")
    .addCategory("mythological_mythic")
    .collectible(true)
    .build();

  // Ginnungagap's Fury (token for Typhon's Brood)
  createCard()
    .id(4340)
    .name("Ginnungagap's Fury")
    .manaCost(0)
    .attack(0)
    .health(3)
    .description("At the end of each turn, deal 2 damage to ALL characters.")
    .flavorText("The raw fury of Ginnungagap, the primordial void from which all Norse creation emerged.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .customProperty("endOfTurn", {
      type: "damage",
      value: 2,
      targetType: "all_characters"
    })
    .addCategory("norse_mythology")
    .addCategory("token")
    .collectible(false)
    .build();

  // ===== FIRE ELEMENT MYTHIC CREATURES =====

  // Muspel's Wyrm
  createCard()
    .id(4351)
    .name("Muspel's Wyrm")
    .manaCost(7)
    .attack(5)
    .health(6)
    .description("Battlecry: Deal 2 damage to all enemy minions. Gain +1 Attack for each minion destroyed.")
    .flavorText("A dragon born of Muspelheim's eternal flames, growing mightier with each soul consumed.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("dragon")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_and_scale",
      targetType: "enemy_minions",
      value: 2
    })
    .addCategory("norse_mythology")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Múspellsmegir, the Fire Titan
  createCard()
    .id(4352)
    .name("Múspellsmegir, the Fire Titan")
    .manaCost(8)
    .attack(7)
    .health(8)
    .description("Taunt. At the end of your turn, deal 1 damage to all enemies.")
    .flavorText("One of the Sons of Muspel, destined to march at Ragnarök and set the world ablaze.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .customProperty("endOfTurn", {
      type: "damage",
      value: 1,
      targetType: "all_enemies"
    })
    .addCategory("norse_mythology")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Gullinbursti, Golden Boar
  createCard()
    .id(4353)
    .name("Gullinbursti, Golden Boar")
    .manaCost(6)
    .attack(5)
    .health(5)
    .description("Rush. Battlecry: Give a friendly minion +2/+2 and 'Deathrattle: Summon a 2/2 Glóð's Spark.'")
    .flavorText("The golden boar blessed by magic, spreading its flames to allies.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("rush")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_and_grant_deathrattle",
      targetType: "friendly_minion",
      buffAttack: 2,
      buffHealth: 2,
      summonCardId: 4361,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Eldþurs, the Lava Giant
  createCard()
    .id(4354)
    .name("Eldþurs, the Lava Giant")
    .manaCost(9)
    .attack(8)
    .health(8)
    .description("Battlecry: Destroy all frozen minions. Deal 3 damage to the enemy hero for each destroyed.")
    .flavorText("A fire giant from Norse legend, its molten form melts ice and stone alike.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "destroy_frozen_and_damage",
      targetType: "enemy_minions",
      damagePerMinion: 3
    })
    .addCategory("norse_mythology")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Skoll, Sun-Chaser
  createCard()
    .id(4355)
    .name("Skoll, Sun-Chaser")
    .manaCost(6)
    .attack(6)
    .health(4)
    .description("Rush. Battlecry: Deal 3 damage to an enemy. If this kills them, gain Immune this turn.")
    .flavorText("The wolf that hunts the sun, swift and merciless.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("rush")
    .addKeyword("battlecry")
    .battlecry({
      type: "conditional_damage",
      targetType: "enemy_character",
      value: 3,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Glóð's Spark (token for Gullinbursti)
  createCard()
    .id(4361)
    .name("Glóð's Spark")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("A small sprite of pure flame.")
    .flavorText("A spark from Glóð, the Norse goddess of embers and glowing coals.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .addCategory("norse_mythology")
    .addCategory("fire_mythic")
    .addCategory("token")
    .collectible(false)
    .build();

  // ===== EARTH/GRASS ELEMENT MYTHIC CREATURES =====

  // Eikthyrnir, the Stag of Valhalla
  createCard()
    .id(4371)
    .name("Eikthyrnir, the Stag of Valhalla")
    .manaCost(6)
    .attack(5)
    .health(6)
    .description("Taunt. Battlecry: Give adjacent minions +1/+2. When this takes damage, give a random friendly minion +1 Health.")
    .flavorText("The majestic stag of the sacred halls, its presence grants strength to allies.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_adjacent",
      targetType: "adjacent_minions",
      buffAttack: 1,
      buffHealth: 2
    })
    .customProperty("onDamageTaken", {
      type: "heal_random",
      targetType: "random_friendly_minion",
      value: 1
    })
    .addCategory("norse_mythology")
    .addCategory("earth_mythic")
    .collectible(true)
    .build();

  // Fafnir, the Gold-Hoarding Dragon
  createCard()
    .id(4372)
    .name("Fafnir, the Gold-Hoarding Dragon")
    .manaCost(9)
    .attack(8)
    .health(8)
    .description("Taunt. Battlecry: Gain +1/+1 for each card in your hand. Deathrattle: Draw 2 cards.")
    .flavorText("The ancient dragon who guards the golden riches, hoarding wealth and treasures.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("dragon")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .addKeyword("deathrattle")
    .battlecry({
      type: "buff_by_hand_size",
      targetType: "self"
    })
    .deathrattle({
      type: "draw",
      value: 2
    })
    .addCategory("norse_mythology")
    .addCategory("earth_mythic")
    .collectible(true)
    .build();

  // Dvalinn, the Root Stag
  createCard()
    .id(4373)
    .name("Dvalinn, the Root Stag")
    .manaCost(5)
    .attack(4)
    .health(5)
    .description("Taunt. Battlecry: Summon a 1/3 Yggdrasil's Tendril with Taunt for each other friendly minion.")
    .flavorText("Dvalinn, one of the four great stags that gnaw upon Yggdrasil's roots.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "summon_by_condition",
      targetType: "none",
      summonCardId: 4377,
      summonCountCondition: "friendly_minion_count"
    })
    .addCategory("norse_mythology")
    .addCategory("earth_mythic")
    .collectible(true)
    .build();

  // Jörð's Guardian
  createCard()
    .id(4374)
    .name("Jörð's Guardian")
    .manaCost(8)
    .attack(6)
    .health(10)
    .description("Taunt. At the end of your turn, restore 2 Health to this minion and give it +1 Attack.")
    .flavorText("A guardian blessed by Jörð, the Norse goddess of the earth and mother of Thor.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .customProperty("endOfTurn", {
      type: "buff_self_with_heal",
      buffAttack: 1,
      buffHealth: 2
    })
    .addCategory("norse_mythology")
    .addCategory("earth_mythic")
    .collectible(true)
    .build();

  // Élivágar's Beast
  createCard()
    .id(4375)
    .name("Élivágar's Beast")
    .manaCost(10)
    .attack(7)
    .health(14)
    .description("Taunt. Battlecry: Restore 5 Health to your hero. At the end of each turn, gain +2 Health.")
    .flavorText("Born from the Élivágar, the eleven primordial rivers that flowed from Niflheim.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal_hero",
      targetType: "friendly_hero",
      value: 5
    })
    .customProperty("endOfTurn", {
      type: "buff_self",
      buffAttack: 0,
      buffHealth: 2
    })
    .addCategory("norse_mythology")
    .addCategory("earth_mythic")
    .collectible(true)
    .build();

  // Yggdrasil's Tendril (token for Dvalinn, the Root Stag)
  createCard()
    .id(4377)
    .name("Yggdrasil's Tendril")
    .manaCost(1)
    .attack(1)
    .health(3)
    .description("Taunt")
    .flavorText("A living tendril of the World Tree, reaching out to ensnare all who draw near.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .addKeyword("taunt")
    .addCategory("norse_mythology")
    .addCategory("earth_mythic")
    .addCategory("token")
    .collectible(false)
    .build();

  // ===== HOLY/LIGHT ELEMENT MYTHIC CREATURES =====

  // Huginn, Odin's Raven of Thought
  createCard()
    .id(4390)
    .name("Huginn, Odin's Raven of Thought")
    .manaCost(4)
    .attack(3)
    .health(3)
    .description("Flying. Battlecry: Draw a card. If Muninn is in play, draw 2 instead.")
    .flavorText("Odin's raven of thought, soaring across the Nine Realms to bring knowledge.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .addKeyword("flying")
    .battlecry({
      type: "draw_conditional",
      targetType: 'none',
      condition: "muninn_in_play",
      value: 1,
      conditionValue: 2
    })
    .addCategory("norse_mythology")
    .addCategory("holy_mythic")
    .collectible(true)
    .build();

  // Muninn, Odin's Raven of Memory
  createCard()
    .id(4391)
    .name("Muninn, Odin's Raven of Memory")
    .manaCost(4)
    .attack(3)
    .health(3)
    .description("Flying. Battlecry: Return a card from your graveyard to your hand. If Huginn is in play, return 2 instead.")
    .flavorText("Odin's raven of memory, carrying the wisdom of all that has come before.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .addKeyword("flying")
    .battlecry({
      type: "resurrect_conditional",
      targetType: "graveyard_card",
      condition: "huginn_in_play",
      value: 1,
      conditionValue: 2,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("holy_mythic")
    .collectible(true)
    .build();

  // Baldur, God of Light
  createCard()
    .id(4392)
    .name("Baldur, God of Light")
    .manaCost(7)
    .attack(6)
    .health(6)
    .description("Divine Shield. Battlecry: Give all friendly minions Divine Shield. Deathrattle: Restore 4 Health to your hero.")
    .flavorText("The god of light and beauty, whose divine shield protects all who stand with him.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .addKeyword("divine_shield")
    .addKeyword("battlecry")
    .addKeyword("deathrattle")
    .battlecry({
      type: "grant_divine_shield",
      targetType: "friendly_minions"
    })
    .deathrattle({
      type: "heal_hero",
      value: 4,
      targetType: "friendly_hero"
    })
    .addCategory("norse_mythology")
    .addCategory("holy_mythic")
    .collectible(true)
    .build();

  // Sol, the Sun Goddess
  createCard()
    .id(4393)
    .name("Sol, the Sun Goddess")
    .manaCost(6)
    .attack(4)
    .health(5)
    .description("At the start of your turn, restore 2 Health to all friendly characters and deal 1 damage to all enemies.")
    .flavorText("The sun goddess whose warmth heals the faithful and burns the wicked.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .customProperty("startOfTurn", {
      type: "compound",
      effects: [
        {
          type: "heal_all",
          targetType: "friendly_characters",
          value: 2
        },
        {
          type: "damage",
          targetType: "all_enemies",
          value: 1
        }
      ]
    })
    .addCategory("norse_mythology")
    .addCategory("holy_mythic")
    .collectible(true)
    .build();

  // Heimdall, Guardian of Bifrost
  createCard()
    .id(4394)
    .name("Heimdall, Guardian of Bifrost")
    .manaCost(8)
    .attack(5)
    .health(10)
    .description("Taunt. Battlecry: Reveal 3 cards from your deck. Choose one to add to your hand.")
    .flavorText("The guardian of Bifrost, who watches all paths and gates of the Nine Realms.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "discover",
      targetType: 'none',
      discoverCount: 3,
      discoverSource: "deck"
    })
    .addCategory("norse_mythology")
    .addCategory("holy_mythic")
    .collectible(true)
    .build();

  // Valkyrie Commander
  createCard()
    .id(4395)
    .name("Valkyrie Commander")
    .manaCost(5)
    .attack(4)
    .health(4)
    .description("Battlecry: Give a friendly minion 'Deathrattle: Summon this minion again with 1 Health.'")
    .flavorText("A commander of the Valkyries, granting her warriors eternal resurrection.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "grant_deathrattle_resurrect",
      targetType: "friendly_minion",
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("holy_mythic")
    .collectible(true)
    .build();

  // ===== WATER ELEMENT MYTHIC CREATURES =====

  // Abyssal Kraken
  createCard()
    .id(4380)
    .name("Abyssal Kraken")
    .manaCost(9)
    .attack(7)
    .health(9)
    .description("Battlecry: Freeze all enemy minions. At the end of your turn, deal 2 damage to all frozen enemies.")
    .flavorText("The ancient tentacled horror from the abyss, bringing eternal winter wherever it dwells.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "freeze_all",
      targetType: "enemy_minions"
    })
    .customProperty("endOfTurn", {
      type: "damage_frozen",
      targetType: "enemy_minions",
      value: 2
    })
    .addCategory("norse_mythology")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Ísormr, the Frost Serpent
  createCard()
    .id(4381)
    .name("Ísormr, the Frost Serpent")
    .manaCost(6)
    .attack(4)
    .health(6)
    .description("Poisonous. Battlecry: Freeze an enemy. If it's already frozen, destroy it instead.")
    .flavorText("The ice serpent of Niflheim, whose frozen fangs bring eternal winter.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("poisonous")
    .addKeyword("battlecry")
    .battlecry({
      type: "freeze_or_destroy",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Ran, Goddess of the Sea
  createCard()
    .id(4382)
    .name("Ran, Goddess of the Sea")
    .manaCost(8)
    .attack(5)
    .health(8)
    .description("Battlecry: Summon two 2/3 Rán's Thralls with 'Deathrattle: Freeze a random enemy.'")
    .flavorText("The goddess of the sea, whose drowned servants pull enemies to the depths.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "summon",
      targetType: 'none',
      summonCardId: 4385,
      summonCount: 2
    })
    .addCategory("norse_mythology")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Nokken, the Water Spirit
  createCard()
    .id(4383)
    .name("Nokken, the Water Spirit")
    .manaCost(5)
    .attack(3)
    .health(5)
    .description("Stealth. At the start of your turn, transform into a copy of a random enemy minion.")
    .flavorText("The shape-shifting water spirit, taking the form of its enemies to confound them.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("stealth")
    .customProperty("startOfTurn", {
      type: "transform_random_enemy",
      targetType: "random_enemy_minion"
    })
    .addCategory("norse_mythology")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Aegir, Lord of the Deep
  createCard()
    .id(4384)
    .name("Aegir, Lord of the Deep")
    .manaCost(7)
    .attack(6)
    .health(7)
    .description("Battlecry: Draw a card for each frozen enemy. Freeze any unfrozen enemies.")
    .flavorText("The sea god whose domain spans all waters, cold and frozen.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "draw_and_freeze",
      targetType: "enemy_minions"
    })
    .addCategory("norse_mythology")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Rán's Thrall (token for Ran, Goddess of the Sea)
  createCard()
    .id(4385)
    .name("Rán's Thrall")
    .manaCost(2)
    .attack(2)
    .health(3)
    .description("Deathrattle: Freeze a random enemy.")
    .flavorText("A soul captured by Rán's net, forever bound to serve the goddess of the drowned.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .deathrattle({
      type: "freeze_random",
      targetType: "random_enemy_minion"
    })
    .addCategory("norse_mythology")
    .addCategory("water_mythic")
    .addCategory("token")
    .collectible(false)
    .build();

  // ===== FIRE MINIONS (Basic Pets) =====

  // Ember Whelp (Basic)
  createCard()
    .id(5000)
    .name("Ember Whelp")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Battlecry: Deal 1 damage to an enemy minion.")
    .flavorText("A young spawn of Muspelheim, spitting sparks with glee.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage",
      targetType: "enemy_minion",
      value: 1,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .collectible(true)
    .build();

  // Ember Fox (Basic)
  createCard()
    .id(5001)
    .name("Ember Fox")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Battlecry: Apply Burn to an enemy minion.")
    .flavorText("A fiery beast from the blazing lands, its tail sparks with embers.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "apply_burn",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .collectible(true)
    .build();

  // Fire Chick (Basic)
  createCard()
    .id(5002)
    .name("Fire Chick")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Battlecry: Deal 1 damage to an enemy minion.")
    .flavorText("A tiny bird, its feathers flicker with flames.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage",
      targetType: "enemy_minion",
      value: 1,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .collectible(true)
    .build();

  // Magma Imp (Basic)
  createCard()
    .id(5003)
    .name("Magma Imp")
    .manaCost(3)
    .attack(2)
    .health(2)
    .description("Charge. Battlecry: Gain +2 Attack this turn.")
    .flavorText("A mischievous spirit, born in a volcano's heart.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("Titan")
    .addKeyword("charge")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_self_temporary",
      targetType: 'none',
      buffAttack: 2,
      duration: "this_turn"
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .collectible(true)
    .build();

  // Cinder Whelp (Basic)
  createCard()
    .id(5004)
    .name("Cinder Whelp")
    .manaCost(2)
    .attack(1)
    .health(3)
    .description("Battlecry: Deal 1 damage to all enemy minions.")
    .flavorText("A young flame, eager to engulf the battlefield.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_all",
      targetType: "enemy_minions",
      value: 1
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .collectible(true)
    .build();

  // Soot Imp (Basic)
  createCard()
    .id(5005)
    .name("Soot Imp")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Battlecry: Deal 1 damage to an enemy minion and apply Burn.")
    .flavorText("A tiny fiend from Muspelheim, leaving ashes in its wake.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("Titan")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_and_burn",
      targetType: "enemy_minion",
      value: 1,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .collectible(true)
    .build();

  // Flame Raven (Basic)
  createCard()
    .id(5006)
    .name("Flame Raven")
    .manaCost(3)
    .attack(2)
    .health(3)
    .description("Flying. Battlecry: Deal 2 damage to an enemy minion.")
    .flavorText("A bird of cinders, born from the sparks of Ragnarök.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("flying")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage",
      targetType: "enemy_minion",
      value: 2,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .collectible(true)
    .build();

  // ===== FIRE MINIONS (Standalone Pets - Rare) =====

  // Muspelspawn (Standalone)
  createCard()
    .id(5010)
    .name("Muspelspawn")
    .manaCost(4)
    .attack(4)
    .health(3)
    .description("Rush. Battlecry: Apply Burn to all enemy minions.")
    .flavorText("A spawn of Muspelheim, its fury melts stone to slag.")
    .rarity("rare")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("rush")
    .addKeyword("battlecry")
    .battlecry({
      type: "apply_burn_all",
      targetType: "enemy_minions"
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .collectible(true)
    .build();

  // Eldbera, the Flame Bear (Standalone)
  createCard()
    .id(5011)
    .name("Eldbera, the Flame Bear")
    .manaCost(4)
    .attack(4)
    .health(3)
    .description("Rush. Battlecry: Gain +2 Attack this turn.")
    .flavorText("The fire bear of Muspelheim, its claws burn with eternal flame.")
    .rarity("rare")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("rush")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_self_temporary",
      targetType: 'none',
      buffAttack: 2,
      duration: "this_turn"
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .collectible(true)
    .build();

  // ===== FIRE MINIONS (Evolution Pets - Mythic) =====

  // Surtr's Spawn (Evolution)
  createCard()
    .id(5020)
    .name("Surtr's Spawn")
    .manaCost(5)
    .attack(4)
    .health(4)
    .description("Battlecry: Deal 1 damage to a random enemy. At the end of your turn, deal 1 damage to a random enemy.")
    .flavorText("Born of the fire giant's wrath, it burns all in its path.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_random",
      targetType: "random_enemy",
      value: 1
    })
    .customProperty("endOfTurn", {
      type: "damage",
      targetType: "random_enemy",
      value: 1
    })
    .customProperty("onPlay", {
      type: "damage",
      targetType: "random_enemy",
      value: 1
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Logi's Fang (Evolution)
  createCard()
    .id(5021)
    .name("Logi's Fang")
    .manaCost(5)
    .attack(4)
    .health(4)
    .description("When this deals damage, apply Burn. Passive: When Burn is applied, give a random friendly Fire minion +1 Attack.")
    .flavorText("The fang of Logi, the personification of wildfire in Norse myth, consuming all in its path.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .customProperty("onDealDamage", {
      type: "apply_burn",
      targetType: "damaged_target"
    })
    .customProperty("passive", {
      type: "on_burn_applied",
      effect: {
        type: "buff_random",
        targetType: "friendly_fire_minion",
        buffAttack: 1
      }
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Phoenix (Evolution)
  createCard()
    .id(5022)
    .name("Phoenix")
    .manaCost(5)
    .attack(4)
    .health(4)
    .description("Flying. Battlecry: Deal 3 damage to all enemy minions.")
    .flavorText("A majestic bird, reborn from the ashes of its former self.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("flying")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_all",
      targetType: "enemy_minions",
      value: 3
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Loki's Ember (Evolution)
  createCard()
    .id(5023)
    .name("Loki's Ember")
    .manaCost(6)
    .attack(4)
    .health(4)
    .description("Charge. Battlecry: Gain +3 Attack this turn and deal 2 damage to a random enemy. When this attacks, deal 1 damage to the enemy hero.")
    .flavorText("Born of the trickster god's flames, mischief and destruction follow in its wake.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("Titan")
    .addKeyword("charge")
    .addKeyword("battlecry")
    .battlecry({
      type: "compound",
      effects: [
        {
          type: "buff_self_temporary",
          buffAttack: 3,
          duration: "this_turn"
        },
        {
          type: "damage_random",
          targetType: "random_enemy",
          value: 2
        }
      ]
    })
    .customProperty("onAttack", {
      type: "damage",
      targetType: "enemy_hero",
      value: 1
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Muspeldreki (Evolution)
  createCard()
    .id(5024)
    .name("Muspeldreki")
    .manaCost(5)
    .attack(3)
    .health(5)
    .description("Flying. Battlecry: Deal 2 damage to all enemies.")
    .flavorText("A dreki from Muspelheim, its wings spread the flames of Ragnarök.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("dragon")
    .addKeyword("flying")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_all",
      targetType: "all_enemies",
      value: 2
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Eldjotnar (Evolution)
  createCard()
    .id(5025)
    .name("Eldjotnar")
    .manaCost(5)
    .attack(4)
    .health(4)
    .description("When this deals damage, apply Burn. Passive: When Burn triggers, deal 1 damage to a random enemy.")
    .flavorText("A fire giant's kin, its rage scorches the Nine Realms.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .customProperty("onDealDamage", {
      type: "apply_burn",
      targetType: "damaged_target"
    })
    .customProperty("passive", {
      type: "on_burn_trigger",
      effect: {
        type: "damage",
        targetType: "random_enemy",
        value: 1
      }
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // Muspel's Harbinger (Evolution)
  createCard()
    .id(5026)
    .name("Muspel's Harbinger")
    .manaCost(6)
    .attack(4)
    .health(5)
    .description("Flying. Battlecry: Deal 3 damage to all enemies. When this attacks, deal 1 damage to all enemies.")
    .flavorText("A herald of Muspelheim, its wings spread fire across the realms.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("flying")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_all",
      targetType: "all_enemies",
      value: 3
    })
    .customProperty("onAttack", {
      type: "damage",
      targetType: "all_enemies",
      value: 1
    })
    .addCategory("norse_mythology")
    .addCategory("fire_minion")
    .addCategory("fire_mythic")
    .collectible(true)
    .build();

  // ===== WATER MINIONS (Basic Pets - Common) =====

  // Tide Serpent (Basic)
  createCard()
    .id(5100)
    .name("Tide Serpent")
    .manaCost(3)
    .attack(2)
    .health(3)
    .description("Taunt. Battlecry: Gain +2 Health this turn.")
    .flavorText("A serpent of the deep, guarding ocean secrets.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_self_temporary",
      targetType: 'none',
      buffHealth: 2,
      duration: "this_turn"
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // Aquatile (Basic)
  createCard()
    .id(5101)
    .name("Aquatile")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Battlecry: Deal 1 damage to an enemy minion.")
    .flavorText("A swift swimmer, darting through the tides.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage",
      targetType: "enemy_minion",
      value: 1,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // Frost Nokk (Basic)
  createCard()
    .id(5102)
    .name("Frost Nokk")
    .manaCost(2)
    .attack(1)
    .health(3)
    .description("Battlecry: Freeze an enemy minion.")
    .flavorText("A spirit of frozen waters, chilling all who dare approach.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "freeze",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // Tide Colt (Basic)
  createCard()
    .id(5103)
    .name("Tide Colt")
    .manaCost(3)
    .attack(2)
    .health(3)
    .description("Taunt. Battlecry: Restore 2 Health to this minion.")
    .flavorText("A young steed of the sea, resilient as the endless waves.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal_self",
      targetType: 'none',
      value: 2
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // Ullr's Hunting Hound (Basic)
  createCard()
    .id(5104)
    .name("Ullr's Hunting Hound")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Battlecry: Foresee a Beast from your deck.")
    .flavorText("Blessed by the god of hunt, it tracks prey through frost and snow.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "discover",
      targetType: 'none',
      discoverType: "beast_from_deck"
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // Thrym's Guard Dog (Basic)
  createCard()
    .id(5105)
    .name("Thrym's Guard Dog")
    .manaCost(4)
    .attack(3)
    .health(5)
    .description("Taunt. When attacked, gain +1 Attack.")
    .flavorText("Guardian of the frost giant's hall, its fury grows with each strike.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .customProperty("onDamageTaken", {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // Frostbristle Boar (Basic)
  createCard()
    .id(5106)
    .name("Frostbristle Boar")
    .manaCost(3)
    .attack(2)
    .health(3)
    .description("Battlecry: Freeze a minion.")
    .flavorText("Its bristles crackle with frost, freezing all in its path.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "freeze",
      targetType: "any_minion",
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // Aegir's Brew (Basic)
  createCard()
    .id(5107)
    .name("Aegir's Brew")
    .manaCost(3)
    .attack(2)
    .health(4)
    .description("Battlecry: Reduce an enemy minion's Attack by 2.")
    .flavorText("A magical concoction from the sea god's hall, weakening all who taste it.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "debuff",
      targetType: "enemy_minion",
      debuffAttack: -2,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // Njord's Tide (Basic)
  createCard()
    .id(5108)
    .name("Njord's Tide")
    .manaCost(2)
    .attack(1)
    .health(3)
    .description("Battlecry: Move an enemy minion and Freeze it.")
    .flavorText("The sea god's wave, pushing foes aside and trapping them in ice.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "compound",
      effects: [
        {
          type: "move_minion",
          targetType: "enemy_minion"
        },
        {
          type: "freeze",
          targetType: "enemy_minion"
        }
      ],
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // ===== WATER MINIONS (Standalone Pets - Rare) =====

  // Frostborn Titan (Standalone)
  createCard()
    .id(5110)
    .name("Frostborn Titan")
    .manaCost(5)
    .attack(4)
    .health(6)
    .description("Taunt. Battlecry: Gain +3 Health this turn.")
    .flavorText("A giant of Jotunheim, unyielding as eternal ice.")
    .rarity("rare")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_self_temporary",
      targetType: 'none',
      buffHealth: 3,
      duration: "this_turn"
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // Skadi's Snow Wolf (Standalone)
  createCard()
    .id(5111)
    .name("Skadi's Snow Wolf")
    .manaCost(5)
    .attack(4)
    .health(4)
    .description("Stealth. When this attacks, Freeze the target.")
    .flavorText("The hunting companion of the winter goddess, striking from the blizzard.")
    .rarity("rare")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .customProperty("onAttack", {
      type: "freeze",
      targetType: "attack_target"
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .collectible(true)
    .build();

  // ===== WATER MINIONS (Evolution Pets - Mythic) =====

  // Sea Wyrm (Evolution)
  createCard()
    .id(5120)
    .name("Sea Wyrm")
    .manaCost(6)
    .attack(4)
    .health(6)
    .description("Taunt. Passive: When this Freezes an enemy, deal 1 damage to it. Battlecry: Freeze an enemy minion and deal 2 damage to it.")
    .flavorText("A monstrous kin of the sea, its breath chills the waves.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "compound",
      effects: [
        {
          type: "freeze",
          targetType: "enemy_minion"
        },
        {
          type: "damage",
          targetType: "enemy_minion",
          value: 2
        }
      ],
      requiresTarget: true
    })
    .customProperty("passive", {
      type: "on_freeze",
      effect: {
        type: "damage",
        targetType: "frozen_target",
        value: 1
      }
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Hydrodrake (Evolution)
  createCard()
    .id(5121)
    .name("Hydrodrake")
    .manaCost(5)
    .attack(4)
    .health(4)
    .description("When an enemy attacks, reduce its Attack by 1. Battlecry: Deal 3 damage to all enemy minions with 2 or less Attack.")
    .flavorText("A drake of the depths, commanding the currents.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("dragon")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_conditional",
      targetType: "enemy_minions",
      value: 3,
      condition: { attackLessOrEqual: 2 }
    })
    .customProperty("onEnemyAttack", {
      type: "debuff",
      targetType: "attacker",
      debuffAttack: -1
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Nix of Niflheim (Evolution)
  createCard()
    .id(5122)
    .name("Nix of Niflheim")
    .manaCost(5)
    .attack(3)
    .health(5)
    .description("When attacked, Freeze the attacker. Passive: Frozen enemies take +1 damage. Battlecry: Freeze all enemy minions.")
    .flavorText("A spirit of the frozen realm, encasing all in eternal ice.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "freeze_all",
      targetType: "enemy_minions"
    })
    .customProperty("onDamageTaken", {
      type: "freeze",
      targetType: "attacker"
    })
    .customProperty("passive", {
      type: "damage_increase_frozen",
      value: 1,
      targetType: "frozen_enemies"
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Aegir's Steed (Evolution)
  createCard()
    .id(5123)
    .name("Aegir's Steed")
    .manaCost(6)
    .attack(4)
    .health(6)
    .description("Taunt. Passive: When this is healed, deal 1 damage to a random enemy. Battlecry: Restore 3 Health to all friendly minions.")
    .flavorText("The sea god's mount, its healing waves bring destruction to foes.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal_all",
      targetType: "friendly_minions",
      value: 3
    })
    .customProperty("passive", {
      type: "on_healed",
      effect: {
        type: "damage",
        targetType: "random_enemy",
        value: 1
      }
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Aegir's Flood (Evolution)
  createCard()
    .id(5124)
    .name("Aegir's Flood")
    .manaCost(6)
    .attack(4)
    .health(6)
    .description("When this attacks, reduce the target's Attack by 1. Passive: When this reduces Attack, deal 1 damage to that minion. Battlecry: Reduce all enemy minions' Attack by 2.")
    .flavorText("The sea god's wrath, drowning enemies in weakening tides.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "debuff_all",
      targetType: "enemy_minions",
      debuffAttack: -2
    })
    .customProperty("onAttack", {
      type: "debuff",
      targetType: "attack_target",
      debuffAttack: -1
    })
    .customProperty("passive", {
      type: "on_attack_reduced",
      effect: {
        type: "damage",
        targetType: "debuffed_minion",
        value: 1
      }
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // Njord's Tempest (Evolution)
  createCard()
    .id(5125)
    .name("Njord's Tempest")
    .manaCost(5)
    .attack(3)
    .health(5)
    .description("Battlecry: Freeze an enemy minion. Passive: When an enemy is Frozen, restore 1 Health to this minion.")
    .flavorText("The sea god's storm, freezing foes while sustaining itself.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "freeze",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .customProperty("passive", {
      type: "on_enemy_frozen",
      effect: {
        type: "heal_self",
        value: 1
      }
    })
    .addCategory("norse_mythology")
    .addCategory("water_minion")
    .addCategory("water_mythic")
    .collectible(true)
    .build();

  // ===== GRASS/EARTH MINIONS =====

  // Vine Sprout (Basic - Common)
  createCard()
    .id(6200)
    .name("Vine Sprout")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Battlecry: Restore 2 Health to a friendly minion.")
    .flavorText("A tender shoot, brimming with life.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal",
      targetType: "friendly_minion",
      value: 2,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .collectible(true)
    .build();

  // Ash Sprig (Basic - Common)
  createCard()
    .id(6201)
    .name("Ash Sprig")
    .manaCost(2)
    .attack(1)
    .health(3)
    .description("Battlecry: Give a friendly minion +2 Health this turn.")
    .flavorText("A sprout from Yggdrasil's ash, granting temporary fortitude.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_temporary",
      targetType: "friendly_minion",
      buffAttack: 0,
      buffHealth: 2,
      duration: "this_turn",
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .collectible(true)
    .build();

  // Fawn of Alfheim (Basic - Common)
  createCard()
    .id(6202)
    .name("Fawn of Alfheim")
    .manaCost(3)
    .attack(2)
    .health(4)
    .description("Battlecry: Restore 2 Health to a friendly minion.")
    .flavorText("A gentle creature from the realm of light elves, its touch heals wounds.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal",
      targetType: "friendly_minion",
      value: 2,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .collectible(true)
    .build();

  // Idunn's Seed (Basic - Common)
  createCard()
    .id(6203)
    .name("Idunn's Seed")
    .manaCost(2)
    .attack(1)
    .health(3)
    .description("Battlecry: Restore 2 Health to a friendly minion.")
    .flavorText("A seed from the goddess of youth's garden, carrying life's essence.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal",
      targetType: "friendly_minion",
      value: 2,
      requiresTarget: true
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .collectible(true)
    .build();

  // Leaf Stag (Standalone - Rare)
  createCard()
    .id(6210)
    .name("Leaf Stag")
    .manaCost(4)
    .attack(3)
    .health(4)
    .description("Rush. Battlecry: Give a friendly minion +2 Health this turn.")
    .flavorText("A noble beast, crowned with verdant antlers.")
    .rarity("rare")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("rush")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_temporary",
      targetType: "friendly_minion",
      buffAttack: 0,
      buffHealth: 2,
      duration: "this_turn",
      requiresTarget: true
    })
    .customProperty("onAttack", {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .addCategory("grass_rare")
    .collectible(true)
    .build();

  // Gefjon's Ox (Standalone - Rare)
  createCard()
    .id(6211)
    .name("Gefjon's Ox")
    .manaCost(7)
    .attack(6)
    .health(7)
    .description("Taunt. When attacked, deal 3 damage to the attacker.")
    .flavorText("The mighty oxen that plowed the land of Zealand into existence.")
    .rarity("rare")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .customProperty("onDamageTaken", {
      type: "damage",
      targetType: "attacker",
      value: 3
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .addCategory("grass_rare")
    .collectible(true)
    .build();

  // Thorn Warden (Evolution - Mythic)
  createCard()
    .id(6220)
    .name("Thorn Warden")
    .manaCost(5)
    .attack(3)
    .health(5)
    .description("Taunt. Passive: When attacked, gain +1 Health this turn. Battlecry: Restore 3 Health to all friendly minions.")
    .flavorText("A guardian of the grove, its thorns repel all foes.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal_all",
      targetType: "friendly_minions",
      value: 3
    })
    .customProperty("passive", {
      type: "on_damaged",
      effect: {
        type: "buff_temporary",
        targetType: "self",
        buffHealth: 1,
        duration: "this_turn"
      }
    })
    .customProperty("onAttack", {
      type: 'apply_status',
      statusEffect: 'freeze',
      targetType: 'target'
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .addCategory("grass_mythic")
    .collectible(true)
    .build();

  // Yggdrasil's Bough (Evolution - Mythic)
  createCard()
    .id(6221)
    .name("Yggdrasil's Bough")
    .manaCost(5)
    .attack(3)
    .health(6)
    .description("Taunt. Passive: When buffed, restore 1 Health to all friendly minions. Battlecry: Give all friendly minions +2 Health this turn.")
    .flavorText("A branch from the World Tree, channeling life to all it protects.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_temporary_all",
      targetType: "friendly_minions",
      buffAttack: 0,
      buffHealth: 2,
      duration: "this_turn"
    })
    .customProperty("passive", {
      type: "on_buffed",
      effect: {
        type: "heal_all",
        targetType: "friendly_minions",
        value: 1
      }
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .addCategory("grass_mythic")
    .collectible(true)
    .build();

  // Elven Hart (Evolution - Mythic)
  createCard()
    .id(6222)
    .name("Elven Hart")
    .manaCost(6)
    .attack(4)
    .health(6)
    .description("When healed, gain +1 Attack. Passive: Adjacent minions have +1 Health. Battlecry: Restore 3 Health to all friendly minions.")
    .flavorText("A majestic stag of Alfheim, its presence strengthens all nearby.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal_all",
      targetType: "friendly_minions",
      value: 3
    })
    .customProperty("onHealed", {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 0
    })
    .customProperty("aura", {
      type: "adjacent_buff",
      buffAttack: 0,
      buffHealth: 1
    })
    .customProperty("onAttack", {
      type: 'apply_status',
      statusEffect: 'poison_dot',
      targetType: 'target'
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .addCategory("grass_mythic")
    .collectible(true)
    .build();

  // Idunn's Apple (Evolution - Mythic)
  createCard()
    .id(6223)
    .name("Idunn's Apple")
    .manaCost(5)
    .attack(3)
    .health(5)
    .description("Start of turn: Restore 1 Health to all friendly minions. Passive: When this restores Health, give a random friendly minion +1 Attack.")
    .flavorText("The golden apple of eternal youth, spreading vitality across the battlefield.")
    .rarity("mythic")
    .type("minion")
    .class("Neutral")
    .heroClass("neutral")
    .race("elemental")
    .customProperty("startOfTurn", {
      type: "heal_all",
      targetType: "friendly_minions",
      value: 1
    })
    .customProperty("passive", {
      type: "on_heal",
      effect: {
        type: "buff",
        targetType: "random_friendly_minion",
        buffAttack: 1,
        buffHealth: 0
      }
    })
    .addCategory("norse_mythology")
    .addCategory("grass_minion")
    .addCategory("grass_mythic")
    .collectible(true)
    .build();

  if (IS_DEV) debug.card('Norse mythology cards registered successfully.');
}