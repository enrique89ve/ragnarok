/**
 * CardDragLayer Component
 * 
 * This component handles the smooth animation of cards when played or moved between areas.
 * It creates a "floating" card that animates from start to target position
 * with a CCG-style curved motion path and rotation.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CardInstance } from '../types';
import { Position } from '../types/Position';
import SimpleCard, { SimpleCardData } from './SimpleCard';

interface CardDragLayerProps {
  card: CardInstance | null;
  startPosition: Position | null;
  targetPosition: Position | null;
  isAnimating: boolean;
  onAnimationComplete: () => void;
}

/**
 * CardDragLayer handles the smooth animation of cards between positions
 * It creates a "floating" card that moves from start to target position
 * with a CCG-style curved motion path and rotation
 */
export const CardDragLayer: React.FC<CardDragLayerProps> = ({
  card,
  startPosition,
  targetPosition,
  isAnimating,
  onAnimationComplete
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [position, setPosition] = useState<Position | null>(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(1);
  
  // Animation parameters
  const ANIMATION_DURATION = 400; // ms
  const MAX_ROTATION = 15; // degrees
  const MAX_LIFT = 150; // pixels, how high the card arcs
  const startTime = useRef<number | null>(null);
  
  // Reset animation if card is null
  useEffect(() => {
    if (!card) {
      animationRef.current && cancelAnimationFrame(animationRef.current);
      setPosition(null);
    }
  }, [card]);
  
  // Start animation when all conditions are met
  useEffect(() => {
    if (isAnimating && card && startPosition && targetPosition) {
      // Set the starting position
      setPosition(startPosition);
      setRotation(0);
      setScale(1);
      setOpacity(1);
      
      // Start the animation
      startTime.current = null;
      animateCard();
    }
    
    return () => {
      // Clean up animation on unmount
      animationRef.current && cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating, card, startPosition, targetPosition]);
  
  // Animate the card with a curved path and rotation
  const animateCard = () => {
    if (!startPosition || !targetPosition) return;
    
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      
      // Progress goes from 0 to 1 over ANIMATION_DURATION
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      
      // Calculate curved path with easing
      const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const easedProgress = easeInOut(progress);
      
      // Linear interpolation between start and target
      const lerpX = startPosition.x + (targetPosition.x - startPosition.x) * easedProgress;
      const lerpY = startPosition.y + (targetPosition.y - startPosition.y) * easedProgress;
      
      // Add a vertical arc for more natural motion
      // The arc peaks at the middle of the animation (progress = 0.5)
      const arcHeight = MAX_LIFT * Math.sin(progress * Math.PI);
      
      // Set the current position
      setPosition({
        x: lerpX,
        y: lerpY - arcHeight
      });
      
      // Add some rotation for style
      const rotationAngle = MAX_ROTATION * Math.sin(progress * Math.PI);
      setRotation(rotationAngle);
      
      // Scale down slightly as the card approaches its target
      const cardScale = 1 - (progress * 0.2);
      setScale(cardScale);
      
      // Fade out slightly at the end of the animation
      const cardOpacity = progress > 0.8 ? 1 - (progress - 0.8) * 5 : 1;
      setOpacity(cardOpacity);
      
      // Continue the animation if not complete
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        setTimeout(() => {
          onAnimationComplete();
        }, 50); // Small delay to ensure completion
      }
    };
    
    // Start the animation loop
    animationRef.current = requestAnimationFrame(animate);
  };
  
  // Don't render anything if we don't have all needed props
  if (!isAnimating || !card || !position) return null;
  
  // Calculate transform style
  const style: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 1000,
    pointerEvents: 'none',
    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
    opacity: opacity,
    transition: 'none',
    transformOrigin: 'center center'
  };
  
  return (
    <div ref={cardRef} style={style} className="card-drag-layer">
      <SimpleCard
        card={{
          id: card.card.id, name: card.card.name, manaCost: card.card.manaCost ?? 0,
          attack: (card.card as unknown as Record<string, unknown>).attack as number | undefined,
          health: (card.card as unknown as Record<string, unknown>).health as number | undefined,
          description: card.card.description,
          type: (card.card.type ?? 'minion') as SimpleCardData['type'],
          rarity: card.card.rarity as SimpleCardData['rarity'],
          keywords: card.card.keywords,
        }}
        size="small"
      />
    </div>
  );
};