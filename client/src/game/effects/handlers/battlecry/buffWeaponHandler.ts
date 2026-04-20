/**
 * BuffWeapon Battlecry Handler
 * 
 * Implements the "buff_weapon" battlecry effect.
 * Adds attack and/or durability to the player's equipped weapon.
 * Example card: Hobart Grapplehammer (ID: 20300)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a buff_weapon battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeBuffWeapon(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:buff_weapon for ${sourceCard.name}`);
    
    const buffAttack = effect.buffAttack || 0;
    const buffDurability = effect.buffDurability || 0;
    const location = effect.location || 'equipped';
    
    if (buffAttack === 0 && buffDurability === 0) {
      context.logGameEvent(`BuffWeapon effect has no buffs specified`);
      return { success: true };
    }
    
    if (location === 'equipped') {
      const weapon = (context.currentPlayer as any).weapon;
      
      if (!weapon) {
        context.logGameEvent(`No weapon equipped, cannot buff`);
        return { success: false, error: 'No weapon equipped' };
      }
      
      if (buffAttack !== 0) {
        weapon.card.attack = (weapon.card.attack || 0) + buffAttack;
        weapon.currentAttack = (weapon.currentAttack || weapon.card.attack || 0) + buffAttack;
      }
      
      if (buffDurability !== 0) {
        weapon.card.durability = (weapon.card.durability || 0) + buffDurability;
        weapon.currentDurability = (weapon.currentDurability || weapon.card.durability || 0) + buffDurability;
      }
      
      context.logGameEvent(`${sourceCard.name} buffed equipped weapon by +${buffAttack} attack and +${buffDurability} durability`);
    } else if (location === 'hand' || location === 'deck') {
      const collection = location === 'hand' ? context.currentPlayer.hand : context.currentPlayer.deck;
      
      let buffedCount = 0;
      collection.forEach(cardInstance => {
        if (cardInstance.card.type === 'weapon') {
          if (buffAttack !== 0) {
            cardInstance.card.attack = (cardInstance.card.attack || 0) + buffAttack;
          }
          
          if (buffDurability !== 0) {
            cardInstance.card.durability = (cardInstance.card.durability || 0) + buffDurability;
          }
          
          buffedCount++;
        }
      });
      
      context.logGameEvent(`${sourceCard.name} buffed ${buffedCount} weapons in ${location} by +${buffAttack}/+${buffDurability}`);
    }
    
    return { success: true };
  } catch (error) {
    debug.error(`Error executing battlecry:buff_weapon:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:buff_weapon: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
