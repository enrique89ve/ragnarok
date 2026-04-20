/**
 * Final batch of mythic cards for Echoes of Ymir
 * Powerful and unique cards from various card expansions
 */
import { CardData } from '../types';

/**
 * Collection of final mythic cards
 * Includes some of the most impactful mythic cards from the game
 */
export const finalLegendaryCards: CardData[] = [
  {
    id: 95301,
    name: "Unchained Maw",
    manaCost: 9,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Destroy all enemy minions with 5 or less Attack. Deathrattle: If destroyed by a spell or Hero Power, summon a 12/12 Worldbreaker Wolf.",
    flavorText: "Bound by chains of fate, his howl heralds the end of all things.",
    keywords: ["battlecry", "deathrattle"],
    heroClass: "neutral", 
    class: "Neutral", 
    race: "Beast",
    collectible: true,
    battlecry: {
      type: "destroy",
      targetType: "enemy_minions_with_condition",
      condition: "attack_less_than",
      conditionValue: 6
    },
    deathrattle: {
      type: "conditional_summon",
      targetType: "none",
      condition: "killed_by_spell_or_hero_power",
      summonCardId: 95302
    }
  },
  {
    id: 95302,
    name: "Worldbreaker Wolf",
    manaCost: 10,
    attack: 12,
    health: 12,
    type: "minion",
    rarity: 'epic',
    description: "Can't be targeted by spells or Hero Powers.",
    flavorText: "The chains have broken, and with them, the fate of the world.",
    keywords: [],
    heroClass: "neutral", 
    class: "Neutral", 
    race: "Beast",
    collectible: false,
    cantBeTargetedBySpells: true
  },
  {
    id: 95303,
    name: "Talos, Doom Construct",
    manaCost: 10,
    attack: 10,
    health: 10,
    type: "minion",
    rarity: 'epic',
    description: "Deathrattle: If you have no cards in your deck, hand, and battlefield, destroy the enemy hero.",
    flavorText: "The scientific community was shocked when Sindri's latest creation analyzed its purpose in the world and decided that that purpose was to ANNIHILATE ALL LIVING THINGS.",
    keywords: ["deathrattle"],
    heroClass: "neutral", 
    class: "Neutral", 
    race: "Automaton",
    collectible: true,
    deathrattle: {
      type: "destroy",
      targetType: "enemy_hero",
      condition: "empty_deck_hand_board"
    }
  },
  {
    id: 95304,
    name: "Soul-Flayer of the Pack",
    manaCost: 10,
    attack: 9,
    health: 6,
    type: "minion",
    rarity: 'epic',
    description: "Deathrattle: Shuffle a Corrupted Blood into each player's deck.",
    flavorText: "The only thing Hakkar likes more than souls is moist towelettes.",
    keywords: ["deathrattle"],
    heroClass: "neutral", 
    class: "Neutral",
    collectible: true,
    deathrattle: {
      type: "shuffle_card",
      targetType: "both_decks",
      condition: "corrupted_blood",
      value: 1
    }
  },
  {
    id: 95305,
    name: "King Fafnir",
    manaCost: 8,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Swap decks with your opponent. Give them a Ransom spell to swap back.",
    flavorText: "Kobolds have a complex social hierarchy based on who has the shiniest stuff.",
    keywords: ["battlecry"],
    heroClass: "neutral", 
    class: "Neutral",
    collectible: true,
    battlecry: {
      type: "swap_decks",
      requiresTarget: false,
      targetType: "none",
      giveRansom: true
    }
  },
  {
    id: 95306,
    name: "Icarus, Sky Pirate",
    manaCost: 7,
    attack: 4,
    health: 6,
    type: "minion",
    rarity: "rare",
    description: "Charge. Costs (1) less for each friendly Pirate.",
    flavorText: "What's more boss than riding a parrot with a jawbone for a shoulderpad while wielding a giant hook-lance-thing and wearing a pirate hat? NOTHING.",
    keywords: ["charge"],
    heroClass: "neutral", 
    class: "Neutral",
    race: "Einherjar",
    collectible: true,
    costModifier: {
      type: "friendly_minion_count",
      value: -1,
      condition: "pirate_only"
    }
  },
  {
    id: 95307,
    name: "Ran's Champion",
    manaCost: 4,
    attack: 2,
    health: 4,
    type: "minion",
    rarity: "common",
    description: "Charge. Has +1 Attack for each other Naga on the battlefield.",
    flavorText: "He's a legend among nagas. He leads raids on coastal towns. He knows all the fishing spots. He's Ran's Champion!",
    keywords: ["charge"],
    heroClass: "neutral", 
    class: "Neutral",
    race: "Naga",
    collectible: true,
    dynamicAttack: {
      type: "minion_count",
      value: 1,
      condition: "other_nagas"
    }
  },
  {
    id: 95308,
    name: "Daedalus, Master Artificer",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Transform another random minion into a 5/5 Minotaur or a 1/1 Mouse.",
    flavorText: "The legendary craftsman's inventions are unpredictable at best.",
    keywords: ["battlecry"],
    heroClass: "neutral", 
    class: "Neutral",
    collectible: true,
    battlecry: {
      type: "transform_random",
      requiresTarget: false,
      targetType: "random_minion",
      transformOptions: ["devilsaur", "squirrel"]
    }
  },
  {
    id: 95309,
    name: "Njörðr the Fisher",
    manaCost: 2,
    attack: 0,
    health: 4,
    type: "minion",
    rarity: "common",
    description: "At the start of your turn, you have a 50% chance to draw an extra card.",
    flavorText: "The Norse god of the sea and fishing, his catch is always legendary.",
    keywords: [],
    heroClass: "neutral",
    class: "Neutral",
    collectible: true
    // Special handling for 50% chance to draw
  },
  {
    id: 95310,
    name: "Impaler of Olympus",
    manaCost: 4,
    attack: 4,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: If you have at least 4 other minions, deal 4 damage.",
    flavorText: "The Crowd Favorite. The Ogre Poker. The Grand Tournament Champion. The Impaler.",
    keywords: ["battlecry"],
    heroClass: "neutral", 
    class: "Neutral",
    collectible: true,
    battlecry: {
      type: "damage",
      requiresTarget: true,
      targetType: "any",
      value: 4,
      condition: "minion_count",
      conditionValue: 4
    }
  },
  {
    id: 95311,
    name: "The Primordial Dark",
    manaCost: 4,
    attack: 16,
    health: 16,
    type: "minion",
    rarity: "epic",
    description: "Starts Dormant. Battlecry: Shuffle 3 Candles into the enemy deck. When drawn, this awakens.",
    flavorText: "It stirs beneath the dark places of the world. It does not sleep. It does not forgive.",
    keywords: ["battlecry", "dormant"],
    heroClass: "neutral", 
    class: "Neutral",
    collectible: true,
    battlecry: {
      type: "shuffle_card",
      requiresTarget: false,
      targetType: "enemy_deck",
      cardName: "Darkness Candle",
      value: 3
    }
  },
  {
    id: 95312,
    name: "The Binding One",
    manaCost: 10,
    attack: 12,
    health: 12,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Destroy all other minions. Steal your opponent's deck.",
    flavorText: "You may imprison only five minions, but you may imprison a whole deck.",
    keywords: ["battlecry"],
    heroClass: "neutral", 
    class: "Neutral",
    collectible: true,
    battlecry: {
      type: "destroy_and_steal",
      requiresTarget: false,
      targetType: "all_other_minions"
      // Special handling for deck stealing
    }
  },
  {
    id: 95313,
    name: "Blood-Sworn Warlord",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Shuffle 'The First Seal' into your deck.",
    flavorText: "Unlike a blood oath written in ink, his is most definitely written in blood.",
    keywords: ["battlecry"],
    heroClass: "neutral", 
    class: "Neutral",
    collectible: true,
    battlecry: {
      type: "shuffle_card",
      requiresTarget: false,
      targetType: "none",
      cardName: "The First Seal"
      // Special handling for Astalor progression cards
    }
  },
  {
    id: 95314,
    name: "Battle-Conductor of the Skalds",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "After you play a minion, give your minions +1 Attack and deal 1 damage to all enemies this turn.",
    flavorText: "The band's been booked at the Midwinter Feast for a 30-night residency. And also death. Forever.",
    keywords: [],
    heroClass: "warrior", 
    // Special handling for band manager effect
    class: "Warrior",
    collectible: true
  },
  {
    id: 95315,
    name: "Accused Shade of Helheim",
    manaCost: 5,
    attack: 5,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: For the rest of the game, after a friendly minion dies, deal 2 damage to a random enemy minion.",
    flavorText: "She's been accused of many things: betrayal, murder, crimes of fashion, but worst of all, having a predictable writing arc.",
    keywords: ["battlecry"],
    heroClass: "hunter", 
    class: "Hunter",
    collectible: true,
    battlecry: {
      type: "persistent_effect",
      requiresTarget: false,
      targetType: "none",
      triggerCondition: "friendly_death",
      effectType: "random_damage",
      damage: 2,
      targetType2: "random_enemy_minion"
    }
  },
  {
    id: 95316,
    name: "Immortal Eight-Legged Steed",
    manaCost: 7,
    attack: 7,
    health: 7,
    type: "minion",
    rarity: 'epic',
    description: "Rush, Divine Shield. Can't be targeted by spells or Hero Powers.",
    flavorText: "I can't see it. Can you see it? I can't see it.",
    keywords: ["rush", "divine_shield"],
    heroClass: "paladin", 
    race: "Beast",
    class: "Paladin",
    collectible: true,
    cantBeTargetedBySpells: true
  },
  {
    id: 95317,
    name: "Flint Firearm",
    manaCost: 6,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "After you cast a spell, deal 2 damage to a random enemy.",
    flavorText: "After you cast a spell, he says 'Flint FIRE arm' and shoots at a random enemy.",
    keywords: [],
    heroClass: "mage", 
    // Special handling for spell trigger effect
    class: "Mage",
    collectible: true
  },
  {
    id: 95318,
    name: "Toy Captain Tarim",
    manaCost: 6,
    attack: 3,
    health: 7,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Set all other minions' Attack and Health to 3.",
    flavorText: "The original Captain Tarim was too dangerous for action figures. Captain Plushy Toy is much more kid-friendly.",
    keywords: ["battlecry"],
    heroClass: "paladin", 
    class: "Paladin",
    collectible: true,
    battlecry: {
      type: "set_stats",
      requiresTarget: false,
      targetType: "all_other_minions",
      setAttack: 3,
      setHealth: 3
    }
  },
  {
    id: 95319,
    name: "Zok Fogsnout",
    manaCost: 5,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Add a Mass Polymorph to your hand. It costs (1).",
    flavorText: "She's always preferred 'herd' shaman tactics over the more traditional approach.",
    keywords: ["battlecry"],
    heroClass: "shaman", 
    class: "Shaman",
    collectible: true,
    battlecry: {
      type: "add_card",
      requiresTarget: false,
      targetType: "none",
      cardName: "Mass Polymorph",
      costReduction: 1
    }
  },
  {
    id: 95320,
    name: "Gaia, Stone Mother",
    manaCost: 8,
    attack: 5,
    health: 10,
    type: "minion",
    rarity: "rare",
    description: "Taunt. At the end of your turn, summon a 2/3 Elemental with Taunt.",
    flavorText: "She's the mother of all stone elementals, but she's never taken a single one of them for granite.",
    keywords: ["taunt"],
    heroClass: "shaman", 
    race: "Elemental",
    // Special handling for end of turn summoning
    class: "Shaman",
    collectible: true
  },
  {
    id: 95321,
    name: "Mass Polymorph",
    manaCost: 7,
    type: "spell",
    rarity: "rare",
    description: "Transform all minions into 1/1 Sheep.",
    flavorText: "One minute you're a fearsome army, the next minute you're counting sheep.",
    keywords: [],
    heroClass: "shaman", 
    class: "Shaman",
    collectible: false,
    spellEffect: {
      type: "transform_all",
      targetType: "all_minions",
      summonCardId: 14010 // Sheep token
    }
  },
  {
    id: 95322,
    name: "The First Seal",
    manaCost: 3,
    type: "spell",
    rarity: "epic",
    description: "Draw a card. Shuffle 'The Second Seal' into your deck.",
    flavorText: "Breaking the first seal isn't so bad. It's the later ones you need to worry about.",
    keywords: [],
    heroClass: "neutral", 
    class: "Neutral",
    collectible: false,
    spellEffect: {
      type: "draw_and_shuffle",
      value: 1,
      shuffleCardName: "The Second Seal"
    }
  }
];

export default finalLegendaryCards;