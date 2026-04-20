import type { CardData } from '../../../../../types';
import { allYggdrasilGolemCards } from './yggdrasilGolems';
import { elderTitanCards } from './elderTitans';
import { allAdaptCards } from './adaptCards';
import { allMechanicCards } from './mechanicCards';
import { allLegendaryCards } from './legendaryCards';
import { allSpellCards } from './spellCards';
import { vanillaMinions } from './vanillaMinions';
import { einherjarCards } from './einherjarCards';
import { bloodPriceCards } from './bloodPriceCards';
import { prophecyCards } from './prophecyCards';
import { realmShiftCards } from './realmShiftCards';
import { ragnarokChainCards } from './ragnarokChainCards';
import { neutralMythicTechCards } from './neutralMythicTechCards';
import { petSynergyCards } from './petSynergyCards';
import { dragonSynergyCards } from './dragonSynergyCards';
import { norseMechanicSynergyCards } from './norseMechanicSynergyCards';
import { deepKeywordCards } from './deepKeywordCards';
import { greekMythicMinions } from './greekMythicMinions';
import { norseMechanicPayoffCards } from './norseMechanicPayoffCards';
import { primordialExpansionCards } from './primordialExpansionCards';
import { wagerCards } from './wagerCards';
import { allBaseCards } from './baseCards';

// Core Set - Neutral Cards
// Organized by rarity following standard CCG conventions
// All cards use Norse/Greek mythology theming

// ============================================
// COMMON NEUTRAL MINIONS
// ============================================
const commonNeutralMinions: CardData[] = [
  {
    id: 1001,
    name: 'Sea Sprite Raider',
    description: 'A scaled naga warrior clutching a coral-tipped spear.',
    flavorText: "From the depths of Aegir's realm, they come with shells as shields!",
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 2,
    health: 1,
    race: 'Naga',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 1002,
    name: 'Fenris Cub',
    description: 'A scrappy wolf pup with oversized paws and glowing amber eyes.',
    flavorText: 'A young spawn of the great wolf Fenrir, destined to grow mighty.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 3,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 1003,
    name: 'Midgard Serpent Spawn',
    description: 'A coiling green serpent with iridescent scales and a forked tongue.',
    flavorText: 'A lesser offspring of Jörmungandr, the World Serpent.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 1004,
    name: 'Jotun Brute',
    description: 'A hulking frost giant wielding a jagged ice club.',
    flavorText: 'From the frozen wastes of Jotunheim, a faithful warrior of the frost giants.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 4,
    health: 5,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 1008,
    name: 'Einherjar Guardian',
    description: 'Taunt',
    flavorText: 'Fallen warriors chosen by the Valkyries to defend Valhalla.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt'],
    collectible: true
  },
  {
    id: 1029,
    name: 'Shadow Panther of Hades',
    description: 'Stealth',
    flavorText: "The shadow cats prowl the underworld's borders.",
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 4,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['stealth'],
    collectible: true
  },
  {
    id: 1030,
    name: 'Crusader of Baldur',
    description: 'Divine Shield',
    flavorText: "Protected by the god of light's blessing.",
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 3,
    health: 1,
    class: 'Neutral',
    set: 'core',
    keywords: ['divine_shield'],
    collectible: true
  },
  {
    id: 1031,
    name: 'Seer of the Norns',
    description: 'Windfury',
    flavorText: 'Glimpsing the threads of fate grants swiftness.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['windfury'],
    collectible: true
  },
  {
    id: 5032,
    name: 'Guardian of Alfheim',
    description: 'Divine Shield',
    flavorText: "The light elves' protector shines with divine light.",
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['divine_shield'],
    collectible: true
  },
  {
    id: 5033,
    name: 'Tinkerer of Midgard',
    description: 'Battlecry: Summon a 2/1 Mechanical Construct.',
    flavorText: "Inspired by the dwarves' craftsmanship.",
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 2,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'summon',
      summonCardId: 5034,
      targetType: 'friendly_battlefield'
    }
  },
  {
    id: 5035,
    name: 'Harpy of the Storm',
    description: 'Windfury',
    flavorText: 'The harpies served the gods by punishing the wicked.',
    type: 'minion',
    rarity: 'common',
    manaCost: 6,
    attack: 4,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['windfury'],
    collectible: true
  },
  {
    id: 5036,
    name: 'Shade Assassin',
    description: 'Battlecry: Deal 3 damage to the enemy hero.',
    flavorText: 'Shadows from the underworld strike without warning.',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 4,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'damage',
      value: 3,
      targetType: 'enemy_hero'
    }
  },
  {
    id: 5037,
    name: 'Priestess of Freyja',
    description: 'Battlecry: Restore 4 Health to your hero.',
    flavorText: "Freyja's priestesses channel her healing light.",
    type: 'minion',
    rarity: 'common',
    manaCost: 6,
    attack: 5,
    health: 4,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    keywords: ['battlecry'],
    battlecry: {
      type: 'heal',
      value: 4,
      targetType: 'friendly_hero'
    }
  },
  {
    id: 5040,
    name: 'Cyclops Guardian',
    description: 'Taunt',
    flavorText: 'The one-eyed giants serve as eternal guardians.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 1,
    health: 7,
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt'],
    collectible: true
  },
  {
    id: 5044,
    name: 'Sentinel of Helheim',
    description: 'Taunt',
    flavorText: 'Guarding the gates between the living and dead.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    keywords: ['taunt']
  },
  {
    id: 5045,
    name: 'Elder Gorilla of the Forest',
    description: 'Taunt',
    flavorText: 'The wise apes protect their sacred groves.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 1,
    health: 4,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt'],
    collectible: true
  },
  {
    id: 5046,
    name: 'Armored Bear of Thor',
    description: 'Taunt',
    flavorText: "Thor's sacred bears wear armor of divine steel.",
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 3,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt'],
    collectible: true
  },
  {
    id: 5047,
    name: 'Swamp Turtle of Midgard',
    description: 'A moss-covered turtle with a stone-hard shell, half-submerged in murk.',
    flavorText: 'Ancient turtles that have witnessed the ages.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 2,
    health: 7,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 5048,
    name: 'Mercenary of Sparta',
    description: 'Taunt',
    flavorText: 'Spartan warriors fight for gold as well as glory.',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 5,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt'],
    collectible: true
  },
  {
    id: 5049,
    name: 'Marsh Stalker',
    description: 'Taunt',
    flavorText: 'Lurking in the swamps between realms.',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 3,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt'],
    collectible: true
  },
  {
    id: 5050,
    name: 'Spiteful Smith of Svartalfheim',
    description: 'Enrage: Your weapon has +2 Attack.',
    flavorText: "The dark elves' smiths forge with fury.",
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 4,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['enrage'],
    collectible: true
  },
  {
    id: 5051,
    name: 'Sea Sprite Oracle',
    description: 'ALL other Nagas have +1 Attack.',
    flavorText: 'The wisest of the sea sprites, they say.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Naga',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 5052,
    name: 'Sea Sprite Hunter',
    description: 'Battlecry: Summon a 1/1 Sea Sprite Scout.',
    flavorText: "Hunting the waves for Aegir's glory.",
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 1,
    race: 'Naga',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'summon',
      summonCardId: 5053,
      targetType: 'friendly_battlefield'
    }
  },
  {
    id: 5062,
    name: 'Glacial Jotunn of Jotunheim',
    description: 'Battlecry: Freeze a character.',
    flavorText: 'The frost giants bring eternal winter.',
    type: 'minion',
    rarity: 'common',
    manaCost: 6,
    attack: 5,
    health: 5,
    race: 'Elemental',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'freeze',
      targetType: 'any',
      requiresTarget: true
    }
  },
  {
    id: 5106,
    name: 'Will-o-wisp',
    description: 'A flickering orb of pale ghostlight drifting through the fog.',
    flavorText: 'Ethereal lights that guide—or mislead—travelers.',
    type: 'minion',
    rarity: 'common',
    manaCost: 0,
    attack: 1,
    health: 1,
    class: 'Neutral',
    set: 'core',
    collectible: false},
  {
    id: 5107,
    name: 'Young Hippogriff',
    description: 'Windfury',
    flavorText: 'Half eagle, half horse, fully magnificent.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['windfury'],
    collectible: true,
    set: 'core'
  },
  // === Migrated from neutralMinions.ts ===
  {
    id: 29970,
    name: 'Volva of the Realms',
    description: 'Battlecry: Restore 3 Health.',
    flavorText: 'The völvas see across all nine realms.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 3,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'heal',
      value: 3,
      requiresTarget: true,
      targetType: 'any'
    }
  },
  {
    id: 29971,
    name: 'Shield Bearer of Asgard',
    description: 'Taunt',
    flavorText: 'Guarding the golden gates of Asgard.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 5,
    class: 'Neutral',
    keywords: ['taunt'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30014,
    name: 'Initiate of Suffering',
    description: 'Whenever this minion takes damage, draw a card.',
    flavorText: 'Pain is the path to wisdom.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 1,
    health: 3,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30055,
    name: 'Healer of Eir',
    description: 'Battlecry: Restore 2 health to all friendly characters.',
    flavorText: 'Eir, the goddess of healing, blesses her followers.',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 4,
    health: 5,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'heal',
      value: 2,
      targetType: 'all_friendly',
      requiresTarget: false
    }
  },
  {
    id: 30056,
    name: 'Artificer of Brokkr',
    description: 'Battlecry: Summon a 2/1 Mechanical Dragonling.',
    flavorText: 'The dwarven smiths craft wonders for the gods.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 2,
    health: 4,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon',
      summonCardId: 30057,
      requiresTarget: false
    }
  },
  {
    id: 30058,
    name: 'Hunter of Skadi',
    description: 'Battlecry: Summon a 1/1 Boar.',
    flavorText: 'Skadi hunts across the frozen mountains.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon',
      summonCardId: 30059,
      requiresTarget: false
    }
  },
  {
    id: 30060,
    name: 'Cleric of Sol',
    description: 'Battlecry: Give a friendly minion +1/+1.',
    flavorText: 'The sun goddess Sol empowers her faithful.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 3,
    health: 2,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff',
      targetType: 'friendly_minion',
      requiresTarget: true,
      buffAttack: 1,
      buffHealth: 1
    }
  },
  {
    id: 30061,
    name: 'Draugr Flesh Eater',
    description: 'Whenever a minion dies, gain +1 Attack.',
    flavorText: 'The restless dead hunger for the living.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 3,
    race: 'Undead',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30062,
    name: 'Alpha Wolf of Fenrir',
    description: 'Adjacent minions have +1 Attack.',
    flavorText: 'The wolves of Fenrir hunt as one pack.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['aura'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30064,
    name: 'Crusader of Valhalla',
    description: 'Divine Shield',
    flavorText: 'Blessed by Odin for eternal glory.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 2,
    class: 'Neutral',
    keywords: ['divine_shield'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30065,
    name: 'Shadow Cat of Hel',
    description: 'Stealth',
    flavorText: 'The cats of Helheim prowl the shadows.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 4,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['stealth'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30066,
    name: 'Bear of the North',
    description: 'Taunt',
    flavorText: 'The great bears guard the northern passes.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 3,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['taunt'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30067,
    name: 'Elder Ape of the Grove',
    description: 'Taunt',
    flavorText: 'Ancient guardians of the sacred forests.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 1,
    health: 4,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['taunt'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30068,
    name: 'War Chief of Vanaheim',
    description: 'Your other minions have +1 Attack.',
    flavorText: 'The Vanir rally behind their champions.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 2,
    class: 'Neutral',
    keywords: ['aura'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30069,
    name: 'Rider of Sleipnir',
    description: 'Charge',
    flavorText: 'Swift as the eight-legged steed of Odin.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 3,
    health: 2,
    class: 'Neutral',
    keywords: ['charge'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30070,
    name: 'Velociraptor of Midgard',
    description: 'A swift, feathered raptor with razor claws bounding through ferns.',
    flavorText: 'Swift predators from the primordial forests.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 3,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30071,
    name: 'River Serpent of Aegir',
    description: 'A sleek water snake gliding through Aegir\'s moonlit rivers.',
    flavorText: 'Lurking in the waters of the sea god.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30072,
    name: 'Warrior of Jotunheim',
    description: 'Taunt',
    flavorText: 'The frost giants train their warriors young.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    keywords: ['taunt'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30073,
    name: 'Stone Guardian of Asgard',
    description: 'At the start of your turn, restore this minion to full Health.',
    flavorText: 'The stone guardians heal as swiftly as dawn.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 1,
    health: 4,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30074,
    name: 'Craftsman of Nidavellir',
    description: 'Battlecry: If you control an Automaton, gain +1/+1 and add a spare part to your hand.',
    flavorText: 'The dwarven craftsmen of the dark fields.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 3,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'conditional_buff_and_add',
      condition: 'control_automaton',
      buffAttack: 1,
      buffHealth: 1
    }
  },
  {
    id: 30075,
    name: 'Bomb Maker of Sindri',
    description: 'Battlecry: Summon two 0/2 Goblin Bombs.',
    flavorText: 'The sons of Ivaldi craft explosive wonders.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 2,
    race: 'Automaton',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon_multiple',
      summonCardId: 30076,
      count: 2
    }
  },
  {
    id: 30077,
    name: 'Sprite of Alfheim',
    description: 'Battlecry: Give a friendly Automaton +1/+1.',
    flavorText: 'The light elves aid the divine constructs.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff',
      targetType: 'friendly_automaton',
      requiresTarget: true,
      buffAttack: 1,
      buffHealth: 1
    }
  },
  {
    id: 30078,
    name: 'Automaton of Ivaldi',
    description: 'A squat dwarven machine of riveted bronze with glowing rune-eyes.',
    flavorText: 'Crafted by the sons of Ivaldi themselves.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 1,
    health: 5,
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30079,
    name: 'Swift Construct',
    description: 'Runic Bond, Rush',
    flavorText: 'Built for speed and combat.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Automaton',
    class: 'Neutral',
    keywords: ['magnetic', 'rush'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30080,
    name: 'Bronze Sentinel',
    description: 'Runic Bond, Taunt',
    flavorText: 'The bronze guardians never tire.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 1,
    health: 5,
    race: 'Automaton',
    class: 'Neutral',
    keywords: ['magnetic', 'taunt'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30081,
    name: 'Wounded Colossus',
    description: 'Taunt. Battlecry: Deal 5 damage to this minion.',
    flavorText: 'Even wounded, the colossus stands firm.',
    type: 'minion',
    rarity: 'common',
    manaCost: 6,
    attack: 5,
    health: 12,
    race: 'Automaton',
    class: 'Neutral',
    keywords: ['taunt', 'battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'self_damage',
      value: 5,
      requiresTarget: false
    }
  },
  {
    id: 30082,
    name: 'Thunder Launcher',
    description: 'Battlecry: Deal 2 damage.',
    flavorText: 'Hurling thunder across the battlefield.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 1,
    race: 'Automaton',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'deal_damage',
      targetType: 'any',
      requiresTarget: true,
      value: 2
    }
  },
  {
    id: 30083,
    name: 'Spark Engine of Muspel',
    description: 'Rush. Battlecry: Add a 1/1 Spark with Rush to your hand.',
    flavorText: 'Powered by the flames of Muspelheim.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 1,
    race: 'Automaton',
    class: 'Neutral',
    keywords: ['rush', 'battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'add_to_hand',
      cardId: 30084
    }
  },
  {
    id: 30085,
    name: 'Shadow Imposter',
    description: 'Battlecry: Gain Stealth until your next turn.',
    flavorText: 'Loki taught many the art of deception.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 4,
    health: 4,
    race: 'Automaton',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'gain_stealth_until_next_turn',
      requiresTarget: false
    }
  },
  {
    id: 30086,
    name: 'Arena Champion of Olympus',
    description: 'Battlecry: Give all minions in your hand +1/+1.',
    flavorText: 'Champions inspire those waiting to fight.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 2,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_hand',
      buffAttack: 1,
      buffHealth: 1,
      requiresTarget: false
    }
  },
  {
    id: 30087,
    name: 'Biting Imp',
    description: 'Lifesteal. Battlecry: Deal 1 damage.',
    flavorText: 'Small but vicious creatures from Svartalfheim.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 1,
    class: 'Neutral',
    keywords: ['lifesteal', 'battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'deal_damage',
      targetType: 'any',
      requiresTarget: true,
      value: 1
    }
  },
  {
    id: 30088,
    name: 'Bearer of Mimir',
    description: 'Battlecry: The next Hero Power you use this turn costs (0).',
    flavorText: 'Carrying the wisdom of Mimir to the worthy.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 1,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'reduce_hero_power_cost',
      value: 0,
      requiresTarget: false
    }
  },
  {
    id: 30089,
    name: 'Mead Vendor of Valhalla',
    description: 'Whenever you restore a minion to full Health, draw a card.',
    flavorText: 'The mead of the gods brings clarity.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 1,
    health: 4,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30090,
    name: 'Resting Archer of Ullr',
    description: 'Has +4 Attack while damaged.',
    flavorText: 'Ullr, god of archery, favors the wounded.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 0,
    health: 4,
    class: 'Neutral',
    keywords: ['enrage'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30091,
    name: 'Taskmaster of Hel',
    description: 'Deathrattle: Summon a 0/3 Free Agent with Taunt for your opponent.',
    flavorText: 'Even in death, they leave trouble behind.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 2,
    health: 3,
    class: 'Neutral',
    keywords: ['deathrattle'],
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon_for_opponent',
      summonCardId: 30092
    }
  },
  {
    id: 30093,
    name: 'Spell Berserker',
    description: 'Has +2 Spell Damage while damaged.',
    flavorText: 'Pain focuses the magical energies.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 3,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30094,
    name: 'Rooster of Gullinkambi',
    description: 'Overkill: Gain +5 Attack.',
    flavorText: 'The golden rooster that crows at Ragnarok.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['overkill'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30095,
    name: 'Stubborn Turtle',
    description: 'Battlecry: Deal 3 damage to your hero.',
    flavorText: 'Ancient and grumpy beyond measure.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 4,
    health: 5,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'deal_damage_to_hero',
      value: 3,
      requiresTarget: false
    }
  },
  {
    id: 30096,
    name: 'Shadow Scavenger',
    description: 'Stealth. Overkill: Gain 3 Armor.',
    flavorText: 'Picking through the aftermath of battle.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 5,
    class: 'Neutral',
    keywords: ['stealth', 'overkill'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30097,
    name: 'Wyvern Hatchling',
    description: 'Battlecry: Adapt.',
    flavorText: 'Young wyverns adapt quickly to survive.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: false,
    set: 'core',
    battlecry: {
      type: 'adapt',
      requiresTarget: false
    }
  },
  {
    id: 30098,
    name: 'Forager of the Wild',
    description: 'Battlecry: Add a random minion with 5 or more Attack to your hand.',
    flavorText: 'Finding strength in the wilderness.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'add_random_to_hand',
      filter: 'attack_5_or_more',
      requiresTarget: false
    }
  },
  {
    id: 30099,
    name: 'Nesting Roc of Zeus',
    description: 'Battlecry: If you control at least 2 other minions, gain Taunt.',
    flavorText: 'The great birds nest on Mount Olympus.',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 4,
    health: 7,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'conditional_gain_taunt',
      condition: 'control_2_minions',
      requiresTarget: false
    }
  },
  {
    id: 30100,
    name: 'Sabretooth of the Frost',
    description: 'Stealth',
    flavorText: 'Silent predators of the frozen wastes.',
    type: 'minion',
    rarity: 'common',
    manaCost: 6,
    attack: 8,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['stealth'],
    collectible: true,
    set: 'core'
  },
  {
    id: 29975,
    name: 'Storm Lizard of Thor',
    description: 'Battlecry: If you played an Elemental last turn, Adapt.',
    flavorText: 'Blessed by the thunder god himself.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 3,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'conditional_adapt',
      condition: 'played_elemental_last_turn',
      requiresTarget: false
    }
  },
  {
    id: 29976,
    name: 'Armored Beast',
    description: 'Taunt',
    flavorText: 'Protected by scales of divine steel.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 2,
    health: 6,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['taunt'],
    collectible: true,
    set: 'core'
  },
  {
    id: 29977,
    name: 'Volatile Fire Spirit',
    description: 'Deathrattle: Deal 3 damage to a random enemy minion.',
    flavorText: 'Spirits of Muspelheim explode on death.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 1,
    health: 1,
    race: 'Elemental',
    class: 'Neutral',
    keywords: ['deathrattle'],
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'deal_damage',
      targetType: 'random_enemy_minion',
      value: 3
    }
  },
  {
    id: 29978,
    name: 'Dusk Boar',
    description: 'A tusked boar with dark bristled hide roaming the twilight forests.',
    flavorText: 'Roaming the twilight between worlds.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 4,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 29979,
    name: 'Queen Bee of Yggdrasil',
    description: 'Your spells cost (2) more.',
    flavorText: 'The bees of the World Tree guard their hive fiercely.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 2,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['aura'],
    collectible: true,
    set: 'core'
  },
  {
    id: 29980,
    name: 'Venomous Snail',
    description: 'Taunt. Poisonous.',
    flavorText: 'Slow but deadly.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 1,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['taunt', 'poisonous'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30108,
    name: 'Raptor Hatchling of Midgard',
    description: 'Deathrattle: Shuffle a 4/3 Raptor into your deck.',
    flavorText: 'The raptors of Midgard grow swiftly.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 2,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['deathrattle'],
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'shuffle_card',
      cardId: 30109
    }
  },
  // === From specialEffectNeutrals.ts ===
  {
    id: 1201,
    name: 'Jeweled Scarab of Ra',
    description: 'Battlecry: Foresee a 3-Cost card.',
    flavorText: 'The sacred scarab reveals hidden treasures.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 1,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['battlecry', 'discover'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'discover',
      value: 3,
      requiresTarget: false
    }
  },
  {
    id: 1202,
    name: 'Young Brewmaster of Vanaheim',
    description: 'Battlecry: Return a friendly minion from the battlefield to your hand.',
    flavorText: 'The Vanir brew the finest mead.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 3,
    health: 2,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'return',
      requiresTarget: true,
      targetType: 'friendly_minion'
    }
  },
  {
    id: 1203,
    name: 'Elder Brewmaster of Vanaheim',
    description: 'Battlecry: Return a friendly minion from the battlefield to your hand.',
    flavorText: 'Ancient masters of the divine brew.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 5,
    health: 4,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'return',
      requiresTarget: true,
      targetType: 'friendly_minion'
    }
  },
  // === From neutralSpellsAndTech.ts ===
  {
    id: 31014,
    name: 'Keeper of the Fallen',
    description: 'Whenever one of your other minions dies, draw a card.',
    flavorText: 'Recording the names of the fallen for Valhalla.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 4,
    health: 2,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  }
];

// ============================================
// COMMON NEUTRAL SPELLS
// ============================================
const commonNeutralSpells: CardData[] = [
  {
    id: 4505,
    name: 'Rune of Asgard',
    description: "Give a minion +2/+2. If it's a Dragon, also give it Divine Shield.",
    flavorText: 'Sacred runes inscribed by Odin himself grant divine protection.',
    type: 'spell',
    rarity: 'common',
    manaCost: 3,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 4506,
    name: "Yggdrasil's Gift",
    description: 'Refresh 2 Mana Crystals.',
    flavorText: 'The World Tree shares its infinite energy with those who are worthy.',
    type: 'spell',
    rarity: 'common',
    manaCost: 0,
    class: 'Neutral',
    collectible: true
  },
  {
    id: 25019,
    name: 'Golden Apple',
    description: 'Give a minion +1/+1.',
    type: 'spell',
    rarity: 'common',
    manaCost: 1,
    class: 'Neutral',
    set: 'core',
    collectible: false,
    spellEffect: {
      type: 'buff',
      buffAttack: 1,
      buffHealth: 1,
      targetType: 'any_minion',
      requiresTarget: true
    }
  }
];

// ============================================
// RARE NEUTRAL MINIONS
// ============================================
const rareNeutralMinions: CardData[] = [
  {
    id: 2002,
    name: 'Nidhogg Whelp',
    description: 'Spell Damage +1. Battlecry: Draw a card.',
    flavorText: "Young kin of Níðhöggr, the dragon who gnaws at Yggdrasil's roots.",
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 4,
    health: 4,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    heroClass: 'neutral',
    keywords: ['battlecry', 'spell_damage'],
    collectible: true,
    battlecry: {
      type: 'draw',
      value: 1,
      requiresTarget: false,
      targetType: 'none'
    }
  },
  {
    id: 5038,
    name: 'Ancient Rune Master',
    description: 'Battlecry: Give adjacent minions Spell Damage +1.',
    flavorText: 'The rune masters of old knew secrets now lost.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 2,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'buff_adjacent',
      buffType: 'spell_damage',
      value: 1,
      targetType: 'adjacent_minions'
    }
  },
  {
    id: 5039,
    name: 'Mana Wraith of Niflheim',
    description: 'ALL minions cost (1) more.',
    flavorText: 'The cold mists drain magical energy.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    set: 'core',
    collectible: true},
  {
    id: 5042,
    name: 'Champion of Olympus',
    description: 'Charge, Divine Shield',
    flavorText: 'Blessed by the gods for valorous combat.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 6,
    attack: 4,
    health: 2,
    class: 'Neutral',
    set: 'core',
    keywords: ['charge', 'divine_shield'],
    collectible: true
  },
  {
    id: 5043,
    name: 'Trampling Centaur',
    description: 'Battlecry: Destroy a random enemy minion with 2 or less Attack.',
    flavorText: 'The wild centaurs of the Greek wilds show no mercy.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 3,
    health: 5,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'destroy',
      targetType: 'random_enemy_minion',
      condition: 'attack_less_than_3'
    }
  },
  {
    id: 5054,
    name: 'Grim Einherjar',
    description: 'After this minion survives damage, summon another Grim Einherjar.',
    flavorText: 'For Valhalla! Everyone, get in here!',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 5055,
    name: 'Shade Summoner',
    description: 'At the end of your turn, deal 1 damage to this minion and summon a 1/1 Shade.',
    flavorText: 'Calling forth spirits from the underworld.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 1,
    health: 5,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 5057,
    name: 'Academy Sage',
    description: 'Whenever you cast a spell, summon a 1/1 Apprentice.',
    flavorText: 'Teaching the arts of magic at the Academy of Athens.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 5,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 5059,
    name: 'Shadow Assassin of Hades',
    description: 'Stealth',
    flavorText: "Hades' elite assassins strike from the shadows.",
    type: 'minion',
    rarity: 'common',
    manaCost: 7,
    attack: 7,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['stealth'],
    collectible: true
  },
  {
    id: 5102,
    name: 'Wounded Berserker',
    description: 'Battlecry: Deal 4 damage to HIMSELF.',
    flavorText: 'True berserkers feel no pain—well, almost none.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 4,
    health: 7,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'damage',
      value: 4,
      targetType: 'self'
    }
  },
  {
    id: 5103,
    name: 'Automaton of Hephaestus',
    description: 'At the start of your turn, swap this minion with a random one in your hand.',
    flavorText: 'Forged by the divine smith, it moves of its own accord.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 0,
    health: 3,
    race: 'Automaton',
    class: 'Neutral',
    set: 'core',
    collectible: true},
  {
    id: 5104,
    name: 'Siege Engine of Troy',
    description: 'At the start of your turn, deal 2 damage to a random enemy.',
    flavorText: 'Built for the siege of the great city.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 1,
    health: 4,
    race: 'Automaton',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 5105,
    name: 'Golem of Olympus',
    description: 'Charge. Battlecry: Give your opponent a Mana Crystal.',
    flavorText: "The gods' gift comes with a price.",
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 4,
    health: 2,
    class: 'Neutral',
    keywords: ['charge', 'battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'give_mana',
      value: 1,
      targetType: 'opponent',
      permanent: true
    }
  },
  // === Migrated from neutralMinions.ts ===
  {
    id: 30016,
    name: 'Flame Juggler of Muspelheim',
    description: 'Whenever you cast a spell, deal 1 damage to a random enemy.',
    flavorText: 'Flames from the realm of fire obey his will.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 3,
    health: 2,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30017,
    name: 'Seer of Aegir',
    description: 'Battlecry: Both players draw 2 cards.',
    flavorText: 'The sea god reveals secrets from the deep.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 2,
    health: 2,
    race: 'Naga',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'draw',
      value: 2,
      targetType: 'both_players',
      requiresTarget: false
    }
  },
  {
    id: 30018,
    name: 'Blade Dancer of Freya',
    description: 'After you summon a minion, deal 1 damage to a random enemy.',
    flavorText: 'Freya blesses her warriors with deadly precision.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30019,
    name: 'Shieldmaiden of Odin',
    description: 'Battlecry: Give adjacent minions Taunt.',
    flavorText: 'Odin sends his shieldmaidens to protect the worthy.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 2,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_adjacent',
      buffType: 'taunt',
      targetType: 'adjacent_minions'
    }
  },
  {
    id: 30020,
    name: 'Defender of Bifrost',
    description: 'Battlecry: Give adjacent minions +1/+1 and Taunt.',
    flavorText: 'Guarding the rainbow bridge to Asgard.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 2,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_adjacent',
      buffAttack: 1,
      buffHealth: 1,
      taunt: true,
      targetType: 'adjacent_minions'
    }
  },
  {
    id: 30021,
    name: 'Wounded Champion of Tyr',
    description: 'Battlecry: Deal 4 damage to HIMSELF.',
    flavorText: 'Tyr sacrificed his hand to bind Fenrir.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 4,
    health: 7,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'self_damage',
      value: 4,
      requiresTarget: false
    }
  },
  {
    id: 30022,
    name: 'Merchant of Midgard',
    description: 'Whenever you cast a spell, draw a card.',
    flavorText: 'Trading goods and secrets across the realms.',
    type: 'minion',
    rarity: 'common',
    manaCost: 6,
    attack: 4,
    health: 4,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30024,
    name: 'Giant Slayer of the Gods',
    description: 'Battlecry: Destroy a minion with 7 or more Attack.',
    flavorText: 'The gods sent champions to battle the giants.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 4,
    health: 2,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy',
      condition: 'attack_7_or_more',
      requiresTarget: true,
      targetType: 'minion'
    }
  },
  {
    id: 30025,
    name: 'Trampling Beast of Thor',
    description: 'Battlecry: Destroy a random enemy minion with 2 or less Attack.',
    flavorText: 'Thor rides with thundering beasts at his side.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 3,
    health: 5,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy',
      condition: 'attack_2_or_less',
      targetType: 'random_enemy_minion'
    }
  },
  {
    id: 30026,
    name: 'Ice Elemental of Niflheim',
    description: 'Battlecry: Freeze a character.',
    flavorText: 'Born from the primordial ice of Niflheim.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 6,
    attack: 5,
    health: 5,
    race: 'Elemental',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'freeze',
      requiresTarget: true,
      targetType: 'any'
    }
  },
  {
    id: 30027,
    name: 'Thunder Striker of Asgard',
    description: 'Battlecry: Deal 2 damage.',
    flavorText: 'Strike with the fury of Thor.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 4,
    health: 2,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'deal_damage',
      value: 2,
      requiresTarget: true,
      targetType: 'any'
    }
  },
  {
    id: 30029,
    name: 'Harsh Taskmaster',
    description: 'Battlecry: Give a minion +2 Attack and deal 1 damage to it.',
    flavorText: 'Cruelty breeds strength.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 1,
    attack: 1,
    health: 1,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_and_damage',
      buffAttack: 2,
      damageValue: 1,
      requiresTarget: true,
      targetType: 'minion'
    }
  },
  {
    id: 30030,
    name: 'Elven Archer of Alfheim',
    description: 'Battlecry: Deal 1 damage.',
    flavorText: 'The light elves never miss their mark.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 1,
    attack: 1,
    health: 1,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'deal_damage',
      value: 1,
      requiresTarget: true,
      targetType: 'any'
    }
  },
  {
    id: 30054,
    name: 'Terror of the Grave',
    description: 'Taunt. Costs (1) less for each spell you have cast this game.',
    flavorText: 'Rising from the depths of Helheim.',
    type: 'minion',
    rarity: 'common',
    manaCost: 12,
    attack: 7,
    health: 8,
    class: 'Neutral',
    keywords: ['taunt'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30063,
    name: 'Sentinel of Mimir',
    description: "Can't attack.",
    flavorText: 'Watching over the well of wisdom.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 4,
    health: 5,
    class: 'Neutral',
    keywords: ['cant_attack'],
    collectible: true,
    set: 'core'
  },
  // === From specialEffectNeutrals.ts ===
  {
    id: 2201,
    name: 'Oracle of Delphi',
    description: 'Battlecry: Foresee a spell.',
    flavorText: 'The Pythia speaks prophecies from Apollo.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 4,
    class: 'Neutral',
    keywords: ['battlecry', 'discover'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'discover',
      cardType: 'spell',
      requiresTarget: false
    }
  },
  {
    id: 2202,
    name: 'Chronos Timekeeper',
    description: 'Battlecry: Take an extra turn. At the end of that turn, your opponent takes two turns.',
    flavorText: 'Time bends to the will of the god of time.',
    type: 'minion',
    rarity: 'common',
    manaCost: 9,
    attack: 6,
    health: 6,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core'
  },
  // === From neutralSpellsAndTech.ts ===
  {
    id: 27004,
    name: 'Tech Priest of Hephaestus',
    description: 'Battlecry: Silence a minion. If it is an Automaton, destroy it.',
    flavorText: 'The divine smith knows how to unmake his creations.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 2,
    health: 4,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'silence_or_destroy_automaton',
      requiresTarget: true,
      targetType: 'minion'
    }
  },
  {
    id: 27005,
    name: 'Card Stealer of Hermes',
    description: 'Battlecry: Copy a random card in your opponent\'s hand.',
    flavorText: 'Hermes, god of thieves, teaches his followers well.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'copy_from_opponent_hand',
      value: 1,
      requiresTarget: false
    }
  },
  {
    id: 27007,
    name: 'Rune Scribe',
    description: 'After you cast a spell, add a random spell to your hand.',
    flavorText: 'Writing the words of power into existence.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 5,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 27008,
    name: 'Echo of the Norns',
    description: 'After you play a minion, add a copy of it to your hand that costs (1) more.',
    flavorText: 'The Norns echo fate through time.',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 4,
    health: 5,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  }
];

// ============================================
// RARE NEUTRAL SPELLS
// ============================================
const rareNeutralSpells: CardData[] = [
  {
    id: 4501,
    name: 'Glowing Draugr',
    description: 'Add 2 random Nagas to your hand.',
    flavorText: 'An undead Norse warrior whose eerie glow attracts sea spirits.',
    type: 'spell',
    rarity: 'common',
    manaCost: 3,
    class: 'Neutral',
    set: 'core',
    collectible: true
  }
];

// ============================================
// EPIC NEUTRAL MINIONS
// ============================================
const epicNeutralMinions: CardData[] = [
  {
    id: 3002,
    name: 'Titan of Olympus',
    description: 'Costs (1) less for each card in your hand.',
    flavorText: 'Before the gods, the Titans ruled from Mount Othrys.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 12,
    attack: 8,
    health: 8,
    race: 'Elemental',
    class: 'Neutral',
    set: 'core',
    collectible: true},
  {
    id: 3008,
    name: 'Valkyrie Champion',
    description: 'Battlecry: All minions lose Divine Shield. Gain +3/+3 for each Shield lost.',
    flavorText: 'The Valkyries choose who lives and who dies on the battlefield.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true
  },
  {
    id: 3010,
    name: 'Runesmith of Odin',
    description: 'Battlecry: Swap the Attack and Health of a minion.',
    flavorText: 'The runesmiths of Asgard weave fate with every inscription.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core'
  },
  // === Migrated from neutralMinions.ts ===
  {
    id: 29972,
    name: 'Shapeshifter of Loki',
    description: 'Battlecry: Choose a minion and become a copy of it.',
    flavorText: 'Loki, the trickster god, shares his gift of deception.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 5,
    attack: 3,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'copy',
      requiresTarget: true,
      targetType: 'minion'
    }
  },
  {
    id: 29973,
    name: 'Herald of Ragnarok',
    description: 'At the start of your turn, destroy ALL minions.',
    flavorText: 'When he speaks, the end of all things begins.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 0,
    health: 7,
    class: 'Neutral',
    collectible: true,
    set: 'core',
    startOfTurn: { type: "destroy_all_minions" }
  },
  {
    id: 29974,
    name: 'Jotun of the Depths',
    description: 'Costs (1) less for each other minion on the battlefield.',
    flavorText: 'The sea giants of Jotunheim rise from the deep.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 10,
    attack: 8,
    health: 8,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30009,
    name: 'Fire Giant of Muspelheim',
    description: 'Costs (1) less for each damage your hero has taken.',
    flavorText: 'Born from the flames that will consume the world.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 20,
    attack: 8,
    health: 8,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30010,
    name: 'Dreki of the Dusk',
    description: 'Battlecry: Gain +1 Health for each card in your hand.',
    flavorText: 'The twilight dragons grow stronger with knowledge.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 4,
    health: 1,
    race: 'Dragon',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_health_by_hand_size',
      requiresTarget: false
    }
  },
  {
    id: 30011,
    name: 'Mind Weaver of Hel',
    description: 'Battlecry: Take control of an enemy minion that has 2 or less Attack.',
    flavorText: 'Hel commands the minds of the weak.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 4,
    health: 5,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'mind_control',
      condition: 'attack_2_or_less',
      requiresTarget: true,
      targetType: 'enemy_minion'
    }
  },
  {
    id: 30015,
    name: 'Mountain Giant of Jotunheim',
    description: 'Costs (1) less for each other card in your hand.',
    flavorText: 'The ancient giants tower over the mountains.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 12,
    attack: 8,
    health: 8,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30028,
    name: 'Crab of Ginnungagap',
    description: 'Battlecry: Destroy a Naga and gain +2/+2.',
    flavorText: 'From the primordial void between fire and ice, even the crabs learned to hunt.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 1,
    attack: 1,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy_and_buff',
      condition: 'naga',
      buffAttack: 2,
      buffHealth: 2,
      requiresTarget: true,
      targetType: 'naga'
    }
  },
  {
    id: 30031,
    name: 'Mad Alchemist of Athens',
    description: 'Battlecry: Swap the Attack and Health of a minion.',
    flavorText: 'Transmuting the very essence of creation.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'swap_stats',
      requiresTarget: true,
      targetType: 'minion'
    }
  },
  {
    id: 30035,
    name: 'Mind Thief of Hermes',
    description: 'Battlecry: If your opponent has 4 or more minions, take control of one at random.',
    flavorText: 'Hermes steals more than just gold.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 3,
    attack: 3,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'conditional_mind_control',
      condition: 'opponent_has_4_minions',
      requiresTarget: false,
      targetType: 'random_enemy_minion'
    }
  },
  {
    id: 30037,
    name: 'Silencer of the Gods',
    description: 'Battlecry: Silence a minion.',
    flavorText: 'Even the gods fall silent before this power.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 4,
    health: 3,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'silence',
      requiresTarget: true,
      targetType: 'minion'
    }
  },
  {
    id: 30038,
    name: 'Commander of Valhalla',
    description: 'Charge, Divine Shield',
    flavorText: 'Leading the charge into glorious battle.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 6,
    attack: 4,
    health: 2,
    class: 'Neutral',
    keywords: ['charge', 'divine_shield'],
    collectible: true,
    set: 'core'
  },
  {
    id: 30046,
    name: 'Runeforged Blade',
    description: 'After your hero attacks, give a random minion in your hand +1/+1.',
    flavorText: 'Inscribed with the power of the ancient runes.',
    type: 'weapon',
    rarity: 'rare',
    manaCost: 3,
    attack: 3,
    durability: 3,
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 30047,
    name: 'Wrath of the Deep',
    description: 'Deal 3 damage to all damaged minions.',
    flavorText: 'The sea shows no mercy to the wounded.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 2,
    class: 'Neutral',
    collectible: true,
    set: 'core',
    spellEffect: {
      type: 'aoe_damage',
      value: 3,
      requiresTarget: false,
      targetType: 'damaged_minions',
      affectsDamagedOnly: true
    }
  },
  {
    id: 30048,
    name: 'Piloted Construct',
    description: 'Deathrattle: Summon a random 2-Cost minion.',
    flavorText: 'What lurks inside the machine?',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 4,
    health: 3,
    race: 'Automaton',
    class: 'Neutral',
    keywords: ['deathrattle'],
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon_random',
      targetType: 'none',
      specificManaCost: 2
    }
  },
  {
    id: 30049,
    name: 'Treasure Vessel',
    description: 'Deathrattle: Add a random Mythic minion to your hand.',
    flavorText: 'A vessel filled with divine treasures.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 4,
    attack: 4,
    health: 3,
    race: 'Automaton',
    class: 'Neutral',
    keywords: ['deathrattle'],
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'add_to_hand',
      targetType: 'none',
      value: 1,
      specificRace: 'mythic'
    }
  },
  {
    id: 30050,
    name: 'Spine Beast of Hel',
    description: "Deathrattle: Deal this minion's Attack damage randomly split among all enemies.",
    flavorText: 'Its death brings agony to all.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 2,
    health: 4,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['deathrattle'],
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'split_damage',
      targetType: 'all_enemies'
    }
  },
  {
    id: 30051,
    name: 'Totem Summoner of the Winds',
    description: "Battlecry: If you control all 4 basic Totems, summon Al'Akir the Windlord.",
    flavorText: 'Commanding the elements through ancient totems.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 5,
    attack: 5,
    health: 5,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'conditional_summon',
      condition: 'control_all_basic_totems',
      summonCardId: 13001,
      requiresTarget: false
    }
  },
  {
    id: 30052,
    name: 'Armor Burst',
    description: 'Spend all your Armor. Deal that much damage to all minions.',
    flavorText: 'Sacrificing protection for destruction.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 3,
    class: 'Neutral',
    collectible: true,
    set: 'core',
    spellEffect: {
      type: 'armor_to_aoe_damage',
      requiresTarget: false,
      targetType: 'all_minions',
      spendAllArmor: true
    }
  },
  {
    id: 30053,
    name: 'Frozen Beast of Niflheim',
    description: 'Frozen. When this minion is Frozen, it has +2/+2.',
    flavorText: 'Thriving in the eternal cold of Niflheim.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 7,
    attack: 6,
    health: 7,
    race: 'Beast',
    class: 'Neutral',
    keywords: ['frozen'],
    collectible: true,
    set: 'core'
  },
  // === From specialEffectNeutrals.ts ===
  {
    id: 3201,
    name: 'Essence Weaver',
    description: 'Battlecry: Copy the Deathrattle of a friendly minion.',
    flavorText: 'Weaving the threads of life and death.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 4,
    attack: 3,
    health: 4,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'copy_deathrattle',
      requiresTarget: true,
      targetType: 'friendly_minion'
    }
  },
  {
    id: 3202,
    name: 'Chaos Invoker',
    description: 'Battlecry: Swap hands with your opponent.',
    flavorText: 'Chaos brings unexpected changes.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 8,
    attack: 6,
    health: 6,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'swap_hands',
      requiresTarget: false
    }
  },
  // === From neutralSpellsAndTech.ts ===
  {
    id: 27009,
    name: 'Soul Binder',
    description: 'Battlecry: Summon a copy of a random minion in your deck.',
    flavorText: 'Binding souls from the deck of fate.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 5,
    health: 5,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon_copy_from_deck',
      requiresTarget: false
    }
  },
  {
    id: 27010,
    name: 'Divine Constructor',
    description: 'At the end of your turn, summon a 1/1 Automaton with Divine Shield.',
    flavorText: 'Building divine protection for the faithful.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 3,
    health: 6,
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 31011,
    name: 'Deck Thief of Hermes',
    description: 'Battlecry: Steal the top card of your opponent\'s deck.',
    flavorText: 'Hermes himself guides this thief\'s hands.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 5,
    attack: 4,
    health: 4,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'steal_from_deck',
      value: 1,
      requiresTarget: false
    }
  },
  {
    id: 31015,
    name: 'Mass Silencer',
    description: 'Battlecry: Silence all enemy minions.',
    flavorText: 'Commanding silence across the battlefield.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 7,
    attack: 4,
    health: 4,
    class: 'Neutral',
    keywords: ['battlecry'],
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'mass_silence',
      targetType: 'all_enemy_minions',
      requiresTarget: false
    }
  }
];

// ============================================
// EPIC NEUTRAL SPELLS
// ============================================
const epicNeutralSpells: CardData[] = [
  {
    id: 4503,
    name: "Norns' Hourglass",
    description: 'Rune: When your opponent plays a minion, return it to their hand and it costs (2) more.',
    flavorText: 'The Norns weave fate at the roots of Yggdrasil.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 3,
    class: 'Neutral',
    keywords: ['secret'],
    collectible: true
  }
];

// ============================================
// MYTHIC NEUTRAL MINIONS
// ============================================
const legendaryNeutralMinions: CardData[] = [
  {
    id: 2016,
    name: 'Daedalus the Inventor',
    description: 'Battlecry: Summon an AWESOME invention.',
    flavorText: 'Creator of the Labyrinth and wings of wax.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 6,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'summon_random',
      value: 1,
      targetType: 'friendly_battlefield'
    }
  },
  {
    id: 5070,
    name: 'Transmutation Engine',
    description: 'At the start of your turn, transform a random minion into a 1/1 Chicken.',
    flavorText: "One of Daedalus's more... creative inventions.",
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 0,
    health: 3,
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20001,
    name: 'Echo of the Allfather',
    manaCost: 9,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'mythic',
    description: 'Battlecry: Give your other minions Immune this turn.',
    flavorText: 'The Allfather watches over all from his throne in Asgard.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff',
      targetType: 'all_other_friendly_minions',
      buffAttack: 0,
      buffHealth: 0,
      keywords: ['immune']
    }
  },
  {
    id: 20002,
    name: 'Echo of the Sky Sovereign',
    manaCost: 10,
    attack: 10,
    health: 10,
    type: 'minion',
    rarity: 'mythic',
    description: 'Battlecry: Deal 10 damage to all enemy minions.',
    flavorText: 'King of Olympus, his lightning strikes terror into all.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'damage',
      value: 10,
      targetType: 'all_enemy_minions',
      requiresTarget: false
    }
  },
  {
    id: 20003,
    name: 'Echo of the Thunderlord',
    manaCost: 8,
    attack: 7,
    health: 7,
    type: 'minion',
    rarity: 'epic',
    description: 'Windfury. Battlecry: Deal 2 damage to all enemies.',
    flavorText: 'Mjolnir crashes down like a thunderbolt from Asgard.',
    keywords: ['windfury', 'battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'damage',
      value: 2,
      targetType: 'all_enemies',
      requiresTarget: false
    }
  },
  {
    id: 20004,
    name: 'Echo of the Trickster',
    manaCost: 5,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Swap stats with another minion.',
    flavorText: 'The god of mischief delights in chaos and deception.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'swap_stats',
      requiresTarget: true,
      targetType: 'any_minion'
    }
  },
  {
    id: 28001,
    name: 'Echo of the Divine Queen',
    manaCost: 7,
    attack: 5,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'At the end of your turn, summon a 2/2 Peacock with Taunt.',
    flavorText: 'The queen of Olympus summons her sacred birds to defend.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 28002,
    name: 'Echo of the Valkyrie Queen',
    manaCost: 6,
    attack: 4,
    health: 6,
    type: 'minion',
    rarity: 'epic',
    description: 'Deathrattle: Resummon all friendly minions that died this turn.',
    flavorText: 'She leads the Valkyries in gathering fallen warriors.',
    keywords: ['deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'resurrect',
      targetType: 'none',
      condition: 'died_this_turn'
    }
  },
  {
    id: 20016,
    name: 'Enchantress of Sessrumnir',
    manaCost: 4,
    attack: 3,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Take control of an enemy minion with 3 or less Attack.',
    flavorText: 'Her beauty enchants even the most hardened warriors.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'mind_control',
      requiresTarget: true,
      targetType: 'enemy_minion',
      condition: 'attack_3_or_less'
    }
  },
  {
    id: 20017,
    name: 'Reveler of the Mead Hall',
    manaCost: 5,
    attack: 5,
    health: 4,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Give all other minions +1/+1 for each of your minions.',
    flavorText: 'The god of wine and ecstasy inspires wild abandon.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_aoe',
      requiresTarget: false,
      targetType: 'all_other_minions',
      buffAttack: 1,
      buffHealth: 1,
      multiplier: 'friendly_minion_count'
    }
  },
  {
    id: 20020,
    name: 'Echo of the Bifrost Watcher',
    manaCost: 4,
    attack: 3,
    health: 6,
    type: 'minion',
    rarity: 'common',
    description: 'Can see cards in your opponent\'s hand.',
    flavorText: 'His all-seeing eyes pierce through all deception.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20021,
    name: 'Witch of the Crossroads',
    manaCost: 6,
    attack: 4,
    health: 6,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Foresee a spell from each player\'s class.',
    flavorText: 'At the crossroads, all magic paths converge.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'discover',
      requiresTarget: false,
      targetType: 'none',
      discoveryType: 'spell',
      discoveryCount: 2
    }
  },
  {
    id: 20024,
    name: 'Champion of the Twelve Labors',
    manaCost: 6,
    attack: 6,
    health: 6,
    type: 'minion',
    rarity: 'rare',
    description: 'Divine Shield. After this attacks, draw a card.',
    flavorText: 'The greatest hero of Greece, slayer of monsters.',
    keywords: ['divine_shield'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20025,
    name: 'Gorgon Slayer',
    manaCost: 5,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Destroy an enemy minion. Gain its Attack.',
    flavorText: 'With Medusa\'s head, he turned titans to stone.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy',
      requiresTarget: true,
      targetType: 'enemy_minion',
      gainAttack: true
    }
  },
  {
    id: 20026,
    name: 'Immortal Warrior',
    manaCost: 5,
    attack: 4,
    health: 6,
    type: 'minion',
    rarity: 'epic',
    description: 'Divine Shield. Rush. Deathrattle: Deal 4 damage to a random enemy.',
    flavorText: 'Invulnerable everywhere except his heel.',
    keywords: ['divine_shield', 'rush', 'deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'damage',
      value: 4,
      targetType: 'random_enemy'
    }
  },
  {
    id: 20050,
    name: 'Echo of the Radiant One',
    manaCost: 8,
    attack: 6,
    health: 8,
    type: 'minion',
    rarity: 'epic',
    description: 'Divine Shield. Deathrattle: Restore all friendly minions to full Health.',
    flavorText: 'The most beloved of the Aesir, whose light outshines even the sun.',
    keywords: ['divine_shield', 'deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'heal',
      value: 99,
      targetType: 'all_friendly_minions'
    }
  },
  {
    id: 20100,
    name: 'Bard of Asgard',
    manaCost: 3,
    attack: 2,
    health: 4,
    type: 'minion',
    rarity: 'common',
    description: 'After you cast a spell, add a random Mythic minion to your hand.',
    flavorText: 'The Norse god of poetry sings legends into existence.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20101,
    name: 'Hypnos, Dream Weaver',
    manaCost: 4,
    attack: 2,
    health: 6,
    type: 'minion',
    rarity: 'common',
    description: 'At the end of your turn, put an enemy minion to sleep (can\'t attack next turn).',
    flavorText: 'The god of sleep brings eternal slumber.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20103,
    name: 'Nike, Winged Victory',
    manaCost: 3,
    attack: 3,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Rush. After this attacks and kills a minion, add a copy of it to your hand.',
    flavorText: 'The goddess of victory soars above her enemies.',
    keywords: ['rush'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20104,
    name: 'Smith of Olympus',
    manaCost: 5,
    attack: 4,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Add a random weapon to your hand. It costs (2) less.',
    flavorText: 'The forge god crafts weapons for Olympus.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'add_card',
      requiresTarget: false,
      targetType: 'none',
      cardType: 'weapon',
      costReduction: 2
    }
  },
  {
    id: 20105,
    name: 'Avatar of War',
    manaCost: 7,
    attack: 6,
    health: 6,
    type: 'minion',
    rarity: 'rare',
    description: 'Taunt. After a minion dies, gain +1/+1.',
    flavorText: 'The god of war thrives in the chaos of battle.',
    keywords: ['taunt'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20106,
    name: 'Harvest Priestess',
    manaCost: 5,
    attack: 3,
    health: 6,
    type: 'minion',
    rarity: 'rare',
    description: 'At the end of your turn, restore 3 Health to all friendly characters.',
    flavorText: 'The goddess of harvest nurtures all living things.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20107,
    name: 'Twin Wolves of Twilight',
    manaCost: 6,
    attack: 4,
    health: 4,
    type: 'minion',
    rarity: 'epic',
    description: 'Rush. Battlecry: Summon a 4/4 Wolf with Rush.',
    flavorText: 'The wolves that chase the sun and moon.',
    keywords: ['rush', 'battlecry'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon',
      requiresTarget: false,
      targetType: 'none',
      summonCount: 1
    }
  },
  {
    id: 20108,
    name: 'Helios, Sun Chariot Driver',
    manaCost: 6,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Deal 2 damage to all minions. Your minions are Immune.',
    flavorText: 'He drives the sun across the sky each day.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'damage',
      value: 2,
      targetType: 'all_minions',
      friendlyImmune: true
    }
  },
  {
    id: 20109,
    name: 'Shade of Primordial Night',
    manaCost: 4,
    attack: 4,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'Stealth. Battlecry: Give your other minions Stealth for one turn.',
    flavorText: 'Primordial goddess of night, mother of darkness.',
    keywords: ['stealth', 'battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff',
      requiresTarget: false,
      targetType: 'all_other_friendly_minions',
      keywords: ['stealth'],
      duration: 1
    }
  },
  {
    id: 20110,
    name: 'Keeper of the Wisdom Well',
    manaCost: 3,
    attack: 2,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Draw a card for each spell you\'ve cast this game (up to 5).',
    flavorText: 'Odin sacrificed his eye for Mimir\'s wisdom.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'draw',
      requiresTarget: false,
      targetType: 'none',
      condition: 'spells_cast_this_game',
      maxValue: 5
    }
  },
  {
    id: 20111,
    name: 'Echo of the One-Handed God',
    manaCost: 4,
    attack: 5,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'Rush. Battlecry: Your hero is Immune this turn.',
    flavorText: 'He sacrificed his hand to bind the wolf Fenrir.',
    keywords: ['rush', 'battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_hero',
      requiresTarget: false,
      targetType: 'none',
      keywords: ['immune'],
      duration: 1
    }
  },
  {
    id: 20112,
    name: 'Keeper of the Golden Apples',
    manaCost: 4,
    attack: 3,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Restore your minions to full Health.',
    flavorText: 'Her golden apples grant immortality to the Aesir.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'heal',
      requiresTarget: false,
      targetType: 'all_friendly_minions',
      value: 99
    }
  },
  {
    id: 20113,
    name: 'Light-Warded Champion',
    manaCost: 5,
    attack: 4,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Can\'t be targeted by spells or Hero Powers. Divine Shield.',
    flavorText: 'Beloved god of light, invulnerable to all but mistletoe.',
    keywords: ['divine_shield'],
    class: 'Neutral',
    cantBeTargetedBySpells: true,
    collectible: true,
    set: 'core'
  },
  {
    id: 20114,
    name: 'Flame Colossus of Muspel',
    manaCost: 8,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Deal 4 damage to all other minions.',
    flavorText: 'Leader of the fire giants who will set the world ablaze.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'damage',
      value: 4,
      targetType: 'all_other_minions',
      requiresTarget: false
    }
  },
  {
    id: 20115,
    name: 'Jotun Frost King',
    manaCost: 7,
    attack: 5,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Freeze all enemy minions.',
    flavorText: 'The king of frost giants brings an eternal winter.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'freeze',
      requiresTarget: false,
      targetType: 'all_enemy_minions'
    }
  },
  {
    id: 20116,
    name: 'Healer of Valhalla',
    manaCost: 3,
    attack: 2,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Restore 5 Health to your hero. If your hero is at full Health, gain +3/+3.',
    flavorText: 'The healing Valkyrie tends to the wounded in Valhalla.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'heal',
      requiresTarget: false,
      targetType: 'friendly_hero',
      value: 5
    }
  },
  {
    id: 20150,
    name: 'Saga, Keeper of Histories',
    manaCost: 5,
    attack: 3,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Foresee a spell from your opponent\'s class.',
    flavorText: 'She records every deed in the waters of Sökkvabekkr.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'discover',
      requiresTarget: false,
      targetType: 'none',
      cardType: 'spell',
      source: 'opponent_class'
    }
  },
  {
    id: 20151,
    name: 'Vár, Oath Warden',
    manaCost: 4,
    attack: 3,
    health: 4,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: The next spell you cast this turn costs (3) less.',
    flavorText: 'Goddess of oaths, she punishes those who break their word.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'cost_reduction',
      requiresTarget: false,
      targetType: 'none',
      cardType: 'spell',
      value: 3
    }
  },
  {
    id: 20200,
    name: 'Hell-Hound of the Gate',
    manaCost: 6,
    attack: 4,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Taunt. At the end of your turn, summon a 2/2 Hell Pup.',
    flavorText: 'The three-headed guardian of the underworld gates.',
    keywords: ['taunt'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20201,
    name: 'Minotaur, Labyrinth Guardian',
    manaCost: 7,
    attack: 8,
    health: 6,
    type: 'minion',
    rarity: 'epic',
    description: 'Can\'t Attack unless it has Taunt. Battlecry: Gain Taunt if there are 2+ enemy minions.',
    flavorText: 'Lost forever in the labyrinth of Knossos.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff',
      requiresTarget: false,
      targetType: 'self',
      condition: 'enemy_minion_count_2_or_more',
      keywords: ['taunt']
    }
  },
  {
    id: 20202,
    name: 'Gorgon Sovereign',
    manaCost: 5,
    attack: 3,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Poisonous. Stealth. Deathrattle: Destroy an enemy minion.',
    flavorText: 'Her gaze turns mortals to stone.',
    keywords: ['poisonous', 'stealth', 'deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'destroy',
      targetType: 'random_enemy_minion',
      requiresTarget: false
    }
  },
  {
    id: 20203,
    name: 'Hydra, Many Heads',
    manaCost: 7,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Also damages the minions next to whomever this attacks. When this takes damage, gain +2 Attack.',
    flavorText: 'Cut off one head, two more take its place.',
    keywords: [],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20204,
    name: 'Phoenix Immortal',
    manaCost: 6,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Deathrattle: Return this to your hand. It costs (1) more.',
    flavorText: 'From ashes, it is reborn eternally.',
    keywords: ['deathrattle'],
    race: 'Elemental',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'return_to_hand',
      targetType: 'none',
      costIncrease: 1
    }
  },
  {
    id: 20205,
    name: 'Sphinx, Riddler',
    manaCost: 5,
    attack: 4,
    health: 6,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Your opponent must answer a riddle. If wrong, destroy a random enemy minion.',
    flavorText: 'Answer correctly or be devoured.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy',
      targetType: 'random_enemy_minion',
      requiresTarget: false,
      chance: 0.5
    }
  },
  {
    id: 20206,
    name: 'Chimera, Beast of Flame',
    manaCost: 5,
    attack: 4,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'At the end of your turn, deal 3 damage to a random enemy.',
    flavorText: 'Lion, goat, and serpent combined into one fearsome beast.',
    keywords: [],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20207,
    name: 'Twin Terrors of the Strait',
    manaCost: 8,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Summon a 5/5 Charybdis. Your other minions can\'t attack.',
    flavorText: 'Between them lies only doom.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon',
      requiresTarget: false,
      targetType: 'none',
      summonCount: 1
    }
  },
  {
    id: 20208,
    name: 'Griffon of Olympus',
    manaCost: 4,
    attack: 4,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: 'Windfury. Divine Shield.',
    flavorText: 'The majestic beast guards the treasures of the gods.',
    keywords: ['windfury', 'divine_shield'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20209,
    name: 'Kraken of the Deep',
    manaCost: 9,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Deal 4 damage to 2 random enemy minions.',
    flavorText: 'Even the gods fear its emergence from the abyss.',
    keywords: ['battlecry'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'damage',
      value: 4,
      targetType: 'random_enemy_minions',
      targetCount: 2,
      requiresTarget: false
    }
  },
  {
    id: 20210,
    name: 'Sleipnir Warchief',
    manaCost: 6,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Rush. After this attacks a hero, gain +2 Attack.',
    flavorText: 'Leader of the eight-legged warband.',
    keywords: ['rush'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20211,
    name: 'Harpy Matriarch',
    manaCost: 4,
    attack: 4,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: 'Windfury. Battlecry: Summon a 2/1 Harpy.',
    flavorText: 'The queen of the screeching flock.',
    keywords: ['windfury', 'battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon',
      requiresTarget: false,
      targetType: 'none',
      summonCount: 1
    }
  },
  {
    id: 20212,
    name: 'Cyclops Forgemaster',
    manaCost: 6,
    attack: 6,
    health: 7,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Add a random weapon to your hand.',
    flavorText: 'The one-eyed smiths forge weapons for Zeus himself.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'add_card',
      requiresTarget: false,
      targetType: 'none',
      cardType: 'weapon'
    }
  },
  {
    id: 20214,
    name: 'Satyr Reveler',
    manaCost: 3,
    attack: 3,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'At the end of your turn, give a random friendly minion +1/+1.',
    flavorText: 'The wild followers of Dionysus dance eternally.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20215,
    name: 'Nymph of the Grove',
    manaCost: 2,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'At the start of your turn, restore 1 Health to all friendly minions.',
    flavorText: 'Nature spirits who tend to the sacred groves.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20216,
    name: 'Titan of Chaos',
    manaCost: 10,
    attack: 12,
    health: 12,
    type: 'minion',
    rarity: 'rare',
    description: 'Costs (1) less for each card in your opponent\'s hand.',
    flavorText: 'The primordial beings who ruled before the Olympians.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20301,
    name: 'Argonaut Hero',
    manaCost: 3,
    attack: 3,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: If you control a Beast, gain +2/+2.',
    flavorText: 'Sailed with Jason to seek the Golden Fleece.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff',
      requiresTarget: false,
      targetType: 'self',
      condition: 'control_beast',
      buffAttack: 2,
      buffHealth: 2
    }
  },
  {
    id: 20302,
    name: 'Amazonian Queen',
    manaCost: 6,
    attack: 5,
    health: 6,
    type: 'minion',
    rarity: 'rare',
    description: 'Rush. After this kills a minion, give another friendly minion Rush.',
    flavorText: 'The warrior queen leads her sisters into battle.',
    keywords: ['rush'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20303,
    name: 'Seer of Pythia',
    manaCost: 4,
    attack: 2,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Reveal a card in each deck. If yours costs more, draw it.',
    flavorText: 'She speaks prophecies from the god Apollo.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'joust',
      requiresTarget: false,
      targetType: 'none',
      winEffect: 'draw'
    }
  },
  {
    id: 20304,
    name: 'Muse of Song',
    manaCost: 2,
    attack: 1,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Whenever you cast a spell, add a random spell to your hand.',
    flavorText: 'The nine muses inspire all artistic endeavors.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20305,
    name: 'Aether Dragon',
    manaCost: 8,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: If you\'re holding a Dragon, deal 8 damage to all enemy minions.',
    flavorText: 'Born of the primordial void between worlds.',
    keywords: ['battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'damage',
      value: 8,
      targetType: 'all_enemy_minions',
      condition: 'holding_dragon'
    }
  },
  {
    id: 20306,
    name: 'Charybdis Maw',
    manaCost: 5,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'At the end of your turn, destroy the lowest Health enemy minion.',
    flavorText: 'The whirlpool monster that devours ships whole.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  // ============================================
  // MECHANIC CARDS - DISCOVER
  // ============================================
  {
    id: 25001,
    name: 'Magic Mapping',
    description: 'Foresee a spell.',
    manaCost: 1,
    type: 'spell',
    rarity: 'common',
    keywords: ['discover'],
    spellEffect: {
      type: 'discover',
      requiresTarget: false,
      discoveryType: 'spell',
      value: 1,
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 5002,
    name: 'Curious Excavator',
    description: 'Battlecry: Foresee a Dragon.',
    manaCost: 3,
    type: 'minion',
    rarity: 'rare',
    attack: 2,
    health: 3,
    keywords: ['battlecry', 'discover'],
    battlecry: {
      type: 'discover',
      requiresTarget: false,
      discoveryPoolId: 'dragon',
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 5003,
    name: 'Mage Runes',
    description: 'Foresee a Rune.',
    manaCost: 2,
    type: 'spell',
    rarity: 'common',
    keywords: ['discover'],
    spellEffect: {
      type: 'discover',
      requiresTarget: false,
      discoveryPoolId: 'secret',
      value: 1,
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 5004,
    name: 'Weapon Smith',
    description: 'Battlecry: Foresee a Weapon.',
    manaCost: 4,
    type: 'minion',
    rarity: 'common',
    attack: 3,
    health: 3,
    keywords: ['battlecry', 'discover'],
    battlecry: {
      type: 'discover',
      requiresTarget: false,
      discoveryPoolId: 'weapon',
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 5005,
    name: 'Beast Finder',
    description: 'Battlecry: Foresee a Beast.',
    manaCost: 2,
    type: 'minion',
    rarity: 'common',
    attack: 2,
    health: 2,
    keywords: ['battlecry', 'discover'],
    battlecry: {
      type: 'discover',
      requiresTarget: false,
      discoveryPoolId: 'beast',
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 5006,
    name: 'Shield Bearer',
    description: 'Battlecry: Foresee a minion with Taunt.',
    manaCost: 3,
    type: 'minion',
    rarity: 'common',
    attack: 1,
    health: 4,
    keywords: ['battlecry', 'discover', 'taunt'],
    battlecry: {
      type: 'discover',
      requiresTarget: false,
      discoveryPoolId: 'taunt',
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 5007,
    name: 'Mana Shifter',
    description: 'Foresee a 1-Cost card.',
    manaCost: 1,
    type: 'spell',
    rarity: 'common',
    keywords: ['discover'],
    spellEffect: {
      type: 'discover',
      requiresTarget: false,
      discoveryPoolId: 'one_cost',
      value: 1,
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 5008,
    name: 'Master Searcher',
    description: 'Foresee a Mythic minion.',
    manaCost: 5,
    type: 'spell',
    rarity: 'rare',
    keywords: ['discover'],
    spellEffect: {
      type: 'discover',
      requiresTarget: false,
      discoveryPoolId: 'mythic',
      value: 1,
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 25009,
    name: 'Academic Research',
    description: "Foresee a spell. It costs (2) less.",
    manaCost: 3,
    type: 'spell',
    rarity: 'common',
    keywords: ['discover'],
    spellEffect: {
      type: 'discover',
      requiresTarget: false,
      discoveryPoolId: 'spell',
      value: 1,
      targetType: 'none',
      manaDiscount: 2
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 5010,
    name: 'Master Collector',
    description: 'Foresee 3 different cards.',
    manaCost: 8,
    type: 'spell',
    rarity: 'rare',
    keywords: ['discover'],
    spellEffect: {
      type: 'discover',
      requiresTarget: false,
      discoveryType: 'any',
      discoveryCount: 3,
      value: 3,
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 25013,
    name: 'Stonehill Defender',
    description: 'Taunt. Battlecry: Foresee a Taunt minion.',
    manaCost: 3,
    type: 'minion',
    attack: 1,
    health: 4,
    rarity: 'rare',
    keywords: ['taunt', 'battlecry', 'discover'],
    battlecry: {
      type: 'discover',
      requiresTarget: false,
      discoveryPoolId: 'taunt',
      targetType: 'none'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  // ============================================
  // MECHANIC CARDS - TRADEABLE
  // ============================================
  {
    id: 12001,
    name: 'Rustrot Viper',
    manaCost: 3,
    attack: 3,
    health: 4,
    description: "Tradeable. Battlecry: Destroy your opponent's weapon.",
    rarity: 'rare',
    type: 'minion',
    keywords: ['tradeable', 'battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'transform',
      requiresTarget: false,
      targetType: 'none'
    },
    tradeableInfo: {
      tradeCost: 1
    }
  },
  {
    id: 12002,
    name: 'Heavy Plate',
    manaCost: 3,
    description: 'Tradeable. Give a minion +3 Health and Taunt.',
    rarity: 'common',
    type: 'spell',
    keywords: ['tradeable'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    spellEffect: {
      type: 'buff',
      buffHealth: 3,
      targetType: 'friendly_minion',
      requiresTarget: true
    },
    tradeableInfo: {
      tradeCost: 1
    }
  },
  {
    id: 12003,
    name: 'Entrapped Sorceress',
    manaCost: 3,
    attack: 3,
    health: 4,
    description: 'Tradeable. Spell Damage +1',
    rarity: 'common',
    type: 'minion',
    keywords: ['tradeable', 'spell_damage'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    tradeableInfo: {
      tradeCost: 1
    }
  },
  {
    id: 12004,
    name: 'Guild Trader',
    manaCost: 2,
    attack: 2,
    health: 3,
    description: 'Tradeable. Battlecry: Reduce the Cost of a random card in your hand by (2).',
    rarity: 'common',
    type: 'minion',
    keywords: ['tradeable', 'battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'transform',
      requiresTarget: false,
      targetType: 'none'
    },
    tradeableInfo: {
      tradeCost: 1
    }
  },
  {
    id: 12005,
    name: 'Stockades Guard',
    manaCost: 4,
    attack: 2,
    health: 6,
    description: 'Tradeable. Taunt',
    rarity: 'common',
    type: 'minion',
    keywords: ['tradeable', 'taunt'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    tradeableInfo: {
      tradeCost: 1
    }
  },
  // ============================================
  // MECHANIC CARDS - INSPIRE
  // ============================================
  {
    id: 13001,
    name: 'Tournament Medic',
    manaCost: 4,
    attack: 1,
    health: 8,
    description: 'Inspire: Restore 2 Health to your hero.',
    rarity: 'common',
    type: 'minion',
    keywords: ['inspire'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    inspireEffect: {
      type: 'heal',
      value: 2,
      targetType: 'friendly_hero',
      targetRequired: false
    }
  },
  {
    id: 13002,
    name: "Hanuman's Champion",
    manaCost: 5,
    attack: 4,
    health: 3,
    description: 'Inspire: Give your other minions +1/+1.',
    rarity: 'common',
    type: 'minion',
    keywords: ['inspire'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    inspireEffect: {
      type: 'buff',
      buffAttack: 1,
      buffHealth: 1,
      targetType: 'all_friendly_minions',
      targetRequired: false
    }
  },
  {
    id: 13003,
    name: 'Kodorider',
    manaCost: 6,
    attack: 3,
    health: 5,
    description: 'Inspire: Summon a 3/5 War Kodo.',
    rarity: 'rare',
    type: 'minion',
    keywords: ['inspire'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    inspireEffect: {
      type: 'summon',
      summonCardId: 13501,
      targetRequired: false
    }
  },
  {
    id: 13004,
    name: 'Berserker Combatant',
    manaCost: 4,
    attack: 5,
    health: 4,
    description: 'Inspire: Give your hero +2 Attack this turn.',
    rarity: 'common',
    type: 'minion',
    keywords: ['inspire'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    inspireEffect: {
      type: 'buff',
      buffAttack: 2,
      targetType: 'friendly_hero',
      targetRequired: false
    }
  },
  {
    id: 13005,
    name: 'Nexus-Champion Saraad',
    manaCost: 5,
    attack: 4,
    health: 5,
    description: 'Inspire: Add a random spell to your hand.',
    rarity: 'rare',
    type: 'minion',
    keywords: ['inspire'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    inspireEffect: {
      type: 'draw',
      value: 1,
      targetRequired: false
    }
  },
  {
    id: 13501,
    name: 'War Kodo',
    manaCost: 5,
    attack: 3,
    health: 5,
    description: "Summoned by Kodorider's Inspire effect.",
    rarity: 'common',
    type: 'minion',
    keywords: [],
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  // ============================================
  // MECHANIC CARDS - CORRUPT
  // ============================================
  {
    id: 21001,
    name: 'Redscale Dragontamer',
    manaCost: 2,
    attack: 1,
    health: 3,
    description: 'Corrupt: Gain +1/+1 and Divine Shield.',
    rarity: 'common',
    type: 'minion',
    keywords: ['corrupt'],
    corruptState: {
      isCorruptible: true,
      isCorrupted: false
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 21002,
    name: 'Altar of Fire',
    manaCost: 1,
    description: 'Remove the top 3 cards from each deck. Corrupt: Remove 3 more.',
    rarity: 'common',
    type: 'spell',
    keywords: ['corrupt'],
    spellEffect: {
      type: 'transform',
      value: 3,
      targetType: 'none',
      requiresTarget: false
    },
    collectible: true,
    class: 'Neutral',
    set: 'core',
    corruptState: {
      isCorruptible: true,
      isCorrupted: false
    }
  },
  {
    id: 21003,
    name: 'Bound Fire-Phoenix',
    manaCost: 2,
    attack: 2,
    health: 2,
    description: 'Dormant for 2 turns. Spell Damage +2. Corrupt: Spell Damage +3.',
    flavorText: 'Chained by the Aesir, its flames still burn eternal.',
    rarity: 'common',
    type: 'minion',
    keywords: ['dormant', 'corrupt'],
    dormantTurns: 2,
    spellPower: 2,
    corruptState: {
      isCorruptible: true,
      isCorrupted: false
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 21005,
    name: 'Dreaming Drake',
    manaCost: 3,
    attack: 3,
    health: 4,
    description: 'Taunt. Corrupt: +2/+2.',
    rarity: 'common',
    type: 'minion',
    keywords: ['taunt', 'corrupt'],
    corruptState: {
      isCorruptible: true,
      isCorrupted: false
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 21006,
    name: 'Nitroboost Poison',
    manaCost: 1,
    description: 'Give a minion +2 Attack. Corrupt: And your weapon.',
    rarity: 'common',
    type: 'spell',
    keywords: ['corrupt'],
    spellEffect: {
      type: 'buff',
      buffAttack: 2,
      targetType: 'friendly_minion',
      requiresTarget: true
    },
    collectible: true,
    class: 'Neutral',
    set: 'core',
    corruptState: {
      isCorruptible: true,
      isCorrupted: false
    }
  },
  {
    id: 21007,
    name: 'Helfire Deadeye',
    manaCost: 2,
    attack: 2,
    health: 3,
    description: 'Your Hero Power costs (1) less. Corrupt: And costs (0) on your next turn.',
    flavorText: 'A marksman from Helheim, never missing a soul.',
    rarity: 'common',
    type: 'minion',
    keywords: ['corrupt'],
    corruptState: {
      isCorruptible: true,
      isCorrupted: false
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 21010,
    name: 'Sword Eater',
    manaCost: 4,
    attack: 2,
    health: 5,
    description: 'Taunt. Battlecry: Equip a 3/2 Sword. Corrupt: A 5/2 Sword.',
    rarity: 'rare',
    type: 'minion',
    keywords: ['taunt', 'battlecry', 'corrupt'],
    battlecry: {
      type: 'summon',
      summonCardId: 21011,
      targetType: 'none',
      requiresTarget: false
    },
    corruptState: {
      isCorruptible: true,
      isCorrupted: false
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 21011,
    name: 'Thornmantle Sword',
    manaCost: 3,
    attack: 3,
    durability: 2,
    description: 'Summoned by Sword Eater.',
    rarity: 'common',
    type: 'weapon',
    keywords: [],
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  // ============================================
  // MECHANIC CARDS - DORMANT
  // ============================================
  {
    id: 10003,
    name: 'Bound Underfiend',
    manaCost: 2,
    attack: 3,
    health: 5,
    type: 'minion',
    rarity: 'common',
    class: 'Neutral',
    race: 'Titan',
    keywords: ['dormant', 'rush'],
    description: 'Dormant for 2 turns. Rush',
    flavorText: 'Shackled in the depths of Niflheim, awaiting release.',
    dormantTurns: 2,
    collectible: true,
    set: 'core'
  },
  {
    id: 10007,
    name: 'Thrymr the Imprisoned',
    manaCost: 4,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'common',
    class: 'Neutral',
    race: 'Titan',
    keywords: ['dormant'],
    description: 'Dormant. After you play 3 minions in a turn, destroy all other minions and awaken.',
    collectible: true,
    set: 'core',
    dormantTurns: -1,
    awakenCondition: {
      type: 'play_minions',
      count: 3,
      inOneTurn: true
    },
    awakenEffect: {
      type: 'damage',
      targetType: 'all_other_minions',
      value: 1000
    }
  },
  // ============================================
  // MECHANIC CARDS - FRENZY
  // ============================================
  {
    id: 9005,
    name: 'Razormane Raider',
    manaCost: 3,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'common',
    class: 'Neutral',
    race: 'Beast',
    keywords: ['frenzy'],
    description: 'Frenzy: Attack a random enemy.',
    collectible: true,
    set: 'core',
    frenzyEffect: {
      type: 'attack_random',
      targetType: 'random_enemy',
      triggered: false
    }
  },
  {
    id: 9006,
    name: 'Peon',
    manaCost: 1,
    attack: 1,
    health: 2,
    type: 'minion',
    rarity: 'common',
    class: 'Neutral',
    keywords: ['frenzy'],
    description: 'Frenzy: Add a random spell to your hand.',
    collectible: true,
    set: 'core',
    frenzyEffect: {
      type: 'add_to_hand',
      cardType: 'spell',
      isRandom: true,
      count: 1,
      triggered: false
    }
  },
  {
    id: 9007,
    name: 'Kargal Battlescar',
    manaCost: 8,
    attack: 6,
    health: 6,
    type: 'minion',
    rarity: 'rare',
    class: 'Neutral',
    keywords: ['frenzy'],
    description: "Frenzy: Summon a 5/5 Watcher for each Watch Post you've summoned this game.",
    collectible: true,
    set: 'core',
    frenzyEffect: {
      type: 'summon',
      summonCardId: 9008,
      summonBasedOnCondition: 'watch_posts_summoned',
      triggered: false
    }
  },
  {
    id: 9008,
    name: 'Battlescar Watcher',
    manaCost: 5,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'common',
    class: 'Neutral',
    keywords: [],
    description: 'Summoned by combat effects.',
    collectible: false,
    set: 'core'
  },
  // ============================================
  // MECHANIC CARDS - REBORN
  // ============================================
  {
    id: 19020,
    name: 'Coldlight Seer',
    manaCost: 3,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Battlecry: Give your other Nagas +2 Health.',
    keywords: ['battlecry'],
    race: 'Naga',
    battlecry: {
      type: 'buff',
      buffAttack: 0,
      buffHealth: 2,
      requiresTarget: false,
      targetType: 'none',
      cardType: 'naga'
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 19021,
    name: 'Aegir Tidecaller',
    manaCost: 1,
    attack: 1,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Whenever you summon a Naga, gain +1 Attack.',
    flavorText: 'Calling upon the power of Aegir, lord of the sea.',
    keywords: [],
    race: 'Naga',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 19001,
    name: 'Murmy',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Reborn',
    keywords: ['reborn'],
    race: 'Naga',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 19005,
    name: 'Wrapped Golem',
    manaCost: 7,
    attack: 7,
    health: 5,
    type: 'minion',
    rarity: 'common',
    description: 'Reborn. At the end of your turn, summon a 1/1 Scarab with Taunt.',
    keywords: ['reborn'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 19006,
    name: 'Kharj Sandtongue',
    manaCost: 3,
    attack: 2,
    health: 2,
    type: 'minion',
    rarity: 'rare',
    description: 'Reborn. Battlecry and Deathrattle: Give a random friendly minion +3 Attack.',
    keywords: ['reborn', 'battlecry', 'deathrattle'],
    class: 'Neutral',
    set: 'core',
    collectible: true,
    battlecry: {
      type: 'buff',
      buffAttack: 3,
      buffHealth: 0,
      targetType: 'friendly_minion',
      requiresTarget: false,
      isRandom: true
    },
    deathrattle: {
      type: 'buff',
      buffAttack: 3,
      buffHealth: 0,
      targetType: 'all_friendly'
    }
  },
  {
    id: 19008,
    name: 'Bone Wraith',
    manaCost: 4,
    attack: 2,
    health: 5,
    type: 'minion',
    rarity: 'common',
    description: 'Taunt, Reborn',
    keywords: ['taunt', 'reborn'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  // ============================================
  // MECHANIC CARDS - MAGNETIC
  // ============================================
  {
    id: 20501,
    name: 'Summon Microbots',
    type: 'spell',
    manaCost: 2,
    rarity: 'common',
    description: 'Summon two 1/1 Microbots.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    spellEffect: {
      type: 'summon',
      summonCardId: 20502,
      value: 2,
      targetType: 'none'
    }
  },
  {
    id: 20502,
    name: 'Microbot',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'A palm-sized clockwork spider skittering on needle-thin legs.',
    keywords: [],
    race: 'Automaton',
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  {
    id: 20504,
    name: 'Wargear',
    manaCost: 5,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'common',
    description: 'Runic Bond',
    keywords: ['magnetic'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20505,
    name: 'Skaterbot',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Runic Bond, Rush',
    keywords: ['magnetic', 'rush'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 20506,
    name: 'Replicating Menace',
    manaCost: 4,
    attack: 3,
    health: 1,
    type: 'minion',
    rarity: 'rare',
    description: 'Runic Bond, Deathrattle: Summon three 1/1 Microbots.',
    keywords: ['magnetic', 'deathrattle'],
    class: 'Neutral',
    set: 'core',
    collectible: true,
    race: 'Automaton',
    deathrattle: {
      type: 'summon',
      summonCardId: 20502,
      value: 3,
      targetType: 'none'
    }
  },
  {
    id: 20507,
    name: 'Missile Launcher',
    manaCost: 6,
    attack: 4,
    health: 4,
    type: 'minion',
    rarity: 'common',
    description: 'Runic Bond, At the end of your turn, deal 1 damage to all other characters.',
    keywords: ['magnetic'],
    class: 'Neutral',
    race: 'Automaton',
    collectible: true,
    set: 'core'
  },
  // ============================================
  // MECHANIC CARDS - RECRUIT
  // ============================================
  {
    id: 18101,
    name: 'Silver Vanguard',
    manaCost: 7,
    attack: 5,
    health: 4,
    description: 'Deathrattle: Recruit an 8-Cost minion.',
    rarity: 'common',
    type: 'minion',
    keywords: ['deathrattle'],
    deathrattle: {
      type: 'summon',
      targetType: 'none',
      summonCardId: 18102
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 18102,
    name: 'Gather Your Party',
    manaCost: 6,
    description: 'Recruit a minion.',
    rarity: 'rare',
    type: 'spell',
    keywords: ['recruit'],
    spellEffect: {
      type: 'summon',
      targetType: 'none',
      requiresTarget: false,
      summonCardId: 18103,
      value: 1
    },
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 18104,
    name: 'Guild Recruiter',
    manaCost: 5,
    attack: 2,
    health: 4,
    description: 'Battlecry: Recruit a minion that costs (4) or less.',
    rarity: 'common',
    type: 'minion',
    keywords: ['battlecry', 'recruit'],
    battlecry: {
      type: 'summon',
      requiresTarget: false,
      targetType: 'none',
      summonCardId: 18105
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 18105,
    name: 'Oaken Summons',
    manaCost: 4,
    description: 'Gain 6 Armor. Recruit a minion that costs (4) or less.',
    rarity: 'common',
    type: 'spell',
    keywords: ['recruit'],
    spellEffect: {
      type: 'heal',
      value: 6,
      targetType: 'friendly_hero',
      requiresTarget: false
    },
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 18106,
    name: 'Possessed Lackey',
    manaCost: 6,
    attack: 2,
    health: 2,
    description: 'Deathrattle: Recruit a Titan.',
    rarity: 'rare',
    type: 'minion',
    keywords: ['deathrattle', 'recruit'],
    deathrattle: {
      type: 'summon',
      targetType: 'none',
      summonCardId: 18107
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 18107,
    name: 'Call to Arms',
    manaCost: 5,
    description: 'Recruit 3 minions that cost (2) or less.',
    rarity: 'rare',
    type: 'spell',
    keywords: ['recruit'],
    spellEffect: {
      type: 'summon',
      targetType: 'none',
      requiresTarget: false,
      summonCardId: 18108,
      value: 1
    },
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 18108,
    name: 'To My Side!',
    manaCost: 6,
    description: 'Summon a Beast of Valhalla, or 2 if your deck has no minions.',
    rarity: 'rare',
    type: 'spell',
    keywords: ['recruit'],
    spellEffect: {
      type: 'summon',
      targetType: 'none',
      requiresTarget: false,
      summonCardId: 18109,
      value: 1
    },
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  // ============================================
  // MECHANIC CARDS - RUSH/LIFESTEAL
  // ============================================
  {
    id: 26001,
    name: 'Militia Commander',
    manaCost: 4,
    attack: 2,
    health: 5,
    description: 'Rush. Battlecry: Gain +3 Attack this turn.',
    rarity: 'rare',
    type: 'minion',
    keywords: ['rush', 'battlecry'],
    battlecry: {
      type: 'buff',
      buffAttack: 3,
      targetType: 'none',
      requiresTarget: false,
      buffHealth: 1
    },
    collectible: true,
    class: 'Neutral',
    set: 'core'
  },
  {
    id: 26002,
    name: 'Swift Messenger',
    manaCost: 4,
    attack: 2,
    health: 6,
    description: 'Rush. Each turn this is in your hand, swap its Attack and Health.',
    rarity: 'common',
    type: 'minion',
    keywords: ['rush'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 26003,
    name: 'Moon-Mad Fenriskin',
    manaCost: 3,
    attack: 3,
    health: 3,
    description: 'Rush',
    flavorText: 'Descended from Fenrir, driven mad by the moon.',
    rarity: 'common',
    type: 'minion',
    keywords: ['rush'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 26101,
    name: 'Spirit Lash',
    manaCost: 2,
    description: 'Lifesteal. Deal 1 damage to all minions.',
    rarity: 'common',
    type: 'spell',
    keywords: ['lifesteal'],
    spellEffect: {
      type: 'aoe_damage',
      value: 1,
      targetType: 'all_minions',
      requiresTarget: false
    },
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 26103,
    name: 'Vicious Scalehide',
    manaCost: 2,
    attack: 1,
    health: 3,
    description: 'Lifesteal, Rush',
    rarity: 'common',
    type: 'minion',
    keywords: ['lifesteal', 'rush'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 26104,
    name: 'Bloodworm',
    manaCost: 5,
    attack: 4,
    health: 4,
    description: 'Lifesteal',
    rarity: 'common',
    type: 'minion',
    keywords: ['lifesteal'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  // ============================================
  // MECHANIC CARDS - SPELLBURST
  // ============================================
  {
    id: 18201,
    name: 'Onyx Magescribe',
    manaCost: 6,
    attack: 4,
    health: 9,
    type: 'minion',
    rarity: 'common',
    description: 'Spellburst: Add 2 random spells from your class to your hand.',
    keywords: ['spellburst'],
    class: 'Neutral',
    set: 'core',
    collectible: true,
    race: 'Dragon',
    spellburstEffect: {
      type: 'discover',
      value: 2,
      targetType: 'none',
      consumed: false
    }
  },
  {
    id: 18202,
    name: 'Necro-Archon of Hel',
    manaCost: 5,
    attack: 4,
    health: 6,
    type: 'minion',
    rarity: 'rare',
    description: 'Spellburst: If the spell destroys any minions, summon them.',
    flavorText: 'The supreme necromancer of Helheim commands the dead.',
    keywords: ['spellburst'],
    class: 'Neutral',
    spellburstEffect: {
      type: 'summon',
      targetType: 'none',
      consumed: false
    },
    collectible: true,
    set: 'core'
  },
  // ============================================
  // ELDER TITAN SUPPORT CARDS (Gullveig synergy)
  // ============================================
  {
    id: 91001,
    name: "Cthulhu, the Dreamer",
    manaCost: 10,
    attack: 6,
    health: 6,
    type: 'minion',
    rarity: 'epic',
    description: "Battlecry: Deal damage equal to this minion's Attack randomly split among all enemies.",
    flavorText: "From the depths of R'lyeh, the ancient horror awakens.",
    keywords: ['battlecry'],
    class: 'Neutral',
    battlecry: {
      type: 'cthun_damage',
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 91002,
    name: "Acolyte of Chaos",
    manaCost: 2,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: "Battlecry: Give your Gullveig +2/+2 (wherever she is).",
    flavorText: "Whispers of seidr echo through their incantations.",
    keywords: ['battlecry'],
    class: 'Neutral',
    battlecry: {
      type: 'buff_cthun',
      requiresTarget: false,
      targetType: 'none',
      buffAttack: 2,
      buffHealth: 2
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 91003,
    name: "Disciple of Ginnungagap",
    manaCost: 3,
    attack: 2,
    health: 1,
    type: 'minion',
    rarity: 'rare',
    description: "Battlecry: Deal 2 damage. Give your Gullveig +2/+2 (wherever she is).",
    flavorText: "Pain is but an offering to the Thrice-Burned.",
    keywords: ['battlecry'],
    class: 'Neutral',
    battlecry: {
      type: 'cthun_cultist_damage',
      requiresTarget: true,
      targetType: 'any',
      value: 2,
      buffCthun: true,
      buffAttack: 2,
      buffHealth: 2
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 91005,
    name: "Elder of Twilight",
    manaCost: 3,
    attack: 3,
    health: 4,
    type: 'minion',
    rarity: 'common',
    description: "At the end of your turn, give your Gullveig +1/+1 (wherever she is).",
    flavorText: "The twilight between worlds feeds the Thrice-Burned's growing rage.",
    keywords: [],
    class: 'Neutral',
    effects: [{
      type: 'end_of_turn',
      value: 1,
      endOfTurnEffect: 'buff_cthun'
    }],
    collectible: true,
    set: 'core'
  },
  // Duplicate Elder Titan cards (91101, 91102) deleted — canonical versions are
  // Hyrrokkin (60101) and Utgarda-Loki (60102) in oldGods.ts
  {
    id: 91103,
    name: "Unbound Rage of Muspel",
    manaCost: 10,
    attack: 10,
    health: 10,
    type: 'minion',
    rarity: 'rare',
    description: "At the end of your turn, summon a minion from your deck.",
    flavorText: "The fire giant's rage knows no bounds, summoning warriors to Ragnarök.",
    keywords: [],
    class: 'Neutral',
    effects: [{
      type: 'end_of_turn',
      value: 1,
      endOfTurnEffect: 'summon_from_deck'
    }],
    collectible: true,
    set: 'core'
  },
  // ============================================
  // COLOSSAL CARDS
  // ============================================
  {
    id: 90201,
    name: "Tidehunter of the Deep",
    manaCost: 8,
    attack: 7,
    health: 7,
    type: 'minion',
    rarity: 'epic',
    description: "Colossal +2. Battlecry: Summon two Tidal Hands. Whenever a Tidal Hand attacks, add a random Elemental to your hand.",
    flavorText: "Lord of the ocean giants, his hands reach across the nine seas.",
    keywords: ['colossal', 'battlecry'],
    class: 'Neutral',
    battlecry: {
      type: 'summon_parts',
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 90202,
    name: "Tidal Hand",
    manaCost: 2,
    attack: 4,
    health: 2,
    type: 'minion',
    rarity: 'rare',
    description: "Part of Tidehunter of the Deep. After this attacks, add a random Elemental to your hand.",
    flavorText: "The hands of the deep grasp treasures from below.",
    keywords: [],
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  {
    id: 90203,
    name: "Depth-Terror of the Strait",
    manaCost: 7,
    attack: 5,
    health: 8,
    type: 'minion',
    rarity: 'epic',
    description: "Colossal +2. Taunt. Battlecry: Draw 3 Nagas from your deck.",
    flavorText: "The six-headed monster guards the strait between worlds.",
    keywords: ['colossal', 'taunt', 'battlecry'],
    class: 'Neutral',
    battlecry: {
      type: 'draw',
      value: 3,
      requiresTarget: false,
      targetType: 'none',
      cardType: 'naga'
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 90204,
    name: "Scylla's Maw",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: "Part of Scylla. Taunt. Deathrattle: Deal 2 damage to all enemy minions.",
    flavorText: "Each of Scylla's heads hungers for flesh.",
    keywords: ['taunt', 'deathrattle'],
    class: 'Neutral',
    deathrattle: {
      type: 'damage',
      value: 2,
      targetType: 'all_enemies'
    },
    collectible: false,
    set: 'core'
  },
  {
    id: 90205,
    name: "Scylla's Tail",
    manaCost: 3,
    attack: 2,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: "Part of Scylla. Taunt. Battlecry: Give adjacent minions +1/+1.",
    flavorText: "The serpentine tail crushes ships in its coils.",
    keywords: ['taunt', 'battlecry'],
    class: 'Neutral',
    battlecry: {
      type: 'buff',
      buffAttack: 1,
      buffHealth: 1,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: false,
    set: 'core'
  },
  {
    id: 90206,
    name: "Colossus of Rhodes",
    manaCost: 10,
    attack: 10,
    health: 10,
    type: 'minion',
    rarity: 'epic',
    description: "Colossal +3. Divine Shield. Summons three Solar Shields that protect the main body.",
    flavorText: "The bronze titan guarded the harbor, blessed by Helios himself.",
    keywords: ['colossal', 'divine_shield', 'battlecry'],
    class: 'Neutral',
    battlecry: {
      type: 'summon',
      summonCardId: 90207,
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 90207,
    name: "Solar Shield",
    manaCost: 4,
    attack: 0,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: "Part of Colossus of Rhodes. Taunt. Divine Shield. Can't attack.",
    flavorText: "Forged from the sun's rays to protect the titan.",
    keywords: ['taunt', 'divine_shield'],
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  // ============================================
  // PIRATE CARDS
  // ============================================
  {
    id: 86001,
    name: "Draugr Raider",
    manaCost: 2,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'common',
    race: 'Einherjar',
    description: "Battlecry: Gain Attack equal to the Attack of your weapon.",
    flavorText: "Undead Norse raiders still hunger for gold.",
    keywords: ['battlecry'],
    class: 'Neutral',
    battlecry: {
      type: 'weapon_attack_buff',
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 86002,
    name: "Corsair of Charybdis",
    manaCost: 1,
    attack: 1,
    health: 2,
    type: 'minion',
    rarity: 'rare',
    race: 'Einherjar',
    description: "Battlecry: Remove 1 Durability from your opponent's weapon.",
    flavorText: "Sailing the whirlpool's edge, they strip ships of their arms.",
    keywords: ['battlecry'],
    class: 'Neutral',
    battlecry: {
      type: 'weapon_durability_damage',
      value: 1,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true,
    set: 'core'
  },
  // ============================================
  // DUAL-CLASS CARDS
  // ============================================
  {
    id: 90401,
    name: "Huntress of the Wilds",
    manaCost: 3,
    attack: 2,
    health: 4,
    type: 'minion',
    rarity: 'common',
    description: "Dual-Class: Hunter/Berserker. Your other characters are Immune while attacking.",
    flavorText: "The goddess of the hunt protects her companions from harm.",
    keywords: ['dual_class'],
    class: 'Neutral',
    dualClassInfo: {
      classes: ['hunter', 'berserker']
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 90402,
    name: "Shapeshifter of Poseidon",
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: "Dual-Class: Druid/Shaman. Choose One - Transform into a 3/1 Rush form; or a 1/3 form with Taunt.",
    flavorText: "Poseidon's servants shift between forms at will.",
    keywords: ['dual_class', 'choose_one'],
    class: 'Neutral',
    dualClassInfo: {
      classes: ['druid', 'shaman']
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 90403,
    name: "Call from Helheim",
    manaCost: 0,
    type: 'spell',
    rarity: 'common',
    description: "Dual-Class: Priest/Warlock. Deal 3 damage to your hero. Return two friendly minions that died this game to your hand.",
    flavorText: "The realm of the dead answers those who pay in blood.",
    keywords: ['dual_class'],
    class: 'Neutral',
    dualClassInfo: {
      classes: ['priest', 'warlock']
    },
    spellEffect: {
      type: 'damage',
      value: 3,
      targetType: 'friendly_hero'
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 90404,
    name: "Thief of Hermes",
    manaCost: 1,
    attack: 1,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: "Dual-Class: Mage/Rogue. Combo: Foresee a Mage spell.",
    flavorText: "Swift as the messenger god, cunning as a trickster.",
    keywords: ['dual_class', 'combo'],
    class: 'Neutral',
    dualClassInfo: {
      classes: ['mage', 'rogue']
    },
    comboEffect: {
      type: 'discover',
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true,
    set: 'core'
  },
  {
    id: 90405,
    name: "Acolyte of Athena",
    manaCost: 6,
    attack: 4,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: "Dual-Class: Paladin/Priest. Divine Shield, Taunt. Costs (1) less for each spell you've cast on friendly characters this game.",
    flavorText: "Wisdom and purity shield the devoted.",
    keywords: ['dual_class', 'divine_shield', 'taunt'],
    class: 'Neutral',
    dualClassInfo: {
      classes: ['paladin', 'priest']
    },
    collectible: true,
    set: 'core'
  },
  // ============================================
  // MYTHOLOGY MYTHIC CARDS (92001-92025)
  // Norse/Greek Mythology Theming
  // ============================================
  {
    id: 92001,
    name: "Surtr's Warmaster",
    manaCost: 7,
    attack: 7,
    health: 7,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Summon two 1/1 Fire-Bots that deal 1-4 damage when they die.',
    flavorText: 'From Muspelheim, he commands an army of explosive automatons.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon_multiple',
      summonCardId: 92101,
      count: 2,
      requiresTarget: false,
      targetType: 'friendly_battlefield'
    }
  },
  {
    id: 92002,
    name: "Muspel's Fury",
    manaCost: 8,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: "Can't attack. At the end of your turn, deal 8 damage to a random enemy.",
    flavorText: 'The living flame of Muspelheim strikes without mercy.',
    keywords: ['cant_attack'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    effects: [{
      type: 'end_of_turn',
      value: 8,
      endOfTurnEffect: 'random_enemy_damage'
    }]
  },
  {
    id: 92003,
    name: "Hel's Reaper",
    manaCost: 6,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Deathrattle: Take control of a random enemy minion.',
    flavorText: "Hel's champion claims souls for the underworld.",
    keywords: ['deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'mind_control',
      targetType: 'random_enemy_minion',
      requiresTarget: false
    }
  },
  {
    id: 92004,
    name: "Niflheim's Monarch",
    manaCost: 8,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'Taunt. At the end of your turn, add a random Death Knight card to your hand.',
    flavorText: 'The lord of the frozen realm commands the powers of death itself.',
    keywords: ['taunt'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    effects: [{
      type: 'end_of_turn',
      endOfTurnEffect: 'add_death_knight_card'
    }]
  },
  {
    id: 92005,
    name: 'Berserker of Tyr',
    manaCost: 5,
    attack: 6,
    health: 2,
    type: 'minion',
    rarity: 'epic',
    description: 'Charge. Battlecry: Summon two 1/1 Whelps for your opponent.',
    flavorText: 'At least he has the fury of the war god!',
    keywords: ['charge', 'battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon_for_opponent',
      summonCardId: 92102,
      count: 2,
      requiresTarget: false,
      targetType: 'enemy_battlefield'
    }
  },
  {
    id: 92006,
    name: 'Seer of Mimir',
    manaCost: 2,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'rare',
    description: 'Spell Damage +1. Deathrattle: Draw a card.',
    flavorText: "Drinking from Mimir's well grants wisdom beyond measure.",
    keywords: ['spell_damage', 'deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    spellDamage: 1,
    deathrattle: {
      type: 'draw',
      value: 1,
      requiresTarget: false,
      targetType: 'none'
    }
  },
  {
    id: 92007,
    name: "Sindri's Goldsmith",
    manaCost: 6,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'At the end of your turn, reduce the Cost of cards in your hand by (1).',
    flavorText: 'The dwarven smith crafts treasures that lighten any burden.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    effects: [{
      type: 'end_of_turn',
      value: 1,
      endOfTurnEffect: 'reduce_hand_cost'
    }]
  },
  {
    id: 92008,
    name: 'Rune-Binder of Asgard',
    manaCost: 5,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Enemy spells cost (5) more next turn.',
    flavorText: 'Ancient runes seal away magical power.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'increase_spell_cost',
      value: 5,
      duration: 1,
      requiresTarget: false,
      targetType: 'enemy'
    }
  },
  {
    id: 92009,
    name: "Hephaestus' Creation",
    manaCost: 5,
    attack: 3,
    health: 2,
    type: 'minion',
    rarity: 'rare',
    description: 'Runic Bond, Divine Shield, Taunt, Lifesteal, Rush',
    flavorText: 'The god of the forge crafted this masterwork of divine engineering.',
    keywords: ['magnetic', 'divine_shield', 'taunt', 'lifesteal', 'rush'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 92010,
    name: 'Drake of Midgard Sky',
    manaCost: 5,
    attack: 4,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'Spell Damage +1. Battlecry: Draw a card.',
    flavorText: 'It soars between the realms, breathing arcane fire.',
    keywords: ['spell_damage', 'battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    spellDamage: 1,
    battlecry: {
      type: 'draw',
      value: 1,
      requiresTarget: false,
      targetType: 'none'
    }
  },
  {
    id: 92011,
    name: 'Automaton of Brokkr',
    manaCost: 4,
    attack: 4,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Deathrattle: Summon a random 2-Cost minion.',
    flavorText: 'The dwarven construct carries surprises within its gears.',
    keywords: ['deathrattle'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon_random',
      costFilter: 2,
      requiresTarget: false,
      targetType: 'friendly_battlefield'
    }
  },
  {
    id: 92012,
    name: 'Guardian of Helgate',
    manaCost: 5,
    attack: 3,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Taunt. Deathrattle: Summon a 1/2 Slime with Taunt.',
    flavorText: 'It guards the boundary between the living and the dead.',
    keywords: ['taunt', 'deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon',
      summonCardId: 92103,
      requiresTarget: false,
      targetType: 'friendly_battlefield'
    }
  },
  {
    id: 92013,
    name: 'Titan of the Deep Sea',
    manaCost: 10,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'Costs (1) less for each minion on the battlefield.',
    flavorText: 'Rising from the depths, the titan towers over all.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    costReduction: {
      type: 'minions_on_board',
      value: 1
    }
  },
  {
    id: 92014,
    name: 'Giant of Jotunheim Peak',
    manaCost: 12,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'Costs (1) less for each other card in your hand.',
    flavorText: 'The mountain giant descends when hands are full of power.',
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    costReduction: {
      type: 'cards_in_hand',
      value: 1
    }
  },
  {
    id: 92015,
    name: "Loki's Blade Dancer",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'After you summon a minion, deal 1 damage to a random enemy.',
    flavorText: "Each blade flicks with the trickster god's precision.",
    keywords: [],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    triggerEffect: {
      type: 'on_summon',
      effect: 'random_enemy_damage',
      value: 1
    }
  },
  {
    id: 92016,
    name: 'Shieldbearer of Argos',
    manaCost: 4,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Give adjacent minions +1/+1 and Taunt.',
    flavorText: 'The warriors of Argos stand together, unbreakable.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_adjacent',
      buffAttack: 1,
      buffHealth: 1,
      grantKeywords: ['taunt'],
      requiresTarget: false,
      targetType: 'adjacent_minions'
    }
  },
  {
    id: 92017,
    name: 'Oracle of Olympus',
    manaCost: 2,
    attack: 3,
    health: 2,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: If your deck has no duplicates, wish for the perfect card.',
    flavorText: 'The oracle speaks with the wisdom of the gods themselves.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'zephrys_wish',
      condition: 'no_duplicates',
      requiresTarget: false,
      targetType: 'none'
    }
  },
  {
    id: 92018,
    name: 'Champion of the Four Winds',
    manaCost: 7,
    attack: 6,
    health: 6,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Gain 2 of Rush, Taunt, Divine Shield, or Windfury (your choice).',
    flavorText: 'The four winds obey this mighty champion of the skies.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'choose_keywords',
      options: ['rush', 'taunt', 'divine_shield', 'windfury'],
      chooseCount: 2,
      requiresTarget: false,
      targetType: 'self'
    }
  },
  {
    id: 92019,
    name: 'Siren of the Deep',
    manaCost: 3,
    attack: 2,
    health: 2,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Each player draws 2 cards.',
    flavorText: 'Her song lures sailors—and cards—from the depths.',
    keywords: ['battlecry'],
    race: 'Naga',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'draw_for_both',
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    }
  },
  {
    id: 92020,
    name: 'Aegis Bearer of Apollo',
    manaCost: 2,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Give adjacent minions Taunt.',
    flavorText: "Apollo's shield protects those who stand beside it.",
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'grant_keyword_adjacent',
      grantKeywords: ['taunt'],
      requiresTarget: false,
      targetType: 'adjacent_minions'
    }
  },
  {
    id: 92021,
    name: 'Giant-Slayer of Midgard',
    manaCost: 5,
    attack: 4,
    health: 2,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Destroy a minion with 7 or more Attack.',
    flavorText: 'The heroes of Midgard are trained to fell giants.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy',
      requiresTarget: true,
      targetType: 'minion',
      condition: 'attack_7_or_more'
    }
  },
  {
    id: 92022,
    name: 'War Beast of Ares',
    manaCost: 5,
    attack: 3,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Destroy a random enemy minion with 2 or less Attack.',
    flavorText: 'The beasts of Ares hunt the weak and the cowardly.',
    keywords: ['battlecry'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy',
      requiresTarget: false,
      targetType: 'random_enemy_minion',
      condition: 'attack_2_or_less'
    }
  },
  {
    id: 92023,
    name: 'Shapeshifter of Proteus',
    manaCost: 5,
    attack: 3,
    health: 3,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Become a copy of a minion.',
    flavorText: 'Proteus, the old man of the sea, shifts forms at will.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'copy_minion',
      requiresTarget: true,
      targetType: 'any_minion'
    }
  },
  {
    id: 92024,
    name: "Proteus' Champion",
    manaCost: 5,
    attack: 4,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'Rush. Battlecry: Transform a friendly minion into a 3/3 copy of this with Rush.',
    flavorText: 'The champion transforms allies into fierce copies of itself.',
    keywords: ['rush', 'battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'transform_friendly',
      transformStats: { attack: 3, health: 3 },
      grantKeywords: ['rush'],
      requiresTarget: true,
      targetType: 'friendly_minion'
    }
  },
  {
    id: 92025,
    name: 'Dragon of Dusk',
    manaCost: 4,
    attack: 4,
    health: 1,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Gain +1 Health for each card in your hand.',
    flavorText: 'As twilight falls, the dragon grows stronger.',
    keywords: ['battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_by_hand_size',
      buffHealth: 1,
      requiresTarget: false,
      targetType: 'self'
    }
  },
  // ============================================
  // TOKEN CARDS FOR MYTHOLOGY LEGENDARIES
  // ============================================
  {
    id: 92101,
    name: 'Muspel Sprite',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Deathrattle: Deal 1-4 damage to a random enemy.',
    flavorText: 'Tick... tick... BOOM!',
    keywords: ['deathrattle'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: false,
    set: 'core',
    deathrattle: {
      type: 'random_damage',
      minValue: 1,
      maxValue: 4,
      targetType: 'random_enemy'
    }
  },
  {
    id: 92102,
    name: 'Wyrm Hatchling',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'A tiny dragon hatchling with smoldering scales.',
    flavorText: 'A tiny dragon hatchling.',
    keywords: [],
    race: 'Dragon',
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  {
    id: 92103,
    name: 'Eitr Slime',
    manaCost: 1,
    attack: 1,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Taunt',
    flavorText: 'Oozing from the gates of Hel.',
    keywords: ['taunt'],
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  // ============================================
  // MYTHOLOGY-THEMED NEUTRAL MINIONS (33026-33050)
  // Norse/Greek mythology theming
  // ============================================
  {
    id: 33026,
    name: 'Wounded Champion of Athena',
    manaCost: 4,
    attack: 4,
    health: 7,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Deal 4 damage to this minion.',
    flavorText: 'Even wounded, the champion of wisdom fights with unmatched skill.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'self_damage',
      value: 4,
      requiresTarget: false
    }
  },
  {
    id: 33027,
    name: 'Disciple of Prometheus',
    manaCost: 3,
    attack: 1,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Whenever this minion takes damage, draw a card.',
    flavorText: 'Like his master, he suffers for knowledge.',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33028,
    name: 'Flame-Touched Pyromancer',
    manaCost: 2,
    attack: 3,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'After you cast a spell, deal 1 damage to ALL minions.',
    flavorText: 'Touched by the flames of Muspelheim, chaos follows every spell.',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33029,
    name: 'Priestess of Eir',
    manaCost: 1,
    attack: 1,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Whenever a minion is healed, draw a card.',
    flavorText: 'The healing goddess Eir rewards those who mend wounds.',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33030,
    name: 'Prophet of Ragnarok',
    manaCost: 2,
    attack: 0,
    health: 7,
    type: 'minion',
    rarity: 'rare',
    description: 'At the start of your turn, destroy ALL minions.',
    flavorText: 'When Ragnarok comes, none shall be spared.',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    startOfTurn: { type: "destroy_all_minions" }
  },
  {
    id: 33031,
    name: "Nidhogg's Serpent",
    manaCost: 3,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Poisonous',
    flavorText: 'A lesser spawn of the dragon who gnaws at the World Tree.',
    keywords: ['poisonous'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33032,
    name: 'Silk-Weaver of the Dark',
    manaCost: 6,
    attack: 2,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'Poisonous',
    flavorText: 'The mortal who dared challenge Athena, forever cursed to weave death.',
    keywords: ['poisonous'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33033,
    name: 'Shadow of Nyx',
    manaCost: 2,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'epic',
    description: 'Stealth. Poisonous.',
    flavorText: 'Born from the primordial goddess of night, death lurks unseen.',
    keywords: ['stealth', 'poisonous'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33034,
    name: 'Acolyte of Hestia',
    manaCost: 1,
    attack: 2,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'At the end of your turn, give another random friendly minion +1 Health.',
    flavorText: 'The hearth goddess blesses her faithful with warmth and protection.',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33035,
    name: "Fenrir's Pack Leader",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Adjacent minions have +1 Attack.',
    flavorText: 'The alpha of the great wolf leads the hunt.',
    keywords: ['aura'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33036,
    name: 'Totem of Muspelheim',
    manaCost: 2,
    attack: 0,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Adjacent minions have +2 Attack.',
    flavorText: 'The fire realm empowers those who stand near its totems.',
    keywords: ['aura'],
    race: 'Spirit',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33037,
    name: 'Einherjar Commander',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Battlecry: Give a minion +2 Attack this turn.',
    flavorText: 'The fallen warriors of Valhalla rally to his command.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_temp',
      targetType: 'any_minion',
      requiresTarget: true,
      buffAttack: 2
    }
  },
  {
    id: 33038,
    name: 'Smith of Nidavellir',
    manaCost: 4,
    attack: 4,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Give a minion +2 Attack this turn.',
    flavorText: 'The dwarven smiths forge weapons that burn with power.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff_temp',
      targetType: 'any_minion',
      requiresTarget: true,
      buffAttack: 2
    }
  },
  {
    id: 33039,
    name: 'High Priest of Hades',
    manaCost: 4,
    attack: 4,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Whenever one of your other minions dies, draw a card.',
    flavorText: 'Every soul that passes fuels his dark knowledge.',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33040,
    name: 'Pirate King of Aegir',
    manaCost: 3,
    attack: 3,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: 'Your other Pirates have +1/+1.',
    flavorText: 'Lord of the sea raiders, blessed by the ocean god.',
    keywords: ['aura'],
    race: 'Einherjar',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33041,
    name: 'Champion of Ran',
    manaCost: 3,
    attack: 3,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: 'Your other Nagas have +2 Attack.',
    flavorText: 'The sea goddess Ran favors her amphibian warriors.',
    keywords: ['aura'],
    race: 'Naga',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33042,
    name: 'Champion of Asgard',
    manaCost: 7,
    attack: 6,
    health: 6,
    type: 'minion',
    rarity: 'common',
    description: 'Your other minions have +1/+1.',
    flavorText: 'The greatest warrior of the golden realm inspires all who fight beside him.',
    keywords: ['aura'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33043,
    name: 'Warchief of Valhalla',
    manaCost: 3,
    attack: 2,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Your other minions have +1 Attack.',
    flavorText: 'Leading the eternal battle cry of the honored dead.',
    keywords: ['aura'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33044,
    name: 'Oracle of the Sea',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Your other Nagas have +1 Attack.',
    flavorText: 'The ancient sea sprites speak prophecies of the deep.',
    keywords: ['aura'],
    race: 'Naga',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33045,
    name: 'Dawn-Wolf Alpha',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Your other Beasts have +1 Attack.',
    flavorText: 'The wolf who chases the sun empowers all beasts.',
    keywords: ['aura'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33046,
    name: 'Gryphon of Zeus',
    manaCost: 3,
    attack: 2,
    health: 4,
    type: 'minion',
    rarity: 'common',
    description: 'Your other minions have +1 Attack.',
    flavorText: 'The thunder god rides his majestic gryphon into battle.',
    keywords: ['aura'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33047,
    name: 'Beast-Lord of Artemis',
    manaCost: 4,
    attack: 3,
    health: 6,
    type: 'minion',
    rarity: 'common',
    description: 'Your other minions have Rush.',
    flavorText: 'The huntress goddess commands all beasts to strike swift.',
    keywords: ['aura'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33048,
    name: 'Divine Knight of Freya',
    manaCost: 3,
    attack: 3,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Divine Shield',
    flavorText: 'Protected by the light of the goddess of love and war.',
    keywords: ['divine_shield'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33049,
    name: 'Squire of Baldur',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Divine Shield',
    flavorText: 'The god of light shields his devoted squire.',
    keywords: ['divine_shield'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 33050,
    name: 'Construct of Hephaestus',
    manaCost: 2,
    attack: 2,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Divine Shield',
    flavorText: 'Forged by the god of fire and metalworking, protected by divine craft.',
    keywords: ['divine_shield'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  }
];

// ============================================
// MYTHOLOGY-THEMED NEUTRAL CARDS (32051-32075)
// Norse/Greek mythology themed neutral cards
// ============================================

const mythologySpells: CardData[] = [
  {
    id: 32051,
    name: "Odin's Binding",
    manaCost: 0,
    type: 'spell',
    rarity: 'common',
    description: 'Silence a minion.',
    flavorText: 'The Allfather binds the tongues of the unworthy.',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    spellEffect: {
      type: 'silence',
      targetType: 'any_minion',
      requiresTarget: true
    }
  }
];

const mythologyCommonMinions: CardData[] = [
  {
    id: 32052,
    name: 'Pesterer of Loki',
    manaCost: 2,
    attack: 1,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Taunt. Divine Shield.',
    flavorText: 'Loki crafted this annoyance to bother the other gods.',
    keywords: ['taunt', 'divine_shield'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32065,
    name: 'Ooze of the Styx',
    manaCost: 2,
    attack: 3,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Battlecry: Destroy your opponent\'s weapon.',
    flavorText: 'The acidic waters of the Styx dissolve all mortal craft.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy_weapon',
      targetType: 'enemy_hero',
      requiresTarget: false
    }
  },
  {
    id: 32068,
    name: 'Owl of Athena',
    manaCost: 3,
    attack: 2,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Battlecry: Silence a minion.',
    flavorText: 'Athena\'s owl sees through all deception.',
    keywords: ['battlecry'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'silence',
      targetType: 'any_minion',
      requiresTarget: true
    }
  },
  {
    id: 32075,
    name: 'Dragon-Bane of Sigurd',
    manaCost: 3,
    attack: 4,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Battlecry: Deal 6 damage to a Dragon.',
    flavorText: 'Sigurd slew the dragon Fafnir. His followers carry on the hunt.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'deal_damage',
      value: 6,
      targetType: 'dragon',
      requiresTarget: true
    }
  }
];

const mythologyRareMinions: CardData[] = [
  {
    id: 32053,
    name: 'Iron Golem of Sindri',
    manaCost: 3,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: 'Deathrattle: Summon a 2/1 Damaged Golem.',
    flavorText: 'The dwarf Sindri crafted golems that never truly die.',
    keywords: ['deathrattle'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon',
      summonCardId: 32076
    }
  },
  {
    id: 32054,
    name: 'Frost Automaton',
    manaCost: 4,
    attack: 4,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Deathrattle: Give each player a Spare Part.',
    flavorText: 'Powered by the eternal cold of Niflheim.',
    keywords: ['deathrattle'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'give_spare_part',
      targetType: 'both_players'
    }
  },
  {
    id: 32067,
    name: 'Runebreaker of Asgard',
    manaCost: 4,
    attack: 4,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Silence a minion.',
    flavorText: 'The runebreakers shatter magical bonds with a single strike.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'silence',
      targetType: 'any_minion',
      requiresTarget: true
    }
  },
  {
    id: 32069,
    name: 'Faerie of Alfheim',
    manaCost: 3,
    attack: 3,
    health: 2,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Add a random Mythic minion to your hand.',
    flavorText: 'The light elves grant boons to the worthy.',
    keywords: ['battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'add_random_to_hand',
      filter: 'mythic',
      requiresTarget: false
    }
  },
  {
    id: 32071,
    name: 'Cobalt Drake of Thor',
    manaCost: 5,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'common',
    description: 'At the end of your turn, give another random friendly minion +3 Attack.',
    flavorText: 'Thor\'s drakes strike with the fury of lightning.',
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32072,
    name: 'Flame Drake of Muspel',
    manaCost: 5,
    attack: 3,
    health: 6,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Deal 1 damage to all other minions.',
    flavorText: 'Born in the fires of Muspelheim, it scorches all around it.',
    keywords: ['battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'deal_damage',
      value: 1,
      targetType: 'all_other_minions',
      requiresTarget: false
    }
  },
  {
    id: 32074,
    name: 'Slumbering Wyrm of Nidavellir',
    manaCost: 9,
    attack: 4,
    health: 12,
    type: 'minion',
    rarity: 'common',
    description: 'Taunt',
    flavorText: 'The great wyrms sleep beneath the dwarven mines.',
    keywords: ['taunt'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  }
];

const mythologyEpicMinions: CardData[] = [
  {
    id: 32055,
    name: 'Skeletal Steed of Hel',
    manaCost: 7,
    attack: 5,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Give a friendly minion +4/+4 and Taunt.',
    flavorText: 'The steeds of Hel carry warriors to undeath.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'buff',
      buffAttack: 4,
      buffHealth: 4,
      grantKeyword: 'taunt',
      targetType: 'friendly_minion',
      requiresTarget: true
    }
  },
  {
    id: 32066,
    name: 'Treasure Hunter of Hermes',
    manaCost: 5,
    attack: 5,
    health: 4,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Destroy your opponent\'s weapon and draw cards equal to its Durability.',
    flavorText: 'Hermes, god of thieves, blesses those who plunder.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy_weapon_draw',
      targetType: 'enemy_hero',
      requiresTarget: false
    }
  },
  {
    id: 32070,
    name: 'Fire-Breather of Olympus',
    manaCost: 7,
    attack: 7,
    health: 4,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: If you\'re holding a Dragon, deal 7 damage to an enemy minion.',
    flavorText: 'The fire-breathers guard the halls of the gods.',
    keywords: ['battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'conditional_damage',
      condition: 'holding_dragon',
      value: 7,
      targetType: 'enemy_minion',
      requiresTarget: true
    }
  },
  {
    id: 32073,
    name: 'Primordial Wyrm',
    manaCost: 8,
    attack: 4,
    health: 8,
    type: 'minion',
    rarity: 'epic',
    description: 'Taunt. Battlecry: Deal 2 damage to all other minions.',
    flavorText: 'Ancient as the cosmos, feared by all who draw near.',
    keywords: ['taunt', 'battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'deal_damage',
      value: 2,
      targetType: 'all_other_minions',
      requiresTarget: false
    }
  }
];

const mythologyLegendaryMinions: CardData[] = [
  {
    id: 32056,
    name: 'Echo of the Undying Son',
    manaCost: 6,
    attack: 4,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Deathrattle: Summon a 4/5 Undying Spirit.',
    flavorText: 'An echo of the one who is destined to survive Ragnarok.',
    keywords: ['deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon',
      summonCardId: 32077
    }
  },
  {
    id: 32057,
    name: 'Nemean Lion',
    manaCost: 6,
    attack: 6,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'Deathrattle: Summon two 2/2 Nemean Cubs.',
    flavorText: 'The legendary beast slain by Heracles, yet its cubs live on.',
    keywords: ['deathrattle'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon_multiple',
      summonCardId: 32078,
      count: 2
    }
  },
  {
    id: 32058,
    name: 'Paladin of Tyr',
    manaCost: 8,
    attack: 6,
    health: 6,
    type: 'minion',
    rarity: 'epic',
    description: 'Divine Shield. Taunt. Deathrattle: Equip a 5/3 Ashbringer of Tyr.',
    flavorText: 'Tyr, the god of war, blesses his champions with divine arms.',
    keywords: ['divine_shield', 'taunt', 'deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'equip_weapon',
      weaponId: 32080
    }
  },
  {
    id: 32059,
    name: 'Jörmungandr, Dragon of Dreams',
    manaCost: 9,
    attack: 4,
    health: 12,
    type: 'minion',
    rarity: 'epic',
    description: 'At the end of your turn, add a Dream Card to your hand.',
    flavorText: 'She dreams of a world without strife, and her dreams become reality.',
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32060,
    name: 'Fafnir the Spell-Weaver',
    manaCost: 9,
    attack: 4,
    health: 12,
    type: 'minion',
    rarity: 'rare',
    description: 'Spell Damage +5',
    flavorText: 'The great dragon Fafnir hoards magical power as others hoard gold.',
    keywords: ['spell_damage'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    spellDamage: 5
  },
  {
    id: 32061,
    name: 'Níðhöggr the Life-Binder',
    manaCost: 9,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'mythic',
    description: 'Battlecry: Set a hero\'s remaining Health to 15.',
    flavorText: 'The Life-Binder restores balance to all living things.',
    keywords: ['battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'set_health',
      value: 15,
      targetType: 'any_hero',
      requiresTarget: true
    }
  },
  {
    id: 32062,
    name: 'World-Ender Wyrm',
    manaCost: 10,
    attack: 12,
    health: 12,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Destroy all other minions and discard your hand.',
    flavorText: 'The dragon who gnaws at Yggdrasil\'s roots shall end all things.',
    keywords: ['battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'destroy_all_and_discard',
      targetType: 'all_other_minions',
      requiresTarget: false
    }
  },
  {
    id: 32063,
    name: 'Time-Wyrm of the Void',
    manaCost: 9,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'Players only have 15 seconds to take their turns.',
    flavorText: 'Time itself bends to the will of this ancient wyrm.',
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32064,
    name: 'Echidna, Mother of Dragons',
    manaCost: 9,
    attack: 8,
    health: 8,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Summon 1/1 Whelps until your side of the battlefield is full.',
    flavorText: 'Mother of monsters in Greek myth, she now nurtures dragon-kind.',
    keywords: ['battlecry'],
    race: 'Dragon',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon_until_full',
      summonCardId: 32079
    }
  }
];

// ============================================
// NORSE/GREEK MYTHOLOGY CARDS
// Iconic cards reimagined with Norse/Greek theming
// ============================================
const mythologyNorseCards: CardData[] = [
  {
    id: 32081,
    name: "Fenrir's Shadowblade",
    manaCost: 3,
    attack: 2,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Combo: Gain +2/+2 for each card played this turn.',
    flavorText: 'The shadow of Fenrir strikes with each passing moment.',
    keywords: ['combo'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32082,
    name: 'Hero Seeker of Midgard',
    manaCost: 3,
    attack: 2,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Whenever you play a card, gain +1/+1.',
    flavorText: 'Seeking glory across all the nine realms.',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32083,
    name: 'Rage-Born Berserker',
    manaCost: 3,
    attack: 2,
    health: 4,
    type: 'minion',
    rarity: 'common',
    description: 'Whenever a minion takes damage, gain +1 Attack.',
    flavorText: 'Pain only fuels the fury of the berserker.',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32084,
    name: 'Einherjar Revenant',
    manaCost: 5,
    attack: 3,
    health: 3,
    type: 'minion',
    rarity: 'rare',
    description: 'Whenever this minion survives damage, summon a copy of it.',
    flavorText: 'The warriors of Valhalla rise again and again.',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32085,
    name: 'Herald of Hel',
    manaCost: 4,
    attack: 1,
    health: 7,
    type: 'minion',
    rarity: 'common',
    description: 'Your minions trigger their Deathrattles twice.',
    flavorText: 'The messenger of the death goddess ensures every soul pays its dues.',
    keywords: ['deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32086,
    name: 'Bard of the Twice-Spoken Word',
    manaCost: 3,
    attack: 2,
    health: 4,
    type: 'minion',
    rarity: 'common',
    description: 'Your Battlecries trigger twice.',
    flavorText: 'The god of poetry speaks, and his words echo through eternity.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32090,
    name: "Surtr's Creation Reborn",
    manaCost: 10,
    attack: 11,
    health: 11,
    type: 'minion',
    rarity: 'epic',
    description: 'A colossal elemental born from the union of flame and storm.',
    flavorText: "Born from the union of flame and storm, Surtr's Creation rises.",
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  {
    id: 32091,
    name: 'Flame-Born of Muspel',
    manaCost: 5,
    attack: 4,
    health: 7,
    type: 'minion',
    rarity: 'epic',
    description: "Deathrattle: If Storm-Born of Thor also died this game, summon Surtr's Creation Reborn.",
    flavorText: 'Forged in the fires of Muspelheim, awaiting its twin.',
    keywords: ['deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon_if_other_died',
      checkCardId: 32092,
      summonCardId: 32090
    }
  },
  {
    id: 32092,
    name: 'Storm-Born of Thor',
    manaCost: 5,
    attack: 7,
    health: 4,
    type: 'minion',
    rarity: 'epic',
    description: "Deathrattle: If Flame-Born of Muspel also died this game, summon Surtr's Creation Reborn.",
    flavorText: 'Blessed by Thor\'s lightning, awaiting its twin.',
    keywords: ['deathrattle'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon_if_other_died',
      checkCardId: 32091,
      summonCardId: 32090
    }
  },
  {
    id: 32093,
    name: 'Puppet Master of Loki',
    manaCost: 4,
    attack: 3,
    health: 4,
    type: 'minion',
    rarity: 'rare',
    description: 'Battlecry: Summon a 1/1 copy of a random minion in your deck.',
    flavorText: 'Loki\'s servant pulls strings that mortals cannot see.',
    keywords: ['battlecry'],
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'summon_copy_from_deck',
      stats: { attack: 1, health: 1 },
      requiresTarget: false
    }
  },
  {
    id: 32095,
    name: "Sindri's Grand Machine",
    manaCost: 8,
    attack: 5,
    health: 7,
    type: 'minion',
    rarity: 'epic',
    description: 'Deathrattle: Summon a random Mythic minion.',
    flavorText: 'The greatest creation of the dwarven smith Sindri.',
    keywords: ['deathrattle'],
    race: 'Automaton',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    deathrattle: {
      type: 'summon_random_mythic',
      requiresTarget: false
    }
  },
  {
    id: 32096,
    name: "Kel'Thuzad the Undying",
    manaCost: 8,
    attack: 6,
    health: 8,
    type: 'minion',
    rarity: 'rare',
    description: 'At the end of each turn, summon all friendly minions that died this turn.',
    flavorText: 'Death is merely an inconvenience for this lich.',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32097,
    name: 'Titan Lord of Helheim',
    manaCost: 9,
    attack: 9,
    health: 7,
    type: 'minion',
    rarity: 'rare',
    description: 'Your other Titans have +2/+2. Your hero is Immune.',
    flavorText: 'Ruler of the Norse underworld, feared by gods and mortals alike.',
    race: 'Titan',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32098,
    name: 'Dread Pirate of Ran',
    manaCost: 4,
    attack: 3,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Taunt. Costs (1) less per Attack of your weapon.',
    flavorText: 'Ran, goddess of the sea, claims all who dare sail her waters.',
    keywords: ['taunt'],
    race: 'Einherjar',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32099,
    name: 'Cannon of Aegir',
    manaCost: 2,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Whenever you summon a Pirate, deal 2 damage to a random enemy.',
    flavorText: 'Aegir\'s artillery thunders across the waves.',
    race: 'Einherjar',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32100,
    name: 'Skidbladnir\'s Stowaway',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Charge. After you play a Pirate, summon this minion from your deck.',
    flavorText: 'I\'m in charrrge now!',
    keywords: ['charge'],
    race: 'Einherjar',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32101,
    name: 'Deckhand of Njord',
    manaCost: 1,
    attack: 2,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'Has Charge while you have a weapon equipped.',
    flavorText: 'Serving the god of seafaring with swift blades.',
    race: 'Einherjar',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32102,
    name: 'Raider of the Blood Sea',
    manaCost: 2,
    attack: 2,
    health: 3,
    type: 'minion',
    rarity: 'common',
    description: 'Battlecry: Gain Attack equal to the Attack of your weapon.',
    flavorText: 'The blood-red seas spawn the fiercest raiders.',
    keywords: ['battlecry'],
    race: 'Einherjar',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'gain_weapon_attack',
      requiresTarget: false
    }
  },
  {
    id: 32103,
    name: 'Tidecaller of Ran',
    manaCost: 1,
    attack: 1,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'Whenever you summon a Naga, gain +1 Attack.',
    flavorText: 'The sea goddess Ran commands the tides and their creatures.',
    race: 'Naga',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32104,
    name: 'Ancient Eye of the Deep',
    manaCost: 4,
    attack: 2,
    health: 4,
    type: 'minion',
    rarity: 'common',
    description: 'Charge. Has +1 Attack for each other Naga on the battlefield.',
    flavorText: 'From the darkest depths, the ancient eye awakens.',
    keywords: ['charge'],
    race: 'Naga',
    class: 'Neutral',
    collectible: true,
    set: 'core'
  },
  {
    id: 32105,
    name: 'Megasaur of Poseidon',
    manaCost: 4,
    attack: 5,
    health: 4,
    type: 'minion',
    rarity: 'epic',
    description: 'Battlecry: Adapt your Nagas.',
    flavorText: 'A gift from the sea god to his smallest servants.',
    keywords: ['battlecry'],
    race: 'Beast',
    class: 'Neutral',
    collectible: true,
    set: 'core',
    battlecry: {
      type: 'adapt_nagas',
      requiresTarget: false
    }
  }
];

// ============================================
// DRAGON MINIONS - Norse/Greek Mythology Themed
// ============================================

// Common Dragon Minions (6 cards)
const commonDragonMinions: CardData[] = [
  {
    id: 33100,
    name: 'Whelp of Nidhogg',
    description: 'A tiny black dragon hatchling with smoldering red eyes.',
    flavorText: 'A tiny spawn of the dragon that gnaws at Yggdrasil\'s roots.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33101,
    name: 'Ember Drake',
    description: 'A crimson-scaled drake trailing wisps of flame from its jaws.',
    flavorText: 'Born from the flames of Muspelheim, it seeks to spread fire across the realms.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 3,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33102,
    name: 'Frost Whelp',
    description: 'Battlecry: Freeze an enemy.',
    flavorText: 'The icy breath of Niflheim courses through its veins.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 1,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'freeze',
      targetType: 'enemy',
      requiresTarget: true
    }
  },
  {
    id: 33103,
    name: 'Bronze Hatchling',
    description: 'A young dragon with gleaming bronze scales and stubby wings.',
    flavorText: 'Forged in the bronze age, when gods walked among mortals.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 4,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33104,
    name: 'Volcanic Drake',
    description: 'Costs (1) less for each minion that died this turn.',
    flavorText: 'Emerging from the volcanic depths beneath Olympus, hungry for battle.',
    type: 'minion',
    rarity: 'common',
    manaCost: 6,
    attack: 6,
    health: 4,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33105,
    name: 'Twilight Whelp',
    description: 'Battlecry: If you\'re holding a Dragon, gain +2 Health.',
    flavorText: 'Born in the twilight between Asgard and Helheim.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 2,
    health: 1,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_buff',
      condition: 'holding_dragon',
      buffAttack: 0,
      buffHealth: 2,
      requiresTarget: false
    }
  }
];

// Rare Dragon Minions (8 cards)
const rareDragonMinions: CardData[] = [
  {
    id: 33106,
    name: 'Blackwing Sentinel',
    description: 'Battlecry: If you\'re holding a Dragon, gain +1/+1.',
    flavorText: 'Guardian of the obsidian peaks where dragons nest.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 3,
    health: 4,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_buff',
      condition: 'holding_dragon',
      buffAttack: 1,
      buffHealth: 1,
      requiresTarget: false
    }
  },
  {
    id: 33107,
    name: 'Corruptor of Tartarus',
    description: 'Battlecry: If you\'re holding a Dragon, deal 3 damage.',
    flavorText: 'From the deepest pit of the underworld, corruption spreads.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 5,
    health: 4,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_damage',
      condition: 'holding_dragon',
      value: 3,
      targetType: 'any',
      requiresTarget: true
    }
  },
  {
    id: 33108,
    name: 'Dragonkin of Apollo',
    description: 'Whenever you target this minion with a spell, gain +1/+1.',
    flavorText: 'Blessed by the sun god, it grows stronger with each divine touch.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 5,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33109,
    name: 'Hungry Wyrm of Jormungandr',
    description: 'Battlecry: Summon a random 1-Cost minion for your opponent.',
    flavorText: 'Its appetite rivals that of the World Serpent itself.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 5,
    health: 6,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'summon_for_opponent',
      summonType: 'random_minion',
      costFilter: 1,
      requiresTarget: false
    }
  },
  {
    id: 33110,
    name: 'Mnemosyne the Chronicler',
    description: 'Battlecry: If you\'re holding a Dragon, Foresee a Dragon.',
    flavorText: 'Keeper of ancient draconic lore from the shadow realm.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 1,
    health: 3,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry', 'discover'],
    collectible: true,
    battlecry: {
      type: 'conditional_discover',
      condition: 'holding_dragon',
      discoverType: 'dragon',
      requiresTarget: false
    }
  },
  {
    id: 33111,
    name: 'Wyrmrest Agent',
    description: 'Battlecry: If you\'re holding a Dragon, gain +1 Attack and Taunt.',
    flavorText: 'Sworn to protect the sacred dragon temples of the north.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 1,
    health: 4,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_buff_and_taunt',
      condition: 'holding_dragon',
      buffAttack: 1,
      buffHealth: 0,
      grantTaunt: true,
      requiresTarget: false
    }
  },
  {
    id: 33112,
    name: 'Drakonid Operative',
    description: 'Battlecry: If you\'re holding a Dragon, Foresee a card from your opponent\'s deck.',
    flavorText: 'A spy among the dragons, learning the secrets of both realms.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 5,
    health: 6,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry', 'discover'],
    collectible: true,
    battlecry: {
      type: 'conditional_discover',
      condition: 'holding_dragon',
      discoverType: 'opponent_deck',
      requiresTarget: false
    }
  },
  {
    id: 33113,
    name: 'Twilight Guardian',
    description: 'Battlecry: If you\'re holding a Dragon, gain +1 Attack and Taunt.',
    flavorText: 'Standing watch at the boundary between light and shadow.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 2,
    health: 6,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_buff_and_taunt',
      condition: 'holding_dragon',
      buffAttack: 1,
      buffHealth: 0,
      grantTaunt: true,
      requiresTarget: false
    }
  }
];

// Epic Dragon Minions (6 cards)
const epicDragonMinions: CardData[] = [
  {
    id: 33114,
    name: 'Scaled Nightmare',
    description: 'At the start of your turn, double this minion\'s Attack.',
    flavorText: 'A terror from the dreams of sleeping gods.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 6,
    attack: 2,
    health: 8,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33115,
    name: 'Book Wyrm of Athena',
    description: 'Battlecry: If you\'re holding a Dragon, destroy an enemy minion with 3 or less Attack.',
    flavorText: 'Wisdom and destruction intertwined, a gift from the goddess of knowledge.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 3,
    health: 6,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_destroy',
      condition: 'holding_dragon',
      targetType: 'enemy_minion',
      attackFilter: 3,
      requiresTarget: true
    }
  },
  {
    id: 33116,
    name: 'Bone Drake of Hel',
    description: 'Deathrattle: Add a random Dragon to your hand.',
    flavorText: 'Risen from the realm of the dead, it carries echoes of its kin.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 6,
    attack: 6,
    health: 5,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'add_random_to_hand',
      cardType: 'dragon'
    }
  },
  {
    id: 33117,
    name: 'Dragonmaw Poacher',
    description: 'Battlecry: If your opponent controls a Dragon, gain +4/+4 and Rush.',
    flavorText: 'Where dragons roam, the poacher follows with nets and spears.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 4,
    health: 4,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_buff_and_rush',
      condition: 'opponent_controls_dragon',
      buffAttack: 4,
      buffHealth: 4,
      grantRush: true,
      requiresTarget: false
    }
  },
  {
    id: 33118,
    name: 'Evasive Wyrm',
    description: 'Divine Shield, Rush. Can\'t be targeted by spells or Hero Powers.',
    flavorText: 'Swift as lightning, impossible to pin down.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 6,
    attack: 5,
    health: 3,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['divine_shield', 'rush', 'elusive'],
    collectible: true
  },
  {
    id: 33119,
    name: 'Evasive Feywing',
    description: 'Can\'t be targeted by spells or Hero Powers.',
    flavorText: 'A creature of the fey realm, dancing between dimensions.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 5,
    health: 4,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['elusive'],
    collectible: true
  }
];

// Mythic Dragon Minions (5 cards)
const legendaryDragonMinions: CardData[] = [
  {
    id: 33120,
    name: 'Niflheim Wyrm, Frost Queen',
    description: 'Battlecry: Summon two 0/1 Frost-Bound Champions.',
    flavorText: 'Queen of the frost wyrms, she brings eternal winter to all who oppose her.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 8,
    attack: 8,
    health: 8,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'summon_multiple',
      summonCardId: 33125,
      count: 2,
      requiresTarget: false
    }
  },
  {
    id: 33121,
    name: 'Chillmaw the Guardian',
    description: 'Taunt. Deathrattle: If you\'re holding a Dragon, deal 3 damage to all minions.',
    flavorText: 'Ancient protector of the frozen peaks, its death cry echoes across the realms.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 7,
    attack: 6,
    health: 6,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt', 'deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'conditional_aoe',
      condition: 'holding_dragon',
      value: 3,
      targetType: 'all_minions'
    }
  },
  {
    id: 33122,
    name: "Níðhöggr's Heir, Prince of Dragons",
    description: 'Taunt. Battlecry: Draw cards until you draw one that isn\'t a Dragon.',
    flavorText: 'Son of the Earth-Warder, seeking to unite all dragonkind.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 4,
    health: 5,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt', 'battlecry'],
    collectible: true,
    battlecry: {
      type: 'draw_until_non_dragon',
      requiresTarget: false
    }
  },
  {
    id: 33123,
    name: 'Temporus, Time Dragon',
    description: 'Battlecry: Your opponent takes two turns. Then you take two turns.',
    flavorText: 'Master of the temporal streams, bending time to its will.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 7,
    attack: 6,
    health: 6,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'extra_turns',
      opponentTurns: 2,
      playerTurns: 2,
      requiresTarget: false
    }
  },
  {
    id: 33124,
    name: 'Mímir, Dragon Lord',
    description: 'Battlecry: If your deck has no duplicates, craft a custom Dragon spell.',
    flavorText: 'Lord of the dragon cabal, his potions are legendary across all realms.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 3,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_craft_spell',
      condition: 'no_duplicates',
      spellType: 'dragon',
      requiresTarget: false
    }
  }
];

// Dragon Token Cards
const dragonTokens: CardData[] = [
  {
    id: 33999,
    name: 'Frost-Bound Champion',
    description: 'Deathrattle: Add a random Mythic minion to your hand.',
    flavorText: 'Frozen in eternal slumber, awaiting the moment of release.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 0,
    health: 1,
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: false,
    deathrattle: {
      type: 'add_random_to_hand',
      cardType: 'mythic'
    }
  }
];

// ============================================
// BEAST MINIONS - Norse/Greek Mythology Themed
// ============================================

// Common Beast Minions (IDs 33125-33131)
const commonBeastMinions: CardData[] = [
  {
    id: 33125,
    name: 'Cub of Fenrir',
    description: 'A small grey wolf cub baring tiny fangs, already fierce.',
    flavorText: 'A young pup of the great wolf Fenrir, already showing signs of its legendary heritage.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33126,
    name: 'Stonetusk Boar of Gullinbursti',
    description: 'Charge',
    flavorText: 'Blessed by Freyr, this golden boar charges into battle without hesitation.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['charge'],
    collectible: true
  },
  {
    id: 33127,
    name: 'Bloodfen Raptor of Midgard',
    description: 'A red-feathered raptor with blood-stained claws stalking the marshes.',
    flavorText: 'These swift predators hunt in the marshlands between the nine realms.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 3,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33128,
    name: 'River Crocolisk of Aegir',
    description: 'An armored reptile with snapping jaws lurking in shallow waters.',
    flavorText: 'Aegir, god of the sea, keeps these beasts in the rivers that flow through the realms.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33129,
    name: 'Ironfur Grizzly of Jotunheim',
    description: 'Taunt',
    flavorText: 'The frost giants raise these bears as guardians of the frozen passes.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 3,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt'],
    collectible: true
  },
  {
    id: 33130,
    name: 'Oasis Snapjaw of the Nile',
    description: 'A massive desert tortoise with a sun-bleached shell and crushing bite.',
    flavorText: 'Sacred to the Egyptian gods, these ancient turtles guard the desert springs.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 2,
    health: 7,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33131,
    name: 'Skogkatt Stalker',
    description: 'Stealth',
    flavorText: 'The forest cats of Freya hunt unseen among Yggdrasil\'s roots.',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 5,
    health: 5,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['stealth'],
    collectible: true
  }
];

// Rare Beast Minions (IDs 33132-33139)
const rareBeastMinions: CardData[] = [
  {
    id: 33132,
    name: 'Scavenging Hyena of Anubis',
    description: 'Whenever a friendly Beast dies, gain +2/+1.',
    flavorText: 'The jackals of Anubis grow strong from the fallen.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33133,
    name: 'Crackling Razormaw',
    description: 'Battlecry: Adapt a friendly Beast.',
    flavorText: 'Its lightning-fast reflexes help others evolve.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 3,
    health: 2,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: false,
    battlecry: {
      type: 'adapt',
      targetType: 'friendly_beast',
      requiresTarget: true
    }
  },
  {
    id: 33134,
    name: 'Vicious Fledgling',
    description: 'After this minion attacks a hero, Adapt.',
    flavorText: 'Each victory brings new power to this fierce creature.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 3,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: false
  },
  {
    id: 33135,
    name: 'Infested Wolf of Hati',
    description: 'Deathrattle: Summon two 1/1 Spiders.',
    flavorText: 'Hati, who chases the moon, leaves behind creatures of darkness.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'summon_multiple',
      summonCardId: 33150,
      count: 2
    }
  },
  {
    id: 33136,
    name: 'Tundra Rhino of Freyr',
    description: 'Your Beasts have Charge.',
    flavorText: 'Freyr\'s sacred beast leads the charge across the frozen plains.',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 2,
    health: 5,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['aura'],
    collectible: true
  },
  {
    id: 33137,
    name: 'Roc of the Thunderlands',
    description: 'Battlecry: If your deck has no 1-Cost cards, deal 5 damage.',
    flavorText: 'The great birds of Zeus carry thunder in their wings.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 4,
    health: 4,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_damage',
      condition: 'no_1_cost_cards_in_deck',
      value: 5,
      targetType: 'any',
      requiresTarget: true
    }
  },
  {
    id: 33138,
    name: 'Cave Hydra of Lerna',
    description: 'Also damages the minions next to whomever this attacks.',
    flavorText: 'For each head you cut, two more grow in its place.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 4,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['cleave'],
    collectible: true
  },
  {
    id: 33139,
    name: 'Witchwood Grizzly',
    description: 'Taunt. Battlecry: Lose 1 Health for each card in your opponent\'s hand.',
    flavorText: 'This ancient bear remembers every slight against it.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 3,
    health: 12,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt', 'battlecry'],
    collectible: true,
    battlecry: {
      type: 'lose_health_per_opponent_cards',
      requiresTarget: false
    }
  }
];

// Epic Beast Minions (IDs 33140-33144)
const epicBeastMinions: CardData[] = [
  {
    id: 33140,
    name: 'Giant Sand Worm of Jormungandr',
    description: 'Whenever this attacks and kills a minion, it may attack again.',
    flavorText: 'A descendant of the World Serpent, dwelling in the desert sands.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 8,
    attack: 8,
    health: 8,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33141,
    name: 'Bittertide Hydra of Lernaean',
    description: 'Whenever this minion takes damage, deal 3 damage to your hero.',
    flavorText: 'The cursed hydra of Lerna spreads its pain to all around it.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 8,
    health: 8,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33142,
    name: 'Dire Frenzy Wolf',
    description: 'Rush. Deathrattle: Shuffle 3 copies of this minion with +3/+3 into your deck.',
    flavorText: 'The pack grows stronger with each fallen brother.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 4,
    attack: 4,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['rush', 'deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'shuffle_copies_buffed',
      count: 3,
      buffAttack: 3,
      buffHealth: 3
    }
  },
  {
    id: 33143,
    name: 'Dispatch Kodo of Midgard',
    description: 'Battlecry: Deal damage equal to this minion\'s Attack.',
    flavorText: 'The war beasts of Midgard strike with thunderous force.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 4,
    attack: 2,
    health: 4,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'damage_equal_to_attack',
      targetType: 'any',
      requiresTarget: true
    }
  },
  {
    id: 33144,
    name: 'Stampeding Cerberus',
    description: 'Rush. Battlecry: Give all Beasts in your hand +2/+2.',
    flavorText: 'The three-headed hound leads the charge from the underworld.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 5,
    attack: 5,
    health: 3,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['rush', 'battlecry'],
    collectible: true,
    battlecry: {
      type: 'buff_beasts_in_hand',
      buffAttack: 2,
      buffHealth: 2,
      requiresTarget: false
    }
  }
];

// Mythic Beast Minions (IDs 33145-33149)
const legendaryBeastMinions: CardData[] = [
  {
    id: 33145,
    name: 'Hanuman the Wild',
    description: 'Battlecry: Give your opponent 2 Bananas.',
    flavorText: 'The great ape king shares his treasures, but always at a price.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 5,
    health: 5,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'give_opponent_cards',
      cardId: 33151,
      count: 2
    }
  },
  {
    id: 33146,
    name: 'The Beast of Tartarus',
    description: "Deathrattle: Summon a 3/3 Sindri's Apprentice for your opponent.",
    flavorText: 'Imprisoned in the depths of Tartarus, its death brings unexpected allies.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 9,
    health: 7,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'summon_for_opponent',
      summonCardId: 33152
    }
  },
  {
    id: 33147,
    name: 'Goldrinn, Great Wolf',
    description: 'Deathrattle: Give your Beasts +5/+5.',
    flavorText: 'The legendary wolf god blesses all creatures with his dying breath.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 8,
    attack: 4,
    health: 4,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'buff_friendly_beasts',
      buffAttack: 5,
      buffHealth: 5
    }
  },
  {
    id: 33148,
    name: 'Mama Bear of Callisto',
    description: 'Whenever you summon a Beast, give it +5/+5.',
    flavorText: 'The celestial bear protects all her children with divine strength.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 8,
    attack: 5,
    health: 5,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33149,
    name: 'Garmr, Hound of Hel',
    description: 'Rush',
    flavorText: 'The ancient hound king returns, unstoppable in his fury.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 9,
    attack: 8,
    health: 8,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['rush'],
    collectible: true
  }
];

// Beast Token Cards
const beastTokens: CardData[] = [
  {
    id: 33150,
    name: 'Spider of Hati',
    description: 'A pale spider spun from moonlight, trailing silk threads of shadow.',
    flavorText: 'Creatures of darkness spawned from the moon-chaser.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: false
  },
  {
    id: 33151,
    name: 'Banana',
    description: 'Give a minion +1/+1.',
    flavorText: 'A gift from the jungle king.',
    type: 'spell',
    rarity: 'common',
    manaCost: 1,
    class: 'Neutral',
    set: 'core',
    collectible: false,
    spellEffect: {
      type: 'buff',
      buffAttack: 1,
      buffHealth: 1,
      targetType: 'any_minion',
      requiresTarget: true
    }
  },
  {
    id: 33152,
    name: "Sindri's Apprentice",
    description: 'A soot-covered young dwarf clutching a glowing hammer.',
    flavorText: 'Freed from the belly of the beast!',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    collectible: false
  }
];

// Token cards for mythology-themed cards
const mythologyTokens: CardData[] = [
  {
    id: 32076,
    name: 'Broken Dwarf-Construct',
    manaCost: 1,
    attack: 2,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'A dented automaton sparking from cracked rune-plates.',
    flavorText: 'Still functional, if a bit dented.',
    race: 'Automaton',
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  {
    id: 32077,
    name: 'Undying Spirit',
    manaCost: 4,
    attack: 4,
    health: 5,
    type: 'minion',
    rarity: 'rare',
    description: 'A spectral warrior that refuses to stay dead.',
    flavorText: 'The undying spirit fights on.',
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  {
    id: 32078,
    name: 'Nemean Cub',
    manaCost: 1,
    attack: 2,
    health: 2,
    type: 'minion',
    rarity: 'common',
    description: 'A young lion cub with impenetrable golden fur.',
    flavorText: 'Small but fierce.',
    race: 'Beast',
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  {
    id: 32079,
    name: 'Whelp of Echidna',
    manaCost: 1,
    attack: 1,
    health: 1,
    type: 'minion',
    rarity: 'common',
    description: 'A tiny serpentine dragon spawn of the Mother of Monsters.',
    flavorText: 'One of many.',
    race: 'Dragon',
    class: 'Neutral',
    collectible: false,
    set: 'core'
  },
  {
    id: 32080,
    name: 'Ashbringer of Tyr',
    manaCost: 5,
    attack: 5,
    durability: 3,
    type: 'weapon',
    rarity: 'epic',
    description: 'A radiant greatsword blessed by Tyr, its blade etched with golden justice runes.',
    flavorText: 'A blade blessed by the god of war and justice.',
    class: 'Neutral',
    collectible: false,
    set: 'core'
  }
];

// ============================================
// COMBO/DRAW ENGINE CARDS (IDs 33200-33224)
// Cards that enable combos through card draw, cost reduction, bounce, and tutoring
// ============================================

// CARD DRAW CARDS
const comboDrawCards: CardData[] = [
  {
    id: 33200,
    name: 'Lorekeeper of Odin',
    description: 'Battlecry: Draw a card for each spell you cast this game (max 3).',
    flavorText: 'The keepers of Odin record every spell whispered across the realms.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 3,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'draw_per_spell_cast',
      maxValue: 3,
      requiresTarget: false
    }
  },
  {
    id: 33201,
    name: 'Chronicler of the Norns',
    description: 'At the end of your turn, draw a card.',
    flavorText: 'The Norns weave the threads of fate, and their chronicler records each strand.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 5,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33202,
    name: 'Messenger of Hermes',
    description: 'Battlecry: Draw a card. If you have 10+ cards in hand, draw 2 instead.',
    flavorText: 'Swift as the wind, carrying wisdom from Olympus.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_draw',
      baseValue: 1,
      condition: 'hand_size_10_plus',
      bonusValue: 2,
      requiresTarget: false
    }
  },
  {
    id: 33203,
    name: 'Scroll Keeper of Alexandria',
    description: 'Battlecry: Both players draw 2 cards.',
    flavorText: 'The great library shares its knowledge with all who seek it.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 2,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'draw_both_players',
      value: 2,
      requiresTarget: false
    }
  },
  {
    id: 33204,
    name: 'Deep Seer of Mimir',
    description: 'Battlecry: Draw cards until you have 5 in your hand.',
    flavorText: "Mimir's well grants visions to those who sacrifice for knowledge.",
    type: 'minion',
    rarity: 'epic',
    manaCost: 5,
    attack: 4,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'draw_until_hand_size',
      targetHandSize: 5,
      requiresTarget: false
    }
  },
  {
    id: 33205,
    name: 'Raven of Huginn',
    description: 'Deathrattle: Draw a card.',
    flavorText: 'Huginn, thought given form, flies across Midgard gathering wisdom.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'draw',
      value: 1
    }
  },
  {
    id: 33206,
    name: 'Raven of Muninn',
    description: 'Battlecry: Add a copy of a random card in your hand to your hand.',
    flavorText: 'Muninn, memory given wings, remembers all that was spoken.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'copy_random_card_in_hand',
      requiresTarget: false
    }
  },
  {
    id: 33207,
    name: 'Wisdom Seeker',
    description: 'Whenever you cast a spell, draw a card.',
    flavorText: 'Every incantation reveals another secret of the universe.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 1,
    health: 2,
    class: 'Neutral',
    set: 'core',
    collectible: true
  }
];

// COST REDUCTION CARDS
const comboCostReductionCards: CardData[] = [
  {
    id: 33208,
    name: "Midas' Apprentice",
    description: 'At the end of your turn, reduce the Cost of cards in your hand by (1).',
    flavorText: 'Trained in the dark forges beneath the mountains.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 4,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33209,
    name: 'Runecarver of Nidavellir',
    description: 'Your spells cost (2) less.',
    flavorText: 'The dwarven runes channel ancient power through mortal hands.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 4,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['aura'],
    collectible: true
  },
  {
    id: 33210,
    name: 'Timeweaver of Chronos',
    description: 'Battlecry: Your next spell this turn costs (3) less.',
    flavorText: 'Time bends for those who serve the Titan of time.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 2,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'reduce_next_spell_cost',
      value: 3,
      requiresTarget: false
    }
  },
  {
    id: 33211,
    name: 'Discount Djinn',
    description: 'Battlecry: Set the Cost of a random card in your hand to (1).',
    flavorText: 'Three wishes? How about one really good deal?',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 4,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'set_random_card_cost',
      value: 1,
      requiresTarget: false
    }
  },
  {
    id: 33212,
    name: 'Mana Thief of Loki',
    description: "Battlecry: Your opponent's cards cost (1) more next turn.",
    flavorText: 'Trickery and theft are the tools of the god of mischief.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'increase_opponent_costs',
      value: 1,
      duration: 'next_turn',
      requiresTarget: false
    }
  },
  {
    id: 33213,
    name: 'Essence Channeler',
    description: 'Your Hero Power costs (1) less.',
    flavorText: 'Drawing power from the essence of the cosmos.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    set: 'core',
    keywords: ['aura'],
    collectible: true
  },
  {
    id: 33214,
    name: 'Arcane Giant of Olympus',
    description: "Costs (1) less for each spell you've cast this game.",
    flavorText: 'The giants of Olympus remember every spell ever cast in their presence.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 12,
    attack: 8,
    health: 8,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33215,
    name: 'Clockwork Giant',
    description: "Costs (1) less for each card in your opponent's hand.",
    flavorText: 'Built by Hephaestus to count the secrets of mortals.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 12,
    attack: 8,
    health: 8,
    race: 'Automaton',
    class: 'Neutral',
    set: 'core',
    collectible: true
  }
];

// BOUNCE/COPY CARDS
const comboBounceCards: CardData[] = [
  {
    id: 33216,
    name: 'Echo of Narcissus',
    description: 'Battlecry: Return a friendly minion to your hand.',
    flavorText: 'Even in death, Narcissus could not stop admiring reflections.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 1,
    health: 1,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'return',
      targetType: 'friendly_minion',
      requiresTarget: true
    }
  },
  {
    id: 33217,
    name: 'Mirror Spirit of Athena',
    description: 'Battlecry: Add a copy of a minion to your hand.',
    flavorText: "Athena's shield reflects not just images, but souls.",
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'copy_minion_to_hand',
      targetType: 'any_minion',
      requiresTarget: true
    }
  },
  {
    id: 33218,
    name: 'Shadowstep Dancer',
    description: 'Combo: Return a friendly minion to your hand. It costs (2) less.',
    flavorText: 'Dancing between shadows and reality.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 2,
    class: 'Neutral',
    set: 'core',
    keywords: ['combo'],
    collectible: true,
    combo: {
      type: 'return_with_discount',
      targetType: 'friendly_minion',
      costReduction: 2,
      requiresTarget: true
    }
  },
  {
    id: 33219,
    name: 'Spirit of Reflection',
    description: 'At the start of your turn, add a 1/1 copy of a random friendly minion to your hand.',
    flavorText: 'The spirit world mirrors the living, though dimly.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 2,
    health: 6,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33220,
    name: 'Doppelganger of Proteus',
    description: 'Battlecry: Summon a copy of a friendly minion.',
    flavorText: 'Proteus, the old man of the sea, takes many forms.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 5,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'summon_copy',
      targetType: 'friendly_minion',
      requiresTarget: true
    }
  }
];

// TUTOR CARDS
const comboTutorCards: CardData[] = [
  {
    id: 33221,
    name: 'Curator of the Menagerie',
    description: 'Taunt. Battlecry: Draw a Beast, a Dragon, and a Naga from your deck.',
    flavorText: 'The divine menagerie holds creatures from every realm.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 7,
    attack: 4,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt', 'battlecry'],
    collectible: true,
    battlecry: {
      type: 'draw_tribes',
      tribes: ['Beast', 'Dragon', 'Naga'],
      requiresTarget: false
    }
  },
  {
    id: 33222,
    name: 'Witchwood Piper',
    description: 'Battlecry: Draw the lowest-Cost minion from your deck.',
    flavorText: 'The haunted pipes call forth the smallest of creatures.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'draw_lowest_cost_minion',
      requiresTarget: false
    }
  },
  {
    id: 33223,
    name: 'Sandbinder of the Dunes',
    description: 'Battlecry: Draw an Elemental from your deck.',
    flavorText: 'The desert spirits answer the call of the sandbinder.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 2,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'draw_tribe',
      tribe: 'Elemental',
      requiresTarget: false
    }
  },
  {
    id: 33224,
    name: 'Minstrel of Valhalla',
    description: 'Combo: Draw 2 minions from your deck.',
    flavorText: 'The songs of Valhalla call warriors from the depths of memory.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['combo'],
    collectible: true,
    combo: {
      type: 'draw_minions',
      value: 2,
      requiresTarget: false
    }
  }
];

// ============================================
// CONTROL/REMOVAL NEUTRAL CARDS
// ============================================
const controlRemovalCards: CardData[] = [
  // HARD REMOVAL (8 cards)
  {
    id: 33225,
    name: 'Executioner of Hades',
    description: 'Battlecry: Destroy a minion with 5 or more Attack.',
    flavorText: 'In the underworld, the mighty are the first to fall.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 4,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'destroy',
      targetType: 'minion',
      condition: 'attack_5_or_more',
      requiresTarget: true
    }
  },
  {
    id: 33226,
    name: 'Assassin of the Moirai',
    description: 'Battlecry: Destroy a random enemy minion.',
    flavorText: 'The Fates decree who lives and who dies—through their chosen blade.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 6,
    attack: 4,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'destroy',
      targetType: 'random_enemy_minion',
      requiresTarget: false
    }
  },
  {
    id: 33227,
    name: 'Banisher of Tartarus',
    description: 'Battlecry: Destroy a minion and shuffle it into your opponent\'s deck.',
    flavorText: 'Even death is not the end—only a delay before the next torment.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 7,
    attack: 5,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'destroy_and_shuffle',
      targetType: 'minion',
      shuffleTarget: 'opponent_deck',
      requiresTarget: true
    }
  },
  {
    id: 33228,
    name: 'Petrifying Gaze of Medusa',
    description: 'Transform a minion into a 1/1 Stone Snake.',
    flavorText: 'One glance at her terrible visage turns flesh to stone.',
    type: 'spell',
    rarity: 'common',
    manaCost: 3,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'transform',
      targetType: 'minion',
      transformInto: 33250,
      requiresTarget: true
    }
  },
  {
    id: 33229,
    name: 'Wrath of the Titans',
    description: 'Destroy all minions.',
    flavorText: 'When the Titans rage, all of creation trembles.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 8,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'destroy_all',
      targetType: 'all_minions',
      requiresTarget: false
    }
  },
  {
    id: 33230,
    name: 'Doomblade of Ares',
    description: 'After your hero attacks a minion, destroy it.',
    flavorText: 'The war god\'s blade knows only death.',
    type: 'weapon',
    rarity: 'rare',
    manaCost: 5,
    attack: 3,
    durability: 3,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33231,
    name: 'Soul Collector of Hel',
    description: 'Battlecry: Destroy a minion with Deathrattle.',
    flavorText: 'Hel\'s collectors ensure no soul escapes twice.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'destroy',
      targetType: 'minion',
      condition: 'has_deathrattle',
      requiresTarget: true
    }
  },
  {
    id: 33232,
    name: 'Plague of Locusts',
    description: 'Transform all minions into 1/1 Locusts.',
    flavorText: 'The swarm consumes all—leaving only hunger in its wake.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 5,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'transform_all',
      targetType: 'all_minions',
      transformInto: 33251,
      requiresTarget: false
    }
  },
  // SILENCE/DISRUPTION (8 cards)
  {
    id: 33233,
    name: 'Silencer of Ginnungagap',
    description: 'Battlecry: Silence all enemy minions.',
    flavorText: 'In Ginnungagap, the primordial void between Muspelheim and Niflheim, no voice can be heard.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 4,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'silence',
      targetType: 'all_enemy_minions',
      requiresTarget: false
    }
  },
  {
    id: 33234,
    name: 'Rune Breaker',
    description: 'Battlecry: Silence an enemy minion.',
    flavorText: 'Ancient runes shatter beneath their hammer.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'silence',
      targetType: 'enemy_minion',
      requiresTarget: true
    }
  },
  {
    id: 33235,
    name: 'Mindbreaker of Prometheus',
    description: 'Hero Powers are disabled.',
    flavorText: 'Prometheus stole fire from the gods—this one steals their power.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 5,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33236,
    name: 'Saboteur of Loki',
    description: 'Battlecry: Your opponent\'s Hero Power costs (5) more next turn.',
    flavorText: 'Loki\'s tricksters find joy in disruption.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 4,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'increase_hero_power_cost',
      value: 5,
      duration: 'next_turn',
      targetType: 'opponent',
      requiresTarget: false
    }
  },
  {
    id: 33237,
    name: 'Nerub\'ar Weblord',
    description: 'Minions with Battlecry cost (2) more.',
    flavorText: 'The spider-lords spin webs that trap both body and spell.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 1,
    health: 4,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33238,
    name: 'Mana Leech of Niflheim',
    description: 'ALL minions cost (1) more.',
    flavorText: 'The frozen realm drains magic from all who enter.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33239,
    name: 'Dirty Rat of Midgard',
    description: 'Taunt. Battlecry: Your opponent summons a random minion from their hand.',
    flavorText: 'The vermin of Midgard drag secrets into the light.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 2,
    attack: 2,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt', 'battlecry'],
    collectible: true,
    battlecry: {
      type: 'summon_from_opponent_hand',
      targetType: 'random_minion',
      requiresTarget: false
    }
  },
  {
    id: 33240,
    name: 'Unseen Saboteur',
    description: 'Battlecry: Your opponent casts a random spell from their hand (targets chosen randomly).',
    flavorText: 'The best sabotage is when the enemy defeats themselves.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 5,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'cast_opponent_spell',
      targetType: 'random',
      requiresTarget: false
    }
  },
  // BOARD CONTROL (9 cards)
  {
    id: 33241,
    name: 'Dread Infernal of Surtr',
    description: 'Battlecry: Deal 1 damage to ALL other characters.',
    flavorText: 'Surtr\'s titans herald the flames of Ragnarok.',
    type: 'minion',
    rarity: 'common',
    manaCost: 6,
    attack: 6,
    health: 6,
    race: 'Titan',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'deal_damage',
      value: 1,
      targetType: 'all_other_characters',
      requiresTarget: false
    }
  },
  {
    id: 33242,
    name: 'Abyssal Enforcer',
    description: 'Battlecry: Deal 3 damage to ALL other characters.',
    flavorText: 'The enforcers of the abyss bring destruction wherever they tread.',
    type: 'minion',
    rarity: 'common',
    manaCost: 7,
    attack: 6,
    health: 6,
    race: 'Titan',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'deal_damage',
      value: 3,
      targetType: 'all_other_characters',
      requiresTarget: false
    }
  },
  {
    id: 33243,
    name: 'Brawler of Valhalla',
    description: 'Battlecry: Destroy all other minions. One survives (chosen randomly).',
    flavorText: 'In Valhalla, only the strongest remain standing.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 5,
    attack: 4,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'brawl',
      targetType: 'all_other_minions',
      survivorCount: 1,
      requiresTarget: false
    }
  },
  {
    id: 33244,
    name: 'Wild Pyromancer of Muspel',
    description: 'After you cast a spell, deal 1 damage to ALL minions.',
    flavorText: 'The flames of Muspelheim respond to every incantation.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 3,
    health: 2,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33245,
    name: 'Mossy Horror of the Swamp',
    description: 'Battlecry: Destroy all other minions with 2 or less Attack.',
    flavorText: 'The bog swallows the weak without mercy.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 2,
    health: 7,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'destroy',
      targetType: 'all_other_minions',
      condition: 'attack_2_or_less',
      requiresTarget: false
    }
  },
  {
    id: 33246,
    name: 'Unbound Fire Titan',
    description: 'At the end of your turn, deal 2 damage to ALL other characters.',
    flavorText: 'The fire baron\'s fury knows no friend or foe.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 7,
    attack: 7,
    health: 5,
    race: 'Elemental',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33247,
    name: 'Doomsayer\'s Prophet',
    description: 'At the start of your turn, destroy ALL minions.',
    flavorText: 'The end is coming—and it arrives with every dawn.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 0,
    health: 7,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    startOfTurn: { type: "destroy_all_minions" }
  },
  {
    id: 33248,
    name: 'Hellfire Elemental',
    description: 'Battlecry: Deal 3 damage to ALL characters.',
    flavorText: 'Born from the fires of Muspelheim, it burns all equally.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 5,
    race: 'Elemental',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'deal_damage',
      value: 3,
      targetType: 'all_characters',
      requiresTarget: false
    }
  },
  {
    id: 33249,
    name: 'Vanquisher of Giants',
    description: 'Battlecry: Deal damage to an enemy minion equal to its Attack.',
    flavorText: 'The bigger they are, the harder they fall.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 6,
    attack: 4,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'deal_damage_equal_to_attack',
      targetType: 'enemy_minion',
      requiresTarget: true
    }
  },
  // TOKEN CARDS for transform effects
  {
    id: 33300,
    name: 'Stone Snake',
    description: 'A petrified serpent of grey rock, coiled and eerily still.',
    flavorText: 'Once a warrior, now cold stone.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: false
  },
  {
    id: 33301,
    name: 'Locust',
    description: 'A chitinous insect with translucent wings buzzing in a swarm.',
    flavorText: 'One of countless.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    collectible: false
  }
];

// ============================================
// CHEAT/RECRUIT/RAMP NEUTRAL CARDS
// Cards that cheat mana, recruit from deck, and enable big plays
// ============================================
const cheatRecruitRampCards: CardData[] = [
  // RECRUIT FROM DECK (10 cards)
  {
    id: 33250,
    name: 'Oaken Summons of Yggdrasil',
    description: 'Gain 6 Armor. Recruit a minion that costs (4) or less.',
    flavorText: 'The World Tree calls forth its defenders from the deck of fate.',
    type: 'spell',
    rarity: 'common',
    manaCost: 4,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'gain_armor_and_recruit',
      armorValue: 6,
      recruitCondition: 'cost_4_or_less',
      requiresTarget: false
    }
  },
  {
    id: 33251,
    name: 'Rally of the Einherjar',
    description: 'Recruit a minion.',
    flavorText: 'The warriors of Valhalla answer the call to battle.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 6,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'recruit',
      requiresTarget: false
    }
  },
  {
    id: 33252,
    name: 'Kathrena Winterwisp',
    description: 'Battlecry and Deathrattle: Recruit a Beast.',
    flavorText: 'She whispers to the beasts of the frozen north, and they heed her call.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 8,
    attack: 6,
    health: 6,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry', 'deathrattle'],
    collectible: true,
    battlecry: {
      type: 'recruit',
      recruitCondition: 'beast',
      requiresTarget: false
    },
    deathrattle: {
      type: 'recruit',
      recruitCondition: 'beast'
    }
  },
  {
    id: 33253,
    name: 'Woecleaver of Hel',
    description: 'After your hero attacks, Recruit a minion.',
    flavorText: 'Forged in Helheim, it cleaves through fate itself to summon warriors.',
    type: 'weapon',
    rarity: 'rare',
    manaCost: 8,
    attack: 3,
    durability: 3,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33254,
    name: 'Guild Recruiter of Asgard',
    description: 'Battlecry: Recruit a minion that costs (4) or less.',
    flavorText: 'The guilds of Asgard seek worthy champions for the coming battles.',
    type: 'minion',
    rarity: 'common',
    manaCost: 5,
    attack: 2,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'recruit',
      recruitCondition: 'cost_4_or_less',
      requiresTarget: false
    }
  },
  {
    id: 33255,
    name: 'Shadow Thrall of Hel',
    description: 'Deathrattle: Recruit a Titan.',
    flavorText: 'Bound to dark spirits, his death releases something far worse.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 2,
    health: 2,
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'recruit',
      recruitCondition: 'titan'
    }
  },
  {
    id: 33256,
    name: 'Silvered Guardian of Asgard',
    description: 'Deathrattle: Recruit an 8-Cost minion.',
    flavorText: 'The silver knights fall so that titans may rise.',
    type: 'minion',
    rarity: 'common',
    manaCost: 7,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'recruit',
      recruitCondition: 'cost_8'
    }
  },
  {
    id: 33257,
    name: 'Meat Wagon of Helheim',
    description: 'Deathrattle: Recruit a minion with less Attack than this minion.',
    flavorText: 'The wagons of Helheim carry more than just the dead.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 4,
    attack: 1,
    health: 4,
    race: 'Automaton',
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'recruit',
      recruitCondition: 'less_attack_than_self'
    }
  },
  {
    id: 33258,
    name: 'Oondasta the Great Beast',
    description: 'Rush. Overkill: Recruit a Beast.',
    flavorText: 'The primordial beast crushes its prey and summons more hunters.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 9,
    attack: 7,
    health: 7,
    race: 'Beast',
    class: 'Neutral',
    set: 'core',
    keywords: ['rush', 'overkill'],
    collectible: true
  },
  {
    id: 33259,
    name: "Skull of the Man'ari",
    description: 'At the start of your turn, Recruit a Titan.',
    flavorText: 'The skull whispers names of titans imprisoned in the deck.',
    type: 'weapon',
    rarity: 'rare',
    manaCost: 5,
    attack: 0,
    durability: 3,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  // MANA CHEAT (8 cards)
  {
    id: 33260,
    name: 'Innervate Spirit',
    description: 'Gain 1 Mana Crystal this turn only.',
    flavorText: 'A fleeting gift from the spirits of the forest.',
    type: 'spell',
    rarity: 'common',
    manaCost: 0,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'gain_temporary_mana',
      value: 1,
      requiresTarget: false
    }
  },
  {
    id: 33261,
    name: 'Lightning Bloom of Thor',
    description: 'Gain 2 Mana Crystals this turn only. Overload: (2)',
    flavorText: 'Thor grants power freely, but the storm always collects its due.',
    type: 'spell',
    rarity: 'common',
    manaCost: 0,
    class: 'Neutral',
    set: 'core',
    keywords: ['overload'],
    collectible: true,
    overload: { amount: 2 },
    spellEffect: {
      type: 'gain_temporary_mana',
      value: 2,
      requiresTarget: false
    }
  },
  {
    id: 33262,
    name: 'Bright-Eyed Scout',
    description: 'Battlecry: Draw a card. Change its Cost to (5).',
    flavorText: 'Her keen eyes see treasures others miss, at a fair price.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 3,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'draw_and_set_cost',
      drawCount: 1,
      setCost: 5,
      requiresTarget: false
    }
  },
  {
    id: 33263,
    name: 'Far Sight Shaman',
    description: 'Draw a card. It costs (3) less.',
    flavorText: 'The shamans of the Norns glimpse cards yet to come.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 3,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'draw_and_reduce_cost',
      drawCount: 1,
      costReduction: 3,
      requiresTarget: false
    }
  },
  {
    id: 33264,
    name: 'Preparation of Loki',
    description: 'The next spell you cast this turn costs (2) less.',
    flavorText: 'Loki teaches that trickery requires preparation.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 0,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'reduce_next_spell_cost',
      costReduction: 2,
      requiresTarget: false
    }
  },
  {
    id: 33265,
    name: 'Naga Sea Witch',
    description: 'Your cards cost (5).',
    flavorText: 'She bargains with the deep to equalize all things.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 5,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['aura'],
    collectible: true
  },
  {
    id: 33266,
    name: 'Feathered Sovereign of the Skies',
    description: 'Your minions cost (1).',
    flavorText: 'The winged goddess lifts the burden of mana from her faithful.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 10,
    attack: 5,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['aura'],
    collectible: true
  },
  {
    id: 33267,
    name: 'Forgotten Time-Walker',
    description: 'Choose One - Gain 10 Armor; or Refresh your Mana Crystals.',
    flavorText: 'Forgotten by the realms, but his power endures through the ages.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 10,
    attack: 7,
    health: 7,
    class: 'Neutral',
    set: 'core',
    keywords: ['choose_one'],
    collectible: true
  },
  // SUMMON FROM HAND (7 cards)
  {
    id: 33268,
    name: 'Eureka of Archimedes',
    description: 'Summon a copy of a random minion from your hand.',
    flavorText: 'The genius of Archimedes manifests your thoughts into reality.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 6,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'summon_copy_from_hand',
      targetType: 'random_minion_in_hand',
      requiresTarget: false
    }
  },
  {
    id: 33269,
    name: 'Voidcaller of Helheim',
    description: 'Deathrattle: Put a random Titan from your hand into the battlefield.',
    flavorText: 'In death, the caller opens the gate for darker things.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 4,
    race: 'Titan',
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'summon_from_hand',
      summonCondition: 'titan'
    }
  },
  {
    id: 33270,
    name: "Ancestor's Call",
    description: 'Put a random minion from each player\'s hand into the battlefield.',
    flavorText: 'The ancestors demand warriors join the fray.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 4,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'summon_from_both_hands',
      requiresTarget: false
    }
  },
  {
    id: 33271,
    name: 'Free from Amber',
    description: 'Foresee a minion that costs (8) or more. Summon it.',
    flavorText: 'Preserved in the amber of Yggdrasil, ancient titans await release.',
    type: 'spell',
    rarity: 'rare',
    manaCost: 8,
    class: 'Neutral',
    set: 'core',
    keywords: ['discover'],
    collectible: true,
    spellEffect: {
      type: 'discover_and_summon',
      discoverCondition: 'cost_8_or_more',
      requiresTarget: false
    }
  },
  {
    id: 33272,
    name: 'Splitting Festeroot',
    description: 'Deathrattle: Summon two 2/2 Festeroot Spawns with the same Deathrattle.',
    flavorText: 'From the rotting roots of Yggdrasil, new terrors sprout.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 8,
    attack: 4,
    health: 4,
    race: 'Treant',
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'summon_splitting',
      summonCardId: 33400,
      count: 2
    }
  },
  {
    id: 33273,
    name: 'Ixlid, Fungal Lord',
    description: 'After you play a minion, summon a copy of it.',
    flavorText: 'The fungal lord spreads his spores across the battlefield.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 2,
    health: 4,
    race: 'Elemental',
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33274,
    name: 'Dollmaster Dorian',
    description: 'Whenever you draw a minion, summon a 1/1 copy of it.',
    flavorText: 'His dolls are more than mere toys—they are echoes of fate.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 2,
    health: 6,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  // Token for Splitting Festeroot
  {
    id: 33400,
    name: 'Festeroot Spawn',
    description: 'Deathrattle: Summon two 2/2 Festeroot Spawns.',
    flavorText: 'The cycle of rot continues.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    race: 'Treant',
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: false,
    deathrattle: {
      type: 'summon_splitting',
      summonCardId: 33400,
      count: 2
    }
  }
];

// ============================================
// SYNERGY PACKAGE CARDS (IDs 33275-33299)
// Powerful synergy enablers - deathrattle, handbuff, spell damage, tokens
// ============================================
const synergyPackageCards: CardData[] = [
  // === DEATHRATTLE SYNERGY (8 cards) ===
  {
    id: 33275,
    name: 'Spiritsinger Umbra',
    description: 'After you summon a minion with Deathrattle, trigger it.',
    flavorText: 'She sings the songs that call spirits from beyond the veil of Helheim.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 4,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33276,
    name: 'Necromechanic of Sindri',
    description: 'Battlecry: Your Deathrattles trigger twice this turn.',
    flavorText: 'The dwarven masters of Sindri learned to harvest death itself.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 3,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'deathrattle_double',
      duration: 'this_turn',
      requiresTarget: false
    }
  },
  {
    id: 33277,
    name: "Hyrrokkin's First Mate",
    description: 'Battlecry: Equip a 1/3 Rusty Hook.',
    flavorText: 'Even the giantess who launched the dead needs crew for her dark voyages.',
    type: 'minion',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    health: 1,
    race: 'Einherjar',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'equip_weapon',
      weaponId: 33401,
      requiresTarget: false
    }
  },
  {
    id: 33278,
    name: 'Corpse Bride of Hel',
    description: 'Battlecry: Trigger a friendly Deathrattle.',
    flavorText: 'She dances with the dead in the halls of Helheim.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 4,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'trigger_deathrattle',
      targetType: 'friendly_minion',
      requiresTarget: true
    }
  },
  {
    id: 33279,
    name: 'Roll the Bones',
    description: 'Draw a card. If it has Deathrattle, cast this again.',
    flavorText: 'The Norns cast bones to glimpse the threads of fate.',
    type: 'spell',
    rarity: 'common',
    manaCost: 2,
    class: 'Neutral',
    set: 'core',
    collectible: true,
    spellEffect: {
      type: 'draw_and_repeat',
      condition: 'has_deathrattle',
      requiresTarget: false
    }
  },
  {
    id: 33280,
    name: 'Corpse Raiser',
    description: 'Battlecry: Give a minion "Deathrattle: Resummon this minion."',
    flavorText: 'In the realm of Hel, death is merely a brief inconvenience.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 3,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'grant_deathrattle',
      grantedDeathrattle: 'resummon_self',
      targetType: 'friendly_minion',
      requiresTarget: true
    }
  },
  {
    id: 33281,
    name: 'Reborn Spirit',
    description: 'Reborn. Deathrattle: Give adjacent minions Reborn.',
    flavorText: 'The spirits of Valhalla share their gift of eternal return.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 3,
    attack: 2,
    health: 3,
    class: 'Neutral',
    set: 'core',
    keywords: ['reborn', 'deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'grant_keyword',
      keyword: 'reborn',
      targetType: 'adjacent_minions'
    }
  },
  {
    id: 33282,
    name: 'Grave Horror',
    description: 'Taunt. Costs (1) less for each spell you\'ve cast this game.',
    flavorText: 'From the graveyards of Midgard, horrors rise when magic flows.',
    type: 'minion',
    rarity: 'common',
    manaCost: 12,
    attack: 7,
    health: 8,
    class: 'Neutral',
    set: 'core',
    keywords: ['taunt'],
    collectible: true,
    costReduction: {
      type: 'per_spell_cast',
      value: 1
    }
  },

  // === HANDBUFF/HAND SYNERGY (8 cards) ===
  {
    id: 33283,
    name: "Dragonslayer Kingpin",
    description: 'Battlecry: Give a random minion in your hand +5/+5.',
    flavorText: 'The crime lords of the nine realms share their power generously.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 7,
    attack: 5,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'buff_hand',
      targetType: 'random_minion_in_hand',
      buffAttack: 5,
      buffHealth: 5,
      requiresTarget: false
    }
  },
  {
    id: 33284,
    name: 'Grimestreet Smuggler',
    description: 'Battlecry: Give a random minion in your hand +1/+1.',
    flavorText: 'Smuggling goods through the shadowy streets of Svartalfheim.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 2,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'buff_hand',
      targetType: 'random_minion_in_hand',
      buffAttack: 1,
      buffHealth: 1,
      requiresTarget: false
    }
  },
  {
    id: 33285,
    name: "Keleseth's Apprentice",
    description: 'Battlecry: If your deck has no 2-Cost cards, give all minions in your deck +1/+1.',
    flavorText: 'He learned from the vampire prince the art of deck manipulation.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'conditional_buff_deck',
      condition: 'no_2_cost_in_deck',
      buffAttack: 1,
      buffHealth: 1,
      requiresTarget: false
    }
  },
  {
    id: 33286,
    name: 'Arena Treasure Chest',
    description: 'Deathrattle: Draw 2 cards.',
    flavorText: 'The treasures of Olympus await those who can break the seal.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 0,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'draw',
      value: 2
    }
  },
  {
    id: 33287,
    name: 'Stone Giant of Jotunheim',
    description: 'Costs (1) less for each other card in your hand.',
    flavorText: 'The ancient stone giants of Jotunheim grow stronger with knowledge.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 12,
    attack: 8,
    health: 8,
    race: 'Giant',
    class: 'Neutral',
    set: 'core',
    collectible: true,
    costReduction: {
      type: 'per_card_in_hand',
      value: 1
    }
  },
  {
    id: 33288,
    name: 'Twilight Drake of Dusk',
    description: 'Battlecry: Gain +1 Health for each card in your hand.',
    flavorText: 'The twilight dragons draw power from the knowledge they hoard.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 4,
    attack: 4,
    health: 1,
    race: 'Dragon',
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'buff_per_card_in_hand',
      buffHealth: 1,
      requiresTarget: false
    }
  },
  {
    id: 33289,
    name: 'Bolvar, Fireblood',
    description: 'Divine Shield. After a friendly minion loses Divine Shield, gain +2 Attack.',
    flavorText: 'Forged in the flames of Muspelheim, his fury is eternal.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 5,
    attack: 1,
    health: 7,
    class: 'Neutral',
    set: 'core',
    keywords: ['divine_shield'],
    collectible: true
  },
  {
    id: 33290,
    name: "Val'anyr of the Forge",
    description: 'Deathrattle: Give a random minion in your hand +4/+2. When it dies, reequip this.',
    flavorText: 'The legendary hammer of the Aesir forges pass on their blessing.',
    type: 'weapon',
    rarity: 'epic',
    manaCost: 6,
    attack: 4,
    durability: 2,
    class: 'Neutral',
    set: 'core',
    keywords: ['deathrattle'],
    collectible: true,
    deathrattle: {
      type: 'buff_and_enchant',
      targetType: 'random_minion_in_hand',
      buffAttack: 4,
      buffHealth: 2,
      enchantType: 'reequip_on_death',
      reequipWeaponId: 33290
    }
  },

  // === SPELL DAMAGE SYNERGY (5 cards) ===
  {
    id: 33291,
    name: 'Archmage of Asgard',
    description: 'Spell Damage +2',
    flavorText: 'The archmages of Asgard channel the power of the cosmos.',
    type: 'minion',
    rarity: 'common',
    manaCost: 6,
    attack: 4,
    health: 7,
    class: 'Neutral',
    set: 'core',
    keywords: ['spell_damage'],
    spellDamage: 2,
    collectible: true
  },
  {
    id: 33292,
    name: 'Thalnos the Younger',
    description: 'Spell Damage +1. Deathrattle: Draw a card.',
    flavorText: 'The apprentice of the legendary bloodmage seeks his own path.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 2,
    attack: 1,
    health: 1,
    class: 'Neutral',
    set: 'core',
    keywords: ['spell_damage', 'deathrattle'],
    spellDamage: 1,
    collectible: true,
    deathrattle: {
      type: 'draw',
      value: 1
    }
  },
  {
    id: 33293,
    name: 'Alfheim Mage',
    description: 'Spell Damage +1',
    flavorText: 'Trained in the arcane arts of distant lands, now serving the Norse gods.',
    type: 'minion',
    rarity: 'common',
    manaCost: 3,
    attack: 1,
    health: 4,
    class: 'Neutral',
    set: 'core',
    keywords: ['spell_damage'],
    spellDamage: 1,
    collectible: true
  },
  {
    id: 33294,
    name: 'Spellweaver of Olympus',
    description: 'Spell Damage +2',
    flavorText: 'The mages of Mount Olympus weave spells that shake the heavens.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 2,
    health: 5,
    class: 'Neutral',
    set: 'core',
    keywords: ['spell_damage'],
    spellDamage: 2,
    collectible: true
  },
  {
    id: 33295,
    name: 'Cosmic Anomaly',
    description: 'Spell Damage +2',
    flavorText: 'A tear in reality where the magic of all realms converges.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 4,
    health: 3,
    race: 'Elemental',
    class: 'Neutral',
    set: 'core',
    keywords: ['spell_damage'],
    spellDamage: 2,
    collectible: true
  },

  // === TOKEN SYNERGY (4 cards) ===
  {
    id: 33296,
    name: 'Knife Juggler of Loki',
    description: 'After you summon a minion, deal 1 damage to a random enemy.',
    flavorText: 'Trained by the trickster god, his blades never miss their mark.',
    type: 'minion',
    rarity: 'common',
    manaCost: 2,
    attack: 2,
    health: 2,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33297,
    name: 'Sea Giant of Poseidon',
    description: 'Costs (1) less for each other minion on the battlefield.',
    flavorText: 'From the depths of the Aegean, Poseidon\'s giants arise.',
    type: 'minion',
    rarity: 'rare',
    manaCost: 10,
    attack: 8,
    health: 8,
    race: 'Giant',
    class: 'Neutral',
    set: 'core',
    collectible: true,
    costReduction: {
      type: 'per_minion_on_battlefield',
      value: 1
    }
  },
  {
    id: 33298,
    name: 'Warden of Valhalla',
    description: 'At the end of your turn, give your other minions +1 Attack.',
    flavorText: 'The wardens train the einherjar for eternal battle.',
    type: 'minion',
    rarity: 'common',
    manaCost: 4,
    attack: 3,
    health: 6,
    class: 'Neutral',
    set: 'core',
    collectible: true
  },
  {
    id: 33299,
    name: 'The Soulflayer',
    description: 'Battlecry: Gain +1/+1 for each friendly minion that died this game.',
    flavorText: 'He consumes the essence of the fallen to fuel his rampage.',
    type: 'minion',
    rarity: 'epic',
    manaCost: 6,
    attack: 6,
    health: 6,
    class: 'Neutral',
    set: 'core',
    keywords: ['battlecry'],
    collectible: true,
    battlecry: {
      type: 'buff_per_dead_friendly_minion',
      buffAttack: 1,
      buffHealth: 1,
      requiresTarget: false
    }
  },

  // === TOKEN FOR N'ZOTH'S FIRST MATE ===
  {
    id: 33401,
    name: 'Rusty Hook',
    description: 'A corroded iron hook trailing seaweed and barnacles.',
    flavorText: 'A corroded hook from the depths of the ocean.',
    type: 'weapon',
    rarity: 'common',
    manaCost: 1,
    attack: 1,
    durability: 3,
    class: 'Neutral',
    set: 'core',
    collectible: false
  }
];

// ============================================
// COMBINED EXPORTS
// ============================================

const commonNeutrals: CardData[] = [
  ...commonNeutralMinions,
  ...commonNeutralSpells,
  ...mythologySpells,
  ...mythologyCommonMinions,
  ...commonDragonMinions,
  ...commonBeastMinions
];

const rareNeutrals: CardData[] = [
  ...rareNeutralMinions,
  ...rareNeutralSpells,
  ...mythologyRareMinions,
  ...rareDragonMinions,
  ...rareBeastMinions
];

const epicNeutrals: CardData[] = [
  ...epicNeutralMinions,
  ...epicNeutralSpells,
  ...mythologyEpicMinions,
  ...epicDragonMinions,
  ...epicBeastMinions
];

const legendaryNeutrals: CardData[] = [
  ...legendaryNeutralMinions,
  ...mythologyLegendaryMinions,
  ...legendaryDragonMinions,
  ...legendaryBeastMinions
];

const tokenNeutrals: CardData[] = [
  ...mythologyTokens,
  ...dragonTokens,
  ...beastTokens
];

const norseMythNeutrals: CardData[] = [
  ...mythologyNorseCards
];

// Combo/Draw Engine cards combined
const comboEngineCards: CardData[] = [
  ...comboDrawCards,
  ...comboCostReductionCards,
  ...comboBounceCards,
  ...comboTutorCards
];

export const coreNeutralCards: CardData[] = [
  ...commonNeutrals,
  ...rareNeutrals,
  ...epicNeutrals,
  ...legendaryNeutrals,
  ...tokenNeutrals,
  ...norseMythNeutrals,
  ...comboEngineCards,
  ...controlRemovalCards,
  ...cheatRecruitRampCards,
  ...synergyPackageCards,
  ...allYggdrasilGolemCards,
  ...elderTitanCards,
  ...allAdaptCards,
  ...allMechanicCards,
  ...allLegendaryCards,
  ...allSpellCards,
  ...vanillaMinions,
  ...einherjarCards,
  ...bloodPriceCards,
  ...prophecyCards,
  ...realmShiftCards,
  ...ragnarokChainCards,
  ...neutralMythicTechCards,
  ...petSynergyCards,
  ...dragonSynergyCards,
  ...norseMechanicSynergyCards,
  ...deepKeywordCards,
  ...greekMythicMinions,
  ...norseMechanicPayoffCards,
  ...primordialExpansionCards,
  ...wagerCards,
  ...allBaseCards
];

export { allYggdrasilGolemCards, elderTitanCards, allAdaptCards, allMechanicCards, allLegendaryCards, allSpellCards };
export default coreNeutralCards;
