import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './CardDrawAnimation.css';

interface DrawingCard {
	id: string;
	startTime: number;
}

interface CardDrawAnimationProps {
	drawCount: number;
	deckPosition?: { x: number; y: number };
}

export const CardDrawAnimation: React.FC<CardDrawAnimationProps> = ({ drawCount, deckPosition }) => {
	const [drawingCards, setDrawingCards] = useState<DrawingCard[]>([]);

	useEffect(() => {
		if (drawCount <= 0) return;
		const newCard: DrawingCard = {
			id: `draw-${Date.now()}-${Math.random()}`,
			startTime: Date.now()
		};
		setDrawingCards(prev => [...prev, newCard]);

		const timer = setTimeout(() => {
			setDrawingCards(prev => prev.filter(c => c.id !== newCard.id));
		}, 700);

		return () => clearTimeout(timer);
	}, [drawCount]);

	const deckX = deckPosition?.x ?? window.innerWidth - 100;
	const deckY = deckPosition?.y ?? window.innerHeight * 0.3;

	const handX = window.innerWidth / 2;
	const handY = window.innerHeight - 80;

	return createPortal(
		<AnimatePresence>
			{drawingCards.map(card => (
				<motion.div
					key={card.id}
					className="card-draw-flying"
					initial={{
						x: deckX,
						y: deckY,
						scale: 0.3,
						rotateY: 180,
						rotateZ: -15,
						opacity: 0.8
					}}
					animate={{
						x: handX,
						y: handY,
						scale: 0.7,
						rotateY: 0,
						rotateZ: 0,
						opacity: 1
					}}
					exit={{
						opacity: 0,
						scale: 0.5
					}}
					transition={{
						duration: 0.55,
						ease: [0.22, 1, 0.36, 1],
						rotateY: { duration: 0.4, delay: 0.1 }
					}}
				>
					<div className="card-draw-inner">
						<div className="card-draw-back">
							<div className="card-back-pattern" />
							<div className="card-back-symbol">{'\u16B1'}</div>
						</div>
						<div className="card-draw-front">
							<div className="card-draw-glow" />
						</div>
					</div>
				</motion.div>
			))}
		</AnimatePresence>,
		document.body
	);
};

export default CardDrawAnimation;
