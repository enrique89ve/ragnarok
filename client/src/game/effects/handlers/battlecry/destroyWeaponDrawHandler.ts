/**
 * DestroyWeaponDraw Battlecry Handler
 * 
 * Implements the "destroy_weapon_draw" battlecry effect.
 * Destroys the enemy hero's weapon and draws cards equal to its durability.
 * Example card: Harrison Jones (ID: 20042)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy_weapon_draw battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroyWeaponDraw(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_weapon_draw for ${sourceCard.name}`);
    
    const opponent = context.opponentPlayer as any;
    const opponentWeapon = opponent.weapon;
    
    if (!opponentWeapon) {
      context.logGameEvent(`No enemy weapon to destroy`);
      return { success: true, additionalData: { weaponDestroyed: false, cardsDrawn: 0 } };
    }
    
    const weaponName = opponentWeapon.card?.name || opponentWeapon.name || 'weapon';
    const weaponDurability = opponentWeapon.durability || opponentWeapon.card?.durability || 0;
    const weaponAttack = opponentWeapon.attack || opponentWeapon.card?.attack || 0;
    
    opponent.weapon = null;
    
    context.logGameEvent(`${sourceCard.name} destroyed ${weaponName} (${weaponAttack}/${weaponDurability})`);
    
    const drawnCards = context.drawCards(weaponDurability);
    
    context.logGameEvent(`${sourceCard.name} drew ${drawnCards.length} card(s) for the weapon's durability`);
    
    return { 
      success: true, 
      additionalData: { 
        weaponDestroyed: true,
        weaponName,
        weaponDurability,
        cardsDrawn: drawnCards.length,
        drawnCardNames: drawnCards.map(c => c.card.name)
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_weapon_draw:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_weapon_draw: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
