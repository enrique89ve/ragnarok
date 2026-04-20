/**
 * Buff Damaged Minions Effect Handler
 * 
 * This handler implements the spellEffect:buff_damaged_minions effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeBuffDamagedMinions(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:buff_damaged_minions for ${sourceCard.name}`);

    const buffAttack = effect.attack || effect.buffAttack || effect.value || 0;
    const buffHealth = effect.health || effect.buffHealth || 0;

    const friendlyMinions = context.getFriendlyMinions();
    const damagedMinions = friendlyMinions.filter(minion => {
      const currentHealth = minion.currentHealth || 0;
      const maxHealth = (minion as any).maxHealth || minion.card.health || 0;
      return currentHealth < maxHealth;
    });

    if (damagedMinions.length === 0) {
      context.logGameEvent(`No damaged friendly minions to buff`);
      return { 
        success: true, 
        additionalData: { buffedCount: 0 } 
      };
    }

    let buffedCount = 0;
    damagedMinions.forEach(minion => {
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
      context.logGameEvent(`Buffed damaged minion ${minion.card.name} with +${buffAttack}/+${buffHealth}`);
    });

    context.logGameEvent(`Buffed ${buffedCount} damaged minion(s)`);

    return { 
      success: true, 
      additionalData: { 
        buffedCount,
        buffAttack,
        buffHealth
      } 
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:buff_damaged_minions:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:buff_damaged_minions: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
