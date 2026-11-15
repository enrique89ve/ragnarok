/**
 * Animation System Index
 *
 * This module exports the unified animation orchestration system.
 * All new animation code should use these exports.
 *
 * Migration Guide:
 * ----------------
 * New code should use useAnimationOrchestrator for queued overlay effects (legacy board)
 * or combat VFX handlers for poker. Damage and heal numbers use combatDamageFloater.
 */

export {
  useAnimationOrchestrator,
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
export { default as MythicEntrance } from './MythicEntrance';
export { default as TurnTransition } from './TurnTransition';
