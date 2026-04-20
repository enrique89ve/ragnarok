/**
 * CardTransformContext.tsx
 * 
 * A professional implementation of React Context for managing card transformations.
 * This provides a single source of truth for all card visual states and transformations,
 * following industry best practices with React's Context API and hooks.
 */

import { debug } from '../config/debugConfig';
import React, { createContext, useReducer, useContext, useCallback, useEffect, useRef } from 'react';
import { CardTransformState } from '../utils/cards/CardTransformationManager';

// Define our own default state since it's not exported from the manager
const DEFAULT_CARD_STATE: Omit<CardTransformState, 'cardId'> = {
  isInHand: false,
  isOnBoard: false,
  isHovering: false,
  isDragging: false,
  isSelected: false,
  isTargeted: false,
  isTargeting: false,
  isPlayable: false,
  isAnimating: false,
  scale: 1.0,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  glowIntensity: 0,
  zIndex: 10,
};

// Define hover coordinate information
export interface HoverCoordinates {
  x: number;
  y: number;
  elementWidth: number;
  elementHeight: number;
  outsideBoundary?: boolean;
}

// Define action types for our reducer
type CardAction = 
  | { type: 'REGISTER_CARD'; cardId: string; initialState: Partial<CardTransformState> }
  | { type: 'UNREGISTER_CARD'; cardId: string }
  | { type: 'SET_HOVERING'; cardId: string; isHovering: boolean; hoverSource?: 'direct' | 'indirect'; hoverCoordinates?: HoverCoordinates }
  | { type: 'SET_DRAGGING'; cardId: string; isDragging: boolean }
  | { type: 'SET_ROTATION'; cardId: string; rotateX: number; rotateY: number }
  | { type: 'SET_PLAYABLE'; cardId: string; isPlayable: boolean }
  | { type: 'SET_LOCATION'; cardId: string; location: 'hand' | 'board' | 'other' }
  | { type: 'UPDATE_STATE'; cardId: string; updates: Partial<CardTransformState> }
  | { type: 'ANIMATION_START'; cardId: string; animationType: 'draw' | 'play' | 'attack' | 'damage' | 'death' | 'bounce' | 'hover' }
  | { type: 'ANIMATION_END'; cardId: string };

// Create context type
interface CardTransformContextType {
  cardStates: Record<string, CardTransformState>;
  dispatch: React.Dispatch<CardAction>;
}

// Create context with default empty values
const CardTransformContext = createContext<CardTransformContextType>({
  cardStates: {},
  dispatch: () => null,
});

// Reducer function to handle all state updates
function cardReducer(state: Record<string, CardTransformState>, action: CardAction): Record<string, CardTransformState> {
  switch (action.type) {
    case 'REGISTER_CARD': {
      const existingState = state[action.cardId];
      return {
        ...state,
        [action.cardId]: {
          ...DEFAULT_CARD_STATE,
          ...(existingState || {}),
          ...action.initialState,
          cardId: action.cardId,
        },
      };
    }
    
    case 'UNREGISTER_CARD': {
      const newState = { ...state };
      delete newState[action.cardId];
      return newState;
    }
    
    case 'SET_HOVERING': {
      const cardState = state[action.cardId];
      if (!cardState) return state;
      
      // Store the hover action for debugging - this is critical for finding why hover is triggered
      debug.card(`[CardTransformContext] SET_HOVERING for card ${action.cardId}, hover: ${action.isHovering}, location: ${cardState.isInHand ? 'hand' : cardState.isOnBoard ? 'board' : 'other'}`);
      
      // PRECISION FIX: Check if this is a battlefield card hover
      // If it's a board card and we're in hover mode, perform a strict bounds check
      // This is the key fix for the "magnification bug" where cards pop up when hovering over empty space
      if (cardState.isOnBoard && action.isHovering) {
        // For battlefield cards, only apply hover if exact coordinates match
        // This prevents the "inch above card" hover issue
        if (action.hoverSource === 'indirect' || action.hoverCoordinates?.outsideBoundary) {
          debug.card(`[CardTransformContext] REJECTING hover for card ${action.cardId} - indirect hover or outside boundary`);
          // Do not set hover state for out-of-bounds or indirect hover
          return state;
        }
      }
      
      let updates: Partial<CardTransformState> = {
        isHovering: action.isHovering,
      };
      
      // Different hover behavior based on card location
      if (cardState.isInHand && action.isHovering) {
        updates = {
          ...updates,
          scale: 2.0,
          translateY: -90,
          translateZ: 20,
          zIndex: 1000,
          glowColor: '255, 215, 0',
        };
      } else if (cardState.isInHand && !action.isHovering) {
        updates = {
          ...updates,
          scale: 1.0,
          translateY: 0,
          translateZ: 0,
          zIndex: 10,
        };
      } else if (cardState.isOnBoard && action.isHovering) {
        // BATTLEFIELD CARD HOVER PREVENTION - Use minimal scale for battlefield cards
        // This will make the effect less dramatic even if it triggers accidentally
        updates = {
          ...updates,
          scale: 1.05, // Reduced from 1.15 to be less distracting
          translateY: -2, // Reduced from -5
          translateZ: 5,  // Reduced from 10
          zIndex: 100,
          glowColor: '255, 215, 0',
        };
      } else if (cardState.isOnBoard && !action.isHovering) {
        updates = {
          ...updates,
          scale: 1.0,
          translateY: 0,
          translateZ: 0,
          zIndex: 10,
        };
      }
      
      return {
        ...state,
        [action.cardId]: {
          ...cardState,
          ...updates,
        },
      };
    }
    
    case 'SET_DRAGGING': {
      const cardState = state[action.cardId];
      if (!cardState) return state;
      
      return {
        ...state,
        [action.cardId]: {
          ...cardState,
          isDragging: action.isDragging,
          isHovering: false, // Reset hover state when dragging
          scale: action.isDragging ? 1.1 : 1.0,
          zIndex: action.isDragging ? 2000 : 10,
        },
      };
    }
    
    case 'SET_ROTATION': {
      const cardState = state[action.cardId];
      if (!cardState) return state;
      
      return {
        ...state,
        [action.cardId]: {
          ...cardState,
          rotateX: action.rotateX,
          rotateY: action.rotateY,
        },
      };
    }
    
    case 'SET_PLAYABLE': {
      const cardState = state[action.cardId];
      if (!cardState) return state;
      
      return {
        ...state,
        [action.cardId]: {
          ...cardState,
          isPlayable: action.isPlayable,
          glowIntensity: action.isPlayable ? 0.5 : 0,
        },
      };
    }
    
    case 'SET_LOCATION': {
      const cardState = state[action.cardId];
      if (!cardState) return state;
      
      return {
        ...state,
        [action.cardId]: {
          ...cardState,
          isInHand: action.location === 'hand',
          isOnBoard: action.location === 'board',
        },
      };
    }
    
    case 'UPDATE_STATE': {
      const cardState = state[action.cardId];
      if (!cardState) return state;
      
      return {
        ...state,
        [action.cardId]: {
          ...cardState,
          ...action.updates,
        },
      };
    }
    
    case 'ANIMATION_START': {
      const cardState = state[action.cardId];
      if (!cardState) return state;
      
      return {
        ...state,
        [action.cardId]: {
          ...cardState,
          isAnimating: true,
          animationType: action.animationType,
        },
      };
    }
    
    case 'ANIMATION_END': {
      const cardState = state[action.cardId];
      if (!cardState) return state;
      
      return {
        ...state,
        [action.cardId]: {
          ...cardState,
          isAnimating: false,
          animationType: undefined,
        },
      };
    }
    
    default:
      return state;
  }
}

// Provider component to wrap the application
export const CardTransformProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [cardStates, dispatch] = useReducer(cardReducer, {});
  
  return (
    <CardTransformContext.Provider value={{ cardStates, dispatch }}>
      {children}
    </CardTransformContext.Provider>
  );
};

// Custom hooks for components to use
export function useCardTransformState(cardId: string): CardTransformState {
  const { cardStates } = useContext(CardTransformContext);
  
  return cardStates[cardId] || {
    ...DEFAULT_CARD_STATE,
    cardId,
  };
}

export function useCardTransformActions() {
  const { dispatch } = useContext(CardTransformContext);
  
  // Memoize action creators to prevent unnecessary re-renders
  const registerCard = useCallback(
    (cardId: string, initialState: Partial<CardTransformState> = {}) => {
      dispatch({ type: 'REGISTER_CARD', cardId, initialState });
    },
    [dispatch]
  );
  
  const unregisterCard = useCallback(
    (cardId: string) => {
      dispatch({ type: 'UNREGISTER_CARD', cardId });
    },
    [dispatch]
  );
  
  const setHovering = useCallback(
    (cardId: string, isHovering: boolean, options?: { 
      hoverSource?: 'direct' | 'indirect'; 
      hoverCoordinates?: HoverCoordinates 
    }) => {
      dispatch({ 
        type: 'SET_HOVERING', 
        cardId, 
        isHovering,
        hoverSource: options?.hoverSource || 'direct',
        hoverCoordinates: options?.hoverCoordinates
      });
    },
    [dispatch]
  );
  
  const setDragging = useCallback(
    (cardId: string, isDragging: boolean) => {
      dispatch({ type: 'SET_DRAGGING', cardId, isDragging });
    },
    [dispatch]
  );
  
  const setRotation = useCallback(
    (cardId: string, rotateX: number, rotateY: number) => {
      dispatch({ type: 'SET_ROTATION', cardId, rotateX, rotateY });
    },
    [dispatch]
  );
  
  const setPlayable = useCallback(
    (cardId: string, isPlayable: boolean) => {
      dispatch({ type: 'SET_PLAYABLE', cardId, isPlayable });
    },
    [dispatch]
  );
  
  const setCardLocation = useCallback(
    (cardId: string, location: 'hand' | 'board' | 'other') => {
      dispatch({ type: 'SET_LOCATION', cardId, location });
    },
    [dispatch]
  );
  
  const updateCardState = useCallback(
    (cardId: string, updates: Partial<CardTransformState>) => {
      dispatch({ type: 'UPDATE_STATE', cardId, updates });
    },
    [dispatch]
  );
  
  const startCardAnimation = useCallback(
    (cardId: string, animationType: 'draw' | 'play' | 'attack' | 'damage' | 'death' | 'bounce' | 'hover') => {
      dispatch({ type: 'ANIMATION_START', cardId, animationType });
    },
    [dispatch]
  );
  
  const endCardAnimation = useCallback(
    (cardId: string) => {
      dispatch({ type: 'ANIMATION_END', cardId });
    },
    [dispatch]
  );
  
  return {
    registerCard,
    unregisterCard,
    setHovering,
    setDragging,
    setRotation,
    setPlayable,
    setCardLocation,
    updateCardState,
    startCardAnimation,
    endCardAnimation,
  };
}

// Helper hook to generate transform style objects
export function useCardTransformStyle(cardId: string): React.CSSProperties {
  const state = useCardTransformState(cardId);
  
  // Generate CSS transform string
  const transformString = `
    translate3d(${state.translateX}px, ${state.translateY}px, ${state.translateZ}px)
    rotateX(${state.rotateX}deg)
    rotateY(${state.rotateY}deg)
    rotateZ(${state.rotateZ}deg)
    scale(${state.scale})
  `;
  
  // NUCLEAR OPTION: Return a completely static style with NO transitions or animations
  return {
    transform: 'none',
    zIndex: 'auto',
    transition: 'none',
    boxShadow: 'none',
    animation: 'none',
    willChange: 'auto',
  };
}

// Export context for direct usage if needed
export default CardTransformContext;