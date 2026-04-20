import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardData } from '../types';
// Import from canonical cardRegistry (migrated from data/cards.ts)
import { fullCardDatabase } from '../data/cardRegistry';
import { isMinion, getAttack, getHealth } from '../utils/cards/typeGuards';

interface DeckListProps {
  cards: { [cardId: number]: number };
  onRemoveCard: (cardId: number) => void;
  availableCards: CardData[];
  currentDeckSize: number;
}

/**
 * DeckList component - Displays the current deck
 * with mana curve sorted cards, hover effects, and card removal
 */
const DeckList: React.FC<DeckListProps> = ({
  cards,
  onRemoveCard,
  availableCards,
  currentDeckSize
}) => {
  // Construct a sorted array of cards in the deck
  const deckCards = useMemo(() => {
    const result: { card: CardData; count: number }[] = [];
    
    // Convert card IDs to card data
    Object.entries(cards).forEach(([cardId, count]) => {
      const card = availableCards.find(c => c.id === parseInt(cardId));
      if (card) {
        result.push({ card, count });
      }
    });
    
    // Sort by mana cost, then by name
    result.sort((a, b) => {
      const aCost = a.card.manaCost ?? 0;
      const bCost = b.card.manaCost ?? 0;
      if (aCost !== bCost) {
        return aCost - bCost;
      }
      return a.card.name.localeCompare(b.card.name);
    });
    
    return result;
  }, [cards, availableCards]);
  
  // Group cards by mana cost for sorted display
  const cardsByMana = useMemo(() => {
    const result: { [key: number]: { card: CardData; count: number }[] } = {};
    
    deckCards.forEach(item => {
      const cardCost = item.card.manaCost ?? 0;
      const manaCost = cardCost >= 7 ? 7 : cardCost; // Group 7+ together
      if (!result[manaCost]) result[manaCost] = [];
      result[manaCost].push(item);
    });
    
    return result;
  }, [deckCards]);
  
  return (
    <div className="deck-list flex-1 overflow-y-auto p-4">
      {/* Deck is empty state */}
      {currentDeckSize === 0 && (
        <div className="text-center text-gray-500 py-12 flex flex-col items-center">
          <div className="empty-deck-icon mb-4 w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-bold text-lg">Your deck is empty</p>
          <p className="text-sm mt-2">Click on cards from your collection to add them to your deck</p>
        </div>
      )}
      
      {/* Group cards by mana cost */}
      {Object.entries(cardsByMana).map(([manaCost, cards]) => (
        <div key={manaCost} className="mana-group mb-4">
          <div className="mana-cost-header flex items-center mb-2">
            <div className="mana-crystal w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md mr-2">
              {manaCost === '7' ? '7+' : manaCost}
            </div>
            <div className="text-sm font-medium">
              {cards.length} card{cards.length > 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="mana-cards space-y-1">
            {cards.map(({ card, count }) => (
              <motion.div
                key={card.id}
                className="deck-card flex justify-between items-center py-2 px-3 rounded-md hover:bg-gray-100 cursor-pointer"
                whileHover={{ scale: 1.02 }}
                onClick={() => onRemoveCard(typeof card.id === 'number' ? card.id : parseInt(card.id.toString(), 10))}
              >
                <div className="flex items-center gap-2">
                  {/* Mana cost crystal for each card */}
                  <div className="mana-cost w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                    {card.manaCost}
                  </div>
                  
                  {/* Card name with rarity color */}
                  <div 
                    className="card-name font-medium"
                    style={{ color: getRarityColor(card.rarity ?? 'common') }}
                  >
                    {card.name}
                  </div>
                  
                  {/* Attack and Health stats using type guards */}
                  {isMinion(card) && (
                    <div className="card-stats flex gap-1 ml-2">
                      {getAttack(card) > 0 && (
                        <span className="stat-value text-red-600 font-bold text-sm">
                          ⚔️{getAttack(card)}
                        </span>
                      )}
                      {getHealth(card) > 0 && (
                        <span className="stat-value text-green-600 font-bold text-sm">
                          ❤️{getHealth(card)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Card count */}
                <div className="card-count flex">
                  {count === 2 ? (
                    <div className="flex -space-x-2">
                      <div className="w-5 h-5 rounded-full bg-yellow-400 border border-yellow-600 flex items-center justify-center text-xs font-bold text-yellow-800">1</div>
                      <div className="w-5 h-5 rounded-full bg-yellow-400 border border-yellow-600 flex items-center justify-center text-xs font-bold text-yellow-800">2</div>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-yellow-400 border border-yellow-600 flex items-center justify-center text-xs font-bold text-yellow-800">1</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper function to get color based on card rarity
function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return '#000000';
    case 'rare': return '#0070DD';
    case 'epic': return '#A335EE';
    case 'mythic': return '#FF8000';
    default: return '#000000';
  }
}

export default DeckList;