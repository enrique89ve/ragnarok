/**
 * SwapStats Battlecry Handler
 * 
 * Implements the "swap_stats" battlecry effect.
 * Swaps attack and health of target minion(s).
 * Example card: Void Ripper (ID: 30020)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeSwapStats(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  const sourceCardInstance: CardInstance = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };

  try {
    context.logGameEvent(`Executing battlecry:swap_stats for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'all_minions';
    let targets: CardInstance[];
    
    if (targetType === 'all_minions') {
      targets = context.getAllMinions();
    } else {
      targets = context.getTargets(targetType, sourceCardInstance);
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets for swap_stats`);
      return { success: true, additionalData: { noTargets: true } };
    }
    
    const swappedMinions: string[] = [];
    
    for (const minion of targets) {
      if (minion.card.type !== 'minion') continue;
      
      const currentAttack = minion.currentAttack !== undefined ? minion.currentAttack : (minion.card.attack || 0);
      const currentHealth = minion.currentHealth !== undefined ? minion.currentHealth : (minion.card.health || 0);
      
      minion.currentAttack = currentHealth;
      minion.currentHealth = currentAttack;
      
      if (minion.currentHealth <= 0) {
        context.logGameEvent(`${minion.card.name} died from swap_stats (new health: ${minion.currentHealth})`);
      }
      
      swappedMinions.push(`${minion.card.name}: ${currentAttack}/${currentHealth} -> ${minion.currentAttack}/${minion.currentHealth}`);
      context.logGameEvent(`Swapped ${minion.card.name}'s stats: ${currentAttack}/${currentHealth} -> ${minion.currentAttack}/${minion.currentHealth}`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        swappedMinions,
        count: swappedMinions.length
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:swap_stats:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:swap_stats: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
