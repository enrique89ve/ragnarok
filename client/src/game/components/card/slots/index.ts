/**
 * card/slots — composable children.
 *
 * Each slot reads shape / size / rarity / element / rootRef from
 * CardFrameContext, never via prop drilling. Slots are visually
 * optional — a <CardFrame> with no children renders the chrome
 * and PNG/SVG layers only.
 */

export { default as CardArt } from './CardArt';
export { default as CardHolo } from './CardHolo';
export { default as CardManaGem } from './CardManaGem';
export { default as CardStatGems } from './CardStatGems';
export { default as CardNamePlate } from './CardNamePlate';
export { default as CardCountBadge } from './CardCountBadge';
export { default as CardMasteryBadge } from './CardMasteryBadge';

export type { CardArtProps } from './CardArt';
export type { CardHoloProps } from './CardHolo';
export type { CardManaGemProps } from './CardManaGem';
export type { CardStatGemsProps } from './CardStatGems';
export type { CardNamePlateProps } from './CardNamePlate';
export type { CardCountBadgeProps } from './CardCountBadge';
export type { CardMasteryBadgeProps } from './CardMasteryBadge';
