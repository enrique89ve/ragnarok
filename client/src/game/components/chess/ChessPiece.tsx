import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessPiece as ChessPieceType, ChessPieceType as PieceType, ELEMENT_COLORS, ELEMENT_ICONS, ElementType } from '../../types/ChessTypes';
import type { MatchupGlow } from '../../utils/chess/elementMatchupUtils';
import { assetPath } from '../../utils/assetPath';
import './ChessPiece.css';

const ELEMENT_IMAGES: Record<ElementType, string | null> = {
  fire: assetPath('/textures/elements/fire.webp'),
  water: assetPath('/textures/elements/water.webp'),
  wind: assetPath('/textures/elements/wind.webp'),
  earth: assetPath('/textures/elements/earth.webp'),
  holy: assetPath('/textures/elements/holy.webp'),
  shadow: assetPath('/textures/elements/shadow.webp'),
  neutral: null
};

const PIECE_ICONS: Record<PieceType, string> = {
  king: '♔',
  queen: '♕',
  rook: '♖',
  bishop: '♗',
  knight: '♘',
  pawn: '♙'
};

const PIECE_COLORS: Record<PieceType, string> = {
  king: '#FFD700',
  queen: '#69CCF0',
  rook: '#C79C6E',
  bishop: '#FFFFFF',
  knight: '#FFF569',
  pawn: '#999999'
};

const ELEMENT_GLOW: Record<ElementType, { color: string; shadow: string; brightShadow: string }> = {
  fire: { 
    color: '#ff4500', 
    shadow: '0 0 20px #ff4500, 0 0 40px rgba(255, 69, 0, 0.7), 0 0 60px rgba(255, 100, 0, 0.4)',
    brightShadow: '0 0 30px #ff6600, 0 0 60px rgba(255, 69, 0, 0.9), 0 0 80px rgba(255, 100, 0, 0.6)'
  },
  water: { 
    color: '#00bfff', 
    shadow: '0 0 20px #00bfff, 0 0 40px rgba(0, 191, 255, 0.7), 0 0 60px rgba(30, 144, 255, 0.4)',
    brightShadow: '0 0 30px #00dfff, 0 0 60px rgba(0, 191, 255, 0.9), 0 0 80px rgba(30, 144, 255, 0.6)'
  },
  wind: { 
    color: '#32cd32', 
    shadow: '0 0 20px #32cd32, 0 0 40px rgba(50, 205, 50, 0.7), 0 0 60px rgba(0, 255, 0, 0.4)',
    brightShadow: '0 0 30px #50ff50, 0 0 60px rgba(50, 205, 50, 0.9), 0 0 80px rgba(0, 255, 0, 0.6)'
  },
  earth: { 
    color: '#cd853f', 
    shadow: '0 0 20px #cd853f, 0 0 40px rgba(205, 133, 63, 0.7), 0 0 60px rgba(139, 69, 19, 0.4)',
    brightShadow: '0 0 30px #daa520, 0 0 60px rgba(205, 133, 63, 0.9), 0 0 80px rgba(218, 165, 32, 0.6)'
  },
  holy: { 
    color: '#ffd700', 
    shadow: '0 0 25px #ffd700, 0 0 50px rgba(255, 215, 0, 0.8), 0 0 75px rgba(255, 255, 100, 0.5)',
    brightShadow: '0 0 35px #ffff00, 0 0 70px rgba(255, 215, 0, 1), 0 0 100px rgba(255, 255, 100, 0.7)'
  },
  shadow: { 
    color: '#9932cc', 
    shadow: '0 0 20px #9932cc, 0 0 40px rgba(153, 50, 204, 0.7), 0 0 60px rgba(75, 0, 130, 0.4)',
    brightShadow: '0 0 30px #bb44ee, 0 0 60px rgba(153, 50, 204, 0.9), 0 0 80px rgba(75, 0, 130, 0.6)'
  },
  neutral: { color: '#808080', shadow: 'none', brightShadow: 'none' }
};

interface ChessPieceProps {
  piece: ChessPieceType;
  isSelected: boolean;
  isPlayerTurn: boolean;
  onClick: () => void;
  matchupGlow?: MatchupGlow;
}

const PIECE_TYPE_NAMES: Record<PieceType, string> = {
  king: 'Protogenoi',
  queen: 'Sovereign',
  rook: 'Shaper',
  bishop: 'Luminary',
  knight: 'Ethereal',
  pawn: 'Einherjar'
};

const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: 'Fire',
  water: 'Water',
  wind: 'Wind',
  earth: 'Earth',
  holy: 'Holy',
  shadow: 'Shadow',
  neutral: 'Neutral'
};

const ChessPieceComponent: React.FC<ChessPieceProps> = ({
  piece,
  isSelected,
  isPlayerTurn,
  onClick,
  matchupGlow
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isPlayer = piece.owner === 'player';
  const canSelect = isPlayerTurn && isPlayer;
  const isPawn = piece.type === 'pawn';
  const isKing = piece.type === 'king';
  const isGod = !isPawn;
  const healthPercent = (isPawn || isKing) ? 100 : (piece.health / piece.maxHealth) * 100;
  const elementGlow = piece.element ? ELEMENT_GLOW[piece.element] : ELEMENT_GLOW.neutral;
  const hasElement = piece.element && piece.element !== 'neutral';
  const elementImage = piece.element ? ELEMENT_IMAGES[piece.element] : null;
  
  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 1000);
  };
  
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  };
  
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <motion.div
      data-piece-type={piece.type}
      className={`
        chess-piece w-full h-full flex flex-col items-center justify-center
        rounded-xl cursor-pointer transition-all relative
        ${isPlayer ? 'bg-gradient-to-b from-blue-900 to-blue-950' : 'bg-gradient-to-b from-red-900 to-red-950'}
        ${isSelected ? 'ring-4 ring-yellow-400 z-20' : ''}
        ${canSelect ? 'hover:brightness-110' : ''}
        ${hasElement ? `element-piece element-piece-${piece.element}` : ''}
        ${matchupGlow === 'advantage' ? 'matchup-pulse-advantage' : ''}
        ${matchupGlow === 'disadvantage' ? 'matchup-pulse-disadvantage' : ''}
        ${matchupGlow === 'mutual' ? 'matchup-pulse-mutual' : ''}
      `}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={canSelect ? { scale: 1.08 } : {}}
      whileTap={canSelect ? { scale: 0.95 } : {}}
      initial={{ scale: 0 }}
      animate={{ scale: isKing ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={hasElement ? { boxShadow: elementGlow.shadow } : undefined}
    >
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="god-tooltip"
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: '110%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              pointerEvents: 'none',
              minWidth: '180px'
            }}
          >
            <div 
              className="rounded-lg p-3 text-white text-left shadow-xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.98), rgba(20, 20, 35, 0.98))',
                border: hasElement ? `2px solid ${ELEMENT_COLORS[piece.element!]}` : '2px solid rgba(100, 100, 150, 0.5)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <div className="font-bold text-sm mb-1" style={{ color: hasElement ? ELEMENT_COLORS[piece.element!] : '#fff' }}>
                {piece.heroName}
              </div>
              <div className="text-xs text-gray-300 mb-2">
                {PIECE_TYPE_NAMES[piece.type]} • {isPlayer ? 'Your Piece' : 'Enemy'}
              </div>
              {hasElement && (
                <div 
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    background: `${ELEMENT_COLORS[piece.element!]}20`,
                    border: `1px solid ${ELEMENT_COLORS[piece.element!]}50`
                  }}
                >
                  <span>{ELEMENT_ICONS[piece.element!]}</span>
                  <span style={{ color: ELEMENT_COLORS[piece.element!] }}>{ELEMENT_NAMES[piece.element!]} Element</span>
                </div>
              )}
              {(!isPawn && !isKing) && (
                <div className="mt-2 text-xs text-gray-400 flex justify-between">
                  <span>HP: {piece.health}/{piece.maxHealth}</span>
                  {piece.stamina > 0 && <span>STA: {piece.stamina}</span>}
                </div>
              )}
            </div>
            <div 
              className="absolute left-1/2 -bottom-2"
              style={{
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: hasElement ? `8px solid ${ELEMENT_COLORS[piece.element!]}` : '8px solid rgba(100, 100, 150, 0.5)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {hasElement && elementImage && (
        <>
          <div 
            className={`element-image-bg element-image-${piece.element}`}
            style={{ backgroundImage: `url(${elementImage})` }}
          />
          <div className={`element-overlay element-overlay-${piece.element}`} />
        </>
      )}
      
      {hasElement && (
        <div className={`element-effect-layer element-effect-${piece.element}`} />
      )}
      
      {(!isPawn && !isKing) && (
        <div className="absolute top-0 left-0 right-0 h-2 bg-gray-900/80 rounded-t-xl overflow-hidden z-30">
          <div 
            className={`h-full transition-all ${healthPercent > 50 ? 'bg-gradient-to-r from-green-400 to-green-500' : healthPercent > 25 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      )}

      {isGod && hasElement && (
        <div
          className="god-piece-aura"
          style={{ background: `radial-gradient(circle, ${elementGlow.color}40 0%, ${elementGlow.color}15 50%, transparent 70%)` }}
        />
      )}

      <span
        className={`${isPawn ? 'text-3xl' : 'text-4xl'} relative z-20 drop-shadow-lg ${isPlayer ? '' : 'transform rotate-180'}`}
        style={{
          color: PIECE_COLORS[piece.type],
          textShadow: hasElement
            ? `0 0 12px ${elementGlow.color}, 0 0 24px ${elementGlow.color}`
            : '2px 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        {PIECE_ICONS[piece.type]}
      </span>

      <div className="text-xs text-white font-bold mt-0.5 truncate max-w-full px-1 relative z-20 drop-shadow-md">
        {piece.heroName.split(' ')[0]}
      </div>

      {(!isPawn && !isKing) && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1.5 pb-1 text-xs z-30">
          <span className="text-red-300 font-bold drop-shadow-lg bg-black/40 px-1 rounded">{piece.health}</span>
          {piece.stamina > 0 && (
            <span className="text-yellow-300 font-bold drop-shadow-lg bg-black/40 px-1 rounded">⚡{piece.stamina}</span>
          )}
        </div>
      )}
      
      {hasElement && (
        <div 
          className={`element-badge-large element-badge-${piece.element}`}
          style={{ 
            backgroundColor: ELEMENT_COLORS[piece.element],
            boxShadow: `0 0 10px ${ELEMENT_COLORS[piece.element]}, 0 0 20px ${ELEMENT_COLORS[piece.element]}`
          }}
          title={`${piece.element.charAt(0).toUpperCase() + piece.element.slice(1)} Element`}
        >
          <span className="element-icon-large">{ELEMENT_ICONS[piece.element]}</span>
        </div>
      )}
      
      {hasElement && (
        <div className={`element-border-glow element-border-${piece.element}`} />
      )}
      
    </motion.div>
  );
};

export default ChessPieceComponent;
