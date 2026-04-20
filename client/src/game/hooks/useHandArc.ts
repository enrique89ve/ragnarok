import { useMemo } from 'react';

interface CardTransform {
  rotation: number;
  yOffset: number;
  xOffset: number;
  zIndex: number;
}

export function useHandArc(cardCount: number): CardTransform[] {
  return useMemo(() => {
    if (cardCount === 0) return [];
    
    const transforms: CardTransform[] = [];
    const centerIndex = (cardCount - 1) / 2;
    
    // Subtle fan - very small rotation angles
    const maxRotation = 4; // Small rotation for subtle fan
    const maxYOffset = 12; // Arc curve depth
    
    // Tight overlap - each card shows ~50px visible width
    // Cards are left-aligned with increasing X offset
    const cardSpacing = 50; // Visible portion per card
    
    for (let i = 0; i < cardCount; i++) {
      const offset = i - centerIndex;
      const normalizedOffset = cardCount > 1 ? offset / centerIndex : 0;
      
      // Left-aligned stacking: first card at 0, each subsequent card offset right
      transforms.push({
        rotation: normalizedOffset * maxRotation,
        yOffset: Math.abs(normalizedOffset) * maxYOffset,
        xOffset: i * cardSpacing, // Left-aligned: card 0 at 0, card 1 at 50, etc.
        zIndex: 10 + i
      });
    }
    
    return transforms;
  }, [cardCount]);
}

// Helper to get style for a card at index
export function getHandCardStyle(transform: CardTransform, isHovered: boolean) {
  if (isHovered) {
    return {
      transform: `translateX(${transform.xOffset}px) translateY(-40px) scale(1.15) rotate(0deg)`,
      zIndex: 100
    };
  }
  
  return {
    transform: `translateX(${transform.xOffset}px) translateY(${transform.yOffset}px) rotate(${transform.rotation}deg)`,
    zIndex: transform.zIndex
  };
}
