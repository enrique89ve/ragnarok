/**
 * Card component with click-to-play (drag removed)
 *
 * Renders a card in hand with hover preview and click-to-play.
 */
import { debug } from '../config/debugConfig';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CardInstance } from '../types';
import { Position } from '../types/Position';
import { CardInstanceWithCardData, isCardInstanceWithCardData } from '../types/interfaceExtensions';
import { playSound } from '../utils/soundUtils';
import { ACTIVE_CARD_RENDERER } from '../utils/cards/cardRenderingRegistry';
import { fixCardRenderingIssues } from '../utils/cardRenderingSystemFix';
import { getCardDataSafely } from '../utils/cards/cardInstanceAdapter';
import CardRenderer from './CardRendering/CardRenderer';
import './CardHoverEffects.css';

interface CardWithDragProps {
	card: CardInstance | CardInstanceWithCardData;
	isInHand: boolean;
	isPlayable: boolean;
	isHighlighted?: boolean;
	onClick?: () => void;
	onPlay?: (card: CardInstanceWithCardData, position?: Position) => void;
	onDragStart?: () => void;
	onDragEnd?: (wasDropped: boolean, position: Position) => void;
	onValidDrop?: (position: Position) => void;
	boardRef: React.RefObject<HTMLDivElement>;
	registerPosition: (card: CardInstance | CardInstanceWithCardData, position: Position) => void;
	className?: string;
	attackBuff?: number;
	healthBuff?: number;
}

const NOOP_HOVER = () => {};

export const CardWithDrag: React.FC<CardWithDragProps> = React.memo(({
	card,
	isInHand,
	isPlayable,
	onClick,
	onPlay,
	className = "",
	attackBuff = 0,
	healthBuff = 0
}) => {
	const cardRef = useRef<HTMLDivElement>(null);
	const [isHovering, setIsHovering] = useState(false);

	const hasCardProperty = isCardInstanceWithCardData(card);

	if (!card) {
		debug.error('CardWithDrag received null card data');
		return null;
	}

	const getStableCardId = (): string => {
		if ('instanceId' in card && card.instanceId) {
			return card.instanceId;
		}
		if (hasCardProperty && card.card?.id) {
			return `card-${card.card.id}`;
		}
		if ('id' in card && card.id) {
			return `card-${card.id}`;
		}
		const name = hasCardProperty ? card.card?.name : (card as any).name;
		const manaCost = hasCardProperty ? card.card?.manaCost : (card as any).manaCost;
		return `card-${name || 'unknown'}-${manaCost || 0}`;
	};
	const cardId = getStableCardId();

	useEffect(() => {
		fixCardRenderingIssues();
		if (cardRef?.current) {
			cardRef.current.setAttribute('data-card-component', 'CardWithDrag');
			cardRef.current.setAttribute('data-active-renderer', ACTIVE_CARD_RENDERER);
		}
	}, []);

	const processedCard = getCardDataSafely(card);

	const handleClick = useCallback(() => {
		if (!isPlayable) return;
		playSound('card_hover');
		if (onPlay && isCardInstanceWithCardData(card)) {
			onPlay(card);
		} else if (onClick) {
			onClick();
		}
	}, [onPlay, onClick, isPlayable, card]);

	return (
		<div
			ref={cardRef}
			className={`card-with-drag hand-card-flat ${className} ${isPlayable ? 'playable' : 'not-playable'} ${isHovering ? 'is-hovering' : ''} ${isInHand ? 'in-hand' : ''}`}
			onClick={handleClick}
			onMouseEnter={() => {
				setIsHovering(true);
				if (isPlayable) playSound('card_hover');
			}}
			onMouseLeave={() => setIsHovering(false)}
			data-card-id={processedCard.id || (hasCardProperty ? card.card?.id : undefined)}
			data-is-in-hand={isInHand ? 'true' : 'false'}
			data-is-playable={isPlayable ? 'true' : 'false'}
		>
			<CardRenderer
				card={processedCard}
				isInHand={isInHand}
				isPlayable={isPlayable}
				isHighlighted={isHovering}
				scale={1.0}
				onClick={handleClick}
				onHover={NOOP_HOVER}
				use3D={false}
				className="flat-card-container"
				renderQuality="high"
				cardId={cardId}
				attackBuff={attackBuff}
				healthBuff={healthBuff}
			/>
		</div>
	);
});

export default CardWithDrag;
