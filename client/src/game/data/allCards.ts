/**
 * allCards.ts - Legacy Compatibility Layer
 *
 * DEPRECATED: This file is maintained for backward compatibility only.
 * New code should import directly from cardRegistry:
 *   import { cardRegistry, getCardById } from './cardRegistry';
 *
 * This file now re-exports from cardRegistry as the single source of truth.
 * All 1370+ cards are managed in cardRegistry/sets/ with proper organization.
 *
 * @see cardRegistry/index.ts for the canonical card data source
 */
import type { CardData, CardType, HeroClass } from '../types';
import {
	cardRegistry,
	getCardById as getCanonicalCardById,
	getCardsByPredicate,
} from './cardRegistry';

const allCards: CardData[] = cardRegistry;

export const getCardById = getCanonicalCardById;

export const getCardsByClass = (className: HeroClass | 'neutral'): CardData[] => {
	return getCardsByPredicate(card => {
		if ('heroClass' in card && card.heroClass === className) {
			return true;
		}
		if ('dualClassInfo' in card) {
			const dualClassInfo: unknown = card.dualClassInfo;
			if (
				typeof dualClassInfo === 'object'
				&& dualClassInfo !== null
				&& 'classes' in dualClassInfo
				&& Array.isArray(dualClassInfo.classes)
				&& dualClassInfo.classes.includes(className)
			) return true;
		}
		return false;
	});
};

export const getCardsByKeyword = (keyword: string): CardData[] => {
	return getCardsByPredicate(card => card.keywords?.includes(keyword) === true);
};

export const getCardsByType = (type: CardType): CardData[] => {
	return getCardsByPredicate(card => card.type === type);
};

// ============================================================================
// KEYWORD-SPECIFIC GETTERS
// Convenience functions for common keyword filters
// ============================================================================

export const getTradeableCards = (): CardData[] => getCardsByKeyword('tradeable');
export const getInspireCards = (): CardData[] => getCardsByKeyword('inspire');
export const getDualClassCards = (): CardData[] => getCardsByKeyword('dual_class');
export const getDiscoverCards = (): CardData[] => getCardsByKeyword('discover');
export const getQuestCards = (): CardData[] => getCardsByKeyword('quest');
export const getEchoCards = (): CardData[] => getCardsByKeyword('echo');
export const getSpellburstCards = (): CardData[] => getCardsByKeyword('spellburst');
export const getRebornCards = (): CardData[] => getCardsByKeyword('reborn');
export const getMagneticCards = (): CardData[] => getCardsByKeyword('magnetic');
export const getFrenzyCards = (): CardData[] => getCardsByKeyword('frenzy');
export const getDormantCards = (): CardData[] => getCardsByKeyword('dormant');
export const getOutcastCards = (): CardData[] => getCardsByKeyword('outcast');

// ============================================================================
// TYPE-SPECIFIC GETTERS
// Convenience functions for common type filters
// ============================================================================

export const getMythicCards = (): CardData[] => {
  return getCardsByPredicate(card => card.rarity === 'mythic');
};

export const getSpellCards = (): CardData[] => getCardsByType('spell');

export const getMinionCards = (): CardData[] => getCardsByType('minion');

export const getWeaponCards = (): CardData[] => getCardsByType('weapon');

// ============================================================================
// DEPRECATED FUNCTIONS
// These exist for backward compatibility but return empty arrays
// or reference the main registry. They should not be used in new code.
// ============================================================================

/** @deprecated Use getCardsByClass instead */
export const getClassMinions = (): CardData[] => {
  return getCardsByPredicate(card =>
    card.type === 'minion' &&
    'heroClass' in card &&
    card.heroClass !== 'neutral'
  );
};

/** @deprecated Use getCardsByKeyword('battlecry') or similar */
export const getMechanicCards = (): CardData[] => {
  return getCardsByPredicate(card =>
    card.keywords?.some(keyword => (
      keyword === 'battlecry' ||
      keyword === 'deathrattle' ||
      keyword === 'combo'
    )) === true
  );
};

export default allCards;
