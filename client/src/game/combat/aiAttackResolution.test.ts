import { describe, expect, it, vi } from 'vitest';

vi.mock('../stores/gameStore', () => ({
  useGameStore: {
    getState: () => ({
      gameState: { id: 'mock-current-state' },
      setGameState: () => undefined
    })
  }
}));

import {
  resolveAIAttackEvent,
  type AIAttackResolutionDeps
} from './aiAttackResolution';
import type { AIAttackEvent } from '../stores/aiAttackAnimationStore';
import type { CombatStep } from '../services/AttackResolutionService';
import type { GameState } from '../types';

const currentState = { id: 'current-state' } as GameState;
const nextState = { id: 'next-state' } as GameState;

function createEvent(overrides: Partial<AIAttackEvent> = {}): AIAttackEvent {
  return {
    id: 'attack-1',
    attackerId: 'ai-minion-1',
    attackerName: 'Draugr',
    targetId: null,
    targetName: 'Player Hero',
    targetType: 'hero',
    damage: 4,
    counterDamage: 0,
    timestamp: 1234,
    damageApplied: false,
    combatStepId: 'combat-step-1',
    attackerHasDivineShield: false,
    defenderHasDivineShield: false,
    attackerSide: 'opponent',
    ...overrides
  };
}

function createDeps(overrides: Partial<AIAttackResolutionDeps> = {}) {
  const appliedAttackIds = new Set<string>();
  const applyDamageToGameState = vi.fn((_state: GameState, _step: CombatStep) => nextState);
  const deps: AIAttackResolutionDeps = {
    getDeferDamage: () => true,
    hasDamageBeenApplied: (event) => appliedAttackIds.has(event.id),
    markDamageApplied: (event) => {
      appliedAttackIds.add(event.id);
    },
    getGameState: () => currentState,
    commitGameState: vi.fn(),
    emitImpactPhase: vi.fn(),
    applyDamageToGameState,
    ...overrides
  };

  return { deps, appliedAttackIds, applyDamageToGameState };
}

describe('resolveAIAttackEvent', () => {
  it('applies deferred AI hero damage through the resolver seam', () => {
    const event = createEvent();
    const { deps, appliedAttackIds, applyDamageToGameState } = createDeps();

    const result = resolveAIAttackEvent(event, deps);

    expect(result.status).toBe('applied');
    expect(deps.emitImpactPhase).toHaveBeenCalledWith(expect.objectContaining({
      attackerId: 'ai-minion-1',
      targetId: 'player-hero',
      damageToTarget: 4,
      damageToAttacker: 0
    }));
    expect(deps.emitImpactPhase).toHaveBeenCalledWith(expect.objectContaining({
      presentation: expect.objectContaining({
        action: 'melee-hit',
        target: expect.objectContaining({
          target: { type: 'hero', side: 'player' },
        }),
      }),
    }));
    expect(applyDamageToGameState).toHaveBeenCalledWith(
      currentState,
      expect.objectContaining({
        id: 'combat-step-1',
        attackerId: 'ai-minion-1',
        targetId: null,
        targetType: 'hero',
        damage: 4,
        counterDamage: 0,
        attackerSide: 'opponent'
      })
    );
    expect(deps.commitGameState).toHaveBeenCalledWith(nextState);
    expect(appliedAttackIds.has(event.id)).toBe(true);
  });

  it('uses minion instance ids for impact events', () => {
    const event = createEvent({
      targetId: 'player-minion-2',
      targetName: 'Shieldmaiden',
      targetType: 'minion',
      counterDamage: 2
    });
    const { deps } = createDeps();

    const result = resolveAIAttackEvent(event, deps);

    expect(result).toMatchObject({ status: 'applied', impactTargetId: 'player-minion-2' });
    expect(deps.emitImpactPhase).toHaveBeenCalledWith(expect.objectContaining({
      attackerId: 'ai-minion-1',
      targetId: 'player-minion-2',
      damageToTarget: 4,
      damageToAttacker: 2
    }));
    expect(deps.emitImpactPhase).toHaveBeenCalledWith(expect.objectContaining({
      presentation: expect.objectContaining({
        target: expect.objectContaining({
          target: { type: 'card', instanceId: 'player-minion-2' },
        }),
        counter: expect.objectContaining({
          target: { type: 'card', instanceId: 'ai-minion-1' },
        }),
      }),
    }));
  });

  it('keeps legacy non-deferred damage mode as a mark-only skip', () => {
    const event = createEvent();
    const { deps, appliedAttackIds, applyDamageToGameState } = createDeps({
      getDeferDamage: () => false
    });

    const result = resolveAIAttackEvent(event, deps);

    expect(result).toEqual({ status: 'skipped', reason: 'legacy_mode' });
    expect(deps.emitImpactPhase).not.toHaveBeenCalled();
    expect(applyDamageToGameState).not.toHaveBeenCalled();
    expect(deps.commitGameState).not.toHaveBeenCalled();
    expect(appliedAttackIds.has(event.id)).toBe(true);
  });

  it('is idempotent when a fallback path repeats the same attack event', () => {
    const event = createEvent();
    const { deps, applyDamageToGameState } = createDeps();

    const first = resolveAIAttackEvent(event, deps);
    const second = resolveAIAttackEvent(event, deps);

    expect(first.status).toBe('applied');
    expect(second).toEqual({ status: 'skipped', reason: 'already_applied' });
    expect(deps.emitImpactPhase).toHaveBeenCalledTimes(1);
    expect(applyDamageToGameState).toHaveBeenCalledTimes(1);
    expect(deps.commitGameState).toHaveBeenCalledTimes(1);
  });
});
