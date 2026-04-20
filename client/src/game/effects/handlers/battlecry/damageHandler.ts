/**
 * Damage Effect Handler
 * 
 * This handler implements the battlecry:damage effect.
 * Deals effect.value damage to target(s) based on targetType.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a Damage effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDamage(
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
    attacksPerformed: 0
  };

  try {
    context.logGameEvent(`Executing battlecry:damage for ${sourceCard.name}`);
    
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'enemy_character';
    const damageValue = effect.value || 0;
    
    if (damageValue <= 0) {
      context.logGameEvent(`Damage effect has no value specified`);
      return { success: false, error: 'No damage value specified' };
    }
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for battlecry:damage`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for damage effect`);
      return { success: true };
    }
    
    let totalDamageDealt = 0;
    
    if (effect.isSplit && effect.targetsCount) {
      const splitTargets = [];
      for (let i = 0; i < effect.targetsCount; i++) {
        if (targets.length > 0) {
          const randomIndex = Math.floor(Math.random() * targets.length);
          splitTargets.push(targets[randomIndex]);
        }
      }
      
      splitTargets.forEach(target => {
        context.dealDamage(target, damageValue);
        totalDamageDealt += damageValue;
        context.logGameEvent(`${sourceCard.name} dealt ${damageValue} damage to ${target.card.name}`);
      });
    } else {
      targets.forEach(target => {
        context.dealDamage(target, damageValue);
        totalDamageDealt += damageValue;
        context.logGameEvent(`${sourceCard.name} dealt ${damageValue} damage to ${target.card.name}`);
      });
    }
    
    if (effect.freezeTarget) {
      targets.forEach(target => {
        target.isFrozen = true;
        context.logGameEvent(`${target.card.name} is frozen`);
      });
    }
    
    context.currentPlayer.damageDealtThisTurn += totalDamageDealt;
    
    return { success: true, additionalData: { totalDamageDealt } };
  } catch (error) {
    debug.error(`Error executing battlecry:damage:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
