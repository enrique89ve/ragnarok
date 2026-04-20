/**
 * SpellEffect Handlers Index
 * 
 * This file exports all spellEffect handlers for registration with the EffectRegistry
 */
import executeAoeDamage from './aoe_damageHandler';
import executeArmor from './armorHandler';
import executeBuff from './buffHandler';
import executeBuffAttack from './buffAttackHandler';
import executeBuffAndEnchant from './buffAndEnchantHandler';
import executeBuffAndImmune from './buffAndImmuneHandler';
import executeBuffAllWithDeathrattle from './buffAllWithDeathrattleHandler';
import executeBuffThenDestroy from './buffThenDestroyHandler';
import executeConditionalFreezeOrDamage from './conditionalFreezeOrDamageHandler';
import executeCopyFromOpponent from './copyFromOpponentHandler';
import executeCopyLastPlayedCard from './copyLastPlayedCardHandler';
import executeCopyToHand from './copyToHandHandler';
import executeCustom from './customHandler';
import executeDamage from './damageHandler';
import executeDamageAndBuff from './damageAndBuffHandler';
import executeDamageAndBuffWeapon from './damageAndBuffWeaponHandler';
import executeDamageAndHeal from './damageAndHealHandler';
import executeDamageBasedOnMissingHealth from './damageBasedOnMissingHealthHandler';
import executeDamageDrawIfSurvives from './damageDrawIfSurvivesHandler';
import executeDamageWithAdjacent from './damageWithAdjacentHandler';
import executeDeathCoil from './deathCoilHandler';
import executeDestroy from './destroyHandler';
import executeDestroyDeckPortion from './destroyDeckPortionHandler';
import executeDestroyRandom from './destroyRandomHandler';
import executeDiscover from './discoverHandler';
import executeDiscoverFromDeck from './discoverFromDeckHandler';
import executeDoubleHealth from './doubleHealthHandler';
import executeDrawAndShuffle from './drawAndShuffleHandler';
import executeDrawSpecific from './drawSpecificHandler';
import executeDrawToMatchOpponent from './drawToMatchOpponentHandler';
import executeEnchant from './enchantHandler';
import executeFreezeAdjacent from './freezeAdjacentHandler';
import executeFreezeAndDamage from './freezeAndDamageHandler';
import executeFreezeAndDraw from './freezeAndDrawHandler';
import executeGainArmorAndImmunity from './gainArmorAndImmunityHandler';
import executeGainArmorAndLifesteal from './gainArmorAndLifestealHandler';
import executeGainArmorReduceCost from './gain_armor_reduce_cost';
import executeGainMana from './gainManaHandler';
import executeGiveDivineShield from './giveDivineShieldHandler';
import executeGrantDeathrattle from './grantDeathrattleHandler';
import executeGrantImmunity from './grantImmunityHandler';
import executeKillAndSummon from './killAndSummonHandler';
import executeManaReduction from './manaReductionHandler';
import executeMindControlTemporary from './mindControlTemporaryHandler';
import executeNextSpellCostsHealth from './nextSpellCostsHealthHandler';
import executeResurrectRandom from './resurrectRandomHandler';
import executeReturnAllMinionsToHand from './returnAllMinionsToHandHandler';
import executeSacrificeAndDamage from './sacrificeAndDamageHandler';
import executeSetHealth from './set_healthHandler';
import executeSummon from './summonHandler';
import executeSummonCopyFromDeck from './summonCopyFromDeckHandler';
import executeSummonFromGraveyard from './summonFromGraveyardHandler';
import executeSummonRandom from './summonRandomHandler';
import executeSwapHeroPower from './swapHeroPowerHandler';
import executeTempMana from './tempManaHandler';
import executeTransformAll from './transformAllHandler';
import executeBetrayal from './betrayalHandler';
import executeCommandingShout from './commandingShoutHandler';
import executeAoeWithOnKill from './aoeWithOnKillHandler';
import executeAttackEqualsHealth from './attackEqualsHealthHandler';
import executeDamageBasedOnArmor from './damage_based_on_armor';
import executeDamageWithSelfDamage from './damage_with_self_damage';
import executeGainArmorReduceHeroPower from './gain_armor_reduce_hero_power';
import executeEquipSpecialWeapon from './equip_special_weapon';
import executeDrawWeaponGainArmor from './draw_weapon_gain_armor';
import executeCleaveDamage from './cleave_damage';
import executeBuffWeapon from './buff_weapon';
import executeBuffDamagedMinions from './buff_damaged_minions';
import executeArmorBasedOnMissingHealth from './armor_based_on_missing_health';
import executeRevealHand from './revealHandHandler';

// Map of all spellEffect handlers
const spellEffectHandlers = {
  'aoe_damage': executeAoeDamage,
  'armor': executeArmor,
  'buff': executeBuff,
  'buff_attack': executeBuffAttack,
  'attack_modifier': executeBuffAttack,
  'buff_and_enchant': executeBuffAndEnchant,
  'buff_and_immune': executeBuffAndImmune,
  'buff_all_with_deathrattle': executeBuffAllWithDeathrattle,
  'buff_then_destroy': executeBuffThenDestroy,
  'conditional_freeze_or_damage': executeConditionalFreezeOrDamage,
  'copy_from_opponent': executeCopyFromOpponent,
  'copy_last_played_card': executeCopyLastPlayedCard,
  'copy_to_hand': executeCopyToHand,
  'custom': executeCustom,
  'damage': executeDamage,
  'damage_hero': executeDamage,
  'damage_and_buff': executeDamageAndBuff,
  'damage_and_buff_weapon': executeDamageAndBuffWeapon,
  'damage_and_heal': executeDamageAndHeal,
  'damage_based_on_missing_health': executeDamageBasedOnMissingHealth,
  'damage_draw_if_survives': executeDamageDrawIfSurvives,
  'damage_with_adjacent': executeDamageWithAdjacent,
  'death_coil': executeDeathCoil,
  'destroy': executeDestroy,
  'destroy_deck_portion': executeDestroyDeckPortion,
  'destroy_random': executeDestroyRandom,
  'discover': executeDiscover,
  'discover_from_deck': executeDiscoverFromDeck,
  'double_health': executeDoubleHealth,
  'draw_and_shuffle': executeDrawAndShuffle,
  'draw_specific': executeDrawSpecific,
  'draw_to_match_opponent': executeDrawToMatchOpponent,
  'enchant': executeEnchant,
  'freeze_adjacent': executeFreezeAdjacent,
  'freeze_and_damage': executeFreezeAndDamage,
  'freeze_and_draw': executeFreezeAndDraw,
  'gain_armor_and_immunity': executeGainArmorAndImmunity,
  'gain_armor_and_lifesteal': executeGainArmorAndLifesteal,
  'gain_armor_reduce_cost': executeGainArmorReduceCost,
  'gain_mana': executeGainMana,
  'give_divine_shield': executeGiveDivineShield,
  'grant_deathrattle': executeGrantDeathrattle,
  'grant_immunity': executeGrantImmunity,
  'kill_and_summon': executeKillAndSummon,
  'mana_reduction': executeManaReduction,
  'mind_control_temporary': executeMindControlTemporary,
  'next_spell_costs_health': executeNextSpellCostsHealth,
  'resurrect_random': executeResurrectRandom,
  'return_all_minions_to_hand': executeReturnAllMinionsToHand,
  'sacrifice_and_damage': executeSacrificeAndDamage,
  'set_health': executeSetHealth,
  'summon': executeSummon,
  'summon_copy_from_deck': executeSummonCopyFromDeck,
  'summon_from_graveyard': executeSummonFromGraveyard,
  'summon_random': executeSummonRandom,
  'swap_hero_power': executeSwapHeroPower,
  'temp_mana': executeTempMana,
  'gain_temporary_mana': executeTempMana,
  'transform_all': executeTransformAll,
  'betrayal': executeBetrayal,
  'commanding_shout': executeCommandingShout,
  'aoe_with_on_kill': executeAoeWithOnKill,
  'attack_equals_health': executeAttackEqualsHealth,
  'damage_based_on_armor': executeDamageBasedOnArmor,
  'damage_with_self_damage': executeDamageWithSelfDamage,
  'gain_armor_reduce_hero_power': executeGainArmorReduceHeroPower,
  'equip_special_weapon': executeEquipSpecialWeapon,
  'draw_weapon_gain_armor': executeDrawWeaponGainArmor,
  'cleave_damage': executeCleaveDamage,
  'buff_weapon': executeBuffWeapon,
  'buff_damaged_minions': executeBuffDamagedMinions,
  'armor_based_on_missing_health': executeArmorBasedOnMissingHealth,
  'set_health_minion': executeSetHealth,
  'reveal_hand': executeRevealHand,
};

export default spellEffectHandlers;
