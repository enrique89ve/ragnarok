import { debug } from '../../config/debugConfig';
import React, { useState, useEffect } from 'react';
import { initializeGame, playCard, endTurn } from '../../utils/gameUtils';
import { CardInstance, CardRarity } from '../../types';
import { useAudio } from '../../../lib/stores/useAudio';
import HexagonBadge from '../../../components/HexagonBadge';
import { showStatus } from '../ui/GameStatusBanner';
import { getAttack, getHealth } from '../../utils/cards/typeGuards';

// Function to get rarity color
const getRarityColor = (rarity: CardRarity | undefined) => {
  switch (rarity) {
    case 'basic': return 'bg-gray-200';
    case 'common': return 'bg-gray-100';
    case 'rare': return 'bg-blue-400';
    case 'epic': return 'bg-purple-500';
    case 'mythic': return 'bg-orange-400';
    default: return 'bg-gray-100';
  }
};

// Card component
const Card = ({ 
  card, 
  canPlay, 
  onClick, 
  isBattlefield = false 
}: { 
  card: CardInstance; 
  canPlay?: boolean; 
  onClick?: () => void;
  isBattlefield?: boolean;
}) => {
  const rarityColor = getRarityColor(card.card.rarity);
  const health = isBattlefield ? card.currentHealth : getHealth(card.card);
  
  return (
    <div 
      className={`relative rounded-lg overflow-hidden shadow-lg transform transition-transform duration-200 
        ${canPlay === false ? 'opacity-60' : ''} 
        ${canPlay ? 'hover:scale-105 cursor-pointer' : ''}`}
      onClick={canPlay ? onClick : undefined}
      style={{ width: '180px', height: isBattlefield ? '210px' : '280px' }}
    >
      {/* Card Frame */}
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-800 to-gray-900 border-4 border-gray-700 rounded-lg">
        {/* Card Cost */}
        <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md z-10">
          {card.card.manaCost}
        </div>
        
        {/* Card Art */}
        <div className={`h-24 ${rarityColor} flex items-center justify-center`}>
          <span className="text-4xl">{card.card.name.charAt(0)}</span>
        </div>
        
        {/* Card Name */}
        <div className="px-3 py-2 bg-gradient-to-r from-gray-700 to-gray-800">
          <h3 className="font-bold text-white truncate">{card.card.name}</h3>
        </div>
        
        {/* Card Description */}
        <div className="px-3 py-2 flex-grow bg-gray-800">
          <p className="text-xs text-gray-300 italic">{card.card.description}</p>
        </div>
        
        {/* Card Stats */}
        <div className="px-3 py-2 bg-gray-900 flex justify-between relative">
          {/* Attack Value Badge - Using HexagonBadge for consistent styling */}
          <HexagonBadge 
            value={getAttack(card.card) ?? 0} 
            color="#f8b700" 
            position="left" 
            size={28} 
            style={{ position: 'relative' }} 
          />
          
          {/* Health Value Badge - Using HexagonBadge for consistent styling */}
          <HexagonBadge 
            value={health ?? 0} 
            color="#e61610" 
            position="right" 
            size={28}
            style={{ position: 'relative' }} 
          />
        </div>
        
        {/* Play Button (only for hand cards) */}
        {!isBattlefield && (
          <div className="px-3 py-2 bg-gray-900">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onClick && canPlay) onClick();
              }}
              className={`w-full py-1 font-bold rounded-md ${
                canPlay 
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!canPlay}
            >
              {canPlay ? 'PLAY' : `NEED ${card.card.manaCost} MANA`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const SimpleGame = () => {
  const [gameState, setGameState] = useState(initializeGame());
  const { players, currentTurn, turnNumber } = gameState;
  const audioState = useAudio();
  const playHit = () => audioState.playSoundEffect?.('attack');
  const playSuccess = () => audioState.playSoundEffect?.('victory');
  const backgroundMusic = audioState.currentMusic;
  
  // Start background music
  useEffect(() => {
    if (backgroundMusic) {
      backgroundMusic.play();
    }
    
    return () => {
      if (backgroundMusic) {
        backgroundMusic.stop();
      }
    };
  }, [backgroundMusic]);
  
  // Helper function to play a card simply
  const playCardSimple = (card: CardInstance) => {
    if (currentTurn !== 'player') {
      showStatus('Not your turn!', 'error');
      return;
    }

    if ((card.card.manaCost ?? 0) > players.player.mana.current) {
      showStatus(`Need ${card.card.manaCost} mana, have ${players.player.mana.current}`, 'error');
      return;
    }

    try {
      const newState = playCard(gameState, card.instanceId);
      setGameState(newState);
      playHit();
    } catch (error) {
      debug.error('Error playing card:', error);
      showStatus('Error playing card', 'error');
    }
  };
  
  // Helper function to end turn
  const endTurnSimple = () => {
    try {
      const newState = endTurn(gameState);
      setGameState(newState);
      playSuccess(); // Play sound effect
    } catch (error) {
      debug.error('Error ending turn:', error);
      showStatus('Error ending turn', 'error');
    }
  };
  
  // Get current player label
  const currentPlayerLabel = currentTurn === 'player' ? 'YOUR TURN' : 'OPPONENT\'S TURN';
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 tracking-wide">Card Battler</h1>
          <div className="bg-gray-800 rounded-lg p-2 shadow-lg">
            <span className="text-sm text-gray-400">Turn {turnNumber}</span>
            <div className={`text-lg font-bold ${currentTurn === 'player' ? 'text-green-400' : 'text-red-400'}`}>
              {currentPlayerLabel}
            </div>
          </div>
        </div>
        
        {/* Game info panel */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-4 mb-8 shadow-xl border border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-3">
                P
              </div>
              <div>
                <h2 className="font-bold text-xl">YOU</h2>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white mr-2">
                    <span className="text-xs">HP</span>
                  </div>
                  <span className="text-lg font-bold">{players.player.health}</span>
                  
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white ml-4 mr-2">
                    <span className="text-xs">MP</span>
                  </div>
                  <span className="text-lg font-bold">{players.player.mana.current}/{players.player.mana.max}</span>
                </div>
              </div>
            </div>
            
            <div>
              <button 
                onClick={endTurnSimple}
                disabled={currentTurn !== 'player'}
                className={`px-6 py-3 rounded-lg font-bold text-lg shadow-lg transition transform hover:scale-105
                  ${currentTurn === 'player' 
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
              >
                END TURN
              </button>
            </div>
            
            <div className="flex items-center">
              <div>
                <h2 className="font-bold text-xl text-right">OPPONENT</h2>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white mr-2">
                    <span className="text-xs">MP</span>
                  </div>
                  <span className="text-lg font-bold">{players.opponent.mana.current}/{players.opponent.mana.max}</span>
                  
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white ml-4 mr-2">
                    <span className="text-xs">HP</span>
                  </div>
                  <span className="text-lg font-bold">{players.opponent.health}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl ml-3">
                O
              </div>
            </div>
          </div>
        </div>
        
        {/* Battlefield */}
        <div className="mb-8">
          <h2 className="font-bold text-2xl mb-4 text-yellow-400">BATTLEFIELD</h2>
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
            <div className="mb-8">
              <h3 className="font-bold text-xl mb-4 text-red-400">OPPONENT'S CARDS</h3>
              <div className="flex flex-wrap gap-4 justify-center">
                {players.opponent.battlefield.length === 0 ? (
                  <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 text-gray-400 w-full text-center">
                    No cards on the battlefield
                  </div>
                ) : (
                  players.opponent.battlefield.map(card => (
                    <Card key={card.instanceId} card={card} isBattlefield={true} />
                  ))
                )}
              </div>
            </div>
            
            <div className="w-full border-t border-gray-700 my-6"></div>
            
            <div>
              <h3 className="font-bold text-xl mb-4 text-green-400">YOUR CARDS</h3>
              <div className="flex flex-wrap gap-4 justify-center">
                {players.player.battlefield.length === 0 ? (
                  <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 text-gray-400 w-full text-center">
                    Play cards from your hand to the battlefield
                  </div>
                ) : (
                  players.player.battlefield.map(card => (
                    <Card key={card.instanceId} card={card} isBattlefield={true} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Hand */}
        <div>
          <h2 className="font-bold text-2xl mb-4 text-yellow-400">YOUR HAND</h2>
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
            <div className="flex flex-wrap gap-4 justify-center">
              {players.player.hand.length === 0 ? (
                <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 text-gray-400 w-full text-center">
                  Your hand is empty. End turn to draw a new card.
                </div>
              ) : (
                players.player.hand.map(card => {
                  const canPlay = currentTurn === 'player' && (card.card.manaCost ?? 0) <= players.player.mana.current;
                  
                  return (
                    <Card 
                      key={card.instanceId} 
                      card={card} 
                      canPlay={canPlay} 
                      onClick={() => playCardSimple(card)} 
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleGame;