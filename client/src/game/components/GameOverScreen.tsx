import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GameIcon } from '../utils/ui/GameIcon';
import type { IconName } from '../utils/ui/iconMap';
import './GameOverScreen.css';

interface GameOverScreenProps {
	result: 'victory' | 'defeat' | 'draw';
	playerName?: string;
	opponentName?: string;
	stats?: {
		turnsPlayed: number;
		cardsPlayed: number;
		damageDealt: number;
		minionsKilled: number;
		spellsCast: number;
		heroPowerUsed: number;
	};
	onPlayAgain?: () => void;
	onMainMenu?: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
	result,
	playerName = 'You',
	opponentName = 'Opponent',
	stats,
	onPlayAgain,
	onMainMenu
}) => {
	const [showStats, setShowStats] = useState(false);
	const [showButtons, setShowButtons] = useState(false);

	useEffect(() => {
		const t1 = setTimeout(() => setShowStats(true), 1200);
		const t2 = setTimeout(() => setShowButtons(true), 2000);
		return () => { clearTimeout(t1); clearTimeout(t2); };
	}, []);

	const title = result === 'victory' ? 'VICTORY' : result === 'defeat' ? 'DEFEAT' : 'DRAW';
	const subtitle = result === 'victory' ? 'Glory to Valhalla!' : result === 'defeat' ? 'The Norns weave again...' : 'A stalemate of equals';

	const content = (
		<motion.div
			className={`game-over-overlay game-over-${result}`}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
		>
			<div className="game-over-particles">
				{Array.from({ length: 30 }).map((_, i) => (
					<div key={i} className={`game-over-particle particle-${i % 5}`} style={{
						'--delay': `${i * 0.05}s`,
						'--angle': `${(i / 30) * 360}deg`,
						'--distance': `${150 + Math.random() * 200}px`
					} as React.CSSProperties} />
				))}
			</div>

			<motion.div
				className="game-over-title-block"
				initial={{ scale: 3, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
			>
				<h1 className="game-over-title">{title}</h1>
				<motion.p
					className="game-over-subtitle"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.8, duration: 0.4 }}
				>
					{subtitle}
				</motion.p>
			</motion.div>

			<AnimatePresence>
				{showStats && stats && (
					<motion.div
						className="game-over-stats"
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<div className="game-over-stat-grid">
							<StatItem label="Turns" value={stats.turnsPlayed} iconName="hourglass" delay={0} />
							<StatItem label="Cards Played" value={stats.cardsPlayed} iconName="wand" delay={0.1} />
							<StatItem label="Damage Dealt" value={stats.damageDealt} iconName="swords" delay={0.2} />
							<StatItem label="Minions Slain" value={stats.minionsKilled} iconName="skull" delay={0.3} />
							<StatItem label="Spells Cast" value={stats.spellsCast} iconName="sparkles" delay={0.4} />
							<StatItem label="Hero Powers" value={stats.heroPowerUsed} iconName="zap" delay={0.5} />
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{showButtons && (
					<motion.div
						className="game-over-actions"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4 }}
					>
						{onPlayAgain && (
							<button className="game-over-btn game-over-btn-primary" onClick={onPlayAgain}>
								Play Again
							</button>
						)}
						{onMainMenu && (
							<button className="game-over-btn game-over-btn-secondary" onClick={onMainMenu}>
								Main Menu
							</button>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);

	return createPortal(content, document.body);
};

const StatItem: React.FC<{ label: string; value: number; iconName: IconName; delay: number }> = ({ label, value, iconName, delay }) => {
	const [displayValue, setDisplayValue] = useState(0);

	useEffect(() => {
		const duration = 800;
		const start = Date.now();
		const timer = setInterval(() => {
			const elapsed = Date.now() - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			setDisplayValue(Math.round(eased * value));
			if (progress >= 1) clearInterval(timer);
		}, 16);
		return () => clearInterval(timer);
	}, [value]);

	return (
		<motion.div
			className="game-over-stat-item"
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay, duration: 0.3 }}
		>
			<span className="stat-icon"><GameIcon name={iconName} size={18} /></span>
			<span className="stat-value">{displayValue}</span>
			<span className="stat-label">{label}</span>
		</motion.div>
	);
};

export default GameOverScreen;
