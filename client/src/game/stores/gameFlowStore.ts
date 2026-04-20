/**
 * GameFlowStore - Consolidated Game State Store
 * 
 * Manages game phase, screen transitions, and match state.
 * Integrates with GameFlowManager for state machine logic.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameFlowManager,
  GamePhase,
  GamePhaseTransition,
  MatchState,
  ArmyConfig,
} from '../flow/GameFlowManager';

interface GameFlowStore {
  phase: GamePhase;
  previousPhase: GamePhase | null;
  match: MatchState | null;
  isLoading: boolean;
  error: string | null;
  
  selectedKingId: string | null;
  selectedHeroIds: string[];
  selectedDeckIds: number[];
  
  transition: (transition: GamePhaseTransition) => boolean;

  setSelectedKing: (kingId: string) => void;
  addHeroToArmy: (heroId: string) => void;
  removeHeroFromArmy: (heroId: string) => void;
  setDeckIds: (deckIds: number[]) => void;
  clearArmySelection: () => void;
  
  startMatch: (opponentArmy: ArmyConfig) => void;
  updateScore: (player: 'player' | 'opponent', points: number) => void;
  incrementRound: () => void;
  endMatch: (winner: 'player' | 'opponent') => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const flowManager = new GameFlowManager();

let flowManagerUnsub: (() => void) | null = null;

export function initGameFlowSubscription() {
  if (flowManagerUnsub) return;
  flowManagerUnsub = flowManager.subscribe((state) => {
    useGameFlowStore.setState({
      phase: state.phase,
      previousPhase: state.previousPhase,
      match: state.match,
      isLoading: state.isLoading,
      error: state.error,
    });
  });
}

export function disposeGameFlowSubscription() {
  flowManagerUnsub?.();
  flowManagerUnsub = null;
}

export const useGameFlowStore = create<GameFlowStore>()(
  persist(
    (set, get) => {
      return {
        phase: 'MAIN_MENU',
        previousPhase: null,
        match: null,
        isLoading: false,
        error: null,
        selectedKingId: null,
        selectedHeroIds: [],
        selectedDeckIds: [],

        transition: (transition) => {
          return flowManager.transition(transition);
        },

        setSelectedKing: (kingId) => {
          set({ selectedKingId: kingId });
        },

        addHeroToArmy: (heroId) => {
          const current = get().selectedHeroIds;
          if (!current.includes(heroId) && current.length < 5) {
            set({ selectedHeroIds: [...current, heroId] });
          }
        },

        removeHeroFromArmy: (heroId) => {
          set({
            selectedHeroIds: get().selectedHeroIds.filter((id) => id !== heroId),
          });
        },

        setDeckIds: (deckIds) => {
          set({ selectedDeckIds: deckIds });
        },

        clearArmySelection: () => {
          set({
            selectedKingId: null,
            selectedHeroIds: [],
            selectedDeckIds: [],
          });
        },

        startMatch: (opponentArmy) => {
          const state = get();
          if (!state.selectedKingId) return;

          const playerArmy: ArmyConfig = {
            kingId: state.selectedKingId,
            heroIds: state.selectedHeroIds,
            deckIds: state.selectedDeckIds,
          };

          flowManager.startMatch(playerArmy, opponentArmy);
        },

        updateScore: (player, points) => {
          flowManager.updateScore(player, points);
        },

        incrementRound: () => {
          flowManager.incrementRound();
        },

        endMatch: (winner) => {
          flowManager.endMatch(winner);
        },

        setLoading: (loading) => {
          set({ isLoading: loading });
        },

        setError: (error) => {
          set({ error });
        },

        reset: () => {
          flowManager.reset();
          set({
            selectedKingId: null,
            selectedHeroIds: [],
            selectedDeckIds: [],
          });
        },
      };
    },
    {
      name: 'ragnarok-game-flow',
      partialize: (state) => ({
        selectedKingId: state.selectedKingId,
        selectedHeroIds: state.selectedHeroIds,
        selectedDeckIds: state.selectedDeckIds,
      }),
    }
  )
);

export { type GamePhase, type GamePhaseTransition, type MatchState, type ArmyConfig };
