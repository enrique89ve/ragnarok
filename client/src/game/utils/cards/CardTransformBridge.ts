/**
 * CardTransformBridge.ts
 * 
 * This bridge component synchronizes the existing CardTransformationManager (singleton)
 * with the new React Context-based approach. It ensures both systems stay in sync
 * during the migration process, allowing for a gradual transition without breaking
 * existing functionality.
 */

import { CardTransformState } from './CardTransformationManager';
import { cardTransformManager } from './CardTransformationManager';
import CardTransformContext from '../../context/CardTransformContext';

/**
 * Singleton bridge class to synchronize state between the old and new card transform systems
 */
export class CardTransformBridge {
  private static instance: CardTransformBridge;
  private legacyManager: typeof cardTransformManager;
  private contextSubscription: (() => void) | null = null;
  private isInitialized = false;
  
  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.legacyManager = cardTransformManager;
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CardTransformBridge {
    if (!CardTransformBridge.instance) {
      CardTransformBridge.instance = new CardTransformBridge();
    }
    return CardTransformBridge.instance;
  }
  
  /**
   * Initialize the bridge with the React context
   * This must be called from a React component with access to the context
   */
  public initialize(getContextState: () => Record<string, CardTransformState>, dispatchToContext: Function): void {
    if (this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    
    // Set up subscription to legacy manager changes
    const unsubscribeLegacy = this.legacyManager.subscribe((cardId, newState) => {
      // When the legacy system updates, send changes to the context
      this.syncStateToContext(cardId, newState, dispatchToContext);
    });
    
    // Store the unsubscribe function
    this.contextSubscription = unsubscribeLegacy;
    
    // Initial sync of all legacy state to context
    const allCardIds = this.legacyManager.getAllCardIds();
    allCardIds.forEach((cardId: string) => {
      const cardState = this.legacyManager.getCardState(cardId);
      if (cardState) {
        this.syncStateToContext(cardId, cardState, dispatchToContext);
      }
    });
    
  }
  
  /**
   * Synchronize state from context to legacy system
   */
  public syncStateToLegacy(cardId: string, contextState: CardTransformState): void {
    // Update the legacy manager with the new state from context
    this.legacyManager.updateCardState(cardId, contextState);
  }
  
  /**
   * Synchronize state from legacy to context system
   */
  public syncStateToContext(
    cardId: string, 
    legacyState: CardTransformState, 
    dispatch: Function
  ): void {
    // Use setTimeout to break potential circular update cycles
    // This ensures dispatches don't happen synchronously in the same callstack
    setTimeout(() => {
      // Update the context with state from the legacy manager
      dispatch({ 
        type: 'UPDATE_STATE', 
        cardId, 
        updates: legacyState 
      });
    }, 0);
  }
  
  /**
   * Clean up subscriptions
   */
  public cleanup(): void {
    if (this.contextSubscription) {
      this.contextSubscription();
      this.contextSubscription = null;
    }
    this.isInitialized = false;
  }
}

// Create and export the singleton instance
export const cardTransformBridge = CardTransformBridge.getInstance();

// Export a function to initialize the bridge from components
export function initializeCardTransformBridge(
  getContextState: () => Record<string, CardTransformState>, 
  dispatchToContext: Function
): () => void {
  cardTransformBridge.initialize(getContextState, dispatchToContext);
  return () => cardTransformBridge.cleanup();
}