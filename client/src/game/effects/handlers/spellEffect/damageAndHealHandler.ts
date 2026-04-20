/**
 * Damage And Heal Effect Handler
 * 
 * This handler implements the spellEffect:damage_and_heal effect.
 * Deals damage to a target and heals another target.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeDamageAndHeal(
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
    context.logGameEvent(`Executing spellEffect:damage_and_heal for ${sourceCard.name}`);
    
    const damageValue = effect.value || 1;
    const healValue = effect.healValue || effect.value || 1;
    const targetType = effect.targetType || 'any';
    const healTarget = effect.healTarget || 'friendly_hero';
    
    const damageTargets = context.getTargets(targetType, sourceCardInstance);
    
    if (damageTargets.length === 0) {
      context.logGameEvent(`No valid damage targets for damage_and_heal`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = damageTargets[0];
    context.dealDamage(target, damageValue);
    context.logGameEvent(`Dealt ${damageValue} damage to ${target.card.name}`);
    
    let healTargetInstance = null;
    
    if (healTarget === 'friendly_hero' || healTarget === 'self') {
      healTargetInstance = context.currentPlayer.hero;
    } else if (healTarget === 'enemy_hero') {
      healTargetInstance = context.opponentPlayer.hero;
    } else {
      const healTargets = context.getTargets(healTarget, sourceCardInstance);
      if (healTargets.length > 0) {
        healTargetInstance = healTargets[0];
      }
    }
    
    if (healTargetInstance) {
      context.healTarget(healTargetInstance, healValue);
      context.logGameEvent(`Healed ${healTargetInstance.card.name} for ${healValue}`);
    }
    
    return { 
      success: true,
      additionalData: {
        damageDealt: damageValue,
        damageTargetName: target.card.name,
        healAmount: healValue,
        healTargetName: healTargetInstance ? healTargetInstance.card.name : null
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:damage_and_heal:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:damage_and_heal: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
