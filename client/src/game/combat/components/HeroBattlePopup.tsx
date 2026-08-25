import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { proceduralAudio } from '../../audio/proceduralAudio';
import { CombatAction } from '../../types/PokerCombatTypes';
import {
	ARENA_VFX_LAYERS,
	getArenaLocalPoint,
	getArenaVfxHeroTarget,
	getArenaVfxLayer,
} from '../arenaVfxTargets';
import { getPokerActionDefinition } from '../decision/pokerActionCatalog';
import { PokerActionIcon } from './PokerActionIcon';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import './HeroBattlePopup.css';

export type BattlePopupAction = CombatAction;
export type BattlePopupTarget = 'player' | 'opponent' | 'both';

export interface HeroBattlePopupData {
	id: string;
	action: BattlePopupAction;
	target: BattlePopupTarget;
	text: string;
	subtitle?: string;
	timestamp: number;
}

interface HeroBattlePopupProps {
	popup: HeroBattlePopupData;
	onComplete: (id: string) => void;
}

const POPUP_DURATION = 2500;

function getHeroAnchor(target: 'player' | 'opponent', layer: HTMLElement): {
	position: { x: number; y: number };
	accent?: string;
} {
	const el = getArenaVfxHeroTarget(target);
	if (el) {
		const rect = el.getBoundingClientRect();
		const heroSurface = el.querySelector<HTMLElement>('.battlefield-hero-square') ?? el;
		const accent = getComputedStyle(heroSurface).getPropertyValue('--hero-element-accent').trim();
		const position = getArenaLocalPoint(
			{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
			layer,
		);
		if (position) return { position, accent: accent || undefined };
	}
	return {
		position: target === 'player'
			? { x: 140, y: 865 }
			: { x: 140, y: 215 },
	};
}

const SinglePopup: React.FC<{
	popup: HeroBattlePopupData;
	target: 'player' | 'opponent';
}> = ({ popup, target }) => {
	const layer = getArenaVfxLayer(ARENA_VFX_LAYERS.vfx);
	const anchor = useMemo(
		() => (layer ? getHeroAnchor(target, layer) : null),
		[layer, target],
	);
	const definition = getPokerActionDefinition(popup.action);
	if (!anchor) return null;

	return (
		<motion.div
			className="hbp-overlay"
			style={{
				left: anchor.position.x,
				top: anchor.position.y,
				'--hbp-color': anchor.accent ?? definition.color,
			} as React.CSSProperties}
			role="status"
			aria-label={[popup.text, popup.subtitle].filter(Boolean).join('. ')}
			initial={{ opacity: 0, scale: 0.92, x: '-50%', y: '-50%' }}
			animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
			exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-55%', filter: 'blur(2px)' }}
			transition={{
				duration: 0.4,
				ease: [0.25, 0.1, 0.25, 1.0],
				exit: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] },
			}}
		>
			<div className="hbp-icon-wrap" aria-hidden="true">
				<PokerActionIcon glyph={definition.glyph} />
			</div>
			<div className="hbp-text" aria-hidden="true">{definition.pokerLabel}</div>
		</motion.div>
	);
};

export const HeroBattlePopup: React.FC<HeroBattlePopupProps> = ({ popup, onComplete }) => {
	useEffect(() => {
		proceduralAudio.play(getPokerActionDefinition(popup.action).sound);
	}, [popup.action]);

	useEffect(() => {
		const handle = gameEffectCoordinator.schedule({
			owner: 'poker-renderer',
			lane: 'poker-popup',
			key: popup.id,
			priority: 'normal',
			delayMs: POPUP_DURATION,
			run: () => onComplete(popup.id),
		});
		return () => handle.cancel();
	}, [popup.id, onComplete]);

	const targets: ('player' | 'opponent')[] = popup.target === 'both'
		? ['player', 'opponent']
		: [popup.target];
	const portalTarget = getArenaVfxLayer(ARENA_VFX_LAYERS.vfx);
	if (!portalTarget) return null;

	return createPortal(
		<AnimatePresence>
			{targets.map(t => (
				<SinglePopup key={`${popup.id}-${t}`} popup={popup} target={t} />
			))}
		</AnimatePresence>,
		portalTarget
	);
};

export default HeroBattlePopup;
