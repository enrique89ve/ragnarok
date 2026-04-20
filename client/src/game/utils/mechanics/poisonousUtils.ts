/**
 * Utility functions for Poisonous mechanic
 * Poisonous is a mechanic that causes a minion to destroy any minion it damages
 */

import { CardInstance, GameState } from '../../types';
import { destroyCard } from '../zoneUtils';

/**
 * Check if a card has the poisonous keyword
 * @param card The card to check
 * @returns True if the card has the poisonous keyword and is not silenced
 */
export function hasPoisonous(card: CardInstance): boolean {
  // Check if the card has the poisonous keyword and is not silenced
  return card.hasPoisonous === true && !card.isSilenced;
}

/**
 * Apply the poisonous effect to a minion that was damaged by a poisonous attacker
 * @param state Current game state
 * @param attackerId ID of the attacking card with poisonous
 * @param defenderId ID of the defending minion that was damaged
 * @param defenderType Type of the defender ('minion' or 'hero')
 * @returns Updated game state with the poisonous effect applied
 */
export function applyPoisonousEffect(
  state: GameState,
  attackerId: string,
  defenderId: string,
  defenderType: 'minion' | 'hero'
): GameState {
  // Heroes are immune to poisonous
  if (defenderType === 'hero') {
    return state;
  }
  
  // Find the attacker and defender
  const attacker = state.players.player.battlefield.find(card => card.instanceId === attackerId) ||
                  state.players.opponent.battlefield.find(card => card.instanceId === attackerId);
  
  const defender = state.players.player.battlefield.find(card => card.instanceId === defenderId) ||
                  state.players.opponent.battlefield.find(card => card.instanceId === defenderId);
  
  if (!attacker || !defender || !hasPoisonous(attacker)) {
    return state;
  }

  if (defender.hasDivineShield) {
    return state;
  }
  
  // Check if defender took damage
  const defenderHealth = defender.currentHealth || (defender.card as any).health || 0;
  if (defenderHealth <= 0) {
    // The defender is already dead, so no need to apply poisonous
    return state;
  }
  
  // Create a copy of the state to avoid mutation
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Determine which player owns the defender
  const defenderOwner = state.players.player.battlefield.some(c => c.instanceId === defenderId) ? 'player' : 'opponent';
  
  // Apply the poisonous effect - destroy the minion
  return destroyCard(newState, defenderId, defenderOwner);
}

/**
 * Initialize poisonous effect when a card is played
 * @param card Card instance being played
 * @returns Updated card instance with poisonous state set
 */
export function initializePoisonousEffect(card: CardInstance): CardInstance {
  return {
    ...card,
    hasPoisonous: true
  };
}

/**
 * Apply poisonous effect during combat
 * @param state Current game state
 * @param attackerCard The attacking card
 * @param defenderCard The defending card
 * @param attackerOwner The owner of the attacking card
 * @param defenderOwner The owner of the defending card
 * @returns Updated game state after poisonous effects
 */
export function processPoisonousCombat(
  state: GameState,
  attackerCard: CardInstance,
  defenderCard: CardInstance,
  attackerOwner: 'player' | 'opponent',
  defenderOwner: 'player' | 'opponent'
): GameState {
  let newState = state;
  
  // Check if attacker has poisonous
  if (hasPoisonous(attackerCard)) {
    // Apply poisonous to defender if it's a minion (not hero)
    newState = applyPoisonousEffect(
      newState, 
      attackerCard.instanceId, 
      defenderCard.instanceId,
      'minion'
    );
  }
  
  // Check if defender has poisonous (if it's a minion defending)
  if (hasPoisonous(defenderCard)) {
    // Apply poisonous to attacker
    newState = applyPoisonousEffect(
      newState, 
      defenderCard.instanceId, 
      attackerCard.instanceId,
      'minion'
    );
  }
  
  return newState;
}
