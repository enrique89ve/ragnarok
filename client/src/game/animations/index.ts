/**
 * Animation System Index
 * 
 * This module exports the unified animation orchestration system.
 * All new animation code should use these exports.
 * 
 * Migration Guide:
 * ----------------
 * Old: import { useSummonEffectStore } from '../stores/summonEffectStore'
 * New: import { scheduleSummonEffect, useAnimationOrchestrator } from '../animations'
 * 
 * Old: import CardSummonEffect from '../components/CardSummonEffect'
 * New: Use <AnimationOverlay /> component which renders all effects via portal
 */

export {
  useAnimationOrchestrator,
  scheduleSummonEffect,
  scheduleAttackEffect,
  scheduleDamageEffect,
  scheduleHealEffect,
  scheduleAnnouncementEffect,
  cancelAllAnimations,
  cancelAnimationsByPhase,
  cancelAnimationsByCategory,
  type AnimationEffect,
  type AnimationCategory,
  type AnimationPriority,
  type Position,
} from './UnifiedAnimationOrchestrator';

export { useAnimationStore, AnimationProvider, useAnimation } from './AnimationManager';
export { default as AnimationManager } from './AnimationManager';

export { default as BoardRippleEffect } from './BoardRippleEffect';
export { default as ElementalAttackTrail } from './ElementalAttackTrail';
export { default as EnhancedDeathAnimation } from './EnhancedDeathAnimation';
export { default as EnvironmentalEffect } from './EnvironmentalEffect';
export { default as LegendaryEntrance } from './LegendaryEntrance';
export { default as TurnTransition } from './TurnTransition';
