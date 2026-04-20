/**
 * BoardRippleEffect.tsx
 * 
 * A visual ripple effect component that displays when cards are played onto
 * the battlefield. Different card types/rarities will show different
 * effects (colors, sizes, durations).
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Position } from '../types/Position';

interface BoardRippleEffectProps {
  position: Position;
  element?: string; // frost, fire, nature, shadow, holy, or neutral
  strength?: 'normal' | 'powerful' | 'mythic';
}

// Color map based on element type
const elementColors = {
  frost: {
    primary: 'rgba(0, 150, 255, 0.8)',
    secondary: 'rgba(100, 200, 255, 0.6)',
    tertiary: 'rgba(200, 240, 255, 0.4)'
  },
  fire: {
    primary: 'rgba(255, 50, 0, 0.8)',
    secondary: 'rgba(255, 150, 50, 0.6)',
    tertiary: 'rgba(255, 200, 100, 0.4)'
  },
  nature: {
    primary: 'rgba(0, 180, 0, 0.8)',
    secondary: 'rgba(100, 220, 50, 0.6)',
    tertiary: 'rgba(180, 255, 100, 0.4)'
  },
  shadow: {
    primary: 'rgba(128, 0, 128, 0.8)',
    secondary: 'rgba(160, 50, 180, 0.6)',
    tertiary: 'rgba(200, 100, 220, 0.4)'
  },
  holy: {
    primary: 'rgba(255, 215, 0, 0.8)',
    secondary: 'rgba(255, 230, 100, 0.6)',
    tertiary: 'rgba(255, 245, 180, 0.4)'
  },
  neutral: {
    primary: 'rgba(200, 200, 200, 0.8)',
    secondary: 'rgba(220, 220, 220, 0.6)',
    tertiary: 'rgba(240, 240, 240, 0.4)'
  }
};

// Size/duration based on card rarity/strength
const effectParams = {
  normal: {
    baseSize: 50,
    maxSize: 150,
    duration: 1.5,
    repeatCount: 1
  },
  powerful: {
    baseSize: 80,
    maxSize: 200,
    duration: 2,
    repeatCount: 2
  },
  mythic: {
    baseSize: 100,
    maxSize: 300,
    duration: 3,
    repeatCount: 3
  }
};

const BoardRippleEffect: React.FC<BoardRippleEffectProps> = ({
  position,
  element = 'neutral',
  strength = 'normal'
}) => {
  const [ripples, setRipples] = useState<number[]>([]);
  
  // Set up the ripple effect
  useEffect(() => {
    // Create the number of ripples based on strength
    const { repeatCount } = effectParams[strength];
    setRipples(Array.from({ length: repeatCount }, (_, i) => i));
    
    // Clean up after animation completes
    const timeout = setTimeout(() => {
      setRipples([]);
    }, effectParams[strength].duration * 1000 + 500);
    
    return () => clearTimeout(timeout);
  }, [strength]);
  
  // Get colors based on element
  const colors = elementColors[element as keyof typeof elementColors] || elementColors.neutral;
  
  // Get size and duration based on strength
  const { baseSize, maxSize, duration } = effectParams[strength];
  
  return (
    <>
      {ripples.map((ripple, index) => (
        <motion.div
          key={`ripple-${index}`}
          className="ripple-effect absolute rounded-full pointer-events-none"
          style={{
            position: 'absolute',
            top: position.y,
            left: position.x,
            translateX: '-50%',
            translateY: '-50%',
            background: `radial-gradient(circle, ${colors.tertiary} 0%, ${colors.secondary} 50%, ${colors.primary} 100%)`,
            zIndex: 10
          }}
          initial={{ 
            width: baseSize,
            height: baseSize,
            opacity: 0.8,
            boxShadow: `0 0 10px ${colors.primary}, 0 0 5px ${colors.secondary}`
          }}
          animate={{ 
            width: maxSize,
            height: maxSize,
            opacity: 0,
            boxShadow: `0 0 30px ${colors.primary}, 0 0 15px ${colors.secondary}`
          }}
          transition={{ 
            duration: duration,
            ease: 'easeOut',
            delay: index * 0.2 // Stagger multiple ripples
          }}
        />
      ))}
    </>
  );
};

export default BoardRippleEffect;