/**
 * useCardTransform Hook
 * 
 * A professional React hook that provides access to the card transformation system.
 * This follows industry best practices with React's useState and useEffect patterns.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { cardTransformManager, CardTransformState } from '../utils/cards/CardTransformationManager';
import { HoverCoordinates } from '../context/CardTransformContext';

// Define our interface types
interface UseCardTransformOptions {
  cardId: string;
  elementRef?: React.RefObject<HTMLElement>;
  initialState?: Partial<CardTransformState>;
  isInHand?: boolean;
  isOnBoard?: boolean;
}

interface UseCardTransformResult {
  // Current transformation state
  transformState: CardTransformState;
  
  // Basic transformation actions
  setHovering: (
    isHovering: boolean, 
    options?: { 
      hoverSource?: 'direct' | 'indirect'; 
      hoverCoordinates?: HoverCoordinates 
    }
  ) => void;
  setDragging: (isDragging: boolean) => void;
  setRotation: (rotateX: number, rotateY: number) => void;
  setPlayable: (isPlayable: boolean) => void;
  
  // Animation actions
  setCardPlaying: (isPlaying: boolean) => void;
  setCardDrawing: (isDrawing: boolean) => void;
  setCardAttacking: (isAttacking: boolean, targetPosition?: {x: number, y: number}) => void;
  setCardDamaged: (isDamaged: boolean) => void;
  setCardDying: (isDying: boolean) => void;
  setCardBouncing: (isBouncing: boolean) => void;
  
  // CSS transform string ready to use
  transformString: string;
  
  // Style object ready to apply to React elements
  transformStyle: React.CSSProperties;
}

// Create the main hook as a named function
function useCardTransformHook(options: UseCardTransformOptions): UseCardTransformResult {
  const { cardId, elementRef, initialState, isInHand = false, isOnBoard = false } = options;
  
  // Get initial state or create default
  const initialCardState = cardTransformManager.getCardState(cardId) || {
    ...initialState,
    cardId,
    isInHand,
    isOnBoard
  };
  
  // Internal state to trigger re-renders
  const [transformState, setTransformState] = useState<CardTransformState>(
    initialCardState as CardTransformState
  );
  
  // Register with the manager
  useEffect(() => {
    cardTransformManager.registerCard(cardId, {
      isInHand,
      isOnBoard,
      ...initialState
    });
    
    // Set up subscription to state changes
    const unsubscribe = cardTransformManager.subscribe((updatedCardId, newState) => {
      if (updatedCardId === cardId) {
        setTransformState(newState);
      }
    });
    
    // Update location if changed
    if (isInHand || isOnBoard) {
      cardTransformManager.setCardLocation(
        cardId, 
        isInHand ? 'hand' : isOnBoard ? 'board' : 'other'
      );
    }
    
    // Clean up subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [cardId, isInHand, isOnBoard]);
  
  // Register the DOM element when it's available
  useEffect(() => {
    if (elementRef?.current) {
      cardTransformManager.registerCardElement(cardId, elementRef.current);
    }
  }, [cardId, elementRef?.current]);
  
  // Action callbacks
  const setHovering = useCallback((
    isHovering: boolean, 
    options?: { 
      hoverSource?: 'direct' | 'indirect'; 
      hoverCoordinates?: HoverCoordinates 
    }
  ) => {
    // Call the card transform manager with enhanced options
    cardTransformManager.setCardHovering(cardId, isHovering, options?.hoverSource, options?.hoverCoordinates);
  }, [cardId]);
  
  const setDragging = useCallback((isDragging: boolean) => {
    cardTransformManager.setCardDragging(cardId, isDragging);
  }, [cardId]);
  
  const setRotation = useCallback((rotateX: number, rotateY: number) => {
    cardTransformManager.setCardRotation(cardId, rotateX, rotateY);
  }, [cardId]);
  
  const setPlayable = useCallback((isPlayable: boolean) => {
    cardTransformManager.setCardPlayable(cardId, isPlayable);
  }, [cardId]);
  
  // Animation action callbacks
  const setCardPlaying = useCallback((isPlaying: boolean) => {
    cardTransformManager.setCardPlaying(cardId, isPlaying);
  }, [cardId]);
  
  const setCardDrawing = useCallback((isDrawing: boolean) => {
    cardTransformManager.setCardDrawing(cardId, isDrawing);
  }, [cardId]);
  
  const setCardAttacking = useCallback((isAttacking: boolean, targetPosition?: {x: number, y: number}) => {
    cardTransformManager.setCardAttacking(cardId, isAttacking, targetPosition);
  }, [cardId]);
  
  const setCardDamaged = useCallback((isDamaged: boolean) => {
    cardTransformManager.setCardDamaged(cardId, isDamaged);
  }, [cardId]);
  
  const setCardDying = useCallback((isDying: boolean) => {
    cardTransformManager.setCardDying(cardId, isDying);
  }, [cardId]);
  
  const setCardBouncing = useCallback((isBouncing: boolean) => {
    cardTransformManager.setCardBouncing(cardId, isBouncing);
  }, [cardId]);
  
  // Generate the transform string
  const transformString = cardTransformManager.getCardTransform(cardId);
  
  // Create a complete transform style object ready to use
  const transformStyle: React.CSSProperties = {
    transform: transformString,
    zIndex: transformState.zIndex,
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out', 
    boxShadow: transformState.isHovering || transformState.isDragging ? 
      `0 0 20px rgba(${transformState.glowColor || '255, 215, 0'}, ${transformState.glowIntensity})` : 
      undefined,
    willChange: 'transform, z-index, box-shadow'
  };
  
  return {
    transformState,
    setHovering,
    setDragging,
    setRotation,
    setPlayable,
    setCardPlaying,
    setCardDrawing,
    setCardAttacking,
    setCardDamaged,
    setCardDying,
    setCardBouncing,
    transformString,
    transformStyle
  };
}

// Export the hook as a named function to avoid Fast Refresh problems
export function useCardTransform(options: UseCardTransformOptions): UseCardTransformResult {
  return useCardTransformHook(options);
}

// Export a simpler hook for just getting a transform style
export function useCardTransformStyle(cardId: string, options?: Partial<UseCardTransformOptions>): React.CSSProperties {
  const { transformStyle } = useCardTransform({
    cardId,
    ...options
  });
  
  return transformStyle;
}