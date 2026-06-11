/**
 * Legacy emoji-element map kept for chess visual consumers only.
 * New code should use ELEMENT_ICON_NAMES from elementAdvantage.ts + GameIcon.
 *
 * Chess renderers (ChesPiece, ChessPhase) import these strings directly.
 * Per the recipe, chess icons are exempt from G4 migration.
 */

import type { ElementType } from './elementAdvantage';

export const ELEMENT_ICONS: Record<ElementType, string> = {
  fire: '🔥',
  water: '💧',
  wind: '🌪️',
  earth: '🌍',
  holy: '✨',
  shadow: '🌑',
  neutral: '⚪'
};

export const getElementIcon = (element: ElementType): string => {
  return ELEMENT_ICONS[element] || ELEMENT_ICONS.neutral;
};
