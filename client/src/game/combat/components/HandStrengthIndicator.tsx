/**
 * HandStrengthIndicator — Live display of the player's current best poker hand.
 * Updates as community cards are revealed, pulses when hand improves.
 */

import React, { useEffect, useRef, useState } from 'react';
import { PokerHandRank } from '../../types/PokerCombatTypes';

interface HandStrengthIndicatorProps {
	handRank: PokerHandRank;
	handName: string;
	tier: 'low' | 'mid' | 'high' | 'godly';
}

export const HandStrengthIndicator: React.FC<HandStrengthIndicatorProps> = ({
	handRank,
	handName,
	tier
}) => {
	const [improved, setImproved] = useState(false);
	const prevRankRef = useRef(handRank);

	useEffect(() => {
		if (handRank > prevRankRef.current && prevRankRef.current > 0) {
			setImproved(true);
			const t = setTimeout(() => setImproved(false), 500);
			prevRankRef.current = handRank;
			return () => clearTimeout(t);
		}
		prevRankRef.current = handRank;
		return undefined;
	}, [handRank]);

	if (handRank <= PokerHandRank.HIGH_CARD || !handName) return null;

	return (
		<div className={`hand-strength-indicator tier-${tier} ${improved ? 'improved' : ''}`}>
			<span className="hand-strength-name">{handName}</span>
		</div>
	);
};
