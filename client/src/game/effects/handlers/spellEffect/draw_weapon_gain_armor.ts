/**
 * Draw Weapon Gain Armor Effect Handler
 * 
 * This handler implements the spellEffect:draw_weapon_gain_armor effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a Draw Weapon Gain Armor effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect

 * @returns An object indicating success or failure and any additional data
 */
export default function executeDrawWeaponGainArmor(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    // Log the effect execution
    context.logGameEvent(`Executing spellEffect:draw_weapon_gain_armor for ${sourceCard.name}`);
    
    // Get effect properties with defaults
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'none';

    
    const armorGain = effect.value || 0;
    let weaponDrawn = false;

    const deck = context.currentPlayer.deck;
    const weaponIndex = deck.findIndex((card: any) => card.card?.type === 'weapon');

    if (weaponIndex !== -1 && context.currentPlayer.hand.length < MAX_HAND_SIZE) {
      const weaponCard = deck.splice(weaponIndex, 1)[0];
      context.currentPlayer.hand.push(weaponCard);
      weaponDrawn = true;
      context.logGameEvent(`Drew weapon: ${weaponCard.card.name}`);
    } else {
      context.logGameEvent(`No weapon cards found in deck`);
    }

    context.currentPlayer.armor = (context.currentPlayer.armor || 0) + armorGain;
    context.logGameEvent(`Gained ${armorGain} armor`);

    return { 
      success: true,
      additionalData: { weaponDrawn, armorGained: armorGain }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:draw_weapon_gain_armor:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:draw_weapon_gain_armor: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
