/**
 * Damage Based On Armor Effect Handler
 * 
 * This handler implements the spellEffect:damage_based_on_armor effect.
 * Deals damage equal to the player's armor amount.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeDamageBasedOnArmor(
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
    context.logGameEvent(`Executing spellEffect:damage_based_on_armor for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'any';
    const minimumDamage = effect.minimumDamage || 0;
    const removeArmor = effect.removeArmor !== false;
    const multiplier = effect.multiplier || 1;
    
    const armorAmount = context.currentPlayer.armor || 0;
    let damageValue = Math.floor(armorAmount * multiplier);
    
    if (damageValue < minimumDamage) {
      damageValue = minimumDamage;
    }
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for damage_based_on_armor`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    
    context.logGameEvent(`Dealing ${damageValue} damage based on ${armorAmount} armor`);
    context.dealDamage(target, damageValue);
    
    if (removeArmor) {
      context.currentPlayer.armor = 0;
      context.logGameEvent(`Armor consumed`);
    }
    
    return { 
      success: true,
      additionalData: {
        armorAmount,
        damageDealt: damageValue,
        targetName: target.card.name,
        armorRemoved: removeArmor
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:damage_based_on_armor:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:damage_based_on_armor: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
