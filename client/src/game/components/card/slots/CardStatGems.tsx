/**
 * <CardStatGems> — slot: ATK / HP stat gems.
 *
 * Pair of small numeric badges in the lower-left. Minions only
 * (poker/hero cards don't use this slot). Tabular-nums prevents
 * the digits from jittering on animation.
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';

export interface CardStatGemsProps {
	attack?: number;
	health?: number;
}

const CardStatGems: React.FC<CardStatGemsProps> = ({ attack, health }) => {
	const { size } = useCardFrame();
	const isPreview = size === 'preview';

	return (
		<div className="card-frame__stat-gems" data-size={size}>
			{attack !== undefined && (
				<div
					className="card-frame__stat-gem card-frame__stat-gem--atk"
					style={{ fontSize: isPreview ? '1.1rem' : undefined }}
				>
					{attack}
				</div>
			)}
			{health !== undefined && (
				<div
					className="card-frame__stat-gem card-frame__stat-gem--hp"
					style={{ fontSize: isPreview ? '1.1rem' : undefined }}
				>
					{health}
				</div>
			)}
		</div>
	);
};

export default CardStatGems;
