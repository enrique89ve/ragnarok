/**
 * Card Data Model
 * 
 * This file defines the structure of card data used in the game.
 */

/**
 * Interface representing a game card
 */
export interface CardData {
  id: number;
  name: string;
  description?: string;
  manaCost?: number;
  attack?: number;
  health?: number;
  durability?: number;
  type: string;
  class: string;
  rarity?: string;
  keywords?: string[];
  collectible?: boolean;
  battlecry?: {
    type: string;
    value?: number;
    targetType?: string;
    requiresTarget?: boolean;
    options?: any[];
  };
  deathrattle?: {
    type: string;
    value?: number;
    minionId?: number;
    options?: any[];
  };
  spellEffect?: {
    type: string;
    value?: number;
    targetType?: string;
    requiresTarget?: boolean;
    options?: any[];
  };
  chooseOneOptions?: CardData[];
}

/**
 * Interface for battlecry effects
 */
export interface BattlecryEffect {
  type: string;
  value?: number;
  targetType?: string;
  requiresTarget?: boolean;
  options?: any[];
}

/**
 * Interface for deathrattle effects
 */
export interface DeathrattleEffect {
  type: string;
  value?: number;
  minionId?: number;
  options?: any[];
}

/**
 * Interface for spell effects
 */
export interface SpellEffect {
  type: string;
  value?: number;
  targetType?: string;
  requiresTarget?: boolean;
  options?: any[];
}

/**
 * Enum for card types
 */
export enum CardType {
  MINION = 'minion',
  SPELL = 'spell',
  WEAPON = 'weapon',
  HERO = 'hero',
  HERO_POWER = 'hero_power'
}

/**
 * Enum for card rarities
 */
export enum CardRarity {
  BASIC = 'basic',
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  MYTHIC = 'mythic'
}

/**
 * Enum for card classes
 */
export enum CardClass {
  NEUTRAL = 'Neutral',
  WARRIOR = 'Warrior',
  MAGE = 'Mage',
  DRUID = 'Druid',
  WARLOCK = 'Warlock',
  PRIEST = 'Priest',
  BERSERKER = 'Berserker',
  PALADIN = 'Paladin',
  HUNTER = 'Hunter',
  SHAMAN = 'Shaman',
  ROGUE = 'Rogue'
}

/**
 * Enum for common card keywords
 */
export enum CardKeyword {
  TAUNT = 'taunt',
  DIVINE_SHIELD = 'divine_shield',
  CHARGE = 'charge',
  WINDFURY = 'windfury',
  STEALTH = 'stealth',
  POISONOUS = 'poisonous',
  LIFESTEAL = 'lifesteal',
  RUSH = 'rush',
  REBORN = 'reborn',
  COMBO = 'combo',
  BATTLECRY = 'battlecry',
  DEATHRATTLE = 'deathrattle',
  SPELLPOWER = 'spellpower',
  OVERLOAD = 'overload',
  SECRET = 'secret',
  CHOOSE_ONE = 'choose_one'
}