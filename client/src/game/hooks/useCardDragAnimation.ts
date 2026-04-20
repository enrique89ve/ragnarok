/**
 * Hook for managing card drag animations between positions
 * This handles the smooth animated movement of cards when played from hand to battlefield
 * 
 * This is now integrated with the central card position store for a single source of truth
 */
import { useState, useCallback, useEffect } from 'react';
import { CardInstance } from '../types';
import { useCardPositions } from './useCardPositions';
import { debug } from '../config/debugConfig';
import { Position } from '../types/Position';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';

/**
 * Hook for managing card drag animations with a CCG-style curved motion path
 */
export function useCardDragAnimation() {
  // Animation state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCard, setDraggedCard] = useState<CardInstance | CardInstanceWithCardData | null>(null);
  const [startPosition, setStartPosition] = useState<Position | null>(null);
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  
  // Use the central position store - single source of truth
  const { 
    getCardPosition, 
    registerCardPosition: registerPositionInStore,
    subscribeToPositionUpdates
  } = useCardPositions();
  
  // Subscribe to position updates from the central store
  useEffect(() => {
    // Subscribe to position updates when this component mounts
    const unsubscribe = subscribeToPositionUpdates((cardId, position) => {
      // When a card's position changes in the central store, we can respond here if needed
      // This is useful for animations that need to react to position changes
      if (draggedCard && 'instanceId' in draggedCard && draggedCard.instanceId === cardId) {
        // If this is our currently dragged card, we might want to update animation states
        debug.drag(`Position update for dragged card ${cardId}: (${position.x}, ${position.y})`);
      }
    });
    
    // Unsubscribe on cleanup
    return unsubscribe;
  }, [draggedCard, subscribeToPositionUpdates]);
  
  // Wrapped register function that uses the central store
  const registerCardPosition = useCallback((card: CardInstance | CardInstanceWithCardData, position: Position) => {
    // Register this position with the central store
    registerPositionInStore(card, position);
  }, [registerPositionInStore]);
  
  // Animate a card from one position to another with a curved path
  const animateCard = useCallback((
    card: CardInstance | CardInstanceWithCardData,
    from: Position,
    to: Position
  ) => {
    // Card movement sound will be played by the parent component
    
    // Set animation state
    setIsDragging(true);
    setDraggedCard(card);
    setStartPosition(from);
    setTargetPosition(to);
    
    // Extract card name safely for debugging
    const cardName = 'card' in card && card.card ? card.card.name : 'Unknown Card';
    
    // Log animation for debugging
    debug.drag(`Starting card animation for ${cardName} from (${from.x}, ${from.y}) to (${to.x}, ${to.y})`);
  }, []);
  
  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    setIsDragging(false);
    setDraggedCard(null);
    setStartPosition(null);
    setTargetPosition(null);
    
    // Log animation completion for debugging
    debug.drag('Card animation completed');
  }, []);
  
  return {
    isDragging,
    draggedCard,
    startPosition,
    targetPosition,
    registerCardPosition,
    getCardPosition,  // This now uses the central store's implementation
    animateCard,
    handleAnimationComplete
  };
}