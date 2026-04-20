/**
 * Buff Weapon Effect Handler
 * 
 * This handler implements the spellEffect:buff_weapon effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a Buff Weapon effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
   * @param effect.buffAttack - The buff attack for the effect
   * @param effect.buffDurability - The buff durability for the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeBuffWeapon(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    // Log the effect execution
    context.logGameEvent(`Executing spellEffect:buff_weapon for ${sourceCard.name}`);
    
    // Get effect properties with defaults
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'none';
    const buffAttack = effect.buffAttack;
    const buffDurability = effect.buffDurability;
    
    const attackBuff = buffAttack || effect.value || 0;
    const durabilityBuff = buffDurability || (effect as any).secondaryValue || 0;

    const weapon = (context.currentPlayer as any).weapon;

    if (!weapon) {
      context.logGameEvent(`No weapon equipped to buff`);
      return { success: false, error: 'No weapon equipped' };
    }

    if (weapon.card) {
      weapon.card.attack = (weapon.card.attack || 0) + attackBuff;
      if (weapon.card.durability !== undefined) {
        weapon.card.durability += durabilityBuff;
      }
    }
    if (weapon.currentDurability !== undefined) {
      weapon.currentDurability += durabilityBuff;
    }

    context.logGameEvent(`Buffed weapon: +${attackBuff} attack, +${durabilityBuff} durability`);

    return { 
      success: true,
      additionalData: { attackBuff, durabilityBuff }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:buff_weapon:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:buff_weapon: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
