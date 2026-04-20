/**
 * DamageDrawIfSurvives SpellEffect Handler
 * 
 * Implements the "damage_draw_if_survives" spellEffect effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export function executeDamageDrawIfSurvivesDamageDrawIfSurvives(
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
    context.logGameEvent(`Executing spellEffect:damage_draw_if_survives for ${sourceCard.name}`);

    const damageValue = effect.value || 0;
    const drawCount = effect.drawCount || 1;
    const targetType = effect.targetType || 'any_minion';

    if (damageValue <= 0) {
      return { success: false, error: 'No damage value specified' };
    }

    const targets = context.getTargets(targetType, sourceCardInstance);

    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for damage_draw_if_survives`);
      return { success: false, error: 'No valid targets' };
    }

    const target = targets[0];

    context.logGameEvent(`Dealing ${damageValue} damage to ${target.card.name}`);
    context.dealDamage(target, damageValue);

    const survived = (target.currentHealth !== undefined && target.currentHealth > 0);

    if (survived) {
      context.logGameEvent(`${target.card.name} survived! Drawing ${drawCount} card(s)`);
      context.drawCards(drawCount);
    } else {
      context.logGameEvent(`${target.card.name} did not survive, no cards drawn`);
    }

    return { 
      success: true, 
      additionalData: { 
        target: target.card.name,
        damageDealt: damageValue,
        survived,
        cardsDrawn: survived ? drawCount : 0
      } 
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:damage_draw_if_survives:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:damage_draw_if_survives: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default executeDamageDrawIfSurvivesDamageDrawIfSurvives;
