import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { proceduralAudio } from '../../audio/proceduralAudio';
import './HeroBattlePopup.css';

export type BattlePopupAction = 'brace' | 'attack' | 'counter_attack' | 'engage' | 'defend';
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

const ACTION_CONFIG: Record<BattlePopupAction, { color: string; sound: Parameters<typeof proceduralAudio.play>[0] }> = {
	brace: { color: '#9E9E9E', sound: 'combat_brace' },
	attack: { color: '#FF9800', sound: 'sword_clash' },
	counter_attack: { color: '#FF5722', sound: 'sword_clash' },
	engage: { color: '#2196F3', sound: 'attack_prepare' },
	defend: { color: '#4CAF50', sound: 'combat_brace' },
};

function getHeroCenter(target: 'player' | 'opponent'): { x: number; y: number } {
	const selector = target === 'player'
		? '.battlefield-hero-square.player'
		: '.battlefield-hero-square.opponent';
	const el = document.querySelector(selector);
	if (el) {
		const rect = el.getBoundingClientRect();
		return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	}
	return target === 'player'
		? { x: 120, y: window.innerHeight * 0.75 }
		: { x: 120, y: window.innerHeight * 0.15 };
}

const ShieldPopupIcon = () => (
	<svg viewBox="0 0 20 20" fill="currentColor" width="48" height="48">
		<path d="M10 1L3 4v5c0 4.5 3 8.3 7 9.8 4-1.5 7-5.3 7-9.8V4l-7-3zm0 2.2L15 5.8v3.4c0 3.5-2.2 6.5-5 7.8-2.8-1.3-5-4.3-5-7.8V5.8L10 3.2z"/>
		<circle cx="10" cy="9.5" r="2.5" opacity="0.6"/>
	</svg>
);

const SwordPopupIcon = () => (
	<svg viewBox="0 0 20 20" fill="currentColor" width="48" height="48">
		<path d="M16.5 1l-1 3.5-1.2 1.2-5.8 5.8-1.4-1.4 5.8-5.8L14 3.1 15.5 1h1zM7.6 11l1.4 1.4-2.3 2.3 1.1 1.1a1 1 0 01-1.4 1.4l-1.1-1.1-1.8 1.8a1 1 0 01-1.4-1.4l1.8-1.8-1.1-1.1a1 1 0 011.4-1.4l1.1 1.1L7.6 11z"/>
	</svg>
);

const CrossedSwordsPopupIcon = () => (
	<svg viewBox="0 0 20 20" fill="currentColor" width="48" height="48">
		<path d="M3.5 1l1 3.5 1.2 1.2 4.3 4.3 4.3-4.3L15.5 4.5l1-3.5h1L16 5.3l-1.2 1.2L10 11.3l-1.5 1.5 1.1 1.1a1 1 0 01-1.4 1.4l-1.1-1.1-1.8 1.8a1 1 0 01-1.4-1.4l1.8-1.8-1.1-1.1a1 1 0 011.4-1.4l1.1 1.1L8.6 10 4.3 5.7 3.1 4.5 1 5.5V4.5L2.5 1h1z"/>
		<path d="M11.4 12.4l1.5-1.5 4.8 4.8-1.2 1.2L18 18.5a1 1 0 01-1.4 1.4l-1.6-1.6-1.2 1.2-4.8-4.8z" opacity="0.85"/>
	</svg>
);

const HelmPopupIcon = () => (
	<svg viewBox="0 0 20 20" fill="currentColor" width="48" height="48">
		<path d="M10 2C6.5 2 3.5 4.5 3 8v3c0 .6.4 1 1 1h1v2.5c0 .8.7 1.5 1.5 1.5h1c.6 0 1-.3 1.2-.8L10 13l1.3 2.2c.2.5.6.8 1.2.8h1c.8 0 1.5-.7 1.5-1.5V12h1c.6 0 1-.4 1-1V8c-.5-3.5-3.5-6-7-6zM5 8.5c.3-2.5 2.5-4.5 5-4.5s4.7 2 5 4.5V10H5V8.5z"/>
		<path d="M9.2 7h1.6v3H9.2V7z" opacity="0.5"/>
	</svg>
);

function getIcon(action: BattlePopupAction): React.ReactNode {
	switch (action) {
		case 'brace': return <ShieldPopupIcon />;
		case 'attack': return <SwordPopupIcon />;
		case 'counter_attack': return <SwordPopupIcon />;
		case 'engage': return <CrossedSwordsPopupIcon />;
		case 'defend': return <HelmPopupIcon />;
	}
}

const SinglePopup: React.FC<{
	popup: HeroBattlePopupData;
	target: 'player' | 'opponent';
}> = ({ popup, target }) => {
	const pos = useMemo(() => getHeroCenter(target), [target]);
	const config = ACTION_CONFIG[popup.action];

	return (
		<motion.div
			className={`hbp-overlay hbp-${popup.action}`}
			style={{
				position: 'fixed',
				left: pos.x,
				top: pos.y,
				'--hbp-color': config.color,
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
				{getIcon(popup.action)}
			</div>
			<div className="hbp-text">{popup.text}</div>
			{popup.subtitle && <div className="hbp-subtitle">{popup.subtitle}</div>}
		</motion.div>
	);
};

export const HeroBattlePopup: React.FC<HeroBattlePopupProps> = ({ popup, onComplete }) => {
	useEffect(() => {
		const config = ACTION_CONFIG[popup.action];
		proceduralAudio.play(config.sound);
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
