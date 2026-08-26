import { useAIAttackAnimationStore, type AIAttackEvent } from '../stores/aiAttackAnimationStore';
import { useGameStore } from '../stores/gameStore';
import { applyDamageToState, type CombatStep } from '../services/AttackResolutionService';
import { CombatEventBus, type ImpactPhaseEvent } from '../services/CombatEventBus';
import type { GameState } from '../types';
import { debug } from '../config/debugConfig';
import { buildCombatPresentation } from '@/game/effects/presentation/CombatPresentation';

export type AIAttackImpactPayload = Omit<ImpactPhaseEvent, 'type' | 'id' | 'timestamp' | 'turn'>;

export interface AIAttackResolutionDeps {
  getDeferDamage: () => boolean;
  hasDamageBeenApplied?: (event: AIAttackEvent) => boolean;
  markDamageApplied: (event: AIAttackEvent) => void;
  getGameState: () => GameState;
  commitGameState: (state: GameState) => void;
  emitImpactPhase: (payload: AIAttackImpactPayload) => void;
  applyDamageToGameState?: (state: GameState, step: CombatStep) => GameState;
}

export interface AIAttackResolutionStoreDepsOptions {
  hasDamageBeenApplied?: (event: AIAttackEvent) => boolean;
  onDamageApplied?: (event: AIAttackEvent) => void;
}

export type AIAttackResolutionResult =
  | { status: 'applied'; step: CombatStep; impactTargetId: string | null }
  | { status: 'skipped'; reason: 'legacy_mode' | 'already_applied' };

export function createAIAttackCombatStep(event: AIAttackEvent): CombatStep {
  return {
    id: event.combatStepId,
    attackerId: event.attackerId,
    attackerName: event.attackerName,
    attackerAttack: event.damage,
    targetId: event.targetId,
    targetName: event.targetName,
    targetType: event.targetType,
    targetAttack: event.counterDamage,
    damage: event.damage,
    counterDamage: event.counterDamage,
    attackerHasDivineShield: event.attackerHasDivineShield,
    defenderHasDivineShield: event.defenderHasDivineShield,
    resolved: false,
    timestamp: event.timestamp,
    attackerSide: event.attackerSide
  };
}

export function getAIAttackImpactTargetId(event: AIAttackEvent): string | null {
  if (event.targetType === 'hero') {
    return event.attackerSide === 'opponent' ? 'player-hero' : 'opponent-hero';
  }

  return event.targetId;
}

function opposingSide(side: 'player' | 'opponent'): 'player' | 'opponent' {
  return side === 'player' ? 'opponent' : 'player';
}

function combatantDied(
  state: GameState,
  side: 'player' | 'opponent',
  type: 'hero' | 'minion',
  id: string | null,
): boolean {
  const player = state.players?.[side];
  if (!player) return false;
  if (type === 'hero') {
    return (player.heroHealth ?? player.health) <= 0;
  }
  return id !== null && !player.battlefield.some(card => card.instanceId === id);
}

export function createAIAttackResolutionStoreDeps(
  options: AIAttackResolutionStoreDepsOptions = {}
): AIAttackResolutionDeps {
  return {
    getDeferDamage: () => useAIAttackAnimationStore.getState().deferDamage,
    hasDamageBeenApplied: (event) => {
      if (options.hasDamageBeenApplied?.(event)) {
        return true;
      }

      const currentAttack = useAIAttackAnimationStore.getState().currentAttack;
      return currentAttack?.id === event.id && currentAttack.damageApplied === true;
    },
    markDamageApplied: (event) => {
      options.onDamageApplied?.(event);
      useAIAttackAnimationStore.getState().markDamageApplied();
    },
    getGameState: () => useGameStore.getState().gameState,
    commitGameState: (state) => useGameStore.getState().setGameState(state),
    emitImpactPhase: (payload) => {
      CombatEventBus.emitImpactPhase(payload);
    },
    applyDamageToGameState: applyDamageToState
  };
}

export function resolveAIAttackEvent(
  event: AIAttackEvent,
  deps: AIAttackResolutionDeps
): AIAttackResolutionResult {
  const currentDeferDamage = deps.getDeferDamage();
  debug.animation(`[AI-ATTACK-ANIM] resolveAIAttackEvent called: deferDamage=${currentDeferDamage}, damageApplied=${event.damageApplied}`);

  if (!currentDeferDamage) {
    debug.animation('[AI-ATTACK-ANIM] Skipping - damage not deferred (legacy mode)');
    deps.markDamageApplied(event);
    return { status: 'skipped', reason: 'legacy_mode' };
  }

  if (event.damageApplied || deps.hasDamageBeenApplied?.(event)) {
    debug.animation(`[AI-ATTACK-ANIM] Skipping - damage already applied for: ${event.attackerName}`);
    deps.markDamageApplied(event);
    return { status: 'skipped', reason: 'already_applied' };
  }

  debug.animation(`[AI-ATTACK-ANIM] Applying real-time damage: ${event.attackerName} -> ${event.targetName} (${event.damage} dmg)`);

  const impactTargetId = getAIAttackImpactTargetId(event);
  const step = createAIAttackCombatStep(event);
  const currentGameState = deps.getGameState();
  const applyDamage = deps.applyDamageToGameState ?? applyDamageToState;
  // Calculate the resolved state before publishing the presentation event so
  // the event can carry lethal outcomes while the DOM still has the target.
  // The commit remains after the event; this changes no gameplay authority.
  const newState = applyDamage(currentGameState, step);
  const defenderSide = opposingSide(step.attackerSide);
  if (impactTargetId) {
    deps.emitImpactPhase({
      attackerId: event.attackerId,
      targetId: impactTargetId,
      damageToTarget: event.damage,
      damageToAttacker: event.counterDamage,
      presentation: buildCombatPresentation(step, {
        targetLethal: combatantDied(newState, defenderSide, step.targetType, step.targetId),
        attackerLethal: combatantDied(newState, step.attackerSide, 'minion', step.attackerId),
      }),
    });
    debug.animation(`[AI-ATTACK-ANIM] Emitted IMPACT_PHASE: ${event.attackerId} -> ${impactTargetId} (${event.damage} dmg)`);
  } else {
    debug.warn('[AI-ATTACK-ANIM] Skipping IMPACT_PHASE: missing targetId for minion attack (damage still applied)');
  }

  deps.commitGameState(newState);
  deps.markDamageApplied(event);

  return { status: 'applied', step, impactTargetId };
}
