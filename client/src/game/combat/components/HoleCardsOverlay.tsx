import React, { useState } from 'react';
import { PokerCard } from '../../types/PokerCombatTypes';
import {
	PokerCardFrame,
	CardRankSuit,
	CardCardBack,
} from '../../components/card';

interface HoleCard extends PokerCard {
	isRevealed?: boolean;
}

interface HoleCardsOverlayProps {
	cards: PokerCard[];
	variant: 'player' | 'opponent';
	faceDown?: boolean;
	winningCards?: PokerCard[];
	isShowdown?: boolean;
	activeTurn?: boolean;
}

const FACE_DOWN_PLACEHOLDERS: HoleCard[] = [
	{ suit: 'spades', value: 'A', numericValue: 14 },
	{ suit: 'spades', value: 'A', numericValue: 14 },
];

const isWinningHoleCard = (card: HoleCard, winningCards?: PokerCard[]): boolean => {
	if (!winningCards) return false;
	return winningCards.some((wc) => wc.suit === card.suit && wc.value === card.value);
};

const isHoleCardFaceDown = (
	card: HoleCard,
	args: { hasCards: boolean; faceDown: boolean; isShowdown: boolean },
): boolean => {
	if (!args.hasCards) return true;
	if (card.isRevealed) return false;
	if (!args.faceDown) return false;
	return !args.isShowdown;
};

const holeSlotClassName = (args: {
	isFirst: boolean;
	isWinning: boolean;
	isPressed: boolean;
}): string => [
	'hole-card-slot',
	args.isFirst ? 'hole-card-slot--first' : 'hole-card-slot--second',
	args.isWinning ? 'winning-card-glow celebration' : '',
	args.isPressed ? 'hole-card-slot--pressed' : '',
].filter(Boolean).join(' ');

const HoleCardFace: React.FC<{ card: HoleCard; isFaceDown: boolean }> = ({
	card,
	isFaceDown,
}) => (
	<PokerCardFrame size="small" variant={isFaceDown ? 'face-down' : 'face-up'}>
		{isFaceDown
			? <CardCardBack />
			: <CardRankSuit suit={card.suit} value={card.value} />}
	</PokerCardFrame>
);

export const HoleCardsOverlay: React.FC<HoleCardsOverlayProps> = ({
	cards,
	variant,
	faceDown = false,
	winningCards,
	isShowdown = false,
	activeTurn = false,
}) => {
	const isOpponent = variant === 'opponent';
	const hasCards = cards.length > 0;
	const displayCards: HoleCard[] = hasCards ? cards : FACE_DOWN_PLACEHOLDERS;
	const [pressedIndex, setPressedIndex] = useState<number | null>(null);
	const canInspect = !isOpponent;

	const releaseInspect = () => setPressedIndex(null);

	const renderSlot = (card: HoleCard, idx: number) => {
		const isFaceDown = isHoleCardFaceDown(card, { hasCards, faceDown, isShowdown });
		const slotClassName = holeSlotClassName({
			isFirst: idx === 0,
			isWinning: isWinningHoleCard(card, winningCards),
			isPressed: pressedIndex === idx,
		});
		const slotProps = {
			className: slotClassName,
			'data-hole-slot': idx,
			'data-face': isFaceDown ? 'down' : 'up',
		} as const;
		const face = <HoleCardFace card={card} isFaceDown={isFaceDown} />;

		if (!canInspect || isFaceDown) {
			return (
				<div key={`${variant}-hole-${idx}`} {...slotProps}>
					{face}
				</div>
			);
		}

		return (
			<button
				key={`${variant}-hole-${idx}`}
				type="button"
				{...slotProps}
				aria-label={`${pressedIndex === idx ? 'Release' : 'Hold to inspect'} poker card ${card.value} of ${card.suit}`}
				aria-pressed={pressedIndex === idx}
				onPointerDown={(event) => {
					event.stopPropagation();
					event.currentTarget.setPointerCapture(event.pointerId);
					setPressedIndex(idx);
				}}
				onPointerUp={(event) => {
					event.stopPropagation();
					releaseInspect();
				}}
				onPointerCancel={releaseInspect}
				onLostPointerCapture={releaseInspect}
				onBlur={releaseInspect}
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
					releaseInspect();
				}}
				onClick={(event) => {
					event.stopPropagation();
				}}
			>
				{face}
			</button>
		);
	};

	return (
		<div
			className={[
				`hero-pocket-cards hero-pocket-cards--${variant}`,
				pressedIndex !== null ? 'is-pressing' : '',
				activeTurn ? 'hole-cards-active-turn' : '',
			].filter(Boolean).join(' ')}
			role="group"
			data-hole-owner={variant}
			aria-label={isOpponent ? 'Opponent hole cards' : 'Your hole cards'}
		>
			{displayCards.map(renderSlot)}
		</div>
	);
};

export default HoleCardsOverlay;
