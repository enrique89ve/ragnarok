import React from 'react';
import { HeroPower as HeroPowerType, HeroClass } from '../types';

interface HeroPowerProps {
  heroPower: HeroPowerType;
  currentMana: number;
  isPlayerTurn: boolean;
  isTargetMode: boolean;
  onUse: () => void;
  isInteractionDisabled?: boolean;
}

// Get hero power color based on class
const getHeroPowerColor = (heroClass: HeroClass): string => {
  switch (heroClass) {
    case 'mage':
      return 'bg-blue-700 border-blue-500 hover:bg-blue-600';
    case 'warrior':
      return 'bg-red-700 border-red-500 hover:bg-red-600';
    case 'paladin':
      return 'bg-yellow-700 border-yellow-500 hover:bg-yellow-600';
    case 'hunter':
      return 'bg-green-700 border-green-500 hover:bg-green-600';
    default:
      return 'bg-gray-700 border-gray-500 hover:bg-gray-600';
  }
};

export const HeroPower: React.FC<HeroPowerProps> = ({
  heroPower,
  currentMana,
  isPlayerTurn,
  isTargetMode,
  onUse,
  isInteractionDisabled = false
}) => {
  // Check if hero power can be used
  const canUseHeroPower = isPlayerTurn && 
                         currentMana >= heroPower.cost && 
                         !heroPower.used &&
                         !isInteractionDisabled;
  
  // Get style based on hero class
  const heroPowerColor = getHeroPowerColor(heroPower.class || 'neutral');
  
  // Get hero power icon based on class
  const getHeroPowerIcon = (heroClass: HeroClass): string => {
    switch (heroClass) {
      case 'mage':
        return '🔥'; // Fire for Fireblast
      case 'warrior':
        return '🛡️'; // Shield for Armor Up
      case 'paladin':
        return '👑'; // Crown for Reinforce
      case 'hunter':
        return '🏹'; // Bow for Steady Shot
      default:
        return '⚡';
    }
  };

  const icon = getHeroPowerIcon(heroPower.class || 'neutral');
  
  return (
    <div className="relative group">
      <div 
        className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-md border 
          ${canUseHeroPower ? heroPowerColor : 'bg-gray-800 border-gray-700'} 
          ${canUseHeroPower ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'} 
          ${isTargetMode ? 'ring-2 ring-purple-500' : ''}
          transition-all transform ${canUseHeroPower ? 'hover:scale-110' : ''}`}
        onClick={() => canUseHeroPower && onUse()}
      >
        {/* Hero power icon */}
        <span className="text-white text-sm">{icon}</span>
        
        {/* Cost indicator */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border border-blue-500">
          <span className="text-white text-xs font-bold">{heroPower.cost}</span>
        </div>
        
        {/* Used indicator */}
        {heroPower.used && (
          <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white text-xs">Used</span>
          </div>
        )}
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-36 bg-gray-900 bg-opacity-95 text-white p-2 rounded text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="font-bold text-center mb-1">{heroPower.name}</div>
        <div className="text-gray-300">{heroPower.description}</div>
        <div className="mt-1 text-blue-400 text-center">Cost: {heroPower.cost} mana</div>
      </div>
    </div>
  );
};

export default HeroPower;