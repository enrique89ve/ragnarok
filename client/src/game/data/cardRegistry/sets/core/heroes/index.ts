import { CardData } from '../../../../../types';
import { allDeathKnightHeroCards } from './deathKnightHeroes';

/**
 * Core Set - Hero Cards
 * Migrated from legacy heroes.ts with Norse/Greek mythology theming
 * Each hero represents a class with unique hero powers
 * 
 * ID Range: 90000-99999
 */

// ============================================
// MAGE HEROES
// ============================================
const mageHeroes: CardData[] = [
  {
    id: 90001,
    name: 'Freya Frostweaver',
    description: 'Hero Power: Fireblast - Deal 1 damage.',
    flavorText: 'The Archmage of the Frozen North, wielder of frost and flame.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Mage',
    set: 'core',
    collectible: true
  },
  {
    id: 90002,
    name: 'Circe the Enchantress',
    description: 'Hero Power: Fireblast - Deal 1 damage.',
    flavorText: 'Greek sorceress who transforms her enemies with powerful magic.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Mage',
    set: 'core',
    collectible: true
  },
  {
    id: 90003,
    name: 'Prometheus Spellweaver',
    description: 'Hero Power: Fireblast - Deal 1 damage.',
    flavorText: 'The Titan who brought fire and knowledge to mortals.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Mage',
    set: 'core',
    collectible: true
  },
  {
    id: 90004,
    name: 'Varden of the Dawn',
    description: 'Hero Power: Fireblast - Deal 1 damage.',
    flavorText: 'A wandering mage from the Northern Realms who wields the power of light.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Mage',
    set: 'core',
    collectible: true
  },
  {
    id: 90005,
    name: 'Aegwynn the Eternal',
    description: 'Hero Power: Fireblast - Deal 1 damage.',
    flavorText: 'Guardian of the Ancient Order and one of the most powerful mages in history.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Mage',
    set: 'core',
    collectible: true
  },
  {
    id: 90006,
    name: 'Mordecai Flamecaller',
    description: 'Hero Power: Fireblast - Deal 1 damage.',
    flavorText: 'A fire mage known for his searing flame skills and fiery personality.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Mage',
    set: 'core',
    collectible: true
  }
];

// ============================================
// WARRIOR HEROES
// ============================================
const warriorHeroes: CardData[] = [
  {
    id: 90010,
    name: 'Tyr the Battle-Lord',
    description: 'Hero Power: Armor Up! - Gain 2 Armor.',
    flavorText: 'The one-handed god of war, courage, and martial honor.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warrior',
    set: 'core',
    collectible: true
  },
  {
    id: 90011,
    name: 'Brokkr Stoneheart',
    description: 'Hero Power: Armor Up! - Gain 2 Armor.',
    flavorText: 'Master dwarven smith who forged legendary weapons for the gods of Asgard.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warrior',
    set: 'core',
    collectible: true
  },
  {
    id: 90012,
    name: 'Nidhogg the Destroyer',
    description: 'Hero Power: Armor Up! - Gain 2 Armor.',
    flavorText: 'The dragon that gnaws at the roots of Yggdrasil.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warrior',
    set: 'core',
    collectible: true
  },
  {
    id: 90013,
    name: 'Brynhildr Valkyrie',
    description: 'Hero Power: Armor Up! - Gain 2 Armor.',
    flavorText: 'Leader of the Valkyries who choose the slain for Valhalla.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warrior',
    set: 'core',
    collectible: true
  },
  {
    id: 90014,
    name: 'Rokara Frostwolf',
    description: 'Hero Power: Armor Up! - Gain 2 Armor.',
    flavorText: 'Young berserker warrior from the Northern Clans with exceptional combat skills.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warrior',
    set: 'core',
    collectible: true
  }
];

// ============================================
// PALADIN HEROES
// ============================================
const paladinHeroes: CardData[] = [
  {
    id: 90020,
    name: 'Baldur the Radiant',
    description: 'Hero Power: Reinforce - Summon a 1/1 Silver Hand Recruit.',
    flavorText: 'God of light, purity, and righteousness who commands the sacred warriors.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Paladin',
    set: 'core',
    collectible: true
  },
  {
    id: 90021,
    name: 'Athena Lightbearer',
    description: 'Hero Power: Reinforce - Summon a 1/1 Silver Hand Recruit.',
    flavorText: 'Greek goddess of wisdom and righteous warfare.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Paladin',
    set: 'core',
    collectible: true
  },
  {
    id: 90022,
    name: 'Hephaestus the Forged',
    description: 'Hero Power: Reinforce - Summon a 1/1 Silver Hand Recruit.',
    flavorText: 'Greek god of the forge, master of divine craftsmanship.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Paladin',
    set: 'core',
    collectible: true
  },
  {
    id: 90023,
    name: 'Perseus the Valiant',
    description: 'Hero Power: Reinforce - Summon a 1/1 Silver Hand Recruit.',
    flavorText: 'Greek hero who slew Medusa and saved Andromeda.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Paladin',
    set: 'core',
    collectible: true
  },
  {
    id: 90024,
    name: 'Sigrun Shieldmaiden',
    description: 'Hero Power: Reinforce - Summon a 1/1 Silver Hand Recruit.',
    flavorText: 'Norse Valkyrie who protects the worthy in battle.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Paladin',
    set: 'core',
    collectible: true
  },
  {
    id: 90025,
    name: 'Iduna the Devoted',
    description: 'Hero Power: Reinforce - Summon a 1/1 Silver Hand Recruit.',
    flavorText: 'Norse goddess who guards the golden apples of immortality.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Paladin',
    set: 'core',
    collectible: true
  }
];

// ============================================
// HUNTER HEROES
// ============================================
const hunterHeroes: CardData[] = [
  {
    id: 90030,
    name: 'Skadi the Huntress',
    description: 'Hero Power: Aimed Shot - Deal 2 damage to the enemy hero.',
    flavorText: 'Norse goddess of the hunt, ski, and winter mountains.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Hunter',
    set: 'core',
    collectible: true
  },
  {
    id: 90031,
    name: 'Atalanta Swiftbow',
    description: 'Hero Power: Aimed Shot - Deal 2 damage to the enemy hero.',
    flavorText: 'Greek huntress renowned for her speed and archery.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Hunter',
    set: 'core',
    collectible: true
  },
  {
    id: 90032,
    name: 'Artemis Moonstalker',
    description: 'Hero Power: Aimed Shot - Deal 2 damage to the enemy hero.',
    flavorText: 'The eternal huntress who prowls the silver moonlit forests.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Hunter',
    set: 'core',
    collectible: true
  },
  {
    id: 90033,
    name: 'Tavish Stormpike',
    description: 'Hero Power: Aimed Shot - Deal 2 damage to the enemy hero.',
    flavorText: 'Skilled dwarf hunter from the Mountain Peaks who excels at hunting the most dangerous prey.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Hunter',
    set: 'core',
    collectible: true
  },
  {
    id: 90034,
    name: 'Orion the Beastmaster',
    description: 'Hero Power: Aimed Shot - Deal 2 damage to the enemy hero.',
    flavorText: 'The great hunter placed among the stars by the gods.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Hunter',
    set: 'core',
    collectible: true
  },
  {
    id: 90035,
    name: 'Hemet the Great',
    description: 'Hero Power: Aimed Shot - Deal 2 damage to the enemy hero.',
    flavorText: 'Famed big game hunter and safari guide.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Hunter',
    set: 'core',
    collectible: true
  }
];

// ============================================
// DRUID HEROES
// ============================================
const druidHeroes: CardData[] = [
  {
    id: 90040,
    name: 'Freyr Earthshaper',
    description: 'Hero Power: Shapeshift - Gain 1 Attack this turn and 1 Armor.',
    flavorText: 'Norse god of fertility, prosperity, and the wild.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Druid',
    set: 'core',
    collectible: true
  },
  {
    id: 90041,
    name: 'Lunara Dryad',
    description: 'Hero Power: Shapeshift - Gain 1 Attack this turn and 1 Armor.',
    flavorText: 'First daughter of the Forest Spirit and protector of the Dreamrealm.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Druid',
    set: 'core',
    collectible: true
  },
  {
    id: 90042,
    name: 'Hamuul Runetotem',
    description: 'Hero Power: Shapeshift - Gain 1 Attack this turn and 1 Armor.',
    flavorText: 'Archdruid of the Sacred Grove and leader of the beast-kin druids.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Druid',
    set: 'core',
    collectible: true
  },
  {
    id: 90043,
    name: 'Pan of the Wild',
    description: 'Hero Power: Shapeshift - Gain 1 Attack this turn and 1 Armor.',
    flavorText: 'The satyr god who roams the untamed wilderness.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Druid',
    set: 'core',
    collectible: true
  },
  {
    id: 90044,
    name: 'Hazelbark Ancient',
    description: 'Hero Power: Shapeshift - Gain 1 Attack this turn and 1 Armor.',
    flavorText: 'Ancient treant with deep connections to the Spirit Realm.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Druid',
    set: 'core',
    collectible: true
  },
  {
    id: 90045,
    name: 'Guff Wildkin',
    description: 'Hero Power: Shapeshift - Gain 1 Attack this turn and 1 Armor.',
    flavorText: 'Young satyr druid known for his friendly nature and connection to the land.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Druid',
    set: 'core',
    collectible: true
  }
];

// ============================================
// PRIEST HEROES
// ============================================
const priestHeroes: CardData[] = [
  {
    id: 90050,
    name: 'Eir the Healer',
    description: 'Hero Power: Lesser Heal - Restore 2 Health.',
    flavorText: 'Norse goddess of healing and mercy who tends to the wounded.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Priest',
    set: 'core',
    collectible: true
  },
  {
    id: 90051,
    name: 'Artemis Moonwarden',
    description: 'Hero Power: Lesser Heal - Restore 2 Health.',
    flavorText: 'Greek goddess of the hunt and protector of the sacred moonlit groves.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Priest',
    set: 'core',
    collectible: true
  },
  {
    id: 90052,
    name: 'Delphi, Oracle of Light',
    description: 'Hero Power: Lesser Heal - Restore 2 Health.',
    flavorText: 'The Oracle who sees all futures and guides the faithful.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Priest',
    set: 'core',
    collectible: true
  },
  {
    id: 90053,
    name: 'Apollo Sunbringer',
    description: 'Hero Power: Lesser Heal - Restore 2 Health.',
    flavorText: 'God of light, healing, and prophecy who drives the sun chariot.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Priest',
    set: 'core',
    collectible: true
  },
  {
    id: 90054,
    name: 'Natalie Seline',
    description: 'Hero Power: Lesser Heal - Restore 2 Health.',
    flavorText: 'Former high priestess who studied the ways of shadow.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Priest',
    set: 'core',
    collectible: true
  },
  {
    id: 90055,
    name: 'Xyrella Lightweaver',
    description: 'Hero Power: Lesser Heal - Restore 2 Health.',
    flavorText: 'Ancient priest with powerful light-based abilities.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Priest',
    set: 'core',
    collectible: true
  }
];

// ============================================
// WARLOCK HEROES
// ============================================
const warlockHeroes: CardData[] = [
  {
    id: 90060,
    name: 'Hel the Underqueen',
    description: 'Hero Power: Life Tap - Draw a card and take 2 damage.',
    flavorText: 'Norse goddess of the dead who rules over Helheim.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warlock',
    set: 'core',
    collectible: true
  },
  {
    id: 90061,
    name: 'Nemsy Necrofizzle',
    description: 'Hero Power: Life Tap - Draw a card and take 2 damage.',
    flavorText: 'A gnome warlock with an affinity for dark magic.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warlock',
    set: 'core',
    collectible: true
  },
  {
    id: 90062,
    name: 'Mecha-Jaraxxus',
    description: 'Hero Power: Life Tap - Draw a card and take 2 damage.',
    flavorText: 'A mechanized titan lord of immense dark power.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warlock',
    set: 'core',
    collectible: true
  },
  {
    id: 90063,
    name: 'Hades Soulbinder',
    description: 'Hero Power: Life Tap - Draw a card and take 2 damage.',
    flavorText: 'Lord of the underworld who commands the souls of the dead.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warlock',
    set: 'core',
    collectible: true
  },
  {
    id: 90064,
    name: 'Tamsin Shadowmend',
    description: 'Hero Power: Life Tap - Draw a card and take 2 damage.',
    flavorText: 'Ambitious warlock who made a dangerous pact with dark forces.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warlock',
    set: 'core',
    collectible: true
  },
  {
    id: 90065,
    name: "Cho'gall Twilight",
    description: 'Hero Power: Life Tap - Draw a card and take 2 damage.',
    flavorText: 'Two-headed ogre chieftain with powerful warlock abilities.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Warlock',
    set: 'core',
    collectible: true
  }
];

// ============================================
// SHAMAN HEROES
// ============================================
const shamanHeroes: CardData[] = [
  {
    id: 90070,
    name: 'Thor Stormcaller',
    description: 'Hero Power: Totemic Call - Summon a random Basic Totem.',
    flavorText: 'Norse god of thunder who commands the storms and lightning.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Shaman',
    set: 'core',
    collectible: true
  },
  {
    id: 90071,
    name: 'Aegir the Tidecaller',
    description: 'Hero Power: Totemic Call - Summon a random Basic Totem.',
    flavorText: 'A wise naga shaman who commands the tides of the Nine Seas.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Shaman',
    set: 'core',
    collectible: true
  },
  {
    id: 90072,
    name: 'Rastakhan the Loa King',
    description: 'Hero Power: Totemic Call - Summon a random Basic Totem.',
    flavorText: 'King of the Southern Tribes and powerful practitioner of spirit magic.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Shaman',
    set: 'core',
    collectible: true
  },
  {
    id: 90073,
    name: 'Zeus Thunderlord',
    description: 'Hero Power: Totemic Call - Summon a random Basic Totem.',
    flavorText: 'King of the Olympian gods who wields the mighty thunderbolt.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Shaman',
    set: 'core',
    collectible: true
  },
  {
    id: 90074,
    name: 'Instructor Fireheart',
    description: 'Hero Power: Totemic Call - Summon a random Basic Totem.',
    flavorText: 'Master of shamanic techniques who teaches the ways of the elements.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Shaman',
    set: 'core',
    collectible: true
  },
  {
    id: 90075,
    name: 'Poseidon Tidecaller',
    description: 'Hero Power: Totemic Call - Summon a random Basic Totem.',
    flavorText: 'God of the seas who commands the ocean depths.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Shaman',
    set: 'core',
    collectible: true
  }
];

// ============================================
// ROGUE HEROES
// ============================================
const rogueHeroes: CardData[] = [
  {
    id: 90080,
    name: 'Loki the Trickster',
    description: 'Hero Power: Dagger Mastery - Equip a 1/2 Dagger.',
    flavorText: 'Norse god of mischief, deception, and cunning.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Rogue',
    set: 'core',
    collectible: true
  },
  {
    id: 90081,
    name: 'Nyx Shadowblade',
    description: 'Hero Power: Dagger Mastery - Equip a 1/2 Dagger.',
    flavorText: 'Greek goddess of night who moves unseen through darkness.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Rogue',
    set: 'core',
    collectible: true
  },
  {
    id: 90082,
    name: 'Hermes Swiftblade',
    description: 'Hero Power: Dagger Mastery - Equip a 1/2 Dagger.',
    flavorText: 'Messenger of the gods, master of thieves and travelers.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Rogue',
    set: 'core',
    collectible: true
  },
  {
    id: 90083,
    name: 'Tess Greymane',
    description: 'Hero Power: Dagger Mastery - Equip a 1/2 Dagger.',
    flavorText: 'Princess of the Wolflands and expert in espionage and stealth tactics.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Rogue',
    set: 'core',
    collectible: true
  },
  {
    id: 90084,
    name: 'Scabbs Cutterbutter',
    description: 'Hero Power: Dagger Mastery - Equip a 1/2 Dagger.',
    flavorText: 'Shadow guild operative known for his espionage skills and acrobatic abilities.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Rogue',
    set: 'core',
    collectible: true
  },
  {
    id: 90085,
    name: 'Captain Hooktusk',
    description: 'Hero Power: Dagger Mastery - Equip a 1/2 Dagger.',
    flavorText: 'Infamous pirate captain with a deadly reputation on the high seas.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Rogue',
    set: 'core',
    collectible: true
  }
];

// ============================================
// BERSERKER HEROES
// ============================================
const berserkerHeroes: CardData[] = [
  {
    id: 90090,
    name: 'Surtr the Destroyer',
    description: 'Hero Power: Berserker Claws - Gain +1 Attack this turn.',
    flavorText: 'Fire giant destined to set the world ablaze at Ragnarok.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Berserker',
    set: 'core',
    collectible: true
  },
  {
    id: 90091,
    name: 'Kayn Flamebrand',
    description: 'Hero Power: Berserker Claws - Gain +1 Attack this turn.',
    flavorText: 'A powerful elven berserker and disciple of the fallen gods.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Berserker',
    set: 'core',
    collectible: true
  },
  {
    id: 90092,
    name: 'Kurtrus Ashfallen',
    description: 'Hero Power: Berserker Claws - Gain +1 Attack this turn.',
    flavorText: 'A devoted berserker who survived the destruction of his village by titans.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Berserker',
    set: 'core',
    collectible: true
  }
];

// ============================================
// DEATH KNIGHT HEROES
// ============================================
const deathKnightHeroes: CardData[] = [
  {
    id: 90100,
    name: 'Hela Death-Queen',
    description: "Hero Power: Death's Touch - Deal 1 damage to a minion and raise a 1/1 Ghoul if it dies.",
    flavorText: 'Norse goddess of death who rules the realm of the dishonored dead.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'DeathKnight',
    set: 'core',
    collectible: true
  },
  {
    id: 90101,
    name: 'Charon Gravebringer',
    description: "Hero Power: Death's Touch - Deal 1 damage to a minion and raise a 1/1 Ghoul if it dies.",
    flavorText: 'Ferryman of the dead who carries souls across the River Styx.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'DeathKnight',
    set: 'core',
    collectible: true
  },
  {
    id: 90102,
    name: 'Draugr Lord Geirröðr',
    description: "Hero Power: Death's Touch - Deal 1 damage to a minion and raise a 1/1 Ghoul if it dies.",
    flavorText: 'The dead king Geirröðr tested Odin with fire. Now he serves Hel, raising the fallen as his own warband. (Grímnismál)',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'DeathKnight',
    set: 'core',
    collectible: true
  },
  {
    id: 90103,
    name: 'Angantýr Deathweaver',
    description: "Hero Power: Death's Touch - Deal 1 damage to a minion and raise a 1/1 Ghoul if it dies.",
    flavorText: 'Angantýr fell at the Battle of Samsø, but his cursed sword Tyrfing would not let him rest. He rises still. (Hervarar Saga)',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'DeathKnight',
    set: 'core',
    collectible: true
  },
  {
    id: 90104,
    name: 'Sinfjötli Corpse-Caller',
    description: "Hero Power: Death's Touch - Deal 1 damage to a minion and raise a 1/1 Ghoul if it dies.",
    flavorText: 'Son of Sigmund, Sinfjötli wore a wolf-skin and walked between death and life. He teaches others the same path. (Völsunga Saga 8)',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'DeathKnight',
    set: 'core',
    collectible: true
  },
  {
    id: 90105,
    name: 'Hrímþursar the Pale Rider',
    description: "Hero Power: Death's Touch - Deal 1 damage to a minion and raise a 1/1 Ghoul if it dies.",
    flavorText: 'The frost giants ride dead horses across frozen rivers. Hrímþursar leads their vanguard at the edge of Niflheim.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'DeathKnight',
    set: 'core',
    collectible: true
  }
];

// ============================================
// NECROMANCER HEROES
// ============================================
const necromancerHeroes: CardData[] = [
  {
    id: 90110,
    name: 'Angrboda Bonecaller',
    description: 'Hero Power: Soul Harvest - Lose 2 Health and summon a 2/1 Skeleton with Rush.',
    flavorText: 'Giantess mother of monsters, mistress of death and rebirth.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Necromancer',
    set: 'core',
    collectible: true
  },
  {
    id: 90111,
    name: 'Melinoe Soulweaver',
    description: 'Hero Power: Soul Harvest - Lose 2 Health and summon a 2/1 Skeleton with Rush.',
    flavorText: 'Greek goddess of ghosts who commands restless spirits.',
    type: 'hero',
    rarity: 'rare',
    manaCost: 0,
    health: 100,
    class: 'Necromancer',
    set: 'core',
    collectible: true
  },
  {
    id: 90112,
    name: 'Hecate Gravemother',
    description: 'Hero Power: Soul Harvest - Lose 2 Health and summon a 2/1 Skeleton with Rush.',
    flavorText: 'Greek goddess of magic, crossroads, and the restless dead.',
    type: 'hero',
    rarity: 'epic',
    manaCost: 0,
    health: 100,
    class: 'Necromancer',
    set: 'core',
    collectible: true
  }
];

// Combine all hero cards
export const heroCards: CardData[] = [
  ...mageHeroes,
  ...warriorHeroes,
  ...paladinHeroes,
  ...hunterHeroes,
  ...druidHeroes,
  ...priestHeroes,
  ...warlockHeroes,
  ...shamanHeroes,
  ...rogueHeroes,
  ...berserkerHeroes,
  ...deathKnightHeroes,
  ...necromancerHeroes,
  ...allDeathKnightHeroCards
];

export { allDeathKnightHeroCards };
export default heroCards;
