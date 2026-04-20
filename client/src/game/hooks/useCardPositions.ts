import { useRef, useCallback } from 'react';
import { CardInstance } from '../types';
import { Position } from '../types/Position';
import { CardInstanceWithCardData } from '../types/interfaceExtensions';

// Interface to track card positions by ID
interface CardPositionMap {
  [instanceId: string]: Position;
}

// Interface to track hero positions (player/opponent)
interface HeroPositions {
  player: Position | null;
  opponent: Position | null;
}

// Global singleton reference for card positions (shared across instances)
// This ensures all hooks/components access the same position data
let globalCardPositions: CardPositionMap = {};
let globalHeroPositions: HeroPositions = {
  player: null,
  opponent: null
};

// Callback registry for position updates
const positionUpdateListeners: Set<(cardId: string, position: Position) => void> = new Set();

/**
 * Enhanced hook to track card and hero positions
 * This is the single source of truth for all card positions in the game
 */
export function useCardPositions() {
  // Use refs for local access, but reference global shared state
  const cardPositionsRef = useRef<CardPositionMap>(globalCardPositions);
  const heroPositionsRef = useRef<HeroPositions>(globalHeroPositions);
  
  // Register a card's position with tolerance check
  const registerCardPosition = useCallback((card: CardInstance | CardInstanceWithCardData, position: Position) => {
    // Safely extract instance ID
    const instanceId = 'instanceId' in card ? card.instanceId : 
                      ((card as any).instanceId || `card-${Math.random().toString(36).substring(7)}`);
    
    // Simple position equality check to avoid unnecessary updates
    const currentPosition = globalCardPositions[instanceId];
    if (
      !currentPosition || 
      Math.abs(currentPosition.x - position.x) > 1 || 
      Math.abs(currentPosition.y - position.y) > 1
    ) {
      // Update both global and local refs
      globalCardPositions = {
        ...globalCardPositions,
        [instanceId]: position
      };
      cardPositionsRef.current = globalCardPositions;
      
      // Notify listeners
      positionUpdateListeners.forEach(listener => listener(instanceId, position));
    }
  }, []);
  
  // Register a hero's position with tolerance check
  const registerHeroPosition = useCallback((heroType: 'player' | 'opponent', position: Position) => {
    // Simple position equality check to avoid unnecessary updates
    const currentPosition = globalHeroPositions[heroType];
    if (
      !currentPosition || 
      Math.abs(currentPosition.x - position.x) > 1 || 
      Math.abs(currentPosition.y - position.y) > 1
    ) {
      // Update both global and local refs
      globalHeroPositions = {
        ...globalHeroPositions,
        [heroType]: position
      };
      heroPositionsRef.current = globalHeroPositions;
    }
  }, []);
  
  // Get a card's position by ID
  const getCardPosition = useCallback((cardId: string): Position | null => {
    return globalCardPositions[cardId] || null;
  }, []);
  
  // Get a hero's position
  const getHeroPosition = useCallback((heroType: 'player' | 'opponent'): Position | null => {
    return globalHeroPositions[heroType];
  }, []);
  
  // Helper to calculate the center position of an element
  const calculateElementCenter = useCallback((element: HTMLElement): Position => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }, []);
  
  // Register for position updates (useful for animation systems)
  const subscribeToPositionUpdates = useCallback((callback: (cardId: string, position: Position) => void) => {
    positionUpdateListeners.add(callback);
    return () => {
      positionUpdateListeners.delete(callback);
    };
  }, []);
  
  return {
    registerCardPosition,
    registerHeroPosition,
    getCardPosition,
    getHeroPosition,
    calculateElementCenter,
    subscribeToPositionUpdates
  };
}