import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLogStore, GameLogEntry } from '../stores/gameLogStore';
import './GameLog.css';

const TYPE_ICONS: Record<string, string> = {
	play_card: '\uD83C\uDCCF',
	attack: '\u2694',
	hero_power: '\u26A1',
	spell: '\u2728',
	draw: '\uD83C\uDCA0',
	death: '\uD83D\uDC80',
	damage: '\uD83D\uDCA5',
	heal: '\u2764',
	secret: '\u2753',
	end_turn: '\u27F3',
	fatigue: '\uD83D\uDCA2',
	battlecry: '\uD83D\uDCE3',
	deathrattle: '\uD83D\uDD14'
};

const LogEntry: React.FC<{ entry: GameLogEntry }> = React.memo(({ entry }) => {
	const icon = TYPE_ICONS[entry.type] || '\u2022';
	const actorClass = entry.actor === 'player' ? 'log-player' : 'log-opponent';

	return (
		<motion.div
			className={`game-log-entry ${actorClass}`}
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.2 }}
		>
			<span className="log-icon">{icon}</span>
			<span className="log-turn">T{entry.turn}</span>
			<span className="log-message">{entry.message}</span>
			{entry.details?.amount !== undefined && (
				<span className={`log-amount ${entry.type === 'heal' ? 'heal' : 'damage'}`}>
					{entry.type === 'heal' ? '+' : '-'}{entry.details.amount}
				</span>
			)}
		</motion.div>
	);
});

LogEntry.displayName = 'LogEntry';

export const GameLog: React.FC = () => {
	const entries = useGameLogStore(state => state.entries);
	const isOpen = useGameLogStore(state => state.isOpen);
	const toggleLog = useGameLogStore(state => state.toggleLog);
	const clearLog = useGameLogStore(state => state.clearLog);
	const scrollRef = useRef<HTMLDivElement>(null);
	const latestEntry = entries[entries.length - 1];

	useEffect(() => {
		if (scrollRef.current && isOpen) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [entries.length, isOpen]);

	return (
		<div className="game-log-container">
			{latestEntry && !isOpen && (
				<button
					type="button"
					className="game-log-preview"
					onClick={toggleLog}
					title="Open battle log"
				>
					<span className="game-log-preview-turn">T{latestEntry.turn}</span>
					<span className="game-log-preview-text">{latestEntry.message}</span>
				</button>
			)}

			<button
				type="button"
				className={`game-log-toggle ${isOpen ? 'open' : ''}`}
				onClick={toggleLog}
				title="Battle Log"
			>
				<span className="log-toggle-icon">{'\uD83D\uDCDC'}</span>
				<span className="log-toggle-label">{isOpen ? 'Hide Log' : 'Battle Log'}</span>
				{entries.length > 0 && !isOpen && (
					<span className="log-badge">{Math.min(entries.length, 99)}</span>
				)}
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						className="game-log-panel"
						initial={{ x: 280, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: 280, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
					>
						<div className="game-log-header">
							<div className="game-log-header-copy">
								<span>Battle Log</span>
								<span className="game-log-count">{entries.length} events</span>
							</div>
							<div className="game-log-header-actions">
								{entries.length > 0 && (
									<button type="button" className="game-log-clear" onClick={clearLog}>
										Clear
									</button>
								)}
								<button type="button" className="game-log-close" onClick={toggleLog}>{'\u2715'}</button>
							</div>
						</div>
						<div className="game-log-entries" ref={scrollRef}>
							{entries.length === 0 ? (
								<div className="game-log-empty">No actions yet</div>
							) : (
								entries.map((entry) => (
									<LogEntry key={entry.id} entry={entry} />
								))
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default GameLog;
