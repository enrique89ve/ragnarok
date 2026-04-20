/**
 * Warrior Card Effect Handlers Registration
 * 
 * This file registers all effect handlers for Warrior class cards.
 */
import EffectRegistry from './EffectRegistry';

// Battlecry handlers
import executeConditionalBuff from './handlers/battlecry/conditional_buff';
import executeGainArmorEqualToAttack from './handlers/battlecry/gain_armor_equal_to_attack';
import executeDamage from './handlers/battlecry/damageHandler';
import executeGainArmorConditionalDraw from './handlers/battlecry/gain_armor_conditional_draw';
import executeBuffWeapon from './handlers/battlecry/buffWeaponHandler';
import executeEquipWeaponFromDeckGainArmor from './handlers/battlecry/equip_weapon_from_deck_gain_armor';

// Spell effect handlers
import executeGainArmorReduceCost from './handlers/spellEffect/gain_armor_reduce_cost';
import executeDamageWithSelfDamage from './handlers/spellEffect/damage_with_self_damage';
import executeDamageBasedOnArmor from './handlers/spellEffect/damage_based_on_armor';
import executeBuffDamagedMinions from './handlers/spellEffect/buff_damaged_minions';
import executeDrawWeaponGainArmor from './handlers/spellEffect/draw_weapon_gain_armor';
import executeGainArmorReduceHeroPower from './handlers/spellEffect/gain_armor_reduce_hero_power';
import executeCleaveAttack from './handlers/spellEffect/cleave_damage';
import executeArmorBasedOnMissingHealth from './handlers/spellEffect/armor_based_on_missing_health';
import executeEquipSpecialWeapon from './handlers/spellEffect/equip_special_weapon';

/**
 * Register all Warrior card effect handlers
 */
export function registerWarriorHandlers(): void {
  
  // Register battlecry handlers
  EffectRegistry.registerBattlecryHandler('conditional_buff', executeConditionalBuff);
  EffectRegistry.registerBattlecryHandler('gain_armor_equal_to_attack', executeGainArmorEqualToAttack);
  EffectRegistry.registerBattlecryHandler('damage', executeDamage);
  EffectRegistry.registerBattlecryHandler('gain_armor_conditional_draw', executeGainArmorConditionalDraw);
  EffectRegistry.registerBattlecryHandler('buff_weapon', executeBuffWeapon);
  EffectRegistry.registerBattlecryHandler('equip_weapon_from_deck_gain_armor', executeEquipWeaponFromDeckGainArmor);
  
  // Register spell effect handlers
  EffectRegistry.registerSpellEffectHandler('gain_armor_reduce_cost', executeGainArmorReduceCost);
  EffectRegistry.registerSpellEffectHandler('damage_with_self_damage', executeDamageWithSelfDamage);
  EffectRegistry.registerSpellEffectHandler('damage_based_on_armor', executeDamageBasedOnArmor);
  EffectRegistry.registerSpellEffectHandler('buff_weapon', executeBuffWeapon);
  EffectRegistry.registerSpellEffectHandler('buff_damaged_minions', executeBuffDamagedMinions);
  EffectRegistry.registerSpellEffectHandler('draw_weapon_gain_armor', executeDrawWeaponGainArmor);
  EffectRegistry.registerSpellEffectHandler('gain_armor_reduce_hero_power', executeGainArmorReduceHeroPower);
  EffectRegistry.registerSpellEffectHandler('cleave_damage', executeCleaveAttack);
  EffectRegistry.registerSpellEffectHandler('armor_based_on_missing_health', executeArmorBasedOnMissingHealth);
  EffectRegistry.registerSpellEffectHandler('equip_special_weapon', executeEquipSpecialWeapon);
  
}