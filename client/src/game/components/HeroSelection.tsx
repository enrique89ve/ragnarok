import React, { useState, useEffect } from 'react';
import heroes, { getHeroDataByClass } from '../data/heroes';
import { HeroClass, DeckInfo } from '../types';
// Import the store as the default export
import useGameStore from '../../lib/stores/useGame';
import { useAudio } from '../../lib/stores/useAudio';

interface LastPlayedDeckInfo {
  deck: DeckInfo;
  hero: HeroClass;
}

interface HeroSelectionProps {
  onHeroSelect: (heroClass: HeroClass) => void;
  lastPlayedDeck?: LastPlayedDeckInfo | null;
  onQuickStart?: () => void;
}

const HeroSelection: React.FC<HeroSelectionProps> = ({ onHeroSelect, lastPlayedDeck, onQuickStart }) => {
  const [selectedHero, setSelectedHero] = useState<HeroClass | null>(null);
  const [selectedAlternate, setSelectedAlternate] = useState<number | null>(null);
  const { playSoundEffect } = useAudio();
  
  // Hero class colors for visual distinction
  const heroColors: Record<string, string> = {
    mage: '#69CCF0',
    warrior: '#C79C6E',
    paladin: '#F58CBA',
    hunter: '#ABD473',
    druid: '#FF7D0A',
    priest: '#FFFFFF',
    warlock: '#9482C9',
    shaman: '#0070DE',
    rogue: '#FFF569',
    berserker: '#A330C9',
    deathknight: '#C41E3A',
    necromancer: '#7B68EE',
    neutral: '#CCCCCC'
  };

  const confirmSelection = () => {
    if (selectedHero) {
      playSoundEffect('card_play');
      onHeroSelect(selectedHero);
    }
  };
  
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const heroClass = e.target.value as HeroClass;
    if (heroClass) {
      setSelectedHero(heroClass);
      setSelectedAlternate(null);
      playSoundEffect('card_play');
    }
  };
  
  const handleHeroChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const heroId = parseInt(e.target.value);
    setSelectedAlternate(heroId === 0 ? null : heroId);
    playSoundEffect('card_play');
  };
  
  // Get the currently selected hero data based on class and alternate selection
  const selectedHeroData = selectedHero ? getHeroDataByClass(selectedHero) : null;
  const selectedHeroName = selectedAlternate 
    ? selectedHeroData?.alternateHeroes?.find(alt => alt.id === selectedAlternate)?.name
    : selectedHeroData?.name;
  
  return (
    <div className="hero-selection p-6 bg-gray-800 text-white max-w-4xl mx-auto rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold mb-8 text-center text-yellow-400">Choose Your Hero</h1>
      
      {lastPlayedDeck && onQuickStart && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-800 to-green-700 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-200">Quick Start</div>
              <div className="font-bold">{lastPlayedDeck.deck.name}</div>
              <div className="text-sm text-green-300">{lastPlayedDeck.hero.charAt(0).toUpperCase() + lastPlayedDeck.hero.slice(1)}</div>
            </div>
            <button
              onClick={onQuickStart}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-white shadow-lg transition-all hover:scale-105"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left side - Class & Hero Selection */}
        <div className="md:w-1/2 space-y-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-center">Select Class</h2>
            <select 
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded text-white"
              onChange={handleClassChange}
              value={selectedHero || ""}
            >
              <option value="">-- Select a Class --</option>
              {heroes.map(hero => (
                <option key={hero.id} value={hero.class}>
                  {hero.class.charAt(0).toUpperCase() + hero.class.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          {selectedHero && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-center">Select Hero</h2>
              <select 
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded text-white"
                onChange={handleHeroChange}
                value={selectedAlternate || 0}
              >
                <option value={0}>
                  {selectedHeroData?.name} (Default)
                </option>
                {selectedHeroData?.alternateHeroes?.map(alt => (
                  <option key={alt.id} value={alt.id}>
                    {alt.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex justify-center mt-6">
            <button
              className={`px-8 py-3 rounded-lg font-bold text-white ${
                selectedHero ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-500 cursor-not-allowed'
              }`}
              disabled={!selectedHero}
              onClick={confirmSelection}
            >
              Confirm Hero Selection
            </button>
          </div>
        </div>
        
        {/* Right side - Hero Preview */}
        <div className="md:w-1/2">
          {selectedHero ? (
            <div 
              className="hero-preview p-6 rounded-lg flex flex-col items-center text-center"
              style={{ 
                backgroundColor: heroColors[selectedHero],
                color: selectedHero === 'priest' ? '#000' : '#fff',
                minHeight: '300px'
              }}
            >
              <h3 className="text-2xl font-bold mb-2">{selectedHeroName}</h3>
              <div className="text-lg mb-4">{selectedHero.charAt(0).toUpperCase() + selectedHero.slice(1)}</div>
              
              {selectedAlternate ? (
                <div className="hero-description mt-2">
                  <p>{selectedHeroData?.alternateHeroes?.find(alt => alt.id === selectedAlternate)?.description}</p>
                </div>
              ) : (
                <>
                  <div className="hero-description mb-4">
                    <p>{selectedHeroData?.description}</p>
                  </div>
                  
                  <div className="hero-power mt-4 p-3 bg-black bg-opacity-30 rounded-lg w-full">
                    <div className="font-semibold text-lg">{selectedHeroData?.heroPowers[0].name}</div>
                    <div className="opacity-90">{selectedHeroData?.heroPowers[0].description}</div>
                    <div className="mt-2 text-sm">Cost: {selectedHeroData?.heroPowers[0].cost} Mana</div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-400">Select a class to see hero details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroSelection;