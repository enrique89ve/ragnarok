/**
 * DestroyWeaponGainArmor Battlecry Handler
 * 
 * Implements the "destroy_weapon_gain_armor" battlecry effect.
 * Destroys the enemy hero's weapon and gains armor equal to its attack.
 * Example card: Gluttonous Ooze (ID: 30025)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy_weapon_gain_armor battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroyWeaponGainArmor(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_weapon_gain_armor for ${sourceCard.name}`);
    
    const opponent = context.opponentPlayer as any;
    const opponentWeapon = opponent.weapon;
    
    if (!opponentWeapon) {
      context.logGameEvent(`No enemy weapon to destroy`);
      return { success: true, additionalData: { weaponDestroyed: false, armorGained: 0 } };
    }
    
    const weaponName = opponentWeapon.card?.name || opponentWeapon.name || 'weapon';
    const weaponAttack = opponentWeapon.attack || opponentWeapon.card?.attack || 0;
    const weaponDurability = opponentWeapon.durability || opponentWeapon.card?.durability || 0;
    
    opponent.weapon = null;
    
    context.logGameEvent(`${sourceCard.name} destroyed ${weaponName} (${weaponAttack}/${weaponDurability})`);
    
    const armorToGain = weaponAttack;
    context.currentPlayer.armor = (context.currentPlayer.armor || 0) + armorToGain;
    
    context.logGameEvent(`${sourceCard.name} gained ${armorToGain} armor from the weapon's attack`);
    
    return { 
      success: true, 
      additionalData: { 
        weaponDestroyed: true,
        weaponName,
        weaponAttack,
        armorGained: armorToGain
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_weapon_gain_armor:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_weapon_gain_armor: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
