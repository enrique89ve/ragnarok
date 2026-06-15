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
 *     CardMasteryBadge, CardRarityMark
 */

export { default as CardArt } from './CardArt';
export { default as CardHolo } from './CardHolo';
export { default as CardManaGem } from './CardManaGem';
export { default as CardStatGems } from './CardStatGems';
export { default as CardNamePlate } from './CardNamePlate';
export { default as CardCountBadge } from './CardCountBadge';
export { default as CardMasteryBadge } from './CardMasteryBadge';
export { default as CardRarityMark } from './CardRarityMark';
export { default as CardRankSuit } from './CardRankSuit';
export { default as CardCardBack } from './CardCardBack';
export { default as CardTribeLine } from './CardTribeLine';
export { default as CardDescription } from './CardDescription';
export { default as CardBloodPrice } from './CardBloodPrice';
export { default as CardEvolutionStars } from './CardEvolutionStars';
export { default as CardElementBadge } from './CardElementBadge';
export { default as CardPetStageBadge } from './CardPetStageBadge';
export { default as CardKeywordTooltip } from './CardKeywordTooltip';

export type { CardArtProps } from './CardArt';
export type { CardHoloProps } from './CardHolo';
export type { CardManaGemProps } from './CardManaGem';
export type { CardStatGemsProps } from './CardStatGems';
export type { CardNamePlateProps } from './CardNamePlate';
export type { CardCountBadgeProps } from './CardCountBadge';
export type { CardMasteryBadgeProps } from './CardMasteryBadge';
export type { CardRarityMarkProps } from './CardRarityMark';
export type { CardRankSuitProps } from './CardRankSuit';
export type { CardTribeLineProps } from './CardTribeLine';
export type { CardDescriptionProps } from './CardDescription';
export type { CardBloodPriceProps } from './CardBloodPrice';
export type { CardEvolutionStarsProps } from './CardEvolutionStars';
export type { CardElementBadgeProps } from './CardElementBadge';
export type { CardPetStageBadgeProps } from './CardPetStageBadge';
export type { CardKeywordTooltipProps } from './CardKeywordTooltip';
