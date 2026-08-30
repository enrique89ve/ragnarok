import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getElementColor, ELEMENT_LABELS, type ElementType } from '../../utils/elements/elementAdvantage';
import { getElementIcon } from '../../components/ui/ElementIconsSVG';
import { useCombatFeedbackStore } from '../feedback/combatFeedbackStore';
import '../styles/element-matchup-banner.css';

interface ElementMatchupBannerProps {
	playerElement: ElementType;
	opponentElement: ElementType;
	playerHasAdvantage: boolean;
	opponentHasAdvantage: boolean;
	attackBonus: number;
	healthBonus: number;
	armorBonus: number;
	onComplete?: () => void;
}

export const ELEMENT_MATCHUP_VISIBLE_MS = 4_200;
const ELEMENT_MATCHUP_EXIT_MS = 250;
const ELEMENT_MATCHUP_CINEMA_HOLDER = 'element-matchup-banner';

export const ElementMatchupBanner: React.FC<ElementMatchupBannerProps> = ({
	playerElement,
	opponentElement,
	playerHasAdvantage,
	opponentHasAdvantage,
	attackBonus,
	healthBonus,
	armorBonus,
	onComplete,
}) => {
	const [visible, setVisible] = useState(true);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const feedbackStore = useCombatFeedbackStore.getState();
		feedbackStore.holdCinema(ELEMENT_MATCHUP_CINEMA_HOLDER);
		timeoutRef.current = setTimeout(() => setVisible(false), ELEMENT_MATCHUP_VISIBLE_MS);
		const releaseTimer = setTimeout(() => {
			feedbackStore.releaseCinema(ELEMENT_MATCHUP_CINEMA_HOLDER);
		}, ELEMENT_MATCHUP_VISIBLE_MS + ELEMENT_MATCHUP_EXIT_MS);
		const completeTimer = onComplete
			? setTimeout(onComplete, ELEMENT_MATCHUP_VISIBLE_MS + ELEMENT_MATCHUP_EXIT_MS)
			: null;
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			clearTimeout(releaseTimer);
			if (completeTimer) clearTimeout(completeTimer);
			feedbackStore.releaseCinema(ELEMENT_MATCHUP_CINEMA_HOLDER);
		};
	}, [onComplete]);

	const playerColor = getElementColor(playerElement);
	const opponentColor = getElementColor(opponentElement);
	const PlayerElementIcon = getElementIcon(playerElement);
	const OpponentElementIcon = getElementIcon(opponentElement);
	const playerLabel = ELEMENT_LABELS[playerElement] || 'Unknown';
	const opponentLabel = ELEMENT_LABELS[opponentElement] || 'Unknown';

	const isMutual = playerHasAdvantage && opponentHasAdvantage;
	const isNeutral = !playerHasAdvantage && !opponentHasAdvantage;

	return (
		<AnimatePresence>
			{visible && (
				<motion.div
					className="element-matchup-overlay"
					role="status"
					aria-live="polite"
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
								<span className="matchup-element-icon"><PlayerElementIcon aria-hidden="true" /></span>
								<span className="matchup-element-name" style={{ color: playerColor }}>{playerLabel}</span>
							</div>

							<span className="matchup-vs">VS</span>

							<div
								className="matchup-element-badge"
								style={{ '--element-color': opponentColor, '--element-glow': opponentColor + '60' } as React.CSSProperties}
							>
								<span className="matchup-element-icon"><OpponentElementIcon aria-hidden="true" /></span>
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
