/**
 * LegendaryEntrance.tsx
 * 
 * Creates a cinematic camera movement and visual effect when legendary
 * cards are played. This adds dramatic impact to high-value cards.
 */

import React, { useEffect, useState, useRef } from 'react';
import { CardData, Position } from '../types';
import { useAudio } from '../../lib/stores/useAudio';
import { SimpleCard, SimpleCardData } from '../components/SimpleCard';
import gsap from 'gsap';
import { spawnParticleBurst, spawnImpactRing, spawnEmbers } from './PixiParticleCanvas';

interface LegendaryEntranceProps {
  card: CardData;
  position: Position;
  onComplete?: () => void;
}

const LegendaryEntrance: React.FC<LegendaryEntranceProps> = ({
  card,
  position,
  onComplete
}) => {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const flareRef = useRef<HTMLDivElement>(null);
  const { playSoundEffect } = useAudio();
  
  // Get card-specific effects based on the card class
  const getCardSpecificEffects = (card: CardData) => {
    const className = (card.class || card.heroClass || 'Neutral').toLowerCase();
    
    const baseEffects = {
      glowColor: '#f39c12', // Default golden glow
      particleColor: '#f1c40f',
      soundEffect: 'legendary_entrance'
    };
    
    // Customize based on class
    switch (className) {
      case 'warrior':
        return {
          ...baseEffects,
          glowColor: '#e74c3c',
          particleColor: '#c0392b'
        };
      case 'mage':
        return {
          ...baseEffects,
          glowColor: '#3498db',
          particleColor: '#2980b9'
        };
      case 'priest':
        return {
          ...baseEffects,
          glowColor: '#f39c12',
          particleColor: '#f1c40f'
        };
      case 'warlock':
        return {
          ...baseEffects,
          glowColor: '#9b59b6',
          particleColor: '#8e44ad'
        };
      case 'rogue':
        return {
          ...baseEffects,
          glowColor: '#34495e',
          particleColor: '#2c3e50'
        };
      case 'druid':
        return {
          ...baseEffects,
          glowColor: '#2ecc71',
          particleColor: '#27ae60'
        };
      case 'hunter':
        return {
          ...baseEffects,
          glowColor: '#1abc9c',
          particleColor: '#16a085'
        };
      case 'shaman':
        return {
          ...baseEffects,
          glowColor: '#3498db',
          particleColor: '#2980b9'
        };
      case 'paladin':
        return {
          ...baseEffects,
          glowColor: '#f39c12',
          particleColor: '#f1c40f'
        };
      case 'necromancer':
        return {
          ...baseEffects,
          glowColor: '#95a5a6',
          particleColor: '#7f8c8d'
        };
      default:
        return baseEffects;
    }
  };
  
  const cardEffects = getCardSpecificEffects(card);
  
  useEffect(() => {
    if (!containerRef.current) return;

    const timelines: gsap.core.Timeline[] = [];
    const tweens: gsap.core.Tween[] = [];
    const timeouts: number[] = [];

    // Play legendary entrance sound
    playSoundEffect('legendary_entrance');

    // Create camera movement effect
    if (containerRef.current) {
      // First zoom out
      tweens.push(gsap.fromTo(containerRef.current,
        {
          background: 'rgba(0,0,0,0)',
          backdropFilter: 'blur(0px)'
        },
        {
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          duration: 0.8
        }
      ));
    }

    // Animate the card
    if (cardRef.current) {
      const cardTl = gsap.timeline()
        .fromTo(cardRef.current,
          {
            opacity: 0,
            scale: 0.7,
            x: position.x - window.innerWidth / 2,
            y: position.y - window.innerHeight / 2,
            rotation: -15
          },
          {
            opacity: 1,
            scale: 1.8,
            x: 0,
            y: 0,
            rotation: 0,
            duration: 1,
            ease: 'power2.out'
          }
        )
        .to(cardRef.current, {
          scale: 0.9,
          opacity: 0,
          y: 100,
          duration: 0.8,
          delay: 1.5,
          ease: 'back.in'
        });
      timelines.push(cardTl);
    }

    // Animate the light flare
    if (flareRef.current) {
      const flareTl = gsap.timeline()
        .fromTo(flareRef.current,
          {
            opacity: 0,
            scale: 0.1
          },
          {
            opacity: 0.8,
            scale: 1.5,
            duration: 0.7,
            delay: 0.3,
            ease: 'power2.out'
          }
        )
        .to(flareRef.current, {
          opacity: 0,
          scale: 2.5,
          duration: 1,
          delay: 0.2
        });
      timelines.push(flareTl);
    }

    // GPU particle bursts via Pixi canvas
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const palette = { primary: cardEffects.glowColor, secondary: cardEffects.particleColor, glow: `${cardEffects.glowColor}99` };
    spawnParticleBurst(cx, cy, 60, palette);
    spawnImpactRing(cx, cy, palette);
    timeouts.push(window.setTimeout(() => {
      spawnParticleBurst(cx, cy, 40, palette);
      spawnEmbers(cx, cy, 25, palette);
    }, 500));
    timeouts.push(window.setTimeout(() => {
      spawnParticleBurst(cx, cy, 30, palette);
    }, 1000));

    // Close the effect after animation completes
    const delayedCall = gsap.delayedCall(4, () => {
      if (containerRef.current) {
        const closeTween = gsap.to(containerRef.current, {
          background: 'rgba(0,0,0,0)',
          backdropFilter: 'blur(0px)',
          duration: 0.5,
          onComplete: () => {
            setVisible(false);
            if (onComplete) onComplete();
          }
        });
        tweens.push(closeTween);
      }
    });

    return () => {
      timelines.forEach(tl => tl.kill());
      tweens.forEach(tw => tw.kill());
      timeouts.forEach(t => clearTimeout(t));
      delayedCall.kill();
    };
  }, [card, position, playSoundEffect, onComplete, cardEffects]);
  
  if (!visible) return null;
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none transition-all duration-500"
      style={{ backdropFilter: 'blur(0px)' }}
    >
      {/* Card display - real card component */}
      <div ref={cardRef} className="relative">
        <div style={{ boxShadow: `0 0 40px ${cardEffects.glowColor}, 0 0 80px ${cardEffects.glowColor}55` }}>
          <SimpleCard
            card={card as unknown as SimpleCardData}
            size="preview"
            showDescription
          />
        </div>
        
        {/* Light flare */}
        <div 
          ref={flareRef}
          className="absolute inset-0 opacity-0 rounded-lg"
          style={{ 
            background: `radial-gradient(circle, ${cardEffects.glowColor}66 0%, rgba(0,0,0,0) 70%)`,
            transform: 'scale(1.5)'
          }}
        />
      </div>
      
      {/* Particles handled by Pixi GPU canvas */}
    </div>
  );
};

export default LegendaryEntrance;