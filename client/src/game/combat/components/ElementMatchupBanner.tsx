import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getElementColor, getElementIcon, ELEMENT_LABELS, type ElementType } from '../../utils/elements/elementAdvantage';
import '../styles/element-matchup-banner.css';

interface ElementMatchupBannerProps {
	playerElement: ElementType;
	opponentElement: ElementType;
	playerHasAdvantage: boolean;
	opponentHasAdvantage: boolean;
	attackBonus: number;
	healthBonus: number;
	armorBonus: number;
}

export const ElementMatchupBanner: React.FC<ElementMatchupBannerProps> = ({
	playerElement,
	opponentElement,
	playerHasAdvantage,
	opponentHasAdvantage,
	attackBonus,
	healthBonus,
	armorBonus,
}) => {
	const [visible, setVisible] = useState(true);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		timeoutRef.current = setTimeout(() => setVisible(false), 3000);
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	const playerColor = getElementColor(playerElement);
	const opponentColor = getElementColor(opponentElement);
	const playerIcon = getElementIcon(playerElement);
	const opponentIcon = getElementIcon(opponentElement);
	const playerLabel = ELEMENT_LABELS[playerElement] || 'Unknown';
	const opponentLabel = ELEMENT_LABELS[opponentElement] || 'Unknown';

	const isMutual = playerHasAdvantage && opponentHasAdvantage;
	const isNeutral = !playerHasAdvantage && !opponentHasAdvantage;

	return (
		<AnimatePresence>
			{visible && (
				<motion.div
					className="element-matchup-overlay"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.25 }}
				>
					<motion.div
						className="element-matchup-banner"
						initial={{ scaleY: 0, opacity: 0 }}
						animate={{ scaleY: 1, opacity: 1 }}
						exit={{ scaleY: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
					>
						<div className="matchup-line left" />
						<div className="matchup-line right" />

						<motion.div
							className="matchup-elements"
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.15, duration: 0.3 }}
						>
							<div
								className="matchup-element-badge"
								style={{ '--element-color': playerColor, '--element-glow': playerColor + '60' } as React.CSSProperties}
							>
								<span className="matchup-element-icon">{playerIcon}</span>
								<span className="matchup-element-name" style={{ color: playerColor }}>{playerLabel}</span>
							</div>

							<span className="matchup-vs">VS</span>

							<div
								className="matchup-element-badge"
								style={{ '--element-color': opponentColor, '--element-glow': opponentColor + '60' } as React.CSSProperties}
							>
								<span className="matchup-element-icon">{opponentIcon}</span>
								<span className="matchup-element-name" style={{ color: opponentColor }}>{opponentLabel}</span>
							</div>
						</motion.div>

						<motion.div
							className={`matchup-result ${isMutual ? 'mutual' : playerHasAdvantage ? 'advantage' : opponentHasAdvantage ? 'disadvantage' : 'neutral'}`}
							initial={{ scale: 1.4, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ delay: 0.25, duration: 0.35, ease: 'easeOut' }}
						>
							{isMutual ? 'Mutual Advantage!' : playerHasAdvantage ? 'Elemental Advantage!' : opponentHasAdvantage ? 'Elemental Disadvantage!' : 'Neutral Matchup'}
						</motion.div>

						{!isNeutral && (
							<motion.div
								className={`matchup-bonuses ${isMutual ? 'mutual-bonuses' : playerHasAdvantage ? 'advantage-bonuses' : 'disadvantage-bonuses'}`}
								initial={{ opacity: 0, y: 6 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.4, duration: 0.3 }}
							>
								{isMutual ? (
									<span>Both sides get +{attackBonus} ATK, +{healthBonus} HP, +{armorBonus} Armor</span>
								) : playerHasAdvantage ? (
									<>
										<span>+{attackBonus} ATK</span>
										<span>+{healthBonus} HP</span>
										<span>+{armorBonus} Armor</span>
									</>
								) : (
									<span>Enemy minions get +{attackBonus}/{healthBonus}, +{armorBonus} Armor</span>
								)}
							</motion.div>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
