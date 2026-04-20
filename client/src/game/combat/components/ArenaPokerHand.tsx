import React from 'react';
import { adaptCardInstance } from '../../utils/cards/cardInstanceAdapter';
import { PlayingCard } from './PlayingCard';

interface ArenaPokerHandProps {
  cards: any[];
  currentMana?: number;
  isPlayerTurn?: boolean;
  isOpponent?: boolean;
  onCardPlay?: (card: any, pos?: any) => void;
  isInteractionDisabled?: boolean;
}

/**
 * Component for rendering a player's or opponent's hand in the poker arena.
 */
export const ArenaPokerHand: React.FC<ArenaPokerHandProps> = ({ 
  cards, 
  isOpponent = false 
}) => {
  return (
    <div className={`zone-poker-cards ${isOpponent ? 'opponent-poker-hand' : 'player-poker-hand'}`}>
      {cards.map((card, idx) => {
        const adapted = adaptCardInstance(card);
        const isRevealed = isOpponent && (card.isRevealed || (card as any).revealed);
        
        return (
          <div key={adapted.instanceId || idx} className="poker-card-slot occupied">
            <PlayingCard 
              card={isRevealed || !isOpponent ? { 
                suit: (adapted.card as any).suit || 'spades', 
                value: (adapted.card as any).pokerValue || 'A',
                numericValue: (adapted.card as any).numericValue || 14
              } : { suit: 'spades', value: 'A', numericValue: 14 }} 
              faceDown={isOpponent && !isRevealed} 
            />
            {isRevealed && <div className="revealed-indicator">Revealed</div>}
          </div>
        );
      })}
    </div>
  );
};
