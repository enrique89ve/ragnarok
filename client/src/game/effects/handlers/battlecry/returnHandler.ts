/**
 * Return Battlecry Handler
 * 
 * Implements the "return" battlecry effect.
 * Example card: Youthful Brewmaster (ID: 32005)
 */
import { debug } from '../../../config/debugConfig';
import { GameState, CardInstance, PlayerState } from '../../../types';
import { BattlecryEffect } from '../../../types/CardTypes';
import { isMinion, getHealth } from '../../../utils/cards/typeGuards';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';
import { hasKeyword } from '../../../utils/cards/keywordUtils';

/**
 * Execute a return battlecry effect
 * 
 * @param state Current game state
 * @param effect The effect to execute
 * @param sourceCard The card that triggered the effect
 * @param targetId Optional target ID if the effect requires a target
 * @returns Updated game state
 */
export function executeReturnReturn(
  state: GameState,
  effect: BattlecryEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  // Create a new state to avoid mutating the original
  const newState = { ...state };
  
  
  // If no target is provided, we can't return anything
  if (!targetId) {
    debug.warn('Return battlecry requires a target, but none was provided');
    return newState;
  }
  
  // Get current player (the one who played the card)
  const currentPlayerId = newState.currentTurn || 'player';
  const currentPlayer = newState.players[currentPlayerId as 'player' | 'opponent'];
  
  if (!currentPlayer) {
    debug.error('Current player not found in game state');
    return newState;
  }
  
  // Find the minion to return to hand from the battlefield
  const targetIndex = currentPlayer.battlefield.findIndex((minion: CardInstance) => minion.instanceId === targetId);
  
  if (targetIndex === -1) {
    debug.error(`Target minion with ID ${targetId} not found on the battlefield`);
    return newState;
  }
  
  // Get the target minion
  const targetMinion = currentPlayer.battlefield[targetIndex];
  
  // Check if hand is full (max 9 cards by design)
  if (currentPlayer.hand.length >= MAX_HAND_SIZE) {
    
    // Log the effect for debugging
    newState.gameLog = newState.gameLog || [];
    newState.gameLog.push({
      id: Math.random().toString(36).substring(2, 15),
      type: 'effect',
      player: currentPlayerId,
      text: `${sourceCard.card.name} tried to return ${targetMinion.card.name} to hand, but hand is full`,
      timestamp: Date.now(),
      turn: newState.turnNumber,
      cardId: String(sourceCard.card.id)
    });
    
    return newState;
  }
  
  // Create a new version of the minion for hand with reset properties
  const handMinion: CardInstance = {
    ...targetMinion,
    instanceId: `hand-${Date.now()}-${Math.random().toString(36).substring(2,9)}`, // Assign new ID
    attacksPerformed: 0,
    canAttack: false,
    isPlayed: false,
    isSummoningSick: true,
    currentHealth: getHealth(targetMinion.card) || 1, // Reset health to full
    hasDivineShield: hasKeyword(targetMinion, 'divine_shield'), // Reset divine shield
    hasPoisonous: hasKeyword(targetMinion, 'poisonous'), // Reset poisonous
    hasLifesteal: hasKeyword(targetMinion, 'lifesteal') // Reset lifesteal
  };
  
  // Remove any buffs or modifications from the card
  // Card may have buffs, but we're resetting it to hand state
  
  // Remove the minion from the battlefield
  const updatedBattlefield = [...currentPlayer.battlefield];
  updatedBattlefield.splice(targetIndex, 1);
  
  // Add the minion to the hand
  const updatedHand = [...currentPlayer.hand, handMinion];
  
  // Update player state
  const updatedPlayer = {
    ...currentPlayer,
    battlefield: updatedBattlefield,
    hand: updatedHand
  };
  
  // Update the game state
  newState.players = {
    ...newState.players,
    [currentPlayerId]: updatedPlayer
  };
  
  // Log the effect for debugging
  newState.gameLog = newState.gameLog || [];
  newState.gameLog.push({
    id: Math.random().toString(36).substring(2, 15),
    type: 'effect',
    player: currentPlayerId,
    text: `${sourceCard.card.name} returned ${targetMinion.card.name} to hand`,
    timestamp: Date.now(),
    turn: newState.turnNumber,
    cardId: String(sourceCard.card.id)
  });
  
  return newState;
}

export default executeReturnReturn;
