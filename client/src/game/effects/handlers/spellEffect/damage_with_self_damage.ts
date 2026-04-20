/**
 * Damage With Self Damage Effect Handler
 * 
 * This handler implements the spellEffect:damage_with_self_damage effect.
 * Deals damage to a target and also damages your own hero.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeDamageWithSelfDamage(
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
    context.logGameEvent(`Executing spellEffect:damage_with_self_damage for ${sourceCard.name}`);
    
    const damageValue = effect.value || 1;
    const selfDamage = effect.selfDamage || 0;
    const targetType = effect.targetType || 'any';
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for damage_with_self_damage`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    
    context.dealDamage(target, damageValue);
    context.logGameEvent(`Dealt ${damageValue} damage to ${target.card.name}`);
    
    if (selfDamage > 0) {
      context.dealDamage(context.currentPlayer.hero, selfDamage);
      context.logGameEvent(`Dealt ${selfDamage} damage to self as cost`);
    }
    
    return { 
      success: true,
      additionalData: {
        damageDealt: damageValue,
        targetName: target.card.name,
        selfDamageDealt: selfDamage
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:damage_with_self_damage:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:damage_with_self_damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
