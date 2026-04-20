/**
 * DamageIndicator - Floating damage/heal number animation
 *
 * Uses position:fixed so viewport-relative coordinates from getBoundingClientRect work correctly.
 * Green for heals, red for damage, gold for critical hits (8+).
 */

import React, { useEffect, useMemo } from 'react';

export interface DamageAnimation {
	id: string;
	damage: number;
	targetId: string;
	x: number;
	y: number;
	timestamp: number;
	isHeal?: boolean;
}

interface DamageIndicatorProps {
	damage: number;
	x: number;
	y: number;
	isHeal?: boolean;
	onComplete: () => void;
}

export const DamageIndicator: React.FC<DamageIndicatorProps> = ({
	damage,
	x,
	y,
	isHeal = false,
	onComplete
}) => {
	useEffect(() => {
		const timer = setTimeout(onComplete, 2000);
		return () => clearTimeout(timer);
	}, [onComplete]);

	const isBig = damage >= 5;
	const isCritical = damage >= 8;
	const isCrit = damage >= 10;
	const jitterX = useMemo(() => (Math.random() - 0.5) * 10, []);
	const jitterY = useMemo(() => (Math.random() - 0.5) * 4, []);

	const className = [
		'damage-indicator',
		isHeal ? 'damage-heal' : 'damage-hurt',
		isBig ? 'damage-big' : '',
		isCritical ? 'damage-critical' : '',
	].filter(Boolean).join(' ');

	return (
		<div
			className={className}
			style={{
				position: 'fixed',
				left: x + jitterX,
				top: y + jitterY,
				pointerEvents: 'none',
				zIndex: 10000,
				transform: 'translateX(-50%)',
			}}
		>
			<span className={`damage-number-text ${isHeal ? 'combat-heal-number' : 'combat-damage-number'} ${!isHeal && isCrit ? 'crit' : ''}`}>{isHeal ? '+' : '-'}{damage}</span>
			{isCritical && !isHeal && <span className="damage-crit-label">CRIT!</span>}
		</div>
	);
};

export default DamageIndicator;
