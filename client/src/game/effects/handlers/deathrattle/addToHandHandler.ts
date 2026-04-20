/**
 * AddToHand Deathrattle Handler
 * 
 * Implements the "add_to_hand" deathrattle effect.
 * Returns the minion back to the player's hand on death.
 * Example: Anub'arak (returns itself to hand)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance } from '../../../types/CardTypes';
import { DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Execute an add_to_hand deathrattle effect
 */
export default function executeAddToHandAddToHand(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: Card | CardInstance
): EffectResult {
  try {
    const card = 'card' in sourceCard ? sourceCard.card : sourceCard;
    const cardName = card.name;
    
    context.logGameEvent(`Executing deathrattle:add_to_hand for ${cardName}`);
    
    if (context.currentPlayer.hand.length >= MAX_HAND_SIZE) {
      context.logGameEvent(`Hand is full, ${cardName} was not returned to hand`);
      return { success: true, additionalData: { burned: true } };
    }
    
    const newCardInstance: CardInstance = {
      instanceId: uuidv4(),
      card: card,
      currentHealth: card.health,
      canAttack: false,
      isPlayed: false,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    context.currentPlayer.hand.push(newCardInstance);
    context.logGameEvent(`${cardName} returned to hand`);
    
    return {
      success: true,
      additionalData: { returnedCard: newCardInstance }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:add_to_hand:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:add_to_hand: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
