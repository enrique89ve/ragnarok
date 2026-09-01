import { useAIAttackAnimationStore, type AIAttackEvent } from '../stores/aiAttackAnimationStore';
import { useGameStore } from '../stores/gameStore';
import {
  applyDamageToState,
  createResolvedAttackFromStates,
  type CombatStep,
} from '../services/AttackResolutionService';
import { CombatEventBus, type ImpactPhaseEvent } from '../services/CombatEventBus';
import type { GameState } from '../types';
import { debug } from '../config/debugConfig';
import { buildCombatPresentationFromResolvedAttack } from '@/game/effects/presentation/CombatPresentation';
import { useMatchStore } from '../match/store';

export type AIAttackImpactPayload = Omit<ImpactPhaseEvent, 'type' | 'id' | 'timestamp' | 'turn'>;

export interface AIAttackResolutionDeps {
  getDeferDamage: () => boolean;
  /** Peer matches resolve combat only through signed protocol commands. */
  isPeerMatch?: () => boolean;
  hasDamageBeenApplied?: (event: AIAttackEvent) => boolean;
  markDamageApplied: (event: AIAttackEvent) => void;
  getGameState: () => GameState;
  commitGameState: (state: GameState) => void;
  emitImpactPhase: (payload: AIAttackImpactPayload) => void;
  applyDamageToGameState?: (state: GameState, step: CombatStep) => GameState;
}

export interface AIAttackResolutionStoreDepsOptions {
  isPeerMatch?: () => boolean;
  hasDamageBeenApplied?: (event: AIAttackEvent) => boolean;
  onDamageApplied?: (event: AIAttackEvent) => void;
}

export type AIAttackResolutionResult =
  | { status: 'applied'; step: CombatStep; impactTargetId: string | null }
  | { status: 'skipped'; reason: 'legacy_mode' | 'already_applied' | 'peer_match' };

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

export function createAIAttackResolutionStoreDeps(
  options: AIAttackResolutionStoreDepsOptions = {}
): AIAttackResolutionDeps {
  return {
    getDeferDamage: () => useAIAttackAnimationStore.getState().deferDamage,
    isPeerMatch: options.isPeerMatch ?? (() => useMatchStore.getState().activeMatch?.opponent.kind === 'peer'),
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

  // A stale animation event must never become a second authority in a peer
  // match. P2P combat is resolved by the signed command transcript; this
  // presentation-only legacy queue is local-AI/legacy mode only.
  if (deps.isPeerMatch?.()) {
    debug.warn('[AI-ATTACK-ANIM] Skipping legacy event during peer match');
    deps.markDamageApplied(event);
    return { status: 'skipped', reason: 'peer_match' };
  }

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
  const resolvedAttack = createResolvedAttackFromStates(currentGameState, newState, step);
  if (impactTargetId) {
    deps.emitImpactPhase({
      attackerId: event.attackerId,
      targetId: impactTargetId,
      damageToTarget: resolvedAttack.damageToTarget,
      damageToAttacker: resolvedAttack.damageToAttacker,
      resolvedAttack,
      presentation: buildCombatPresentationFromResolvedAttack(resolvedAttack),
    });
    debug.animation(`[AI-ATTACK-ANIM] Emitted IMPACT_PHASE: ${event.attackerId} -> ${impactTargetId} (${event.damage} dmg)`);
  } else {
    debug.warn('[AI-ATTACK-ANIM] Skipping IMPACT_PHASE: missing targetId for minion attack (damage still applied)');
  }

  deps.commitGameState(newState);
  deps.markDamageApplied(event);

  return { status: 'applied', step, impactTargetId };
}
