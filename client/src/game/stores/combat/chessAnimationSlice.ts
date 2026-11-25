/**
 * ChessAnimationSlice - UI animation flags for chess phase
 *
 * Holds non-canonical UI markers that drive transient cinematic effects
 * during chess play: attack-strike animation, instant-kill flash, and
 * mine-trigger overlay. These fields are NOT part of the canonical game
 * state and do NOT enter `computeStateHash`. They are render-driven
 * freshness markers consumed by UI hooks (useChessBoardInteractions,
 * useKingChessAbility, ChessBoard).
 *
 * Separating the marker fields from gameplay state keeps engines pure and
 * portable to shared/protocol-core/. `startAttackAnimation` only queues the
 * transient visual marker. Attack mechanics are owned by chessCombatSlice.
 */

import { StateCreator } from 'zustand';
import {
  ChessPiece,
  ChessBoardPosition,
  ChessPieceType,
  ActiveMine
} from '../../types/ChessTypes';
import {
  ChessAnimationSlice,
  PendingAttackAnimation,
  UnifiedCombatStore
} from './types';
import { debug } from '../../config/debugConfig';
import {
  gameEffectCoordinator,
  type GameEffectHandle,
} from '@/game/effects/core/gameEffectCoordinator';

export const ATTACK_ANIMATION_BUDGET_MS = 4500;
let pendingAttackBudgetHandle: GameEffectHandle | null = null;

function cancelAttackAnimationBudget(): void {
  pendingAttackBudgetHandle?.cancel();
  pendingAttackBudgetHandle = null;
}

export const createChessAnimationSlice: StateCreator<
  UnifiedCombatStore,
  [],
  [],
  ChessAnimationSlice
> = (set, get) => ({
  pendingAttackAnimation: null,
  lastInstantKill: null,
  lastMineTriggered: null,

  startAttackAnimation: (attacker: ChessPiece, defender: ChessPiece, isInstantKill: boolean) => {
    const animation: PendingAttackAnimation = {
      attacker,
      defender,
      attackerPosition: { ...attacker.position },
      defenderPosition: { ...defender.position },
      isInstantKill,
      timestamp: get()._nextLogTick(),
    };
    set({ pendingAttackAnimation: animation });
    cancelAttackAnimationBudget();
    pendingAttackBudgetHandle = gameEffectCoordinator.schedule({
      owner: 'chess-animation',
      lane: 'attack-budget',
      key: 'pending-attack',
      priority: 'high',
      delayMs: ATTACK_ANIMATION_BUDGET_MS,
      run: () => {
        pendingAttackBudgetHandle = null;
        if (get().clearAttackAnimation(animation)) {
          debug.chess('[Chess] Attack animation budget exceeded');
        }
      },
    });
  },

  clearAttackAnimation: (animation) => {
    if (get().pendingAttackAnimation !== animation) return false;
    cancelAttackAnimationBudget();
    set({ pendingAttackAnimation: null });
    return true;
  },

  recordInstantKill: (position: ChessBoardPosition, attackerType: ChessPieceType) => {
    set({
      lastInstantKill: {
        position,
        attackerType,
        timestamp: get()._nextLogTick()
      }
    });
  },

  recordMineTriggered: (mine: ActiveMine, targetPieceId: string) => {
    set({
      lastMineTriggered: { mine, targetPieceId }
    });
  },

  clearMineTriggered: () => {
    set({ lastMineTriggered: null });
  },

  clearChessAnimations: () => {
    cancelAttackAnimationBudget();
    set({
      pendingAttackAnimation: null,
      lastInstantKill: null,
      lastMineTriggered: null
    });
  }
});
