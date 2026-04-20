import React from 'react';
import GameAreaContainer from '../GameAreaContainer';

/**
 * A minimalist example showcasing the usage of the GameAreaContainer
 * component to enforce strict proportional layouts.
 */
const SimpleGameLayout: React.FC = () => {
  return (
    <div className="w-full h-full bg-amber-900">
      <div className="game-grid-container w-full h-full">
        {/* Opponent Area - 20% of height */}
        <GameAreaContainer areaType="opponent" className="bg-amber-800 bg-opacity-30">
          <div className="p-4">
            <h2 className="text-white text-xl">Opponent Area</h2>
            <p className="text-gray-200">20% of total height</p>
          </div>
        </GameAreaContainer>
        
        {/* Battlefield Area - 60% of height */}
        <GameAreaContainer areaType="battlefield" className="bg-amber-700 bg-opacity-20">
          <div className="p-4">
            <h2 className="text-white text-xl">Battlefield Area</h2>
            <p className="text-gray-200">60% of total height</p>
          </div>
        </GameAreaContainer>
        
        {/* Player Area - 20% of height */}
        <GameAreaContainer areaType="player" className="bg-amber-800 bg-opacity-30">
          <div className="p-4">
            <h2 className="text-white text-xl">Player Area</h2>
            <p className="text-gray-200">20% of total height</p>
          </div>
        </GameAreaContainer>
      </div>
    </div>
  );
};

export default SimpleGameLayout;