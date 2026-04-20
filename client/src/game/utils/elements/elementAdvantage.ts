export type ElementType = 'fire' | 'water' | 'wind' | 'earth' | 'holy' | 'shadow' | 'neutral';

export const ELEMENT_STRENGTHS: Record<ElementType, ElementType[]> = {
  fire: ['earth', 'wind'],
  water: ['fire', 'shadow'],
  wind: ['water', 'holy'],
  earth: ['wind', 'shadow'],
  holy: ['fire', 'shadow'],
  shadow: ['holy', 'wind'],
  neutral: []
};

export const ELEMENT_WEAKNESSES: Record<ElementType, ElementType[]> = {
  fire: ['water', 'holy'],
  water: ['earth', 'wind'],
  wind: ['fire', 'earth'],
  earth: ['fire', 'water'],
  holy: ['wind', 'shadow'],
  shadow: ['water', 'earth'],
  neutral: []
};

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff6b35',
  water: '#4fc3f7',
  wind: '#81c784',
  earth: '#a1887f',
  holy: '#ffd54f',
  shadow: '#9c27b0',
  neutral: '#9e9e9e'
};

export const ELEMENT_ICONS: Record<ElementType, string> = {
  fire: '🔥',
  water: '💧',
  wind: '🌪️',
  earth: '🌍',
  holy: '✨',
  shadow: '🌑',
  neutral: '⚪'
};

export const ELEMENT_LABELS: Record<ElementType, string> = {
  fire: 'Fire',
  water: 'Water',
  wind: 'Wind',
  earth: 'Earth',
  holy: 'Holy',
  shadow: 'Shadow',
  neutral: 'Neutral'
};

export interface ElementAdvantageResult {
  hasAdvantage: boolean;
  attackBonus: number;
  healthBonus: number;
  armorBonus: number;
}

export const getElementAdvantage = (
  attackerElement: ElementType,
  defenderElement: ElementType
): ElementAdvantageResult => {
  const strengths = ELEMENT_STRENGTHS[attackerElement];
  if (strengths.includes(defenderElement)) {
    return {
      hasAdvantage: true,
      attackBonus: 2,
      healthBonus: 2,
      armorBonus: 20
    };
  }
  return {
    hasAdvantage: false,
    attackBonus: 0,
    healthBonus: 0,
    armorBonus: 0
  };
};

export const hasElementAdvantage = (
  attackerElement: ElementType,
  defenderElement: ElementType
): boolean => {
  const strengths = ELEMENT_STRENGTHS[attackerElement];
  return strengths.includes(defenderElement);
};

export const getElementColor = (element: ElementType): string => {
  return ELEMENT_COLORS[element] || ELEMENT_COLORS.neutral;
};

export const getElementIcon = (element: ElementType): string => {
  return ELEMENT_ICONS[element] || ELEMENT_ICONS.neutral;
};
