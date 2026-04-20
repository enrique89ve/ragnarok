/**
 * DamageBasedOnMissingHealth SpellEffect Handler
 * 
 * Implements the "damage_based_on_missing_health" spellEffect effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export function executeDamageBasedOnMissingHealthDamageBasedOnMissingHealth(
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
    context.logGameEvent(`Executing spellEffect:damage_based_on_missing_health for ${sourceCard.name}`);

    const targetType = effect.targetType || 'any';
    const maxHealth = context.currentPlayer.maxHealth || 100;
    const currentHealth = context.currentPlayer.health;
    const missingHealth = maxHealth - currentHealth;

    context.logGameEvent(`Hero missing health: ${missingHealth} (${maxHealth} max - ${currentHealth} current)`);

    if (missingHealth <= 0) {
      context.logGameEvent(`Hero is at full health, no damage to deal`);
      return { 
        success: true, 
        additionalData: { damageDealt: 0, missingHealth: 0 } 
      };
    }

    const targets = context.getTargets(targetType, sourceCardInstance);

    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for damage_based_on_missing_health`);
      return { success: false, error: 'No valid targets' };
    }

    const target = targets[0];

    context.logGameEvent(`Dealing ${missingHealth} damage (missing health) to ${target.card.name}`);
    context.dealDamage(target, missingHealth);

    return { 
      success: true, 
      additionalData: { 
        target: target.card.name,
        damageDealt: missingHealth,
        missingHealth
      } 
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:damage_based_on_missing_health:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:damage_based_on_missing_health: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default executeDamageBasedOnMissingHealthDamageBasedOnMissingHealth;
