import React from 'react';
import { motion } from 'framer-motion';
import { ChessPiece as ChessPieceType, ELEMENT_COLORS, ELEMENT_ICONS, type ElementType } from '../../types/ChessTypes';
import { useGameStore } from '../../stores/gameStore';
import { useChessHoverStore } from '../../stores/chessHoverStore';
import { PIECE_PIECE_TONE_BY_OWNER } from './pieceVisuals';
import { PieceGlyph } from './PieceGlyph';
import clsx from 'clsx';
import './ChessPiece.css';

type ChessCellTone = 'light' | 'dark';

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
  cellTone?: ChessCellTone;
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

const adjustColorForCellTone = (
  color: string,
  tone: ChessCellTone,
  options: {
    lightShift: number;
    darkShift: number;
  },
) => {
  const match = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!match) return color;

  const hex = match[1];
  const shift = tone === 'light' ? options.lightShift : options.darkShift;
  const parse = (index: number) => Number.parseInt(hex.slice(index, index + 2), 16);
  const adjust = (value: number) => Math.min(255, Math.max(0, value + shift));

  const red = adjust(parse(0));
  const green = adjust(parse(2));
  const blue = adjust(parse(4));
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

const ChessPieceComponent: React.FC<ChessPieceProps> = ({
  piece,
  visualState,
  isPlayerTurn,
  isMotionEnabled = true,
  useEnhancedFx = true,
  cellTone = 'dark',
}) => {
	const setHoveredPiece = useChessHoverStore(s => s.setHoveredPiece);

	const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
	const isLocalPlayerPiece = piece.owner === myCanonicalSide;
	const ownerClass = piece.owner === 'player'
		? OWNER_CLASSES.player
		: OWNER_CLASSES.opponent;
	const isPawn = piece.type === 'pawn';
	const isKing = piece.type === 'king';
	const isOpponentKing = isKing && piece.owner !== myCanonicalSide;
  const isAttackTarget = visualState.tag === 'attackable';
  const isQueen = piece.type === 'queen';
  const isRook = piece.type === 'rook';
  const isGod = !isPawn;
  const pieceTone = PIECE_PIECE_TONE_BY_OWNER[piece.owner];
  const pieceFillColor = adjustColorForCellTone(pieceTone.fill, cellTone, {
    lightShift: -22,
    darkShift: 16,
  });
  const pieceOutlineColor = adjustColorForCellTone(pieceTone.outline, cellTone, {
    lightShift: -28,
    darkShift: 8,
  });
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
      data-cell-tone={cellTone}
	      className={cx(
	        'chess-piece w-full h-full flex flex-col items-center justify-center rounded-lg cursor-pointer relative',
	        ownerClass,
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
		    '--piece-container-shadow': cellTone === 'light'
		      ? '0 4px 18px rgba(0, 0, 0, 0.88)'
		      : '0 4px 16px rgba(0, 0, 0, 0.48), 0 0 12px rgba(255, 255, 255, 0.2)',
		    ...(isAttackTarget && {
		      outline: '3px solid rgba(254, 226, 226, 0.55)',
		      boxShadow: '0 0 10px rgba(248, 113, 113, 0.65), 0 0 18px rgba(248, 113, 113, 0.18)',
		      borderColor: 'rgba(254, 226, 226, 0.75)',
		    }),
		  } as any}
	    >
	      <div className="piece-ground-base" />

	      {/* HUD SYSTEM */}
	      <div className="piece-hud-container">
	        <div className="owner-side-subtle-rim" />
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

      {isKing && hasElement && false && useEnhancedFx && (
        <span
          className={cx(
            "king-contrast-shadow",
            isOpponentKing && "king-contrast-shadow-opponent"
        )}
          aria-hidden="true"
        />
      )}

      {/* THE PIECE GLYPH */}
				<PieceGlyph
					pieceType={piece.type}
					fallbackColor={pieceFillColor}
					className={cx(
	          "relative z-20",
	          isKing && "king-glyph-enhancement",
	          isPawn ? 'text-[clamp(18px,47cqw,39px)]' : 'text-[clamp(20px,55cqw,47px)]',
	          !isLocalPlayerPiece && "transform rotate-180"
	        )}
				size={isPawn ? 'clamp(18px,47cqw,39px)' : 'clamp(20px,55cqw,47px)'}
				fallbackTextShadow={isKing
					? `0 0 4px ${elementGlow.color}66, ${cellTone === 'light'
						? '0 1px 4px rgba(0, 0, 0, 0.52)'
						: '0 1px 3px rgba(0, 0, 0, 0.42)'}`
					: isGod
						? `0 0 12px ${elementGlow.color}cc, ${cellTone === 'light'
							? '0 2px 6px rgba(0, 0, 0, 0.85)'
							: '0 2px 6px rgba(0, 0, 0, 0.6), 0 0 8px rgba(255, 255, 255, 0.28)'}`
						: cellTone === 'light'
						? '0 2px 6px rgba(0, 0, 0, 0.85), 0 0 10px rgba(0, 0, 0, 0.45)'
						: '0 2px 6px rgba(0, 0, 0, 0.6), 0 0 8px rgba(255, 255, 255, 0.26)'}
				style={{
					'--piece-glyph-stroke-color': pieceOutlineColor,
					'--piece-glyph-stroke-width': '1.2px',
				}}
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
