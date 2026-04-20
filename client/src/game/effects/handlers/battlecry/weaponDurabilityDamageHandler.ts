/**
 * WeaponDurabilityDamage Battlecry Handler
 * 
 * Deals damage equal to weapon durability or removes durability.
 * Example card: Bloodsail Corsair (ID: 80004)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeWeaponDurabilityDamage(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing weapon_durability_damage battlecry for ${sourceCard.name}`);
    
    const durabilityLoss = effect.value || 1;
    const targetOpponentWeapon = effect.targetOpponent ?? true;
    const dealDamageInstead = effect.dealDamage ?? false;
    
    const targetPlayer = targetOpponentWeapon ? context.opponentPlayer : context.currentPlayer;
    const weapon = (targetPlayer as any).weapon as CardInstance | undefined;
    
    if (!weapon) {
      context.logGameEvent(`${targetOpponentWeapon ? 'Opponent' : 'You'} has no weapon.`);
      return { 
        success: true, 
        additionalData: { hasWeapon: false, effect: 'none' }
      };
    }
    
    if (dealDamageInstead) {
      const currentDurability = weapon.card.durability || 1;
      const targetType = effect.damageTargetType || 'enemy_hero';
      
      const sourceCardInstance: CardInstance = {
        instanceId: 'temp-' + Date.now(),
        card: sourceCard,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      const targets = context.getTargets(targetType, sourceCardInstance);
      
      if (targets.length > 0) {
        const damageTarget = targets[0];
        context.dealDamage(damageTarget, currentDurability);
        context.logGameEvent(`Dealt ${currentDurability} damage based on weapon durability.`);
      }
      
      return { 
        success: true, 
        additionalData: { hasWeapon: true, damageDealt: currentDurability }
      };
    }
    
    const currentDurability = weapon.card.durability || 1;
    const newDurability = Math.max(0, currentDurability - durabilityLoss);
    weapon.card.durability = newDurability;
    
    context.logGameEvent(`Removed ${durabilityLoss} durability from ${weapon.card.name}. (${newDurability} remaining)`);
    
    if (newDurability <= 0) {
      (targetPlayer as any).weapon = undefined;
      context.logGameEvent(`${weapon.card.name} was destroyed.`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        hasWeapon: true, 
        durabilityRemoved: durabilityLoss,
        weaponDestroyed: newDurability <= 0
      }
    };
  } catch (error) {
    debug.error('Error executing weapon_durability_damage:', error);
    return { success: false, error: `Failed to execute weapon_durability_damage: ${error}` };
  }
}
