/**
 * CardPlacementEffect Component
 * 
 * This creates a burst of particles/sparkles when a card is successfully
 * placed on the board.
 */
import React, { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
  type: 'circle' | 'star' | 'diamond';
}

interface CardPlacementEffectProps {
  x: number;
  y: number;
  isLegendary?: boolean;
  isPremium?: boolean;
  particleCount?: number;
  particleColors?: string[];
  onComplete?: () => void;
}

const CardPlacementEffect: React.FC<CardPlacementEffectProps> = ({ 
  x, 
  y, 
  isLegendary = false,
  isPremium = false,
  particleCount,
  particleColors,
  onComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas to be fullscreen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Create particles
    particlesRef.current = [];
    
    // Number of particles depends on rarity and passed props
    const numParticles = particleCount || (isLegendary ? 100 : isPremium ? 70 : 40);
    
    // Color palette for different card types
    const regularColors = ['#fff8e0', '#ffe060', '#ffb900', '#ffd700'];
    const legendaryColors = ['#fffacd', '#ffd700', '#daa520', '#ffb90f', '#ffdf00'];
    const premiumColors = ['#b388ff', '#9575cd', '#7e57c2', '#d1c4e9', '#ffffff'];
    
    // Select color palette based on card rarity or use provided colors
    const colors = particleColors || 
      (isLegendary ? legendaryColors : 
       isPremium ? premiumColors : regularColors);
    
    // Create a more complex burst pattern
    const burstAngles = 12; // Create particles in these many directions
    
    for (let i = 0; i < numParticles; i++) {
      // Create more structured pattern for mythic/premium cards
      let angle;
      
      if (isLegendary || isPremium) {
        // For special cards, create some particles in a structured pattern
        // and others in a random pattern for a more dramatic effect
        if (i < numParticles * 0.6) { // 60% structured
          const burstIndex = Math.floor(i % burstAngles);
          angle = (burstIndex / burstAngles) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
        } else { // 40% random
          angle = Math.random() * Math.PI * 2;
        }
      } else {
        // For regular cards, use a simpler random pattern
        angle = Math.random() * Math.PI * 2;
      }
      
      // Random speed - varies by card quality
      const speed = isLegendary ? 
        2.5 + Math.random() * 5 : // Fastest for mythic
        isPremium ?
        2 + Math.random() * 4 : // Faster for premium
        1 + Math.random() * 3;  // Standard for regular
      
      // Particle types - distribution varies by card quality
      let types: ('circle' | 'star' | 'diamond')[];
      
      if (isLegendary) {
        types = ['star', 'star', 'diamond', 'circle']; // More stars and diamonds for mythic
      } else if (isPremium) {
        types = ['star', 'diamond', 'circle', 'circle']; // More diamonds for premium
      } else {
        types = ['circle', 'circle', 'star', 'diamond']; // More circles for regular
      }
      
      particlesRef.current.push({
        x: x,
        y: y,
        size: 3 + Math.random() * 5,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed - 1, // Slight upward bias
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 0.8 + Math.random() * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: types[Math.floor(Math.random() * types.length)]
      });
    }
    
    // Start animation
    startTimeRef.current = performance.now();
    
    const animate = (time: number) => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate elapsed time
      const elapsed = time - startTimeRef.current;
      // Longer effect for special cards
      const duration = isLegendary ? 1500 : isPremium ? 1300 : 1000;
      
      // Check if animation should end
      if (elapsed > duration) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        // Fire onComplete callback
        if (onComplete) onComplete();
        return;
      }
      
      // Animation progress (0 to 1)
      const progress = elapsed / duration;
      
      // Global opacity fades out towards the end
      const globalOpacity = 1 - Math.pow(progress, 2);
      
      // Draw particles
      particlesRef.current.forEach(particle => {
        // Update position with gravity effect
        particle.x += particle.speedX;
        particle.speedY += 0.05; // Gravity
        particle.y += particle.speedY;
        
        // Update rotation
        particle.rotation += particle.rotationSpeed;
        
        // Calculate individual particle opacity - fades as animation progresses
        const particleOpacity = particle.opacity * (1 - Math.pow(progress, 1.5));
        
        // Save canvas state
        ctx.save();
        
        // Translate to particle position
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // Set drawing styles
        ctx.globalAlpha = particleOpacity * globalOpacity;
        ctx.fillStyle = particle.color;
        
        // Draw different particle shapes
        switch (particle.type) {
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
            ctx.fill();
            break;
            
          case 'star':
            drawStar(ctx, 0, 0, 5, particle.size, particle.size / 2);
            break;
            
          case 'diamond':
            ctx.beginPath();
            ctx.moveTo(0, -particle.size);
            ctx.lineTo(particle.size, 0);
            ctx.lineTo(0, particle.size);
            ctx.lineTo(-particle.size, 0);
            ctx.closePath();
            ctx.fill();
            break;
        }
        
        // Restore canvas state
        ctx.restore();
      });
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Helper function to draw star shape
    function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, points: number, outer: number, inner: number) {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = (i * Math.PI) / points;
        const pX = x + radius * Math.sin(angle);
        const pY = y + radius * Math.cos(angle);
        
        if (i === 0) {
          ctx.moveTo(pX, pY);
        } else {
          ctx.lineTo(pX, pY);
        }
      }
      ctx.closePath();
      ctx.fill();
    }
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [x, y, isLegendary, isPremium, particleCount, particleColors, onComplete]);
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9500 /* --z-cinematic */
      }}
    />
  );
};

export default CardPlacementEffect;