import React from 'react';
import { motion } from 'framer-motion';
import { getPokerTurnBadgePresentation } from '../decision/pokerTurnBadgePresentation';
import '../styles/turn-banner.css';

interface TurnBannerProps {
	currentTurn: 'player' | 'opponent' | undefined;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({ currentTurn }) => {
	const badgeRotation = 'var(--poker-zone-turnBadge-rot, 0deg)';
	const badge = getPokerTurnBadgePresentation(currentTurn);
	if (!badge) return null;

	return (
		<motion.div
			key="persistent-turn-badge"
			className={badge.className}
			initial={{ opacity: 0, y: 10, scale: 0.94, rotate: badgeRotation }}
			animate={{ opacity: 1, y: 0, scale: 1, rotate: badgeRotation }}
			transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
			aria-label={badge.ariaLabel}
			aria-live="polite"
			role="status"
		>
			<span className="persistent-turn-dot" aria-hidden="true" />
			<span className="persistent-turn-copy">
				<span className="persistent-turn-kicker">{badge.kicker}</span>
				<span className="persistent-turn-main">{badge.main}</span>
			</span>
		</motion.div>
	);
};
