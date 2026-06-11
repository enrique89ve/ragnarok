/**
 * Combat Components Index
 * 
 * Extracted UI components from RagnarokCombatArena.tsx
 * Each component is now modular and can be tested/maintained independently
 */

export { PlayingCard, getNorseRune, getNorseSymbol, getSuitColor, getNorseValue } from './PlayingCard';
export { DamageIndicator, type DamageAnimation } from './DamageIndicator';
export { HeroDeathAnimation } from './HeroDeathAnimation';
export { BattlefieldHero, type BattlefieldHeroProps } from './BattlefieldHero';
export { HeroBridge, type HeroBridgeProps } from './HeroBridge';
export { ShowdownCelebration } from './ShowdownCelebration';
export { TargetingPrompt, type TargetingPromptProps } from './TargetingPrompt';
export { HeroPowerPrompt, type HeroPowerPromptProps } from './HeroPowerPrompt';
export { ElementBuffPopup } from './ElementBuffPopup';
export { PhaseBanner } from './PhaseBanner';
