import React from 'react';
import { motion } from 'framer-motion';
import { ChessPiece as ChessPieceType, ELEMENT_COLORS, ELEMENT_ICONS, type ElementType } from '../../types/ChessTypes';
import { useGameStore } from '../../stores/gameStore';
import { useChessHoverStore } from '../../stores/chessHoverStore';
import { PIECE_COLOR_BY_TYPE } from './pieceVisuals';
import { PieceGlyph } from './PieceGlyph';
import clsx from 'clsx';
import './ChessPiece.css';

const ELEMENT_GLOW: Record<ElementType, { color: string }> = {
  fire: { color: '#ff5500' },
  water: { color: '#00ccff' },
  wind: { color: '#44ff88' },
  earth: { color: '#df9955' },
  holy: { color: '#ffcc00' },
  shadow: { color: '#cc44ff' },
  neutral: { color: '#ffffff' }
};

export type ChessPieceVisualState =
  | { readonly tag: 'idle' }
  | { readonly tag: 'selected' }
  | { readonly tag: 'attackable' }
  | { readonly tag: 'locked' };

interface ChessPieceProps {
  piece: ChessPieceType;
  visualState: ChessPieceVisualState;
  isPlayerTurn: boolean;
  isMotionEnabled?: boolean;
  useEnhancedFx?: boolean;
}

const OWNER_CLASSES = {
  player: 'owner-frame-player',
  opponent: 'owner-frame-opponent',
} satisfies Record<'player' | 'opponent', string>;

const VISUAL_STATE_CLASSES = {
  idle: '',
  selected: 'ring-3 ring-amber-300/85 z-20',
  attackable: 'ring-[6px] ring-red-500/75 border-3 border-red-500/75 outline outline-2 outline-red-400/65 outline-offset-0 shadow-[0_0_10px_rgba(248,113,113,0.4)] z-30 scale-105',
  locked: '',
} satisfies Record<ChessPieceVisualState['tag'], string>;

const cx = (...classes: Parameters<typeof clsx>) => clsx(...classes);

const ChessPieceComponent: React.FC<ChessPieceProps> = ({
  piece,
  visualState,
  isPlayerTurn,
  isMotionEnabled = true,
  useEnhancedFx = true,
}) => {
  const setHoveredPiece = useChessHoverStore(s => s.setHoveredPiece);

  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
  const isPlayer = piece.owner === myCanonicalSide;
  const isPawn = piece.type === 'pawn';
  const isKing = piece.type === 'king';
  const isAttackTarget = visualState.tag === 'attackable';
  const isQueen = piece.type === 'queen';
  const isRook = piece.type === 'rook';
  const isGod = !isPawn;
  const healthPercent = (isPawn || isKing) ? 100 : (piece.health / piece.maxHealth) * 100;
  const pieceElement = piece.element ?? 'neutral';
  const elementGlow = ELEMENT_GLOW[pieceElement];
  const hasElement = pieceElement !== 'neutral';
  const animateScale = visualState.tag === 'selected'
    ? (isKing ? 1.05 : 1.02)
    : (isKing ? 1.02 : 1);

  const handleMouseEnter = () => {
    if (!isPawn) setHoveredPiece(piece.id);
  };

  const handleMouseLeave = () => {
    if (!isPawn) setHoveredPiece(null);
  };

  return (
    <motion.div
      data-piece-id={piece.id}
      data-piece-type={piece.type}
      data-owner={piece.owner}
      data-chess-piece-motion="true"
      data-motion={isMotionEnabled ? 'on' : 'off'}
      data-fx={useEnhancedFx ? 'on' : 'off'}
      className={cx(
        'chess-piece w-full h-full flex flex-col items-center justify-center rounded-lg cursor-pointer relative',
        isPlayer ? OWNER_CLASSES.player : OWNER_CLASSES.opponent,
        VISUAL_STATE_CLASSES[visualState.tag],
        visualState.tag !== 'locked' && 'hover:brightness-103',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={isMotionEnabled && visualState.tag !== 'locked' ? { scale: 1.04 } : undefined}
      whileTap={isMotionEnabled && visualState.tag !== 'locked' ? { scale: 0.96 } : undefined}
      initial={false}
      animate={isMotionEnabled ? { scale: animateScale } : { scale: 1 }}
      transition={isMotionEnabled ? { type: 'spring', stiffness: 300, damping: 25 } : { duration: 0.05 }}
      style={{
        color: elementGlow.color,
        ...(isAttackTarget && {
          outline: '3px solid rgba(254, 226, 226, 0.55)',
          boxShadow: '0 0 10px rgba(248, 113, 113, 0.65), 0 0 18px rgba(248, 113, 113, 0.18)',
          borderColor: 'rgba(254, 226, 226, 0.75)',
        }),
      }}
    >
      {/* HUD SYSTEM */}
      <div className="piece-hud-container">
        <div className="owner-surface-tint" />
        <div className="owner-outer-glow" />
      </div>

      {/* ELEMENTAL EFFECTS: ROYAL & ELITE ENERGY (SVG-Turbo Charged) */}
        {isGod && hasElement && useEnhancedFx && (
        <div className={cx(
          "god-visual-layer",
          isKing
            ? 'king-celestial-flame'
            : isQueen
              ? 'queen-royal-flame'
              : isRook
                ? 'rook-whirlpool-flame'
                : 'elite-aura'
        )}>
          <div className="flame-core" />
          <div className="flame-outer" />
          {isKing && <div className="flame-rays" />}
        </div>
      )}

      {/* THE PIECE GLYPH */}
			<PieceGlyph
				pieceType={piece.type}
				fallbackColor={isKing ? '#fffdf0' : PIECE_COLOR_BY_TYPE[piece.type]}
				className={cx(
          "relative z-20",
          isKing && "king-glyph-enhancement",
          isPawn ? 'text-[clamp(18px,47cqw,39px)]' : 'text-[clamp(20px,55cqw,47px)]',
          !isPlayer && "transform rotate-180"
        )}
				size={isPawn ? 'clamp(18px,47cqw,39px)' : 'clamp(20px,55cqw,47px)'}
        fallbackTextShadow={isGod ? `0 0 12px ${elementGlow.color}cc` : "none"}
        />

      {isAttackTarget && (
        <>
          <span
            style={{
              position: 'absolute',
              width: '30%',
              height: '30%',
              borderRadius: '9999px',
              border: '3px solid rgba(254, 226, 226, 0.75)',
              inset: '35%',
              boxShadow: '0 0 14px rgba(248, 113, 113, 0.7)',
              zIndex: 33,
            }}
          />
          <span
            style={{
              position: 'absolute',
              width: '16px',
              height: '16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(239, 68, 68, 0.82)',
              border: '2px solid rgba(254, 226, 226, 0.75)',
              boxShadow: '0 0 10px rgba(248, 113, 113, 0.75)',
              transform: 'translate(-50%, -50%)',
              top: '50%',
              left: '50%',
              zIndex: 34,
            }}
          />
        </>
        )}

      <div className="owner-inner-frame" />
      
      {(!isPawn && !isKing) && (
        <div className="chess-piece-hp-container">
          <div
            className="chess-piece-hp-fill"
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      )}

      {hasElement && (
        <div
          className={`element-badge-large element-badge-${pieceElement}`}
          style={{ backgroundColor: ELEMENT_COLORS[pieceElement] }}
        >
          <span className="element-icon-large">{ELEMENT_ICONS[pieceElement]}</span>
        </div>
      )}

    </motion.div>
  );
};

export default React.memo(ChessPieceComponent);
