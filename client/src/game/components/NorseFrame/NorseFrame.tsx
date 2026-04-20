import React, { useState, useRef, useEffect } from 'react';
import './NorseFrame.css';

/**
 * NorseFrame Component
 * 
 * The primary frame implementation for all cards in the game.
 * Provides Norse-themed styling with rarity-specific appearances
 * and dynamic lighting effects.
 */
interface NorseFrameProps {
  children: React.ReactNode;
  rarity?: string;
  cardType?: string; 
  hasKeywords?: boolean;
  isGolden?: boolean;
  isPlayable?: boolean;
  className?: string;
  heroClass?: string;
  inHand?: boolean;
}

const NorseFrame: React.FC<NorseFrameProps> = ({
  children,
  rarity = 'common',
  cardType = 'minion',
  hasKeywords = false,
  isGolden = false,
  isPlayable = false,
  className = '',
  heroClass = 'neutral',
  inHand = false
}) => {
  // State to track mouse position for dynamic lighting
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Normalize the rarity, type, and class to lowercase
  const rarityClass = `norse-frame-${rarity.toLowerCase()}`;
  const typeClass = `norse-frame-${cardType.toLowerCase()}`;
  const classClass = heroClass ? `norse-frame-${heroClass.toLowerCase()}` : 'norse-frame-neutral';
  
  // Additional styling classes
  const keywordsClass = hasKeywords ? 'has-keywords' : '';
  const goldenClass = isGolden ? 'golden-card' : '';
  const playableClass = isPlayable ? 'playable-card' : '';
  const inHandClass = inHand ? 'in-hand' : '';
  
  // Calculate dynamic lighting based on mouse position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setMousePosition({ x, y });
  };
  
  // Reset mouse position when leaving the card
  const handleMouseLeave = () => {
    setMousePosition({ x: 0.5, y: 0.5 });
  };
  
  // Apply dynamic lighting styles based on mouse position
  const dynamicLightingStyle = {
    '--mouse-x': mousePosition.x,
    '--mouse-y': mousePosition.y,
  } as React.CSSProperties;
  
  // Effect to initialize default mouse position at center
  useEffect(() => {
    setMousePosition({ x: 0.5, y: 0.5 });
  }, []);
  
  return (
    <div 
      ref={cardRef}
      className={`norse-frame-container ${goldenClass} ${keywordsClass} ${playableClass} ${inHandClass} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={dynamicLightingStyle}
    >
      {/* Main frame with rarity, type, and class-specific styling */}
      <div className={`norse-frame-3d ${rarityClass} ${typeClass} ${classClass}`}>
        {/* Border element with layered effects */}
        <div className="norse-frame-border"></div>
        
        {/* Inner glow effect */}
        <div className="norse-frame-inner-glow"></div>
        
        {/* Class-specific rune effects that animate on hover */}
        <div className="norse-frame-runes"></div>
        
        {/* Card content container */}
        <div className="norse-frame-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default NorseFrame;