/*
  ChessPhase — the chess board surface that runs while the FSM is in
  the `chess` tag. Owns the title bar, the check warning banner, the
  two king-portrait panels, the chess board itself, and the dev-only
  Battle Sandbox button.

  Three internal components that lived in the coordinator pre-G9 are
  consolidated here because none of them are useful outside the chess
  phase: HeroPortraitPanel (opponent / static portrait), the richer
  PlayerHeroPortrait (handles King Divine Command UI + tooltip), and
  the layout shell. They share king-ability tooltip state and CSS,
  so colocating them keeps the surface coherent.

  Lazy-loaded by the coordinator so non-chess phases (cinematic /
  intro / vs / poker / game_over) do not bundle the chess board, the
  king-ability tooltip, or the framer-motion choreography for the
  portraits.
*/

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ArmySelection as ArmySelectionType, ChessBoardState } from '../../../types/ChessTypes';
import {
	getKingAbilityConfig,
	getAbilityDescription,
	requiresDirectionSelection,
	getAvailableDirections,
} from '../../../utils/chess/kingAbilityUtils';
import { useKingChessAbility } from '../../../hooks/useKingChessAbility';
import { resolveHeroPortrait, DEFAULT_PORTRAIT } from '../../../utils/art/artMapping';
import { useGameStore } from '../../../stores/gameStore';
import { useChessHoverStore } from '../../../stores/chessHoverStore';
import { Tooltip } from '../../ui/Tooltip';
import ChessBoard from '../ChessBoard';
import { ELEMENT_NAMES, PIECE_TYPE_NAMES } from '../chessPieceLabels';
import { ELEMENT_COLORS, ELEMENT_ICONS } from '../../../types/ChessTypes';

const COMPACT_FRAME_STYLE: React.CSSProperties = { width: 72, height: 90 };
const FLANKING_FRAME_STYLE: React.CSSProperties = { width: 108, height: 135 };

/* ============================================================
   HeroPortraitPanel — static portrait for the opponent side. The
   player side uses PlayerHeroPortrait below because it owns King
   Divine Command interaction.
   ============================================================ */

type HeroPortraitPanelProps = {
	readonly army: ArmySelectionType;
	readonly side: 'player' | 'opponent';
	readonly pieceCount?: number;
	readonly compact?: boolean;
	readonly frameStyle?: React.CSSProperties;
};

const HeroPortraitPanel: React.FC<HeroPortraitPanelProps> = ({ army, side, pieceCount, compact, frameStyle }) => {
	const king = army.king;
	const kingPortrait = resolveHeroPortrait(king.id, king.portrait) ?? DEFAULT_PORTRAIT;
	const fallbackPortrait = DEFAULT_PORTRAIT;
	const safeFallback = DEFAULT_PORTRAIT;
	const isPlayer = side === 'player';

	const wrapperClass = compact
		? `flex items-center gap-3 ${isPlayer ? 'flex-row-reverse text-right' : 'flex-row text-left'}`
		: 'flex flex-col items-center';

	return (
		<motion.div
			initial={{ opacity: 0, x: isPlayer ? -50 : 50 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.5, delay: 0.2 }}
			className={wrapperClass}
		>
			<div
				className={`hero-portrait-frame ${isPlayer ? 'hero-portrait-player' : 'hero-portrait-opponent'}`}
				data-element={king.element || (isPlayer ? 'holy' : 'shadow')}
				style={compact ? COMPACT_FRAME_STYLE : frameStyle}
			>
				<img
					src={kingPortrait}
					alt={king.name}
					className="w-full h-full object-cover"
					onError={(e) => {
						const target = e.target as HTMLImageElement;
						if (!target.src.includes(fallbackPortrait) && !target.src.startsWith('data:')) {
							target.src = fallbackPortrait;
						} else if (!target.src.startsWith('data:')) {
							target.src = safeFallback;
						}
					}}
					loading="lazy"
				/>
			</div>

			{compact ? (
				<div className="flex flex-col gap-0.5 leading-tight">
					<div className="text-sm font-bold text-amber-200">{king.name}</div>
					<div className="text-[10px] uppercase tracking-wider text-amber-400/70">
						{isPlayer ? 'Aesir Commander' : 'Jotun Warlord'}
					</div>
					{pieceCount !== undefined && (
						<div className="text-[10px] text-gray-300 mt-0.5">
							<span className="font-bold text-amber-300">{pieceCount}</span>
							<span className="opacity-60 ml-1">pieces</span>
						</div>
					)}
				</div>
			) : (
				<>
					<div className="hero-nameplate">
						<div className="hero-nameplate-text">{king.name}</div>
						<div className="hero-nameplate-subtitle">
							{isPlayer ? 'Aesir Commander' : 'Jotun Warlord'}
						</div>
					</div>

					{pieceCount !== undefined && (
						<div className={`chess-piece-count-shield mt-2 ${isPlayer ? 'chess-piece-count-player' : 'chess-piece-count-opponent'}`}>
							<span className="font-bold text-sm">{pieceCount}</span>
							<span className="text-[10px] opacity-60 ml-1">pieces</span>
						</div>
					)}
				</>
			)}
		</motion.div>
	);
};

/* ============================================================
   PlayerHeroPortrait — player-side portrait with King Divine
   Command tooltip + click-to-place trap interaction.
   ============================================================ */

type PlayerPortraitProps = {
	readonly army: ArmySelectionType;
	readonly pieceCount?: number;
	readonly compact?: boolean;
	readonly frameStyle?: React.CSSProperties;
};

const PlayerHeroPortrait: React.FC<PlayerPortraitProps> = ({ army, pieceCount, compact, frameStyle: extraFrameStyle }) => {
	const king = army.king;
	const kingPortrait = resolveHeroPortrait(king.id, king.portrait) ?? DEFAULT_PORTRAIT;
	const fallbackPortrait = DEFAULT_PORTRAIT;
	const safeFallback = DEFAULT_PORTRAIT;
	const [isCasting, setIsCasting] = useState(false);
	const prevMinesRef = useRef<number | null>(null);

	// Drive the local viewer's king (whichever canonical side they hold).
	const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
	const {
		canPlaceMine,
		minesRemaining,
		isPlacementMode,
		selectedDirection,
		enterPlacementMode,
		exitPlacementMode,
		selectDirection,
	} = useKingChessAbility(myCanonicalSide);

	const kingId = king.id || '';
	const config = getKingAbilityConfig(kingId);
	const description = getAbilityDescription(kingId);
	const needsDirection = requiresDirectionSelection(kingId);
	const availableDirections = getAvailableDirections(kingId);

	useEffect(() => {
		if (prevMinesRef.current !== null && minesRemaining < prevMinesRef.current) {
			setIsCasting(true);
			const timer = setTimeout(() => setIsCasting(false), 900);
			prevMinesRef.current = minesRemaining;
			return () => clearTimeout(timer);
		}
		prevMinesRef.current = minesRemaining;
		return undefined;
	}, [minesRemaining]);

	const handlePortraitClick = () => {
		if (isPlacementMode) {
			exitPlacementMode();
		} else if (canPlaceMine) {
			enterPlacementMode();
		}
	};

	const isClickable = canPlaceMine || isPlacementMode;

	const tooltipContent = (
		<div className="portal-tooltip-content" style={{ borderColor: '#fbbf24', boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(251,191,36,0.25)' }}>
			<div className="portal-tooltip-header" style={{ color: '#fbbf24' }}>
				<span>Divine Command</span>
			</div>
			<div className="portal-tooltip-description">{description}</div>
			<div className="portal-tooltip-meta">
				<div style={{ color: '#fbbf24' }}>⚡ {minesRemaining}/5 uses</div>
				<div style={{ color: '#ef4444', marginTop: '4px' }}>💀 STA: -{config?.staPenalty || 2}</div>
				<div style={{ color: '#22d3ee', marginTop: '4px' }}>✨ Mana: +{config?.manaBoost || 1} next PvP</div>
				<div style={{ color: '#9ca3af', marginTop: '4px', fontStyle: 'italic' }}>Click portrait to {isPlacementMode ? 'cancel' : 'activate'}</div>
			</div>
		</div>
	);

	const wrapperClass = compact
		? 'flex flex-row-reverse items-center gap-3 text-right'
		: 'flex flex-col items-center';

	const frameStyle: React.CSSProperties = {
		cursor: isClickable ? 'pointer' : 'default',
		...(compact ? COMPACT_FRAME_STYLE : (extraFrameStyle || {})),
	};

	const portraitFrame = (
		<div
			className={`hero-portrait-frame hero-portrait-player ${isClickable ? 'king-clickable' : ''} ${isPlacementMode ? 'king-placement-active' : ''} ${isCasting ? 'king-casting' : ''}`}
			data-element={king.element || 'holy'}
			onClick={handlePortraitClick}
			style={frameStyle}
		>
			<img
				src={kingPortrait}
				alt={king.name}
				className="w-full h-full object-cover"
				onError={(e) => {
					const target = e.target as HTMLImageElement;
					if (!target.src.includes(fallbackPortrait) && !target.src.startsWith('data:')) {
						target.src = fallbackPortrait;
					} else if (!target.src.startsWith('data:')) {
						target.src = safeFallback;
					}
				}}
				loading="lazy"
			/>

			<div className={`king-uses-badge ${minesRemaining === 0 ? 'king-uses-empty' : ''} ${isPlacementMode ? 'king-uses-active' : ''}`}>
				{minesRemaining}/5
			</div>

			<AnimatePresence>
				{isCasting && (
					<motion.div
						className="king-cast-burst"
						initial={{ opacity: 1, scale: 0.3 }}
						animate={{ opacity: 0, scale: 2.5 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.8, ease: 'easeOut' }}
					/>
				)}
			</AnimatePresence>
		</div>
	);

	return (
		<motion.div
			initial={{ opacity: 0, x: -50 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.5, delay: 0.2 }}
			className={wrapperClass}
		>
			<Tooltip content={tooltipContent} position={compact ? 'bottom' : 'right'} delay={400}>
				{portraitFrame}
			</Tooltip>

			{compact ? (
				<div className="flex flex-col gap-0.5 leading-tight items-end">
					<div className="text-sm font-bold text-amber-200">{king.name}</div>
					<div className="text-[10px] uppercase tracking-wider text-amber-400/70">Aesir Commander</div>
					{pieceCount !== undefined && (
						<div className="text-[10px] text-gray-300 mt-0.5">
							<span className="font-bold text-amber-300">{pieceCount}</span>
							<span className="opacity-60 ml-1">pieces</span>
						</div>
					)}
					{needsDirection && isPlacementMode && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="mt-1 flex gap-1"
						>
							{availableDirections.map((dir) => (
								<button
									key={dir}
									onClick={() => selectDirection(dir)}
									className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${selectedDirection === dir ? 'bg-yellow-600 text-white border border-yellow-400' : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'}`}
								>
									{dir === 'horizontal' ? '↔' : dir === 'vertical' ? '↕' : dir === 'diagonal_up' ? '↗' : '↘'}
								</button>
							))}
						</motion.div>
					)}
					{isPlacementMode && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-yellow-400 mt-0.5">
							Click a tile to place trap
						</motion.div>
					)}
				</div>
			) : (
				<>
					<div className="hero-nameplate">
						<div className="hero-nameplate-text">{king.name}</div>
						<div className="hero-nameplate-subtitle">Aesir Commander</div>
					</div>

					{pieceCount !== undefined && (
						<div className="chess-piece-count-shield mt-2 chess-piece-count-player">
							<span className="font-bold text-sm">{pieceCount}</span>
							<span className="text-[10px] opacity-60 ml-1">pieces</span>
						</div>
					)}

					{needsDirection && isPlacementMode && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="mt-2 flex gap-1"
						>
							{availableDirections.map((dir) => (
								<button
									key={dir}
									onClick={() => selectDirection(dir)}
									className={`px-2 py-1 rounded text-xs font-semibold transition-all ${selectedDirection === dir ? 'bg-yellow-600 text-white border border-yellow-400' : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'}`}
								>
									{dir === 'horizontal' ? '↔' : dir === 'vertical' ? '↕' : dir === 'diagonal_up' ? '↗' : '↘'}
								</button>
							))}
						</motion.div>
					)}

					{isPlacementMode && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-center">
							<div className="text-xs text-yellow-400">Click a tile to place trap</div>
						</motion.div>
					)}
				</>
			)}
		</motion.div>
	);
};

/* ============================================================
   PieceInfoPanel — small side panel that mirrors the currently
   hovered royal piece. Lives outside the board so the cells stay
   visually clean while the panel carries the heavy info.
   ============================================================ */

type PieceInfoPanelProps = {
	readonly boardState: ChessBoardState;
};

const PieceInfoPanel: React.FC<PieceInfoPanelProps> = ({ boardState }) => {
	const hoveredId = useChessHoverStore(s => s.hoveredPieceId);
	const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
	const piece = hoveredId ? boardState.pieces.find(p => p.id === hoveredId) : undefined;

	if (!piece) {
		return <div className="mt-4 h-[74px]" />;
	}

	const isPlayer = piece.owner === myCanonicalSide;
	const element = piece.element ?? 'neutral';
	const hasElement = element !== 'neutral';
	const elementColor = hasElement ? ELEMENT_COLORS[element] : '#9ca3af';
	const isPawn = piece.type === 'pawn';
	const isKing = piece.type === 'king';
	const showStats = !isPawn && !isKing;

	return (
		<motion.div
			key={piece.id}
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.15 }}
			className="mt-4 w-full max-w-50 px-3 py-2"
			style={{
				background: 'rgba(4, 10, 22, 0.98)',
				border: 'none',
				color: elementColor,
				boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
			}}
		>
			<div className="font-bold text-sm leading-tight truncate" style={{ color: elementColor }}>
				{piece.heroName}
			</div>
			<div className="text-[10px] uppercase tracking-wider text-amber-400/70 mb-2">
				{PIECE_TYPE_NAMES[piece.type]} · {isPlayer ? 'You' : 'Enemy'}
			</div>

			{showStats && (
				<div className="flex items-center justify-between text-xs">
					<span className="text-red-300 font-semibold">HP {piece.health}/{piece.maxHealth}</span>
					{piece.stamina > 0 && (
						<span className="text-amber-300 font-semibold">⚡{piece.stamina}</span>
					)}
				</div>
			)}

			{hasElement && (
				<div
					className="mt-1.5 flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
					style={{
						background: `color-mix(in srgb, ${elementColor} 12%, transparent)`,
						color: elementColor,
					}}
				>
					<span>{ELEMENT_ICONS[element]}</span>
					<span>{ELEMENT_NAMES[element]}</span>
				</div>
			)}
		</motion.div>
	);
};

/* ============================================================
   ChessPhase — the entrypoint the coordinator renders. Composes
   the match header (opponent / mode / player), check banner, and
   the centered board.
   ============================================================ */

export type ChessPhaseProps = {
	readonly boardState: ChessBoardState;
	readonly playerArmy: ArmySelectionType | null;
	readonly opponentArmy: ArmySelectionType;
	readonly onCombatTriggered: (attackerId: string, defenderId: string) => void;
	readonly onBattleMode: () => void;
};

const ChessPhase: React.FC<ChessPhaseProps> = ({
	boardState,
	playerArmy,
	opponentArmy,
	onCombatTriggered,
	onBattleMode,
}) => {
	const myCanonicalSide = useGameStore(s => s.myCanonicalSide) ?? 'player';
	const enemyCanonicalSide: 'player' | 'opponent' = myCanonicalSide === 'player' ? 'opponent' : 'player';
	const { isPlacementMode } = useKingChessAbility(myCanonicalSide);
	const playerPieceCount = boardState.pieces.filter(p => p.owner === myCanonicalSide).length;
	const opponentPieceCount = boardState.pieces.filter(p => p.owner === enemyCanonicalSide).length;

	return (
		<motion.div
			key="chess"
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.9 }}
			className="relative w-full h-full flex flex-col items-center justify-center p-4 gap-3"
		>
			{/* Title chip — top-left corner, low-key identity anchor */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.1 }}
				className="absolute top-4 left-4 px-3 py-1.5 rounded-md bg-black/50 border border-amber-500/30 backdrop-blur-sm pointer-events-none"
			>
				<span
					className="text-xs font-bold tracking-[2px] uppercase"
					style={{
						background: 'linear-gradient(180deg, #ffd700, #ff8c00)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
					}}
				>
					Ragnarok Chess
				</span>
			</motion.div>

			<AnimatePresence>
				{boardState.inCheck && (
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: -20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.8, y: -20 }}
						className="check-warning-banner"
					>
						CHECK! {boardState.inCheck === myCanonicalSide ? 'Your King is in danger!' : "Enemy King is threatened!"}
					</motion.div>
				)}
			</AnimatePresence>

			{/* Board flanked by heroes — flex centered + fixed-width side cols.
				Heroes hug the board (gap-6) instead of spreading to viewport edges.
				items-start anchors heroes to top so PieceInfoPanel growing
				doesn't push opponent. */}
			<div className="flex items-stretch justify-center w-full gap-6">
				<div className="w-45 flex flex-col items-center justify-start">
					<HeroPortraitPanel
						army={opponentArmy}
						side="opponent"
						pieceCount={opponentPieceCount}
						frameStyle={FLANKING_FRAME_STYLE}
					/>
				</div>

				<div className="relative flex flex-col items-center">
					<ChessBoard
						onCombatTriggered={onCombatTriggered}
						disabled={isPlacementMode}
					/>
				</div>

				<div className="w-45 flex flex-col items-center justify-end gap-3">
					<PieceInfoPanel boardState={boardState} />
					{playerArmy && (
						<PlayerHeroPortrait
							army={playerArmy}
							pieceCount={playerPieceCount}
							frameStyle={FLANKING_FRAME_STYLE}
						/>
					)}
				</div>
			</div>

			{/* Check escape hint — only when relevant. Turn indicator owned by ChessBoard's internal banner. */}
			{boardState.inCheck === boardState.currentTurn && (
				<p className="text-xs text-yellow-400 font-semibold mt-1 text-center">
					You must escape check! Move King, block, or capture the threat.
				</p>
			)}

			{import.meta.env.DEV && (
				<button
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onBattleMode();
					}}
					className="fixed bottom-2 left-2 z-hud opacity-20 hover:opacity-80 transition-opacity text-[10px] px-2 py-1 bg-gray-800/80 border border-gray-600/50 rounded text-gray-500 cursor-pointer"
					title="Developer battle sandbox"
				>
					Battle Sandbox
				</button>
			)}
		</motion.div>
	);
};

export default ChessPhase;
