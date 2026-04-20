/**
 * Game Phase Adapter Hook
 * 
 * Bridges legacy gameStore screen management with new gameFlowStore.
 * Components import this instead of directly using either store.
 */

import { useGameFlowStore, GamePhase } from '../stores/gameFlowStore';
import { MIGRATION_FLAGS } from './useAdapterConfig';
import { debug } from '../config/debugConfig';

export type LegacyScreen = 
  | 'main_menu'
  | 'deck_builder'
  | 'army_selection'
  | 'loading'
  | 'chess_board'
  | 'combat'
  | 'match_end';

const PHASE_TO_SCREEN: Record<GamePhase, LegacyScreen> = {
  MAIN_MENU: 'main_menu',
  ARMY_SELECTION: 'army_selection',
  LOADING_MATCH: 'loading',
  CHESS_BOARD: 'chess_board',
  POKER_COMBAT: 'combat',
  MINION_COMBAT: 'combat',
  MATCH_END: 'match_end',
  REWARDS: 'match_end',
};

const SCREEN_TO_PHASE: Record<LegacyScreen, GamePhase> = {
  main_menu: 'MAIN_MENU',
  deck_builder: 'MAIN_MENU',
  army_selection: 'ARMY_SELECTION',
  loading: 'LOADING_MATCH',
  chess_board: 'CHESS_BOARD',
  combat: 'POKER_COMBAT',
  match_end: 'MATCH_END',
};

export interface GamePhaseAdapter {
  currentPhase: GamePhase;
  currentScreen: LegacyScreen;
  isLoading: boolean;
  
  goToMenu: () => void;
  goToArmySelection: () => void;
  goToChessBoard: () => void;
  goToCombat: () => void;
  goToMatchEnd: () => void;
}

export function useGamePhaseAdapter(
  legacyPhase?: LegacyScreen,
  setLegacyPhase?: (screen: LegacyScreen) => void
): GamePhaseAdapter {
  const flowStore = useGameFlowStore();

  if (MIGRATION_FLAGS.USE_GAME_FLOW_STORE) {
    return {
      currentPhase: flowStore.phase,
      currentScreen: PHASE_TO_SCREEN[flowStore.phase],
      isLoading: flowStore.isLoading,
      
      goToMenu: () => flowStore.transition('RETURN_TO_MENU'),
      goToArmySelection: () => flowStore.transition('START_GAME'),
      goToChessBoard: () => flowStore.transition('START_CHESS'),
      goToCombat: () => flowStore.transition('INITIATE_COMBAT'),
      goToMatchEnd: () => flowStore.transition('MATCH_VICTORY'),
    };
  }

  if (legacyPhase !== undefined && setLegacyPhase !== undefined) {
    return {
      currentPhase: SCREEN_TO_PHASE[legacyPhase],
      currentScreen: legacyPhase,
      isLoading: false,
      
      goToMenu: () => setLegacyPhase('main_menu'),
      goToArmySelection: () => setLegacyPhase('army_selection'),
      goToChessBoard: () => setLegacyPhase('chess_board'),
      goToCombat: () => setLegacyPhase('combat'),
      goToMatchEnd: () => setLegacyPhase('match_end'),
    };
  }

  if (!MIGRATION_FLAGS.USE_GAME_FLOW_STORE) {
    debug.error('[useGamePhaseAdapter] Legacy mode requires legacyPhase/setLegacyPhase args but none provided. Returning no-op adapter to prevent silent migration.');
    const noOp = () => debug.error('[useGamePhaseAdapter] Transition blocked - missing legacy args');
    return {
      currentPhase: 'MAIN_MENU' as GamePhase,
      currentScreen: 'main_menu' as LegacyScreen,
      isLoading: false,
      goToMenu: noOp,
      goToArmySelection: noOp,
      goToChessBoard: noOp,
      goToCombat: noOp,
      goToMatchEnd: noOp,
    };
  }
  
  return {
    currentPhase: flowStore.phase,
    currentScreen: PHASE_TO_SCREEN[flowStore.phase],
    isLoading: flowStore.isLoading,
    
    goToMenu: () => flowStore.transition('RETURN_TO_MENU'),
    goToArmySelection: () => flowStore.transition('START_GAME'),
    goToChessBoard: () => flowStore.transition('START_CHESS'),
    goToCombat: () => flowStore.transition('INITIATE_COMBAT'),
    goToMatchEnd: () => flowStore.transition('MATCH_VICTORY'),
  };
}
