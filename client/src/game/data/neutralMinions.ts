/**
 * Neutral minions for Echoes of Ymir
 * Expanding the neutral minion collection with more iconic cards
 */
import { CardData } from '../types';

/**
 * Collection of iconic neutral minions from the game
 * This includes a mix of common, rare, epic, and some additional mythic minions
 */
export const   neutralMinions: CardData[] = [{
      id: 29970,

      name: "Völva of the Realms",
      manaCost: 3,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Restore 3 Health.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "heal",
      value: 3,

      requiresTarget: true,
      targetType: 'any'

       },
      collectible: true
  },
  {
  id: 29971,
  
  name: "Shield Bearer of Asgard",
  manaCost: 4,
  
  attack: 3,
  health: 5,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt",
  keywords: ["taunt"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 29972,
  
  name: "Flame Priestess of Loki",
  manaCost: 2,
  
  attack: 3,
  health: 2,
  
  type: "minion",
  rarity: "rare",
  
  description: "After you cast a spell, deal 1 damage to ALL minions.",
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
      id: 29973,

      name: "Oracle of the Sea Depths",
      manaCost: 3,

      attack: 2,
      health: 2,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Each player draws 2 cards.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Naga",

                  battlecry: {
        type: "draw_both",

        value: 2,
      requiresTarget: false

       },
      collectible: true
  },
  {
      id: 29974,

      name: "Doppelganger of Loki",
      manaCost: 5,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Choose a minion and become a copy of it.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "copy",


        requiresTarget: true,

      targetType: 'any'
    },
      collectible: true
  },
  {
  id: 30009,
  
  name: "Harbinger of Ragnarok",
  manaCost: 2,
  
  attack: 0,
  health: 7,
  
  type: "minion",
  rarity: "rare",
  
  description: "At the start of your turn, destroy ALL minions.",
  heroClass: "neutral",
      class: "Neutral",
      collectible: true,
      startOfTurn: { type: "destroy_all_minions" }
  },
  {
  id: 30010,
  
  name: "Colossus of Aegir",
  manaCost: 10,
  
  attack: 8,
  health: 8,
  
  type: "minion",
  rarity: "rare",
  
  description: "Costs (1) less for each minion on the battlefield.",
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30011,
  
  name: "Colossus of Muspelheim",
  manaCost: 20,
  
  attack: 8,
  health: 8,
  
  type: "minion",
  rarity: "epic",
  
  description: "Costs (1) less for each damage your hero has taken.",
  heroClass: "neutral", race: "none",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30013,

      name: "Dragon of Dusk and Dawn",
      manaCost: 4,

      attack: 4,
      health: 1,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Gain +1 Health for each card in your hand.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Dragon",

                  battlecry: {
        type: "health_per_card",

          requiresTarget: false
    
    },
      collectible: true
  },
  {
  id: 30014,
  
  name: "Initiate of Suffering",
  manaCost: 3,
  
  attack: 1,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "Whenever this minion takes damage, draw a card.",
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30015,
  
  name: "Merchant of the Nine Realms",
  manaCost: 6,
  
  attack: 4,
  health: 4,
  
  type: "minion",
  rarity: "rare",
  
  description: "Whenever you cast a spell, draw a card.",
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30016,

      name: "Gentle Beast Master",
      manaCost: 4,

      attack: 5,
      health: 4,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Adapt your Nagas.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Beast",

                  battlecry: {
        type: "adapt",

        targetType: "friendly_nagas",
      requiresTarget: false

       },
      collectible: false
  },
  {
      id: 30017,

      name: "Summoner of Spirits",
      manaCost: 6,

      attack: 4,
      health: 4,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Reveal a spell from your deck. Summon a random minion with the same Cost.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "summon_from_spell_cost",


        requiresTarget: false

      
       },
      collectible: true
  
    },
  {
  id: 30018,
  
  name: "Crawler of the Shadows",
  manaCost: 7,
  
  attack: 5,
  health: 5,
  
  type: "minion",
  rarity: "common",
  
  description: "Costs (1) less for each minion that died this turn.",
  keywords: [],
  
  heroClass: "neutral", race: "none",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30019,

      name: "Devouring Rune Cube",
      manaCost: 5,

      attack: 4,
      health: 6,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Destroy a friendly minion.   Deathrattle: Summon 2 copies of it.",
    keywords: ["battlecry", "deathrattle"],
      heroClass: "neutral",
      class: "Neutral",

                  battlecry: {
        type: "destroy_and_store",

        targetType: 'friendly_minion',
      requiresTarget: false

       },
      deathrattle: {
        type: "summon_stored",
      
      value: 2

      
       }
    },
  {
      id: 30020,

      name: "Shadow Ripper of Muspelheim",
      manaCost: 3,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Swap the Attack and Health of all other minions.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Titan",

                  battlecry: {
        type: "swap_stats",

        targetType: "all_other_minions",
      requiresTarget: false

       },
      collectible: true
  },
  {
      id: 30021,

      name: "Shadow Spirit of the Void",
      manaCost: 6,

      attack: 4,
      health: 6,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Destroy all 1-Cost spells in both hands and decks.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "destroy_spells_by_cost",
      value: 1,

      targetType: 'any'
    },
      collectible: true
  },
  {
      id: 30022,

      name: "Primal Dragon of the Ancient Times",
      manaCost: 8,

      attack: 4,
      health: 8,

      type: "minion",
      rarity: "common",

      description: "Taunt.   Battlecry: Deal 2 damage to all other minions.",
    keywords: ["taunt", "battlecry"],
      heroClass: "neutral",
      class: "Neutral",

      race: "Dragon",
                  battlecry: {
        type: "damage",
      value: 2,

      targetType: 'any'
    },
      collectible: true
  },
  {
  id: 30023,
  
  name: "Jörmungandr's Spawn",
  manaCost: 5,
  
  attack: 8,
  health: 8,
  
  type: "minion",
  rarity: "rare",
  
  description: "Whenever this minion takes damage, deal 3 damage to your hero.",
  keywords: [],
  
  heroClass: "neutral", race: "none",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30024,

      name: "Charged Beast of Legend",
      manaCost: 8,

      attack: 7,
      health: 7,

      type: "minion",
      rarity: "epic",

      description: "Charge.   Battlecry: Can't attack heroes this turn.",
    keywords: ["charge", "battlecry"],
      heroClass: "neutral",
      class: "Neutral",

      race: "Beast",
                  battlecry: {
        type: "limit_attack_target",
      targetType: "minions_only",

      requiresTarget: false
    },
      collectible: true
  },
  {
      id: 30025,

      name: "Devouring Slime of the Depths",
      manaCost: 3,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Destroy your opponent's weapon and gain Armor equal to its Attack.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "destroy_weapon_gain_armor",


        requiresTarget: false

      
       },
      collectible: true
  },
  {
  id: 30026,
  
  name: "Spell Tyrant of the Gods",
  manaCost: 5,
  
  attack: 4,
  health: 4,
  
  type: "minion",
  rarity: "epic",
  
  description: "Costs (0) if you've cast a spell that costs (5) or more this turn.",
  keywords: [],
  
  heroClass: "neutral", race: "none",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30027,

      name: "Blood Knight of Eternal War",
      manaCost: 3,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: All minions lose Divine Shield. Gain +3/+3 for each Shield lost.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "divine_shield_gain",
      targetType: 'all_minions',

      requiresTarget: false
    },
      collectible: true
  },
  {
      id: 30028,

      name: "Ancient Specter of Ages Past",
      manaCost: 4,

      attack: 7,
      health: 4,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Shuffle an 'Ancient Curse' into your deck that deals 7 damage to you when drawn.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "shuffle_card",
      cardType: "ancient_curse",

      value: 1,
      requiresTarget: false

       },
      collectible: true
  },
  {
  id: 30029,
  
  name: "Titan Bound Soul",
  manaCost: 3,
  
  attack: 3,
  health: 7,
  
  type: "minion",
  rarity: "rare",
  
  description: "At the start of your turn, deal 2 damage to this minion.",
  keywords: [],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30030,

      name: "Flame Summoner of the Gods",
      manaCost: 7,

      attack: 6,
      health: 6,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: If you played an Elemental last turn, deal 5 damage.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Elemental",

                  battlecry: {
        type: "conditional_damage",

        condition: "elemental_last_turn",
      value: 5,

      targetType: 'any',
      requiresTarget: false

       },
      collectible: true
  },
  {
      id: 30031,

      name: "Stone Guardian of the Mountains",
      manaCost: 3,

      attack: 1,
      health: 4,

      type: "minion",
      rarity: "rare",

      description: "Taunt.   Battlecry: Foresee a Taunt minion.",
    keywords: ["taunt", "battlecry", "discover"],
      heroClass: "neutral",
      class: "Neutral",

                  battlecry: {
        type: "discover",

        discoveryType: "taunt",
      requiresTarget: false

       },
      collectible: true
  },
  {
      id: 30032,

      name: "Servant of the Storm Gods",
      manaCost: 5,

      attack: 4,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: If you played an Elemental last turn, Foresee an Elemental.",
    keywords: ["battlecry", "discover"],
      heroClass: "neutral",
      class: "Neutral",

                  battlecry: {
        type: "conditional_discover",

        condition: "elemental_last_turn",
      discoveryType: "elemental",

      requiresTarget: false
    },
      collectible: true
  },
  {
  id: 30033,
  
  name: "Vicious Young Beast",
  manaCost: 3,
  
  attack: 3,
  health: 3,
  
  type: "minion",
  rarity: "rare",
  
  description: "After this minion attacks a hero, Adapt.",
  keywords: [],
  
  heroClass: "neutral", race: "none",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30034,

      name: "Arena Master of Valor",
      manaCost: 6,

      attack: 4,
      health: 4,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: If you control a minion with 6 or more Health, draw 2 cards.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "conditional_draw",
      condition: "control_minion_with_6_health",

      value: 2,
      requiresTarget: false

       },
      collectible: true
  },
  {
      id: 30035,

      name: "Speaker of Shadows",
      manaCost: 5,

      attack: 3,
      health: 6,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Swap stats with a friendly minion.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "swap_stats_with_target",
      targetType: 'friendly_minion',

      requiresTarget: false
    },
      collectible: true
  },
  {
      id: 30036,

      name: "Colossus of the Ruins",
      manaCost: 10,

      attack: 7,
      health: 7,

      type: "minion",
      rarity: "rare",

      description: "Taunt.   Deathrattle: Summon a 7/7 Felcracked Colossus with Taunt.",
    keywords: ["taunt", "deathrattle"],
      heroClass: "neutral",
      class: "Neutral",

      race: "Elemental",
      deathrattle: {
        type: "summon",
      targetType: "none",

      summonCardId: 30044
    },
      collectible: true
  },
  {
  id: 30037,
  
  name: "Titan-Cracked Colossus",
  manaCost: 7,
  
  attack: 7,
  health: 7,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt",
  keywords: ["taunt"],
  
  heroClass: "neutral", race: "Elemental",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30038,
  
  name: "Iron-Headed Guardian",
  manaCost: 8,
  
  attack: 3,
  health: 12,
  
  type: "minion",
  rarity: "rare",
  
  description: "Rush. After this attacks and kills a minion, it may attack again.",
  keywords: ["rush"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30039,

      name: "Rune of Devastation",
      manaCost: 4,

      attack: 4,
      health: 5,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: If you have 10 Mana Crystals, deal 10 damage to a minion.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",

                  battlecry: {
        type: "conditional_damage",

        condition: "have_10_mana",
      value: 10,

      targetType: 'any_minion',
      requiresTarget: false

       },
      collectible: true
  },
  {
  id: 30040,
  
  name: "Ooze of the Abyss",
  manaCost: 7,
  
  attack: 3,
  health: 5,
  
  type: "minion",
  rarity: "epic",
  
  description: "After this minion survives damage, summon a copy of it.",
  keywords: [],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30041,
  
  name: "Muspel Giant",
  manaCost: 10,
  
  attack: 8,
  health: 8,
  
  type: "minion",
  rarity: "epic",
  
  description: "Costs (1) less for each friendly Titan that died this game.",
  keywords: [],
  
  heroClass: "neutral", race: "none",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30042,

      name: "Marsh Shifter of the Swamps",
      manaCost: 5,

      attack: 4,
      health: 4,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Transform into a 4/4 copy of a different minion in your deck.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "transform_copy_from_deck",


        requiresTarget: false,

      value: 1
    },
      collectible: true
  },
  {
      id: 30043,

      name: "Hag of the Clans",
      manaCost: 4,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Summon two 1/1 Amalgams with all minion types.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "summon",
      value: 2,

      summonCardId: 30044,
      requiresTarget: false

       },
      collectible: true
  },
  {
  id: 30044,
  
  name: "Chimera of All Forms",
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "This is an Elemental, Automaton, Draugr, Naga, Dragon, Beast, Pirate and Totem.",
  keywords: [],
  
  heroClass: "neutral", race: "all",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30045,
  
  name: "Storm Tempest of the Gods",
  manaCost: 8,
  
  attack: 6,
  health: 6,
  
  type: "minion",
  rarity: "epic",
  
  description: "Your minions with Windfury have Mega-Windfury.",
  keywords: [],
  
  heroClass: "neutral", race: "none",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30046,
  
  name: "Bronze Knuckles of War",
  manaCost: 4,
  
  attack: 2,
  durability: 3,
  
  type: "weapon",
  rarity: "rare",
  
  description: "After your hero attacks, give a random minion in your hand +1/+1.",
  keywords: [],
  
  heroClass: "neutral",
  
  // Effect handled in game logic,
      class: "Neutral",
      collectible: true
  },
  {
  id: 30047,
  
  name: "Embrace of the Depths",
  manaCost: 2,
  
  type: "spell",
  rarity: "rare",
  
  description: "Deal 3 damage to all damaged minions.",
  keywords: [],
  
  heroClass: "neutral",
  class: "Neutral",
  spellEffect: {
    type: "aoe_damage",
    value: 3,
    requiresTarget: false,
    targetType: "damaged_minions",
    affectsDamagedOnly: true
  },
  collectible: true
  },
  {
      id: 30048,

      name: "Piloted Reaper",
      manaCost: 4,

      attack: 4,
      health: 3,

      type: "minion",
      rarity: "rare",

      description: "Deathrattle: Summon a random 2-Cost minion.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",

      deathrattle: {
        type: "summon_random",

        targetType: "none",
      specificManaCost: 2

       },
      collectible: true
  },
  {
      id: 30049,

      name: "Weaponized Piñata",
      manaCost: 4,

      attack: 4,
      health: 3,

      type: "minion",
      rarity: "epic",

      description: "Deathrattle: Add a random Mythic minion to your hand.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",

      deathrattle: {
        type: "add_to_hand",

        targetType: "none",
      value: 1,

      specificRarity: "mythic"
    },
      collectible: true
  },
  {
      id: 30050,

      name: "Augmented Porcupine",
      manaCost: 3,

      attack: 2,
      health: 4,

      type: "minion",
      rarity: "rare",

      description: "Deathrattle: Deal this minion's Attack damage randomly split among all enemies.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Beast",

      deathrattle: {
        type: "split_damage",

        targetType: "all_enemies"
    },
      collectible: true
  
    },
  {
      id: 30051,

      name: "Windshear Stormcaller",
      manaCost: 5,

      attack: 5,
      health: 5,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: If you control all 4 basic Totems, summon Al'Akir the Windlord.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "conditional_summon",
      condition: "control_all_basic_totems",

      summonCardId: 13001, // ID for Al'Akir,
      requiresTarget: false

       },
      collectible: true
  },
  {
  id: 30052,
  
  name: "Reckless Flurry",
  manaCost: 3,
  
  type: "spell",
  rarity: "rare",
  
  description: "Spend all your Armor. Deal that much damage to all minions.",
  keywords: [],
  
  heroClass: "neutral",
  class: "Neutral",
  spellEffect: {
    type: "armor_to_aoe_damage",
    requiresTarget: false,
    targetType: "all_minions",
    spendAllArmor: true
  },
  collectible: true
  },
  {
  id: 30053,
  
  name: "Frozen Mammoth",
  manaCost: 7,
  
  attack: 6,
  health: 7,
  
  type: "minion",
  rarity: "rare",
  
  description: "Frozen. When this minion is Frozen, it has +2/+2.",
  keywords: ["frozen"],
  
  heroClass: "neutral", race: "Beast",
  
  // Effect handled in game logic,
      class: "Neutral",
      collectible: true
  },
  {
  id: 30054,
  
  name: "Grave Horror",
  manaCost: 12,
  
  attack: 7,
  health: 8,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt. Costs (1) less for each spell you've cast this game.",
  keywords: ["taunt"],
  
  heroClass: "neutral", // Cost reduction handled in game logic
  class: "Neutral",
      collectible: true
  },
  {
      id: 30055,

      name: "Darkscale Healer",
      manaCost: 5,

      attack: 4,
      health: 5,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Restore 2 health to all friendly characters.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "heal",
        value: 2,
        targetType: 'all',
        requiresTarget: false
      },
      collectible: true
  },
  {
      id: 30056,

      name: "Dwarven Machinist",
      manaCost: 4,

      attack: 2,
      health: 4,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Summon a 2/1 Automaton Dragonling.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "summon",
        summonCardId: 30057,
        requiresTarget: false
      },
      collectible: true
  },
  {
  id: 30057,
  
  name: "Mechanical Dragonling",
  manaCost: 1,
  
  attack: 2,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "A small mechanical servant.",
  heroClass: "neutral", race: "Automaton",
      class: "Neutral",
      collectible: false
  },
  {
      id: 30058,

      name: "Razorfen Hunter",
      manaCost: 3,

      attack: 2,
      health: 3,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Summon a 1/1 Boar.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "summon",
        summonCardId: 30059,
        requiresTarget: false
      },
      collectible: true
  },
  {
  id: 30059,
  
  name: "Boar",
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "A wild beast of the hunt.",
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: false
  },
  {
      id: 30060,

      name: "Sól's Acolyte",
      manaCost: 3,

      attack: 3,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Give a friendly minion +1/+1.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "buff",
        targetType: 'friendly_minion',
        requiresTarget: true,
        buffAttack: 1,
        buffHealth: 1
      },
      collectible: true
  },
  {
  id: 30061,
  
  name: "Draugr Feaster",
  manaCost: 3,
  
  attack: 2,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "Whenever a minion dies, gain +1 Attack.",
  keywords: ["on_minion_death"],
  
  heroClass: "neutral", race: "Undead",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30062,
  
  name: "Dire Wolf Alpha",
  manaCost: 2,
  
  attack: 2,
  health: 2,
  
  type: "minion",
  rarity: "common",
  
  description: "Adjacent minions have +1 Attack.",
  keywords: ["aura"],
  
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30063,
  
  name: "Ancient Watcher",
  manaCost: 2,
  
  attack: 4,
  health: 5,
  
  type: "minion",
  rarity: "common",
  
  description: "Can't attack.",
  keywords: ["cant_attack"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30064,
  
  name: "Valkyrie Crusader",
  manaCost: 3,
  
  attack: 3,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "Divine Shield",
  keywords: ["divine_shield"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30065,
  
  name: "Jungle Panther",
  manaCost: 3,
  
  attack: 4,
  health: 2,
  
  type: "minion",
  rarity: "common",
  
  description: "Stealth",
  keywords: ["stealth"],
  
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30066,
  
  name: "Ironfur Grizzly",
  manaCost: 3,
  
  attack: 3,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt",
  keywords: ["taunt"],
  
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30067,
  
  name: "Vanaheim Elder",
  manaCost: 3,
  
  attack: 1,
  health: 4,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt",
  keywords: ["taunt"],
  
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30068,
  
  name: "Raid Leader",
  manaCost: 3,
  
  attack: 2,
  health: 2,
  
  type: "minion",
  rarity: "common",
  
  description: "Your other minions have +1 Attack.",
  keywords: ["aura"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30069,
  
  name: "Fenrir's Rider",
  manaCost: 3,
  
  attack: 3,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "Charge",
  keywords: ["charge"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30070,
  
  name: "Fenrir's Hatchling",
  manaCost: 2,
  
  attack: 3,
  health: 2,
  
  type: "minion",
  rarity: "common",
  
  description: "A deadly predator from the swamps.",
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30071,
  
  name: "Sobek's Spawn",
  manaCost: 2,
  
  attack: 2,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "A scaled guardian of the rivers.",
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30072,
  
  name: "Frostwolf Grunt",
  manaCost: 2,
  
  attack: 2,
  health: 2,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt",
  keywords: ["taunt"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30073,
  
  name: "Stoneskin Gargoyle",
  manaCost: 3,
  
  attack: 1,
  health: 4,
  
  type: "minion",
  rarity: "common",
  
  description: "At the start of your turn, restore this minion to full Health.",
  keywords: ["turn_start_effect"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30074,

      name: "Tinkertown Technician",
      manaCost: 3,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "common",

      description: "Battlecry: If you control an Automaton, gain +1/+1 and add a spare part to your hand.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "conditional_buff_and_add",
        condition: "control_automaton",
        buffAttack: 1,
        buffHealth: 1
      },
      collectible: true
  },
  {
      id: 30075,

      name: "Explodinator",
      manaCost: 4,

      attack: 3,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Summon two 0/2 Goblin Bombs.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",
                  battlecry: {
        type: "summon_multiple",
        summonCardId: 30076,
        count: 2
      },
      collectible: true
  },
  {
      id: 30076,

      name: "Rune Bomb",
      manaCost: 1,

      attack: 0,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Deal 2 damage to the enemy hero.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",
      deathrattle: {
        type: "deal_damage",
        targetType: 'enemy_hero',
        value: 2
      },
      collectible: false
  },
  {
      id: 30077,

      name: "Faithful Lumi",
      manaCost: 1,

      attack: 1,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Give a friendly Automaton +1/+1.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "buff",
        targetType: 'friendly_mech',
        requiresTarget: true,
        buffAttack: 1,
        buffHealth: 1
      },
      collectible: true
  },
  {
  id: 30078,
  
  name: "Upgradeable Framebot",
  manaCost: 2,
  
  attack: 1,
  health: 5,
  
  type: "minion",
  rarity: "common",
  
  description: "A mechanical construct awaiting enhancement.",
  heroClass: "neutral", race: "Automaton",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30079,
  
  name: "Skaterbot",
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "Runic Bond, Rush",
  keywords: ["magnetic", "rush"],
  
  heroClass: "neutral", race: "Automaton",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30080,
  
  name: "Bronze Gatekeeper",
  manaCost: 3,
  
  attack: 1,
  health: 5,
  
  type: "minion",
  rarity: "common",
  
  description: "Runic Bond, Taunt",
  keywords: ["magnetic", "taunt"],
  
  heroClass: "neutral", race: "Automaton",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30081,

      name: "Damaged Stegotron",
      manaCost: 6,

      attack: 5,
      health: 12,

      type: "minion",
      rarity: "common",

      description: "Taunt. Battlecry: Deal 5 damage to this minion.",
      keywords: ["taunt", "battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",
                  battlecry: {
        type: "self_damage",
        value: 5,
        requiresTarget: false
      },
      collectible: true
  },
  {
      id: 30082,

      name: "Spring Rocket",
      manaCost: 3,

      attack: 2,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Deal 2 damage.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",
                  battlecry: {
        type: "deal_damage",
        targetType: 'any',
        requiresTarget: true,
        value: 2
      },
      collectible: true
  },
  {
      id: 30083,

      name: "Spark Engine",
      manaCost: 2,

      attack: 2,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Rush. Battlecry: Add a 1/1 Spark with Rush to your hand.",
      keywords: ["rush", "battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",
                  battlecry: {
        type: "add_to_hand",
        cardId: 30084
      },
      collectible: true
  },
  {
  id: 30084,
  
  name: "Spark",
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "Rush",
  keywords: ["rush"],
  
  heroClass: "neutral", race: "Elemental",
      class: "Neutral",
      collectible: false
  },
  {
      id: 30085,

      name: "Coppertail Imposter",
      manaCost: 4,

      attack: 4,
      health: 4,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Gain Stealth until your next turn.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",
                  battlecry: {
        type: "gain_stealth_until_next_turn",
        requiresTarget: false
      },
      collectible: true
  },
  {
      id: 30086,

      name: "Arena Fanatic",
      manaCost: 4,

      attack: 2,
      health: 3,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Give all minions in your hand +1/+1.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "buff_hand",
        buffAttack: 1,
        buffHealth: 1,
        requiresTarget: false
      },
      collectible: true
  },
  {
      id: 30087,

      name: "Cheaty Anklebiter",
      manaCost: 2,

      attack: 2,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Lifesteal. Battlecry: Deal 1 damage.",
      keywords: ["lifesteal", "battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "deal_damage",
        targetType: 'any',
        requiresTarget: true,
        value: 1
      },
      collectible: true
  },
  {
      id: 30088,

      name: "Waterboy",
      manaCost: 2,

      attack: 2,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Battlecry: The next Hero Power you use this turn costs (0).",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "reduce_hero_power_cost",
        value: 0,
        requiresTarget: false
      },
      collectible: true
  },
  {
  id: 30089,
  
  name: "Soup Vendor",
  manaCost: 2,
  
  attack: 1,
  health: 4,
  
  type: "minion",
  rarity: "common",
  
  description: "Whenever you restore a minion to full Health, draw a card.",
  keywords: ["on_heal_to_full"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30090,
  
  name: "Dozing Marksman",
  manaCost: 3,
  
  attack: 0,
  health: 4,
  
  type: "minion",
  rarity: "common",
  
  description: "Has +4 Attack while damaged.",
  keywords: ["enrage"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30091,

      name: "Saronite Taskmaster",
      manaCost: 1,

      attack: 2,
      health: 3,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Summon a 0/3 Free Agent with Taunt for your opponent.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      deathrattle: {
        type: "summon_for_opponent",
        summonCardId: 30092
      },
      collectible: true
  },
  {
  id: 30092,
  
  name: "Free Agent",
  manaCost: 1,
  
  attack: 0,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt",
  keywords: ["taunt"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: false
  },
  {
  id: 30093,
  
  name: "Spellzerker",
  manaCost: 2,
  
  attack: 2,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "Has +2 Spell Damage while damaged.",
  keywords: ["conditional_spell_damage"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
  id: 30094,
  
  name: "Gurubashi Chicken",
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "Overkill: Gain +5 Attack.",
  keywords: ["overkill"],
  
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30095,

      name: "Ornery Tortoise",
      manaCost: 3,

      attack: 3,
      health: 5,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Deal 5 damage to your hero.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Beast",
                  battlecry: {
        type: "deal_damage_to_hero",
        value: 5,
        requiresTarget: false
      },
      collectible: true
  },
  {
  id: 30096,
  
  name: "Half-Time Scavenger",
  manaCost: 4,
  
  attack: 3,
  health: 5,
  
  type: "minion",
  rarity: "common",
  
  description: "Stealth. Overkill: Gain 3 Armor.",
  keywords: ["stealth", "overkill"],
  
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30097,

      name: "Pterrordax Hatchling",
      manaCost: 3,

      attack: 2,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Adapt.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Beast",
                  battlecry: {
        type: "adapt",
        requiresTarget: false
      },
      collectible: false
  },
  {
      id: 30098,

      name: "Tortollan Forager",
      manaCost: 2,

      attack: 2,
      health: 2,

      type: "minion",
      rarity: "common",

      description: "Battlecry: Add a random minion with 5 or more Attack to your hand.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
                  battlecry: {
        type: "add_random_to_hand",
        filter: "attack_5_or_more",
        requiresTarget: false
      },
      collectible: true
  },
  {
      id: 30099,

      name: "Nesting Roc",
      manaCost: 5,

      attack: 4,
      health: 7,

      type: "minion",
      rarity: "common",

      description: "Battlecry: If you control at least 2 other minions, gain Taunt.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Beast",
                  battlecry: {
        type: "conditional_gain_taunt",
        condition: "control_2_minions",
        requiresTarget: false
      },
      collectible: true
  },
  {
  id: 30100,
  
  name: "Sabretooth Stalker",
  manaCost: 6,
  
  attack: 8,
  health: 2,
  
  type: "minion",
  rarity: "common",
  
  description: "Stealth",
  keywords: ["stealth"],
  
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
      id: 29975,

      name: "Thunder Lizard",
      manaCost: 3,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "common",

      description: "Battlecry: If you played an Elemental last turn, Adapt.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Beast",
                  battlecry: {
        type: "conditional_adapt",
        condition: "played_elemental_last_turn",
        requiresTarget: false
      },
      collectible: true
  },
  {
  id: 29976,
  
  name: "Stegodon",
  manaCost: 4,
  
  attack: 2,
  health: 6,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt",
  keywords: ["taunt"],
  
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
      id: 29977,

      name: "Volatile Elemental",
      manaCost: 2,

      attack: 1,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Deal 3 damage to a random enemy minion.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Elemental",
      deathrattle: {
        type: "deal_damage",
        targetType: "random_enemy_minion",
        value: 3
      },
      collectible: true
  },
  {
  id: 29978,
  
  name: "Duskboar",
  manaCost: 2,
  
  attack: 4,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "A ferocious beast cloaked in shadow.",
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
  id: 29979,
  
  name: "Emerald Hive Queen",
  manaCost: 1,
  
  attack: 2,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "Your spells cost (2) more.",
  keywords: ["aura"],
  
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
  id: 29980,
  
  name: "Stubborn Gastropod",
  manaCost: 2,
  
  attack: 1,
  health: 2,
  
  type: "minion",
  rarity: "common",
  
  description: "Taunt. Poisonous.",
  keywords: ["taunt", "poisonous"],
  
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: true
  },
  {
      id: 30108,

      name: "Raptor Hatchling",
      manaCost: 1,

      attack: 2,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Shuffle a 4/3 Raptor into your deck.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Beast",
      deathrattle: {
          type: "shuffle_card",
        cardId: "30109"
      },
      collectible: true
  },
  {
  id: 30109,
  
  name: "Raptor",
  manaCost: 3,
  
  attack: 4,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "A mighty prehistoric predator.",
  heroClass: "neutral", race: "Beast",
      class: "Neutral",
      collectible: false
  }
      ];

// Already exporting as a named export, no need for default export