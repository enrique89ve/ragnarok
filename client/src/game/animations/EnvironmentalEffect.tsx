/**
 * EnvironmentalEffect.tsx
 * 
 * Renders class and rarity-specific environmental effects that
 * enhance the atmosphere based on cards in play.
 * This creates a cinematic experience when high-value cards
 * (especially legendary and epic) are drawn or played.
 */

import React, { useEffect, useState, useRef } from 'react';
import { CardData } from '../types';
import { useAudio } from '../../lib/stores/useAudio';
import gsap from 'gsap';

interface EnvironmentalEffectProps {
  card: CardData;
  duration?: number; // in seconds
  intensity?: 'low' | 'medium' | 'high';
  onComplete?: () => void;
}

const EnvironmentalEffect: React.FC<EnvironmentalEffectProps> = ({
  card,
  duration = 3,
  intensity = 'medium',
  onComplete
}) => {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const { playSoundEffect } = useAudio();
  
  // Map card classes to color schemes and effect types
  const getClassColorScheme = () => {
    const className = (card.class || card.heroClass || 'Neutral').toLowerCase();
    
    switch (className) {
      case 'warrior':
        return {
          primary: '#c0392b', // Dark red
          secondary: '#e74c3c', // Light red
          glow: 'rgba(192, 57, 43, 0.4)',
          particles: 'weapon',
          sound: 'warrior_effect'
        };
      case 'mage':
        return {
          primary: '#2980b9', // Dark blue
          secondary: '#3498db', // Light blue
          glow: 'rgba(41, 128, 185, 0.4)',
          particles: 'arcane',
          sound: 'mage_effect'
        };
      case 'priest':
        return {
          primary: '#f39c12', // Gold
          secondary: '#f1c40f', // Yellow
          glow: 'rgba(243, 156, 18, 0.4)',
          particles: 'holy',
          sound: 'priest_effect'
        };
      case 'warlock':
        return {
          primary: '#8e44ad', // Dark purple
          secondary: '#9b59b6', // Light purple
          glow: 'rgba(142, 68, 173, 0.4)',
          particles: 'shadow',
          sound: 'warlock_effect'
        };
      case 'rogue':
        return {
          primary: '#2c3e50', // Dark blue-gray
          secondary: '#34495e', // Light blue-gray
          glow: 'rgba(44, 62, 80, 0.4)',
          particles: 'poison',
          sound: 'rogue_effect'
        };
      case 'druid':
        return {
          primary: '#27ae60', // Dark green
          secondary: '#2ecc71', // Light green
          glow: 'rgba(39, 174, 96, 0.4)',
          particles: 'nature',
          sound: 'druid_effect'
        };
      case 'hunter':
        return {
          primary: '#16a085', // Dark teal
          secondary: '#1abc9c', // Light teal
          glow: 'rgba(22, 160, 133, 0.4)',
          particles: 'beast',
          sound: 'hunter_effect'
        };
      case 'shaman':
        return {
          primary: '#2980b9', // Blue
          secondary: '#3498db', // Light blue
          glow: 'rgba(41, 128, 185, 0.4)',
          particles: 'elemental',
          sound: 'shaman_effect'
        };
      case 'paladin':
        return {
          primary: '#f39c12', // Gold
          secondary: '#f1c40f', // Yellow
          glow: 'rgba(243, 156, 18, 0.4)',
          particles: 'divine',
          sound: 'paladin_effect'
        };
      case 'necromancer':
        return {
          primary: '#7f8c8d', // Dark gray
          secondary: '#95a5a6', // Light gray
          glow: 'rgba(127, 140, 141, 0.4)',
          particles: 'undead',
          sound: 'necromancer_effect'
        };
      default: // Neutral
        return {
          primary: '#7f8c8d', // Dark gray
          secondary: '#95a5a6', // Light gray
          glow: 'rgba(127, 140, 141, 0.3)',
          particles: 'neutral',
          sound: 'neutral_effect'
        };
    }
  };
  
  // Apply intensity multiplier to effect strength
  const getIntensityMultiplier = () => {
    switch (intensity) {
      case 'low': return 0.5;
      case 'high': return 1.5;
      default: return 1.0; // medium
    }
  };
  
  // Further enhance effects for rare/epic/legendary cards
  const getRarityBoost = () => {
    if (!card.rarity) return 1.0;
    
    switch (card.rarity.toLowerCase()) {
      case 'mythic': return 2.0;
      case 'epic': return 1.5;
      case 'rare': return 1.2;
      default: return 1.0; // common
    }
  };
  
  // Calculate final effect intensity
  const effectIntensity = getIntensityMultiplier() * getRarityBoost();
  
  // Get color scheme based on card class
  const colorScheme = getClassColorScheme();
  
  // Get particle shapes based on card class
  const getParticleShapes = () => {
    const shapes = [];
    const particleType = colorScheme.particles;
    
    switch (particleType) {
      case 'weapon':
        shapes.push('M0,0 L10,0 L15,20 L5,20 Z'); // Sword
        shapes.push('M10,0 L20,0 L15,20 L5,20 Z'); // Axe
        break;
      case 'arcane':
        shapes.push('M0,0 L20,0 L20,20 L0,20 Z'); // Square
        shapes.push('M10,0 L20,10 L10,20 L0,10 Z'); // Diamond
        break;
      case 'holy':
        shapes.push('M10,0 L13,7 L20,7 L15,12 L17,20 L10,15 L3,20 L5,12 L0,7 L7,7 Z'); // Star
        shapes.push('M8,0 L12,0 L12,8 L20,8 L20,12 L12,12 L12,20 L8,20 L8,12 L0,12 L0,8 L8,8 Z'); // Cross
        break;
      case 'shadow':
        shapes.push('M5,0 A5,5 0 1,0 15,0 A5,5 0 1,0 5,0 Z'); // Circle
        shapes.push('M0,10 A10,10 0 1,0 20,10 A10,10 0 1,0 0,10 Z'); // Larger circle
        break;
      case 'poison':
        shapes.push('M10,0 L20,10 L10,20 L0,10 Z'); // Diamond
        shapes.push('M5,0 L15,0 L20,10 L15,20 L5,20 L0,10 Z'); // Hexagon
        break;
      case 'nature':
        shapes.push('M0,10 C0,0 20,0 20,10 C20,20 0,20 0,10 Z'); // Leaf
        shapes.push('M10,0 L13,7 L20,7 L15,12 L17,20 L10,15 L3,20 L5,12 L0,7 L7,7 Z'); // Star
        break;
      case 'beast':
        shapes.push('M0,0 L20,0 L20,10 L10,20 L0,10 Z'); // Arrowhead
        shapes.push('M0,5 L5,0 L15,0 L20,5 L20,15 L15,20 L5,20 L0,15 Z'); // Octagon
        break;
      case 'elemental':
        shapes.push('M0,0 L20,0 L10,20 Z'); // Triangle
        shapes.push('M10,0 L20,20 L0,20 Z'); // Inverted triangle
        break;
      case 'divine':
        shapes.push('M10,0 L13,7 L20,7 L15,12 L17,20 L10,15 L3,20 L5,12 L0,7 L7,7 Z'); // Star
        shapes.push('M8,0 L12,0 L12,8 L20,8 L20,12 L12,12 L12,20 L8,20 L8,12 L0,12 L0,8 L8,8 Z'); // Cross
        break;
      case 'undead':
        shapes.push('M5,0 L15,0 L20,10 L15,20 L5,20 L0,10 Z'); // Hexagon
        shapes.push('M0,0 L20,0 L15,10 L20,20 L0,20 L5,10 Z'); // Bone shape
        break;
      default: // neutral
        shapes.push('M0,0 L20,0 L20,20 L0,20 Z'); // Square
        shapes.push('M0,0 L20,0 L10,20 Z'); // Triangle
        break;
    }
    
    return shapes;
  };
  
  // Effect initialization
  useEffect(() => {
    if (!containerRef.current) return;

    const timelines: gsap.core.Timeline[] = [];

    // Play the corresponding class sound effect
    playSoundEffect('spell_cast');

    // Create particles
    if (particlesRef.current) {
      const particles = particlesRef.current;
      particles.innerHTML = '';

      // Number of particles scaled by intensity
      const particleCount = Math.floor(20 * effectIntensity);
      const shapes = getParticleShapes();

      // Create particles
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('environmental-particle');

        // Randomize particle properties
        const size = Math.random() * 30 + 10;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const opacity = Math.random() * 0.7 + 0.3;
        const rotation = Math.random() * 360;
        const delay = Math.random() * 0.8;

        // Select random shape for the particle
        const shapeIndex = Math.floor(Math.random() * shapes.length);

        // Create SVG with the shape
        particle.innerHTML = `
          <svg width="${size}" height="${size}" viewBox="0 0 20 20">
            <path d="${shapes[shapeIndex]}" fill="${Math.random() > 0.5 ? colorScheme.primary : colorScheme.secondary}"
                  opacity="${opacity}" />
          </svg>
        `;

        // Set particle style
        particle.style.position = 'absolute';
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.opacity = '0';
        particle.style.transform = `rotate(${rotation}deg)`;
        particle.style.filter = `blur(${Math.random() * 2}px) drop-shadow(0 0 ${Math.random() * 10 + 5}px ${colorScheme.primary})`;
        particles.appendChild(particle);

        // Animate the particle
        const particleTl = gsap.timeline()
          .fromTo(particle,
            { opacity: 0, scale: 0 },
            { opacity, scale: 1, duration: 0.4, delay }
          )
          .to(particle, {
            x: (Math.random() - 0.5) * 400 * effectIntensity,
            y: (Math.random() - 0.5) * 400 * effectIntensity,
            rotation: rotation + (Math.random() * 180 - 90),
            opacity: 0,
            duration: duration * 0.8,
            ease: 'power1.out'
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
      .to(containerRef.current, { opacity: 0, duration: 0.5, delay: duration - 0.5 })
      .call(() => {
        setVisible(false);
        if (onComplete) onComplete();
      });
    timelines.push(containerTl);

    return () => {
      timelines.forEach(tl => tl.kill());
    };

  }, [card, duration, intensity, effectIntensity, colorScheme, onComplete, playSoundEffect]);

  if (!visible) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-40"
      style={{ 
        background: `radial-gradient(circle, ${colorScheme.glow} 0%, rgba(0,0,0,0) 70%)` 
      }}
    >
      {/* Particles container */}
      <div 
        ref={particlesRef}
        className="absolute inset-0"
      />
      
      {/* Class-specific environmental overlay */}
      <div className="absolute inset-0" 
        style={{ 
          boxShadow: `inset 0 0 ${50 * effectIntensity}px ${colorScheme.glow}`
        }} 
      />
    </div>
  );
};

export default EnvironmentalEffect;