/**
 * ConsumeAdjacent Battlecry Handler
 * 
 * Destroys adjacent minions and gains their stats.
 * Example card: Void Terror (ID: 15007)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeConsumeAdjacent(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing consume_adjacent battlecry for ${sourceCard.name}`);
    
    const gainStats = effect.gainStats ?? true;
    
    const sourceOnBoard = context.currentPlayer.board.find(
      m => m.card.id === sourceCard.id
    );
    
    if (!sourceOnBoard) {
      return { success: false, error: 'Source minion not found on board' };
    }
    
    const sourceIndex = context.currentPlayer.board.indexOf(sourceOnBoard);
    const adjacentMinions = context.getAdjacentMinions(sourceOnBoard);
    
    if (adjacentMinions.length === 0) {
      context.logGameEvent('No adjacent minions to consume.');
      return { success: true, additionalData: { consumedCount: 0 } };
    }
    
    let totalAttackGain = 0;
    let totalHealthGain = 0;
    const consumedMinions: CardInstance[] = [];
    
    for (const adjacent of adjacentMinions) {
      const attackGain = adjacent.currentAttack || adjacent.card.attack || 0;
      const healthGain = adjacent.currentHealth || adjacent.card.health || 0;
      
      if (gainStats) {
        totalAttackGain += attackGain;
        totalHealthGain += healthGain;
      }
      
      consumedMinions.push(adjacent);
      
      const index = context.currentPlayer.board.indexOf(adjacent);
      if (index !== -1) {
        context.currentPlayer.board.splice(index, 1);
        context.currentPlayer.graveyard.push(adjacent);
      }
      
      context.logGameEvent(`Consumed ${adjacent.card.name} (${attackGain}/${healthGain}).`);
    }
    
    if (gainStats) {
      sourceOnBoard.currentAttack = (sourceOnBoard.currentAttack || sourceCard.attack || 0) + totalAttackGain;
      sourceOnBoard.currentHealth = (sourceOnBoard.currentHealth || sourceCard.health || 0) + totalHealthGain;
      
      context.logGameEvent(`${sourceCard.name} gained +${totalAttackGain}/+${totalHealthGain}.`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        consumedMinions, 
        consumedCount: consumedMinions.length,
        attackGained: totalAttackGain,
        healthGained: totalHealthGain
      }
    };
  } catch (error) {
    debug.error('Error executing consume_adjacent:', error);
    return { success: false, error: `Failed to execute consume_adjacent: ${error}` };
  }
}
