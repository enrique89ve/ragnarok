/**
 * DestroyAndSteal Battlecry Handler
 * 
 * Implements the "destroy_and_steal" battlecry effect.
 * Destroys a minion and adds a copy of it to the current player's hand.
 * Example card: The Jailer (ID: 20400)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a destroy_and_steal battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroyAndSteal(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_and_steal for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'enemy_minion';
    
    let targetMinions: CardInstance[] = [];
    
    if (targetType === 'enemy_minion') {
      targetMinions = context.getEnemyMinions();
    } else if (targetType === 'friendly_minion') {
      targetMinions = context.getFriendlyMinions().filter(m => m.card.id !== sourceCard.id);
    } else if (targetType === 'any_minion') {
      targetMinions = context.getAllMinions().filter(m => m.card.id !== sourceCard.id);
    }
    
    if (targetMinions.length === 0) {
      context.logGameEvent(`No valid minions to destroy and steal`);
      return { success: true, additionalData: { minionDestroyed: false } };
    }
    
    const targetMinion = targetMinions[0];
    
    const isFriendly = context.getFriendlyMinions().includes(targetMinion);
    const board = isFriendly 
      ? context.currentPlayer.board 
      : context.opponentPlayer.board;
    
    const index = board.indexOf(targetMinion);
    if (index === -1) {
      context.logGameEvent(`Target minion not found on board`);
      return { success: false, error: 'Target not found' };
    }
    
    board.splice(index, 1);
    
    const graveyard = isFriendly 
      ? context.currentPlayer.graveyard 
      : context.opponentPlayer.graveyard;
    graveyard.push(targetMinion);
    
    context.logGameEvent(`${sourceCard.name} destroyed ${targetMinion.card.name}`);
    
    const cardCopy: CardInstance = {
      instanceId: 'stolen-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      card: { ...targetMinion.card },
      canAttack: false,
      isPlayed: false,
      isSummoningSick: false,
      attacksPerformed: 0,
      currentHealth: targetMinion.card.health,
      currentAttack: targetMinion.card.attack
    };
    
    if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
      context.currentPlayer.hand.push(cardCopy);
      context.logGameEvent(`${sourceCard.name} added a copy of ${targetMinion.card.name} to your hand`);
    } else {
      context.logGameEvent(`Hand is full, could not add copy of ${targetMinion.card.name}`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        minionDestroyed: true,
        destroyedMinion: targetMinion.card.name,
        copyAdded: context.currentPlayer.hand.length < MAX_HAND_SIZE
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_and_steal:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_and_steal: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
