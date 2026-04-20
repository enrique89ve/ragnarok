/**
 * Combat Hooks Module
 * 
 * Exports all combat-related React hooks for the Ragnarok combat system.
 */

export { useCombatEvents } from './useCombatEvents';
export type { ShowdownCelebration, HeroDeathState } from './useCombatEvents';

export { useCombatTimer } from './useCombatTimer';

export { usePokerAI } from './usePokerAI';

export { usePokerPhases } from './usePokerPhases';

export { useTurnOrchestrator } from './useTurnOrchestrator';
export type { UseTurnOrchestratorReturn, UseTurnOrchestratorOptions } from './useTurnOrchestrator';

export { useElementalBuff } from './useElementalBuff';
export type { ElementalBuffState } from './useElementalBuff';

export { useRagnarokCombatController } from './useRagnarokCombatController';
export type { 
  UseRagnarokCombatControllerOptions, 
  UseRagnarokCombatControllerReturn,
  HeroPowerTargetingState,
  HeroDeathAnimationState 
} from './useRagnarokCombatController';
