import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getElementColor, ELEMENT_LABELS, type ElementType } from '../../utils/elements/elementAdvantage';
import { getElementIcon } from '../../components/ui/ElementIconsSVG';
import { useCombatFeedbackStore } from '../feedback/combatFeedbackStore';
import '../styles/poker-drama.css';
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
	const tone = isMutual
		? 'mutual'
		: playerHasAdvantage
			? 'advantage'
			: opponentHasAdvantage
				? 'disadvantage'
				: 'neutral';
	const title = {
		mutual: 'Mutual Advantage',
		advantage: 'Elemental Advantage',
		disadvantage: 'Elemental Disadvantage',
		neutral: 'Neutral Matchup',
	}[tone];
	const bonus = `+${attackBonus} ATK · +${healthBonus} HP · +${armorBonus} Armor`;
	const detail = {
		mutual: `Both sides ${bonus}`,
		advantage: `Your minions ${bonus}`,
		disadvantage: `Enemy minions ${bonus}`,
		neutral: 'No elemental bonus',
	}[tone];

	return (
		<AnimatePresence>
			{visible && (
				<motion.div
					className="element-matchup-overlay"
					role="status"
					aria-live="polite"
					aria-label={`${playerLabel} versus ${opponentLabel}. ${title}. ${detail}`}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.25 }}
				>
					<motion.div
						className="cinema-lane-plate element-matchup-banner"
						data-tone={tone}
						initial={{ scaleY: 0, opacity: 0 }}
						animate={{ scaleY: 1, opacity: 1 }}
						exit={{ scaleY: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
					>
						<span
							className="matchup-side matchup-side--player"
							style={{ '--element-color': playerColor } as React.CSSProperties}
						>
							<span className="matchup-element-icon"><PlayerElementIcon aria-hidden="true" /></span>
							<span className="matchup-element-name">{playerLabel}</span>
						</span>

						<span className="matchup-line" aria-hidden="true" />

						<motion.span
							className="matchup-text"
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.18, duration: 0.3 }}
						>
							<span className="matchup-result">{title}</span>
							<span className="matchup-detail">{detail}</span>
						</motion.span>

						<span className="matchup-line" aria-hidden="true" />

						<span
							className="matchup-side matchup-side--opponent"
							style={{ '--element-color': opponentColor } as React.CSSProperties}
						>
							<span className="matchup-element-name">{opponentLabel}</span>
							<span className="matchup-element-icon"><OpponentElementIcon aria-hidden="true" /></span>
						</span>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
