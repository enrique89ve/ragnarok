import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChessCombatAdapter } from '../../hooks/useChessCombatAdapter';
import { ChessBoardPosition, BOARD_ROWS, BOARD_COLS } from '../../types/ChessTypes';
import ChessPieceComponent from './ChessPiece';
import MovePlate from './MovePlate';
import ChessAttackAnimation from './ChessAttackAnimation';
import { useAudio } from '../../../lib/stores/useAudio';
import { useKingChessAbility } from '../../hooks/useKingChessAbility';
import { debug } from '../../config/debugConfig';
import { computeMatchupGlows } from '../../utils/chess/elementMatchupUtils';
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

interface ChessBoardProps {
  onCombatTriggered?: (attackerId: string, defenderId: string) => void;
  disabled?: boolean;
}

interface InstantKillFlash {
  position: ChessBoardPosition;
  attackerType: string;
}

interface MinePlacementEffect {
  position: ChessBoardPosition;
  tiles: ChessBoardPosition[];
  timestamp: number;
}

interface MineTriggerEffect {
  tiles: ChessBoardPosition[];
  timestamp: number;
}

const ChessBoard: React.FC<ChessBoardProps> = ({ onCombatTriggered, disabled = false }) => {
  const { playSoundEffect } = useAudio();
  const [noMovesMessage, setNoMovesMessage] = useState<string | null>(null);
  const [instantKillFlash, setInstantKillFlash] = useState<InstantKillFlash | null>(null);
  const [hoverPosition, setHoverPosition] = useState<ChessBoardPosition | null>(null);
  const [minePlacementEffect, setMinePlacementEffect] = useState<MinePlacementEffect | null>(null);
  const [mineTriggerEffect, setMineTriggerEffect] = useState<MineTriggerEffect | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [fallingKingId, setFallingKingId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardRect, setBoardRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const {
    boardState,
    selectPiece,
    movePiece,
    getPieceAt,
    getValidMoves,
    lastInstantKill,
    pendingAttackAnimation,
    completeAttackAnimation
  } = useChessCombatAdapter();
  
  const {
    isPlacementMode,
    visibleMines,
    getPreviewForPosition,
    placeMineAtPosition,
    isValidPlacement,
    lastMineTriggered,
    clearMineTriggered
  } = useKingChessAbility('player');
  
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
  
  useEffect(() => {
    if (!lastMineTriggered) return;
    
    setMineTriggerEffect({
      tiles: lastMineTriggered.mine.affectedTiles,
      timestamp: Date.now()
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
    const { gameStatus: gs, pieces: ps } = boardState;
    if (gs === 'player_wins' || gs === 'opponent_wins') {
      const losingSide = gs === 'player_wins' ? 'opponent' : 'player';
      const losingKing = ps.find(p => p.type === 'king' && p.owner === losingSide);
      if (losingKing) {
        setFallingKingId(losingKing.id);
      }
    } else {
      setFallingKingId(null);
    }
  }, [boardState.gameStatus]);

  const handleAnimationComplete = useCallback(() => {
    const animation = pendingAttackAnimation;
    if (!animation) return;
    
    playSoundEffect('attack');
    
    if (animation.isInstantKill) {
      setInstantKillFlash({
        position: animation.defenderPosition,
        attackerType: animation.attacker.type
      });
      setTimeout(() => setInstantKillFlash(null), 600);
    }
    
    completeAttackAnimation();
    
    if (!animation.isInstantKill && onCombatTriggered) {
      onCombatTriggered(animation.attacker.id, animation.defender.id);
    }
  }, [pendingAttackAnimation, completeAttackAnimation, onCombatTriggered, playSoundEffect]);
  
  // Watch for AI instant-kills from store
  useEffect(() => {
    if (lastInstantKill) {
      setInstantKillFlash({
        position: lastInstantKill.position,
        attackerType: lastInstantKill.attackerType
      });
      const timer = setTimeout(() => setInstantKillFlash(null), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastInstantKill?.timestamp]);

  const { pieces, currentTurn, selectedPiece, validMoves, attackMoves, gameStatus } = boardState;

  const matchupGlowMap = useMemo(() => {
    if (!selectedPiece || selectedPiece.owner !== 'player' || currentTurn !== 'player') {
      return {};
    }
    return computeMatchupGlows(selectedPiece.element, pieces, selectedPiece.owner);
  }, [selectedPiece?.id, selectedPiece?.element, selectedPiece?.owner, currentTurn, pieces]);

  const playerPieceCount = pieces.filter(p => p.owner === 'player').length;
  const opponentPieceCount = pieces.filter(p => p.owner === 'opponent').length;

  const handleCellClick = useCallback((row: number, col: number) => {
    if (disabled && !isPlacementMode) return;
    
    const position: ChessBoardPosition = { row, col };
    setNoMovesMessage(null);
    
    if (isPlacementMode) {
      if (isValidPlacement(position)) {
        const previewTiles = getPreviewForPosition(position);
        const success = placeMineAtPosition(position);
        if (success) {
          playSoundEffect('card_play');
          debug.chess(`Mine placed at (${row}, ${col})`);
          setMinePlacementEffect({
            position,
            tiles: previewTiles,
            timestamp: Date.now()
          });
          setTimeout(() => setMinePlacementEffect(null), 1200);
        }
      }
      return;
    }
    
    const isValidMove = validMoves.some(m => m.row === row && m.col === col);
    const isAttackMove = attackMoves.some(m => m.row === row && m.col === col);
    
    if (isValidMove || isAttackMove) {
      const collision = movePiece(position);
      
      if (collision) {
        debug.chess(`Attack initiated: ${collision.attacker.heroName} -> ${collision.defender.heroName}`);
      } else {
        playSoundEffect('card_play');
      }
      return;
    }

    const pieceAtPosition = getPieceAt(position);
    
    if (pieceAtPosition) {
      if (pieceAtPosition.owner === currentTurn) {
        const { moves, attacks } = getValidMoves(pieceAtPosition);
        debug.chess(`Selected ${pieceAtPosition.type} at (${row}, ${col}). Valid moves: ${moves.length}, attacks: ${attacks.length}`);
        
        if (moves.length === 0 && attacks.length === 0) {
          setNoMovesMessage(`${pieceAtPosition.heroName} is blocked and cannot move!`);
          setTimeout(() => setNoMovesMessage(null), 2000);
        }
        
        selectPiece(pieceAtPosition);
        playSoundEffect('card_click');
      }
    } else {
      selectPiece(null);
    }
  }, [disabled, isPlacementMode, isValidPlacement, placeMineAtPosition, validMoves, attackMoves, currentTurn, movePiece, getPieceAt, selectPiece, getValidMoves, playSoundEffect]);
  
  const handleCellHover = useCallback((row: number, col: number) => {
    if (isPlacementMode) {
      setHoverPosition({ row, col });
    }
  }, [isPlacementMode]);
  
  const handleCellLeave = useCallback(() => {
    setHoverPosition(null);
  }, []);

  const isValidMovePosition = (row: number, col: number) => {
    return validMoves.some(m => m.row === row && m.col === col);
  };

  const isAttackPosition = (row: number, col: number) => {
    return attackMoves.some(m => m.row === row && m.col === col);
  };

  const previewTiles = hoverPosition ? getPreviewForPosition(hoverPosition) : [];
  
  const isMinePreviewTile = (row: number, col: number) => {
    return previewTiles.some(t => t.row === row && t.col === col);
  };
  
  const isActiveMinePosition = (row: number, col: number) => {
    return visibleMines.some(t => t.row === row && t.col === col);
  };
  
  const renderCell = (row: number, col: number) => {
    const position: ChessBoardPosition = { row, col };
    const piece = getPieceAt(position);
    const isLight = (row + col) % 2 === 0;
    const isValid = isValidMovePosition(row, col);
    const isAttack = isAttackPosition(row, col);
    const isFlashCell = instantKillFlash?.position.row === row && instantKillFlash?.position.col === col;
    const isMinePreview = isPlacementMode && isMinePreviewTile(row, col);
    const isActiveMine = isActiveMinePosition(row, col);
    const canPlaceHere = isPlacementMode && hoverPosition && isValidPlacement(hoverPosition);
    const isPlacementBurst = minePlacementEffect?.tiles.some(t => t.row === row && t.col === col);
    const isMineTriggerExplosion = mineTriggerEffect?.tiles.some(t => t.row === row && t.col === col);
    
    return (
      <div
        key={`${row}-${col}`}
        className={`
          chess-cell relative aspect-square overflow-visible
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
                isSelected={selectedPiece?.id === piece.id}
                isPlayerTurn={currentTurn === 'player'}
                onClick={() => handleCellClick(row, col)}
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

  const cells = [];
  for (let row = BOARD_ROWS - 1; row >= 0; row--) {
    for (let col = 0; col < BOARD_COLS; col++) {
      cells.push(renderCell(row, col));
    }
  }

  return (
    <div className="chess-board-container flex flex-col items-center">
      <div className={`chess-turn-banner chess-banner-enter ${currentTurn === 'player' ? 'chess-turn-player' : 'chess-turn-opponent'}`}>
        <span className="chess-turn-text">
          {currentTurn === 'player' ? 'ᚱ YOUR COMMAND ᚱ' : 'ᚱ FOE STIRS ᚱ'}
        </span>
        {gameStatus === 'combat' && (
          <span className="ml-2 text-yellow-400 animate-pulse">⚔ Combat!</span>
        )}
        {gameStatus === 'player_wins' && (
          <span className="ml-2 text-green-400 font-bold">Victory!</span>
        )}
        {gameStatus === 'opponent_wins' && (
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
      
      <div className="relative" style={{ perspective: '1200px' }}>
        <motion.div
          ref={boardRef}
          className="chess-board rounded-lg overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateRows: `repeat(${BOARD_ROWS}, 1fr)`,
            gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`,
            width: 'min(500px, 85vw)',
            aspectRatio: `${BOARD_COLS}/${BOARD_ROWS}`,
            transform: 'rotateX(2deg)',
            transformOrigin: 'center bottom'
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
        animation={pendingAttackAnimation ? {
          attacker: pendingAttackAnimation.attacker,
          defender: pendingAttackAnimation.defender,
          attackerPosition: pendingAttackAnimation.attackerPosition,
          defenderPosition: pendingAttackAnimation.defenderPosition,
          isInstantKill: pendingAttackAnimation.isInstantKill
        } : null}
        onAnimationComplete={handleAnimationComplete}
        cellSize={boardRect.width / BOARD_COLS}
        boardOffset={{ x: boardRect.x, y: boardRect.y }}
      />
    </div>
  );
};

export default ChessBoard;
