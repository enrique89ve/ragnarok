import { useState, useEffect } from 'react';

/**
 * A hook that tracks the global drag state for cards
 * This allows us to show visual feedback when cards are being dragged
 */
export function useCardDragState() {
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  
  useEffect(() => {
    // Listen for custom events for card drag start/end
    const handleDragStart = () => {
      setIsDraggingCard(true);
    };
    
    const handleDragEnd = () => {
      setIsDraggingCard(false);
    };
    
    // We use custom events to communicate between components
    window.addEventListener('card-drag-start', handleDragStart);
    window.addEventListener('card-drag-end', handleDragEnd);
    
    return () => {
      window.removeEventListener('card-drag-start', handleDragStart);
      window.removeEventListener('card-drag-end', handleDragEnd);
    };
  }, []);
  
  return { isDraggingCard };
}