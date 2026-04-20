/**
 * Equip Special Weapon Effect Handler
 * 
 * This handler implements the spellEffect:equip_special_weapon effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a Equip Special Weapon effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
   * @param effect.weaponAttack - The weapon attack for the effect
   * @param effect.weaponDurability - The weapon durability for the effect
   * @param effect.armorPerAttack - The armor per attack for the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeEquipSpecialWeapon(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    // Log the effect execution
    context.logGameEvent(`Executing spellEffect:equip_special_weapon for ${sourceCard.name}`);
    
    // Get effect properties with defaults
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'none';
    const weaponAttack = effect.weaponAttack;
    const weaponDurability = effect.weaponDurability;
    const armorPerAttack = effect.armorPerAttack;
    
    const attack = weaponAttack || (effect as any).attack || 1;
    const durability = weaponDurability || (effect as any).durability || 2;
    const weaponCardId = (effect as any).weaponCardId;

    const weaponCard: any = {
      id: weaponCardId || `weapon-${Date.now()}`,
      name: sourceCard.name + ' Weapon',
      type: 'weapon',
      attack: attack,
      durability: durability,
      manaCost: 0,
    };

    const weaponInstance: any = {
      instanceId: `weapon-${Date.now()}`,
      card: weaponCard,
      canAttack: true,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0,
      currentDurability: durability,
    };

    (context.currentPlayer as any).weapon = weaponInstance;

    if (armorPerAttack) {
      (weaponInstance as any).armorPerAttack = armorPerAttack;
    }

    context.logGameEvent(`${sourceCard.name} equipped a ${attack}/${durability} weapon`);

    return { 
      success: true,
      additionalData: { weapon: weaponInstance }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:equip_special_weapon:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:equip_special_weapon: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
