/**
 * Norse Heroes Module
 * 
 * Exports all Hero-related data and utilities.
 * Includes 4 factions: Norse, Greek, Japanese (Shinto), and Egyptian
 */

export * from './heroDefinitions';
export * from './additionalHeroes';
export * from './japaneseHeroes';
export * from './egyptianHeroes';
export * from './baseHeroes';
export * from './commonHeroes';

import { NORSE_HEROES, getHeroById as getPrimaryHeroById } from './heroDefinitions';
import { ADDITIONAL_HEROES, getAdditionalHeroById } from './additionalHeroes';
import { JAPANESE_HEROES, getJapaneseHeroById } from './japaneseHeroes';
import { EGYPTIAN_HEROES, getEgyptianHeroById } from './egyptianHeroes';
import { BASE_HEROES, getBaseHeroById } from './baseHeroes';
import { COMMON_HEROES, getCommonHeroById } from './commonHeroes';
import { NorseHero } from '../../types/NorseTypes';
import { debug } from '../../config/debugConfig';

export const ALL_NORSE_HEROES: Record<string, NorseHero> = {
  ...NORSE_HEROES,
  ...ADDITIONAL_HEROES,
  ...JAPANESE_HEROES,
  ...EGYPTIAN_HEROES,
  ...BASE_HEROES,
  ...COMMON_HEROES
};

export const ALL_HERO_LIST = Object.values(ALL_NORSE_HEROES);

export function getAnyHeroById(id: string): NorseHero | undefined {
  return getPrimaryHeroById(id) || getAdditionalHeroById(id) || getJapaneseHeroById(id) || getEgyptianHeroById(id) || getBaseHeroById(id) || getCommonHeroById(id);
}

export function getAllHeroes(): NorseHero[] {
  return ALL_HERO_LIST;
}

export function getHeroesByElement(element: string): NorseHero[] {
  return ALL_HERO_LIST.filter(h => h.element === element);
}

export const HERO_COUNT = ALL_HERO_LIST.length;

export function validateAllHeroesExist(): boolean {
  const actualHeroes = ALL_HERO_LIST.length;
  
  // Verify all heroes have required properties
  for (const hero of ALL_HERO_LIST) {
    if (!hero.heroPower || !hero.weaponUpgrade || !hero.passive) {
      debug.warn(`[VALIDATION] Hero ${hero.id} missing required properties`);
      return false;
    }
  }
  
  debug.log(`[VALIDATION] All ${actualHeroes} Heroes validated successfully`);
  return true;
}

export function validateFullRoster(): { valid: boolean; kings: number; heroes: number } {
  const result = {
    valid: validateAllHeroesExist(),
    kings: 9, // Kings are defined separately
    heroes: ALL_HERO_LIST.length
  };
  
  debug.log(`[ROSTER] Total: ${result.kings} Kings + ${result.heroes} Heroes = ${result.kings + result.heroes} characters`);
  return result;
}

/**
 * Get fixed card IDs for a hero.
 * NOTE: Fixed cards have been removed. Deck cards are now user-built via heroDeckStore (30 cards per hero).
 * This function returns an empty array for backwards compatibility.
 * 
 * @param heroKey - The hero key (e.g., 'mage-jaina', 'warrior-garrosh')
 * @returns Empty array (fixed cards system removed)
 */
export function getHeroFixedCardIds(heroKey: string): number[] {
  return [];
}

/**
 * Get a hero with their fixed cards populated.
 * NOTE: Fixed cards have been removed. Deck cards are now user-built via heroDeckStore (30 cards per hero).
 * This returns the hero with an empty fixedCardIds array for backwards compatibility.
 */
export function getHeroWithFixedCards(heroId: string): NorseHero | undefined {
  const hero = getAnyHeroById(heroId);
  if (!hero) return undefined;
  
  return {
    ...hero,
    fixedCardIds: []
  };
}

/**
 * Map from norseHeroId to ChessPieceConfig heroKey
 * Some heroes use different key formats between systems
 */
export const HERO_ID_TO_CONFIG_KEY: Record<string, string> = {
  // Mage heroes map to class-based keys
  'hero-odin': 'mage-jaina',    // Odin uses Mage spells
  'hero-bragi': 'mage-medivh',  // Bragi uses Mage spells
  'hero-kvasir': 'mage-khadgar', // Kvasir uses Mage spells
  // Warrior heroes
  'hero-thor': 'warrior-garrosh',
  'hero-tyr': 'paladin-uther',
  'hero-vidar': 'paladin-arthas',
  'hero-heimdall': 'paladin-tirion',
  // Priest heroes
  'hero-freya': 'priest-anduin',
  'hero-eir': 'priest-tyrande',
  'hero-frey': 'priest-voljin',
  'hero-verdandi': 'priest-anduin',  // Verdandi uses Priest spells (combo)
  // Berserker heroes
  'hero-vali': 'berserker-illidan',  // Vali uses Berserker spells (escalating)
  // Rogue heroes
  'hero-loki': 'rogue-valeera',
  'hero-hoder': 'rogue-maiev',
  // Hunter heroes
  'hero-skadi': 'hunter-rexxar',
  // Druid heroes
  'hero-idunn': 'druid-malfurion',
  // Shaman heroes
  'hero-gerd': 'shaman-thrall',
  // Warlock heroes
  'hero-forseti': 'warlock-guldan',
  'hero-mani': 'warlock-tamsin',
  // Death Knight heroes
  'hero-magni': 'deathknight-arthas',
  // Berserker heroes
  'hero-myrka': 'berserker-illidan',
  // Necromancer heroes
  'hero-sol': 'necromancer-lilian',
  'hero-sinmara': 'necromancer-helcular',
  // Base (free starter) heroes
  'hero-erik-flameheart': 'mage-jaina',
  'hero-ragnar-ironside': 'warrior-garrosh',
  'hero-brynhild': 'priest-anduin',
  'hero-sigurd': 'rogue-valeera',
  // Common heroes
  'hero-gullveig': 'warlock-guldan',
  'hero-groa': 'mage-jaina',
  'hero-hervor': 'warrior-garrosh',
  'hero-bjorn-ironside': 'paladin-uther',
  'hero-nanna': 'priest-anduin',
  'hero-volva': 'shaman-thrall',
  'hero-gudrun': 'hunter-rexxar',
  'hero-heracles': 'warrior-garrosh',
  'hero-perseus': 'hunter-rexxar',
  'hero-starkad': 'berserker-illidan',
  'hero-frigg': 'priest-frigg',
  'hero-bestla': 'shaman-bestla',
  'hero-hermod': 'rogue-hermod',
  'hero-hecate': 'warlock-guldan',
  'hero-helios': 'priest-anduin',
  'hero-prometheus': 'druid-malfurion',
  'hero-rhea': 'priest-anduin',
  'hero-selene': 'rogue-valeera',
};

/**
 * Get the config key for a hero (maps norseHeroId to ChessPieceConfig key)
 */
export function getHeroConfigKey(norseHeroId: string): string | undefined {
  return HERO_ID_TO_CONFIG_KEY[norseHeroId];
}

/**
 * Complete hero ID to class mapping for all 92 heroes.
 * This is the authoritative source for class-specific icons.
 */
export const HERO_ID_TO_CLASS: Record<string, string> = {
  // QUEEN - Mage (8 heroes)
  'hero-odin': 'mage',
  'hero-bragi': 'mage',
  'hero-kvasir': 'mage',
  'hero-zeus': 'mage',
  'hero-athena': 'mage',
  'hero-hyperion': 'mage',
  'hero-chronos': 'mage',

  // QUEEN - Warlock (6 heroes)
  'hero-forseti': 'warlock',
  'hero-mani': 'warlock',
  'hero-hades': 'warlock',
  'hero-dionysus': 'warlock',
  'hero-persephone': 'warlock',

  // QUEEN - Necromancer (3 heroes)
  'hero-sol': 'necromancer',
  'hero-sinmara': 'necromancer',
  'hero-hel': 'necromancer',

  // ROOK - Warrior (8 heroes)
  'hero-thor': 'warrior',
  'hero-thorgrim': 'warrior',
  'hero-valthrud': 'warrior',
  'hero-vili': 'warrior',
  'hero-ares': 'warrior',
  'hero-hephaestus': 'warrior',
  'hero-heracles': 'warrior',
  'hero-logi': 'warrior',

  // ROOK - Death Knight (3 heroes)
  'hero-magni': 'deathknight',
  'hero-brakki': 'deathknight',
  'hero-thryma': 'deathknight',

  // ROOK - Paladin (6 heroes)
  'hero-tyr': 'paladin',
  'hero-vidar': 'paladin',
  'hero-heimdall': 'paladin',
  'hero-baldur': 'paladin',
  'hero-solvi': 'paladin',
  'hero-eldrin': 'paladin',
  
  // BISHOP - Priest (9 heroes)
  'hero-freya': 'priest',
  'hero-eir': 'priest',
  'hero-frey': 'priest',
  'hero-hoenir': 'priest',
  'hero-aphrodite': 'priest',
  'hero-hera': 'priest',
  'hero-eros': 'priest',
  'hero-hestia': 'priest',
  'hero-rhea': 'priest',
  'hero-verdandi': 'priest',

  // BISHOP - Druid (7 heroes)
  'hero-idunn': 'druid',
  'hero-ve': 'berserker',
  'hero-fjorgyn': 'druid',
  'hero-sigyn': 'druid',
  'hero-demeter': 'druid',
  'hero-prometheus': 'druid',
  'hero-blainn': 'druid',
  
  // BISHOP - Shaman (5 heroes)
  'hero-gerd': 'shaman',
  'hero-gefjon': 'shaman',
  'hero-ran': 'shaman',
  'hero-njord': 'shaman',
  'hero-poseidon': 'shaman',
  
  // KNIGHT - Rogue (6 heroes)
  'hero-loki': 'rogue',
  'hero-hoder': 'rogue',
  'hero-gormr': 'rogue',
  'hero-lirien': 'rogue',
  'hero-hermes': 'rogue',
  'hero-nyx': 'rogue',
  
  // KNIGHT - Hunter (6 heroes)
  'hero-skadi': 'hunter',
  'hero-aegir': 'hunter',
  'hero-fjora': 'hunter',
  'hero-ullr': 'hunter',
  'hero-apollo': 'hunter',
  'hero-artemis': 'hunter',
  'hero-perseus': 'hunter',
  
  // KNIGHT - Berserker (3 heroes)
  'hero-myrka': 'berserker',
  'hero-ylva': 'berserker',
  'hero-vali': 'berserker',
  
  // JAPANESE HEROES (5 heroes)
  'hero-izanami': 'warlock',
  'hero-tsukuyomi': 'rogue',
  'hero-fujin': 'mage',
  'hero-sarutahiko': 'paladin',
  'hero-kamimusubi': 'shaman',
  
  // EGYPTIAN HEROES (4 heroes)
  'hero-ammit': 'warlock',      // Devourer of Souls - conditional destroy
  'hero-maat': 'priest',        // Goddess of Balance - stat transformation
  'hero-serqet': 'rogue',       // Scorpion Goddess - poison
  'hero-khepri': 'berserker',  // Scarab of Wrath - aggro
  // BASE (FREE STARTER) HEROES (4 heroes)
  'hero-erik-flameheart': 'mage',
  'hero-ragnar-ironside': 'warrior',
  'hero-brynhild': 'priest',
  'hero-sigurd': 'rogue',

  // COMMON HEROES (8 heroes — demigods & saga figures)
  'hero-gullveig': 'warlock',
  'hero-groa': 'mage',
  'hero-hervor': 'warrior',
  'hero-bjorn-ironside': 'paladin',
  'hero-nanna': 'priest',
  'hero-volva': 'shaman',
  'hero-gudrun': 'hunter',
  'hero-starkad': 'berserker',
  'hero-frigg': 'priest',
  'hero-bestla': 'shaman',
  'hero-hermod': 'rogue',

  // GREEK ALT-SKIN HEROES (3 heroes — preserved from mythology expansion)
  'hero-selene': 'rogue',       // Titaness of the Moon - stealth
  'hero-hecate': 'warlock',     // Goddess of Magic - conditional destroy
  'hero-helios': 'priest',      // Titan of the Sun - healing
};

/**
 * Get the heroClass for a Norse hero.
 * Uses authoritative HERO_ID_TO_CLASS mapping.
 */
export function getHeroClass(norseHeroId: string): string {
  // Check direct mapping first (covers all 92 heroes)
  if (HERO_ID_TO_CLASS[norseHeroId]) {
    return HERO_ID_TO_CLASS[norseHeroId];
  }
  
  // Fallback: extract from config key
  const configKey = HERO_ID_TO_CONFIG_KEY[norseHeroId];
  if (configKey) {
    return configKey.split('-')[0];
  }
  
  // Final fallback: check hero definition
  const hero = ALL_NORSE_HEROES[norseHeroId];
  if (hero?.heroClass) {
    return hero.heroClass;
  }
  
  debug.warn(`[getHeroClass] No class mapping found for hero: ${norseHeroId}`);
  return 'neutral';
}

/**
 * Get fixed cards for a Norse hero using their norseHeroId.
 * NOTE: Fixed cards have been removed. Deck cards are now user-built via heroDeckStore (30 cards per hero).
 * This function returns an empty array for backwards compatibility.
 */
export function getFixedCardsForNorseHero(norseHeroId: string): number[] {
  return [];
}
