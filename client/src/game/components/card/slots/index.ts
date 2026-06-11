/**
 * card/slots — composable children.
 *
 * Each slot reads shape / size / rarity / element / rootRef from
 * CardFrameContext, never via prop drilling. Slots are visually
 * optional — a <CardFrame> with no children renders the chrome
 * and PNG/SVG layers only.
 *
 * Art-layer slots (extracted to z:0 by the frame):
 *   - CardArt      — <img> with lazy decode, fallback panel
 *   - CardRankSuit — poker rank+suit (replaces PlayingCard face)
 *   - CardCardBack — poker face-down (replaces PlayingCard.faceDown)
 *
 * Marker slot:
 *   - CardHolo     — presence enables frame holo + mouse handlers
 *
 * Overlay slots (render in tree order on top of chrome):
 *   - CardManaGem, CardStatGems, CardNamePlate, CardCountBadge,
 *     CardMasteryBadge
 */

export { default as CardArt } from './CardArt';
export { default as CardHolo } from './CardHolo';
export { default as CardManaGem } from './CardManaGem';
export { default as CardStatGems } from './CardStatGems';
export { default as CardNamePlate } from './CardNamePlate';
export { default as CardCountBadge } from './CardCountBadge';
export { default as CardMasteryBadge } from './CardMasteryBadge';
export { default as CardRankSuit } from './CardRankSuit';
export { default as CardCardBack } from './CardCardBack';

export type { CardArtProps } from './CardArt';
export type { CardHoloProps } from './CardHolo';
export type { CardManaGemProps } from './CardManaGem';
export type { CardStatGemsProps } from './CardStatGems';
export type { CardNamePlateProps } from './CardNamePlate';
export type { CardCountBadgeProps } from './CardCountBadge';
export type { CardMasteryBadgeProps } from './CardMasteryBadge';
export type { CardRankSuitProps } from './CardRankSuit';
