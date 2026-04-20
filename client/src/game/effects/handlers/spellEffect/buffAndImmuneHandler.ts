/**
 * Buff And Immune Effect Handler
 * 
 * This handler implements the spellEffect:buff_and_immune effect.
 * Buffs a minion and grants it immunity for a duration.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

export default function executeBuffAndImmune(
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
    context.logGameEvent(`Executing spellEffect:buff_and_immune for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minion';
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    const duration = effect.duration || 1;
    const grantKeywords = effect.grantKeywords || ['immune'];
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for buff_and_immune`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    
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
    
    (target as any).isImmune = true;
    (target as any).immuneDuration = duration;
    
    grantKeywords.forEach((keyword: string) => {
      addKeyword(target, keyword);
    });
    
    context.logGameEvent(`${target.card.name} buffed by +${buffAttack}/+${buffHealth} and granted immunity for ${duration} turn(s)`);
    
    return { 
      success: true,
      additionalData: {
        targetName: target.card.name,
        buffAttack,
        buffHealth,
        duration,
        grantedKeywords: grantKeywords
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:buff_and_immune:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:buff_and_immune: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
