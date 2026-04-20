import React from 'react';
import { CardData, CardInstance } from '../types';
import { isMinion } from '../utils/cards/typeGuards';

interface CardDetailViewProps {
  card: CardInstance | CardData;
  onClose: () => void;
}

export const CardDetailView: React.FC<CardDetailViewProps> = ({ card, onClose }) => {
  const cardData = 'card' in card ? card.card : card;
  
  // Get card border color based on rarity
  const getCardBorderColor = () => {
    switch (cardData.rarity) {
      case 'mythic':
        return 'border-yellow-400';
      case 'epic':
        return 'border-purple-500';
      case 'rare':
        return 'border-blue-500';
      default:
        return 'border-gray-300';
    }
  };
  
  // Get card background color based on rarity
  const getCardBackgroundColor = () => {
    switch (cardData.rarity) {
      case 'mythic':
        return 'from-yellow-900 to-amber-700';
      case 'epic':
        return 'from-purple-900 to-purple-700';
      case 'rare':
        return 'from-blue-900 to-blue-700';
      default:
        return 'from-gray-800 to-gray-700';
    }
  };
  
  // For keywords, map them to nice display formats with icons
  const renderKeywords = (keywords: string[] | undefined) => {
    if (!keywords || keywords.length === 0) return null;
    
    // Map of keywords to their icon and description
    const keywordInfo: {[key: string]: {icon: string, desc: string}} = {
      'battlecry': { icon: '⚡', desc: 'Effect triggers when played from hand' },
      'deathrattle': { icon: '💀', desc: 'Effect triggers when this minion dies' },
      'taunt': { icon: '🛡️', desc: 'Enemies must attack this minion first' },
      'divine_shield': { icon: '✨', desc: 'The first time this minion takes damage, ignore it' },
      'rush': { icon: '💨', desc: 'Can attack minions the turn it\'s played' },
      'charge': { icon: '⚡', desc: 'Can attack immediately' },
      'windfury': { icon: '🌪️', desc: 'Can attack twice per turn' },
      'discover': { icon: '🔍', desc: 'Choose one of three random cards' },
      'lifesteal': { icon: '💚', desc: 'Damage dealt by this card heals your hero' },
      'poisonous': { icon: '☠️', desc: 'Destroys any minion damaged by this' },
      'stealth': { icon: '👁️', desc: 'Can\'t be targeted until it attacks' },
      'magnetic': { icon: '🧲', desc: 'Runic Bond — attaches to a friendly Automaton to combine stats' },
      'echo': { icon: '🔄', desc: 'Can be played multiple times on the same turn' },
      'overkill': { icon: '🔪', desc: 'Triggers an effect when this deals excess damage' },
      'reborn': { icon: '🔄', desc: 'Returns to life with 1 health the first time it dies' }
    };
    
    return (
      <div className="mt-4">
        <h4 className="text-white text-sm font-bold mb-2">Keywords:</h4>
        <div className="space-y-2">
          {keywords.map((keyword, index) => {
            const info = keywordInfo[keyword.toLowerCase()] || { icon: '•', desc: keyword };
            return (
              <div key={index} className="flex items-center bg-black bg-opacity-30 rounded p-2">
                <span className="mr-2 text-xl">{info.icon}</span>
                <div>
                  <div className="text-yellow-300 font-bold">{keyword}</div>
                  <div className="text-xs text-gray-300">{info.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75">
      <div className="max-w-2xl w-full bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
        <div className="p-4 flex justify-between border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{cardData.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 flex flex-col md:flex-row">
          <div className="flex-shrink-0 w-full md:w-64 mb-6 md:mb-0">
            <div className={`${getCardBorderColor()} border-4 rounded-lg overflow-hidden bg-gradient-to-b ${getCardBackgroundColor()} p-4 flex flex-col h-80`}>
              <div className="text-center text-white font-bold text-xl mb-2">{cardData.name}</div>
              <div className="bg-black bg-opacity-30 text-white p-3 rounded mb-auto">
                <p>{cardData.description || "No description available."}</p>
              </div>
              <div className="flex justify-between items-center mt-2">
                {cardData.type === 'minion' && (
                  <>
                    <div className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-full text-white font-bold">
                      {cardData.attack || 0}
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-full text-white font-bold">
                      {cardData.health || 0}
                    </div>
                  </>
                )}
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full text-white font-bold ml-auto">
                  {cardData.manaCost}
                </div>
              </div>
            </div>
          </div>
          
          {/* Card details */}
          <div className="md:ml-6 flex-grow">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-gray-400 text-sm">Type</h3>
                  <p className="text-white font-semibold">{cardData.type}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm">Rarity</h3>
                  <p className="text-white font-semibold">{cardData.rarity}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm">Mana Cost</h3>
                  <p className="text-white font-semibold">{cardData.manaCost}</p>
                </div>
                {cardData.type === 'minion' && (
                  <>
                    <div>
                      <h3 className="text-gray-400 text-sm">Attack</h3>
                      <p className="text-white font-semibold">{cardData.attack || 0}</p>
                    </div>
                    <div>
                      <h3 className="text-gray-400 text-sm">Health</h3>
                      <p className="text-white font-semibold">{cardData.health || 0}</p>
                    </div>
                  </>
                )}
                {isMinion(cardData) && cardData.race && (
                  <div>
                    <h3 className="text-gray-400 text-sm">Tribe</h3>
                    <p className="text-white font-semibold">{cardData.race}</p>
                  </div>
                )}
                {cardData.class && (
                  <div>
                    <h3 className="text-gray-400 text-sm">Class</h3>
                    <p className="text-white font-semibold">{cardData.class}</p>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <h3 className="text-gray-400 text-sm mb-1">Description</h3>
                <div className="bg-gray-900 p-3 rounded text-white">
                  {cardData.description || "No description available."}
                </div>
              </div>
              
              {/* Keywords section */}
              {renderKeywords(cardData.keywords)}
              
              {/* Flavor text */}
              {cardData.flavorText && (
                <div className="mt-4">
                  <h3 className="text-gray-400 text-sm mb-1">Flavor Text</h3>
                  <div className="bg-gray-900 p-3 rounded text-gray-300 italic">
                    {cardData.flavorText}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetailView;