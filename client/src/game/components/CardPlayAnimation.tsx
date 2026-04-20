import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import './CardPlayAnimation.css';

interface FlyingCard {
	id: string;
	name: string;
	manaCost: number;
	rarity: string;
	startX: number;
	startY: number;
}

interface CardPlayAnimationProps {
	playedCard: { name: string; manaCost: number; rarity?: string } | null;
	playCount: number;
}

const RARITY_COLORS: Record<string, string> = {
	common: '#9ca3af',
	rare: '#3b82f6',
	epic: '#a855f7',
	legendary: '#f59e0b',
	mythic: '#ec4899'
};

export const CardPlayAnimation: React.FC<CardPlayAnimationProps> = ({ playedCard, playCount }) => {
	const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!playedCard || playCount <= 0) return;

		const card: FlyingCard = {
			id: `play-${Date.now()}-${Math.random()}`,
			name: playedCard.name,
			manaCost: playedCard.manaCost,
			rarity: playedCard.rarity || 'common',
			startX: window.innerWidth / 2,
			startY: window.innerHeight - 100
		};

		setFlyingCards(prev => [...prev, card]);
		timerRef.current = setTimeout(() => {
			setFlyingCards(prev => prev.filter(c => c.id !== card.id));
		}, 600);

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [playCount]);

	if (flyingCards.length === 0) return null;

	return createPortal(
		<div className="card-play-layer">
			<AnimatePresence>
				{flyingCards.map(card => {
					const glowColor = RARITY_COLORS[card.rarity] || RARITY_COLORS.common;
					return (
						<motion.div
							key={card.id}
							className={`card-play-flying rarity-${card.rarity}`}
							initial={{
								x: card.startX - 40,
								y: card.startY,
								scale: 1,
								opacity: 1,
								rotateZ: -5
							}}
							animate={{
								x: window.innerWidth / 2 - 40,
								y: window.innerHeight * 0.4,
								scale: 0.6,
								opacity: 0.9,
								rotateZ: 0
							}}
							exit={{
								scale: 1.5,
								opacity: 0,
								filter: 'brightness(2)'
							}}
							transition={{
								duration: 0.4,
								ease: [0.22, 1, 0.36, 1]
							}}
						>
							<div className="card-play-card">
								<div className="card-play-mana">{card.manaCost}</div>
								<div className="card-play-name">{card.name}</div>
								<div className="card-play-glow" style={{ boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}40` }} />
							</div>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>,
		document.body
	);
};
