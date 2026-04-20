import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/turn-banner.css';

interface TurnBannerProps {
	currentTurn: 'player' | 'opponent' | undefined;
	turnNumber: number;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({ currentTurn, turnNumber }) => {
	const [visible, setVisible] = useState(false);
	const [displayTurn, setDisplayTurn] = useState<'player' | 'opponent'>('player');
	const prevTurnRef = useRef<string | undefined>(undefined);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!currentTurn) return;
		if (prevTurnRef.current === currentTurn) return;
		prevTurnRef.current = currentTurn;

		setDisplayTurn(currentTurn);
		setVisible(true);

		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => setVisible(false), 2200);

		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, [currentTurn]);

	return (
		<>
			{/* Persistent turn badge — always visible */}
			<div className={`persistent-turn-badge ${currentTurn === 'player' ? 'your-turn' : 'enemy-turn'}`}>
				<div className="persistent-turn-dot" />
				<span>{currentTurn === 'player' ? 'YOUR TURN' : 'ENEMY TURN'}</span>
			</div>

			{/* Splash banner on turn change */}
			<AnimatePresence>
				{visible && (
					<motion.div
						className="turn-banner-overlay"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
					>
						<motion.div
							className={`turn-banner ${displayTurn === 'player' ? 'player-turn' : 'opponent-turn'}`}
							initial={{ scaleY: 0, opacity: 0 }}
							animate={{ scaleY: 1, opacity: 1 }}
							exit={{ scaleY: 0, opacity: 0, transition: { duration: 0.18 } }}
							transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
						>
							<div className="turn-banner-line left" />
							<div className="turn-banner-line right" />
							<motion.div
								className="turn-banner-text"
								initial={{ scale: 1.55, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ delay: 0.06, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
							>
								{displayTurn === 'player' ? 'YOUR TURN' : 'ENEMY TURN'}
							</motion.div>
							<motion.div
								className="turn-banner-sub"
								initial={{ opacity: 0, y: 6 }}
								animate={{ opacity: 0.7, y: 0 }}
								transition={{ delay: 0.18, duration: 0.28 }}
							>
								Turn {turnNumber}
							</motion.div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};
