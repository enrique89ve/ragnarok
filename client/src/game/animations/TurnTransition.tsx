/**
 * TurnTransition.tsx
 * 
 * A dramatic visual transition between player and opponent turns.
 * This component creates an immersive rune-based animation with 
 * custom particle effects and directional swipe for turn changes.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAudio } from '../../lib/stores/useAudio';
import gsap from 'gsap';

interface TurnTransitionProps {
  isPlayerTurn: boolean;
  onComplete?: () => void;
}

const TurnTransition: React.FC<TurnTransitionProps> = ({ 
  isPlayerTurn, 
  onComplete 
}) => {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const runesRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const { playSoundEffect } = useAudio();

  // Generate Norse-inspired rune shapes
  const runeShapes = [
    'M0,0 L10,20 L20,0 L10,30 Z', // Hagalaz
    'M0,15 L15,0 L30,15 L15,30 Z', // Dagaz
    'M10,0 L0,30 L20,30 Z', // Thurisaz
    'M0,0 L0,30 L20,15 Z', // Ansuz
    'M0,15 L30,15 M15,0 L15,30', // Gebo
    'M0,0 L30,30 M0,30 L30,0', // Algiz
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const timelines: gsap.core.Timeline[] = [];
    const tweens: gsap.core.Tween[] = [];

    // Play the transition sound effect
    playSoundEffect(isPlayerTurn ? 'turn_start' : 'turn_end');

    // Create particles
    if (particlesRef.current) {
      const particles = particlesRef.current;
      particles.innerHTML = '';

      // Create 25 particles
      for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.classList.add('transition-particle');

        // Randomize particle properties
        const size = Math.random() * 16 + 4;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const opacity = Math.random() * 0.7 + 0.3;
        const rotation = Math.random() * 360;
        const delay = Math.random() * 0.5;

        // Create a random rune SVG
        const runeShape = runeShapes[Math.floor(Math.random() * runeShapes.length)];
        particle.innerHTML = `
          <svg width="${size}" height="${size}" viewBox="0 0 30 30">
            <path d="${runeShape}" fill="${isPlayerTurn ? '#3b82f6' : '#f59e0b'}" />
          </svg>
        `;

        // Set particle style
        particle.style.position = 'absolute';
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.opacity = '0';
        particle.style.transform = `rotate(${rotation}deg)`;
        particles.appendChild(particle);

        // Animate the particle
        const particleTl = gsap.timeline()
          .fromTo(particle,
            { opacity: 0, scale: 0 },
            { opacity, scale: 1, duration: 0.4, delay }
          )
          .to(particle, {
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 300,
            rotation: rotation + (Math.random() * 180 - 90),
            opacity: 0,
            duration: 1.2,
            ease: 'power2.out'
          });
        timelines.push(particleTl);
      }
    }

    // Animate the main container
    const containerTl = gsap.timeline()
      .fromTo(containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      )
      .to(containerRef.current, { opacity: 0, duration: 0.5, delay: 1.5 })
      .call(() => {
        setVisible(false);
        if (onComplete) onComplete();
      });
    timelines.push(containerTl);

    // Animate the runes container
    if (runesRef.current) {
      tweens.push(gsap.fromTo(runesRef.current,
        { scale: 0.2, rotation: isPlayerTurn ? -90 : 90 },
        { scale: 1.2, rotation: 0, duration: 0.6, ease: 'back.out' }
      ));
    }

    // Animate the text
    if (textRef.current) {
      tweens.push(gsap.fromTo(textRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.4, delay: 0.3 }
      ));
    }

    return () => {
      timelines.forEach(tl => tl.kill());
      tweens.forEach(tw => tw.kill());
    };
  }, [isPlayerTurn, playSoundEffect, onComplete]);

  if (!visible) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      style={{ 
        background: `radial-gradient(circle, ${isPlayerTurn ? 'rgba(37,99,235,0.3)' : 'rgba(245,158,11,0.3)'} 0%, rgba(0,0,0,0.7) 70%)` 
      }}
    >
      {/* Rune circle container */}
      <div 
        ref={runesRef}
        className="relative w-64 h-64 flex items-center justify-center"
      >
        {/* Rune circle */}
        <div className="absolute inset-0 rounded-full border-4 border-opacity-70"
          style={{ 
            borderColor: isPlayerTurn ? '#3b82f6' : '#f59e0b',
            boxShadow: `0 0 40px ${isPlayerTurn ? 'rgba(59, 130, 246, 0.6)' : 'rgba(245, 158, 11, 0.6)'}` 
          }}
        />
        
        {/* Large central rune */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg width="100%" height="100%" viewBox="0 0 120 120">
            <path 
              d={isPlayerTurn 
                ? 'M60,10 L20,100 L100,100 Z' // Tiwaz (player turn)
                : 'M20,10 L100,10 L60,100 Z'  // Reversed Tiwaz (opponent turn)
              } 
              fill="none" 
              stroke={isPlayerTurn ? '#60a5fa' : '#fbbf24'} 
              strokeWidth="6"
            />
            {isPlayerTurn ? (
              <path d="M60,30 L60,80" stroke="#60a5fa" strokeWidth="6" />
            ) : (
              <path d="M60,30 L60,80 M40,60 L80,60" stroke="#fbbf24" strokeWidth="6" />
            )}
          </svg>
        </div>
        
        {/* Turn text */}
        <div 
          ref={textRef}
          className="absolute mt-40 text-3xl font-bold text-center"
          style={{ color: isPlayerTurn ? '#60a5fa' : '#fbbf24' }}
        >
          {isPlayerTurn ? 'Your Turn' : 'Opponent\'s Turn'}
        </div>
      </div>
      
      {/* Particles container */}
      <div 
        ref={particlesRef}
        className="absolute inset-0"
      />
    </div>
  );
};

export default TurnTransition;