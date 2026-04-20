/**
 * Gain Armor Equal To Attack Effect Handler
 * 
 * Implements the battlecry:gain_armor_equal_to_attack effect.
 * Hero gains armor equal to a minion's attack value.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a Gain Armor Equal To Attack effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeGainArmorEqualToAttack(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  const sourceCardInstance: any = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0,
    currentAttack: sourceCard.attack || 0
  };

  try {
    context.logGameEvent(`Executing battlecry:gain_armor_equal_to_attack for ${sourceCard.name}`);
    
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'self';
    const multiplier = effect.multiplier || 1;
    
    let attackValue = 0;
    
    if (requiresTarget && targetType !== 'self') {
      const targets = context.getTargets(targetType, sourceCardInstance);
      
      if (targets.length === 0) {
        context.logGameEvent(`No valid targets for battlecry:gain_armor_equal_to_attack`);
        return { success: false, error: 'No valid targets' };
      }
      
      const target = targets[0];
      attackValue = target.currentAttack || target.card.attack || 0;
      context.logGameEvent(`Using ${target.card.name}'s attack value: ${attackValue}`);
    } else {
      attackValue = sourceCard.attack || 0;
      context.logGameEvent(`Using source card's attack value: ${attackValue}`);
    }
    
    const armorGain = Math.max(0, attackValue * multiplier);
    const previousArmor = context.currentPlayer.armor;
    
    context.currentPlayer.armor += armorGain;
    
    context.logGameEvent(`${sourceCard.name} granted ${armorGain} armor (from ${attackValue} attack). Total armor: ${context.currentPlayer.armor}`);
    
    return { 
      success: true, 
      additionalData: { 
        armorGain,
        attackValue,
        previousArmor,
        newArmor: context.currentPlayer.armor
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:gain_armor_equal_to_attack:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:gain_armor_equal_to_attack: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
