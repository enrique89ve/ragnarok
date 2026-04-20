/**
 * attackStore.ts
 * 
 * A specialized store for managing attack state in the card game.
 * This store handles:
 * - Tracking which card is currently attacking
 * - Tracking the attack target
 * - Managing attack mode state
 */

import { create } from 'zustand';
import { CardInstance } from '../types';
import { useGameStore } from '../stores/gameStore';
import { debug } from '../config/debugConfig';

interface AttackState {
  // The card that is currently attacking
  attackingCard: CardInstance | null;
  
  // The target of the attack
  attackTarget: CardInstance | null;
  
  // Whether we're in attack mode
  isAttackMode: boolean;
  
  // Valid target IDs for the current attack
  validTargets: string[];
  
  // Actions
  setAttackingCard: (card: CardInstance | null) => void;
  setAttackTarget: (target: CardInstance | null) => void;
  startAttackMode: (card: CardInstance) => void;
  endAttackMode: () => void;
  completeAttack: (target: CardInstance) => void;
  performAttack: (targetId: string, targetType?: 'minion' | 'hero') => boolean;
  cancelAttack: () => void;
  selectAttacker: (card: CardInstance | null) => void;
  
  // State clearing
  resetAttackState: () => void;
}

/**
 * A Zustand store for managing attack state
 */
export const useAttackStore = create<AttackState>((set, get) => ({
  attackingCard: null,
  attackTarget: null,
  isAttackMode: false,
  validTargets: [],
  
  // Set the card that's attacking
  setAttackingCard: (card) => set({ attackingCard: card }),
  
  // Set the target of the attack
  setAttackTarget: (target) => set({ attackTarget: target }),
  
  // Start attack mode with the given card
  startAttackMode: (card) => set({ 
    attackingCard: card, 
    isAttackMode: true,
    attackTarget: null,
    validTargets: [] // Reset valid targets on attack mode start
  }),
  
  // End attack mode without completing an attack
  endAttackMode: () => set({ 
    isAttackMode: false,
    attackingCard: null,
    attackTarget: null,
    validTargets: []
  }),
  
  // Complete an attack with the selected target
  completeAttack: (target) => set(state => ({
    attackTarget: target,
    isAttackMode: false,
    validTargets: []
  })),
  
  // Perform attack on a target
  performAttack: (targetId, targetType = 'minion') => {
    // Get the current state
    const state = get();
    
    // Safety check - make sure we have an attacking card
    if (!state.attackingCard) {
      debug.error('[AttackStore] No attacking card selected');
      return false;
    }
    
    // Get a reference to the game store to perform the actual attack
    const gameStore = useGameStore.getState();
    
    // Call the game store's attackWithCard method to execute the attack
    gameStore.attackWithCard(state.attackingCard.instanceId, targetId);
    
    // Reset the attack state after attack is performed
    set({
      isAttackMode: false,
      attackingCard: null,
      attackTarget: null,
      validTargets: []
    });
    
    return true;
  },
  
  // Cancel an attack in progress
  cancelAttack: () => set({
    isAttackMode: false,
    attackingCard: null,
    attackTarget: null,
    validTargets: []
  }),
  
  // Select a card as attacker and handle attack mode
  selectAttacker: (card) => {
    if (!card) {
      // If null passed, clear attack mode
      set({
        attackingCard: null,
        isAttackMode: false,
        validTargets: []
      });
      return;
    }
    
    // Check if we're already in attack mode with this card
    set(state => {
      if (state.isAttackMode && state.attackingCard?.instanceId === card.instanceId) {
        // Toggle attack mode off for this card
        return {
          attackingCard: null,
          isAttackMode: false,
          validTargets: []
        };
      } else {
        // Start attack mode with this card
        // In a real implementation, we would calculate valid targets here
        // based on taunt, charge/rush rules, etc.
        return {
          attackingCard: card,
          isAttackMode: true,
          validTargets: ['opponent-hero'] // For demonstration - would be calculated based on game state
        };
      }
    });
  },
  
  // Reset all attack state
  resetAttackState: () => set({ 
    attackingCard: null, 
    attackTarget: null, 
    isAttackMode: false,
    validTargets: []
  })
}));