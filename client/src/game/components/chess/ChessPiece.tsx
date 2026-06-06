import React from 'react';
import { motion } from 'framer-motion';
import { ChessPiece as ChessPieceType, ChessPieceType as PieceType, ELEMENT_COLORS, ELEMENT_ICONS, ElementType } from '../../types/ChessTypes';
import type { MatchupGlow } from '../../utils/chess/elementMatchupUtils';
import { assetPath } from '../../utils/assetPath';
import { useGameStore } from '../../stores/gameStore';
import { useChessHoverStore } from '../../stores/chessHoverStore';
import { getPieceHealthState } from './chessBoardPresentation';
import { PIECE_TYPE_NAMES } from './chessPieceLabels';
import { PIECE_COLOR_BY_TYPE } from './pieceVisuals';
import { PieceGlyph } from './PieceGlyph';
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

export type ChessPieceVisualState =
  | { readonly tag: 'idle' }
  | { readonly tag: 'selected' }
  | { readonly tag: 'attackable' }
  | { readonly tag: 'locked' };

interface ChessPieceProps {
  piece: ChessPieceType;
  visualState: ChessPieceVisualState;
  isPlayerTurn: boolean;
  matchupGlow?: MatchupGlow;
}

const OWNER_CLASSES = {
  player: 'bg-linear-to-b from-blue-900 to-blue-950',
  opponent: 'bg-linear-to-b from-red-900 to-red-950',
} satisfies Record<'player' | 'opponent', string>;

const VISUAL_STATE_CLASSES = {
  idle: '',
  selected: 'ring-3 ring-amber-300/85 z-20',
  attackable: 'ring-3 ring-red-300/80 z-20',
  locked: '',
} satisfies Record<ChessPieceVisualState['tag'], string>;

const MATCHUP_GLOW_CLASSES = {
  advantage: 'matchup-pulse-advantage',
  disadvantage: 'matchup-pulse-disadvantage',
  mutual: 'matchup-pulse-mutual',
  none: '',
} satisfies Record<NonNullable<MatchupGlow> | 'none', string>;

const cx = (...classes: readonly (string | false | null | undefined)[]): string =>
  classes.filter((className): className is string => Boolean(className)).join(' ');

const getMatchupGlowClassName = (matchupGlow: MatchupGlow | undefined): string =>
  MATCHUP_GLOW_CLASSES[matchupGlow ?? 'none'];

const getChessPieceClassName = (input: {
  readonly isPlayer: boolean;
  readonly canSelect: boolean;
  readonly visualState: ChessPieceVisualState;
  readonly matchupGlow?: MatchupGlow;
}): string => cx(
  'chess-piece w-full h-full flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all relative',
  input.isPlayer ? OWNER_CLASSES.player : OWNER_CLASSES.opponent,
  VISUAL_STATE_CLASSES[input.visualState.tag],
  input.canSelect && input.visualState.tag !== 'locked' && 'hover:brightness-106',
  getMatchupGlowClassName(input.matchupGlow),
);

const ChessPieceComponent: React.FC<ChessPieceProps> = ({
  piece,
  visualState,
  isPlayerTurn,
  matchupGlow,
}) => {
  const setHoveredPiece = useChessHoverStore(s => s.setHoveredPiece);

  // Viewer-relative: this piece belongs to ME (the local viewer) iff its
  // canonical owner matches my canonical side. Drives selection eligibility
  // and visual orientation (e.g., element glow, side-of-board cues).
  const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
  const isPlayer = piece.owner === myCanonicalSide;
  const canSelect = isPlayerTurn && isPlayer;
  const isPawn = piece.type === 'pawn';
  const isKing = piece.type === 'king';
  const isGod = !isPawn;
  const healthPercent = (isPawn || isKing) ? 100 : (piece.health / piece.maxHealth) * 100;
  const pieceElement = piece.element ?? 'neutral';
  const elementGlow = ELEMENT_GLOW[pieceElement];
  const hasElement = pieceElement !== 'neutral';
  const elementImage = ELEMENT_IMAGES[pieceElement];
  const animateScale = visualState.tag === 'selected'
    ? (isKing ? 1.04 : 1.02)
    : (isKing ? 1.02 : 1);
  const healthState = getPieceHealthState(healthPercent);

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
      data-local-owner={isPlayer ? 'self' : 'opponent'}
      data-position={`${piece.position.row},${piece.position.col}`}
      data-row={piece.position.row}
      data-col={piece.position.col}
      data-element={pieceElement}
      data-has-element={hasElement ? 'true' : 'false'}
      data-visual-state={visualState.tag}
      data-can-select={canSelect ? 'true' : 'false'}
      data-health-state={healthState}
      data-health-percent={Math.round(healthPercent)}
      className={getChessPieceClassName({
        isPlayer,
        canSelect,
        visualState,
        matchupGlow,
      })}
      aria-label={`${piece.heroName} ${PIECE_TYPE_NAMES[piece.type]} at ${piece.position.row},${piece.position.col}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={canSelect ? { scale: 1.04 } : undefined}
      whileTap={canSelect ? { scale: 0.95 } : undefined}
      initial={false}
      animate={{ scale: animateScale }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={hasElement ? { boxShadow: elementGlow.shadow } : undefined}
    >
      {hasElement && elementImage && (
        <>
          <div
            className={`element-image-bg element-image-${pieceElement}`}
            style={{ backgroundImage: `url(${elementImage})` }}
          />
          <div className={`element-overlay element-overlay-${pieceElement}`} />
        </>
      )}

      {hasElement && (
        <div className={`element-effect-layer element-effect-${pieceElement}`} />
      )}

      {(!isPawn && !isKing) && (
        <div className="chess-piece-hp-container">
          <div
            className="chess-piece-hp-fill"
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

			<PieceGlyph
				pieceType={piece.type}
				fallbackColor={PIECE_COLOR_BY_TYPE[piece.type]}
				className={`${isPawn ? 'text-[clamp(18px,47cqw,39px)]' : 'text-[clamp(20px,55cqw,47px)]'} relative z-20 drop-shadow-lg ${isPlayer ? '' : 'transform rotate-180'}`}
				size={isPawn ? 'clamp(18px,47cqw,39px)' : 'clamp(20px,55cqw,47px)'}
				fallbackTextShadow={hasElement
					? `0 0 12px ${elementGlow.color}, 0 0 24px ${elementGlow.color}`
					: '2px 2px 4px rgba(0,0,0,0.5)'}
			/>

      {/* Stamina (power resource) — visible on cell. HP shown as bar (top).
         Name + element shown in tooltip on info-icon hover. */}
      {(!isPawn && !isKing) && piece.stamina > 0 && (
        <div className="absolute bottom-0.5 right-1 text-amber-300 font-extrabold text-[clamp(7px,11cqw,10px)] drop-shadow-md z-30 pointer-events-none [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
          ⚡{piece.stamina}
        </div>
      )}

      {/* Hover routes to ChessHoverStore — PieceInfoPanel (outside board) renders the info. */}

      {hasElement && (
        <div
          className={`element-badge-large element-badge-${pieceElement}`}
          style={{
            backgroundColor: ELEMENT_COLORS[pieceElement],
            boxShadow: `0 0 10px ${ELEMENT_COLORS[pieceElement]}, 0 0 20px ${ELEMENT_COLORS[pieceElement]}`
          }}
          title={`${pieceElement.charAt(0).toUpperCase() + pieceElement.slice(1)} Element`}
        >
          <span className="element-icon-large">{ELEMENT_ICONS[pieceElement]}</span>
        </div>
      )}

      {hasElement && (
        <div className={`element-border-glow element-border-${pieceElement}`} />
      )}

    </motion.div>
  );
};

export default React.memo(ChessPieceComponent);
