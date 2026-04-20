/**
 * DamageAndBuff SpellEffect Handler
 * 
 * Implements the "damage_and_buff" spellEffect effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export function executeDamageAndBuffDamageAndBuff(
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
    context.logGameEvent(`Executing spellEffect:damage_and_buff for ${sourceCard.name}`);

    const damageValue = effect.value || 0;
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    const targetType = effect.targetType || 'any';

    const targets = context.getTargets(targetType, sourceCardInstance);

    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for damage_and_buff`);
      return { success: false, error: 'No valid targets' };
    }

    const target = targets[0];

    if (damageValue > 0) {
      context.logGameEvent(`Dealing ${damageValue} damage to ${target.card.name}`);
      context.dealDamage(target, damageValue);
    }

    const friendlyMinions = context.getFriendlyMinions();
    let buffedCount = 0;

    if (buffAttack > 0 || buffHealth > 0) {
      friendlyMinions.forEach(minion => {
        if (buffAttack > 0 && minion.currentAttack !== undefined) {
          minion.currentAttack = (minion.currentAttack || 0) + buffAttack;
        }
        if (buffHealth > 0 && minion.currentHealth !== undefined) {
          minion.currentHealth = (minion.currentHealth || 0) + buffHealth;
          if ((minion as any).maxHealth !== undefined) {
            (minion as any).maxHealth = ((minion as any).maxHealth || 0) + buffHealth;
          }
        }
        buffedCount++;
        context.logGameEvent(`Buffed ${minion.card.name} with +${buffAttack}/+${buffHealth}`);
      });
    }

    return { 
      success: true, 
      additionalData: { 
        target: target.card.name,
        damageDealt: damageValue,
        buffedMinions: buffedCount,
        buffAttack,
        buffHealth
      } 
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:damage_and_buff:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:damage_and_buff: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default executeDamageAndBuffDamageAndBuff;
