import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudio } from '../../../lib/stores/useAudio';
import { debug } from '../../config/debugConfig';
import { useChessCombatAdapter } from '../../hooks/useChessCombatAdapter';
import { useKingChessAbility } from '../../hooks/useKingChessAbility';
import { useGameStore } from '../../stores/gameStore';
import { useUnifiedCombatStore } from '../../stores/unifiedCombatStore';
import { captureChessPrevHashes, sendChessAttack, sendChessCombatInitiated, sendChessMove } from '../../p2p/chessWireSender';
import type { ChessBoardPosition } from '../../types/ChessTypes';
import { computeMatchupGlows } from '../../utils/chess/elementMatchupUtils';
import {
  containsPosition,
  getBlockedPieceMessage,
  getBoardHighlightKind,
  getCellClickAction,
  getLosingKingId,
  hasNoLegalMoves,
  shouldShowEnemyHoverPreview,
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

type EnemyHoverTarget = {
  readonly pieceId: string;
  readonly position: ChessBoardPosition;
};

type TimeoutId = ReturnType<typeof setTimeout>;

const clearTimer = (timerRef: { current: TimeoutId | null }): void => {
  if (!timerRef.current) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
};

export function useChessBoardInteractions(input: UseChessBoardInteractionsInput) {
  const { disabled, onCombatTriggered } = input;
  const { playSoundEffect } = useAudio();
  const [noMovesMessage, setNoMovesMessage] = useState<string | null>(null);
  const [instantKillFlash, setInstantKillFlash] = useState<InstantKillFlash | null>(null);
  const [hoverPosition, setHoverPosition] = useState<ChessBoardPosition | null>(null);
  const [enemyHoverTarget, setEnemyHoverTarget] = useState<EnemyHoverTarget | null>(null);
  const [minePlacementEffect, setMinePlacementEffect] = useState<MinePlacementEffect | null>(null);
  const [mineTriggerEffect, setMineTriggerEffect] = useState<MineTriggerEffect | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [fallingKingId, setFallingKingId] = useState<string | null>(null);
  const instantKillFlashTimeoutRef = useRef<TimeoutId | null>(null);
  const minePlacementTimeoutRef = useRef<TimeoutId | null>(null);
  const noMovesMessageTimeoutRef = useRef<TimeoutId | null>(null);

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

  // Local viewer's canonical side. SP defaults to 'player' (human is first-mover);
  // P2P sets via deriveCanonicalSide at handshake. Each peer drives THEIR OWN
  // king's ability — `useKingChessAbility(myCanonicalSide)` selects the right
  // king regardless of who plays first.
  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';

  const {
    isPlacementMode,
    visibleMines,
    getPreviewForPosition,
    placeMineAtPosition,
    isValidPlacement,
    lastMineTriggered,
    clearMineTriggered,
  } = useKingChessAbility(myCanonicalSide);

  const { pieces, currentTurn, selectedPiece, validMoves, attackMoves, gameStatus } = boardState;
  const matchId = useGameStore(s => s.matchId);
  const isSingleMode = !matchId;

  const enemyHoverPreview = useMemo(() => {
    if (!enemyHoverTarget || isPlacementMode || !isSingleMode || pendingAttackAnimation) return null;

    const piece = pieces.find(candidate => candidate.id === enemyHoverTarget.pieceId);
    if (!piece) return null;
    if (piece.owner === myCanonicalSide) return null;
    if (
      piece.position.row !== enemyHoverTarget.position.row ||
      piece.position.col !== enemyHoverTarget.position.col
    ) {
      return null;
    }

    return getValidMoves(piece);
  }, [enemyHoverTarget, isPlacementMode, isSingleMode, pendingAttackAnimation, pieces, getValidMoves, myCanonicalSide]);

  useEffect(() => {
    return () => {
      clearTimer(instantKillFlashTimeoutRef);
      clearTimer(minePlacementTimeoutRef);
      clearTimer(noMovesMessageTimeoutRef);
    };
  }, []);

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
      clearTimer(instantKillFlashTimeoutRef);
      instantKillFlashTimeoutRef.current = setTimeout(() => {
        setInstantKillFlash(null);
        instantKillFlashTimeoutRef.current = null;
      }, 600);
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
    clearTimer(instantKillFlashTimeoutRef);
    instantKillFlashTimeoutRef.current = setTimeout(() => {
      setInstantKillFlash(null);
      instantKillFlashTimeoutRef.current = null;
    }, 600);
    return () => clearTimer(instantKillFlashTimeoutRef);
  }, [lastInstantKill]);

  const matchupGlowMap = useMemo(() => {
    if (!selectedPiece || selectedPiece.owner !== myCanonicalSide || currentTurn !== myCanonicalSide) {
      return {};
    }
    return computeMatchupGlows(selectedPiece.element, pieces, selectedPiece.owner);
  }, [selectedPiece, currentTurn, pieces, myCanonicalSide]);

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
      mySide: myCanonicalSide,
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
      clearTimer(minePlacementTimeoutRef);
      minePlacementTimeoutRef.current = setTimeout(() => {
        setMinePlacementEffect(null);
        minePlacementTimeoutRef.current = null;
      }, 1200);
      return;
    }

    if (action.kind === 'move_or_attack') {
      // Read fresh slice state (NOT React-subscribed) for the gating
      // decisions below. React subscriptions lag the zustand slice by
      // one render frame, so a click handler firing during that window
      // sees stale `selectedPiece` / `validMoves` / `pendingAttackAnimation`
      // and would happily emit a phantom envelope based on values the
      // slice has already moved past. The post-strike + double-click
      // freeze cascades both traced back to this race.
      const freshSlice = useUnifiedCombatStore.getState();

      // Animation guard: while the previous attack's animation is still
      // running, the slice's movePiece silently no-ops (chessCombatSlice
      // line 673-676). Reading from the slice (not React) catches the
      // case where the animation just started but React hasn't propagated
      // the flag yet.
      if (freshSlice.pendingAttackAnimation) {
        return;
      }

      // Stale-React-state guard: confirm that the slice agrees the
      // selected piece is still at the position React thinks it is. If
      // the slice already moved it (because a prior click went through
      // synchronously and React hasn't re-rendered), the click handler
      // is racing — abort before any further work, including movePiece
      // which would silently no-op anyway.
      if (selectedPiece) {
        const slicePiece = freshSlice.boardState.pieces.find(p => p.id === selectedPiece.id);
        if (!slicePiece) {
          return;
        }
        if (slicePiece.position.row !== selectedPiece.position.row || slicePiece.position.col !== selectedPiece.position.col) {
          return;
        }
      }

      const matchId = useGameStore.getState().matchId;

      // Capture the moving piece BEFORE movePiece — it clears selectedPiece
      // as part of the move, so we can't read it post-call. Same with the
      // defender for instant-kill emit (movePiece removes it).
      const movingPiece = selectedPiece;
      const fromPos = movingPiece?.position;
      const defender = isAttackMove ? getPieceAt(position) : null;

      // TD-27c-chess: capture prev-state hashes BEFORE movePiece mutates
      // the local store. The receiver hashes its own state pre-apply, so
      // the sender must mirror that timing or every envelope diverges.
      // Only capture when matchId is set (P2P session active) — SP path
      // skips the wire entirely.
      const prevHashes = matchId ? captureChessPrevHashes() : null;

      const collision = movePiece(position);
      if (collision) {
        debug.chess(`Attack initiated: ${collision.attacker.heroName} -> ${collision.defender.heroName}`);
        if (matchId && prevHashes && movingPiece && fromPos && defender) {
          const emit = {
            pieceId: movingPiece.id,
            from: fromPos,
            to: position,
            defenderId: defender.id,
          };
          if (collision.instantKill) {
            sendChessAttack(emit, prevHashes);
          } else {
            sendChessCombatInitiated(emit, prevHashes);
          }
        }
        return;
      }

      // Defense-in-depth: confirm the slice actually applied the quiet
      // move before emitting. movePiece returns null both when the move
      // was applied successfully AND when it silently rejected (no
      // selected piece, position not in validMoves, ambient state
      // mismatch). Without this check we could emit a phantom envelope
      // for a move the local store never executed — exactly the bug
      // chain that produced the post-strike freeze before the
      // pendingAttackAnimation guard above.
      const movedPiece = movingPiece ? getPieceAt(position) : null;
      const moveApplied = movedPiece !== null && movingPiece !== null && movedPiece.id === movingPiece.id;
      if (!moveApplied) {
        return;
      }

      playSoundEffect('card_play');
      if (matchId && prevHashes && movingPiece && fromPos) {
        sendChessMove({
          pieceId: movingPiece.id,
          from: fromPos,
          to: position,
        }, prevHashes);
      }
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
      clearTimer(noMovesMessageTimeoutRef);
      noMovesMessageTimeoutRef.current = setTimeout(() => {
        setNoMovesMessage(null);
        noMovesMessageTimeoutRef.current = null;
      }, 2000);
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
    selectedPiece,
    myCanonicalSide,
    getValidMoves,
  ]);

  // MovePlates leak intent when the AI selects its piece during its turn:
  // the slice populates validMoves/attackMoves regardless of ownership, so
  // we gate by `selectedPiece.owner === myCanonicalSide` (matches the same
  // gate already used for matchupGlowMap above). Hover-preview adds a
  // separate, exclusive source for enemy pieces, except when the hovered
  // enemy is the selected piece's active capture target.
  const showsSelectionMoves = !!selectedPiece && selectedPiece.owner === myCanonicalSide;
  const selectedHighlightSource = useMemo(() => {
    if (!showsSelectionMoves) return null;
    return { moves: validMoves, attacks: attackMoves };
  }, [showsSelectionMoves, validMoves, attackMoves]);

  // Single-mode-only enemy preview: hovering an opponent piece reveals
  // its valid moves so the player can study the AI before/after its turn.
  // P2P stays opaque (fair play) — the matchId gate below disables it.
  // Mine placement mode owns the hover state during ability use, so we
  // skip the preview entirely while placing.
  const handleCellHover = useCallback((row: number, col: number) => {
    if (isPlacementMode) {
      setHoverPosition({ row, col });
      return;
    }
    if (pendingAttackAnimation) {
      setEnemyHoverTarget(null);
      return;
    }
    if (!isSingleMode) {
      setEnemyHoverTarget(null);
      return;
    }
    const piece = getPieceAt({ row, col });
    if (!piece || piece.owner === myCanonicalSide) {
      setEnemyHoverTarget(null);
      return;
    }
    if (!shouldShowEnemyHoverPreview({ row, col, selectedSource: selectedHighlightSource })) {
      setEnemyHoverTarget(null);
      return;
    }
    setEnemyHoverTarget(previousTarget => {
      if (
        previousTarget?.pieceId === piece.id &&
        previousTarget.position.row === piece.position.row &&
        previousTarget.position.col === piece.position.col
      ) {
        return previousTarget;
      }
      return { pieceId: piece.id, position: piece.position };
    });
  }, [isPlacementMode, pendingAttackAnimation, isSingleMode, getPieceAt, myCanonicalSide, selectedHighlightSource]);

  const handleCellLeave = useCallback(() => {
    setHoverPosition(null);
    setEnemyHoverTarget(null);
  }, []);

  const isValidMovePosition = useCallback(
    (row: number, col: number) => getBoardHighlightKind({
      row,
      col,
      selectedSource: selectedHighlightSource,
      hoverPreviewSource: enemyHoverPreview,
    }) === 'move',
    [selectedHighlightSource, enemyHoverPreview],
  );

  const isAttackPosition = useCallback(
    (row: number, col: number) => getBoardHighlightKind({
      row,
      col,
      selectedSource: selectedHighlightSource,
      hoverPreviewSource: enemyHoverPreview,
    }) === 'attack',
    [selectedHighlightSource, enemyHoverPreview],
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

  // Selected-piece glow policy: only mine. We never auto-leak the
  // opponent's selection — neither the AI's mid-think pick nor a P2P
  // peer's tap-to-pick. The player can still see what enemy pieces can
  // do via the explicit hover preview (single mode only, opt-in).
  const effectiveSelectedPieceId: string | null =
    selectedPiece && selectedPiece.owner === myCanonicalSide
      ? selectedPiece.id
      : null;

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
    effectiveSelectedPieceId,
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
