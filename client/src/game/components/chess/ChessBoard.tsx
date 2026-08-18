import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BOARD_ROWS, BOARD_COLS, type ChessPiece } from '../../types/ChessTypes';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import ChessPieceComponent, { type ChessPieceVisualState } from './ChessPiece';
import MovePlate from './MovePlate';
import ChessAttackAnimation from './ChessAttackAnimation';
import { useChessBoardInteractions } from './useChessBoardInteractions';
import {
  getCellHighlight,
  getCellTone,
  getMoveAnimationOffset,
} from './chessBoardPresentation';

const PIECE_SLIDE_TRANSITION = {
  duration: 0.5,
  ease: [0.215, 0.61, 0.355, 1],
  times: [0, 0.58, 0.86, 1],
};
const PIECE_REST_TRANSITION = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface ChessBoardProps {
  onCombatTriggered?: (attackerId: string, defenderId: string) => void;
  disabled?: boolean;
}

const PIECE_VISUAL_STATES = {
  idle: { tag: 'idle' },
  selected: { tag: 'selected' },
  attackable: { tag: 'attackable' },
  locked: { tag: 'locked' },
} satisfies Record<ChessPieceVisualState['tag'], ChessPieceVisualState>;

const buildAttackAnimationKey = (
  animation: {
    readonly attacker: { readonly id: string };
    readonly defender: { readonly id: string };
    readonly timestamp?: number;
  } | null,
) =>
  animation
    ? `${animation.attacker.id}-${animation.defender.id}-${animation.timestamp ?? 0}`
    : 'chess-attack-idle';

const getPieceVisualState = (input: {
  readonly pieceId: string;
  readonly selectedPieceId: string | null;
  readonly isAttackTarget: boolean;
  readonly isLocked: boolean;
}): ChessPieceVisualState => {
  if (input.isLocked) return PIECE_VISUAL_STATES.locked;
  if (input.selectedPieceId === input.pieceId) return PIECE_VISUAL_STATES.selected;
  if (input.isAttackTarget) return PIECE_VISUAL_STATES.attackable;
  return PIECE_VISUAL_STATES.idle;
};

const ChessBoard: React.FC<ChessBoardProps> = ({ onCombatTriggered, disabled = false }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const previousPiecePositions = useRef<Map<string, { row: number; col: number }>>(new Map());
  const [boardRect, setBoardRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const animationsEnabled = useSettingsStore(s => s.animationsEnabled);
  const enhancedVFX = useSettingsStore(s => s.enhancedVFX);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const shouldAnimateBoard = animationsEnabled && !reduceMotion;
  const shouldRenderEffectFilters = shouldAnimateBoard && enhancedVFX;
  const shouldAnimateTurnBanner = shouldAnimateBoard;

  const {
    boardState,
    getPieceAt,
    isPlacementMode,
    screenShake,
    fallingKingId,
    pendingAttackAnimation,
    canPlaceAtHoveredPosition,
    effectiveSelectedPieceId,
    handleCellClick,
    handleCellHover,
    handleCellLeave,
    handleAttackAnimationComplete,
    isValidMovePosition,
    isAttackPosition,
    isMinePreviewTile,
  } = useChessBoardInteractions({ disabled, onCombatTriggered });

  useEffect(() => {
    const updateBoardRect = () => {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setBoardRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
      }
    };
    updateBoardRect();
    window.addEventListener('resize', updateBoardRect);
    return () => window.removeEventListener('resize', updateBoardRect);
  }, []);

  const { currentTurn } = boardState;
  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
  const isMyTurn = currentTurn === myCanonicalSide;
  const isFlipped = myCanonicalSide === 'opponent';
  const attackAnimationKey = buildAttackAnimationKey(pendingAttackAnimation);
  const orderedCellCoords = useMemo(() => {
    const cells: Array<{ row: number; col: number }> = [];
    if (isFlipped) {
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = BOARD_COLS - 1; col >= 0; col--) {
          cells.push({ row, col });
        }
      }
    } else {
      for (let row = BOARD_ROWS - 1; row >= 0; row--) {
        for (let col = 0; col < BOARD_COLS; col++) {
          cells.push({ row, col });
        }
      }
    }
    return cells;
  }, [isFlipped]);
  const boardCellSize = boardRect.width / BOARD_COLS;
  const boardOrientation = isFlipped ? 'flipped' : 'standard';

  useEffect(() => {
    previousPiecePositions.current = new Map(
      boardState.pieces.map((piece) => [piece.id, { row: piece.position.row, col: piece.position.col }]),
    );
  }, [boardState.pieces]);

  const getPieceMoveOffset = useCallback((piece: ChessPiece) => {
    if (!shouldAnimateBoard || !Number.isFinite(boardCellSize) || boardCellSize <= 0 || pendingAttackAnimation) {
      return null;
    }

    const previousPosition = previousPiecePositions.current.get(piece.id);
    if (!previousPosition) return null;
    if (previousPosition.row === piece.position.row && previousPosition.col === piece.position.col) {
      return null;
    }

    return getMoveAnimationOffset({
      from: previousPosition,
      to: piece.position,
      orientation: boardOrientation,
      cellSize: boardCellSize,
    });
  }, [boardCellSize, boardOrientation, pendingAttackAnimation, shouldAnimateBoard]);

  const renderCell = useCallback((row: number, col: number) => {
    const piece = getPieceAt({ row, col });
    const isValid = isValidMovePosition(row, col);
    const isAttack = isAttackPosition(row, col);
    const isMinePreview = isMinePreviewTile(row, col);
    const cellTone = getCellTone(row, col);
    const canPlaceHere = canPlaceAtHoveredPosition && isMinePreview;
    const isPieceLocked = piece ? disabled || piece.owner !== myCanonicalSide || isPlacementMode : false;
    const pieceMoveOffset = piece ? getPieceMoveOffset(piece) : null;
    const isPieceMoving = pieceMoveOffset !== null;
    const targetAttackFrame = isAttack
      ? 'border-4 border-red-500/100 rounded-lg shadow-[0_0_24px_rgba(248,113,113,1)]'
      : '';
    const targetAttackFrameStyle: React.CSSProperties = isAttack
      ? {
        border: '4px solid rgba(254, 226, 226, 0.95)',
        boxShadow: '0 0 26px rgba(248, 113, 113, 0.75), 0 0 12px rgba(185, 28, 28, 0.55) inset',
      }
      : {};

    return (
      <div
        key={`${row}-${col}`}
        className="chess-cell relative flex items-center justify-center"
        data-cell-tone={cellTone}
        data-cell-highlight={getCellHighlight({ isValidMove: isValid, isAttackMove: isAttack })}
        data-mine-preview={isMinePreview ? (canPlaceHere ? 'valid' : 'blocked') : 'none'}
        onClick={() => handleCellClick(row, col)}
        onMouseEnter={() => handleCellHover(row, col)}
        onMouseLeave={handleCellLeave}
      >
        {piece && (
          shouldAnimateBoard ? (
            <motion.div
              key={piece.id}
              className={`absolute inset-1 z-20 ${targetAttackFrame}`}
              style={{ ...targetAttackFrameStyle, willChange: 'transform' }}
              initial={isPieceMoving ? pieceMoveOffset : false}
              data-move-animation={isPieceMoving ? 'position' : undefined}
              animate={
                piece.id === fallingKingId
                  ? { x: 0, y: 10, rotate: 90, opacity: 0.45, scale: 1 }
                  : isPieceMoving && pieceMoveOffset
                    ? {
                      x: [pieceMoveOffset.x, pieceMoveOffset.x * 0.65, pieceMoveOffset.x * 0.22, 0],
                      y: [pieceMoveOffset.y, pieceMoveOffset.y * 0.65, pieceMoveOffset.y * 0.22, 0],
                      rotate: [0, 0, 0, 0],
                      scale: [0.985, 0.995, 1, 1],
                      opacity: 1,
                    }
                    : { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }
              }
              transition={isPieceMoving ? PIECE_SLIDE_TRANSITION : PIECE_REST_TRANSITION}
            >
              <ChessPieceComponent
                piece={piece}
                visualState={getPieceVisualState({
                  pieceId: piece.id,
                  selectedPieceId: effectiveSelectedPieceId,
                  isAttackTarget: isAttack,
                  isLocked: isPieceLocked,
                })}
                isPlayerTurn={isMyTurn}
                isMotionEnabled={shouldAnimateBoard}
                useEnhancedFx={shouldRenderEffectFilters}
                cellTone={cellTone}
              />
            </motion.div>
          ) : (
            <div
              key={piece.id}
              className={`absolute inset-1 z-20 ${targetAttackFrame}`}
              style={targetAttackFrameStyle}
            >
              <ChessPieceComponent
                piece={piece}
                visualState={getPieceVisualState({
                  pieceId: piece.id,
                  selectedPieceId: effectiveSelectedPieceId,
                  isAttackTarget: isAttack,
                  isLocked: isPieceLocked,
                })}
                isPlayerTurn={isMyTurn}
                isMotionEnabled={shouldAnimateBoard}
                useEnhancedFx={shouldRenderEffectFilters}
                cellTone={cellTone}
              />
            </div>
          )
        )}
        {!piece && (isValid || isAttack) && (
          <div className={shouldAnimateBoard ? 'absolute inset-2 z-10 transition-transform hover:scale-110' : 'absolute inset-2 z-10'}>
            <MovePlate
              isAttack={isAttack}
              onClick={() => handleCellClick(row, col)}
              isMotionEnabled={shouldAnimateBoard}
            />
          </div>
        )}
      </div>
    );
  }, [
    getPieceAt,
    isAttackPosition,
    isValidMovePosition,
    isMinePreviewTile,
    canPlaceAtHoveredPosition,
    isPlacementMode,
    effectiveSelectedPieceId,
    shouldAnimateBoard,
    shouldRenderEffectFilters,
    myCanonicalSide,
    disabled,
    fallingKingId,
    handleCellClick,
    handleCellHover,
    handleCellLeave,
    isMyTurn,
    getPieceMoveOffset,
  ]);

  const orderedCells = useMemo(
    () => orderedCellCoords.map(({ row, col }) => renderCell(row, col)),
    [orderedCellCoords, renderCell],
  );

  return (
    <div
      className="chess-board-container flex flex-col items-center"
      data-motion={shouldAnimateBoard ? 'on' : 'off'}
    >
      {/* SVG displacement filters removed: feTurbulence+feDisplacementMap caused visual pixelation.
           Effects are now handled purely via CSS blur/glow in ChessPiece.css */}

      <div
        className="chess-turn-banner mb-4 py-2 px-6 bg-slate-900/60 border border-slate-700 rounded-full"
        data-motion={shouldAnimateTurnBanner ? 'on' : 'off'}
      >
        <span className="text-sm font-runic text-slate-200 tracking-widest">
          {isMyTurn ? 'ᚱ YOUR COMMAND ᚱ' : 'ᚱ FOE STIRS ᚱ'}
        </span>
      </div>

      <div className="relative [perspective:1200px]">
        <motion.div
          ref={boardRef}
          className="chess-board rounded-lg overflow-hidden grid aspect-[5/7] origin-bottom [transform:rotateX(2deg)] w-[min(500px,85vw,calc(70dvh*5/7))]"
          style={{
            gridTemplateRows: `repeat(${BOARD_ROWS}, 1fr)`,
            gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`,
          }}
          animate={shouldAnimateBoard && screenShake ? { x: [0, -5, 5, -5, 5, 0], y: [0, 2, -2, 2, -2, 0] } : {}}
        >
          {orderedCells}
        </motion.div>
      </div>

      <ChessAttackAnimation
        key={attackAnimationKey}
        animation={pendingAttackAnimation}
        onAnimationComplete={handleAttackAnimationComplete}
        cellSize={boardRect.width / BOARD_COLS}
        boardOffset={{ x: boardRect.x, y: boardRect.y }}
      />
    </div>
  );
};

export default ChessBoard;
