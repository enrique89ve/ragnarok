/**
 * Damage Effect Handler
 * 
 * This handler implements the spellEffect:damage effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a Damage effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @param effect.value - The amount of damage to deal
 * @param effect.freezeTarget - Whether to freeze the target
 * @param effect.conditionalTarget - Condition for targeting
 * @param effect.conditionalValue - Value for conditional targeting
 * @param effect.splashDamage - Amount of splash damage to deal
 * @param effect.targetsCount - Number of targets
 * @param effect.isSplit - Whether damage is split among targets
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDamageDamage(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  // Create a temporary CardInstance for targeting purposes
  const sourceCardInstance: any = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };
  try {
    // Log the effect execution
    context.logGameEvent(`Executing spellEffect:damage for ${sourceCard.name}`);
    
    // Get effect properties with defaults
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'none';
    const damageValue = effect.value || 1;
    const freezeTarget = effect.freezeTarget || false;
    const conditionalTarget = effect.conditionalTarget;
    const conditionalValue = effect.conditionalValue;
    const splashDamage = effect.splashDamage || 0;
    const targetsCount = effect.targetsCount || 1;
    const isSplit = effect.isSplit || false;
    
    // Log detailed information about the effect
    context.logGameEvent(`Damage effect with value ${damageValue} (${isSplit ? 'split' : 'not split'})`);
    
    if (requiresTarget) {
      // Get targets based on targetType
      let targets = context.getTargets(targetType, sourceCardInstance);
      
      // Apply conditional targeting if needed
      if (conditionalTarget && conditionalValue) {
        targets = targets.filter(target => {
          // Example condition: minion with attack >= X
          if (conditionalTarget === 'minion_attack_gte' && target.card.type === 'minion') {
            return (target.card.attack || 0) >= conditionalValue;
          }
          return true;
        });
      }
      
      if (targets.length === 0) {
        context.logGameEvent(`No valid targets for damage effect`);
        return { success: false, error: 'No valid targets' };
      }
      
      // Limit to specified number of targets if needed
      let selectedTargets = targets;
      if (targetsCount > 0 && targetsCount < targets.length) {
        // Shuffle and select random targets if more available than needed
        selectedTargets = [...targets].sort(() => Math.random() - 0.5).slice(0, targetsCount);
      }
      
      // Calculate actual damage to apply
      let damageToApply = damageValue;
      if (isSplit && selectedTargets.length > 0) {
        damageToApply = Math.floor(damageValue / selectedTargets.length);
        if (damageToApply <= 0) damageToApply = 1; // Ensure minimum 1 damage
      }
      
      // Apply damage to each target
      selectedTargets.forEach(target => {
        context.logGameEvent(`Applying ${damageToApply} damage to ${target.card.name}`);
        context.dealDamage(target, damageToApply);
        
        // Apply freeze if needed
        if (freezeTarget && target.card.type === 'minion') {
          // Use any type to set the frozen property
          (target as any).isFrozen = true;
          context.logGameEvent(`${target.card.name} is frozen`);
        }
        
        // Apply splash damage to adjacent minions if needed
        if (splashDamage > 0 && target.card.type === 'minion') {
          const adjacentMinions = context.getAdjacentMinions(target);
          adjacentMinions.forEach(adjacentMinion => {
            context.logGameEvent(`Applying ${splashDamage} splash damage to ${adjacentMinion.card.name}`);
            context.dealDamage(adjacentMinion, splashDamage);
          });
        }
      });
      
      return { 
        success: true,
        additionalData: { 
          targetsHit: selectedTargets.length,
          damageDealt: damageToApply * selectedTargets.length
        }
      };
    } else {
      context.logGameEvent(`Damage effect with no target - likely an error`);
      return { success: false, error: 'Damage effect requires target but none specified' };
    }
  } catch (error) {
    debug.error(`Error executing spellEffect:damage:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
