import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { proceduralAudio } from '../../audio/proceduralAudio';
import { CombatAction } from '../../types/PokerCombatTypes';
import { getArenaVfxHeroTarget } from '../arenaVfxTargets';
import { getPokerActionDefinition } from '../decision/pokerActionCatalog';
import { PokerActionIcon } from './PokerActionIcon';
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

function getHeroCenter(target: 'player' | 'opponent'): { x: number; y: number } {
	const el = getArenaVfxHeroTarget(target);
	if (el) {
		const rect = el.getBoundingClientRect();
		return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	}
	return target === 'player'
		? { x: 120, y: window.innerHeight * 0.75 }
		: { x: 120, y: window.innerHeight * 0.15 };
}

const SinglePopup: React.FC<{
	popup: HeroBattlePopupData;
	target: 'player' | 'opponent';
}> = ({ popup, target }) => {
	const pos = useMemo(() => getHeroCenter(target), [target]);
	const definition = getPokerActionDefinition(popup.action);

	return (
		<motion.div
			className="hbp-overlay"
			style={{
				position: 'fixed',
				left: pos.x,
				top: pos.y,
				'--hbp-color': definition.color,
			} as React.CSSProperties}
			initial={{ opacity: 0, scale: 0.92, x: '-50%', y: '-50%' }}
			animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
			exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-55%', filter: 'blur(2px)' }}
			transition={{
				duration: 0.4,
				ease: [0.25, 0.1, 0.25, 1.0],
				exit: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] },
			}}
		>
			<div className="hbp-icon-wrap">
				<PokerActionIcon glyph={definition.glyph} />
			</div>
			<div className="hbp-text">{popup.text}</div>
			{popup.subtitle && <div className="hbp-subtitle">{popup.subtitle}</div>}
		</motion.div>
	);
};

export const HeroBattlePopup: React.FC<HeroBattlePopupProps> = ({ popup, onComplete }) => {
	useEffect(() => {
		proceduralAudio.play(getPokerActionDefinition(popup.action).sound);
	}, [popup.action]);

	useEffect(() => {
		const timer = setTimeout(() => onComplete(popup.id), POPUP_DURATION);
		return () => clearTimeout(timer);
	}, [popup.id, onComplete]);

	const targets: ('player' | 'opponent')[] = popup.target === 'both'
		? ['player', 'opponent']
		: [popup.target];

	return createPortal(
		<AnimatePresence>
			{targets.map(t => (
				<SinglePopup key={`${popup.id}-${t}`} popup={popup} target={t} />
			))}
		</AnimatePresence>,
		document.body
	);
};

export default HeroBattlePopup;
