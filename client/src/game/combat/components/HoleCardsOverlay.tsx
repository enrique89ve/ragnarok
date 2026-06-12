import React from 'react';
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

	const renderCards = () => displayCards.map((card, idx) => {
		const isWinning = isCardInWinningHand(card, winningCards);
		const isFirst = idx === 0;
		const isFaceDown = faceDown && (!isShowdown || cards.length === 0) && !cardIsRevealed(card);

		return (
			<div
				key={`${variant}-hole-${idx}`}
				className={[
					'hole-card-slot',
					isFirst ? 'rotate-[-8deg]' : 'rotate-[8deg] -ml-3.75',
					isWinning ? 'winning-card-glow celebration' : '',
				].filter(Boolean).join(' ')}
				style={{ background: 'transparent', border: 'none' }}
			>
				<PokerCardFrame
					size="medium"
					variant={isFaceDown ? 'face-down' : 'face-up'}
				>
					{isFaceDown
						? <CardCardBack />
						: <CardRankSuit suit={card.suit as NorseSuit} value={card.value} />}
				</PokerCardFrame>
			</div>
		);
	});

	if (embedded) {
		return (
			<div
				className={[
					`hero-pocket-cards hero-pocket-cards--${variant}`,
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
