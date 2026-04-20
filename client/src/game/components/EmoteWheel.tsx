import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import './EmoteWheel.css';

export interface Emote {
	id: string;
	label: string;
	icon: string;
}

const EMOTES: Emote[] = [
	{ id: 'greetings', label: 'Greetings', icon: '\u270B' },
	{ id: 'well_played', label: 'Well Played', icon: '\uD83D\uDC4F' },
	{ id: 'thanks', label: 'Thanks', icon: '\uD83D\uDE4F' },
	{ id: 'sorry', label: 'Sorry', icon: '\uD83D\uDE14' },
	{ id: 'oops', label: 'Oops', icon: '\uD83D\uDE2C' },
	{ id: 'threaten', label: 'By Odin!', icon: '\u2694\uFE0F' },
];

interface EmoteWheelProps {
	onEmote: (emote: Emote) => void;
	position?: 'left' | 'right';
}

export const EmoteWheel: React.FC<EmoteWheelProps> = ({ onEmote, position = 'right' }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [cooldown, setCooldown] = useState(false);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleEmoteClick = useCallback((emote: Emote) => {
		if (cooldown) return;
		onEmote(emote);
		setIsOpen(false);
		setCooldown(true);
		if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
		cooldownTimer.current = setTimeout(() => setCooldown(false), 3000);
	}, [onEmote, cooldown]);

	useEffect(() => {
		return () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
			if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
		};
	}, []);

	return (
		<div className={`emote-container emote-${position}`}>
			<button
				className={`emote-trigger ${isOpen ? 'open' : ''} ${cooldown ? 'cooldown' : ''}`}
				onClick={() => setIsOpen(!isOpen)}
				title="Emotes"
			>
				<span className="emote-trigger-icon">{'\uD83D\uDCAC'}</span>
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						className="emote-wheel"
						initial={{ scale: 0.5, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.5, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 400, damping: 25 }}
					>
						{EMOTES.map((emote, i) => (
							<motion.button
								key={emote.id}
								className="emote-option"
								onClick={() => handleEmoteClick(emote)}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: i * 0.04 }}
								whileHover={{ scale: 1.08 }}
								whileTap={{ scale: 0.95 }}
							>
								<span className="emote-icon">{emote.icon}</span>
								<span className="emote-label">{emote.label}</span>
							</motion.button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

interface EmoteBubbleProps {
	emote: Emote | null;
	isOpponent: boolean;
}

export const EmoteBubble: React.FC<EmoteBubbleProps> = ({ emote, isOpponent }) => {
	if (!emote) return null;

	return createPortal(
		<motion.div
			className={`emote-bubble ${isOpponent ? 'opponent' : 'player'}`}
			initial={{ scale: 0, opacity: 0, y: isOpponent ? -20 : 20 }}
			animate={{ scale: 1, opacity: 1, y: 0 }}
			exit={{ scale: 0, opacity: 0 }}
			transition={{ type: 'spring', stiffness: 500, damping: 25 }}
		>
			<span className="bubble-icon">{emote.icon}</span>
			<span className="bubble-text">{emote.label}</span>
		</motion.div>,
		document.body
	);
};
