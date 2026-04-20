/**
 * WeaponAttackBuff Battlecry Handler
 * 
 * Buffs the minion's attack based on the player's weapon attack.
 * Example card: Bloodsail Raider (ID: 80003)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeWeaponAttackBuff(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing weapon_attack_buff battlecry for ${sourceCard.name}`);
    
    const weapon = (context.currentPlayer as any).weapon as CardInstance | undefined;
    
    if (!weapon) {
      context.logGameEvent('No weapon equipped, no buff applied.');
      return { 
        success: true, 
        additionalData: { buffAmount: 0, hasWeapon: false }
      };
    }
    
    const weaponAttack = weapon.currentAttack || weapon.card.attack || 0;
    const multiplier = effect.multiplier || 1;
    const buffAmount = weaponAttack * multiplier;
    
    const sourceOnBoard = context.currentPlayer.board.find(
      m => m.card.id === sourceCard.id
    );
    
    if (!sourceOnBoard) {
      return { success: false, error: 'Source minion not found on board' };
    }
    
    sourceOnBoard.currentAttack = (sourceOnBoard.currentAttack || sourceCard.attack || 0) + buffAmount;
    
    context.logGameEvent(`${sourceCard.name} gained +${buffAmount} Attack from ${weapon.card.name}.`);
    
    return { 
      success: true, 
      additionalData: { 
        buffAmount, 
        hasWeapon: true, 
        weaponName: weapon.card.name,
        newAttack: sourceOnBoard.currentAttack
      }
    };
  } catch (error) {
    debug.error('Error executing weapon_attack_buff:', error);
    return { success: false, error: `Failed to execute weapon_attack_buff: ${error}` };
  }
}
