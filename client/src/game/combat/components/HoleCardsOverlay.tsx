import React, { useState } from 'react';
import { PokerCard } from '../../types/PokerCombatTypes';
import {
	PokerCardFrame,
	CardRankSuit,
	CardCardBack,
} from '../../components/card';
import type { NorseSuit } from '../../utils/cards/norsePokerCard';

interface HoleCardsOverlayProps {
	cards: PokerCard[];
	variant: 'player' | 'opponent';
	faceDown?: boolean;
	winningCards?: PokerCard[];
	isShowdown?: boolean;
	activeTurn?: boolean;
	positionAbsolute?: boolean;
	embedded?: boolean;
}

const FACE_DOWN_CARD: PokerCard = {
	suit: 'spades',
	value: 'A',
	numericValue: 14
};

const isCardInWinningHand = (card: PokerCard, winningCards?: PokerCard[]): boolean => {
	if (!winningCards) return false;
	return winningCards.some(wc => wc.suit === card.suit && wc.value === card.value);
};

const cardIsRevealed = (card: PokerCard): boolean => Boolean((card as { isRevealed?: boolean }).isRevealed);

export const HoleCardsOverlay: React.FC<HoleCardsOverlayProps> = ({
	cards,
	variant,
	faceDown = false,
	winningCards,
	isShowdown = false,
	activeTurn = false,
	positionAbsolute = true,
	embedded = false,
}) => {
	const isOpponent = variant === 'opponent';
	const displayCards = cards.length > 0 ? cards : [FACE_DOWN_CARD, FACE_DOWN_CARD];
	const [pressedIndex, setPressedIndex] = useState<number | null>(null);
	const canInspect = embedded && !isOpponent;

	const renderCards = () => displayCards.map((card, idx) => {
		const isWinning = isCardInWinningHand(card, winningCards);
		const isFirst = idx === 0;
		const isFaceDown = faceDown && (!isShowdown || cards.length === 0) && !cardIsRevealed(card);
		const isInspectable = canInspect && !isFaceDown;
		const isPressed = pressedIndex === idx;
		const slotClassName = [
			'hole-card-slot',
			isFirst ? 'hole-card-slot--first' : 'hole-card-slot--second',
			isWinning ? 'winning-card-glow celebration' : '',
			isPressed ? 'hole-card-slot--pressed' : '',
		].filter(Boolean).join(' ');
		const cardFrame = (
			<PokerCardFrame
				size="small"
				variant={isFaceDown ? 'face-down' : 'face-up'}
			>
				{isFaceDown
					? <CardCardBack />
					: <CardRankSuit suit={card.suit as NorseSuit} value={card.value} />}
			</PokerCardFrame>
		);

		if (!isInspectable) {
			return (
				<div key={`${variant}-hole-${idx}`} className={slotClassName}>
					{cardFrame}
				</div>
			);
		}

		return (
			<button
				key={`${variant}-hole-${idx}`}
				type="button"
				className={slotClassName}
				aria-label={`${isPressed ? 'Release' : 'Hold to inspect'} poker card ${card.value} of ${card.suit}`}
				aria-pressed={isPressed}
				onPointerDown={(event) => {
					event.stopPropagation();
					event.currentTarget.setPointerCapture(event.pointerId);
					setPressedIndex(idx);
				}}
				onPointerUp={(event) => {
					event.stopPropagation();
					setPressedIndex(null);
				}}
				onPointerCancel={() => setPressedIndex(null)}
				onLostPointerCapture={() => setPressedIndex(null)}
				onBlur={() => setPressedIndex(null)}
				onKeyDown={(event) => {
					if (event.key !== 'Enter' && event.key !== ' ') return;
					event.preventDefault();
					event.stopPropagation();
					setPressedIndex(idx);
				}}
				onKeyUp={(event) => {
					if (event.key !== 'Enter' && event.key !== ' ') return;
					event.preventDefault();
					event.stopPropagation();
					setPressedIndex(null);
				}}
				onClick={(event) => {
					event.stopPropagation();
				}}
			>
				{cardFrame}
			</button>
		);
	});

	if (embedded) {
		return (
			<div
				className={[
					`hero-pocket-cards hero-pocket-cards--${variant}`,
					pressedIndex !== null ? 'is-pressing' : '',
					activeTurn ? 'hole-cards-active-turn' : '',
				].filter(Boolean).join(' ')}
			>
				{renderCards()}
			</div>
		);
	}

	const positionClass = isOpponent ? 'top-full' : 'top-0';

	if (!positionAbsolute) {
		return (
			<div
				className={[
					'flex flex-row items-center justify-center pointer-events-none z-10 gap-1',
					`hole-cards--${variant}`,
					activeTurn ? 'hole-cards-active-turn' : '',
				].filter(Boolean).join(' ')}
				style={{ transform: 'scale(var(--zone-poker-card-scale, 1))' }}
			>
				{renderCards()}
			</div>
		);
	}

	return (
		<div
			className={[
				'absolute left-1/2 -translate-x-1/2 flex flex-row items-center justify-center pointer-events-none z-0 gap-1',
				`hole-cards--${variant}`,
				positionClass,
				activeTurn ? 'hole-cards-active-turn' : '',
			].filter(Boolean).join(' ')}
			style={{
				marginTop: isOpponent ? 'var(--zone-hole-cards-opponent-offset, -80px)' : undefined,
				transform: isOpponent
					? 'translateX(-50%) scale(var(--zone-poker-card-scale, 1))'
					: 'translate(-50%, -50%) scale(var(--zone-poker-card-scale, 1))',
			}}
		>
			{renderCards()}
		</div>
	);
};

export default HoleCardsOverlay;
