import React from 'react';
import { GameIcon } from '../utils/ui/GameIcon';
import type { IconName } from '../utils/ui/iconMap';
import './RaceIcon.css';

export interface RaceIconProps {
  race: string;
  rarity?: string;
  scale?: number;
}

const RACE_ICON_MAP: Record<string, IconName> = {
  beast: 'paw',
  demon: 'zap',
  titan: 'zap',
  dragon: 'sparkles', // no dragon in iconMap; use sparkles (closest mythic marker)
  elemental: 'flame',
  mech: 'gear',
  mechanical: 'gear',
  automaton: 'gear',
  murloc: 'snake',
  naga: 'snake',
  pirate: 'swords',
  einherjar: 'swords',
  totem: 'ghost',
  spirit: 'ghost',
  undead: 'skull',
  giant: 'mountain',
  treant: 'tree',
  all: 'sparkles',
};

/**
 * RaceIcon component that displays a 3D icon for different minion types (races)
 *
 * Used to replace the text race indicator with a visual element.
 */
export const RaceIcon: React.FC<RaceIconProps> = React.memo(({
  race,
  rarity = 'common',
  scale = 1
}) => {
  const key = race.toLowerCase();
  const iconName = RACE_ICON_MAP[key];

  const containerScale = scale || 1;

  return (
    <div
      className={`race-icon-container race-icon-${rarity.toLowerCase()}`}
      style={{ transform: `scale(${containerScale})` }}
    >
      {iconName ? (
        <GameIcon name={iconName} size={18} className="race-icon-symbol" />
      ) : (
        <span className="race-icon-symbol">{race.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
});

export default RaceIcon;
