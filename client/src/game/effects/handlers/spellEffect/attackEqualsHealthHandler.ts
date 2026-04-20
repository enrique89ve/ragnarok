/**
 * Attack Equals Health Effect Handler
 * 
 * This handler implements the spellEffect:attack_equals_health effect.
 * Sets a minion's attack equal to its current health.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeAttackEqualsHealth(
  context: GameContext, 
  effect: SpellEffect, 
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
    context.logGameEvent(`Executing spellEffect:attack_equals_health for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'any_minion';
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for attack_equals_health`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    
    if (target.card.type !== 'minion') {
      return { success: false, error: 'Target must be a minion' };
    }
    
    const currentHealth = target.currentHealth !== undefined ? target.currentHealth : (target.card.health || 0);
    const previousAttack = target.card.attack || 0;
    
    target.card.attack = currentHealth;
    
    context.logGameEvent(`${target.card.name}'s attack set from ${previousAttack} to ${currentHealth} (equal to its health)`);
    
    return { 
      success: true,
      additionalData: {
        previousAttack,
        newAttack: currentHealth,
        targetName: target.card.name
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:attack_equals_health:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:attack_equals_health: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
