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
import { CardData, CardType, HeroClass } from '../types';
import { cardRegistry } from './cardRegistry';

const allCards: CardData[] = cardRegistry;

const idMap = new Map<number, CardData>(allCards.map(c => [c.id as number, c]));
const classCache = new Map<string, CardData[]>();
const keywordCache = new Map<string, CardData[]>();
const typeCache = new Map<string, CardData[]>();

export const getCardById = (id: number): CardData | undefined => {
	return idMap.get(id);
};

export const getCardsByClass = (className: HeroClass | 'neutral'): CardData[] => {
	if (classCache.has(className)) return classCache.get(className)!;
	const result = allCards.filter(card => {
		if ('heroClass' in card && card.heroClass === className) {
			return true;
		}
		if ('dualClassInfo' in card && card.dualClassInfo && (card.dualClassInfo as any).classes.includes(className as HeroClass)) {
			return true;
		}
		return false;
	});
	classCache.set(className, result);
	return result;
};

export const getCardsByKeyword = (keyword: string): CardData[] => {
	if (keywordCache.has(keyword)) return keywordCache.get(keyword)!;
	const result = allCards.filter(card => card.keywords && card.keywords.includes(keyword));
	keywordCache.set(keyword, result);
	return result;
};

export const getCardsByType = (type: CardType): CardData[] => {
	if (typeCache.has(type)) return typeCache.get(type)!;
	const result = allCards.filter(card => card.type === type);
	typeCache.set(type, result);
	return result;
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
  return allCards.filter(card => card.rarity === 'mythic');
};

export const getLegendaryCards = getMythicCards;

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
  return allCards.filter(card => 
    card.type === 'minion' && 
    'heroClass' in card && 
    card.heroClass !== 'neutral'
  );
};

/** @deprecated Use getCardsByKeyword('battlecry') or similar */
export const getMechanicCards = (): CardData[] => {
  return allCards.filter(card => 
    card.keywords && (
      card.keywords.includes('battlecry') || 
      card.keywords.includes('deathrattle') ||
      card.keywords.includes('combo')
    )
  );
};

export default allCards;
