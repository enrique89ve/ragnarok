/**
 * ElementalAttackTrail.tsx
 * 
 * Creates class-specific custom particle trails for attack animations.
 * This component adds visual flair to attack animations with particles
 * that follow the attack path and match the class theme.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position } from '../types';

interface ElementalAttackTrailProps {
  sourcePosition: Position;
  targetPosition: Position;
  classType?: 'Warrior' | 'Mage' | 'Druid' | 'Hunter' | 'Paladin' | 'Priest' | 'Rogue' | 'Shaman' | 'Warlock' | 'Neutral';
  duration?: number;
  onComplete?: () => void;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  delay: number;
  size: number;
  opacity: number;
}

const ElementalAttackTrail: React.FC<ElementalAttackTrailProps> = ({
  sourcePosition,
  targetPosition,
  classType = 'Neutral',
  duration = 0.8,
  onComplete
}) => {
  const [isActive, setIsActive] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Get class-specific trail properties
  const getTrailProperties = () => {
    switch(classType) {
      case 'Warrior':
        return {
          colors: ['#FF6B4A', '#FFD700'],
          particleCount: 20,
          particleLifespan: 0.5,
          particleSize: { min: 4, max: 10 },
          blurAmount: 2,
          motionPath: 'straight'
        };
      case 'Mage':
        return {
          colors: ['#4AA7FF', '#00FFFF', '#0066FF'],
          particleCount: 25,
          particleLifespan: 0.7,
          particleSize: { min: 3, max: 8 },
          blurAmount: 4,
          motionPath: 'wavy'
        };
      case 'Druid':
        return {
          colors: ['#7CFF4A', '#00CC00', '#A0D758'],
          particleCount: 18,
          particleLifespan: 0.9,
          particleSize: { min: 5, max: 12 },
          blurAmount: 1,
          motionPath: 'spiral'
        };
      case 'Hunter':
        return {
          colors: ['#A67C52', '#8B4513', '#D2B48C'],
          particleCount: 15,
          particleLifespan: 0.6,
          particleSize: { min: 2, max: 7 },
          blurAmount: 0,
          motionPath: 'straight'
        };
      case 'Paladin':
        return {
          colors: ['#FFD700', '#FFFFE0', '#F8F8FF'],
          particleCount: 22,
          particleLifespan: 0.8,
          particleSize: { min: 4, max: 9 },
          blurAmount: 5,
          motionPath: 'holy'
        };
      case 'Priest':
        return {
          colors: ['#FFFFFF', '#E6E6FA', '#F0F8FF'],
          particleCount: 20,
          particleLifespan: 0.9,
          particleSize: { min: 3, max: 8 },
          blurAmount: 6,
          motionPath: 'holy'
        };
      case 'Rogue':
        return {
          colors: ['#A020F0', '#301934', '#483248'],
          particleCount: 15,
          particleLifespan: 0.4,
          particleSize: { min: 2, max: 6 },
          blurAmount: 1,
          motionPath: 'zigzag'
        };
      case 'Shaman':
        return {
          colors: ['#0000FF', '#191970', '#4169E1'],
          particleCount: 18,
          particleLifespan: 0.7,
          particleSize: { min: 4, max: 10 },
          blurAmount: 3,
          motionPath: 'lightning'
        };
      case 'Warlock':
        return {
          colors: ['#8A2BE2', '#4B0082', '#9932CC'],
          particleCount: 22,
          particleLifespan: 0.8,
          particleSize: { min: 3, max: 9 },
          blurAmount: 4,
          motionPath: 'wavy'
        };
      default: // Neutral
        return {
          colors: ['#CD7F32', '#E5AA70', '#F0E68C'],
          particleCount: 15,
          particleLifespan: 0.6,
          particleSize: { min: 3, max: 8 },
          blurAmount: 2,
          motionPath: 'straight'
        };
    }
  };

  // Initialize particles
  useEffect(() => {
    const props = getTrailProperties();
    const newParticles: Particle[] = [];
    
    // Calculate path direction vector
    const dx = targetPosition.x - sourcePosition.x;
    const dy = targetPosition.y - sourcePosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    // Generate particles along the path
    for (let i = 0; i < props.particleCount; i++) {
      const pathPosition = Math.random(); // 0 to 1 position along the path
      const perpDistance = props.motionPath === 'straight' ? 0 : 
                          (Math.random() - 0.5) * 30; // Deviation from straight path
      
      // Position particles along and around the path
      let x = sourcePosition.x + dx * pathPosition;
      let y = sourcePosition.y + dy * pathPosition;
      
      // Add variation based on motion path
      if (props.motionPath === 'wavy') {
        x += Math.sin(pathPosition * Math.PI * 4) * 15;
        y += Math.cos(pathPosition * Math.PI * 4) * 15;
      } else if (props.motionPath === 'zigzag') {
        const zigzag = (pathPosition * 10) % 1 > 0.5 ? 1 : -1;
        x += zigzag * 10;
      } else if (props.motionPath === 'spiral') {
        const angle = pathPosition * Math.PI * 6;
        x += Math.sin(angle) * 15 * pathPosition;
        y += Math.cos(angle) * 15 * pathPosition;
      } else if (props.motionPath === 'holy') {
        // Holy particles emanate outward
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 20;
        x += Math.sin(angle) * distance;
        y += Math.cos(angle) * distance;
      } else if (props.motionPath === 'lightning') {
        // Lightning-like jagged path
        if (i % 3 === 0) {
          x += (Math.random() - 0.5) * 30;
          y += (Math.random() - 0.5) * 30;
        }
      }
      
      newParticles.push({
        id: `particle-${i}`,
        x,
        y,
        delay: Math.random() * 0.3, // Stagger particle appearance
        size: props.particleSize.min + Math.random() * (props.particleSize.max - props.particleSize.min),
        opacity: 0.5 + Math.random() * 0.5
      });
    }
    
    setParticles(newParticles);
    
    // Clean up animation after duration
    const timer = setTimeout(() => {
      setIsActive(false);
      if (onComplete) {
        setTimeout(onComplete, 300); // Add a small buffer after animation ends
      }
    }, duration * 1000);
    
    return () => clearTimeout(timer);
  }, [sourcePosition, targetPosition, classType, duration, onComplete]);
  
  const trailProps = getTrailProperties();
  
  return (
    <AnimatePresence>
      {isActive && (
        <div className="elemental-attack-trail" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}>
          {particles.map((particle) => {
            const colorIndex = Math.floor(Math.random() * trailProps.colors.length);
            return (
              <motion.div
                key={particle.id}
                initial={{ 
                  opacity: 0,
                  x: particle.x,
                  y: particle.y,
                  scale: 0
                }}
                animate={{ 
                  opacity: particle.opacity,
                  scale: 1,
                  filter: `blur(${trailProps.blurAmount}px)`
                }}
                exit={{ 
                  opacity: 0,
                  scale: 0
                }}
                transition={{ 
                  delay: particle.delay,
                  duration: trailProps.particleLifespan * Math.random() + 0.3
                }}
                style={{
                  position: 'absolute',
                  width: particle.size,
                  height: particle.size,
                  borderRadius: '50%',
                  backgroundColor: trailProps.colors[colorIndex],
                  boxShadow: `0 0 ${particle.size * 2}px ${trailProps.colors[colorIndex]}`
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
};

export default ElementalAttackTrail;