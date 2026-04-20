/**
 * SharedCombatSlice - Common combat state and actions
 * 
 * Manages phase, logging, animations, and turn state that are shared
 * across all combat domains.
 */

import { StateCreator } from 'zustand';
import { TurnManager, TurnOwner } from '../../flow/TurnManager';
import { 
  CombatPhase, 
  CombatLogEntry, 
  SharedCombatSlice,
  UnifiedCombatStore
} from './types';

const turnManager = new TurnManager();

export const createSharedCombatSlice: StateCreator<
  UnifiedCombatStore,
  [],
  [],
  SharedCombatSlice
> = (set, get) => ({
  combatPhase: 'SETUP',
  combatLog: [],
  pendingAnimations: [],
  turnState: null,

  setCombatPhase: (phase) => {
    set({ combatPhase: phase });
    get().addLogEntry({
      id: `phase_${Date.now()}`,
      timestamp: Date.now(),
      type: 'phase',
      message: `Combat phase changed to ${phase}`,
    });
  },

  addLogEntry: (entry) => {
    set({
      combatLog: [...get().combatLog, entry].slice(-100),
    });
  },

  queueAnimation: (animationId) => {
    set({
      pendingAnimations: [...get().pendingAnimations, animationId],
    });
  },

  completeAnimation: (animationId) => {
    set({
      pendingAnimations: get().pendingAnimations.filter((id) => id !== animationId),
    });
  },

  startTurn: (turn) => {
    turnManager.startTurn(turn);
    set({ turnState: turnManager.getState() });
  },

  endTurn: () => {
    turnManager.endTurn();
    set({ turnState: turnManager.getState() });
  },
});

export { turnManager };
