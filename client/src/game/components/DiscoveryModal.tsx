import React, { useState, useMemo } from 'react';
import { CardData, DiscoveryState, CardType, CardRarity, HeroClass } from '../types';
import SimpleCard, { SimpleCardData } from './SimpleCard';
import { createCardInstance } from '../utils/cards/cardUtils';
import { filterCards } from '../utils/discoveryUtils';
import { useAudio } from '../../lib/stores/useAudio';
import { debug } from '../config/debugConfig';
import { isMinion, isWeapon, getAttack, getHealth } from '../utils/cards/typeGuards';

interface DiscoveryModalProps {
  discoveryState: DiscoveryState;
  onCardSelect: (card: CardData | null) => void;
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({
  discoveryState,
  onCardSelect
}) => {
  const { playSoundEffect } = useAudio();
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  
  debug.log('[DiscoveryModal] Rendering with discoveryState:', discoveryState);
  debug.log('[DiscoveryModal] active:', discoveryState?.active, 'options:', discoveryState?.options?.length);
  
  // Guard against invalid discovery state - handle case where game is over
  // but discovery UI is attempting to render
  if (!discoveryState || !discoveryState.options || !discoveryState.active) {
    debug.error("DiscoveryModal: Invalid discovery state provided", discoveryState);
    // Auto-close the modal to avoid freezing the UI
    setTimeout(() => onCardSelect(null), 100);
    return null;
  }
  
  debug.log('[DiscoveryModal] Valid discovery state, rendering', discoveryState.options.length, 'options');
  
  // Initialize filters from discovery state
  const [cardType, setCardType] = useState<CardType | 'any'>(
    discoveryState.filters?.type || 'any'
  );
  const [cardRarity, setCardRarity] = useState<CardRarity | 'any'>(
    discoveryState.filters?.rarity || 'any'
  );
  const [manaCost, setManaCost] = useState<number | 'any'>(
    discoveryState.filters?.manaCost || 'any'
  );
  
  const filteredOptions = useMemo(() => {
    if (!discoveryState.allOptions) return discoveryState.options;
    const filtered = filterCards(discoveryState.allOptions, {
      type: cardType,
      rarity: cardRarity,
      manaCost: manaCost
    });
    return filtered.length > 0 ? filtered : discoveryState.options;
  }, [cardType, cardRarity, manaCost, discoveryState.allOptions, discoveryState.options]);
  
  const handleCardClick = (card: CardData) => {
    if (selectedCard) return;
    debug.log("DiscoveryModal: Card selected:", card.name);
    playSoundEffect('spell_cast');
    setSelectedCard(card);
    setTimeout(() => {
      onCardSelect(card);
    }, 900);
  };
  
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCardType(e.target.value as CardType | 'any');
  };
  
  const handleRarityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCardRarity(e.target.value as CardRarity | 'any');
  };
  
  const handleManaCostChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setManaCost(value === 'any' ? 'any' : parseInt(value));
  };
  
  const resetFilters = () => {
    setCardType('any');
    setCardRarity('any');
    setManaCost('any');
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-cinematic"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)'
      }}
    >
      {selectedCard && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10001,
            textAlign: 'center',
            animation: 'discoveryConfirmFadeIn 0.3s ease-out'
          }}
        >
          <div style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#fbbf24',
            textShadow: '0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4)',
            marginBottom: '0.5rem'
          }}>
            Card Added to Hand!
          </div>
          <div style={{ fontSize: '1.2rem', color: '#d1d5db' }}>
            {selectedCard.name}
          </div>
        </div>
      )}
      <div 
        className="bg-gray-800 p-6 rounded-xl max-w-4xl w-full"
        style={{ 
          boxShadow: '0 0 40px rgba(251, 191, 36, 0.3), 0 0 80px rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          opacity: selectedCard ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }}
      >
        <div className="text-center mb-6">
          <h2 
            className="text-3xl font-bold"
            style={{ 
              color: '#fbbf24',
              textShadow: '0 0 10px rgba(251, 191, 36, 0.6), 0 0 20px rgba(251, 191, 36, 0.3)'
            }}
          >
            Foresee a Card
          </h2>
          <p className="text-gray-300 mt-2">Choose one of these cards to add to your hand</p>
        </div>
        
        {/* Filter controls */}
        <div className="flex flex-wrap justify-center gap-4 mb-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex flex-col">
            <label className="text-gray-300 mb-1 text-sm">Card Type</label>
            <select 
              value={cardType} 
              onChange={handleTypeChange}
              className="bg-gray-800 text-white p-2 rounded border border-gray-600 min-w-[120px]"
            >
              <option value="any">Any Type</option>
              <option value="minion">Minion</option>
              <option value="spell">Spell</option>
              <option value="weapon">Weapon</option>
              <option value="secret">Rune</option>
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="text-gray-300 mb-1 text-sm">Rarity</label>
            <select 
              value={cardRarity} 
              onChange={handleRarityChange}
              className="bg-gray-800 text-white p-2 rounded border border-gray-600 min-w-[120px]"
            >
              <option value="any">Any Rarity</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="mythic">Mythic</option>
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="text-gray-300 mb-1 text-sm">Mana Cost</label>
            <select 
              value={manaCost === 'any' ? 'any' : manaCost.toString()} 
              onChange={handleManaCostChange}
              className="bg-gray-800 text-white p-2 rounded border border-gray-600 min-w-[120px]"
            >
              <option value="any">Any Cost</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cost) => (
                <option key={cost} value={cost.toString()}>{cost} Mana</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button 
              onClick={resetFilters}
              className="bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded"
            >
              Reset Filters
            </button>
          </div>
        </div>
        
        {/* Display number of results */}
        <div className="text-center mb-4 text-gray-300">
          <p>
            {filteredOptions.length} {filteredOptions.length === 1 ? 'card' : 'cards'} found
            {filteredOptions.length === 0 && (
              <span className="block text-yellow-500 mt-1">
                No cards match your filters. Try different criteria.
              </span>
            )}
          </p>
        </div>
        
        {/* Card options */}
        <div className="flex flex-wrap justify-center gap-6 my-8">
          {filteredOptions.map((card) => {
            const cardInstance = createCardInstance({
              ...card,
              id: card.id
            });
            
            const cardAttack = isMinion(card) || isWeapon(card) ? (card as any).attack : null;
            const cardHealth = isMinion(card) ? (card as any).health : isWeapon(card) ? (card as any).durability : null;
            
            return (
              <div 
                key={card.id} 
                className="transition-all duration-200 cursor-pointer"
                style={{ 
                  position: 'relative',
                  transform: selectedCard?.id === card.id ? 'scale(1.15)' : 'scale(1)',
                  filter: selectedCard && selectedCard.id !== card.id ? 'brightness(0.4)' : 'none',
                  transition: 'transform 0.2s ease, filter 0.3s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!selectedCard) {
                    e.currentTarget.style.transform = 'scale(1.1) translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(251, 191, 36, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedCard) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <SimpleCard
                  card={{
                    id: card.id, name: card.name, manaCost: card.manaCost ?? 0,
                    attack: isMinion(card) ? getAttack(card) : isWeapon(card) ? getAttack(card) : undefined,
                    health: isMinion(card) ? getHealth(card) : undefined,
                    description: card.description,
                    type: (card.type ?? 'minion') as SimpleCardData['type'],
                    rarity: card.rarity as SimpleCardData['rarity'],
                    keywords: card.keywords,
                  }}
                  isPlayable
                  onClick={() => {
                    debug.log("DiscoveryModal: Card selected:", card.name);
                    handleCardClick(card);
                  }}
                  size="medium"
                />
                
                <div className="mt-2 text-center" style={{ minWidth: '140px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {card.manaCost ?? 0} Mana
                    </span>
                    {cardAttack !== null && (
                      <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {cardAttack} Atk
                      </span>
                    )}
                    {cardHealth !== null && (
                      <span style={{ color: '#f87171', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {cardHealth} HP
                      </span>
                    )}
                  </div>
                  {card.description && (
                    <p style={{ 
                      color: '#9ca3af', 
                      fontSize: '0.75rem', 
                      lineHeight: '1.1',
                      maxWidth: '150px',
                      margin: '0 auto 6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {card.description}
                    </p>
                  )}
                  <button 
                    className="px-4 py-2 text-white rounded-md transition-colors"
                    style={{
                      background: 'linear-gradient(135deg, #d97706, #b45309)',
                      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #d97706, #b45309)'; }}
                    onClick={(e) => {
                      e.stopPropagation();
                      debug.log("DiscoveryModal: Card selected via button:", card.name);
                      handleCardClick(card);
                    }}
                  >
                    Select
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 text-center">
          <button 
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            onClick={() => {
              playSoundEffect('error');
              onCardSelect(null);
            }}
          >
            Skip
          </button>
        </div>
      </div>
      <style>{`
        @keyframes discoveryConfirmFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};