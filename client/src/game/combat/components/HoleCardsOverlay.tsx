import React from 'react';
import { PokerCard } from '../../types/PokerCombatTypes';
import { PlayingCard } from './PlayingCard';

interface HoleCardsOverlayProps {
  cards: PokerCard[];
  variant: 'player' | 'opponent';
  faceDown?: boolean;
  winningCards?: PokerCard[];
  isShowdown?: boolean;
  activeTurn?: boolean;
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

export const HoleCardsOverlay: React.FC<HoleCardsOverlayProps> = ({
  cards,
  variant,
  faceDown = false,
  winningCards,
  isShowdown = false,
  activeTurn = false
}) => {
  const isOpponent = variant === 'opponent';
  const displayCards = cards.length > 0 ? cards : [FACE_DOWN_CARD, FACE_DOWN_CARD];

  const positionClass = isOpponent
    ? 'top-full'
    : 'bottom-full';

  return (
    <div
      className={`
        absolute left-1/2 -translate-x-1/2
        flex flex-row items-center justify-center
        pointer-events-none z-[0] gap-1
        ${positionClass}
        ${activeTurn ? 'hole-cards-active-turn' : ''}
      `}
      style={{
        [isOpponent ? 'marginTop' : 'marginBottom']: isOpponent
          ? 'var(--zone-hole-cards-opponent-offset, -80px)'
          : 'var(--zone-hole-cards-player-offset, -50px)',
        transform: `translateX(-50%) scale(var(--zone-poker-card-scale, 1))`,
      }}
    >
      {displayCards.map((card, idx) => {
        const isWinning = isCardInWinningHand(card, winningCards);
        const isFirst = idx === 0;

        return (
          <div
            key={`${variant}-hole-${idx}`}
            className={`
              hole-card-slot
              ${isFirst ? '-rotate-[8deg]' : 'rotate-[8deg] -ml-[15px]'}
              ${isWinning ? 'winning-card-glow celebration' : ''}
            `}
            style={{
              background: 'transparent',
              border: 'none'
            }}
          >
            <PlayingCard
              card={card}
              faceDown={faceDown && (!isShowdown || cards.length === 0) && !(card as any).isRevealed}
              large={false}
            />
          </div>
        );
      })}
    </div>
  );
};

export default HoleCardsOverlay;
