export {
  type ElementType,
  type ElementAdvantageResult,
  ELEMENT_STRENGTHS,
  ELEMENT_WEAKNESSES,
  ELEMENT_COLORS,
  ELEMENT_ICON_NAMES,
  ELEMENT_LABELS,
  getElementAdvantage,
  hasElementAdvantage,
  getElementColor,
  getElementIconName
} from './elementAdvantage';

// ELEMENT_ICONS / getElementIcon are legacy emoji string maps retained for
// chess-only renderers. They are NOT re-exported from the public barrel to
// prevent accidental use in non-chess UI; consumers should import directly
// from './elementIconsLegacy' or use getElementIconName instead.
