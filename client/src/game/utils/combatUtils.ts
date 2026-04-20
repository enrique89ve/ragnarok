import { CardSuit } from '../types/PokerCombatTypes';
import { debug } from '../config/debugConfig';

export interface HeroPowerTarget {
  isMinion: boolean;
  isHero: boolean;
  isFriendly: boolean;
}

/**
 * Validates if a target is eligible for a specific hero power target type.
 */
export function isValidTargetForHeroPower(targetType: string, target: HeroPowerTarget): boolean {
  const { isMinion, isHero, isFriendly } = target;
  
  switch (targetType) {
    case 'friendly_minion':
    case 'friendly_mech':
      return isMinion && isFriendly;
    case 'enemy_minion':
      return isMinion && !isFriendly;
    case 'any_minion':
    case 'minion':
      return isMinion;
    case 'friendly_hero':
      return isHero && isFriendly;
    case 'enemy_hero':
      return isHero && !isFriendly;
    case 'friendly_character':
      return (isMinion || isHero) && isFriendly;
    case 'enemy_character':
    case 'enemy':
      return (isMinion || isHero) && !isFriendly;
    case 'any':
    case 'any_character':
      return isMinion || isHero;
    case 'none':
    case 'self':
    case 'all_enemies':
    case 'all_friendly':
    case 'random_enemy':
    case 'random_friendly':
      return false;
    default:
      debug.warn(`[isValidTargetForHeroPower] Unknown targetType: ${targetType}`);
      return false;
  }
}

/**
 * Gets the Norse rune character for a card suit.
 */
export const getNorseRune = (suit: CardSuit): string => {
  switch (suit) {
    case 'spades': return 'ᛏ';
    case 'hearts': return 'ᛉ';
    case 'diamonds': return 'ᛟ';
    case 'clubs': return 'ᚦ';
    default: return '';
  }
};

/**
 * Gets the Norse symbol character for a card suit.
 */
export const getNorseSymbol = (suit: CardSuit): string => {
  switch (suit) {
    case 'spades': return '⚔';
    case 'hearts': return '❂';
    case 'diamonds': return '◆';
    case 'clubs': return '⚒';
    default: return '';
  }
};

/**
 * Gets the color hex for a card suit.
 */
export const getSuitColor = (suit: CardSuit): string => {
  switch (suit) {
    case 'spades': return '#2d4a3d';
    case 'hearts': return '#8b3a3a';
    case 'diamonds': return '#5c4a2a';
    case 'clubs': return '#3a4a5c';
    default: return '#000000';
  }
};

/**
 * Maps card values to Norse themes (currently identity mapping for clarity).
 */
export const getNorseValue = (value: string): string => {
  return value;
};
