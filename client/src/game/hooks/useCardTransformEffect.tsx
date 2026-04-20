/**
 * useCardTransformEffect.tsx
 * 
 * This hook provides a unified interface for card transformation effects,
 * leveraging the new Context-based system while maintaining compatibility
 * with the legacy manager during the transition period.
 */

import { useEffect, useRef } from 'react';
import { useCardTransformState, useCardTransformActions, useCardTransformStyle } from '../context/CardTransformContext';
import { cardTransformBridge } from '../utils/cards/CardTransformBridge';
import { CardTransformState } from '../utils/cards/CardTransformationManager';

/**
 * Custom hook for card transformation effects
 * @param cardId The unique identifier for the card
 * @param element Optional DOM element reference for applying styles directly
 * @param initialState Optional initial state overrides
 * @returns An object with card state, style, and action functions
 */
export function useCardTransformEffect(
  cardId: string,
  element?: React.RefObject<HTMLElement>,
  initialState?: Partial<CardTransformState>
) {
  // Get card state and actions from context
  const cardState = useCardTransformState(cardId);
  const actions = useCardTransformActions();
  const transformStyle = useCardTransformStyle(cardId);
  
  // Track if the card is registered
  const isRegistered = useRef(false);
  
  // Register card when component mounts
  useEffect(() => {
    if (!isRegistered.current) {
      // Register with context system
      actions.registerCard(cardId, initialState);
      isRegistered.current = true;
    }
    
    // Apply styles directly to DOM element if provided
    if (element?.current) {
      Object.entries(transformStyle).forEach(([key, value]) => {
        // @ts-ignore: Element style property assignment
        element.current.style[key] = value;
      });
    }
    
    // Sync state from context to legacy manager for compatibility
    // This ensures both systems have consistent state during transition
    cardTransformBridge.syncStateToLegacy(cardId, cardState);
    
    // Unregister when component unmounts
    return () => {
      if (isRegistered.current) {
        actions.unregisterCard(cardId);
        isRegistered.current = false;
      }
    };
  }, [cardId, cardState, actions, element, initialState, transformStyle]);
  
  // Return state, style, and action functions
  return {
    state: cardState,
    style: transformStyle,
    
    // Helper functions for common card transformations
    setHovering: (isHovering: boolean) => actions.setHovering(cardId, isHovering),
    setDragging: (isDragging: boolean) => actions.setDragging(cardId, isDragging),
    setRotation: (rotateX: number, rotateY: number) => actions.setRotation(cardId, rotateX, rotateY),
    setPlayable: (isPlayable: boolean) => actions.setPlayable(cardId, isPlayable),
    setLocation: (location: 'hand' | 'board' | 'other') => actions.setCardLocation(cardId, location),
    updateState: (updates: Partial<CardTransformState>) => actions.updateCardState(cardId, updates),
    startAnimation: (animationType: 'draw' | 'play' | 'attack' | 'damage' | 'death' | 'bounce' | 'hover') => 
      actions.startCardAnimation(cardId, animationType),
    endAnimation: () => actions.endCardAnimation(cardId)
  };
}

export default useCardTransformEffect;