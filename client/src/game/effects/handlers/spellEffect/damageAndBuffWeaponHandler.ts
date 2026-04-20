/**
 * Damage And Buff Weapon Effect Handler
 * 
 * This handler implements the spellEffect:damage_and_buff_weapon effect.
 * Deals damage to a target and buffs the player's equipped weapon.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeDamageAndBuffWeapon(
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
    context.logGameEvent(`Executing spellEffect:damage_and_buff_weapon for ${sourceCard.name}`);
    
    const damageValue = effect.value || 1;
    const targetType = effect.targetType || 'any';
    const buffWeaponAttack = effect.buffWeaponAttack || 1;
    const buffWeaponDurability = effect.buffWeaponDurability || 0;
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for damage_and_buff_weapon`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    context.dealDamage(target, damageValue);
    context.logGameEvent(`Dealt ${damageValue} damage to ${target.card.name}`);
    
    const weapon = (context.currentPlayer as any).weapon;
    
    if (weapon) {
      if (weapon.card.attack !== undefined) {
        weapon.card.attack += buffWeaponAttack;
        context.logGameEvent(`Weapon attack increased by ${buffWeaponAttack} (now ${weapon.card.attack})`);
      }
      
      if (buffWeaponDurability > 0 && weapon.card.durability !== undefined) {
        weapon.card.durability += buffWeaponDurability;
        context.logGameEvent(`Weapon durability increased by ${buffWeaponDurability}`);
      }
    } else {
      context.logGameEvent(`No weapon equipped to buff`);
    }
    
    return { 
      success: true,
      additionalData: {
        damageDealt: damageValue,
        targetName: target.card.name,
        weaponBuffed: weapon !== undefined,
        buffWeaponAttack,
        buffWeaponDurability
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:damage_and_buff_weapon:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:damage_and_buff_weapon: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
