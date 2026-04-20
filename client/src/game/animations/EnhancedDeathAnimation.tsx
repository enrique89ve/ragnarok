import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardData, Position } from '../types';
import { proceduralAudio } from '../audio/proceduralAudio';
import { spawnParticleBurst, spawnEmbers, spawnImpactRing, ELEMENT_PALETTES } from './PixiParticleCanvas';

interface EnhancedDeathAnimationProps {
  position: Position;
  card?: CardData;
  onComplete?: () => void;
  duration?: number;
}

const EnhancedDeathAnimation: React.FC<EnhancedDeathAnimationProps> = ({
  position,
  card,
  onComplete,
  duration = 4000, // Default to 4 seconds for slow-motion effect
}) => {
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    
    // Procedural death sound — no audio files needed
    try { proceduralAudio.playCombatSound('shadow_strike', 'dark', 0.8); } catch { /* audio unavailable */ }

    const timer = setTimeout(() => {
      setIsAnimating(false);
      if (onComplete) onComplete();
    }, duration);

    return () => { clearTimeout(timer); };
  }, [card, duration, onComplete]);
  
  // GPU particle bursts via Pixi canvas (replaces 80 DOM particles)
  useEffect(() => {
    const deathPalette = { primary: '#ffd700', secondary: '#ff8c00', glow: 'rgba(255,215,0,0.7)' };
    spawnParticleBurst(position.x, position.y, 60, deathPalette);
    spawnImpactRing(position.x, position.y, deathPalette);
    spawnEmbers(position.x, position.y, 25, deathPalette);
    setTimeout(() => {
      spawnParticleBurst(position.x, position.y, 40, ELEMENT_PALETTES.fire);
      spawnEmbers(position.x, position.y - 20, 15, ELEMENT_PALETTES.fire);
    }, 500);
    setTimeout(() => {
      spawnParticleBurst(position.x, position.y, 20, ELEMENT_PALETTES.neutral);
    }, 1000);
  }, [position.x, position.y]);
  
  return (
    <AnimatePresence>
      {isAnimating && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: position.x - 120, // Center the effect on the card
            top: position.y - 170
          }}
        >
          {/* Card Dissolve Effect */}
          <motion.div
            ref={cardRef}
            initial={{ opacity: 1, scale: 1 }}
            animate={{
              opacity: 0,
              scale: 0.8,
              rotateZ: Math.random() > 0.5 ? 15 : -15
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: duration / 1000, 
              ease: "easeOut" 
            }}
            className="relative w-[240px] h-[340px] rounded-lg overflow-hidden"
          >
            {/* Card image */}
            {cardImage && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${cardImage})`,
                  filter: 'brightness(1.5) contrast(1.2)' // Enhance the glow effect
                }}
              />
            )}
            
            {/* Overlay for the dissolve effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-amber-500 to-amber-200"
              style={{ mixBlendMode: 'overlay', opacity: 0.7 }}
              animate={{
                opacity: [0.7, 0.9, 0]
              }}
              transition={{
                duration: (duration / 1000) * 0.8,
                ease: "easeOut"
              }}
            />
          </motion.div>
          
          {/* Particles handled by Pixi GPU canvas */}
          <div
            className="absolute top-0 left-0 w-[240px] h-[340px]"
            style={{ zIndex: 10 }}
          />
          
          {/* Enhanced Light burst with multiple layers */}
          <motion.div
            className="absolute inset-0 rounded-full bg-amber-100"
            style={{ 
              filter: 'blur(30px)',
              top: '50%',
              left: '50%',
              width: '10px',
              height: '10px',
              marginLeft: '-5px',
              marginTop: '-5px',
              zIndex: 5
            }}
            animate={{
              width: ['10px', '400px'],
              height: ['10px', '400px'],
              marginLeft: ['-5px', '-200px'],
              marginTop: ['-5px', '-200px'],
              opacity: [1, 0]
            }}
            transition={{
              duration: (duration / 1000) * 0.8,
              ease: "easeOut"
            }}
          />
          
          {/* Secondary burst - delayed and different color */}
          <motion.div
            className="absolute inset-0 rounded-full bg-orange-300"
            style={{ 
              filter: 'blur(25px)',
              top: '50%',
              left: '50%',
              width: '5px',
              height: '5px',
              marginLeft: '-2.5px',
              marginTop: '-2.5px',
              zIndex: 6
            }}
            animate={{
              width: ['5px', '350px'],
              height: ['5px', '350px'],
              marginLeft: ['-2.5px', '-175px'],
              marginTop: ['-2.5px', '-175px'],
              opacity: [0, 0.8, 0]
            }}
            transition={{
              duration: (duration / 1000) * 0.7,
              delay: 0.1,
              ease: "easeOut",
              times: [0, 0.3, 1]
            }}
          />
          
          {/* Inner core burst - fastest and brightest */}
          <motion.div
            className="absolute inset-0 rounded-full bg-white"
            style={{ 
              filter: 'blur(15px)',
              top: '50%',
              left: '50%',
              width: '3px',
              height: '3px',
              marginLeft: '-1.5px',
              marginTop: '-1.5px',
              zIndex: 7
            }}
            animate={{
              width: ['3px', '200px'],
              height: ['3px', '200px'],
              marginLeft: ['-1.5px', '-100px'],
              marginTop: ['-1.5px', '-100px'],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: (duration / 1000) * 0.5,
              delay: 0.05,
              ease: "easeOut",
              times: [0, 0.2, 1]
            }}
          />
          
          {/* Enhanced text effect - card name with dramatic animation */}
          {card && (
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 white-space-nowrap z-20"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 2.0],
                y: [0, -50, -70]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: (duration / 1000) * 0.9, 
                times: [0, 0.4, 1],
                ease: "easeOut" 
              }}
              style={{ width: '240px', textAlign: 'center' }}
            >
              {/* Name with enhanced glow */}
              <div 
                className="text-2xl font-bold text-amber-100 whitespace-normal text-center mb-1"
                style={{ 
                  textShadow: '0 0 15px #ffc700, 0 0 25px #ff7b00, 0 0 35px #ff5500',
                  filter: 'brightness(1.7)'
                }}
              >
                {card.name}
              </div>
              
              {/* Death announcement */}
              <motion.div
                className="text-lg text-red-200 font-semibold"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: (duration / 1000) * 0.85,
                  delay: 0.1,
                  times: [0, 0.3, 1]
                }}
                style={{
                  textShadow: '0 0 10px #ff0000, 0 0 15px #aa0000'
                }}
              >
                has perished
              </motion.div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

export default EnhancedDeathAnimation;