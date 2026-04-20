/**
 * BuffAdjacent Battlecry Handler
 * 
 * Implements the "buff_adjacent" battlecry effect.
 * Buffs minions adjacent (left and right) to the source minion.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a buff_adjacent battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeBuffAdjacent(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  const sourceCardInstance: any = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };

  try {
    context.logGameEvent(`Executing battlecry:buff_adjacent for ${sourceCard.name}`);
    
    const buffAttack = effect.buffAttack || effect.value || 0;
    const buffHealth = effect.buffHealth || effect.value || 0;
    
    const board = context.currentPlayer.board;
    const sourceIndex = board.findIndex(m => m.card.id === sourceCard.id);
    
    if (sourceIndex === -1) {
      context.logGameEvent(`Source minion not found on board`);
      return { success: false, error: 'Source minion not found on board' };
    }
    
    const adjacentMinions = [];
    
    if (sourceIndex > 0) {
      adjacentMinions.push(board[sourceIndex - 1]);
    }
    if (sourceIndex < board.length - 1) {
      adjacentMinions.push(board[sourceIndex + 1]);
    }
    
    if (adjacentMinions.length === 0) {
      context.logGameEvent(`No adjacent minions to buff`);
      return { success: true };
    }
    
    let buffedCount = 0;
    
    adjacentMinions.forEach(minion => {
      if (buffAttack !== 0) {
        minion.currentAttack = (minion.currentAttack || minion.card.attack || 0) + buffAttack;
        minion.card.attack = (minion.card.attack || 0) + buffAttack;
      }
      
      if (buffHealth !== 0) {
        minion.currentHealth = (minion.currentHealth || minion.card.health || 0) + buffHealth;
        minion.card.health = (minion.card.health || 0) + buffHealth;
      }
      
      buffedCount++;
      context.logGameEvent(`${sourceCard.name} buffed adjacent ${minion.card.name} by +${buffAttack}/+${buffHealth}`);
    });
    
    return { success: true, additionalData: { buffedCount } };
  } catch (error) {
    debug.error(`Error executing battlecry:buff_adjacent:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:buff_adjacent: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
