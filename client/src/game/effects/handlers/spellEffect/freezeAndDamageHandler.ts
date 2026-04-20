/**
 * FreezeAndDamage SpellEffect Handler
 * 
 * Implements the "freeze_and_damage" spellEffect effect.
 * Deals damage to a target and freezes it.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeFreezeAndDamage(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:freeze_and_damage for ${sourceCard.name}`);
    
    const damageValue = effect.value || 1;
    const targetType = effect.targetType || 'enemy_character';
    
    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for freeze_and_damage effect`);
      return { success: false, error: 'No valid targets' };
    }
    
    let totalDamage = 0;
    let frozenCount = 0;
    
    targets.forEach(target => {
      context.dealDamage(target, damageValue);
      totalDamage += damageValue;
      context.logGameEvent(`Dealt ${damageValue} damage to ${target.card.name}`);
      
      if (target.card.type === 'minion') {
        (target as any).isFrozen = true;
        frozenCount++;
        context.logGameEvent(`${target.card.name} is frozen`);
      }
    });
    
    return { 
      success: true,
      additionalData: { totalDamage, frozenCount }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:freeze_and_damage:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:freeze_and_damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
