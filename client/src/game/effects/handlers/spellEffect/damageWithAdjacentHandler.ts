/**
 * DamageWithAdjacent SpellEffect Handler
 * 
 * Implements the "damage_with_adjacent" spellEffect effect (cleave).
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export function executeDamageWithAdjacentDamageWithAdjacent(
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
    context.logGameEvent(`Executing spellEffect:damage_with_adjacent for ${sourceCard.name}`);

    const damageValue = effect.value || effect.primaryDamage || 0;
    const adjacentDamage = effect.adjacentDamage || damageValue;
    const targetType = effect.targetType || 'any_minion';

    if (damageValue <= 0) {
      return { success: false, error: 'No damage value specified' };
    }

    const targets = context.getTargets(targetType, sourceCardInstance);

    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for damage_with_adjacent`);
      return { success: false, error: 'No valid targets' };
    }

    const primaryTarget = targets[0];

    context.logGameEvent(`Dealing ${damageValue} damage to ${primaryTarget.card.name}`);
    context.dealDamage(primaryTarget, damageValue);

    const adjacentMinions = context.getAdjacentMinions(primaryTarget);
    adjacentMinions.forEach(adjacent => {
      context.logGameEvent(`Dealing ${adjacentDamage} cleave damage to ${adjacent.card.name}`);
      context.dealDamage(adjacent, adjacentDamage);
    });

    return { 
      success: true, 
      additionalData: { 
        primaryTarget: primaryTarget.card.name,
        adjacentHit: adjacentMinions.length,
        totalDamage: damageValue + (adjacentDamage * adjacentMinions.length)
      } 
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:damage_with_adjacent:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:damage_with_adjacent: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default executeDamageWithAdjacentDamageWithAdjacent;
