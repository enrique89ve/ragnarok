import React from 'react';
import { Player, Position, PlayerState } from '../types';
import { Hero } from './Hero';
import ManaBar from './ManaBar';

// Adapter function to convert Player to PlayerState for Hero component
function toPlayerState(player: Player): PlayerState {
  return {
    heroHealth: player.heroHealth ?? player.health ?? 100,
    heroArmor: player.heroArmor ?? player.armor ?? 0,
    heroClass: player.heroClass,
    currentMana: player.mana?.current ?? 0,
    maxMana: player.mana?.max ?? 0,
    hand: player.hand,
    battlefield: player.battlefield,
    deck: player.deck.map((cardData, idx) => ({
      instanceId: `deck-${idx}`,
      card: cardData
    })),
    graveyard: player.graveyard,
    weapon: player.weapon ?? null,
    heroPower: player.heroPower,
    secrets: player.secrets?.map(secret => ({
      instanceId: secret.instanceId,
      card: secret.card,
      triggered: false
    }))
  };
}

interface GameHUDProps {
  player: Player;
  opponent: Player;
  isPlayerTurn: boolean;
  turnNumber: number;
  isHeroPowerTargetMode: boolean;
  onHeroPowerUse: () => void;
  onOpponentHeroClick: () => void;
  registerHeroPosition?: (type: 'player' | 'opponent', position: Position) => void;
  registerManaPosition?: (type: 'mana', position: { x: number, y: number }) => void;
  isInteractionDisabled?: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  opponent,
  isPlayerTurn,
  turnNumber,
  isHeroPowerTargetMode,
  onHeroPowerUse,
  onOpponentHeroClick,
  registerHeroPosition,
  registerManaPosition,
  isInteractionDisabled = false
}) => {
  // Get turn label
  const turnLabel = isPlayerTurn ? 'YOUR TURN' : 'OPPONENT\'S TURN';
  
  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-4 shadow-xl border border-gray-700">
      <div className="flex justify-between items-center">
        {/* Player hero */}
        <div className="flex items-center">
          <Hero
            player={toPlayerState(player)}
            isPlayerTurn={isPlayerTurn}
            isHeroPowerTargetMode={isHeroPowerTargetMode}
            onHeroPowerUse={onHeroPowerUse}
            heroType="player"
            registerPosition={registerHeroPosition}
            isInteractionDisabled={isInteractionDisabled}
          />
          
          {/* Player mana */}
          <div className="ml-4">
            <div className="flex flex-col">
              <div className="flex items-center mb-1">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm border border-blue-700 mr-2">
                  <span className="text-xs">MP</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-bold text-blue-400">
                    {player.mana.current}/{player.mana.max}
                  </span>
                  
                  {player.mana.overloaded && player.mana.overloaded > 0 && (
                    <span className="ml-2 text-sm font-semibold bg-red-800 text-white px-2 py-0.5 rounded-md">
                      <span className="text-yellow-300 mr-1">⚡</span>
                      {player.mana.overloaded} locked
                    </span>
                  )}
                </div>
              </div>
              <ManaBar 
                currentMana={player.mana.current} 
                maxMana={player.mana.max} 
                overloadedMana={player.mana.overloaded} 
                pendingOverload={player.mana.pendingOverload}
                registerPosition={registerManaPosition}
              />
            </div>
          </div>
        </div>
        
        {/* Turn info & control */}
        <div className="flex flex-col items-center">
          <div className="bg-gray-800 rounded-lg p-2 shadow-inner mb-2">
            <span className="text-sm text-gray-400">Turn {turnNumber}</span>
            <div className={`text-lg font-bold ${isPlayerTurn ? 'text-green-500' : 'text-red-500'}`}>
              {turnLabel}
            </div>
          </div>
          
          
          {isHeroPowerTargetMode && (
            <div className="mt-2 text-yellow-400 font-semibold text-sm">
              Select a target for your hero power
            </div>
          )}
        </div>
        
        {/* Opponent hero */}
        <div className="flex items-center">
          {/* Opponent mana */}
          <div className="mr-4">
            <div className="flex flex-col">
              <div className="flex items-center justify-end mb-1">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm border border-blue-700 mr-2">
                  <span className="text-xs">MP</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-bold text-blue-400">
                    {opponent.mana.current}/{opponent.mana.max}
                  </span>
                  
                  {opponent.mana.overloaded && opponent.mana.overloaded > 0 && (
                    <span className="ml-2 text-sm font-semibold bg-red-800 text-white px-2 py-0.5 rounded-md">
                      <span className="text-yellow-300 mr-1">⚡</span>
                      {opponent.mana.overloaded} locked
                    </span>
                  )}
                </div>
              </div>
              <ManaBar 
                currentMana={opponent.mana.current} 
                maxMana={opponent.mana.max} 
                overloadedMana={opponent.mana.overloaded} 
                pendingOverload={opponent.mana.pendingOverload}
                registerPosition={registerManaPosition}
              />
            </div>
          </div>
          
          <Hero
            player={toPlayerState(opponent)}
            isPlayerTurn={isPlayerTurn}
            isHeroPowerTargetMode={isHeroPowerTargetMode}
            onHeroPowerUse={() => {}} // Opponent doesn't use hero power through UI
            onHeroClick={onOpponentHeroClick}
            heroType="opponent"
            registerPosition={registerHeroPosition}
            isInteractionDisabled={isInteractionDisabled}
          />
        </div>
      </div>
    </div>
  );
};

export default GameHUD;