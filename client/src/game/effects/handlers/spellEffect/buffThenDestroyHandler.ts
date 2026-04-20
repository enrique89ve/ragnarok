/**
 * Buff Then Destroy Effect Handler
 * 
 * This handler implements the spellEffect:buff_then_destroy effect.
 * Buffs a minion and then destroys it after a duration.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeBuffThenDestroy(
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
    context.logGameEvent(`Executing spellEffect:buff_then_destroy for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minion';
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    const duration = effect.duration || 1;
    const destroyImmediately = duration === 0;
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for buff_then_destroy`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    
    if (target.card.type !== 'minion') {
      return { success: false, error: 'Target must be a minion' };
    }
    
    if (buffAttack > 0 && target.card.attack !== undefined) {
      target.card.attack += buffAttack;
    }
    
    if (buffHealth > 0) {
      if (target.currentHealth !== undefined) {
        target.currentHealth += buffHealth;
      }
      if (target.card.health !== undefined) {
        target.card.health += buffHealth;
      }
    }
    
    context.logGameEvent(`${target.card.name} buffed by +${buffAttack}/+${buffHealth}`);
    
    if (destroyImmediately) {
      if (target.currentHealth !== undefined) {
        target.currentHealth = 0;
      }
      context.logGameEvent(`${target.card.name} is destroyed immediately`);
    } else {
      (target as any).destroyAfterTurns = duration;
      context.logGameEvent(`${target.card.name} will be destroyed after ${duration} turn(s)`);
    }
    
    return { 
      success: true,
      additionalData: {
        targetName: target.card.name,
        buffAttack,
        buffHealth,
        destroyedImmediately: destroyImmediately,
        destroyAfterTurns: destroyImmediately ? 0 : duration
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:buff_then_destroy:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:buff_then_destroy: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
