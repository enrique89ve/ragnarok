/**
 * ConditionalFreezeOrDamage SpellEffect Handler
 * 
 * Implements the "conditional_freeze_or_damage" spellEffect effect.
 * Example card: Ice Lance (Card ID: 14013)
 * 
 * This effect checks if a target is already frozen:
 * - If the target is NOT frozen, it applies a freeze effect
 * - If the target is ALREADY frozen, it deals damage instead
 */
import { debug } from '../../../config/debugConfig';
import { GameState, CardInstance } from '../../../types';
import { SpellEffect } from '../../../types/CardTypes';
import { applyFreezeEffect } from '../../../utils/mechanics/freezeUtils';
import { dealDamage } from '../../../utils/effects/damageUtils';
import { v4 as uuidv4 } from 'uuid';
import { isMinion, getAttack, getHealth } from '../../../utils/cards/typeGuards';

/**
 * Execute a conditional_freeze_or_damage spellEffect effect
 * 
 * @param state Current game state
 * @param effect The effect to execute
 * @param sourceCard The card that triggered the effect
 * @param targetId Optional target ID if the effect requires a target
 * @returns Updated game state
 */
export function executeConditionalFreezeOrDamageConditionalFreezeOrDamage(
  state: GameState,
  effect: SpellEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  // Create a new state to avoid mutating the original
  let newState = { ...state };
  
  
  // Check for required properties
  if (effect.value === undefined) {
    debug.warn(`ConditionalFreezeOrDamage effect missing value property`);
    return state;
  }

  if (effect.condition === undefined) {
    debug.warn(`ConditionalFreezeOrDamage effect missing condition property`);
    return state;
  }
  
  // Check that we have a target
  if (!targetId) {
    debug.warn(`ConditionalFreezeOrDamage effect requires a target`);
    return state;
  }
  
  // Get the damage value (used when the condition is met)
  const damageAmount = effect.value;
  
  // Initialize variables to find the target
  const currentPlayerId = state.currentTurn;
  const opponentPlayerId = currentPlayerId === 'player' ? 'opponent' : 'player';
  let targetPlayer: 'player' | 'opponent' | null = null;
  let targetType: 'minion' | 'hero' = 'minion';
  let isTargetFrozen = false;
  
  // Check if target is a hero
  if (targetId === 'player' || targetId === 'opponent') {
    targetPlayer = targetId;
    targetType = 'hero';
    isTargetFrozen = !!newState.players?.[targetId]?.hero?.isFrozen;
  } else {
    // Check player battlefield for the target
    const playerMinionIndex = newState.players.player.battlefield.findIndex(
      minion => minion.instanceId === targetId
    );
    
    if (playerMinionIndex !== -1) {
      targetPlayer = 'player';
      isTargetFrozen = !!newState.players.player.battlefield[playerMinionIndex].isFrozen;
    } else {
      // Check opponent battlefield for the target
      const opponentMinionIndex = newState.players.opponent.battlefield.findIndex(
        minion => minion.instanceId === targetId
      );
      
      if (opponentMinionIndex !== -1) {
        targetPlayer = 'opponent';
        isTargetFrozen = !!newState.players.opponent.battlefield[opponentMinionIndex].isFrozen;
      }
    }
  }
  
  // If target was not found, return the original state
  if (targetPlayer === null) {
    debug.warn(`Target ${targetId} not found for conditional_freeze_or_damage effect`);
    return state;
  }
  
  // Add to game log
  newState.gameLog = newState.gameLog || [];
  
  // Log the action about to be taken
  if (isTargetFrozen) {
    newState.gameLog.push({
      id: uuidv4(),
      type: 'spell_cast',
      player: currentPlayerId,
      text: `${sourceCard.card.name} found the target already frozen and will deal ${damageAmount} damage instead of freezing.`,
      timestamp: Date.now(),
      turn: newState.turnNumber,
      cardId: String(sourceCard.card.id),
    });
    
    // If the target is already frozen, deal damage
    newState = dealDamage(
      newState, 
      targetPlayer, 
      targetType, 
      damageAmount, 
      targetId,
      typeof sourceCard.card.id === 'number' ? sourceCard.card.id : parseInt(String(sourceCard.card.id), 10),
      currentPlayerId
    );
    
  } else {
    // If the target is not frozen, apply freeze effect
    newState.gameLog.push({
      id: uuidv4(),
      type: 'spell_cast',
      player: currentPlayerId,
      text: `${sourceCard.card.name} freezes the target.`,
      timestamp: Date.now(),
      turn: newState.turnNumber,
      cardId: String(sourceCard.card.id),
    });
    
    newState = applyFreezeEffect(newState, targetId, targetType);
  }
  
  return newState;
}

export default executeConditionalFreezeOrDamageConditionalFreezeOrDamage;
