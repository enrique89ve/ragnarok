import React from 'react';
import { useHeroArt } from '../../hooks/useHeroArt';

interface HeroPortraitProps {
  heroId?: string;
  name: string;
  portrait?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  borderColor?: string;
}

const SIZE_CLASSES = {
  xs: 'w-8 h-8 text-sm',
  sm: 'w-12 h-12 text-xl',
  md: 'w-16 h-16 text-2xl',
  lg: 'w-20 h-20 text-3xl',
  xl: 'w-28 h-28 text-4xl',
};

export function HeroPortrait({
  heroId,
  name,
  portrait,
  size = 'md',
  className = '',
  borderColor = 'border-gray-500',
}: HeroPortraitProps) {
  const sizeClasses = SIZE_CLASSES[size];
  const initial = name?.charAt(0) || '?';
  const { artPath } = useHeroArt(heroId, portrait);

  return (
    <div
      className={`
        ${sizeClasses}
        rounded-full
        flex items-center justify-center
        font-bold
        border-2 ${borderColor}
        overflow-hidden
        bg-gradient-to-br from-gray-700 to-gray-900
        ${className}
      `}
    >
      {artPath ? (
        <img
          src={artPath}
          alt={name}
          className="w-full h-full"
          style={{ objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
          loading="lazy"
        />
      ) : null}
      <span className={artPath ? 'hidden' : 'text-gray-300'}>{initial}</span>
    </div>
  );
}

export { useHeroArt } from '../../hooks/useHeroArt';
