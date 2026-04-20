import React, { useRef, useEffect, useState, lazy, Suspense } from 'react';
import { PlayerState, HeroClass, Position, ActiveSecret } from '../types';
import HeroPower from './HeroPower';
import SecretIcon from './SecretIcon';
const HealthDisplay = lazy(() => import('./HealthDisplay'));
const ArmorDisplay = lazy(() => import('./ArmorDisplay'));
import { debug } from '../config/debugConfig';

const HERO_IMAGE_IDS = {
  jaina: 'jaina',
  garrosh: 'garrosh', 
  uther: 'uther',
  rexxar: 'rexxar',
  anduin: 'anduin',
  guldan: 'guldan',
  thrall: 'thrall',
  valeera: 'valeera',
  malfurion: 'malfurion',
  illidan: 'illidan',
  arthas: 'arthas',
  lilian: 'lilian'
};

interface HeroProps {
  player: PlayerState;
  isPlayerTurn: boolean;
  isHeroPowerTargetMode: boolean;
  onHeroPowerUse: () => void;
  onHeroClick?: () => void;
  heroType?: 'player' | 'opponent';
  registerPosition?: (type: 'player' | 'opponent', position: Position) => void;
  isInteractionDisabled?: boolean;
}

// Get hero class color for frame
const getHeroClassColor = (heroClass: HeroClass | undefined): string => {
  // Handle null or undefined heroClass
  if (!heroClass) return 'from-gray-800 to-gray-700 border-gray-600';
  
  switch (heroClass) {
    case 'mage':
      return 'from-blue-800 to-blue-600 border-blue-400';
    case 'warrior':
      return 'from-red-800 to-red-600 border-red-400';
    case 'paladin':
      return 'from-yellow-700 to-yellow-500 border-yellow-300';
    case 'hunter':
      return 'from-green-800 to-green-600 border-green-400';
    case 'priest':
      return 'from-white to-gray-200 border-gray-400';
    case 'warlock':
      return 'from-purple-900 to-purple-700 border-purple-500';
    case 'shaman':
      return 'from-blue-600 to-blue-400 border-blue-300';
    case 'rogue':
      return 'from-gray-900 to-gray-700 border-gray-500';
    case 'druid':
      return 'from-amber-800 to-amber-600 border-amber-400';
    case 'berserker':
      return 'from-emerald-800 to-emerald-600 border-emerald-400';
    case 'deathknight':
      return 'from-sky-900 to-blue-900 border-blue-200';
    case 'necromancer':
      return 'from-violet-900 to-purple-800 border-purple-300';
    default:
      return 'from-gray-800 to-gray-700 border-gray-600';
  }
};

// Get hero class name for display
const getHeroClassName = (heroClass: HeroClass | undefined): string => {
  // Handle null or undefined heroClass
  if (!heroClass) return "Unknown";
  
  // Special cases
  if (heroClass === 'berserker') return "Berserker";
  if (heroClass === 'deathknight') return "Death Knight";
  if (heroClass === 'necromancer') return "Necromancer";
  
  return heroClass.charAt(0).toUpperCase() + heroClass.slice(1);
};

// Mapping of hero class to image ID
const getHeroImageId = (heroClass: HeroClass | undefined): string => {
  if (!heroClass) return 'unknown';
  
  switch (heroClass) {
    case 'mage':
      return 'jaina';
    case 'warrior':
      return 'garrosh';
    case 'paladin':
      return 'uther';
    case 'hunter':
      return 'rexxar';
    case 'priest':
      return 'anduin';
    case 'warlock':
      return 'guldan';
    case 'shaman':
      return 'thrall';
    case 'rogue':
      return 'valeera';
    case 'druid':
      return 'malfurion';
    case 'berserker':
      return 'illidan';
    case 'deathknight':
      return 'arthas';
    case 'necromancer':
      return 'lilian';
    default:
      return 'unknown';
  }
};

export const Hero: React.FC<HeroProps> = ({
  player,
  isPlayerTurn,
  isHeroPowerTargetMode,
  onHeroPowerUse,
  onHeroClick,
  heroType = 'player',
  registerPosition,
  isInteractionDisabled = false
}) => {
  const heroClassColor = getHeroClassColor(player.heroClass);
  const heroName = getHeroClassName(player.heroClass);
  const heroRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(true);
  
  const heroImageId = getHeroImageId(player.heroClass);
  
  const [imageSource, setImageSource] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    debug.log(`Using emoji fallback for ${heroImageId} hero portrait`);
    setImageError(true);
  };
  
  // Register this hero's position for attack animations
  useEffect(() => {
    if (heroRef.current && registerPosition) {
      const rect = heroRef.current.getBoundingClientRect();
      const position: Position = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      registerPosition(heroType, position);
    }
  }, [heroType, registerPosition]);
  
  // Get fallback hero emoji if image fails to load
  const getHeroEmoji = (heroClass: HeroClass | undefined): string => {
    // Handle null or undefined heroClass
    if (!heroClass) return '👤';
    
    switch (heroClass) {
      case 'mage':
        return '🧙‍';
      case 'warrior':
        return '⚔️';
      case 'paladin':
        return '✝️';
      case 'hunter':
        return '🏹';
      case 'priest':
        return '🙏';
      case 'warlock':
        return '😈';
      case 'shaman':
        return '🌩️';
      case 'rogue':
        return '🗡️';
      case 'druid':
        return '🐻';
      case 'berserker':
        return '👿';
      case 'deathknight':
        return '💀';
      case 'necromancer':
        return '🧙‍♀️';
      default:
        return '👤';
    }
  };

  const heroEmoji = getHeroEmoji(player.heroClass);

  return (
    <div className="flex flex-col items-center">
      {/* Hero portrait with frame */}
      <div 
        ref={heroRef}
        className={`w-20 h-20 bg-gradient-to-b ${heroClassColor} rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 transition-all hover:scale-105 relative overflow-hidden ${onHeroClick && !isInteractionDisabled ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={isInteractionDisabled ? undefined : onHeroClick}
      >
        {/* Hero glow effect when it's player's turn */}
        {isPlayerTurn && (
          <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
        )}
        
        {/* Hero portrait image */}
        {!imageError ? (
          <img
            src={imageSource}
            alt={heroName}
            className="w-full h-full object-cover"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 bg-opacity-90">
            <span className="text-3xl mb-1">{heroEmoji}</span>
            <div className="text-xs font-bold text-center px-1 leading-tight">
              {heroName.split(' ').map((word, i) => (
                <div key={i}>{word}</div>
              ))}
            </div>
            {/* Norse-themed rune decoration for fallback */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-400"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-400"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-400"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-400"></div>
            </div>
          </div>
        )}
        
        {/* Hero frame overlay */}
        <div className="absolute inset-0 rounded-full pointer-events-none border-2 border-opacity-60 shadow-inner" 
             style={{ 
               boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.6)',
               background: 'radial-gradient(circle, transparent 60%, rgba(0, 0, 0, 0.4) 100%)'
             }}
        ></div>
        
        {/* Secret icon (if any) */}
        {player.secrets && player.secrets.length > 0 && player.heroClass && (
          <SecretIcon 
            secrets={player.secrets} 
            heroClass={player.heroClass || 'neutral'} 
            position={heroType === 'player' ? 'bottom' : 'top'} 
          />
        )}
      </div>
      
      {/* Hero name & health/armor */}
      <div className="mt-2 text-center">
        <div className="font-bold text-sm bg-gradient-to-r from-gray-700 to-gray-800 rounded px-2 py-0.5">{heroName}</div>
        <div className="flex items-center justify-center mt-1 space-x-2">
          <Suspense fallback={<span className="text-green-500 font-bold">{player.heroHealth}</span>}>
            <HealthDisplay
              value={player.heroHealth}
              maxValue={30}
              size="md"
            />
          </Suspense>

          {player.heroArmor > 0 && (
            <Suspense fallback={<span className="text-blue-300 font-bold">{player.heroArmor}</span>}>
              <ArmorDisplay
                value={player.heroArmor}
                className="ml-1"
              />
            </Suspense>
          )}
        </div>
      </div>
      
      {/* Hero power */}
      <div className="mt-2">
        <HeroPower 
          heroPower={player.heroPower}
          currentMana={player.currentMana}
          isPlayerTurn={isPlayerTurn}
          isTargetMode={isHeroPowerTargetMode}
          onUse={onHeroPowerUse}
          isInteractionDisabled={isInteractionDisabled}
        />
      </div>
    </div>
  );
};

export default Hero;