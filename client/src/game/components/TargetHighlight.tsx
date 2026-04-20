/**
 * TargetHighlight Component
 * 
 * This component adds a visual highlight to valid targets when casting spells
 * It makes the valid targets glow and adds a subtle pulsing effect
 */
import React, { useRef, useEffect } from 'react';

interface TargetHighlightProps {
  targetRef: React.RefObject<HTMLElement>;
  isActive: boolean;
  color?: string;
}

const TargetHighlight: React.FC<TargetHighlightProps> = ({
  targetRef,
  isActive,
  color = 'rgba(255, 215, 0, 0.7)' // Golden color by default
}) => {
  const requestRef = useRef<number>();
  const highlightRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isActive || !targetRef.current || !highlightRef.current) {
      return;
    }
    
    // Function to position and size the highlight
    const updateHighlight = () => {
      if (!targetRef.current || !highlightRef.current) return;
      
      const rect = targetRef.current.getBoundingClientRect();
      
      // Set position and size
      highlightRef.current.style.left = `${rect.left}px`;
      highlightRef.current.style.top = `${rect.top}px`;
      highlightRef.current.style.width = `${rect.width}px`;
      highlightRef.current.style.height = `${rect.height}px`;
      
      // Create pulsing animation
      const time = Date.now() / 1000;
      const pulseFactor = 0.7 + Math.sin(time * 3) * 0.3;
      
      // Apply pulse to box shadow and opacity
      highlightRef.current.style.boxShadow = `0 0 ${15 * pulseFactor}px ${10 * pulseFactor}px ${color}`;
      highlightRef.current.style.opacity = `${0.6 + pulseFactor * 0.4}`;
      
      // Continue animation
      requestRef.current = requestAnimationFrame(updateHighlight);
    };
    
    // Start animation
    requestRef.current = requestAnimationFrame(updateHighlight);
    
    // Cleanup function
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, targetRef, color]);
  
  if (!isActive) return null;
  
  return (
    <div
      ref={highlightRef}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        border: `2px solid ${color}`,
        borderRadius: '50%', // Circular for most targets
        zIndex: 9000,
        boxShadow: `0 0 15px 10px ${color}`,
        transition: 'opacity 0.2s ease-in-out'
      }}
    />
  );
};

export default TargetHighlight;