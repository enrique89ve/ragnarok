import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessPiece, ChessPieceType, PIECE_DISPLAY_NAMES } from '../../types/ChessTypes';
import { useGameStore } from '../../stores/gameStore';
import { PIECE_COLOR_BY_TYPE } from './pieceVisuals';
import { PieceGlyph } from './PieceGlyph';
import './VSScreen.css';

interface VSScreenProps {
  attacker: ChessPiece;
  defender: ChessPiece;
  onComplete: () => void;
  duration?: number;
}

const VS_DEFAULT_DURATION_MS = 4200;
const VS_ENTER_DELAY_MS = 540;
const VS_EXIT_LEAD_MS = 780;
const VS_MIN_DURATION_MS = 4000;

const VSScreen: React.FC<VSScreenProps> = ({ 
  attacker, 
  defender, 
  onComplete,
  duration = VS_DEFAULT_DURATION_MS 
}) => {
  const [phase, setPhase] = useState<'enter' | 'vs' | 'exit'>('enter');
  // Viewer-relative labeling: "PLAYER" = me locally regardless of canonical side.
  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
  const safeDuration = Math.max(VS_MIN_DURATION_MS, duration);
  const exitAt = Math.max(VS_EXIT_LEAD_MS + VS_ENTER_DELAY_MS, safeDuration - VS_EXIT_LEAD_MS);

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('vs'), VS_ENTER_DELAY_MS);
    const exitTimer = setTimeout(() => setPhase('exit'), exitAt);
    const completeTimer = setTimeout(onComplete, safeDuration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [safeDuration, exitAt, onComplete]);

  const getClassColor = (heroClass: string): string => {
    const colorMap: Record<string, string> = {
      mage: '#7ba7f8',
      warrior: '#a37a3f',
      priest: '#d7c08a',
      rogue: '#a086ff',
      paladin: '#ca9f43',
      neutral: '#70808f',
    };
    return colorMap[heroClass] || colorMap['neutral'];
  };

  const getPieceTitle = (piece: ChessPiece) => {
    return piece.heroName || `${piece.type.charAt(0).toUpperCase()}${piece.type.slice(1)}`;
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="vs-screen-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="vs-screen-backdrop" />
        
        <div className="vs-screen-content">
          <motion.div 
            className="vs-fighter vs-fighter-left"
            initial={{ x: '-100vw' }}
            animate={{ 
              x: phase === 'exit' ? '-100vw' : 0
            }}
            transition={{ 
              type: 'tween',
              duration: 0.78,
              ease: 'easeOut'
            }}
          >
            <div className="vs-fighter-glow vs-fighter-glow-blue" />
            <div 
              className="vs-portrait-container"
              style={{ backgroundColor: getClassColor(attacker.heroClass) }}
            >
              <PieceGlyph
                pieceType={attacker.type}
                fallbackColor={PIECE_COLOR_BY_TYPE[attacker.type]}
                size="clamp(114px, 23cqw, 218px)"
                className="vs-portrait-glyph"
                fallbackTextShadow="0 4px 14px rgba(0,0,0,0.7)"
              />
            </div>
            <div className="vs-fighter-info">
              <span className="vs-fighter-owner">
                {attacker.owner === myCanonicalSide ? 'PLAYER' : 'OPPONENT'}
              </span>
              <span className="vs-fighter-name">{getPieceTitle(attacker)}</span>
              <span className="vs-fighter-type">{PIECE_DISPLAY_NAMES[attacker.type as ChessPieceType].toUpperCase()}</span>
              <div className="vs-fighter-stats">
                <span className="vs-stat">❤️ {attacker.health}</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="vs-center"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ 
              scale: phase === 'vs' ? 1 : (phase === 'exit' ? 0 : 0.85),
              opacity: phase === 'exit' ? 0 : 1
            }}
            transition={{ 
              duration: 0.85,
              ease: 'easeOut'
            }}
          >
            <div className="vs-center-frame">
              <div className="vs-text">
                <span className="vs-letter">V</span>
                <span className="vs-letter">S</span>
              </div>
              <div className="vs-sparks" />
            </div>
          </motion.div>

          <motion.div 
            className="vs-fighter vs-fighter-right"
            initial={{ x: '100vw' }}
            animate={{ 
              x: phase === 'exit' ? '100vw' : 0
            }}
            transition={{ 
              type: 'tween',
              duration: 0.78,
              ease: 'easeOut'
            }}
          >
            <div className="vs-fighter-glow vs-fighter-glow-red" />
            <div 
              className="vs-portrait-container"
              style={{ backgroundColor: getClassColor(defender.heroClass) }}
            >
              <PieceGlyph
                pieceType={defender.type}
                fallbackColor={PIECE_COLOR_BY_TYPE[defender.type]}
                size="clamp(114px, 23cqw, 218px)"
                className="vs-portrait-glyph"
                fallbackTextShadow="0 4px 14px rgba(0,0,0,0.7)"
              />
            </div>
            <div className="vs-fighter-info">
              <span className="vs-fighter-owner">
                {defender.owner === myCanonicalSide ? 'PLAYER' : 'OPPONENT'}
              </span>
              <span className="vs-fighter-name">{getPieceTitle(defender)}</span>
              <span className="vs-fighter-type">{PIECE_DISPLAY_NAMES[defender.type as ChessPieceType].toUpperCase()}</span>
              <div className="vs-fighter-stats">
                <span className="vs-stat">❤️ {defender.health}</span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="vs-bottom-bar"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <span className="vs-battle-text">PREPARE FOR BATTLE</span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VSScreen;
