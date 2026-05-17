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
 * portable to shared/protocol-core/. `startAttackAnimation` remains the
 * existing command/event ingress for local and P2P attack envelopes, so it
 * queues the visual marker and immediately delegates mechanics to the chess
 * combat resolver. Animation completion may only clear this marker.
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
import { resolveChessAttackIntent } from './chessCombatSlice';

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
    const attack = {
      attacker,
      defender,
      attackerPosition: { ...attacker.position },
      defenderPosition: { ...defender.position },
      isInstantKill
    };

    set({
      pendingAttackAnimation: {
        ...attack,
        timestamp: get()._nextLogTick()
      }
    });

    resolveChessAttackIntent(get, set, attack);
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
