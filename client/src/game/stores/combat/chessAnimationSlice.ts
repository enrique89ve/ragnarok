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
  UnifiedCombatStore
} from './types';
import { debug } from '../../config/debugConfig';

const ATTACK_ANIMATION_BUDGET_MS = 2000;

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
    const timestamp = get()._nextLogTick();
    set({
      pendingAttackAnimation: {
        attacker,
        defender,
        attackerPosition: { ...attacker.position },
        defenderPosition: { ...defender.position },
        isInstantKill,
        timestamp,
      }
    });
    globalThis.setTimeout(() => {
      const pending = get().pendingAttackAnimation;
      if (pending && pending.timestamp === timestamp) {
        debug.chess('[Chess] attack animation budget exceeded — clearing marker so chess can continue');
        get().clearAttackAnimation();
      }
    }, ATTACK_ANIMATION_BUDGET_MS);
  },

  clearAttackAnimation: () => {
    set({ pendingAttackAnimation: null });
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
    set({
      pendingAttackAnimation: null,
      lastInstantKill: null,
      lastMineTriggered: null
    });
  }
});
