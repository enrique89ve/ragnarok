import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAudio } from '../../../lib/stores/useAudio';
import { debug } from '../../config/debugConfig';
import { useChessCombatAdapter } from '../../hooks/useChessCombatAdapter';
import { useKingChessAbility } from '../../hooks/useKingChessAbility';
import type { ChessBoardPosition } from '../../types/ChessTypes';
import { computeMatchupGlows } from '../../utils/chess/elementMatchupUtils';
import {
  containsPosition,
  getBlockedPieceMessage,
  getCellClickAction,
  getLosingKingId,
  hasNoLegalMoves,
} from './chessBoardInteractionRules';

type UseChessBoardInteractionsInput = {
  readonly disabled: boolean;
  readonly onCombatTriggered?: (attackerId: string, defenderId: string) => void;
};

type InstantKillFlash = {
  readonly position: ChessBoardPosition;
  readonly attackerType: string;
};

type MinePlacementEffect = {
  readonly position: ChessBoardPosition;
  readonly tiles: readonly ChessBoardPosition[];
  readonly timestamp: number;
};

type MineTriggerEffect = {
  readonly tiles: readonly ChessBoardPosition[];
  readonly timestamp: number;
};

export function useChessBoardInteractions(input: UseChessBoardInteractionsInput) {
  const { disabled, onCombatTriggered } = input;
  const { playSoundEffect } = useAudio();
  const [noMovesMessage, setNoMovesMessage] = useState<string | null>(null);
  const [instantKillFlash, setInstantKillFlash] = useState<InstantKillFlash | null>(null);
  const [hoverPosition, setHoverPosition] = useState<ChessBoardPosition | null>(null);
  const [minePlacementEffect, setMinePlacementEffect] = useState<MinePlacementEffect | null>(null);
  const [mineTriggerEffect, setMineTriggerEffect] = useState<MineTriggerEffect | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [fallingKingId, setFallingKingId] = useState<string | null>(null);

  const {
    boardState,
    selectPiece,
    movePiece,
    getPieceAt,
    getValidMoves,
    lastInstantKill,
    pendingAttackAnimation,
    completeAttackAnimation,
  } = useChessCombatAdapter();

  const {
    isPlacementMode,
    visibleMines,
    getPreviewForPosition,
    placeMineAtPosition,
    isValidPlacement,
    lastMineTriggered,
    clearMineTriggered,
  } = useKingChessAbility('player');

  const { pieces, currentTurn, selectedPiece, validMoves, attackMoves, gameStatus } = boardState;

  useEffect(() => {
    if (!lastMineTriggered) return;

    setMineTriggerEffect({
      tiles: lastMineTriggered.mine.affectedTiles,
      timestamp: Date.now(),
    });
    setScreenShake(true);
    playSoundEffect('attack');

    const timeoutId = setTimeout(() => {
      setMineTriggerEffect(null);
      setScreenShake(false);
      clearMineTriggered();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [lastMineTriggered, clearMineTriggered, playSoundEffect]);

  useEffect(() => {
    setFallingKingId(getLosingKingId({ gameStatus, pieces }));
  }, [gameStatus, pieces]);

  const handleAttackAnimationComplete = useCallback(() => {
    const animation = pendingAttackAnimation;
    if (!animation) return;

    playSoundEffect('attack');

    if (animation.isInstantKill) {
      setInstantKillFlash({
        position: animation.defenderPosition,
        attackerType: animation.attacker.type,
      });
      setTimeout(() => setInstantKillFlash(null), 600);
    }

    completeAttackAnimation();

    if (!animation.isInstantKill) {
      onCombatTriggered?.(animation.attacker.id, animation.defender.id);
    }
  }, [pendingAttackAnimation, completeAttackAnimation, onCombatTriggered, playSoundEffect]);

  useEffect(() => {
    if (!lastInstantKill) return undefined;

    setInstantKillFlash({
      position: lastInstantKill.position,
      attackerType: lastInstantKill.attackerType,
    });
    const timer = setTimeout(() => setInstantKillFlash(null), 600);
    return () => clearTimeout(timer);
  }, [lastInstantKill]);

  const matchupGlowMap = useMemo(() => {
    if (!selectedPiece || selectedPiece.owner !== 'player' || currentTurn !== 'player') {
      return {};
    }
    return computeMatchupGlows(selectedPiece.element, pieces, selectedPiece.owner);
  }, [selectedPiece, currentTurn, pieces]);

  const previewTiles = useMemo(
    () => (hoverPosition ? getPreviewForPosition(hoverPosition) : []),
    [hoverPosition, getPreviewForPosition],
  );

  const handleCellClick = useCallback((row: number, col: number) => {
    const position: ChessBoardPosition = { row, col };
    setNoMovesMessage(null);

    const isValidMove = containsPosition(validMoves, row, col);
    const isAttackMove = containsPosition(attackMoves, row, col);
    const pieceAtPosition = getPieceAt(position);
    const action = getCellClickAction({
      disabled,
      isPlacementMode,
      isValidMove,
      isAttackMove,
      pieceAtPosition,
      currentTurn,
    });

    if (action.kind === 'ignored') return;

    if (action.kind === 'place_mine') {
      if (!isValidPlacement(position)) return;

      const preview = getPreviewForPosition(position);
      const success = placeMineAtPosition(position);
      if (!success) return;

      playSoundEffect('card_play');
      debug.chess(`Mine placed at (${row}, ${col})`);
      setMinePlacementEffect({
        position,
        tiles: preview,
        timestamp: Date.now(),
      });
      setTimeout(() => setMinePlacementEffect(null), 1200);
      return;
    }

    if (action.kind === 'move_or_attack') {
      const collision = movePiece(position);
      if (collision) {
        debug.chess(`Attack initiated: ${collision.attacker.heroName} -> ${collision.defender.heroName}`);
        return;
      }
      playSoundEffect('card_play');
      return;
    }

    if (action.kind === 'clear_selection') {
      selectPiece(null);
      return;
    }

    const { piece } = action;
    const { moves, attacks } = getValidMoves(piece);
    debug.chess(`Selected ${piece.type} at (${row}, ${col}). Valid moves: ${moves.length}, attacks: ${attacks.length}`);

    if (hasNoLegalMoves({ moves, attacks })) {
      setNoMovesMessage(getBlockedPieceMessage(piece));
      setTimeout(() => setNoMovesMessage(null), 2000);
    }

    selectPiece(piece);
    playSoundEffect('card_click');
  }, [
    disabled,
    isPlacementMode,
    isValidPlacement,
    getPreviewForPosition,
    placeMineAtPosition,
    playSoundEffect,
    validMoves,
    attackMoves,
    movePiece,
    getPieceAt,
    selectPiece,
    currentTurn,
    getValidMoves,
  ]);

  const handleCellHover = useCallback((row: number, col: number) => {
    if (!isPlacementMode) return;
    setHoverPosition({ row, col });
  }, [isPlacementMode]);

  const handleCellLeave = useCallback(() => {
    setHoverPosition(null);
  }, []);

  const isValidMovePosition = useCallback(
    (row: number, col: number) => containsPosition(validMoves, row, col),
    [validMoves],
  );

  const isAttackPosition = useCallback(
    (row: number, col: number) => containsPosition(attackMoves, row, col),
    [attackMoves],
  );

  const isMinePreviewTile = useCallback(
    (row: number, col: number) => containsPosition(previewTiles, row, col),
    [previewTiles],
  );

  const isActiveMinePosition = useCallback(
    (row: number, col: number) => containsPosition(visibleMines, row, col),
    [visibleMines],
  );

  const isPlacementBurstPosition = useCallback(
    (row: number, col: number) => containsPosition(minePlacementEffect?.tiles ?? [], row, col),
    [minePlacementEffect],
  );

  const isMineTriggerExplosionPosition = useCallback(
    (row: number, col: number) => containsPosition(mineTriggerEffect?.tiles ?? [], row, col),
    [mineTriggerEffect],
  );

  const isInstantKillFlashPosition = useCallback(
    (row: number, col: number) => instantKillFlash?.position.row === row && instantKillFlash.position.col === col,
    [instantKillFlash],
  );

  const canPlaceAtHoveredPosition = isPlacementMode && hoverPosition !== null && isValidPlacement(hoverPosition);

  return {
    boardState,
    getPieceAt,
    isPlacementMode,
    noMovesMessage,
    screenShake,
    fallingKingId,
    pendingAttackAnimation,
    matchupGlowMap,
    canPlaceAtHoveredPosition,
    handleCellClick,
    handleCellHover,
    handleCellLeave,
    handleAttackAnimationComplete,
    isValidMovePosition,
    isAttackPosition,
    isMinePreviewTile,
    isActiveMinePosition,
    isPlacementBurstPosition,
    isMineTriggerExplosionPosition,
    isInstantKillFlashPosition,
  };
}
