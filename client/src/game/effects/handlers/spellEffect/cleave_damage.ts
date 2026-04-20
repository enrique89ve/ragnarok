/**
 * Cleave Damage Effect Handler
 * 
 * This handler implements the spellEffect:cleave_damage effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a Cleave Damage effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
   * @param effect.value - The value for the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeCleaveDamage(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    // Log the effect execution
    context.logGameEvent(`Executing spellEffect:cleave_damage for ${sourceCard.name}`);
    
    // Get effect properties with defaults
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'none';
    const value = effect.value;
    
    const damageValue = value || 0;

    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0
    };

    const targets = context.getTargets(targetType || 'enemy_minion', sourceCardInstance);

    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for cleave damage`);
      return { success: false, error: 'No valid targets' };
    }

    const mainTarget = targets[0];
    let totalDamage = 0;

    context.dealDamage(mainTarget, damageValue);
    totalDamage += damageValue;
    context.logGameEvent(`Cleave: dealt ${damageValue} damage to ${mainTarget.card.name}`);

    const adjacentMinions = context.getAdjacentMinions(mainTarget);
    adjacentMinions.forEach(adjacent => {
      context.dealDamage(adjacent, damageValue);
      totalDamage += damageValue;
      context.logGameEvent(`Cleave: dealt ${damageValue} damage to adjacent ${adjacent.card.name}`);
    });

    return { 
      success: true,
      additionalData: { 
        targetsHit: 1 + adjacentMinions.length,
        totalDamage
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:cleave_damage:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:cleave_damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
