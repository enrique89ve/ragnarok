/**
 * <CardStatGems> — slot: ATK / HP stat gems.
 *
 * Pair of small numeric badges in the lower-left. Minions only
 * (poker/hero cards don't use this slot). Tabular-nums prevents
 * the digits from jittering on animation.
 *
 * `statView` is the canonical interface (tone-aware: buffed=green,
 * damaged=red, unknown=`?`). Numeric `attack` / `health` props
 * remain for back-compat — when `statView` is absent they fall
 * through to those values.
 *
 * Hides entirely when `statsMode === 'hidden'` (spells, secrets).
 * Compact square layout when `statsMode === 'battlefield'`.
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';
import type { StatView } from '../types';

export interface CardStatGemsProps {
	attack?: number;
	health?: number;
	statView?: StatView;
}

const TONE_CLASS: Record<'base' | 'buffed' | 'damaged' | 'unknown', string> = {
	base: '',
	buffed: 'card-frame__stat-gem--buffed',
	damaged: 'card-frame__stat-gem--damaged',
	unknown: 'card-frame__stat-gem--unknown',
};

const CardStatGems: React.FC<CardStatGemsProps> = ({ attack, health, statView }) => {
	const { size, statsMode } = useCardFrame();
	if (statsMode === 'hidden') return null;

	const atk = statView?.attack ?? (attack !== undefined ? { value: attack, tone: 'base' as const } : undefined);
	const hp = statView?.health ?? (health !== undefined ? { value: health, tone: 'base' as const } : undefined);

	if (atk === undefined && hp === undefined) return null;

	const isPreview = size === 'preview';
	const isBattlefield = statsMode === 'battlefield';

	return (
		<div
			className={isBattlefield ? 'card-frame__stat-gems card-frame__stat-gems--battlefield' : 'card-frame__stat-gems'}
			data-size={size}
		>
			{atk !== undefined && (
				<div
					className={[
						'card-frame__stat-gem',
						'card-frame__stat-gem--atk',
						TONE_CLASS[atk.tone],
					].filter(Boolean).join(' ')}
					style={{ fontSize: isPreview ? '1.43rem' : undefined }}
				>
					{atk.value}
				</div>
			)}
			{hp !== undefined && (
				<div
					className={[
						'card-frame__stat-gem',
						'card-frame__stat-gem--hp',
						TONE_CLASS[hp.tone],
					].filter(Boolean).join(' ')}
					style={{ fontSize: isPreview ? '1.43rem' : undefined }}
				>
					{hp.value}
				</div>
			)}
		</div>
	);
};

export default CardStatGems;
