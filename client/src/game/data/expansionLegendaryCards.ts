/**
 * Expansion mythic cards for Echoes of Ymir
 * Powerful and unique cards from various card expansions
 */
import { CardData } from '../types';

/**
 * Collection of expansion mythic minions
 * These cards cover several card expansions
 */
export const expansionLegendaryCards: CardData[] = [{
      id: 95401,
      name: "Jötun Giant",
      manaCost: 8,
      attack: 8,
      health: 8,
      type: "minion",
      rarity: "rare",
      description: "Summons Frozen Champions on deathrattle.",
      keywords: ["deathrattle"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
      deathrattle: {
        type: "summon",
        targetType: "none",
        summonCardId: 95402, // Frozen Champion
        value: 2
      }
    },
  {
      id: 95402,

      name: "Frozen Champion",
      manaCost: 1,

      attack: 0,
      health: 1,

      type: "minion",
      rarity: "common",

      description: "Deathrattle: Add a random Mythic minion to your hand.",
    flavorText: "Frozen in time, but not in space.",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      collectible: false,

      deathrattle: {
        type: "add_card",

        targetType: "none",
      condition: "random_mythic",

      value: 1
    }
    },
  {
  id: 95403,
  
  name: "Boreas, Ice Shaper",
  manaCost: 6,
  
  attack: 4,
  health: 4,
  
  type: "minion",
  rarity: "rare",
  
  description: "Whenever another minion is Frozen, add a copy of it to your hand.",
  flavorText: "Boreas, the north wind, once carried off Oreithyia from the banks of the Ilissus. His breath turns rivers to stone. (Apollodorus 3.15.2)",
  
  keywords: [],
  heroClass: "shaman",
  collectible: true,
  // Special handling for freeze copy effect
  class: "Shaman"
  },
  {
      id: 95404,

      name: "Web-Weaver of the Dark",
      manaCost: 9,

      attack: 3,
      health: 7,

      type: "minion",
      rarity: "epic",

      description: "Deathrattle: Summon your Taunt minions that died this game.",
      flavorText: "In Mirkwood's deepest hollow, the web-weavers remember when Ungoliant drank the light of the Two Trees and hungered still.",

      keywords: ["deathrattle"],
      heroClass: "druid",
      class: "Druid",

      race: "Beast",
      collectible: true,

      deathrattle: {
        type: "resurrect",

        targetType: "none",
      condition: "taunt_only"

       }
    },
  {
      id: 95405,

      name: "Prince of Shadows",
      manaCost: 3,

      attack: 3,
      health: 3,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: If your deck has no 3-Cost cards, transform into a 3/3 copy of a minion.",
    flavorText: "The shadow princes of Svartalfheim take the shapes of those they study. By the time you see their true face, you have already forgotten your own.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

                  battlecry: {
        type: "transform_copy",

          requiresTarget: true,
      targetType: "any_minion",

      condition: "no_3_cost_cards"
    }
    },
  {
      id: 95406,

      name: "Prince Hel's Son",
      manaCost: 2,

      attack: 2,
      health: 2,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: If your deck has no 2-Cost cards, give all minions in your deck +1/+1.",
      flavorText: "Hel bore three sons, each more terrible than the last. The eldest could strengthen an army with a whisper.",

      keywords: ["battlecry"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
                  battlecry: {
        type: "buff_deck",


        requiresTarget: false,

      targetType: "none",
      condition: "no_2_cost_cards",

      buffAttack: 1,
      buffHealth: 1

       }
    },
  {
      id: 95407,

      name: "Prince of Blood",
      manaCost: 4,

      attack: 4,
      health: 4,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: If your deck has no 4-Cost cards, gain Lifesteal and Taunt.",
      flavorText: "The blood-prince learned that true power lies not in the sword but in the vein — whoever controls the blood controls the battle.",

      keywords: ["battlecry"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
                  battlecry: {
        type: "gain_keyword",


        requiresTarget: false,

      targetType: "none",
      condition: "no_4_cost_cards",

      keywords: ["lifesteal", "taunt"]
    }
    },
  {
      id: 95408,

      name: "Garmr, Death Hound",
      manaCost: 4,

      attack: 2,
      health: 2,

      type: "minion",
      rarity: "rare",

      description: "Deathrattle: Add a random Death Knight card to your hand.",
      flavorText: "Good boy!",

      keywords: ["deathrattle"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

      race: "Beast",

      deathrattle: {
        type: "add_card",

        targetType: "none",
      condition: "random_death_knight",

      value: 1
    }
    },
  {
      id: 95409,

      name: "Eris, Shadow Dancer",
      manaCost: 4,

      attack: 4,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Replace spells in your hand with random spells (from your opponent's class).",
    flavorText: "Eris tossed a golden apple marked 'For the Fairest' among the goddesses and watched the Trojan War ignite from a single act of spite. (Apollodorus, Epitome 3.2)",
      keywords: ["battlecry"],

      heroClass: "rogue",
      class: "Rogue",
      collectible: true,

                  battlecry: {
        type: "replace_spells",

          requiresTarget: false,
      targetType: "none",

      replaceWith: "opponent_class_spells"
    }
    },
  {
  id: 95410,
  
  name: "Gaia, Earth Sculptor",
  manaCost: 8,
  
  attack: 4,
  health: 8,
  
  type: "minion",
  rarity: "rare",
  
  description: "At the end of your turn, summon a random minion with Cost equal to your Armor (up to 10).",
  flavorText: "Gaia shaped mountains from her own body and rivers from her tears. The armor she wears is the earth itself — strike her, and the land bleeds.",
  keywords: [],
  
  heroClass: "warrior",
  collectible: true,

  // Special handling for armor-based summon
  class: "Warrior"
  },
  {
  id: 95411,
  
  name: "Ragnarok Cleaver",
  manaCost: 8,
  
  attack: 3,
  durability: 3,
  
  type: "weapon",
  rarity: "epic",
  
  description: "After your hero attacks, Recruit a minion.",
  flavorText: "Woe to all, woe to all, who heard the cleaving call.",
  keywords: [],
  
  heroClass: "warrior", // Special handling for recruit on attack
  class: "Warrior",
      collectible: true
  },
  {
      id: 95412,

      name: "Daedalus, Spark Maker",
      manaCost: 6,

      attack: 5,
      health: 7,

      type: "minion",
      rarity: "epic",

      description: "Battlecry and   Deathrattle: Add a Spare Part card to your hand.",
    flavorText: "Daedalus built the Labyrinth, crafted wings from wax and feathers, and watched his son Icarus fall. Invention without wisdom is ruin. (Apollodorus, Epitome 1.12)",
    keywords: ["battlecry", "deathrattle"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
                  battlecry: {
        type: "give_cards",


        requiresTarget: false,

      targetType: "none",
      cardCount: 1,

      isRandom: true
      // Special handling for Spare Part card type
    },
      deathrattle: {
        type: "draw",
      targetType: "none",

      value: 1
      // Special handling for Spare Part card type
    }
    },
  {
  id: 95413,
  
  name: "Antaeus, Earth Crusher",
  manaCost: 7,
  
  attack: 6,
  health: 6,
  
  type: "minion",
  rarity: "rare",
  
  description: "Whenever your opponent casts a spell, summon a Burly Rockjaw Trogg.",
  flavorText: "Antaeus drew strength from his mother Gaia each time he touched the earth. Heracles held him aloft and crushed him in the air. (Apollodorus 2.5.11)",
  
  keywords: [],
  heroClass: "neutral",
  collectible: true,
  // Special handling for summoning Troggs
  class: "Neutral",
  },
  {
      id: 95414,

      name: "Hephaestus' Gift",
      manaCost: 5,

      attack: 3,
      health: 4,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Equip a random weapon for each player.",
      flavorText: "Hephaestus forged the aegis of Zeus, the armor of Achilles, and the chains of Prometheus. Even the gods depend on his craft. (Iliad XVIII)",

      keywords: ["battlecry"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

      race: "Automaton",

                  battlecry: {
        type: "random_weapon",

          requiresTarget: false,
      targetType: "none",

      forBothPlayers: true
    }
    },
  {
  id: 95415,
  
  name: "Daedalus, the Tinkerer",
  manaCost: 6,
  
  attack: 3,
  health: 6,
  
  type: "minion",
  rarity: "rare",
  
  description: "Whenever you cast a 1-cost spell, add a random Automaton to your hand.",
  flavorText: "Daedalus never built the same thing twice. Each invention solved one problem and created two more — the mark of true genius.",
  
  keywords: [],
  heroClass: "neutral", 
  // Special handling for mech card generation
  class: "Neutral",
      collectible: true
  },
  {
  id: 95416,
  
  name: "Talos, Mechanical Head",
  manaCost: 5,
  
  attack: 4,
  health: 5,
  
  type: "minion",
  rarity: "rare",
  
  description: "At the start of your turn, if you have at least 3 Automatons, destroy them all and form V-07-TR-0N.",
  flavorText: "Talos, the bronze giant of Crete, circled the island three times daily. His single vein of ichor ran from neck to ankle, sealed by a bronze nail. (Apollodorus 1.9.26)",
  
  keywords: [],
  heroClass: "neutral",
  race: "Automaton",
  
  // Special handling for V-07-TR-0N transformation
  class: "Neutral",
      collectible: true
  },
  {
      id: 95417,

      name: "Orion, Beast Hunter",
      manaCost: 5,

      attack: 6,
      health: 3,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Destroy a Beast.",
    flavorText: "Orion, the great hunter, boasted he could slay every creature on earth. Gaia sent the scorpion to humble him. Both were placed among the stars. (Apollodorus 1.4.3)",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

                  battlecry: {
        type: "destroy",

          requiresTarget: true,
      targetType: "beast"

       }
    },
  {
  id: 95418,
  
  name: "Talos, War Engineer",
  manaCost: 9,
  
  attack: 9,
  health: 7,
  
  type: "minion",
  rarity: "rare",
  
  description: "Whenever an enemy minion dies, summon a 1/1 Leper Gnome.",
  flavorText: "When Medea removed Talos's bronze nail, the ichor drained and the guardian fell — proving that even the mightiest construct has a single fatal flaw.",
  
  keywords: [],
  heroClass: "neutral",
  race: "Automaton",
  collectible: true,

  // Special handling for Leper Gnome summoning
  class: "Neutral",
  },
  {
  id: 95419,
  
  name: "Talos, Reaper Construct",
  manaCost: 8,
  
  attack: 6,
  health: 9,
  
  type: "minion",
  rarity: "rare",
  
  description: "Also damages the minions next to whomever this attacks.",
  flavorText: "The third incarnation of Talos was built to reap, not to guard — fitted with scythe-arms that could harvest a phalanx in a single pass.",
  keywords: [],
  
  heroClass: "neutral",
  race: "Automaton",
  
  // Special handling for cleave attack
  class: "Neutral",
      collectible: true
  },
  {
      id: 95420,

      name: "Hephaestus' Shredder",
      manaCost: 8,

      attack: 5,
      health: 7,

      type: "minion",
      rarity: "epic",

      description: "Deathrattle: Summon a random mythic minion.",
    flavorText: "Hephaestus built automatons to serve in his forge — golden maidens with intelligence, voice, and strength. Even his tools had souls. (Iliad XVIII.417)",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Automaton",
      collectible: true,
      deathrattle: {
        type: "summon",
        targetType: "none",

        // Special handling for summoning a random mythic minion
        condition: "random_mythic",

        summonCardId: 95421
    }
    },
  {
      id: 95421,

      name: "Judge of the Aesir Court",
      manaCost: 6,

      attack: 6,
      health: 3,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Replace your starting Hero Power with a better one.",
    flavorText: "To judge among the Æsir is to weigh one oath against another. Forseti, son of Baldr, sits in Glitnir and settles every dispute. (Grímnismál 15)",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

                  battlecry: {
        type: "replace_hero_power",

          requiresTarget: false,
        targetType: "none"

        // Special handling for hero power replacement
    }
    },
  {
      id: 95422,

      name: "Echo of the Dragon Slayer",
      manaCost: 7,

      attack: 8,
      health: 4,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: If you're holding a Dragon, destroy a Mythic minion.",
    flavorText: "Sigurd tasted Fáfnir's blood and understood the speech of birds. They told him Regin planned to betray him. He struck first. (Völsunga Saga 19)",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

                  battlecry: {
        type: "destroy",

          requiresTarget: true,
        targetType: "mythic_minion",

        condition: "holding_dragon"
    }
    },
  {
      id: 95423,

      name: "Surtr's Herald",
      manaCost: 9,

      attack: 9,
      health: 7,

      type: "minion",
      rarity: 'epic',

      description: "Deathrattle: Replace your hero with Surtr, Flame Lord.",
      flavorText: "He's Surtr's #1 fan.",

      keywords: ["deathrattle"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
      deathrattle: {
        type: "summon",
        targetType: "none",

        // Special condition for Surtr hero replacement
        condition: "transform_into_ragnaros",

        summonCardId: 95424
    }
    },
  {
      id: 95424,

      name: "Hanuman, Tyrant of the Vale",
      manaCost: 6,

      attack: 5,
      health: 5,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Add 2 Bananas to your hand.",
    flavorText: "Hanuman leapt across the ocean to Lanka in a single bound, carrying a mountain of healing herbs. Devotion grants strength the gods themselves envy. (Ramayana, Sundara Kanda)",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Beast",
      collectible: true,
                  battlecry: {
        type: "give_cards",


        requiresTarget: false,

        targetType: "none",
        cardCount: 2,

        cardId: 20136 // Bananas, which we already created
    }
    },
  {
      id: 95425,

      name: "Venom-Mind Gorgon",
      manaCost: 4,

      attack: 3,
      health: 2,

      type: "minion",
      rarity: "rare",

      description: "Battlecry and   Deathrattle: Add a random Toxin card to your hand.",
    flavorText: "The Gorgon's venom has two natures: drawn from the left vein it kills, drawn from the right it heals. Athena gave both to Asclepius. (Apollodorus 3.10.3)",
    keywords: ["battlecry", "deathrattle"],
      heroClass: "rogue",
      class: "Rogue",
      race: "Beast",
      collectible: true,

                  battlecry: {
        type: "give_cards",

          requiresTarget: false,
        targetType: "none",

        cardCount: 1,
        isRandom: true

        // Special handling for Toxin cards
    },
      deathrattle: {
        type: "draw",
        targetType: "none",

        value: 1
      // Special handling for Toxin cards
    }
    },
  {
  id: 95426,
  
  name: "Charon the Steward",
  manaCost: 3,
  
  attack: 1,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "Stealth. At the end of your turn, summon a 1/1 Steward.",
  flavorText: "Charon ferries the dead across the Styx for a single obol. Those who cannot pay wander the shore for a hundred years. (Virgil, Aeneid VI.326)",
  keywords: ["stealth"],
  
  heroClass: "neutral",
  collectible: true,

  // Special handling for Steward summoning
  class: "Neutral",
  },
  {
      id: 95427,

      name: "Hecate the Merchant",
      manaCost: 6,

      attack: 4,
      health: 3,

      type: "minion",
      rarity: "epic",

      description: "Battlecry: Choose a friendly minion. Swap it with a minion in your deck.",
    flavorText: "Hecate stands at the crossroads with three faces — one sees the past, one the present, one the future. She trades in all three. (Hesiod, Theogony 411-452)",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

                  battlecry: {
        type: "swap_with_deck",

          requiresTarget: true,
      targetType: "friendly_minion"

       }
    },
  {
      id: 95428,

      name: "Valkyrie Sally",
      manaCost: 3,

      attack: 1,
      health: 1,

      type: "minion",
      rarity: "rare",

      description: "Deathrattle: Deal damage equal to this minion's Attack to all enemy minions.",
      flavorText: "The valkyries do not choose the strongest — they choose the most worthy. Sometimes the worthiest warrior dies last.",

      keywords: ["deathrattle"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
      deathrattle: {
        type: "damage",
      targetType: "all_enemy_minions",

      value: 1, // Base value from the card's attack
      condition: "use_attack_as_damage" // Special flag for the game logic

       }
    },
  {
  id: 95429,
  
  name: "Fenrir's Fist",
  manaCost: 5,
  
  attack: 3,
  health: 7,
  
  type: "minion",
  rarity: "rare",
  
  description: "After this attacks a minion, it also hits the enemy hero.",
  flavorText: "The great wolf's fury knows no bounds. When Fenrir strikes, all feel his wrath.",
  
  keywords: [],
  heroClass: "hunter",
  race: "Beast",
  collectible: true,

  // Special handling for excess damage to face
  class: "Hunter",
  },
  {
      id: 95430,

      name: "Crime-Lord of the Arena",
      manaCost: 7,

      attack: 5,
      health: 6,

      type: "minion",
      rarity: "rare",

      description: "Battlecry: Give a random minion in your hand +5/+5.",
    flavorText: "In Svartalfheim's deepest markets, the crime-lords trade in secrets heavier than gold. A name whispered here can topple a king in Asgard.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

                  battlecry: {
        type: "buff_hand",

          requiresTarget: false,
      targetType: "none",

      buffAttack: 5,
      buffHealth: 5,

      isRandom: true,
      cardType: "minion"

       }
  }
      ];

export default expansionLegendaryCards;