import { CardInstance, GameState, CardData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { findCardInstance, createCardInstance } from './cards/cardUtils';
import { isMinion, getHealth } from './cards/typeGuards';
import allCards, { getCardById } from '../data/allCards';
import { debug } from '../config/debugConfig';

/**
 * Transform a minion into another minion
 * This is used for transform battlecry effects
 */
export function transformMinion(
  state: GameState,
  targetId: string,
  transformToCardId: number
): GameState {
  // Deep clone the state to avoid mutation
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // First, look for the target in player's battlefield
  let targetInfo = findCardInstance(newState.players.player.battlefield, targetId);
  let targetPlayer: 'player' | 'opponent' = 'player';
  
  // If not found, check opponent's battlefield
  if (!targetInfo) {
    targetInfo = findCardInstance(newState.players.opponent.battlefield, targetId);
    targetPlayer = 'opponent';
    
    // If still not found, log an error and return the original state
    if (!targetInfo) {
      debug.error(`Target card with ID ${targetId} not found for transformation`);
      return state;
    }
  }
  
  // Find the card to transform into
  const transformToCard = getCardById(transformToCardId as number);
  
  if (!transformToCard) {
    debug.error(`Card with ID ${transformToCardId} not found for transformation target`);
    return state;
  }
  
  // Create a new instance of the target card using our card creation utility
  const newCardInstance = createCardInstance(transformToCard);
  
  // Mark it as already played and on the battlefield
  newCardInstance.isPlayed = true;
  
  // Replace the old minion with the new one at the same position
  newState.players[targetPlayer].battlefield[targetInfo.index] = newCardInstance;
  
  
  return newState;
}

/**
 * Apply a silence effect to a minion, removing all buffs, debuffs, and card text
 * This is used for silence battlecry effects
 */
export function silenceMinion(
  state: GameState,
  targetId: string
): GameState {
  // Deep clone the state to avoid mutation
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // First, look for the target in player's battlefield
  let targetInfo = findCardInstance(newState.players.player.battlefield, targetId);
  let targetPlayer: 'player' | 'opponent' = 'player';
  
  // If not found, check opponent's battlefield
  if (!targetInfo) {
    targetInfo = findCardInstance(newState.players.opponent.battlefield, targetId);
    targetPlayer = 'opponent';
    
    // If still not found, log an error and return the original state
    if (!targetInfo) {
      debug.error(`Target card with ID ${targetId} not found for silencing`);
      return state;
    }
  }
  
  const targetMinion = targetInfo.card;
  const targetIndex = targetInfo.index;
  
  // Store the original card for retaining key properties
  const originalCard = targetMinion.card;
  
  // Only silence if it's a minion card with effects
  if (!isMinion(originalCard)) {
    debug.error(`Target card is not a minion and cannot be silenced`);
    return state;
  }
  
  // Get the health value safely using type guard
  const originalHealth = getHealth(originalCard);
  
  // Create a silenced version of the minion
  const silencedMinion: CardInstance = {
    instanceId: targetMinion.instanceId, // Keep the same instance ID
    isPlayed: true, // It's already on the battlefield
    
    // Keep original card data but remove effects
    card: {
      ...originalCard,
      keywords: [], // Remove all keywords
      battlecry: undefined, // Remove battlecry
      deathrattle: undefined, // Remove deathrattle
    },
    
    // Keep base stats but reset buffs
    currentHealth: originalHealth ? Math.min(targetMinion.currentHealth || originalHealth, originalHealth) : undefined,
    isSummoningSick: targetMinion.isSummoningSick,
    canAttack: targetMinion.canAttack,
    
    // Mark as silenced
    isSilenced: true
  };
  
  // Replace the minion with its silenced version
  newState.players[targetPlayer].battlefield[targetIndex] = silencedMinion;
  
  
  return newState;
}