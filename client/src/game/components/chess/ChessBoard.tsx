import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessBoardPosition, BOARD_ROWS, BOARD_COLS } from '../../types/ChessTypes';
import { useGameStore } from '../../stores/gameStore';
import ChessPieceComponent, { type ChessPieceVisualState } from './ChessPiece';
import MovePlate from './MovePlate';
import ChessAttackAnimation from './ChessAttackAnimation';
import './ChessBoardEnhanced.css';
import {
  getActiveMineStyle,
  getActiveMineGlowAnimation,
  getActiveMineIconStyle,
  getActiveMineIconAnimation,
  getMineOuterGlowStyle,
  getMinePlacementBurstStyle,
  getMineTriggerExplosionStyle,
  getMineStateClasses,
  MINE_RUNE_SYMBOL
} from '../../utils/chess/mineVisualUtils';
import { useChessBoardInteractions } from './useChessBoardInteractions';

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
  const [boardRect, setBoardRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const {
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
  } = useChessBoardInteractions({ disabled, onCombatTriggered });
  
  useEffect(() => {
    const updateBoardRect = () => {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setBoardRect(previousRect => {
          if (
            previousRect.x === rect.left &&
            previousRect.y === rect.top &&
            previousRect.width === rect.width &&
            previousRect.height === rect.height
          ) {
            return previousRect;
          }
          return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
        });
      }
    };
    updateBoardRect();
    window.addEventListener('resize', updateBoardRect);
    return () => window.removeEventListener('resize', updateBoardRect);
  }, []);
  
  const { currentTurn, gameStatus } = boardState;
  // Local viewer's canonical side. SP defaults to 'player' (human is first-mover);
  // P2P sets via deriveCanonicalSide at handshake. Drives all viewer-relative
  // presentation: "your turn" banner, victory/defeat text, board orientation.
  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
  const isMyTurn = currentTurn === myCanonicalSide;
  const myWinStatus: 'player_wins' | 'opponent_wins' = myCanonicalSide === 'player' ? 'player_wins' : 'opponent_wins';
  const oppWinStatus: 'player_wins' | 'opponent_wins' = myCanonicalSide === 'player' ? 'opponent_wins' : 'player_wins';
  
  const renderCell = (row: number, col: number) => {
    const position: ChessBoardPosition = { row, col };
    const piece = getPieceAt(position);
    const isLight = (row + col) % 2 === 0;
    const isValid = isValidMovePosition(row, col);
    const isAttack = isAttackPosition(row, col);
    const isFlashCell = isInstantKillFlashPosition(row, col);
    const isMinePreview = isPlacementMode && isMinePreviewTile(row, col);
    const isActiveMine = isActiveMinePosition(row, col);
    const canPlaceHere = canPlaceAtHoveredPosition;
    const isPlacementBurst = isPlacementBurstPosition(row, col);
    const isMineTriggerExplosion = isMineTriggerExplosionPosition(row, col);
    const isPieceLocked = gameStatus !== 'playing' || pendingAttackAnimation !== null;
    
    return (
      <div
        key={`${row}-${col}`}
        className={`
          chess-cell relative aspect-square overflow-visible [container-type:inline-size]
          ${isLight ? 'chess-cell-light' : 'chess-cell-dark'}
          ${gameStatus === 'playing' ? '' : 'opacity-75'}
          ${isPlacementMode ? 'cursor-crosshair' : ''}
        `}
        onClick={() => handleCellClick(row, col)}
        onMouseEnter={() => handleCellHover(row, col)}
        onMouseLeave={handleCellLeave}
      >
        {isActiveMine && (() => {
          const mineStyle = getActiveMineStyle();
          const glowAnim = getActiveMineGlowAnimation();
          const iconStyle = getActiveMineIconStyle();
          const iconAnim = getActiveMineIconAnimation();
          const outerGlow = getMineOuterGlowStyle();
          return (
            <>
              <motion.div 
                className={getMineStateClasses('active')}
                animate={{
                  boxShadow: glowAnim.boxShadowKeyframes,
                  scale: glowAnim.scaleKeyframes
                }}
                transition={{ duration: glowAnim.duration, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  background: mineStyle.background,
                  border: mineStyle.borderStyle,
                  borderRadius: '4px'
                }}
              >
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ 
                    opacity: iconAnim.opacityKeyframes,
                    scale: iconAnim.scaleKeyframes
                  }}
                  transition={{ duration: iconAnim.duration, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span 
                    className="font-runic"
                    style={{
                      color: iconStyle.color,
                      fontSize: iconStyle.fontSize,
                      textShadow: iconStyle.textShadow,
                      opacity: iconStyle.opacity
                    }}
                  >
                    {MINE_RUNE_SYMBOL}
                  </span>
                </motion.div>
              </motion.div>
              <motion.div 
                className="absolute inset-[-4px] pointer-events-none z-5 rounded"
                animate={{ 
                  opacity: [0.4, 0.8, 0.4],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  boxShadow: outerGlow.boxShadow
                }}
              />
            </>
          );
        })()}
        
        <AnimatePresence>
          {isPlacementBurst && (() => {
            const burstStyle = getMinePlacementBurstStyle();
            return (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={getMineStateClasses('placed')}
              >
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: burstStyle.background,
                    boxShadow: burstStyle.boxShadow
                  }}
                />
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, ease: 'linear' }}
                >
                  <span className="text-3xl text-amber-200 drop-shadow-lg font-runic">{MINE_RUNE_SYMBOL}</span>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
        
        <AnimatePresence>
          {isMineTriggerExplosion && (() => {
            const explosionStyle = getMineTriggerExplosionStyle();
            return (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className={getMineStateClasses('triggered')}
              >
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: explosionStyle.background,
                    boxShadow: explosionStyle.boxShadow
                  }}
                />
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ rotate: 0, scale: 1 }}
                  animate={{ rotate: 180, scale: 1.5 }}
                  transition={{ duration: 0.8 }}
                >
                  <span className="text-4xl text-white drop-shadow-lg">💥</span>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
        
        {isMinePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: canPlaceHere 
                ? 'radial-gradient(circle, rgba(234, 179, 8, 0.6) 0%, rgba(251, 191, 36, 0.3) 60%, transparent 80%)'
                : 'radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, rgba(220, 38, 38, 0.2) 60%, transparent 80%)',
              boxShadow: canPlaceHere 
                ? 'inset 0 0 15px rgba(234, 179, 8, 0.8)' 
                : 'inset 0 0 10px rgba(239, 68, 68, 0.5)'
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span 
                className="text-lg"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {canPlaceHere ? '⚡' : '✕'}
              </motion.span>
            </div>
          </motion.div>
        )}
        
        <AnimatePresence mode="wait">
          {piece && (
            <motion.div
              key={piece.id}
              className="absolute inset-1"
              layoutId={piece.id}
              animate={piece.id === fallingKingId
                ? { rotate: 90, opacity: 0.45, y: 10 }
                : undefined
              }
              transition={piece.id === fallingKingId
                ? { duration: 1.0, ease: 'easeIn' }
                : undefined
              }
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
                matchupGlow={matchupGlowMap[piece.id] || null}
              />
            </motion.div>
          )}
          
          {!piece && (isValid || isAttack) && !isPlacementMode && (
            <div className="absolute inset-1">
              <MovePlate
                isAttack={isAttack}
                onClick={() => handleCellClick(row, col)}
              />
            </div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {isFlashCell && (
            <motion.div
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 pointer-events-none z-50"
            >
              <div 
                className="absolute inset-0 rounded-full" 
                style={{ 
                  background: 'radial-gradient(circle, #facc15 0%, #f97316 40%, transparent 70%)' 
                }} 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white drop-shadow-lg">⚔</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Board orientation: standard chess UX (lichess, chess.com) puts the
  // local viewer's pieces at the bottom of the screen. Canonical state
  // is unchanged — only the iteration order flips. Click handlers
  // receive canonical (row, col) directly, so no coordinate translation
  // is needed elsewhere.
  //
  // First-mover (canonical 'player'): default order — row 6→0 top-to-bottom,
  // col 0→4 left-to-right. Their back rank (row 0) appears at bottom.
  // Second-mover (canonical 'opponent'): flipped 180° — row 0→6,
  // col 4→0. Their back rank (row 6) appears at bottom.
  const isFlipped = myCanonicalSide === 'opponent';
  const cells = [];
  if (isFlipped) {
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = BOARD_COLS - 1; col >= 0; col--) {
        cells.push(renderCell(row, col));
      }
    }
  } else {
    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      for (let col = 0; col < BOARD_COLS; col++) {
        cells.push(renderCell(row, col));
      }
    }
  }

  // P2P diagnostic strip — only when canonical handshake has resolved.
  // Shows mySide / current turn / connection so the user can see exactly
  // why a move is or isn't allowed. Strictly debug; remove once Plan B
  // smoke is stable.
  const matchId = useGameStore(s => s.matchId);
  const isP2P = !!matchId;

  return (
    <div className="chess-board-container flex flex-col items-center">
      {isP2P && (
        <div className="mb-2 px-3 py-1 rounded bg-slate-900/70 border border-slate-600 text-xs font-mono text-slate-200 flex gap-3 items-center">
          <span>P2P</span>
          <span>mySide=<b className="text-yellow-300">{myCanonicalSide}</b></span>
          <span>turn=<b className={isMyTurn ? 'text-green-400' : 'text-red-400'}>{currentTurn}</b></span>
          <span className={isMyTurn ? 'text-green-400 font-bold' : 'text-slate-400'}>
            {isMyTurn ? 'TU TURNO — mueve una pieza' : 'ESPERANDO AL OPONENTE…'}
          </span>
        </div>
      )}
      <div className={`chess-turn-banner chess-banner-enter ${isMyTurn ? 'chess-turn-player' : 'chess-turn-opponent'}`}>
        <span className="chess-turn-text">
          {isMyTurn ? 'ᚱ YOUR COMMAND ᚱ' : 'ᚱ FOE STIRS ᚱ'}
        </span>
        {gameStatus === 'combat' && (
          <span className="ml-2 text-yellow-400 animate-pulse">⚔ Combat!</span>
        )}
        {gameStatus === myWinStatus && (
          <span className="ml-2 text-green-400 font-bold">Victory!</span>
        )}
        {gameStatus === oppWinStatus && (
          <span className="ml-2 text-red-400 font-bold">Defeat</span>
        )}
      </div>
      
      {noMovesMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-2 px-4 py-2 bg-red-900/80 border border-red-500 rounded-lg text-red-200 text-sm"
        >
          {noMovesMessage}
        </motion.div>
      )}
      
      <div className="relative [perspective:1200px]">
        <motion.div
          ref={boardRef}
          className="chess-board rounded-lg overflow-hidden grid aspect-[5/7] origin-bottom [transform:rotateX(2deg)] w-[min(500px,85vw,calc(70vh*5/7))]"
          style={{
            gridTemplateRows: `repeat(${BOARD_ROWS}, 1fr)`,
            gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`,
          }}
          animate={screenShake ? {
            x: [0, -5, 5, -5, 5, 0],
            y: [0, 2, -2, 2, -2, 0]
          } : {}}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {cells}
        </motion.div>
        <div className="chess-board-vignette" />
        <div className="chess-board-particles" />
      </div>
      
      {/* Attack Animation Overlay */}
      <ChessAttackAnimation
        animation={pendingAttackAnimation}
        onAnimationComplete={handleAttackAnimationComplete}
        cellSize={boardRect.width / BOARD_COLS}
        boardOffset={{ x: boardRect.x, y: boardRect.y }}
      />
    </div>
  );
};

export default ChessBoard;
