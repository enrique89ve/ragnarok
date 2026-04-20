import React from 'react';
import { ActiveSecret } from '../types';
import { HeroClass } from '../types';

interface SecretIconProps {
  secrets: ActiveSecret[];
  heroClass: HeroClass;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const SecretIcon: React.FC<SecretIconProps> = ({ secrets, heroClass, position }) => {
  if (!secrets || secrets.length === 0) {
    return null;
  }
  
  // Get the class-specific color for the secret
  const getSecretColor = (heroClass: HeroClass) => {
    switch (heroClass) {
      case 'mage':
        return 'bg-blue-500';
      case 'hunter':
        return 'bg-green-600';
      case 'paladin':
        return 'bg-yellow-500';
      case 'rogue':
        return 'bg-gray-500';
      default:
        return 'bg-purple-500';
    }
  };
  
  // Position classes based on placement
  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top':
        return '-top-3 right-0';
      case 'bottom':
        return '-bottom-3 right-0';
      case 'left':
        return 'top-0 -left-3';
      case 'right':
        return 'top-0 -right-3';
      default:
        return '-top-3 right-0';
    }
  };
  
  // If there are multiple secrets, show a count badge
  const secretCount = secrets.length;
  const secretColor = getSecretColor(heroClass);
  const positionClasses = getPositionClasses(position);
  
  return (
    <div className={`absolute ${positionClasses} z-10`}>
      <div className={`${secretColor} rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-white`}>
        <span className="text-white text-xs font-bold">?</span>
      </div>
      
      {/* Show count if more than one secret */}
      {secretCount > 1 && (
        <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center border border-white">
          {secretCount}
        </div>
      )}
    </div>
  );
};

export default SecretIcon;