/**
 * EnhancedAttackAnimation.tsx
 * 
 * A component for creating more dynamic and visually impressive attack animations
 * with particle effects, motion, and sound.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Position } from '../animations/AnimationManager';
import { useAudio } from '../../lib/stores/useAudio';

interface EnhancedAttackAnimationProps {
  sourcePosition: Position;
  targetPosition: Position;
  attackValue: number;
  attackerName?: string;
  targetName?: string;
  isSpell?: boolean;
  spellType?: 'fire' | 'frost' | 'arcane' | 'nature' | 'shadow' | 'holy';
  onComplete?: () => void;
}

export const EnhancedAttackAnimation: React.FC<EnhancedAttackAnimationProps> = ({
  sourcePosition,
  targetPosition,
  attackValue,
  attackerName,
  targetName,
  isSpell = false,
  spellType = 'arcane',
  onComplete
}) => {
  const audio = useAudio();
  const [showDamage, setShowDamage] = useState(false);
  const [particles, setParticles] = useState<any[]>([]);
  
  // Calculate the path and distance
  const dx = targetPosition.x - sourcePosition.x;
  const dy = targetPosition.y - sourcePosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Adjust animation properties based on spell type
  let projectileColor = '#ffffff';
  let trailColor = 'rgba(255, 255, 255, 0.6)';
  let impactColor = '#ffffff';
  let animationDuration = 0.5; // in seconds
  
  if (isSpell) {
    switch (spellType) {
      case 'fire':
        projectileColor = '#ff5500';
        trailColor = 'rgba(255, 100, 0, 0.6)';
        impactColor = '#ff9900';
        animationDuration = 0.7;
        break;
      case 'frost':
        projectileColor = '#00ccff';
        trailColor = 'rgba(150, 230, 255, 0.6)';
        impactColor = '#99eeff';
        animationDuration = 0.8;
        break;
      case 'arcane':
        projectileColor = '#cc33ff';
        trailColor = 'rgba(200, 100, 255, 0.5)';
        impactColor = '#dd99ff';
        animationDuration = 0.6;
        break;
      case 'nature':
        projectileColor = '#33cc33';
        trailColor = 'rgba(100, 220, 100, 0.5)';
        impactColor = '#88ff88';
        animationDuration = 0.65;
        break;
      case 'shadow':
        projectileColor = '#660099';
        trailColor = 'rgba(120, 50, 150, 0.5)';
        impactColor = '#9933cc';
        animationDuration = 0.75;
        break;
      case 'holy':
        projectileColor = '#ffcc00';
        trailColor = 'rgba(255, 220, 100, 0.6)';
        impactColor = '#ffffaa';
        animationDuration = 0.6;
        break;
    }
  }
  
  // Generate particles
  useEffect(() => {
    if (isSpell) {
      // Generate trail particles
      const particleCount = Math.min(30, Math.max(10, Math.floor(distance / 15)));
      const newParticles = Array.from({ length: particleCount }).map((_, i) => {
        const size = 3 + Math.random() * 5;
        const spread = isSpell ? 20 : 10; // Spells have wider particle spread
        return {
          id: `particle-${i}`,
          size,
          offsetX: (Math.random() - 0.5) * spread,
          offsetY: (Math.random() - 0.5) * spread,
          delay: (i / particleCount) * animationDuration * 0.8,
          duration: 0.3 + Math.random() * 0.4,
          color: trailColor,
        };
      });
      setParticles(newParticles);
      
      // Play spell cast sound
      if (spellType === 'fire') {
        audio.playSoundEffect('spell_cast');
      } else {
        audio.playSoundEffect('spell');
      }
    } else {
      // Play attack prepare sound
      audio.playSoundEffect('attack_prepare');
    }
    
    // Set impact timing
    const impactTimer = setTimeout(() => {
      setShowDamage(true);
      
      // Play impact sound
      if (isSpell) {
        if (spellType === 'fire') {
          audio.playSoundEffect('fire_impact');
        } else {
          audio.playSoundEffect('spell_impact');
        }
      } else {
        audio.playSoundEffect('damage');
      }
    }, animationDuration * 1000 * 0.8);
    
    // Set completion callback
    const completionTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, animationDuration * 1000 + 800);
    
    return () => {
      clearTimeout(impactTimer);
      clearTimeout(completionTimer);
    };
  }, [sourcePosition, targetPosition, distance, isSpell, spellType, onComplete, audio, animationDuration]);
  
  return (
    <>
      {/* Projectile animation */}
      {isSpell ? (
        <motion.div
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            left: sourcePosition.x - 10,
            top: sourcePosition.y - 10,
            backgroundColor: projectileColor,
            borderRadius: '50%',
            boxShadow: `0 0 15px ${projectileColor}`,
            zIndex: 100
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            x: dx,
            y: dy,
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0]
          }}
          transition={{
            duration: animationDuration,
            ease: "easeInOut"
          }}
        />
      ) : (
        // Melee attack "swoosh" effect
        <motion.div
          style={{
            position: 'absolute',
            width: 70,
            height: 15,
            left: sourcePosition.x - 10,
            top: sourcePosition.y - 7.5,
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,215,0,0.8) 50%, rgba(255,255,255,1) 100%)',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
            borderRadius: '20px',
            transformOrigin: 'left center',
            transform: `rotate(${angle}deg)`,
            zIndex: 100
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            x: dx * 0.7,
            y: dy * 0.7,
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0]
          }}
          transition={{
            duration: animationDuration,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* Spell particles */}
      {isSpell && particles.map(particle => (
        <motion.div
          key={particle.id}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            left: sourcePosition.x - particle.size / 2,
            top: sourcePosition.y - particle.size / 2,
            backgroundColor: particle.color,
            borderRadius: '50%',
            boxShadow: `0 0 ${particle.size}px ${particle.color}`,
            zIndex: 99
          }}
          initial={{ opacity: 0 }}
          animate={{
            x: dx * Math.random(),
            y: dy * Math.random(),
            opacity: [0, 0.8, 0],
            scale: [0.5, 1, 0]
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: "easeOut"
          }}
        />
      ))}
      
      {/* Impact effect */}
      {showDamage && (
        <>
          {/* Impact flash */}
          <motion.div
            style={{
              position: 'absolute',
              width: 50,
              height: 50,
              left: targetPosition.x - 25,
              top: targetPosition.y - 25,
              backgroundColor: impactColor,
              borderRadius: '50%',
              boxShadow: `0 0 20px ${impactColor}`,
              zIndex: 101
            }}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0.2, 1.5, 0]
            }}
            transition={{
              duration: 0.5,
              ease: "easeOut"
            }}
          />
          
          {/* Damage number */}
          {attackValue > 0 && (
            <motion.div
              style={{
                position: 'absolute',
                left: targetPosition.x - 15,
                top: targetPosition.y - 25,
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                textShadow: '0 0 3px #f00, 0 0 5px rgba(0,0,0,0.8)',
                zIndex: 102
              }}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-5, -40],
                scale: [0.5, 1.3, 1]
              }}
              transition={{
                duration: 1.2,
                ease: "easeOut"
              }}
            >
              -{attackValue}
            </motion.div>
          )}
          
          {/* Impact lines */}
          {[...Array(6)].map((_, i) => {
            const lineRotation = i * 60;
            const lineLength = 15 + Math.random() * 10;
            return (
              <motion.div
                key={`impact-line-${i}`}
                style={{
                  position: 'absolute',
                  width: 3,
                  height: lineLength,
                  left: targetPosition.x,
                  top: targetPosition.y,
                  backgroundColor: isSpell ? impactColor : '#ffffff',
                  borderRadius: '2px',
                  transformOrigin: 'center bottom',
                  transform: `rotate(${lineRotation}deg) translateY(-${lineLength / 2}px)`,
                  zIndex: 100
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5]
                }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.02,
                  ease: "easeOut"
                }}
              />
            );
          })}
        </>
      )}
    </>
  );
};

export default EnhancedAttackAnimation;