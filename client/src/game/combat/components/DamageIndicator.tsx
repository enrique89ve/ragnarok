/**
 * DamageIndicator - Floating damage/heal number animation.
 *
 * Damage numbers are VFX, not HUD. They are converted into the bounded
 * 1920x1080 arena space and portaled into the VFX layer.
 */

import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import {
	ARENA_VFX_LAYERS,
	getArenaLocalPoint,
	getArenaVfxLayer,
} from '../arenaVfxTargets';

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
	id: string;
	damage: number;
	x: number;
	y: number;
	isHeal?: boolean;
	onComplete: () => void;
}

export const DamageIndicator: React.FC<DamageIndicatorProps> = ({
	id,
	damage,
	x,
	y,
	isHeal = false,
	onComplete,
}) => {
	const isBig = damage >= 5;
	const isCritical = damage >= 8;
	const isCrit = damage >= 10;

	useEffect(() => {
		const handle = gameEffectCoordinator.schedule({
			owner: 'poker-renderer',
			lane: 'damage-indicator',
			key: id,
			priority: isCritical ? 'high' : 'normal',
			delayMs: 2000,
			run: onComplete,
		});
		return () => handle.cancel();
	}, [id, isCritical, onComplete]);

	const jitter = useMemo(() => {
		let hash = 0;
		for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
		return {
			x: ((hash % 101) / 100 - 0.5) * 10,
			y: (((hash >>> 8) % 101) / 100 - 0.5) * 4,
		};
	}, [id]);

	const className = [
		'damage-indicator',
		isHeal ? 'damage-heal' : 'damage-hurt',
		isBig ? 'damage-big' : '',
		isCritical ? 'damage-critical' : '',
	].filter(Boolean).join(' ');

	const portalTarget = getArenaVfxLayer(ARENA_VFX_LAYERS.vfx);
	const position = portalTarget ? getArenaLocalPoint({ x, y }, portalTarget) : null;
	if (!portalTarget || !position) return null;

	return createPortal(
		<div
			className={className}
			style={{
				position: 'absolute',
				left: position.x + jitter.x,
				top: position.y + jitter.y,
				pointerEvents: 'none',
				zIndex: 35,
				transform: 'translateX(-50%)',
			}}
		>
			<span className={`damage-number-text ${isHeal ? 'combat-heal-number' : 'combat-damage-number'} ${!isHeal && isCrit ? 'crit' : ''}`}>
				{isHeal ? '+' : '-'}{damage}
			</span>
			{isCritical && !isHeal && <span className="damage-crit-label">CRIT!</span>}
		</div>,
		portalTarget,
	);
};

export default DamageIndicator;
