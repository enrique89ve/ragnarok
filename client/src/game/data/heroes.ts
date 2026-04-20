import { HeroClass } from "../types";
import { debug } from "../config/debugConfig";

// Hero power interface
interface HeroPower {
      id: number;

      name: string;
      description: string;

      cost: number;
  image?: string;
}

// Alternate hero interface
interface AlternateHero {
      id: number;

      name: string;
      description: string;

      image?: string;
}

// Hero data interface
interface HeroData {
      id: number;

      name: string;
      class: HeroClass;

      heroPowers: HeroPower[];
  description?: string;
  image?: string;
  alternateHeroes?: AlternateHero[];
  collectible?: boolean;
}

// Define all hero data
const heroes: HeroData[] = [
   {
      id: 1,

      name: "Freya Frostweaver",
      class: "Mage",

      description: "The Archmage of the Rune Council and former leader of the Mystical Order.",
      heroPowers: [{

          id: 101,

          name: "Fireblast",
          description: "Deal 1 damage.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 1001,

          name: "Óðinn's Prophet",
          description: "The Last Guardian of the realms and one of the most powerful mages to ever live."

           },

{
          id: 1002,

          name: "Bragi Runekeeper",
          description: "Archmage of the Rune Council and apprentice of Óðinn's Prophet."

           },

{
          id: 1003,

          name: "Sindri Dawngrasp",
          description: "Neutral mage from Alfheim who has joined the Aesir in Midgard."

           },

{
          id: 1004,

          name: "Gróa the Seeress",
        description: "Guardian of the realms, mother of Óðinn's Prophet, and one of the most powerful seeresses in history."
      },

{
          id: 1005,

          name: "Njord Stormfather",
          description: "Grand Admiral of the Vanir fleet and father of Freya Frostweaver."

           },

{
          id: 1006,

          name: "Logi, the Living Flame",
          description: "Son of Fornjot, the personification of wildfire. His hunger for destruction cannot be sated."
      }],
      collectible: true
  },

{
      id: 2,

      name: "Kratos Battleborn",
      class: "Warrior",

      description: "Famed warrior known for his battle fury and unyielding rage.",
      heroPowers: [{

          id: 102,

          name: "Armor Up!",
          description: "Gain 2 Armor.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 2001,

          name: "Brokkr Ironhand",
          description: "Former King of Nidavellir and representative of the Dvergr smiths."

           },

{
          id: 2002,

          name: "Hrungnir, the Stone-Hearted",
        description: "Mightiest of the jotnar, whose heart was carved from whetstone. He challenged Thor to single combat and nearly won."
      },

{
          id: 2003,

          name: "Hildr the Valkyrie",
          description: "Leader of the Valkyries who offered Hel a pact after her fall."

           },

{
          id: 2004,

          name: "Hervor Shieldmaiden",
          description: "Young einherjar warrior from the Ulfhednar Clan with exceptional combat skills."
      }]

  },

{
      id: 3,

      name: "Heimdallr the Vigilant",
      class: "Paladin",

      description: "Guardian of the Bifrost and watchman of the Aesir, mentor to the Draugr King.",
      heroPowers: [{

          id: 103,

          name: "Reinforce",
          description: "Summon a 1/1 Silver Hand Recruit.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 3001,

          name: "Sigyn, the Faithful",
          description: "First of the Bifrost Knights and wielder of the Light."

           },

{
          id: 3002,

          name: "Ratatoskr the Vexing",
          description: "Sentient automaton squirrel who became a champion of the Bifrost Guard."

           },

{
          id: 3003,

          name: "Prince Baldur",
          description: "The shining prince of Asgard before his descent into darkness."

           },

{
          id: 3004,

          name: "Sif Goldensworn",
          description: "Tireless defender of justice and sister to Sinmara the Darksworn."

           },

{
          id: 3005,

          name: "Nanna of Asgard",
          description: "Light-blessed paladin and former Exarch of the Vanir people."
      }],
      collectible: true
  },

{
      id: 4,

      name: "Orion",
      class: "Hunter",

      description: "The great hunter of Greek mythology, placed among the stars.",
      heroPowers: [{

          id: 104,

          name: "Aimed Shot",
          description: "Deal 2 damage to the enemy hero.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 4001,

          name: "Skaði Winterbow",
          description: "Eldest of the frost-giant huntresses and master ranger of Jotunheim."

           },

{
          id: 4002,

          name: "Hel, Death's Embrace",
        description: "The goddess of the underworld, ruler of the dead."
      },

{
          id: 4003,

          name: "Eitri Stormpike",
          description: "Skilled dvergr hunter from Niflheim who excels at hunting the most dangerous prey."

           },

{
          id: 4004,

          name: "Dáinn Beastcaller",
          description: "Young jotun hunter with a special connection to the beasts of the wild."

           },

{
          id: 4005,

          name: "Víðarr the Silent Hunter",
          description: "Famed big game hunter and tracker across the Nine Realms."
      }],
      collectible: true
  },

{
      id: 5,

      name: "Idunn Lifebringer",
      class: "Druid",

      description: "Archdruid of the Ljósálfar and keeper of the golden apples of immortality.",
      heroPowers: [{

          id: 105,

          name: "Shapeshift",
          description: "Gain 1 Attack this turn and 1 Armor.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 5001,

          name: "Embla Greenwhisper",
          description: "First daughter of the forest spirits and protector of the Dreamway."

           },

{
          id: 5002,

          name: "Fjölnir Rootwarden",
          description: "Archdruid of the Vanir and leader of the grove druids."

           },

{
          id: 5003,

          name: "Idunn, Grove Warden",
          description: "Idunn in her role as teacher and guide to young druids."

           },

{
          id: 5004,

          name: "Askr Elderbark",
          description: "Ancient treant with deep connections to Yggdrasil's roots."

           },

{
          id: 5005,

          name: "Váli Mossborn",
          description: "Young grove druid known for his friendly nature and connection to the land."
      }],
      collectible: true
  },

{
      id: 6,

      name: "Eir the Merciful",
      class: "Priest",

      description: "High Priestess of Asgard and keeper of the healing arts among the Aesir.",
      heroPowers: [{

          id: 106,

          name: "Lesser Heal",
          description: "Restore 2 Health.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 6001,

          name: "Fulla Moonveil",
          description: "High Priestess of Máni and leader of the Ljósálfar."

           },

{
          id: 6002,

          name: "Delphi, Oracle of Light",
          description: "The Oracle who sees all futures and guides the faithful."

           },

{
          id: 6003,

          name: "Vala Seidkona",
          description: "Völva priestess and fortune teller with mysterious powers of seiðr."

           },

{
          id: 6004,

          name: "Rindr Shadowpriestess",
          description: "Former high priestess who studied the ways of shadow and Helheim."

           },

{
          id: 6005,

          name: "Sól Lightbearer",
          description: "Vanir priest with powerful light-based abilities drawn from the sun."
      }],
      collectible: true
  },

{
      id: 7,

      name: "Angrboda",
      class: "Warlock",

      description: "Mother of monsters and the first shadow-weaver.",
      heroPowers: [{

          id: 107,

          name: "Life Tap",
          description: "Draw a card and take 2 damage.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 7001,

          name: "Grýla Hexweaver",
          description: "A dvergr warlock with an affinity for dark magic."

           },

{
          id: 7002,

          name: "Iron Surtr",
          description: "A mechanized automaton forged in the fires of Muspelheim."

           },

{
          id: 7003,

          name: "Níðhöggr",
        description: "The Corpse-Gnawer, an ancient wyrm coiled beneath Yggdrasil, known for its dominion over decay."
      },

{
          id: 7004,

          name: "Sinmara the Darksworn",
        description: "Ambitious warlock and sister to Sif Goldensworn, who made a dangerous pact with dark forces."
      },

{
          id: 7005,

          name: "Þrívaldi",
          description: "Three-headed jotun chieftain with powerful warlock abilities."
      }],
      collectible: true
  },

{
      id: 8,

      name: "Magni Stormcaller",
      class: "Shaman",

      description: "A powerful shaman who commands the fury of the elements.",
      heroPowers: [{

          id: 108,

          name: "Totemic Call",
          description: "Summon a random Basic Totem.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 8001,

          name: "Aegir the Tidecaller",
          description: "A wise naga shaman who commands the tides of the Nine Seas."

           },

{
          id: 8002,

          name: "Hrímþurs the Frost King",
          description: "King of the frost giants and powerful practitioner of ice magic."

           },

{
          id: 8003,

          name: "Þjazi Stormborn",
          description: "Ancient ruler of the storm giants who wields the power of lightning."

           },

{
          id: 8004,

          name: "Völva Eldrid",
          description: "Master of shamanic techniques who teaches the ways of the elements."

           },

{
          id: 8005,

          name: "Rán of the Depths",
          description: "Former ljósálfr handmaiden transformed into a powerful naga sea witch."
      }],
      collectible: true
  },

{
      id: 9,

      name: "Nótt the Shadow",
      class: "Rogue",

      description: "Master assassin and goddess of the night who moves unseen through the Nine Realms.",
      heroPowers: [{

          id: 109,

          name: "Dagger Mastery",
          description: "Equip a 1/2 Dagger.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 9001,

          name: "Skuld Shadowsong",
          description: "The Norn Warden responsible for imprisoning Typhon, Storm Titan."

           },

{
          id: 9002,

          name: "Erik the Shadow Lord",
          description: "Master of shadows and leader of the dark brotherhood."

           },

{
          id: 9003,

          name: "Alvíss Greycloak",
          description: "Princess of Svartalfheim and expert in espionage and stealth tactics."

           },

{
          id: 9004,

          name: "Loki Silvertongue",
          description: "Shadow operative known for his cunning deception and acrobatic abilities."

           },

{
          id: 9005,

          name: "Captain Naglfar",
          description: "Infamous pirate captain with a deadly reputation on the high seas of the Nine Realms."
      }],
      collectible: true
  },

{
      id: 10,

      name: "Typhon, Storm Titan",
      class: "Berserker",

      description: "The first Berserker, twin sibling of the great druids of the Ljósálfar.",
      heroPowers: [{

          id: 110,

          name: "Berserker Claws",
          description: "Gain +1 Attack this turn.",

          cost: 1
      }]
,
      alternateHeroes: [{

          id: 10001,

          name: "Höðr Sunfury",
          description: "A powerful ljósálfr berserker and disciple of Typhon."

           },

{
          id: 10002,

          name: "Egill Ashfallen",
          description: "A devoted berserker who survived the destruction of his village by fire giants."

           }
],
      collectible: true
  },
  {
      id: 11,

      name: "The Draugr King",
      class: "DeathKnight",

      description: "The Draugr King, a fallen prince of Asgard who embraced death.",
      heroPowers: [{

          id: 111,

          name: "Death's Touch",
          description: "Deal 1 damage to a minion and raise a 1/1 Ghoul if it dies.",

          cost: 2
      }]
,
      alternateHeroes: [{

          id: 11001,

          name: "Hermod Helwalker",
          description: "Herald of Hel and the first Death Knight to return from Helheim."

           },

{
          id: 11002,

          name: "Ganglati the Returned",
          description: "The first of the death knights to rejoin the Aesir after breaking free from Hel's dominion."

           },

{
          id: 11003,

          name: "Hroðgar Deathweaver",
          description: "Former ljósálfr ranger transformed into a Death Knight by the Draugr King."

           },

{
          id: 11004,

          name: "Lady Ganglöt",
          description: "Master of unholy magics and instructor of aspiring Death Knights in Helheim."

           },

{
          id: 11005,

          name: "Sleipnir's Rider",
          description: "Death Knight known for his mastery over spectral steeds of Helheim."
      }],
      collectible: true
  },
  {
      id: 12,

      name: "Hyndla the Bone-Singer",
      class: "Necromancer",

      description: "Master of dark magic and the art of raising the dead from Helheim.",
      heroPowers: [{

          id: 112,

          name: "Soul Harvest",
          description: "Lose 2 Health and summon a 2/1 Skeleton with Rush.",

          cost: 2
      }],
      alternateHeroes: [{

          id: 12001,

          name: "Draugr Jarl Ölvir",
          description: "Ancient undead jarl who mastered the dark arts of necromancy in Helheim."

           },

{
          id: 12002,

          name: "Grimhild the Cursed",
          description: "Notorious necromancer who terrorized the foothills of Jotunheim."

           }
      ],
      collectible: true
  }
];

// Helper function to get hero data by class
export const getHeroDataByClass = (heroClass: HeroClass): HeroData | undefined => {
  // Filter out undefined heroes first
  const validHeroes = heroes.filter(hero => hero !== undefined && hero !== null);
  
  // Safely handle potential undefined heroClass
  if (!heroClass) {
    debug.warn("getHeroDataByClass called with undefined heroClass");
    return undefined;
  }
  
  try {
    // Perform case-insensitive class matching
    return validHeroes.find(hero => 
      hero.class && hero.class.toLowerCase() === heroClass.toLowerCase()
    );
  } catch (error) {
    debug.error("Error in getHeroDataByClass:", error);
    return undefined;
  }
};

// Helper function to get the default hero power for a hero class
export const getDefaultHeroPower = (heroClass: HeroClass): HeroPower | undefined => {
  const hero = getHeroDataByClass(heroClass);
  return hero?.heroPowers[0];
};

export default heroes;