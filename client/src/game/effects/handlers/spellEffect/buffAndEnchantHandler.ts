/**
 * BuffAndEnchant SpellEffect Handler
 * 
 * Implements the "buff_and_enchant" spellEffect effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export function executeBuffAndEnchantBuffAndEnchant(
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
    context.logGameEvent(`Executing spellEffect:buff_and_enchant for ${sourceCard.name}`);

    const buffAttack = effect.attack || effect.buffAttack || 0;
    const buffHealth = effect.health || effect.buffHealth || effect.value || 0;
    const enchantEffect = effect.enchantEffect;
    const targetType = effect.targetType || 'friendly_minion';

    const targets = context.getTargets(targetType, sourceCardInstance);

    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for buff_and_enchant`);
      return { success: false, error: 'No valid targets' };
    }

    const target = targets[0];

    if (buffAttack > 0 && target.currentAttack !== undefined) {
      target.currentAttack = (target.currentAttack || 0) + buffAttack;
      context.logGameEvent(`Buffed ${target.card.name} attack by +${buffAttack}`);
    }

    if (buffHealth > 0 && target.currentHealth !== undefined) {
      target.currentHealth = (target.currentHealth || 0) + buffHealth;
      if ((target as any).maxHealth !== undefined) {
        (target as any).maxHealth = ((target as any).maxHealth || 0) + buffHealth;
      }
      context.logGameEvent(`Buffed ${target.card.name} health by +${buffHealth}`);
    }

    if (enchantEffect) {
      const keyword = typeof enchantEffect === 'string' ? enchantEffect : enchantEffect.keyword;
      if (keyword) {
        switch (keyword.toLowerCase()) {
          case 'taunt':
            (target as any).hasTaunt = true;
            break;
          case 'divine_shield':
            (target as any).hasDivineShield = true;
            break;
          case 'windfury':
            (target as any).hasWindfury = true;
            break;
          case 'stealth':
            (target as any).hasStealth = true;
            break;
          case 'rush':
            (target as any).hasRush = true;
            break;
          case 'charge':
            (target as any).hasCharge = true;
            (target as any).canAttack = true;
            break;
          default:
            context.logGameEvent(`Applied enchantment: ${keyword} to ${target.card.name}`);
            break;
        }
        context.logGameEvent(`Enchanted ${target.card.name} with ${keyword}`);
      }
    }

    return { 
      success: true, 
      additionalData: { 
        target: target.card.name,
        buffAttack,
        buffHealth,
        enchantment: enchantEffect
      } 
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:buff_and_enchant:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:buff_and_enchant: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default executeBuffAndEnchantBuffAndEnchant;
