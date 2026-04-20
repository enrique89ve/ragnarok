/**
 * SwapStatsWithTarget Battlecry Handler
 * 
 * Implements the "swap_stats_with_target" battlecry effect.
 * Swaps stats between the source minion and a target minion.
 * Example card: Darkspeaker (ID: 30035)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeSwapStatsWithTarget(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:swap_stats_with_target for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minion';
    
    const friendlyMinions = context.getFriendlyMinions();
    const sourceMinion = friendlyMinions.find(m => m.card.id === sourceCard.id);
    
    if (!sourceMinion) {
      context.logGameEvent(`Source minion not found on board`);
      return { success: false, error: 'Source minion not found' };
    }
    
    const sourceCardInstance: CardInstance = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    const potentialTargets = context.getTargets(targetType, sourceCardInstance)
      .filter(m => m.instanceId !== sourceMinion.instanceId && m.card.type === 'minion');
    
    if (potentialTargets.length === 0) {
      context.logGameEvent(`No valid targets for swap_stats_with_target`);
      return { success: false, error: 'No valid targets' };
    }
    
    const targetMinion = potentialTargets[0];
    
    const sourceAttack = sourceMinion.currentAttack !== undefined ? sourceMinion.currentAttack : (sourceMinion.card.attack || 0);
    const sourceHealth = sourceMinion.currentHealth !== undefined ? sourceMinion.currentHealth : (sourceMinion.card.health || 0);
    const targetAttack = targetMinion.currentAttack !== undefined ? targetMinion.currentAttack : (targetMinion.card.attack || 0);
    const targetHealth = targetMinion.currentHealth !== undefined ? targetMinion.currentHealth : (targetMinion.card.health || 0);
    
    sourceMinion.currentAttack = targetAttack;
    sourceMinion.currentHealth = targetHealth;
    targetMinion.currentAttack = sourceAttack;
    targetMinion.currentHealth = sourceHealth;
    
    context.logGameEvent(`${sourceCard.name} swapped stats with ${targetMinion.card.name}: ${sourceAttack}/${sourceHealth} <-> ${targetAttack}/${targetHealth}`);
    
    if (sourceMinion.currentHealth <= 0) {
      context.logGameEvent(`${sourceCard.name} died from swap`);
    }
    if (targetMinion.currentHealth <= 0) {
      context.logGameEvent(`${targetMinion.card.name} died from swap`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        sourceMinion: sourceCard.name,
        targetMinion: targetMinion.card.name,
        sourceNewStats: `${sourceMinion.currentAttack}/${sourceMinion.currentHealth}`,
        targetNewStats: `${targetMinion.currentAttack}/${targetMinion.currentHealth}`
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:swap_stats_with_target:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:swap_stats_with_target: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
