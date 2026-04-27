import React, { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useKingPassiveEventStore, KingPassiveEvent } from '../../stores/kingPassiveEventStore';
import { proceduralAudio } from '../../audio/proceduralAudio';
import { assetPath } from '../../utils/assetPath';
import { getKingArtPath, DEFAULT_PORTRAIT } from '../../utils/art/artMapping';
import './KingPassivePopup.css';

const POPUP_DURATION = 2200;
const MAX_SIMULTANEOUS = 2;

const getKingPortraitPath = (kingId: string): string => {
	const path = getKingArtPath(kingId);
	return path ? assetPath(path) : DEFAULT_PORTRAIT;
};

const KingPopupBubble: React.FC<{
	event: KingPassiveEvent;
	onComplete: (id: string) => void;
}> = ({ event, onComplete }) => {
	const isPlayer = event.ownerType === 'player';
	const [imgError, setImgError] = useState(false);

	useEffect(() => {
		try { proceduralAudio.play('card_draw'); } catch {}
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => onComplete(event.id), POPUP_DURATION);
		return () => clearTimeout(timer);
	}, [event.id, onComplete]);

	const portraitSrc = getKingPortraitPath(event.kingId);

	return (
		<motion.div
			className={`king-passive-popup ${isPlayer ? 'kpp-player' : 'kpp-opponent'}`}
			initial={{ opacity: 0, scale: 0.3, y: 30 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.6, y: -20 }}
			transition={{
				duration: 0.35,
				ease: [0.34, 1.56, 0.64, 1],
			}}
		>
			<div className="kpp-portrait-ring">
				{!imgError ? (
					<img
						src={portraitSrc}
						alt={event.kingName}
						className="kpp-portrait-img"
						draggable={false}
						onError={() => setImgError(true)}
					/>
				) : (
					<div className="kpp-portrait-fallback">
						<span>{event.kingName[0]}</span>
					</div>
				)}
				<div className="kpp-laugh-overlay" />
			</div>
			<div className="kpp-text-area">
				<div className="kpp-king-name">{event.kingName}</div>
				<div className="kpp-passive-name">{event.passiveName}</div>
				<div className="kpp-passive-desc">{event.passiveDescription}</div>
			</div>
		</motion.div>
	);
};

export const KingPassivePopup: React.FC = () => {
	const events = useKingPassiveEventStore((s) => s.events);
	const removeEvent = useKingPassiveEventStore((s) => s.removeEvent);
	const visibleRef = useRef<string[]>([]);

	const handleComplete = useCallback((id: string) => {
		visibleRef.current = visibleRef.current.filter((eid) => eid !== id);
		removeEvent(id);
	}, [removeEvent]);

	const visibleEvents = events.slice(0, MAX_SIMULTANEOUS);

	return createPortal(
		<AnimatePresence>
			{visibleEvents.map((event, idx) => (
				<div
					key={event.id}
					className="kpp-anchor"
					style={{
						[event.ownerType === 'player' ? 'bottom' : 'top']:
							event.ownerType === 'player' ? `${100 + idx * 110}px` : `${60 + idx * 110}px`,
					}}
				>
					<KingPopupBubble event={event} onComplete={handleComplete} />
				</div>
			))}
		</AnimatePresence>,
		document.body
	);
};

export default KingPassivePopup;
