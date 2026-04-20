/**
 * HeroArtImage Component
 * Displays hero artwork with proper aspect ratio and fallback
 * Uses useHeroArt hook for consistent art resolution
 */

import React from 'react';
import { useHeroArt } from '../../hooks/useHeroArt';

interface HeroArtImageProps {
  heroId: string;
  heroName: string;
  portrait?: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export function HeroArtImage({
  heroId,
  heroName,
  portrait,
  className = '',
  fallbackIcon,
}: HeroArtImageProps) {
  const { artPath, hasArt } = useHeroArt(heroId, portrait);

  if (!hasArt) {
    return fallbackIcon ? <>{fallbackIcon}</> : null;
  }

  return (
    <img
      src={artPath || ''}
      alt={heroName}
      className={className}
      style={{ objectFit: 'contain' }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
      loading="eager"
    />
  );
}
