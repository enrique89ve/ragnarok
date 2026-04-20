import React from 'react';
import './RaceIcon.css';

export interface RaceIconProps {
  race: string;
  rarity?: string;
  scale?: number;
}

/**
 * RaceIcon component that displays a 3D icon for different minion types (races)
 * 
 * Used to replace the text race indicator with a visual element
 */
export const RaceIcon: React.FC<RaceIconProps> = React.memo(({
  race,
  rarity = 'common',
  scale = 1
}) => {
  // Map race to appropriate symbol
  let symbol = "";
  
  switch (race.toLowerCase()) {
    case 'beast':
      symbol = "🐾"; // Paw prints for Beast
      break;
    case 'demon':
    case 'titan':
      symbol = "⚡"; // Lightning bolt for Titan (primordial beings)
      break;
    case 'dragon':
      symbol = "🐉"; // Dragon for Dragon
      break;
    case 'elemental':
      symbol = "🔥"; // Fire for Elemental
      break;
    case 'mech':
    case 'mechanical':
    case 'automaton':
      symbol = "⚙️"; // Gear for Automaton (forge constructs)
      break;
    case 'murloc':
    case 'naga':
      symbol = "🐍"; // Serpent for Naga (sea creatures)
      break;
    case 'pirate':
    case 'einherjar':
      symbol = "⚔️"; // Crossed swords for Einherjar (fallen warriors)
      break;
    case 'totem':
    case 'spirit':
      symbol = "👻"; // Ghost for Spirit (ancestral spirits)
      break;
    case 'undead':
      symbol = "💀"; // Skull for Undead
      break;
    case 'giant':
      symbol = "🗻"; // Mountain for Giant
      break;
    case 'treant':
      symbol = "🌳"; // Tree for Treant
      break;
    case 'all':
      symbol = "✳️"; // Sparkle for All (like Amalgam)
      break;
    default:
      // For any other race, use first letter capitalized
      symbol = race.charAt(0).toUpperCase();
      break;
  }

  // Adapt scale to the component
  const containerScale = scale || 1;
  
  return (
    <div 
      className={`race-icon-container race-icon-${rarity.toLowerCase()}`}
      style={{
        transform: `scale(${containerScale})`,
        // We don't need to adjust position since we're using % in CSS
      }}
    >
      <span className="race-icon-symbol">{symbol}</span>
    </div>
  );
});

export default RaceIcon;