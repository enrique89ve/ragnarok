/**
 * ChessAttackAnimation.tsx
 * 
 * Smooth attack animation for chess pieces.
 * Shows the attacking piece moving toward the target before combat begins.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessPiece, ChessBoardPosition, ELEMENT_COLORS } from '../../types/ChessTypes';

interface AttackAnimationData {
  attacker: ChessPiece;
  defender: ChessPiece;
  attackerPosition: ChessBoardPosition;
  defenderPosition: ChessBoardPosition;
  isInstantKill: boolean;
}

interface ChessAttackAnimationProps {
  animation: AttackAnimationData | null;
  onAnimationComplete: () => void;
  cellSize: number;
  boardOffset: { x: number; y: number };
}

const PIECE_ICONS: Record<string, string> = {
  king: '♔',
  queen: '♕',
  rook: '♖',
  bishop: '♗',
  knight: '♘',
  pawn: '♙'
};

const PIECE_COLORS: Record<string, string> = {
  king: '#FFD700',
  queen: '#69CCF0',
  rook: '#C79C6E',
  bishop: '#FFFFFF',
  knight: '#FFF569',
  pawn: '#999999'
};

export const ChessAttackAnimation: React.FC<ChessAttackAnimationProps> = ({
  animation,
  onAnimationComplete,
  cellSize,
  boardOffset
}) => {
  const [phase, setPhase] = useState<'idle' | 'moving' | 'impact' | 'done'>('idle');
  const animationIdRef = useRef<string | null>(null);

  const calculatePixelPosition = useCallback((position: ChessBoardPosition) => {
    const col = position.col;
    const row = 6 - position.row;
    return {
      x: boardOffset.x + col * cellSize + cellSize / 2,
      y: boardOffset.y + row * cellSize + cellSize / 2
    };
  }, [cellSize, boardOffset]);

  useEffect(() => {
    if (!animation) {
      setPhase('idle');
      animationIdRef.current = null;
      return;
    }

    // Create unique ID for this animation to prevent stale closure issues
    const currentAnimationId = `${animation.attacker.id}-${animation.defender.id}-${Date.now()}`;
    animationIdRef.current = currentAnimationId;

    setPhase('moving');

    const moveTimeout = setTimeout(() => {
      // Validate we're still handling the same animation
      if (animationIdRef.current !== currentAnimationId) return;
      setPhase('impact');
    }, 400);

    const completeTimeout = setTimeout(() => {
      // Validate we're still handling the same animation
      if (animationIdRef.current !== currentAnimationId) return;
      setPhase('done');
      onAnimationComplete();
    }, 800);

    return () => {
      clearTimeout(moveTimeout);
      clearTimeout(completeTimeout);
    };
  }, [animation, onAnimationComplete]);

  if (!animation || phase === 'idle' || phase === 'done') {
    return null;
  }

  const attackerStart = calculatePixelPosition(animation.attackerPosition);
  const defenderPos = calculatePixelPosition(animation.defenderPosition);
  const isPlayer = animation.attacker.owner === 'player';
  const elementColor = ELEMENT_COLORS[animation.attacker.element] || '#ffffff';

  return (
    <AnimatePresence>
      <div 
        className="chess-attack-animation-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 1000
        }}
      >
        {/* Moving attacker piece */}
        <motion.div
          initial={{
            x: attackerStart.x - cellSize / 2,
            y: attackerStart.y - cellSize / 2,
            scale: 1,
            opacity: 1
          }}
          animate={{
            x: phase === 'moving' || phase === 'impact' 
              ? defenderPos.x - cellSize / 2 
              : attackerStart.x - cellSize / 2,
            y: phase === 'moving' || phase === 'impact'
              ? defenderPos.y - cellSize / 2
              : attackerStart.y - cellSize / 2,
            scale: phase === 'impact' ? 1.3 : 1,
            opacity: 1
          }}
          transition={{
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          style={{
            position: 'absolute',
            width: cellSize,
            height: cellSize,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            backgroundColor: isPlayer ? 'rgb(30, 58, 138)' : 'rgb(127, 29, 29)',
            boxShadow: `0 0 20px ${elementColor}, 0 0 40px ${elementColor}50`,
            border: `2px solid ${elementColor}`,
            zIndex: 1001
          }}
        >
          <span 
            className={`text-3xl ${!isPlayer ? 'transform rotate-180' : ''}`}
            style={{ color: PIECE_COLORS[animation.attacker.type] }}
          >
            {PIECE_ICONS[animation.attacker.type]}
          </span>
          <div className="text-xs text-white font-bold mt-0.5 truncate max-w-full px-1">
            {animation.attacker.heroName.split(' ')[0]}
          </div>
        </motion.div>

        {/* Attack trail effect */}
        <motion.div
          initial={{
            x: attackerStart.x,
            y: attackerStart.y,
            opacity: 0.8,
            scale: 0.5
          }}
          animate={{
            x: defenderPos.x,
            y: defenderPos.y,
            opacity: 0,
            scale: 0.1
          }}
          transition={{
            duration: 0.5,
            ease: 'easeOut'
          }}
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: elementColor,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 10px ${elementColor}`,
            zIndex: 999
          }}
        />

        {/* Impact effect on defender */}
        {phase === 'impact' && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: defenderPos.x,
              top: defenderPos.y,
              width: cellSize,
              height: cellSize,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: animation.isInstantKill
                ? 'radial-gradient(circle, #facc15 0%, #f97316 40%, transparent 70%)'
                : 'radial-gradient(circle, #ef4444 0%, #dc2626 40%, transparent 70%)',
              zIndex: 998
            }}
          />
        )}

        {/* Clash text */}
        {phase === 'impact' && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'backOut' }}
            style={{
              position: 'absolute',
              left: defenderPos.x,
              top: defenderPos.y - cellSize,
              transform: 'translateX(-50%)',
              zIndex: 1002
            }}
          >
            <div 
              className="px-4 py-2 rounded-lg font-bold text-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,0,50,0.9))',
                border: animation.isInstantKill 
                  ? '2px solid #facc15' 
                  : '2px solid #ef4444',
                color: animation.isInstantKill ? '#facc15' : '#ef4444',
                textShadow: `0 0 10px ${animation.isInstantKill ? '#facc15' : '#ef4444'}`,
                boxShadow: `0 0 20px ${animation.isInstantKill ? '#facc15' : '#ef4444'}50`
              }}
            >
              {animation.isInstantKill ? '⚔ STRIKE!' : '⚔ COMBAT!'}
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default ChessAttackAnimation;
