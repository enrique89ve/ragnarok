/**
 * Chess Combat Adapter Hook
 * 
 * Provides a unified interface for chess combat operations.
 * Components import this instead of directly using unifiedCombatStore.
 */

import { useMemo } from 'react';
import { useUnifiedCombatStore, type InstantKillEvent, type PendingAttackAnimation } from '../stores/unifiedCombatStore';
import {
  ChessPiece,
  ChessBoardPosition,
  ChessBoardState,
  ChessCollision,
  ArmySelection
} from '../types/ChessTypes';
import type { HeroDeckLoadout } from '../deck/heroDeckRules';

export interface ChessCombatAdapter {
  boardState: ChessBoardState;
  pendingCombat: ChessCollision | null;
  lastInstantKill: InstantKillEvent | null;
  pendingAttackAnimation: PendingAttackAnimation | null;
  
  initializeBoard: (
    playerArmy: ArmySelection,
    opponentArmy: ArmySelection,
    idGen: () => string,
    playerDeckLoadout?: HeroDeckLoadout,
  ) => void;
  selectPiece: (piece: ChessPiece | null) => void;
  movePiece: (to: ChessBoardPosition) => ChessCollision | null;
  getPieceAt: (position: ChessBoardPosition) => ChessPiece | null;
  getValidMoves: (piece: ChessPiece) => { moves: ChessBoardPosition[]; attacks: ChessBoardPosition[] };
  clearAttackAnimation: (animation: PendingAttackAnimation) => boolean;
  nextTurn: () => void;
  resetBoard: () => void;
  
  clearPendingCombat: () => void;
  resolveCombat: (result: { winner: ChessPiece; loser: ChessPiece; winnerNewHealth: number }) => void;
  setSharedDeck: (cardIds: number[]) => void;
  updatePieceStamina: (pieceId: string, stamina: number) => void;
  updatePieceHealth: (pieceId: string, health: number) => void;
  incrementAllStamina: () => void;
  setGameStatus: (status: ChessBoardState['gameStatus']) => void;
}

export function useChessCombatAdapter(): ChessCombatAdapter {
  const boardState = useUnifiedCombatStore(s => s.boardState);
  const pendingCombat = useUnifiedCombatStore(s => s.pendingCombat);
  const lastInstantKill = useUnifiedCombatStore(s => s.lastInstantKill);
  const pendingAttackAnimation = useUnifiedCombatStore(s => s.pendingAttackAnimation);
  const initializeBoardFn = useUnifiedCombatStore(s => s.initializeBoard);
  const initializeKingAbilities = useUnifiedCombatStore(s => s.initializeKingAbilities);
  const selectPieceFn = useUnifiedCombatStore(s => s.selectPiece);
  const movePieceFn = useUnifiedCombatStore(s => s.movePiece);
  const getPieceAtFn = useUnifiedCombatStore(s => s.getPieceAt);
  const getValidMovesFn = useUnifiedCombatStore(s => s.getValidMoves);
  const clearAttackAnimation = useUnifiedCombatStore(s => s.clearAttackAnimation);
  const nextTurnFn = useUnifiedCombatStore(s => s.nextTurn);
  const resetFn = useUnifiedCombatStore(s => s.reset);
  const clearPendingCombatFn = useUnifiedCombatStore(s => s.clearPendingCombat);
  const resolveCombatFn = useUnifiedCombatStore(s => s.resolveCombat);
  const setSharedDeckFn = useUnifiedCombatStore(s => s.setSharedDeck);
  const updatePieceStaminaFn = useUnifiedCombatStore(s => s.updatePieceStamina);
  const updatePieceHealthFn = useUnifiedCombatStore(s => s.updatePieceHealth);
  const incrementAllStaminaFn = useUnifiedCombatStore(s => s.incrementAllStamina);
  const setGameStatusFn = useUnifiedCombatStore(s => s.setGameStatus);

  return useMemo(() => ({
    boardState,
    pendingCombat,
    lastInstantKill,
    pendingAttackAnimation,

    initializeBoard: (
      playerArmy: ArmySelection,
      opponentArmy: ArmySelection,
      idGen: () => string,
      playerDeckLoadout?: HeroDeckLoadout,
    ) => {
      initializeBoardFn(playerArmy, opponentArmy, idGen, playerDeckLoadout);
      initializeKingAbilities(playerArmy.king.id, opponentArmy.king.id);
    },

    selectPiece: (piece: ChessPiece | null) => {
      selectPieceFn(piece);
    },

    movePiece: (to: ChessBoardPosition): ChessCollision | null => {
      return movePieceFn(to) as ChessCollision | null;
    },

    getPieceAt: (position: ChessBoardPosition): ChessPiece | null => {
      return getPieceAtFn(position);
    },

    getValidMoves: (piece: ChessPiece) => {
      return getValidMovesFn(piece);
    },

    nextTurn: () => {
      nextTurnFn();
    },

    clearAttackAnimation,

    resetBoard: () => {
      resetFn();
    },
    
    clearPendingCombat: () => {
      clearPendingCombatFn();
    },

    resolveCombat: (result: { winner: ChessPiece; loser: ChessPiece; winnerNewHealth: number }) => {
      resolveCombatFn(result);
    },

    setSharedDeck: (cardIds: number[]) => {
      setSharedDeckFn(cardIds);
    },

    updatePieceStamina: (pieceId: string, stamina: number) => {
      updatePieceStaminaFn(pieceId, stamina);
    },

    updatePieceHealth: (pieceId: string, health: number) => {
      updatePieceHealthFn(pieceId, health);
    },

    incrementAllStamina: () => {
      incrementAllStaminaFn();
    },

    setGameStatus: (status: ChessBoardState['gameStatus']) => {
      setGameStatusFn(status);
    },
  }), [
    boardState,
    pendingCombat,
    lastInstantKill,
    pendingAttackAnimation,
    initializeBoardFn,
    initializeKingAbilities,
    selectPieceFn,
    movePieceFn,
    getPieceAtFn,
    getValidMovesFn,
    clearAttackAnimation,
    nextTurnFn,
    resetFn,
    clearPendingCombatFn,
    resolveCombatFn,
    setSharedDeckFn,
    updatePieceStaminaFn,
    updatePieceHealthFn,
    incrementAllStaminaFn,
    setGameStatusFn,
  ]);
}

export function getChessCombatStoreActions() {
  const unified = useUnifiedCombatStore.getState();

  return {
    initializeBoard: (
      playerArmy: ArmySelection,
      opponentArmy: ArmySelection,
      idGen: () => string,
      playerDeckLoadout?: HeroDeckLoadout,
    ) => {
      unified.initializeBoard(playerArmy, opponentArmy, idGen, playerDeckLoadout);
      unified.initializeKingAbilities(playerArmy.king.id, opponentArmy.king.id);
    },

    selectPiece: (piece: ChessPiece | null) => {
      unified.selectPiece(piece);
    },

    movePiece: (to: ChessBoardPosition) => {
      return unified.movePiece(to) as ChessCollision | null;
    },

    getPieceAt: (position: ChessBoardPosition) => unified.getPieceAt(position),

    getValidMoves: (piece: ChessPiece) => unified.getValidMoves(piece),

    nextTurn: () => {
      unified.nextTurn();
    },


    resetBoard: () => {
      unified.reset();
    },

    clearPendingCombat: () => {
      unified.clearPendingCombat();
    },

    resolveCombat: (result: { winner: ChessPiece; loser: ChessPiece; winnerNewHealth: number }) => {
      unified.resolveCombat(result);
    },

    setSharedDeck: (cardIds: number[]) => {
      unified.setSharedDeck(cardIds);
    },

    updatePieceStamina: (pieceId: string, stamina: number) => {
      unified.updatePieceStamina(pieceId, stamina);
    },

    updatePieceHealth: (pieceId: string, health: number) => {
      unified.updatePieceHealth(pieceId, health);
    },

    incrementAllStamina: () => {
      unified.incrementAllStamina();
    },

    setGameStatus: (status: ChessBoardState['gameStatus']) => {
      unified.setGameStatus(status);
    },
  };
}
