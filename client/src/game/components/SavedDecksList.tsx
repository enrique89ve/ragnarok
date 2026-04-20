import { debug } from '../config/debugConfig';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeckInfo, HeroClass } from '../types';
import useGame from '../../lib/stores/useGame';
import { useGameStore } from '../stores/gameStore';
import { getHeroDataByClass } from '../data/heroes';
import { useNavigate } from 'react-router-dom';

interface SavedDecksListProps {
  onSelectDeck: (deck: DeckInfo) => void;
  onCreateNewDeck: () => void;
}

const SavedDecksList: React.FC<SavedDecksListProps> = ({ onSelectDeck, onCreateNewDeck }) => {
  const { savedDecks } = useGame();
  const navigate = useNavigate();

  // Ensure savedDecks is an array before processing
  const validDecks = Array.isArray(savedDecks) ? savedDecks : [];
  
  // Group decks by class
  const decksByClass = validDecks.reduce((groups, deck) => {
    // Make sure deck is an object and deck.heroClass exists and is a string
    if (!deck || typeof deck !== 'object') {
      debug.warn("Invalid deck found:", deck);
      return groups;
    }
    
    const className = deck.heroClass || "Unknown";
    if (!groups[className]) {
      groups[className] = [];
    }
    groups[className].push(deck);
    return groups;
  }, {} as Record<string, DeckInfo[]>);

  return (
    <div className="saved-decks-container h-full flex flex-col bg-gray-900 text-white">
      <div className="deck-header bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white flex items-center space-x-2"
            onClick={() => navigate('/')}
            title="Return to Homepage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </button>
          <h1 className="text-xl font-bold text-yellow-400">My Decks</h1>
        </div>
        <div className="flex space-x-3">
          <button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white"
            onClick={onCreateNewDeck}
          >
            Create New Deck
          </button>
        </div>
      </div>

      <div className="deck-list-content deck-selection flex-1 overflow-y-auto p-6" style={{pointerEvents: 'auto'}}>
        {Object.keys(decksByClass).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="empty-decks-icon mb-4 w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">No Saved Decks</h2>
            <p className="text-gray-400 mb-6">You haven't created any decks yet. Start by creating a new deck!</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold"
                onClick={onCreateNewDeck}
              >
                Create Your First Deck
              </button>
              <button
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold flex items-center justify-center space-x-2"
                onClick={() => navigate('/')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Return Home</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(decksByClass).map(([className, decks]) => (
              <div key={className} className="class-group mb-8">
                <h2 className="text-lg font-bold mb-4 text-blue-400">{className}</h2>
                <div className="decks-grid grid grid-cols-1 gap-4">
                  {decks.map(deck => {
                    if (!deck || typeof deck !== 'object') {
                      debug.error("Invalid deck in class group:", className, deck);
                      return null;
                    }
                    
                    if (!deck.cards || typeof deck.cards !== 'object') {
                      debug.error("Deck has invalid cards property:", deck);
                      return null;
                    }
                    
                    // Convert class name format to match hero data format
                    const heroClassValue = (deck.heroClass || "neutral").toLowerCase() as HeroClass;
                    const heroData = getHeroDataByClass(heroClassValue);
                    const heroName = heroData ? heroData.name : (deck.heroClass || "Unknown Class");
                    
                    // Safely calculate card count
                    let cardCount = 0;
                    try {
                      cardCount = Object.values(deck.cards).reduce((sum, count) => {
                        // Ensure count is a number
                        const numCount = typeof count === 'number' ? count : 0;
                        return sum + numCount;
                      }, 0);
                    } catch (e) {
                      debug.error("Error calculating card count:", e, deck.cards);
                    }

                    return (
                      <motion.div
                        key={deck.id}
                        className="deck-card clickable-deck p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer"
                        whileHover={{ scale: 1.02 }}
                        style={{pointerEvents: 'auto'}}
                        onClick={() => onSelectDeck(deck)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-lg">{deck.name || "Unnamed Deck"}</h3>
                            <p className="text-sm text-gray-400">{heroName}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400">Cards:</span>
                            <p className={`font-bold ${cardCount === 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {cardCount}/30
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedDecksList;