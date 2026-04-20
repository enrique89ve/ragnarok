/**
 * DestroyWeapon Battlecry Handler
 * 
 * Implements the "destroy_weapon" battlecry effect.
 * Destroys the enemy hero's equipped weapon.
 * Example card: Acidic Swamp Ooze (ID: 30001)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy_weapon battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroyWeapon(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_weapon for ${sourceCard.name}`);
    
    const opponent = context.opponentPlayer as any;
    const opponentWeapon = opponent.weapon;
    
    if (!opponentWeapon) {
      context.logGameEvent(`No enemy weapon to destroy`);
      return { success: true, additionalData: { weaponDestroyed: false } };
    }
    
    const weaponName = opponentWeapon.card?.name || opponentWeapon.name || 'weapon';
    const weaponAttack = opponentWeapon.attack || opponentWeapon.card?.attack || 0;
    const weaponDurability = opponentWeapon.durability || opponentWeapon.card?.durability || 0;
    
    opponent.weapon = null;
    
    context.logGameEvent(`${sourceCard.name} destroyed ${weaponName} (${weaponAttack}/${weaponDurability})`);
    
    return { 
      success: true, 
      additionalData: { 
        weaponDestroyed: true,
        weaponName,
        weaponAttack,
        weaponDurability
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_weapon:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_weapon: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
