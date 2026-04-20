import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/game-over.css';

interface GameOverScreenProps {
	isVisible: boolean;
	winner: 'player' | 'opponent' | 'draw';
	turnNumber: number;
	playerHeroName?: string;
	opponentHeroName?: string;
	playerHeroClass?: string;
	opponentHeroClass?: string;
	playerHeroPortrait?: string;
	opponentHeroPortrait?: string;
	onPlayAgain?: () => void;
	onMainMenu?: () => void;
	onRematch?: () => void;
	isRanked?: boolean;
}

const PARTICLE_COLORS = ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef08a', '#22c55e'];

const CLASS_COLORS: Record<string, string> = {
	warrior: '#b45309', mage: '#3b82f6', paladin: '#eab308', hunter: '#22c55e',
	rogue: '#94a3b8', shaman: '#6366f1', warlock: '#a855f7', priest: '#e5e7eb',
	druid: '#d97706', deathknight: '#60a5fa', berserker: '#4ade80',
	neutral: '#64748b',
};

const getClassColor = (cls?: string) =>
	CLASS_COLORS[cls?.toLowerCase() ?? ''] ?? CLASS_COLORS.neutral;

const iconStrokeProps = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 1.8,
	strokeLinecap: 'round' as const,
	strokeLinejoin: 'round' as const,
};

const VictoryOutcomeIcon = () => (
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path d="m6 18 6-12 6 12" {...iconStrokeProps} />
		<path d="M9.2 13.5h5.6" {...iconStrokeProps} />
		<path d="M12 6v12" {...iconStrokeProps} opacity="0.7" />
	</svg>
);

const DrawOutcomeIcon = () => (
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path d="M7 8.5 4 12l3 3.5" {...iconStrokeProps} />
		<path d="M17 8.5 20 12l-3 3.5" {...iconStrokeProps} />
		<path d="M9 12h6" {...iconStrokeProps} />
		<path d="M10.5 8.5 9 12l1.5 3.5M13.5 8.5 15 12l-1.5 3.5" {...iconStrokeProps} opacity="0.7" />
	</svg>
);

const DefeatOutcomeIcon = () => (
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path d="M12 4.5 6 7.2v4.2c0 3.8 2.5 7.1 6 8.1 3.5-1 6-4.3 6-8.1V7.2l-6-2.7Z" {...iconStrokeProps} />
		<path d="M9.2 12.2 12 15l2.8-2.8" {...iconStrokeProps} />
		<path d="M12 9.3v5.5" {...iconStrokeProps} opacity="0.75" />
	</svg>
);

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
	isVisible,
	winner,
	turnNumber,
	playerHeroName = 'You',
	opponentHeroName = 'Opponent',
	playerHeroClass,
	opponentHeroClass,
	playerHeroPortrait,
	opponentHeroPortrait,
	onPlayAgain,
	onMainMenu,
	onRematch,
	isRanked = false,
}) => {
	const isVictory = winner === 'player';
	const isDraw = winner === 'draw';

	const particles = useMemo(() => {
		if (!isVictory) return [];
		return Array.from({ length: 40 }, (_, i) => ({
			id: i,
			left: `${Math.random() * 100}%`,
			delay: Math.random() * 2.5,
			color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
			size: 4 + Math.random() * 7,
		}));
	}, [isVictory]);

	const playerColor = getClassColor(playerHeroClass);
	const opponentColor = getClassColor(opponentHeroClass);
	const outcomeRole = isVictory ? 'Breaker' : isDraw ? 'Deadlock' : 'Last Stand';

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					className={`game-over-overlay ${isVictory ? 'victory' : isDraw ? 'draw' : 'defeat'}`}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.6 }}
				>
					{isVictory && (
						<div className="victory-particles">
							{particles.map(p => (
								<div
									key={p.id}
									className="victory-particle"
									style={{
										left: p.left,
										top: '-10px',
										width: p.size,
										height: p.size,
										background: p.color,
										animationDelay: `${p.delay}s`,
									}}
								/>
							))}
						</div>
					)}

					<motion.div
						className="game-over-panel"
						initial={{ scale: 0.75, opacity: 0, y: 30 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
					>
						<motion.div
							className="game-over-title"
							initial={{ scale: 1.5, opacity: 0, y: -20 }}
							animate={{ scale: 1, opacity: 1, y: 0 }}
							transition={{ delay: 0.35, type: 'spring', stiffness: 280, damping: 18 }}
						>
							{isDraw ? 'DRAW' : isVictory ? 'VICTORY' : 'DEFEAT'}
						</motion.div>

						<motion.div
							className="game-over-subtitle"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.55, duration: 0.35 }}
						>
							{isDraw
								? 'Neither line breaks. The field holds in deadlock.'
								: isVictory
									? 'You break the enemy line and claim the field.'
									: 'The enemy breaks through before your line recovers.'}
						</motion.div>

						<motion.div
							className="game-over-heroes"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.65, duration: 0.35 }}
							>
								<div className="game-over-hero">
									<div className={`game-over-hero-portrait ${isVictory ? 'winner' : 'loser'}`}>
										{playerHeroPortrait ? (
											<img src={playerHeroPortrait} alt={playerHeroName} className="game-over-hero-image" />
										) : (
											<div
												className="game-over-hero-avatar"
												style={{
													background: `radial-gradient(circle at 35% 35%, ${playerColor}dd, ${playerColor}44)`,
													boxShadow: isVictory
														? `0 0 0 2px ${playerColor}, 0 0 16px ${playerColor}88`
														: `0 0 0 2px ${playerColor}55`,
												}}
											>
												{playerHeroName.charAt(0).toUpperCase()}
											</div>
										)}
									</div>
									<span className={`game-over-hero-name ${isVictory ? 'winner-name' : ''}`}>
										{playerHeroName}
								</span>
								{isVictory && <span className="game-over-crown">Field Taken</span>}
							</div>

							<div className="game-over-vs-block">
								<span className="game-over-vs">VS</span>
							</div>

								<div className="game-over-hero">
									<div className={`game-over-hero-portrait ${!isVictory && !isDraw ? 'winner' : 'loser'}`}>
										{opponentHeroPortrait ? (
											<img src={opponentHeroPortrait} alt={opponentHeroName} className="game-over-hero-image" />
										) : (
											<div
												className="game-over-hero-avatar"
												style={{
													background: `radial-gradient(circle at 35% 35%, ${opponentColor}dd, ${opponentColor}44)`,
													boxShadow: !isVictory && !isDraw
														? `0 0 0 2px ${opponentColor}, 0 0 16px ${opponentColor}88`
														: `0 0 0 2px ${opponentColor}55`,
												}}
											>
												{opponentHeroName.charAt(0).toUpperCase()}
											</div>
										)}
									</div>
									<span className={`game-over-hero-name ${!isVictory && !isDraw ? 'winner-name' : ''}`}>
										{opponentHeroName}
								</span>
								{!isVictory && !isDraw && <span className="game-over-crown">Field Taken</span>}
							</div>
						</motion.div>

						<motion.div
							className="game-over-stats"
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.8, duration: 0.3 }}
						>
							<div className="game-over-stat">
								<span className="game-over-stat-value">{turnNumber}</span>
								<span className="game-over-stat-label">Turns Played</span>
							</div>
							<div className="game-over-stat">
								<span className={`game-over-stat-value result-badge ${isVictory ? 'victory' : isDraw ? 'draw' : 'defeat'}`}>
									{isDraw ? 'DRAW' : isVictory ? 'WIN' : 'LOSS'}
								</span>
								<span className="game-over-stat-label">Outcome</span>
							</div>
							<div className="game-over-stat">
								<span className={`game-over-stat-value game-over-stat-icon-badge ${isVictory ? 'victory' : isDraw ? 'draw' : 'defeat'}`}>
									{isVictory ? <VictoryOutcomeIcon /> : isDraw ? <DrawOutcomeIcon /> : <DefeatOutcomeIcon />}
								</span>
								<span className="game-over-stat-label">{outcomeRole}</span>
							</div>
						</motion.div>

						{/* ELO delta — ranked matches show +/- points */}
						{isRanked && !isDraw && (
							<motion.div
								className="game-over-elo-delta"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.9, duration: 0.35, type: 'spring', stiffness: 300 }}
							>
								<span className={`elo-delta-value ${isVictory ? 'elo-gain' : 'elo-loss'}`}>
									{isVictory ? '+16' : '-16'} ELO
								</span>
							</motion.div>
						)}

						<motion.div
							className="game-over-actions"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 1.05, duration: 0.3 }}
						>
							{onRematch && (
								<button type="button" className="game-over-btn primary" onClick={onRematch}>
									Rematch
								</button>
							)}
							{onPlayAgain && (
								<button type="button" className="game-over-btn primary" onClick={onPlayAgain}>
									{onRematch ? 'New Opponent' : 'Play Again'}
								</button>
							)}
							{onMainMenu && (
								<button type="button" className="game-over-btn secondary" onClick={onMainMenu}>
									Main Menu
								</button>
							)}
						</motion.div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
