/**
 * UnifiedCombatStore - Consolidated Combat State
 * 
 * Combines poker combat, chess board, attacks, and shared deck state
 * into a single coherent store for all combat operations.
 * 
 * This store is composed from domain-specific slices for better organization
 * while maintaining a unified API for consumers.
 */

import { create } from 'zustand';
import {
  createSharedCombatSlice,
  createPokerCombatSlice,
  createChessCombatSlice,
  createChessAnimationSlice,
  createMinionBattleSlice,
  createKingAbilitySlice,
  createPokerSpellSlice,
  turnManager,
  initialBoardState,
  UnifiedCombatStore,
  CombatPhase,
  PokerPhase,
  PokerState,
  ChessPieceState,
  SharedDeckState,
  InstantKillEvent,
  PendingAttackAnimation,
  CombatLogEntry
} from './combat';

export type { 
  CombatPhase, 
  PokerPhase, 
  PokerState, 
  ChessPieceState, 
  SharedDeckState, 
  InstantKillEvent, 
  PendingAttackAnimation, 
  CombatLogEntry,
  UnifiedCombatStore
};

export const useUnifiedCombatStore = create<UnifiedCombatStore>()((set, get, api) => ({
  ...createSharedCombatSlice(set, get, api),
  ...createPokerCombatSlice(set, get, api),
  ...createChessCombatSlice(set, get, api),
  ...createChessAnimationSlice(set, get, api),
  ...createMinionBattleSlice(set, get, api),
  ...createKingAbilitySlice(set, get, api),
  ...createPokerSpellSlice(set, get, api),
  
  reset: () => {
    turnManager.reset();
    get().cancelPendingPokerHandTransition();
    set({
      combatPhase: 'SETUP',
      pokerState: null,
      chessPieces: [],
      battlefield: null,
      sharedDeck: null,
      turnState: null,
      combatLog: [],
      pendingAnimations: [],
      boardState: initialBoardState,
      pendingCombat: null,
      lastInstantKill: null,
      pendingAttackAnimation: null,
      playerArmy: null,
      opponentArmy: null,
      p2pBoardBinding: null,
      pendingManaBoost: { player: 0, opponent: 0 },
      lastClearedTurn: null,
      sharedDeckCardIds: [],
      _chessRng: null,
      _chessIdGen: null,
      _logCounter: 0,
      pokerCombatState: null,
      pokerDeck: [],
      pokerIsActive: false,
      mulliganComplete: false,
      isTransitioningHand: false,
      pokerHandsWonPlayer: 0,
      pokerHandsWonOpponent: 0,
      playerKingAbility: null,
      opponentKingAbility: null,
      allActiveMines: [],
      minePlacementMode: false,
      selectedMineDirection: null,
      lastMineTriggered: null,
      pokerSpellState: null,
      pendingPokerSpells: [],
      isSpellPetPhase: false,
      destinyOverrideOptions: [],
    });
  },
}));

// Register on globalThis for lazy access by blockchain chunk (avoids circular import)
(globalThis as Record<string, unknown>).__ragnarokCombatStore = useUnifiedCombatStore;
