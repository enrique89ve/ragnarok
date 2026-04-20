/**
 * ParticleEffectsLayer.tsx
 * 
 * A component that manages and renders all particle effects in the game.
 * This layer listens to animation events and renders appropriate particle effects.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Position } from '../animations/AnimationManager';

export type ParticleType = 
  | 'fire'
  | 'frost'
  | 'arcane'
  | 'nature'
  | 'shadow'
  | 'holy'
  | 'death'
  | 'blood'
  | 'confetti'
  | 'smoke';

interface ParticleEffectAnimation {
  id: string;
  type: ParticleType;
  position: Position;
  sourcePosition?: Position;
  targetPosition?: Position;
  spellType?: 'arcane' | 'fire' | 'frost' | 'nature' | 'shadow' | 'holy';
  duration: number;
  particleCount?: number;
  onComplete?: () => void;
}

interface ParticleEffectsLayerProps {
  onEffectComplete?: (id: string) => void;
}

const createFireParticles = (count: number) => {
  return Array.from({ length: count }).map((_, i) => {
    const size = 5 + Math.random() * 15;
    return {
      id: `fire-${i}`,
      size,
      initialX: (Math.random() - 0.5) * 40,
      initialY: (Math.random() - 0.5) * 40,
      moveX: (Math.random() - 0.5) * 60,
      moveY: -(20 + Math.random() * 60),
      opacity: 0.7 + Math.random() * 0.3,
      duration: 0.5 + Math.random() * 1,
      delay: Math.random() * 0.3,
      color: Math.random() > 0.6 
        ? 'rgba(255, 200, 50, 0.8)' 
        : Math.random() > 0.3 
          ? 'rgba(255, 100, 0, 0.8)' 
          : 'rgba(255, 50, 0, 0.8)',
    };
  });
};

const createFrostParticles = (count: number) => {
  return Array.from({ length: count }).map((_, i) => {
    const size = 3 + Math.random() * 8;
    return {
      id: `frost-${i}`,
      size,
      initialX: (Math.random() - 0.5) * 40,
      initialY: (Math.random() - 0.5) * 40,
      moveX: (Math.random() - 0.5) * 60,
      moveY: (Math.random() - 0.5) * 60,
      opacity: 0.5 + Math.random() * 0.5,
      duration: 0.8 + Math.random() * 1.2,
      delay: Math.random() * 0.5,
      color: Math.random() > 0.6 
        ? 'rgba(200, 240, 255, 0.8)' 
        : Math.random() > 0.3 
          ? 'rgba(150, 210, 255, 0.8)' 
          : 'rgba(100, 180, 255, 0.8)',
    };
  });
};

const createArcaneParticles = (count: number) => {
  return Array.from({ length: count }).map((_, i) => {
    const size = 2 + Math.random() * 6;
    return {
      id: `arcane-${i}`,
      size,
      initialX: (Math.random() - 0.5) * 30,
      initialY: (Math.random() - 0.5) * 30,
      moveX: (Math.random() - 0.5) * 80,
      moveY: (Math.random() - 0.5) * 80,
      opacity: 0.7 + Math.random() * 0.3,
      duration: 0.5 + Math.random() * 1,
      delay: Math.random() * 0.3,
      color: Math.random() > 0.5 
        ? 'rgba(170, 70, 240, 0.8)' 
        : 'rgba(230, 170, 255, 0.8)',
    };
  });
};

const createDeathParticles = (count: number) => {
  return Array.from({ length: count }).map((_, i) => {
    const size = 3 + Math.random() * 7;
    return {
      id: `death-${i}`,
      size,
      initialX: (Math.random() - 0.5) * 50,
      initialY: (Math.random() - 0.5) * 50,
      moveX: (Math.random() - 0.5) * 100,
      moveY: (Math.random() * 50) + 20,
      opacity: 0.5 + Math.random() * 0.5,
      duration: 1 + Math.random() * 1.5,
      delay: Math.random() * 0.5,
      color: Math.random() > 0.6 
        ? 'rgba(70, 70, 70, 0.8)' 
        : Math.random() > 0.3 
          ? 'rgba(30, 30, 30, 0.8)' 
          : 'rgba(10, 10, 10, 0.8)',
    };
  });
};

export const ParticleEffectsLayer: React.FC<ParticleEffectsLayerProps> = ({ onEffectComplete }) => {
  const [effects, setEffects] = useState<ParticleEffectAnimation[]>([]);

  const addEffect = (effect: ParticleEffectAnimation) => {
    setEffects(prevEffects => [...prevEffects, effect]);
    
    // Set up automatic cleanup after duration
    setTimeout(() => {
      setEffects(prevEffects => 
        prevEffects.filter(e => e.id !== effect.id)
      );
      
      if (effect.onComplete) {
        effect.onComplete();
      }
      
      if (onEffectComplete) {
        onEffectComplete(effect.id);
      }
    }, effect.duration);
  };

  const renderParticles = (effect: ParticleEffectAnimation) => {
    const { type, position, particleCount = 30 } = effect;
    
    let particles;
    
    switch (type) {
      case 'fire':
        particles = createFireParticles(particleCount);
        break;
      case 'frost':
        particles = createFrostParticles(particleCount);
        break;
      case 'arcane':
        particles = createArcaneParticles(particleCount);
        break;
      case 'death':
        particles = createDeathParticles(particleCount);
        break;
      // Add more particle type generators as needed
      default:
        particles = createFireParticles(particleCount); // Default to fire
    }
    
    return (
      <div 
        key={effect.id}
        style={{ 
          position: 'absolute', 
          left: position.x, 
          top: position.y, 
          width: 0, 
          height: 0 
        }}
      >
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            style={{
              position: 'absolute',
              width: particle.size,
              height: particle.size,
              borderRadius: '50%',
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size/2}px ${particle.color}`,
              left: -particle.size / 2 + particle.initialX,
              top: -particle.size / 2 + particle.initialY,
              opacity: 0,
            }}
            animate={{
              x: particle.moveX,
              y: particle.moveY,
              opacity: [0, particle.opacity, 0],
              scale: type === 'fire' ? [1, 1.5, 0.8, 0] : [0, 1, 0.5, 0]
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: 'easeOut'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="particle-effects-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000 }}>
      {effects.map(effect => renderParticles(effect))}
    </div>
  );
};

export default ParticleEffectsLayer;