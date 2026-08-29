/**
 * HandStrengthIndicator — Live display of the player's current best poker hand.
 * Updates as community cards are revealed, pulses when hand improves.
 */

import React, { useEffect, useRef, useState } from 'react';
import { PokerHandRank, TRADITIONAL_HAND_NAMES } from '../../types/PokerCombatTypes';
import PokerHandIcon from './PokerHandIcon';

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

	const traditionalHandName = TRADITIONAL_HAND_NAMES[handRank] || handName;
	const tierLabel = {
		low: 'TIER I',
		mid: 'TIER II',
		high: 'TIER III',
		godly: 'TIER IV',
	}[tier];

	return (
			<div
				className={`hand-strength-indicator tier-${tier} ${improved ? 'improved' : ''}`}
				data-hand-rank={handRank}
				aria-label={`Current hand: ${traditionalHandName}, ${handName}, ${tierLabel}`}
			>
					<span className="hand-strength-sigil" aria-hidden="true">
						<PokerHandIcon />
					</span>
				<span className="hand-strength-copy">
					<strong className="hand-strength-name">{handName}</strong>
					<span className="hand-strength-meta">{traditionalHandName} · {tierLabel}</span>
				</span>
			</div>
	);
};
