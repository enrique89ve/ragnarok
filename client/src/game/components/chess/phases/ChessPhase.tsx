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
import { Tooltip } from '../../ui/Tooltip';
import ChessBoard from '../ChessBoard';

/* ============================================================
   HeroPortraitPanel — static portrait for the opponent side. The
   player side uses PlayerHeroPortrait below because it owns King
   Divine Command interaction.
   ============================================================ */

type HeroPortraitPanelProps = {
	readonly army: ArmySelectionType;
	readonly side: 'player' | 'opponent';
	readonly pieceCount?: number;
};

const HeroPortraitPanel: React.FC<HeroPortraitPanelProps> = ({ army, side, pieceCount }) => {
	const king = army.king;
	const kingPortrait = resolveHeroPortrait(king.id, king.portrait) ?? DEFAULT_PORTRAIT;
	const fallbackPortrait = DEFAULT_PORTRAIT;
	const safeFallback = DEFAULT_PORTRAIT;
	const isPlayer = side === 'player';

	return (
		<motion.div
			initial={{ opacity: 0, x: isPlayer ? -50 : 50 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.5, delay: 0.2 }}
			className={`flex flex-col items-center ${isPlayer ? 'mr-6' : 'ml-6'}`}
		>
			<div
				className={`hero-portrait-frame ${isPlayer ? 'hero-portrait-player' : 'hero-portrait-opponent'}`}
				data-element={king.element || (isPlayer ? 'holy' : 'shadow')}
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
};

const PlayerHeroPortrait: React.FC<PlayerPortraitProps> = ({ army, pieceCount }) => {
	const king = army.king;
	const kingPortrait = resolveHeroPortrait(king.id, king.portrait) ?? DEFAULT_PORTRAIT;
	const fallbackPortrait = DEFAULT_PORTRAIT;
	const safeFallback = DEFAULT_PORTRAIT;
	const [isCasting, setIsCasting] = useState(false);
	const prevMinesRef = useRef<number | null>(null);

	const {
		canPlaceMine,
		minesRemaining,
		isPlacementMode,
		selectedDirection,
		enterPlacementMode,
		exitPlacementMode,
		selectDirection,
	} = useKingChessAbility('player');

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

	return (
		<motion.div
			initial={{ opacity: 0, x: -50 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.5, delay: 0.2 }}
			className="flex flex-col items-center mr-6"
		>
			<Tooltip content={tooltipContent} position="right" delay={400}>
				<div
					className={`hero-portrait-frame hero-portrait-player ${isClickable ? 'king-clickable' : ''} ${isPlacementMode ? 'king-placement-active' : ''} ${isCasting ? 'king-casting' : ''}`}
					data-element={king.element || 'holy'}
					onClick={handlePortraitClick}
					style={{ cursor: isClickable ? 'pointer' : 'default' }}
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
			</Tooltip>

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
		</motion.div>
	);
};

/* ============================================================
   ChessPhase — the entrypoint the coordinator renders. Composes
   the title, check banner, the two king portraits, and the board.
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
	const { isPlacementMode } = useKingChessAbility('player');
	const playerPieceCount = boardState.pieces.filter(p => p.owner === 'player').length;
	const opponentPieceCount = boardState.pieces.filter(p => p.owner === 'opponent').length;

	return (
		<motion.div
			key="chess"
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.9 }}
			className="w-full h-full flex flex-col items-center justify-center p-4"
		>
			<div className="mb-4 text-center">
				<h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(180deg, #ffd700, #ff8c00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: 'none', filter: 'drop-shadow(0 2px 4px rgba(255, 165, 0, 0.5))' }}>Ragnarok Chess</h1>
			</div>

			<AnimatePresence>
				{boardState.inCheck && (
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: -20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.8, y: -20 }}
						className="check-warning-banner mb-3"
					>
						CHECK! {boardState.inCheck === 'player' ? 'Your King is in danger!' : "Enemy King is threatened!"}
					</motion.div>
				)}
			</AnimatePresence>

			<div className="flex items-center justify-center">
				{playerArmy && (
					<PlayerHeroPortrait army={playerArmy} pieceCount={playerPieceCount} />
				)}

				<div className="relative flex flex-col items-center">
					<ChessBoard
						onCombatTriggered={onCombatTriggered}
						disabled={isPlacementMode}
					/>

					{boardState.inCheck === boardState.currentTurn && (
						<div className="mt-2 text-center text-sm">
							<p className="text-yellow-400 font-semibold">You must escape check! Move King, block, or capture the threat.</p>
						</div>
					)}
				</div>

				<HeroPortraitPanel army={opponentArmy} side="opponent" pieceCount={opponentPieceCount} />

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
			</div>
		</motion.div>
	);
};

export default ChessPhase;
