import { useState, useCallback } from 'react';
import { CardInstance, Position } from '../types';

interface UseCardDragProps {
  onCardPlayed: (cardId: string, position: Position) => void;
}

export function useCardDrag({ onCardPlayed }: UseCardDragProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCard, setDraggedCard] = useState<CardInstance | null>(null);
  
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, card: CardInstance) => {
    setIsDragging(true);
    setDraggedCard(card);
    
    // Set ghost drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLDivElement;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 75, 100);
    
    // Clean up ghost element after drag starts
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  }, []);
  
  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setDraggedCard(null);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedCard) return;
    
    // Get drop position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Notify parent about card being played
    onCardPlayed(draggedCard.instanceId, { x, y });
    
    // Reset drag state
    setIsDragging(false);
    setDraggedCard(null);
  }, [draggedCard, onCardPlayed]);
  
  return {
    isDragging,
    draggedCard,
    handleDragStart,
    handleDragEnd,
    handleDrop
  };
}
