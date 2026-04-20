import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessPiece, ChessPieceType, PIECE_DISPLAY_NAMES } from '../../types/ChessTypes';
import './VSScreen.css';

interface VSScreenProps {
  attacker: ChessPiece;
  defender: ChessPiece;
  onComplete: () => void;
  duration?: number;
}

const VSScreen: React.FC<VSScreenProps> = ({ 
  attacker, 
  defender, 
  onComplete,
  duration = 2000 
}) => {
  const [phase, setPhase] = useState<'enter' | 'vs' | 'exit'>('enter');

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('vs'), 400);
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 400);
    const completeTimer = setTimeout(onComplete, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  const getPieceTypeEmoji = (type: string): string => {
    const emojiMap: Record<string, string> = {
      'king': '👑',
      'queen': '♛',
      'rook': '♜',
      'bishop': '♝',
      'knight': '♞',
      'pawn': '♟'
    };
    return emojiMap[type] || '⚔️';
  };

  const getClassColor = (heroClass: string): string => {
    const colorMap: Record<string, string> = {
      'mage': '#3498db',
      'warrior': '#c0392b',
      'priest': '#f1c40f',
      'rogue': '#9b59b6',
      'paladin': '#f39c12',
      'neutral': '#7f8c8d'
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
        transition={{ duration: 0.3 }}
      >
        <div className="vs-screen-backdrop" />
        
        <div className="vs-screen-content">
          <motion.div 
            className="vs-fighter vs-fighter-left"
            initial={{ x: '-100vw', rotate: -15 }}
            animate={{ 
              x: phase === 'exit' ? '-100vw' : 0, 
              rotate: phase === 'vs' ? 0 : -15 
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 100, 
              damping: 15,
              duration: 0.5
            }}
          >
            <div className="vs-fighter-glow vs-fighter-glow-blue" />
            <div 
              className="vs-portrait-container"
              style={{ backgroundColor: getClassColor(attacker.heroClass) }}
            >
              <span className="vs-portrait-emoji">{getPieceTypeEmoji(attacker.type)}</span>
            </div>
            <div className="vs-fighter-info">
              <span className="vs-fighter-owner">
                {attacker.owner === 'player' ? 'PLAYER' : 'OPPONENT'}
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
            initial={{ scale: 0, rotate: 180 }}
            animate={{ 
              scale: phase === 'vs' ? [0, 1.5, 1] : (phase === 'exit' ? 0 : 0),
              rotate: phase === 'vs' ? 0 : 180
            }}
            transition={{ 
              duration: 0.5,
              times: [0, 0.6, 1]
            }}
          >
            <div className="vs-text">
              <span className="vs-letter">V</span>
              <span className="vs-letter">S</span>
            </div>
            <div className="vs-sparks" />
          </motion.div>

          <motion.div 
            className="vs-fighter vs-fighter-right"
            initial={{ x: '100vw', rotate: 15 }}
            animate={{ 
              x: phase === 'exit' ? '100vw' : 0, 
              rotate: phase === 'vs' ? 0 : 15 
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 100, 
              damping: 15,
              duration: 0.5
            }}
          >
            <div className="vs-fighter-glow vs-fighter-glow-red" />
            <div 
              className="vs-portrait-container"
              style={{ backgroundColor: getClassColor(defender.heroClass) }}
            >
              <span className="vs-portrait-emoji">{getPieceTypeEmoji(defender.type)}</span>
            </div>
            <div className="vs-fighter-info">
              <span className="vs-fighter-owner">
                {defender.owner === 'player' ? 'PLAYER' : 'OPPONENT'}
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
          transition={{ delay: 0.3 }}
        >
          <span className="vs-battle-text">PREPARE FOR BATTLE</span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VSScreen;
