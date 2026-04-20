/**
 * Chess Combat Adapter Hook
 * 
 * Provides a unified interface for chess combat operations.
 * Components import this instead of directly using unifiedCombatStore.
 */

import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { 
  ChessPiece, 
  ChessBoardPosition, 
  ChessBoardState,
  ChessCollision,
  ArmySelection
} from '../types/ChessTypes';

interface InstantKillEvent {
  position: ChessBoardPosition;
  attackerType: string;
  timestamp: number;
}

interface PendingAttackAnimation {
  attacker: ChessPiece;
  defender: ChessPiece;
  attackerPosition: ChessBoardPosition;
  defenderPosition: ChessBoardPosition;
  isInstantKill: boolean;
  timestamp: number;
}

export interface ChessCombatAdapter {
  boardState: ChessBoardState;
  pendingCombat: ChessCollision | null;
  lastInstantKill: InstantKillEvent | null;
  pendingAttackAnimation: PendingAttackAnimation | null;
  
  initializeBoard: (playerArmy: ArmySelection, opponentArmy: ArmySelection) => void;
  selectPiece: (piece: ChessPiece | null) => void;
  movePiece: (to: ChessBoardPosition) => ChessCollision | null;
  getPieceAt: (position: ChessBoardPosition) => ChessPiece | null;
  getValidMoves: (piece: ChessPiece) => { moves: ChessBoardPosition[]; attacks: ChessBoardPosition[] };
  completeAttackAnimation: () => void;
  nextTurn: () => void;
  resetBoard: () => void;
  
  clearPendingCombat: () => void;
  resolveCombat: (result: { winner: ChessPiece; loser: ChessPiece; winnerNewHealth: number }) => void;
  setSharedDeck: (cardIds: number[]) => void;
  executeAITurn: () => void;
  updatePieceStamina: (pieceId: string, stamina: number) => void;
  updatePieceHealth: (pieceId: string, health: number) => void;
  incrementAllStamina: () => void;
  setGameStatus: (status: ChessBoardState['gameStatus']) => void;
}

export function useChessCombatAdapter(): ChessCombatAdapter {
  const unified = useUnifiedCombatStore();

  return {
    boardState: unified.boardState,
    pendingCombat: unified.pendingCombat,
    lastInstantKill: unified.lastInstantKill,
    pendingAttackAnimation: unified.pendingAttackAnimation,

    initializeBoard: (playerArmy: ArmySelection, opponentArmy: ArmySelection) => {
      unified.initializeBoard(playerArmy, opponentArmy);
      unified.initializeKingAbilities(playerArmy.king.id, opponentArmy.king.id);
    },

    selectPiece: (piece: ChessPiece | null) => {
      unified.selectPiece(piece);
    },

    movePiece: (to: ChessBoardPosition): ChessCollision | null => {
      return unified.movePiece(to) as ChessCollision | null;
    },

    getPieceAt: (position: ChessBoardPosition): ChessPiece | null => {
      return unified.getPieceAt(position);
    },

    getValidMoves: (piece: ChessPiece) => {
      return unified.getValidMoves(piece);
    },

    nextTurn: () => {
      unified.nextTurn();
    },

    completeAttackAnimation: () => {
      unified.completeAttackAnimation();
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

    executeAITurn: () => {
      unified.executeAITurn();
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

export function getChessCombatStoreActions() {
  const unified = useUnifiedCombatStore.getState();

  return {
    initializeBoard: (playerArmy: ArmySelection, opponentArmy: ArmySelection) => {
      unified.initializeBoard(playerArmy, opponentArmy);
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

    completeAttackAnimation: () => {
      unified.completeAttackAnimation();
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

    executeAITurn: () => {
      unified.executeAITurn();
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
