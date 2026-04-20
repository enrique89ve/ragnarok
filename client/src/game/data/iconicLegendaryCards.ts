/**
 * Iconic mythic cards
 * A collection of some of the most memorable legendaries from the classic sets and expansions
 */
import { CardData } from '../types';

/**
 * Collection of iconic mythic minions
 * These cards have had significant impact on the meta over the years
 */
export const   iconicLegendaryCards: CardData[] = [{
      id: 95101,

      name: "Brokkr the Explorer",
      manaCost: 3,

      attack: 2,
      health: 4,

      type: "minion",
      rarity: 'rare',

      description: "Your Battlecries trigger twice.",
      flavorText: "Brokkr and Sindri forged Mjölnir, Draupnir, and Gullinbursti in a single wager with Loki — and won. (Skáldskaparmál 35)",

      keywords: [],
      heroClass: "neutral",
      collectible: true, 
    // Special handling in game logic for battlecries
  class: "Neutral"
},
  {
      id: 95102,

      name: "Echo of the World Serpent",
      manaCost: 9,

      attack: 6,
      health: 6,

      type: "minion",
      rarity: "mythic",

      description: "Battlecry: Repeat all other Battlecries from cards you played this game (targets chosen randomly).",
    flavorText: "Jörmungandr encircles all Midgard, tail in teeth. When he releases his grip, the world ends. (Gylfaginning 34)",
      keywords: ["battlecry"],

      heroClass: "shaman",
      class: "Shaman",
      collectible: true,

                  battlecry: {
        type: "replay_battlecries",

          requiresTarget: false,
      targetType: "none",

      isRandom: true
    }
    },
  {
  id: 95103,
  
  name: "Ægir's Raider",
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  type: "minion",
  rarity: 'rare',
  
  description: "After you play a Pirate, summon this minion from your deck.",
  flavorText: "Ægir's nine daughters are the waves themselves. His raiders ride them fearlessly into battle.",
  
  keywords: [],
  heroClass: "neutral",
  race: "Einherjar",
  collectible: true,

  // Special handling in game logic for summoning from deck
  class: "Neutral"
  },
  {
      id: 95104,

      name: "Reveler of the Wine-God",
      manaCost: 4,

      attack: 3,
      health: 4,

      type: "minion",
      rarity: 'epic',

      description: "Battlecry: Summon a 1/1 copy of a random minion in your deck.",
    flavorText: "At Ægir's feasts, the mead flowed from Eldhrímnir and the tales grew wilder with each horn. Some revelers never left.",
    keywords: ["battlecry"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
                  battlecry: {
        type: "summon_copy_from_deck",
      value: 1,

      requiresTarget: false,
      targetType: "none",

      statOverride: {
      attack: 1,

        health: 1
      },
      randomSelection: true,

      copyType: "minion"
    }
    },
  {
  id: 95105,
  
  name: "Erebus, Prince of Void",
  manaCost: 5,
  
  attack: 5,
  health: 6,
  
  type: "minion",
  rarity: 'rare',
  
  description: "When the game starts, add 5 random Mythic minions to your deck.",
  flavorText: "Erebus, the primordial darkness born of Chaos, dwells where no light has ever reached — not even the light of memory.",
  
  keywords: [],
  heroClass: "neutral",
  race: "Titan",
  collectible: true,

  // Special handling in game logic for start-of-game effect
  class: "Neutral"
  },
  {
  id: 95106,
  
  name: "Triton, Flying Star",
  manaCost: 5,
  
  attack: 2,
  health: 4,
  
  type: "minion",
  rarity: 'rare',
  
  description: "Stealth. After this attacks and kills a minion, summon 2 Nagas from your deck.",
  flavorText: "Triton, son of Poseidon, carries the conch whose blast calms or rouses the sea. Even monsters pause when it sounds. (Apollodorus 1.4.6)",
  
  keywords: ["stealth"],
  heroClass: "neutral",
  race: "Naga",
  
  
  // Special handling in game logic for on-kill effect
  class: "Neutral",
      collectible: true
  },
  {
  id: 95107,
  
  name: "Midas the Golden",
  manaCost: 6,
  
  attack: 5,
  health: 5,
  
  type: "minion",
  rarity: 'rare',
  
  description: "At the end of your turn, reduce the Cost of cards in your hand by (1).",
  flavorText: "King Midas begged Dionysus to take back the golden touch — but by then, even his daughter was cold metal. (Ovid, Metamorphoses XI)",
  
  keywords: [],
  heroClass: "neutral", // Special handling in game logic for cost reduction
  class: "Neutral",
      collectible: true
  },
  {
  id: 95108,
  
  name: "Hel's Warden",
  manaCost: 4,
  
  attack: 1,
  health: 7,
  
  type: "minion",
  rarity: 'rare',
  
  description: "Your minions trigger their Deathrattles twice.",
  flavorText: "In Hel's domain, the dead do not rest — they serve. Those who displease her die a second death, slower than the first.",
  
  keywords: [],
  heroClass: "neutral", // Special handling in game logic for deathrattle repetition
  class: "Neutral",
      collectible: true
  },
  {
      id: 95109,

      name: "Móði (Thor's son)",
      manaCost: 5,

      attack: 4,
      health: 7,

      type: "minion",
      rarity: "mythic",

      description: "Deathrattle: If Magni (Dwarf god) also died this game, summon Surtr's Creation.",
      flavorText: "After Ragnarök, Móði and Magni inherit Mjölnir from their fallen father — the only sons strong enough to lift it. (Vafþrúðnismál 51)",

      keywords: ["deathrattle"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
      deathrattle: {
        type: "summon",
      targetType: "none",

      condition: "magni_died",
      summonCardId: 95111 // Surtr's Creation

       }
    },
  {
      id: 95110,

      name: "Magni (Dwarf god)",
      manaCost: 5,

      attack: 7,
      health: 4,

      type: "minion",
      rarity: 'epic',

      description: "Deathrattle: If Móði (Thor's son) also died this game, summon Surtr's Creation.",
    flavorText: "At three nights old, Magni lifted Hrungnir's leg from Thor's throat — the only being in all the realms strong enough. (Skáldskaparmál 17)",
      keywords: ["deathrattle"],

      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

      deathrattle: {
        type: "summon",

        targetType: "none",
      condition: "modi_died",

      summonCardId: 95111 // Surtr's Creation
    }
    },
  {
  id: 95111,
  
  name: "Surtr's Creation",
  manaCost: 10,
  
  attack: 11,
  health: 11,
  
  type: "minion",
  rarity: "mythic",
  
  description: "A powerful amalgamation of stolen souls.",
  flavorText: "When the sons of Múspell ride forth, the sky itself splits and the earth burns. What they create from ruin is neither living nor dead.",
  
  keywords: [],
  heroClass: "neutral",
      class: "Neutral",
      collectible: false
  },
  {
  id: 95112,
  
  name: "Archlich of Niflheim",
  manaCost: 8,
  
  attack: 6,
  health: 8,
  
  type: "minion",
  rarity: 'rare',
  
  description: "At the end of each turn, summon all friendly minions that died this turn.",
  flavorText: "Niflheim's cold does not destroy — it preserves. The dead there do not decay. They accumulate.",
  keywords: [],
  
  heroClass: "neutral", // Special handling in game logic for end-of-turn resurrection
  class: "Neutral",
      collectible: true
  },
  {
  id: 95113,

  name: "Ladon, Chromatic Drake",
  manaCost: 8,

  attack: 6,
  health: 8,

  type: "minion",
  rarity: 'rare',

  description: "Whenever you draw a card, add a copy of it to your hand. (Once per turn)",
  flavorText: "Ladon, the hundred-headed serpent-dragon, coils around the tree of the Hesperides. He never sleeps — each head watches a different star. (Apollodorus 2.5.11)",
  keywords: [],
  
  heroClass: "neutral",
  race: "Dragon",
  
  
  // Special handling in game logic for card copying
  class: "Neutral",
      collectible: true
  },
  {
      id: 95114,

      name: "Dragon-Lord of Chaos",
      manaCost: 9,

      attack: 8,
      health: 8,

      type: "minion",
      rarity: 'epic',

      description: "Battlecry: Add 2 random spells from your opponent's class to your hand.",
      flavorText: "Father of all monsters, Typhon claims dominion over all dragons. The gods themselves once fled from his wrath.",

      keywords: ["battlecry"],
      heroClass: "neutral",
      class: "Neutral",

      race: "Dragon",
      collectible: true,

                  battlecry: {
        type: "discover",

          requiresTarget: false,
      targetType: "none",

      discoveryType: "spell",
      discoveryClass: "opponent_class",

      discoveryCount: 2
    }
    },
  {
      id: 95115,

      name: "Frost-Wyrm of the Eclipse",
      manaCost: 7,

      attack: 6,
      health: 6,

      type: "minion",
      rarity: 'epic',

      description: "Taunt. Deathrattle: If you're holding a Dragon, deal 3 damage to all minions.",
      flavorText: "The wolf who chases the sun will one day swallow it whole.",

      keywords: ["taunt", "deathrattle"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

      race: "Dragon",

      deathrattle: {
        type: "damage",

        targetType: "all_minions",
      value: 3,

      condition: "holding_dragon"
    }
    },
  {
      id: 95116,

      name: "Chaos Elemental",
      manaCost: 8,

      attack: 8,
      health: 6,

      type: "minion",
      rarity: 'rare',

      description: "Deathrattle: Deal 8 damage to all minions.",
    flavorText: "Born from the primordial chaos, its death brings destruction to all around it.",
      keywords: ["deathrattle"],

      heroClass: "mage",
      class: "Mage",
      race: "Elemental",
      collectible: true,
      deathrattle: {
        type: "damage",
      targetType: "all_minions",

      value: 8
    }
    },
  {
      id: 95117,

      name: "Orthrus, Two-Headed",
      manaCost: 7,

      attack: 7,
      health: 7,

      type: "minion",
      rarity: 'rare',

      description: "Battlecry: The next spell you cast this turn costs Health instead of Mana.",
    flavorText: "Orthrus guarded the cattle of Geryon until Heracles struck him down with a single blow of his olive-wood club. (Apollodorus 2.5.10)",
      keywords: ["battlecry"],

      heroClass: "warlock",
      class: "Warlock",
      collectible: true,

                  battlecry: {
        type: "buff",

          requiresTarget: false,
      targetType: "none",

      temporaryEffect: true,
        buffAttack: 1,

        buffHealth: 1
    
    
    }
    },
  {
  id: 95118,
  
  name: "Æsir the Ascended",
  manaCost: 5,
  
  attack: 4,
  health: 6,
  
  type: "minion",
  rarity: 'rare',
  
  description: "Whenever your spells deal damage, restore that much Health to your hero.",
  flavorText: "The Æsir discovered that fire could mend as well as destroy when Sigyn caught Loki's venom in a bowl and turned agony into mercy.",
  
  keywords: [],
  heroClass: "shaman",
  race: "Elemental",
  collectible: true,

  // Special handling in game logic for healing effect
  class: "Shaman",
  },
  {
      id: 95119,

      name: "Twin Titan Kronos",
      manaCost: 7,

      attack: 4,
      health: 6,

      type: "minion",
      rarity: "mythic",

      description: "Battlecry: If your Gullveig has at least 10 Attack, summon a copy of this minion.",
    flavorText: "Time splits when the titan king demands it. One becomes two, and two become eternity.",
    keywords: ["battlecry", "taunt"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
                  battlecry: {
        type: "summon_copy",


        requiresTarget: false,

      targetType: "none",
      condition: "cthun_10_attack"

       }
    },
  {
      id: 95120,

      name: "Mímir the Keeper",
      manaCost: 7,

      attack: 4,
      health: 6,

      type: "minion",
      rarity: 'epic',

      description: "Taunt. Battlecry: Draw a Beast, Dragon, and Naga from your deck.",
    flavorText: "Odin sacrificed his eye at Mímir's Well to drink of its wisdom. Mímir's severed head still counsels the Allfather in times of need. (Völuspá 28)",
    keywords: ["taunt", "battlecry"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

      race: "Automaton",

                  battlecry: {
        type: "draw_by_type",

          requiresTarget: false,
      targetType: "none",

      drawTypes: ["beast", "dragon", "naga"],
    }
    },
  {
      id: 95121,

      name: "Óðinn's Guardian",
      manaCost: 8,

      attack: 7,
      health: 7,

      type: "minion",
      rarity: 'epic',

      description: "Battlecry: Equip Atiesh, Greatstaff of the Guardian.",
    flavorText: "Odin's chosen guardian carries Gungnir's twin — a staff that never misses and summons warriors from the spaces between worlds.",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

                  battlecry: {
        type: "equip_weapon",

          requiresTarget: false,
      targetType: "none",

      summonCardId: 95122 // Atiesh
    }
    },
  {
  id: 95122,
  
  name: "Atiesh, Greatstaff of the Guardian",
  manaCost: 3,
  
  attack: 1,
  durability: 3,
  
  type: "weapon",
  rarity: 'epic',
  
  description: "After you cast a spell, summon a random minion of the same Cost. Lose 1 Durability.",
  flavorText: "Carved from the first branch to fall from Yggdrasil. Each spell it channels leaves behind the echo of a warrior yet unborn.",
  
  keywords: [],
  heroClass: "neutral",
  collectible: true,
  // Special handling in game logic for spell effect
  class: "Neutral"
  },
  {
  id: 95123,
  
  name: "Poseidon's Shark",
  manaCost: 4,
  
  attack: 5,
  health: 4,
  
  type: "minion",
  rarity: "mythic",
  
  description: "Whenever this attacks, both players draw until they have 3 cards.",
  flavorText: "The sea god's favored predator circles the battlefield, drawing fortune for all who witness its hunt.",
  
  keywords: [],
  heroClass: "neutral", // Special handling in game logic for card drawing
  class: "Neutral",
      collectible: true
  },
  {
      id: 95124,

      name: "Artemis Shadowpaw",
      manaCost: 6,

      attack: 5,
      health: 3,

      type: "minion",
      rarity: "mythic",

      description: "Battlecry and   Deathrattle: Summon a Yggdrasil Golem.",
    flavorText: "Artemis walks between the moonlit groves, and where her shadow falls, new life takes root from old death. (Homeric Hymn 27)",
    keywords: ["battlecry", "deathrattle"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
                  battlecry: {
        type: "summon",


        requiresTarget: false,

      targetType: "none",
      summonCardId: -1 // Special handling for Yggdrasil Golem mechanic

       },
      deathrattle: {
        type: "summon",
      targetType: "none",

      summonCardId: -1 // Special handling for Yggdrasil Golem mechanic
    }
    },
  {
      id: 95125,

      name: "Argus White-Eye",
      manaCost: 5,

      attack: 5,
      health: 5,

      type: "minion",
      rarity: 'epic',

      description: "Taunt.   Deathrattle: Shuffle 'The Storm Guardian' into your deck.",
    flavorText: "Argus Panoptes had a hundred eyes, and even in sleep, fifty remained open. Hera trusted him above all others. (Apollodorus 2.1.3)",
    keywords: ["taunt", "deathrattle"],
      heroClass: "shaman",
      class: "Shaman",
      collectible: true,
      deathrattle: {
        type: "shuffle",
      targetType: "none",

      summonCardId: 95126 // The Storm Guardian
    }
    },
  {
  id: 95126,

  name: "Stormwatch Sentinel",
  manaCost: 5,

  attack: 8,
  health: 8,

  type: "minion",
  rarity: 'epic',

  description: "Taunt. Battlecry: Deal 3 damage to all enemy minions.",
  flavorText: "The gatekeeper of his ancestral homeland. Don't knock if he's napping.",

  keywords: ["taunt", "battlecry"],
  battlecry: { type: "aoe_damage", targetType: "all_enemy_minions", value: 3 },
  heroClass: "shaman",
      class: "Shaman",
      collectible: false
  },
  {
      id: 95127,

      name: "Ladon, Guardian Wyrm",
      manaCost: 9,

      attack: 8,
      health: 8,

      type: "minion",
      rarity: 'epic',

      description: "Battlecry: Fill your board with 1/1 Whelps.",
      flavorText: "When Heracles stole the golden apples, Ladon's hundred heads wept as one. The Hesperides placed his image among the stars. (Apollodorus 2.5.11)",

      keywords: ["battlecry"],
      heroClass: "neutral",
      class: "Neutral",

      race: "Dragon",
      collectible: true,

                  battlecry: {
        type: "fill_board",

          requiresTarget: false,
      targetType: "none",

      summonCardId: 95128 // Whelp
    }
    },
  {
  id: 95128,
  
  name: "Whelp",
  manaCost: 1,
  
  attack: 1,
  health: 1,
  
  type: "minion",
  rarity: "common",
  
  description: "A young dragon learning to breathe fire.",
  flavorText: "A baby dragon. Aww, it's so cute! And deadly.",
  keywords: [],
  
  heroClass: "neutral",
  race: "Dragon",
      class: "Neutral",
      collectible: true
  },
  {
  id: 95129,
  
  name: "Atlas the Unbroken",
  manaCost: 8,
  
  attack: 7,
  health: 7,
  
  type: "minion",
  rarity: 'rare',
  
  description: "At the end of each turn, gain +1/+1.",
  flavorText: "The titan who bears the weight of worlds grows ever stronger.",
  keywords: [],
  
  heroClass: "neutral", // Special handling in game logic for growth effect
  class: "Neutral",
      collectible: true
  },
  {
  id: 95130,
  
  name: "Fenrisúlfr the Ravager",
  manaCost: 6,
  
  attack: 4,
  health: 4,
  
  type: "minion",
  rarity: "mythic",
  
  description: "At the end of your turn, summon a 2/2 Wolf with Taunt.",
  flavorText: "The great wolf who will devour Odin at Ragnarök.",
  keywords: [],
  
  heroClass: "neutral", // Special handling in game logic for Gnoll summoning
  class: "Neutral",
      collectible: true
  },
  {
  id: 95131,
  
  name: "Storm-Titan of Tartarus",
  manaCost: 6,
  
  attack: 7,
  health: 5,
  
  type: "minion",
  rarity: 'rare',
  
  description: "After you play a card, summon a 2/1 Storm Spawn.",
  flavorText: "Father of all monsters, his very presence spawns chaos.",
  keywords: [],
  
  heroClass: "neutral",
  race: "Titan",
  
  
  // Special handling in game logic for Flame summoning
  class: "Neutral",
      collectible: true
  },
  {
      id: 95132,

      name: "The Nemean Beast",
      manaCost: 6,

      attack: 9,
      health: 7,

      type: "minion",
      rarity: 'rare',

      description: "Deathrattle: Summon a 3/3 Sindri's Apprentice for your opponent.",
      flavorText: "Descended from the legendary Nemean Lion, its hide is impervious but its appetite knows no bounds.",

      keywords: ["deathrattle"],
      heroClass: "neutral",
      class: "Neutral",

      race: "Beast",
      collectible: true,

      deathrattle: {
        type: "summon",

        targetType: "none",
    summonCardId: 95133, // Sindri's Apprentice
      // Special handling for summoning for opponent will be in deathrattle code
      condition: "summon_for_opponent"

       }
    },
  {
  id: 95133,
  
  name: "Sindri's Apprentice",
  manaCost: 3,
  
  attack: 3,
  health: 3,
  
  type: "minion",
  rarity: "common",
  
  description: "A famed apprentice of the dwarven smith.",
  flavorText: "Sindri's apprentices learn the sacred art of svartalfar smithing: fold the metal seven times, quench it in starlight, and never blink.",
  
  keywords: [],
  heroClass: "neutral",
      class: "Neutral",
      collectible: true
  },
  {
      id: 95134,

      name: "Hanuman the Wild",
      manaCost: 3,

      attack: 5,
      health: 5,

      type: "minion",
      rarity: 'rare',

      description: "Battlecry: Give your opponent 2 Bananas.",
    flavorText: "The divine monkey god shares his bounty, for better or worse.",
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

      cardId: 95135, // Banana
      giveToOpponent: true

       }
    },
  {
      id: 95135,

      name: "Bananas",
      manaCost: 1,

      type: "spell",
      rarity: "common",

      description: "Give a minion +1/+1.",
    flavorText: "Hanuman offered fruit to Rama as a gesture of devotion. Even the gods accept humble gifts graciously. (Ramayana)",
      keywords: [],

      heroClass: "neutral",
      class: "Neutral",
      collectible: true,

      spellEffect: {
        type: "buff",

        targetType: "any_minion",
      requiresTarget: true,

      buffAttack: 1,
      buffHealth: 1

       }
    },
  {
      id: 95136,

      name: "Ægir Greenwave",
      manaCost: 5,

      attack: 5,
      health: 4,

      type: "minion",
      rarity: 'rare',

      description: "Battlecry: Give your weapon +1/+1.",
    flavorText: "Ægir's hall beneath the waves gleams with gold brighter than firelight. Those he invites to feast rarely wish to leave. (Lokasenna, prose intro)",
      keywords: ["battlecry"],

      heroClass: "neutral",
      class: "Neutral",
      race: "Einherjar",
      collectible: true,
                  battlecry: {
        type: "buff_weapon",


        requiresTarget: false,

      targetType: "none",
      buffAttack: 1,

      buffDurability: 1
    }
    },
  {
      id: 95137,

      name: "Mountain-Queen's Champion",
      manaCost: 5,

      attack: 5,
      health: 5,

      type: "minion",
      rarity: "mythic",

      description: "Battlecry: Give both players the power to ROCK! (with a Power Chord card)",
      flavorText: "The mountain-queen Skaði chose her husband by his feet alone — and mistook Njörðr's sea-washed soles for Baldr's. (Gylfaginning 23)",

      keywords: ["battlecry"],
      heroClass: "neutral",
      class: "Neutral",
      collectible: true,
                  battlecry: {
        type: "give_cards",


        requiresTarget: false,

      targetType: "none",
      cardCount: 1,

      giveToOpponent: true,
      randomCardFromSet: true

      // Special handling for Power Chord cards
    }
  }
      ];

// Export the iconic mythic cards
export default iconicLegendaryCards;