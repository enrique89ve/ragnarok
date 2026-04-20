/**
 * Gain Armor Reduce Hero Power Effect Handler
 * 
 * This handler implements the spellEffect:gain_armor_reduce_hero_power effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a Gain Armor Reduce Hero Power effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
   * @param effect.value - The value for the effect
   * @param effect.heroReduction - The hero reduction for the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeGainArmorReduceHeroPower(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    // Log the effect execution
    context.logGameEvent(`Executing spellEffect:gain_armor_reduce_hero_power for ${sourceCard.name}`);
    
    // Get effect properties with defaults
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'none';
    const value = effect.value;
    const heroReduction = effect.heroReduction;
    
    const armorGain = value || 0;
    const reduction = (effect as any).reduction || heroReduction || 1;

    context.currentPlayer.armor = (context.currentPlayer.armor || 0) + armorGain;
    context.logGameEvent(`${sourceCard.name} granted ${armorGain} armor to the current player`);

    if (context.currentPlayer.heroPower) {
      const heroPower = context.currentPlayer.heroPower;
      if (heroPower.card && heroPower.card.manaCost !== undefined) {
        heroPower.card.manaCost = Math.max(0, heroPower.card.manaCost - reduction);
        context.logGameEvent(`Hero power cost reduced by ${reduction}`);
      }
    }

    return { 
      success: true,
      additionalData: { armorGained: armorGain, heroPowerReduction: reduction }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:gain_armor_reduce_hero_power:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:gain_armor_reduce_hero_power: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
