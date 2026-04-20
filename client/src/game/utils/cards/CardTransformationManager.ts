/**
 * Card Transformation Manager
 * 
 * Central manager for all card transformations and animations.
 * This provides a unified system for handling card states, animations,
 * and visual effects throughout the application.
 * 
 * Features:
 * - Singleton pattern for global access
 * - State-based transformation system
 * - Animation sequences
 * - Callback system for state changes
 */

import { HoverCoordinates } from '../../context/CardTransformContext';

// Define all possible card states
export interface CardTransformState {
  // Card identity
  cardId: string;
  elementId?: string;
  
  // Card positioning state
  isInHand: boolean;
  isOnBoard: boolean;
  
  // Interaction states
  isHovering: boolean;
  isDragging: boolean;
  isSelected: boolean;
  isTargeted: boolean;
  isTargeting: boolean;
  isPlayable: boolean;
  
  // Animation states
  isAnimating: boolean;
  animationType?: 'draw' | 'play' | 'attack' | 'damage' | 'death' | 'bounce' | 'hover';
  
  // Transform values
  scale: number;
  translateX: number;
  translateY: number;
  translateZ: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  
  // Visual effects
  glowIntensity: number;
  glowColor?: string;
  zIndex: number;
}

// Default state for a card
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

// Callback type for state changes
export type CardStateChangeCallback = (cardId: string, newState: CardTransformState) => void;

/**
 * Singleton manager for all card transformations
 */
export class CardTransformationManager {
  private static instance: CardTransformationManager;
  private cardStates = new Map<string, CardTransformState>();
  private stateChangeCallbacks: CardStateChangeCallback[] = [];
  private cardElements = new Map<string, HTMLElement>();
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CardTransformationManager {
    if (!this.instance) {
      this.instance = new CardTransformationManager();
    }
    return this.instance;
  }
  
  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    // Initialize and attach any global event listeners if needed
  }
  
  /**
   * Register a card for transformation management
   */
  public registerCard(cardId: string, initialState?: Partial<CardTransformState>): void {
    if (!this.cardStates.has(cardId)) {
      const newState: CardTransformState = {
        ...DEFAULT_CARD_STATE,
        cardId,
        ...initialState
      };
      
      this.cardStates.set(cardId, newState);
      this.notifyStateChange(cardId, newState);
    }
  }
  
  /**
   * Register a DOM element for a card
   */
  public registerCardElement(cardId: string, element: HTMLElement): void {
    this.cardElements.set(cardId, element);
    
    // Apply any existing state to the element
    const state = this.getCardState(cardId);
    if (state) {
      this.applyTransformToElement(element, state);
    }
  }
  
  /**
   * Get card state by ID
   */
  public getCardState(cardId: string): CardTransformState | undefined {
    return this.cardStates.get(cardId);
  }
  
  /**
   * Update a card's transform state
   */
  public updateCardState(cardId: string, stateUpdates: Partial<CardTransformState>): void {
    const existingState = this.cardStates.get(cardId);
    
    if (!existingState) {
      this.registerCard(cardId, stateUpdates);
      return;
    }
    
    const newState = {
      ...existingState,
      ...stateUpdates
    };
    
    this.cardStates.set(cardId, newState);
    
    // Apply immediate transform to DOM if element exists
    const element = this.cardElements.get(cardId);
    if (element) {
      this.applyTransformToElement(element, newState);
    }
    
    // Notify subscribers of state change
    this.notifyStateChange(cardId, newState);
  }
  
  /**
   * Set card hovering state - ENHANCED PRECISE HOVER EFFECT
   * This version adds precise coordinate tracking to fix the battlefield hover bugs
   * by only applying hover effects when cursor is directly over a card.
   */
  public setCardHovering(
    cardId: string, 
    isHovering: boolean, 
    hoverSource?: 'direct' | 'indirect',
    hoverCoordinates?: { 
      x: number; 
      y: number; 
      elementWidth: number; 
      elementHeight: number;
      outsideBoundary?: boolean;
    }
  ): void {
    const existingState = this.getCardState(cardId);
    if (!existingState) return;
    
    // Don't apply hover if card is already being animated or dragged
    if (existingState.isAnimating || existingState.isDragging) {
      return;
    }
    
    // FOR BATTLEFIELD CARDS ONLY - Implement precise hover detection 
    // This prevents the "inch above card" hover bug
    if (existingState.isOnBoard && isHovering) {
      // Skip hover for indirect hover sources or coordinates outside boundary
      if (hoverSource === 'indirect' || hoverCoordinates?.outsideBoundary) {
        return;
      }
    }
    
        
    // Set basic hover with small scale and z-index change only
    // No rotation or other complex transforms that cause flickering
    this.updateCardState(cardId, {
      isHovering,
      // Subtle scale effect only
      scale: isHovering ? 1.05 : 1.0,
      // Slight raise in z-index but not extreme
      zIndex: isHovering ? existingState.zIndex + 5 : existingState.zIndex,
      // No complex rotation effects that cause flickering
      rotateX: 0,
      rotateY: 0
    });
    
    // Apply data attribute to the element for CSS targeting
    const element = this.cardElements.get(cardId);
    if (element) {
      element.setAttribute('data-is-hovering', isHovering ? 'true' : 'false');
      
      // Apply additional debug attributes for precise hover detection
      if (hoverCoordinates) {
        element.setAttribute('data-hover-x', hoverCoordinates.x.toString());
        element.setAttribute('data-hover-y', hoverCoordinates.y.toString());
        element.setAttribute('data-hover-width', hoverCoordinates.elementWidth.toString());
        element.setAttribute('data-hover-height', hoverCoordinates.elementHeight.toString());
        element.setAttribute('data-hover-within-bounds', (!hoverCoordinates.outsideBoundary).toString());
      }
    }
  }
  
  /**
   * Set card dragging state
   */
  public setCardDragging(cardId: string, isDragging: boolean): void {
    this.updateCardState(cardId, {
      isDragging,
      scale: isDragging ? 1.1 : 1.0,
      zIndex: isDragging ? 2000 : 10,
      isHovering: false, // Reset hover state when dragging starts
      isAnimating: false, // Clear any animation when dragging
      animationType: undefined
    });
  }
  
  /**
   * Set card playing animation
   * This handles the animation when a card is played from hand to board
   * Implements the special styles previously defined in CSS (.card-being-played)
   */
  public setCardPlaying(cardId: string, isPlaying: boolean): void {
    const state = this.getCardState(cardId);
    if (!state) return;
    
    // Playing animation should take priority over all other states
    if (isPlaying) {
      this.updateCardState(cardId, {
        isAnimating: true,
        animationType: 'play',
        scale: 1.2, // Match scale from card-play-pulse animation start
        translateY: -40, // Lift up
        translateZ: 30, // Bring forward
        zIndex: 3000, // Higher than drag state - matches z-index from CSS
        glowIntensity: 0.9,
        glowColor: '70, 130, 255', // Blue glow for play effect
        isHovering: false, // Reset other interaction states
        isDragging: false,
        isTargeting: false,
        isTargeted: false
      });
      
      // Implement the pulse animation through a sequence of scale changes
      // This mimics the card-play-pulse animation that was previously in CSS
      setTimeout(() => {
        const currentState = this.getCardState(cardId);
        if (currentState?.animationType === 'play') {
          // Scale up to match 50% keyframe (scale 1.35, brightness up)
          this.updateCardState(cardId, {
            scale: 1.35,
            glowIntensity: 1.0 // Increased intensity for mid-animation (like brightness 1.5)
          });
          
          // Then scale back down to complete the pulse
          setTimeout(() => {
            const finalState = this.getCardState(cardId);
            if (finalState?.animationType === 'play') {
              this.updateCardState(cardId, {
                scale: 1.2,
                glowIntensity: 0.9 // Back to original intensity
              });
            }
          }, 300); // Second half of the pulse (total 600ms)
        }
      }, 300); // First half of the pulse
    } else {
      // Reset to normal state after animation
      this.updateCardState(cardId, {
        isAnimating: false,
        animationType: undefined,
        scale: 1.0,
        translateY: 0,
        translateZ: 0,
        zIndex: state.isOnBoard ? 50 : 10,
        glowIntensity: 0,
        glowColor: undefined
      });
    }
  }
  
  /**
   * Set card drawing animation
   * This handles the animation when a card is drawn into hand
   */
  public setCardDrawing(cardId: string, isDrawing: boolean): void {
    if (isDrawing) {
      this.updateCardState(cardId, {
        isAnimating: true,
        animationType: 'draw',
        scale: 0.1, // Start small
        translateY: 100, // Start from below
        translateZ: -10, // Start behind
        zIndex: 500, // Above most elements but below active cards
        glowIntensity: 0.6,
        glowColor: '255, 255, 200', // Slight yellow glow
        isInHand: true, // Card is entering hand
        isOnBoard: false
      });
      
      // After a short delay, reset to normal hand position
      // This would normally be handled by an animation system
      setTimeout(() => {
        const currentState = this.getCardState(cardId);
        if (currentState?.animationType === 'draw') {
          this.updateCardState(cardId, {
            isAnimating: false,
            animationType: undefined,
            scale: 1.0,
            translateY: 0,
            translateZ: 0,
            zIndex: 10,
            glowIntensity: 0,
            glowColor: undefined
          });
        }
      }, 500); // 500ms draw animation
    }
  }
  
  /**
   * Set card attack animation
   * This handles the animation when a card attacks another card
   */
  public setCardAttacking(cardId: string, isAttacking: boolean, targetPosition?: {x: number, y: number}): void {
    const state = this.getCardState(cardId);
    if (!state) return;
    
    if (isAttacking && targetPosition) {
      // Calculate relative position for the attack animation
      // This would normally use the actual board positions
      const attackX = targetPosition.x - (state.translateX || 0);
      const attackY = targetPosition.y - (state.translateY || 0);
      
      this.updateCardState(cardId, {
        isAnimating: true,
        animationType: 'attack',
        translateX: attackX * 0.4, // Move 40% toward target
        translateY: attackY * 0.4, // Move 40% toward target
        translateZ: 20, // Lift up during attack
        zIndex: 300, // Above other cards
        scale: 1.2, // Slightly larger
        glowIntensity: 0.7,
        glowColor: '255, 0, 0', // Red glow for attack
        isDragging: false,
        isHovering: false
      });
      
      // After attack animation completes, return to original position
      setTimeout(() => {
        const currentState = this.getCardState(cardId);
        if (currentState?.animationType === 'attack') {
          this.updateCardState(cardId, {
            isAnimating: false,
            animationType: undefined,
            translateX: 0,
            translateY: 0,
            translateZ: 0,
            zIndex: 50, // Normal board z-index
            scale: 1.0,
            glowIntensity: 0,
            glowColor: undefined
          });
        }
      }, 600); // 600ms attack animation
    } else if (!isAttacking) {
      // Reset to normal state immediately if animation is canceled
      this.updateCardState(cardId, {
        isAnimating: false,
        animationType: undefined,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
        zIndex: state.isOnBoard ? 50 : 10,
        scale: 1.0,
        glowIntensity: 0,
        glowColor: undefined
      });
    }
  }
  
  /**
   * Set card damage animation
   * This handles the animation when a card takes damage
   */
  public setCardDamaged(cardId: string, isDamaged: boolean): void {
    if (isDamaged) {
      this.updateCardState(cardId, {
        isAnimating: true,
        animationType: 'damage',
        scale: 1.1, // Slightly larger
        translateZ: 15, // Bring forward
        zIndex: 200, // Above normal cards
        glowIntensity: 0.8,
        glowColor: '255, 0, 0', // Red glow
      });
      
      // After a short delay, reset to normal state
      setTimeout(() => {
        const currentState = this.getCardState(cardId);
        if (currentState?.animationType === 'damage') {
          this.updateCardState(cardId, {
            isAnimating: false,
            animationType: undefined,
            scale: 1.0,
            translateZ: 0,
            zIndex: currentState.isOnBoard ? 50 : 10,
            glowIntensity: 0,
            glowColor: undefined
          });
        }
      }, 400); // 400ms damage animation
    }
  }
  
  /**
   * Set card death animation
   * This handles the animation when a card dies and leaves the board
   */
  public setCardDying(cardId: string, isDying: boolean): void {
    const state = this.getCardState(cardId);
    if (!state) return;
    
    if (isDying) {
      this.updateCardState(cardId, {
        isAnimating: true,
        animationType: 'death',
        scale: 1.2, // Start larger
        translateY: -20, // Lift up
        translateZ: 10, // Bring forward
        zIndex: 150, // Above normal cards
        glowIntensity: 0.7,
        glowColor: '128, 0, 128', // Purple death glow
        rotateY: 0, // Reset any rotation
        rotateX: 0
      });
      
      // After death animation, remove card
      // In a real implementation, this would be handled by the game state
      setTimeout(() => {
        const currentState = this.getCardState(cardId);
        if (currentState?.animationType === 'death') {
          this.updateCardState(cardId, {
            isAnimating: false,
            animationType: undefined,
            scale: 0.1, // Shrink away
            translateY: 0,
            translateZ: -30, // Move behind
            zIndex: 5, // Below other cards
            glowIntensity: 0,
            isOnBoard: false // Card is leaving board
          });
        }
      }, 800); // 800ms death animation
    }
  }
  
  /**
   * Set card bounce animation
   * This handles the animation when a card bounces back to hand
   */
  public setCardBouncing(cardId: string, isBouncing: boolean): void {
    const state = this.getCardState(cardId);
    if (!state) return;
    
    if (isBouncing) {
      this.updateCardState(cardId, {
        isAnimating: true,
        animationType: 'bounce',
        scale: 1.15, // Slightly larger
        translateY: -30, // Lift up first
        translateZ: 20, // Bring forward
        zIndex: 500, // High z-index during transition
        glowIntensity: 0.6,
        glowColor: '30, 144, 255', // Blue bounce effect
        isOnBoard: false, // Moving to hand
        isInHand: true
      });
      
      // After bounce completes, reset to normal hand state
      setTimeout(() => {
        const currentState = this.getCardState(cardId);
        if (currentState?.animationType === 'bounce') {
          this.updateCardState(cardId, {
            isAnimating: false,
            animationType: undefined,
            scale: 1.0,
            translateY: 0,
            translateZ: 0,
            zIndex: 10, // Normal hand z-index
            glowIntensity: 0,
            glowColor: undefined
          });
        }
      }, 700); // 700ms bounce animation
    }
  }
  
  /**
   * Set card location context (hand, board, etc.)
   */
  public setCardLocation(cardId: string, location: 'hand' | 'board' | 'other'): void {
    this.updateCardState(cardId, {
      isInHand: location === 'hand',
      isOnBoard: location === 'board',
    });
  }
  
  /**
   * Set card rotation based on mouse movement
   */
  public setCardRotation(cardId: string, rotateX: number, rotateY: number): void {
    const state = this.getCardState(cardId);
    if (!state || !state.isHovering) return;
    
    this.updateCardState(cardId, { rotateX, rotateY });
  }
  
  /**
   * Set card playable state
   */
  public setCardPlayable(cardId: string, isPlayable: boolean): void {
    this.updateCardState(cardId, { 
      isPlayable,
      glowColor: isPlayable ? 'green' : undefined
    });
  }
  
  /**
   * Apply transform to DOM element directly
   * Enhanced with consolidated glow and filter effects from CSS
   */
  private applyTransformToElement(element: HTMLElement, state: CardTransformState): void {
    // Apply a simplified transform with fewer effects to avoid flickering
    
    // Set data attributes for state
    element.setAttribute('data-hovering', state.isHovering ? 'true' : 'false');
    element.setAttribute('data-dragging', state.isDragging ? 'true' : 'false');
    element.setAttribute('data-animating', state.isAnimating ? 'true' : 'false');
    
    // Use a smoother transition time for all effects
    element.style.transition = 'transform 0.1s ease-out, box-shadow 0.1s ease-out';
    
    // Only allow stable CSS properties that don't cause flickering
    let transformValue = '';
    
    // Apply simple scale
    if (state.scale !== 1.0) {
      transformValue += `scale(${state.scale}) `;
    }
    
    // Only apply translation if significant enough to be noticeable
    if (Math.abs(state.translateX) > 2 || Math.abs(state.translateY) > 2) {
      transformValue += `translate(${state.translateX}px, ${state.translateY}px) `;
    }
    
    // Apply the transform if there is one
    element.style.transform = transformValue || 'none';
    
    // Set z-index for proper layering
    element.style.zIndex = `${state.zIndex}`;
    
    // Apply very subtle glow effect only for significant visual states
    if (state.glowIntensity > 0 && state.glowColor) {
      const glowSize = Math.round(state.glowIntensity * 10);
      element.style.boxShadow = `0 0 ${glowSize}px rgba(${state.glowColor}, ${state.glowIntensity.toFixed(1)})`;
    } else {
      element.style.boxShadow = 'none';
    }
  }
  
  /**
   * Get all registered card IDs 
   */
  public getAllCardIds(): string[] {
    return Array.from(this.cardStates.keys());
  }

  /**
   * Subscribe to card state changes
   */
  public subscribe(callback: CardStateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Notify subscribers of state changes
   */
  private notifyStateChange(cardId: string, newState: CardTransformState): void {
    for (const callback of this.stateChangeCallbacks) {
      callback(cardId, newState);
    }
  }
  
  /**
   * Get CSS transform string for a card
   */
  public getCardTransform(cardId: string): string {
    const state = this.getCardState(cardId);
    if (!state) return 'none';
    
    let transform = '';
    
    // Only apply subtle scale transform
    if (state.scale !== 1.0) {
      transform += `scale(${state.scale}) `;
    }
    
    return transform.trim() || 'none';
  }
  
  /**
   * Clean up when a card is removed
   */
  public unregisterCard(cardId: string): void {
    this.cardStates.delete(cardId);
    this.cardElements.delete(cardId);
  }
  
  /**
   * Reset all card transformations
   */
  public resetAllCards(): void {
    // Use Array.from to avoid the iterator issue
    Array.from(this.cardStates.keys()).forEach(cardId => {
      this.updateCardState(cardId, {
        ...DEFAULT_CARD_STATE,
        cardId
      });
    });
  }
}

// Export the singleton instance for easy access
export const cardTransformManager = CardTransformationManager.getInstance();

// Export a hook for using the card transform manager in React components
export function useCardTransform(cardId: string): CardTransformState {
  // In a real implementation, this would be a proper React hook with useState, etc.
  return cardTransformManager.getCardState(cardId) || {
    ...DEFAULT_CARD_STATE,
    cardId
  };
}