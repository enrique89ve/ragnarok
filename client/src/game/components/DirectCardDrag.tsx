import React, { useRef, useState, useCallback } from 'react';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';
import { Position } from '../types/Position';
import { useGameStore } from '../stores/gameStore';
import { canPlayCard } from '../utils/cards/cardUtils';
import CardRenderer from './CardRenderer';
import { debug } from '../config/debugConfig';

interface DirectCardDragProps {
  cardInstance: CardInstanceWithCardData;
  position?: Position;
  isInHand?: boolean;
  isOnBoard?: boolean;
  isEnemy?: boolean;
  disableDrag?: boolean;
  onCardClick?: (cardInstance: CardInstanceWithCardData) => void;
  scale?: number;
  onClick?: () => void;
}

/**
 * DIRECT CARD DRAG - Single component handling ALL card interactions
 * No wrappers, no competing systems, no animation layers
 * Pure React drag with immediate visual feedback
 */
export const DirectCardDrag: React.FC<DirectCardDragProps> = ({
  cardInstance,
  position = { x: 0, y: 0 },
  isInHand = false,
  isOnBoard = false,
  isEnemy = false,
  disableDrag = false,
  onCardClick,
  scale = 1,
  onClick
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  
  const gameState = useGameStore(s => s.gameState);
  const playCard = useGameStore(s => s.playCard);
  // Fix: GameState.players is { player, opponent } not an array
  const currentPlayer = gameState.players?.player;
  const isCurrentPlayerTurn = gameState.currentTurn === 'player';
  const currentMana = currentPlayer?.mana?.current ?? 0;
  const cardManaCost = cardInstance.card?.manaCost ?? 0;
  const isPlayable = currentPlayer && cardManaCost <= currentMana && isCurrentPlayerTurn;

  // IMMEDIATE CURSOR AND HOVER EFFECTS
  const handleMouseEnter = useCallback(() => {
    if (!cardRef.current) return;
    
    if (isPlayable && !disableDrag) {
      cardRef.current.style.cursor = 'grab';
      cardRef.current.style.transform = `scale(${scale * 1.05}) translateY(-4px)`;
      cardRef.current.style.transition = 'transform 0.15s ease-out';
      cardRef.current.style.zIndex = '100';
    }
  }, [isPlayable, disableDrag, scale]);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current || isDragging) return;
    
    cardRef.current.style.cursor = 'default';
    cardRef.current.style.transform = `scale(${scale})`;
    cardRef.current.style.transition = 'transform 0.15s ease-out';
    cardRef.current.style.zIndex = 'auto';
  }, [scale, isDragging]);

  // DIRECT DRAG IMPLEMENTATION
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isPlayable || disableDrag || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setDragPosition({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    
    // Immediate drag visual feedback
    cardRef.current.style.cursor = 'grabbing';
    cardRef.current.style.transform = `scale(${scale * 1.1}) rotate(3deg)`;
    cardRef.current.style.zIndex = '600'; /* --z-drag */
    cardRef.current.style.transition = 'transform 0.1s ease-out';
    
    debug.drag('Started dragging card', cardInstance.card.name);
  }, [isPlayable, disableDrag, scale, cardInstance.card.name]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !cardRef.current) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    setDragPosition({ x: newX, y: newY });
    
    // Move card with mouse
    cardRef.current.style.position = 'fixed';
    cardRef.current.style.left = `${newX}px`;
    cardRef.current.style.top = `${newY}px`;
    cardRef.current.style.pointerEvents = 'none';
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging || !cardRef.current) return;
    
    setIsDragging(false);
    
    // Reset card position and style
    cardRef.current.style.position = 'relative';
    cardRef.current.style.left = 'auto';
    cardRef.current.style.top = 'auto';
    cardRef.current.style.transform = `scale(${scale})`;
    cardRef.current.style.cursor = 'grab';
    cardRef.current.style.zIndex = 'auto';
    cardRef.current.style.pointerEvents = 'auto';
    
    // Check if dropped on battlefield
    const battlefield = document.querySelector('[data-testid="player-battlefield"]');
    if (battlefield) {
      const bfRect = battlefield.getBoundingClientRect();
      const dropX = e.clientX;
      const dropY = e.clientY;
      
      if (dropX >= bfRect.left && dropX <= bfRect.right && 
          dropY >= bfRect.top && dropY <= bfRect.bottom) {
        
        debug.drag('Card dropped on battlefield!', cardInstance.card.name);
        
        // Play the card immediately  
        try {
          playCard(cardInstance.instanceId);
          debug.drag('Card played successfully!');
        } catch (error) {
          debug.error('🎯 DIRECT DRAG: Failed to play card:', error);
        }
      }
    }
  }, [isDragging, scale, cardInstance, playCard]);

  // Mouse event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // DIRECT CLICK HANDLER
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDragging) return; // Don't handle clicks during drag
    
    if (onClick) {
      onClick();
    } else if (onCardClick) {
      onCardClick(cardInstance);
    }
  }, [isDragging, onClick, onCardClick, cardInstance]);

  return (
    <div
      ref={cardRef}
      className="relative select-none"
      style={{
        width: '120px',
        height: '168px',
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        cursor: isPlayable && !disableDrag ? 'grab' : 'default'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      data-testid="direct-card-drag"
      data-card-id={cardInstance.card.id}
      data-playable={isPlayable}
    >
      <CardRenderer
        card={cardInstance as any}
        isInHand={isInHand}
        isPlayable={isPlayable}
        isHighlighted={false}
      />
    </div>
  );
};

export default DirectCardDrag;