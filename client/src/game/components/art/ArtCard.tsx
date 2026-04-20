/**
 * ArtCard Component
 * Displays artwork with proper aspect ratio preservation
 * 
 * Uses object-fit: contain to maintain image proportions
 */

import React, { useState } from 'react';
import type { ArtCard as ArtCardType } from '../../utils/art';

interface ArtCardProps {
  card: ArtCardType;
  imageUrl: string;
  size?: 'small' | 'medium' | 'large';
  showMetadata?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

const SIZE_CLASSES = {
  small: 'w-24 h-32',
  medium: 'w-36 h-48',
  large: 'w-48 h-64',
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'text-red-400 border-red-500/50',
  water: 'text-blue-400 border-blue-500/50',
  wind: 'text-green-400 border-green-500/50',
  earth: 'text-amber-400 border-amber-500/50',
};

const FACTION_COLORS: Record<string, string> = {
  aesir: 'bg-yellow-900/30',
  vanir: 'bg-emerald-900/30',
  jotnar: 'bg-blue-900/30',
  'mystical beings': 'bg-purple-900/30',
  pets: 'bg-pink-900/30',
};

const RARITY_GLOW: Record<string, string> = {
  common: '',
  rare: 'ring-1 ring-blue-500/30',
  epic: 'ring-1 ring-purple-500/40',
  legendary: 'ring-2 ring-orange-500/50 shadow-lg shadow-orange-500/20',
};

export const ArtCard: React.FC<ArtCardProps> = ({
  card,
  imageUrl,
  size = 'medium',
  showMetadata = true,
  onClick,
  selected = false,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClass = SIZE_CLASSES[size];
  const elementColor = card.element ? ELEMENT_COLORS[card.element] : 'border-gray-600';
  const factionBg = card.faction ? FACTION_COLORS[card.faction] : 'bg-gray-800';
  const rarityGlow = card.rarity ? RARITY_GLOW[card.rarity] : '';

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border-2 transition-all duration-200
        ${sizeClass}
        ${elementColor}
        ${factionBg}
        ${rarityGlow}
        ${selected ? 'ring-2 ring-yellow-400 scale-105' : ''}
        ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : ''}
      `}
      onClick={onClick}
    >
      {/* Image container with aspect ratio preservation */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={card.name}
            className={`
              w-full h-full object-contain
              transition-opacity duration-300
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            <span className="text-2xl">?</span>
            <span className="text-xs mt-1">No image</span>
          </div>
        )}
        
        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse" />
        )}
      </div>

      {/* Metadata overlay */}
      {showMetadata && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2">
          <p className="text-white text-xs font-medium truncate capitalize">
            {card.name}
          </p>
          {card.element && (
            <p className={`text-[10px] capitalize ${ELEMENT_COLORS[card.element]?.split(' ')[0] || 'text-gray-400'}`}>
              {card.element}
            </p>
          )}
        </div>
      )}

      {/* Main art indicator */}
      {card.mainArt && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400" title="Main Art" />
      )}

      {/* ID badge (read-only reference) */}
      <div className="absolute top-1 left-1 px-1 py-0.5 bg-black/70 rounded text-[8px] text-gray-400 font-mono">
        {card.id.slice(0, 8)}
      </div>
    </div>
  );
};

export default ArtCard;
