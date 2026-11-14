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
	type QueryRoot,
} from '../arenaVfxTargets';
import { useArenaVfxRoot } from '../arenaVfxContext';
import { getPokerActionDefinition } from '../decision/pokerActionCatalog';
import { PokerActionIcon } from './PokerActionIcon';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import { CINEMA_READ_MS } from '../feedback/combatFeedback';
import { useCombatFeedbackStore } from '../feedback/combatFeedbackStore';
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

function getHeroAnchor(target: 'player' | 'opponent', layer: HTMLElement, root: QueryRoot | null): {
	position: { x: number; y: number };
	accent?: string;
} {
	const el = getArenaVfxHeroTarget(target, root);
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
	const arenaRoot = useArenaVfxRoot();
	const layer = getArenaVfxLayer(ARENA_VFX_LAYERS.vfx, arenaRoot);
	const anchor = useMemo(
		() => (layer ? getHeroAnchor(target, layer, arenaRoot) : null),
		[arenaRoot, layer, target],
	);
	const definition = getPokerActionDefinition(popup.action);
	if (!anchor) return null;

	const sentence = [popup.text, popup.subtitle].filter(Boolean).join('. ');

	return (
		<motion.div
			className="hbp-anchor"
			style={{
				left: anchor.position.x,
				top: anchor.position.y,
				'--hbp-color': anchor.accent ?? definition.color,
			} as React.CSSProperties}
			role="status"
			aria-label={sentence}
			initial={{ opacity: 0, scale: 0.92, x: '-50%', y: '-50%' }}
			animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
			exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
			transition={{
				duration: 0.4,
				ease: [0.25, 0.1, 0.25, 1.0],
				exit: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] },
			}}
		>
			<div className="hbp-overlay" aria-hidden="true">
				<div className="hbp-icon-wrap">
					<PokerActionIcon glyph={definition.glyph} />
				</div>
				<div className="hbp-text">{definition.pokerLabel}</div>
			</div>
		</motion.div>
	);
};

export const HeroBattlePopup: React.FC<HeroBattlePopupProps> = ({ popup, onComplete }) => {
	const arenaRoot = useArenaVfxRoot();
	useEffect(() => {
		proceduralAudio.play(getPokerActionDefinition(popup.action).sound);
	}, [popup.action]);

	useEffect(() => {
		useCombatFeedbackStore.getState().enqueueStack({
			lane: 'stack',
			title: popup.text,
			subtitle: popup.subtitle,
			tone: 'warning',
			holdMs: CINEMA_READ_MS,
		});
	}, [popup.id, popup.subtitle, popup.text]);

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
	const portalTarget = getArenaVfxLayer(ARENA_VFX_LAYERS.vfx, arenaRoot);
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
