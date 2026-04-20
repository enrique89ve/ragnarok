/**
 * useKingChessAbility.ts
 * 
 * React hook for King Divine Command System UI logic.
 * Provides mine placement state, visualization, and interaction handlers.
 * 
 * Architecture: Hook layer - imports from Store and Utils only.
 * - Store: unifiedCombatStore (kingAbilitySlice state/actions)
 * - Utils: kingAbilityUtils (pure functions for shape calculations)
 */

import { useCallback, useMemo } from 'react';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { ChessBoardPosition } from '../types/ChessTypes';
import {
  getMineShapeTiles,
  isValidMinePlacement,
  MineDirection
} from '../utils/chess/kingAbilityUtils';

import { ActiveMine } from '../types/ChessTypes';

export interface KingChessAbilityHook {
  canPlaceMine: boolean;
  minesRemaining: number;
  isPlacementMode: boolean;
  selectedDirection: MineDirection | null;
  previewTiles: ChessBoardPosition[];
  visibleMines: ChessBoardPosition[];
  lastMineTriggered: { mine: ActiveMine; targetPieceId: string } | null;
  enterPlacementMode: () => void;
  exitPlacementMode: () => void;
  selectDirection: (direction: MineDirection) => void;
  placeMineAtPosition: (position: ChessBoardPosition) => boolean;
  getPreviewForPosition: (position: ChessBoardPosition) => ChessBoardPosition[];
  isValidPlacement: (position: ChessBoardPosition) => boolean;
  clearMineTriggered: () => void;
}

export function useKingChessAbility(side: 'player' | 'opponent' = 'player'): KingChessAbilityHook {
  const {
    playerKingAbility,
    opponentKingAbility,
    allActiveMines,
    minePlacementMode,
    selectedMineDirection,
    boardState,
    canPlaceMine: storeCanPlaceMine,
    placeMine,
    setMinePlacementMode,
    setSelectedMineDirection,
    getVisibleMines,
    getMinesForOwner,
    lastMineTriggered,
    clearMineTriggered
  } = useUnifiedCombatStore();

  const kingState = side === 'player' ? playerKingAbility : opponentKingAbility;

  const canPlaceMine = useMemo(() => {
    return storeCanPlaceMine(side);
  }, [storeCanPlaceMine, side, kingState?.minesRemaining, kingState?.hasPlacedThisTurn, boardState?.currentTurn]);

  const minesRemaining = useMemo(() => {
    return kingState?.minesRemaining ?? 0;
  }, [kingState?.minesRemaining]);

  const visibleMines = useMemo(() => {
    const mines = getVisibleMines(side);
    return mines.flatMap(mine => mine.affectedTiles);
  }, [getVisibleMines, side, allActiveMines]);

  const previewTiles = useMemo((): ChessBoardPosition[] => {
    if (!minePlacementMode || !kingState?.kingId || !boardState?.selectedPiece) {
      return [];
    }
    const selectedPosition = boardState.selectedPiece.position;
    return getMineShapeTiles(
      kingState.kingId,
      selectedPosition,
      selectedMineDirection ?? undefined,
      side === 'player' ? 'opponent' : 'player'
    );
  }, [minePlacementMode, kingState?.kingId, boardState?.selectedPiece, selectedMineDirection, side]);

  const getPreviewForPosition = useCallback((position: ChessBoardPosition): ChessBoardPosition[] => {
    if (!kingState?.kingId) {
      return [];
    }
    return getMineShapeTiles(
      kingState.kingId,
      position,
      selectedMineDirection ?? undefined,
      side === 'player' ? 'opponent' : 'player'
    );
  }, [kingState?.kingId, selectedMineDirection, side]);

  const isValidPlacement = useCallback((position: ChessBoardPosition): boolean => {
    if (!kingState?.kingId) {
      return false;
    }
    
    const ownPieces = boardState?.pieces
      .filter(p => p.owner === side)
      .map(p => p.position) ?? [];
    
    const validation = isValidMinePlacement(
      position,
      kingState.kingId,
      allActiveMines,
      ownPieces,
      selectedMineDirection ?? undefined
    );
    
    return validation.valid;
  }, [kingState?.kingId, allActiveMines, boardState?.pieces, side, selectedMineDirection]);

  const enterPlacementMode = useCallback(() => {
    if (canPlaceMine) {
      setMinePlacementMode(true);
    }
  }, [canPlaceMine, setMinePlacementMode]);

  const exitPlacementMode = useCallback(() => {
    setMinePlacementMode(false);
    setSelectedMineDirection(null);
  }, [setMinePlacementMode, setSelectedMineDirection]);

  const selectDirection = useCallback((direction: MineDirection) => {
    setSelectedMineDirection(direction);
  }, [setSelectedMineDirection]);

  const placeMineAtPosition = useCallback((position: ChessBoardPosition): boolean => {
    if (!canPlaceMine || !minePlacementMode) {
      return false;
    }
    
    const success = placeMine(side, position, selectedMineDirection ?? undefined);
    
    if (success) {
      exitPlacementMode();
    }
    
    return success;
  }, [canPlaceMine, minePlacementMode, placeMine, side, selectedMineDirection, exitPlacementMode]);

  return {
    canPlaceMine,
    minesRemaining,
    isPlacementMode: minePlacementMode,
    selectedDirection: selectedMineDirection,
    previewTiles,
    visibleMines,
    lastMineTriggered,
    enterPlacementMode,
    exitPlacementMode,
    selectDirection,
    placeMineAtPosition,
    getPreviewForPosition,
    isValidPlacement,
    clearMineTriggered
  };
}

export default useKingChessAbility;
