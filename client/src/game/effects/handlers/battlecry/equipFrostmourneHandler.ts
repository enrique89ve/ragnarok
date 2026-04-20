/**
 * EquipFrostmourne Battlecry Handler
 *
 * Equips the legendary Helgrind weapon.
 * Example card: The Lich King (ID: 3015)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeEquipFrostmourne(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing equip_helgrind battlecry for ${sourceCard.name}`);
    
    const weaponAttack = effect.weaponAttack || 5;
    const weaponDurability = effect.weaponDurability || 3;
    const summonOnDestroy = effect.summonCardId;
    const summonCount = effect.summonCount || 0;
    
    const frostmourne: CardInstance = {
      instanceId: `helgrind-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      card: {
        id: effect.weaponId || 3016,
        name: 'Helgrind',
        description: 'Deathrattle: Summon every minion killed by this weapon.',
        manaCost: 7,
        type: 'weapon',
        rarity: 'mythic',
        heroClass: 'DeathKnight',
        attack: weaponAttack,
        durability: weaponDurability,
        deathrattle: summonOnDestroy ? {
          type: 'summon',
          summonCardId: summonOnDestroy,
          summonCount: summonCount
        } : undefined
      } as Card,
      currentAttack: weaponAttack,
      canAttack: true,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    (context.currentPlayer as any).weapon = frostmourne;
    
    context.logGameEvent(`Equipped Helgrind (${weaponAttack}/${weaponDurability}).`);
    
    return { 
      success: true, 
      additionalData: { equippedWeapon: frostmourne }
    };
  } catch (error) {
    debug.error('Error executing equip_helgrind:', error);
    return { success: false, error: `Failed to execute equip_helgrind: ${error}` };
  }
}
