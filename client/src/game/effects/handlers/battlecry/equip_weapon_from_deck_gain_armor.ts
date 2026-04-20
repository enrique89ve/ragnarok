/**
 * Equip Weapon From Deck Gain Armor Battlecry Handler
 * 
 * Equips a weapon from the deck and gains armor.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeEquipWeaponFromDeckGainArmor(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing equip_weapon_from_deck_gain_armor for ${sourceCard.name}`);
    
    const armorGain = effect.armorGain || effect.value || 5;
    
    const weaponsInDeck = context.currentPlayer.deck.filter(
      card => card.card.type === 'weapon'
    );
    
    context.currentPlayer.armor += armorGain;
    context.logGameEvent(`Gained ${armorGain} armor.`);
    
    if (weaponsInDeck.length === 0) {
      context.logGameEvent('No weapons in deck to equip.');
      return { 
        success: true, 
        additionalData: { armorGained: armorGain, weaponEquipped: false }
      };
    }
    
    const weaponIndex = context.currentPlayer.deck.indexOf(weaponsInDeck[0]);
    const [weapon] = context.currentPlayer.deck.splice(weaponIndex, 1);
    
    const equippedWeapon: CardInstance = {
      ...weapon,
      instanceId: `equipped-${weapon.card.id}-${Date.now()}`,
      currentAttack: weapon.card.attack,
      canAttack: true,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    (context.currentPlayer as any).weapon = equippedWeapon;
    
    context.logGameEvent(`Equipped ${weapon.card.name} from deck.`);
    
    return { 
      success: true, 
      additionalData: { 
        armorGained: armorGain, 
        weaponEquipped: true, 
        equippedWeapon 
      }
    };
  } catch (error) {
    debug.error('Error executing equip_weapon_from_deck_gain_armor:', error);
    return { success: false, error: `Failed to execute equip_weapon_from_deck_gain_armor: ${error}` };
  }
}
