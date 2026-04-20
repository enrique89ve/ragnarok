/**
 * Battlecry Handlers Index
 * 
 * This file exports all battlecry handlers for registration with the EffectRegistry
 */

// Damage handlers
import executeDamage from './damageHandler';
import executeConditionalDamage from './conditionalDamageHandler';
import executeDamageAndBuff from './damageAndBuffHandler';
import executeRandomDamageAndBuff from './randomDamageAndBuffHandler';

// Buff handlers
import executeBuff from './buffHandler';
import executeBuffAdjacent from './buffAdjacentHandler';
import executeBuffAndTaunt from './buffAndTauntHandler';
import executeBuffDeck from './buffDeckHandler';
import executeBuffHand from './buffHandHandler';
import executeBuffWeapon from './buffWeaponHandler';
import executeConditionalBuff from './conditional_buff';

// Draw handlers
import executeDrawMultiple from './drawMultipleHandler';
import executeDrawByType from './drawByTypeHandler';
import executeDrawSpecific from './drawSpecificHandler';
import executeDrawUntil from './drawUntilHandler';
import executeConditionalDraw from './conditionalDrawHandler';

// Destroy handlers
import executeDestroySecrets from './destroySecretsHandler';
import executeDestroySpells from './destroySpellsHandler';
import executeDestroySpellsByCost from './destroySpellsByCostHandler';
import executeDestroyTribe from './destroyTribeHandler';
import executeDestroyWeapon from './destroyWeaponHandler';
import executeDestroyWeaponDraw from './destroyWeaponDrawHandler';
import executeDestroyWeaponGainArmor from './destroyWeaponGainArmorHandler';
import executeDestroyAndSteal from './destroyAndStealHandler';
import executeDestroyAndStore from './destroyAndStoreHandler';
import executeDestroyManaCrystal from './destroyManaCrystalHandler';

// Summon handlers
import executeSummon from './summonHandler';
import executeSummonRandom from './summonRandomHandler';
import executeSummonRandomMinions from './summonRandomMinionsHandler';
import executeSummonCopy from './summonCopyHandler';
import executeSummonCopyFromDeck from './summonCopyFromDeckHandler';
import executeSummonFromSpellCost from './summonFromSpellCostHandler';
import executeSummonJadeGolem from './summonJadeGolemHandler';
import executeFillBoard from './fillBoardHandler';

// Discover handlers
import executeDiscover from './discoverHandler';
import executeDiscoverTriclass from './discoverTriclassHandler';
import executeConditionalDiscover from './conditionalDiscoverHandler';
import executeDiscoverFromGraveyard from './discoverFromGraveyardHandler';

// Transform handlers
import executeTransform from './transformHandler';
import executeTransformRandom from './transformRandomHandler';
import executeTransformCopy from './transformCopyHandler';
import executeTransformCopyFromDeck from './transformCopyFromDeckHandler';
import executeTransformDeck from './transformDeckHandler';
import executeTransformAndSilence from './transformAndSilenceHandler';

// Stat/Keyword handlers
import executeDivineShieldGain from './divineShieldGainHandler';
import executeGainKeyword from './gainKeywordHandler';
import executeHealthPerCard from './healthPerCardHandler';
import executeSetMana from './setManaHandler';
import executeSetStats from './setStatsHandler';
import executeAlterMana from './alterManaHandler';
import executeGiveMana from './giveManaHandler';
import executeGainArmorEqualToAttack from './gain_armor_equal_to_attack';
import executeGainArmorConditionalDraw from './gain_armor_conditional_draw';
import executeGrantPersistentEffect from './grantPersistentEffectHandler';
import executeGrantStealth from './grantStealthHandler';
import executePersistentEffect from './persistentEffectHandler';
import executeGiveDivineShield from './giveDivineShieldHandler';

// Special mechanics handlers
import executeAdapt from './adaptHandler';
import executeChangeHeroPower from './changeHeroPowerHandler';
import executeExtraTurns from './extraTurnsHandler';
import executeMindControlRandom from './mindControlRandomHandler';
import executeSwapStats from './swapStatsHandler';
import executeSwapStatsWithTarget from './swapStatsWithTargetHandler';
import executeSwapDecks from './swapDecksHandler';
import executeSwapWithDeck from './swapWithDeckHandler';
import executeReplaceHeroPower from './replaceHeroPowerHandler';
import executeReplayBattlecries from './replayBattlecriesHandler';
import executeReplaySpells from './replaySpellsHandler';
import executeWheelOfYogg from './wheelOfYoggHandler';

// Card manipulation handlers
import executeAddCard from './addCardHandler';
import executeCopyToHand from './copyToHandHandler';
import executeGiveCards from './giveCardsHandler';
import executeShuffleCard from './shuffleCardHandler';
import executeShuffleSpecial from './shuffleSpecialHandler';
import executeReturn from './returnHandler';
import executeReorderDeck from './reorderDeckHandler';
import executeReplaceSpells from './replaceSpellsHandler';
import executeResurrectAll from './resurrectAllHandler';

// Weapon handlers
import executeEquipHelgrind from './equipFrostmourneHandler';
import executeEquipWeaponFromDeckGainArmor from './equip_weapon_from_deck_gain_armor';
import executeRandomWeapon from './randomWeaponHandler';
import executeWeaponAttackBuff from './weaponAttackBuffHandler';
import executeWeaponDurabilityDamage from './weaponDurabilityDamageHandler';

// Misc handlers
import executeConsumeAdjacent from './consumeAdjacentHandler';
import executeEatOpponentCard from './eatOpponentCardHandler';
import executeLimitAttackTarget from './limitAttackTargetHandler';
import executeOpponentSummonFromHand from './opponentSummonFromHandHandler';
import executeFreeze from './freezeHandler';

// Necromancer specific handlers
import executeBuffFromGraveyardCount from './buffFromGraveyardCountHandler';
import executeSummonSkeletonsBasedOnGraveyard from './summonSkeletonsBasedOnGraveyardHandler';

// Norse mechanic handlers
import executeSummonDeadEinherjar from './summonDeadEinherjarHandler';
import executeSummonCopyIfBlood from './summonCopyIfBloodHandler';
import executeGainArmor from './gainArmorHandler';

// Map of all battlecry handlers
const battlecryHandlers: Record<string, Function> = {
  // Damage
  'damage': executeDamage,
  'conditional_damage': executeConditionalDamage,
  'damage_and_buff': executeDamageAndBuff,
  'random_damage_and_buff': executeRandomDamageAndBuff,
  
  // Buff
  'buff': executeBuff,
  'buff_adjacent': executeBuffAdjacent,
  'buff_and_taunt': executeBuffAndTaunt,
  'buff_deck': executeBuffDeck,
  'buff_hand': executeBuffHand,
  'buff_weapon': executeBuffWeapon,
  'conditional_buff': executeConditionalBuff,
  
  // Draw
  'draw': executeDrawMultiple,
  'draw_multiple': executeDrawMultiple,
  'draw_by_type': executeDrawByType,
  'draw_specific': executeDrawSpecific,
  'draw_until': executeDrawUntil,
  'conditional_draw': executeConditionalDraw,
  
  // Destroy
  'destroy_secrets': executeDestroySecrets,
  'destroy_spells': executeDestroySpells,
  'destroy_spells_by_cost': executeDestroySpellsByCost,
  'destroy_tribe': executeDestroyTribe,
  'destroy_weapon': executeDestroyWeapon,
  'destroy_weapon_draw': executeDestroyWeaponDraw,
  'destroy_weapon_gain_armor': executeDestroyWeaponGainArmor,
  'destroy_and_steal': executeDestroyAndSteal,
  'destroy_and_store': executeDestroyAndStore,
  'destroy_mana_crystal': executeDestroyManaCrystal,
  
  // Summon
  'summon': executeSummon,
  'summon_random': executeSummonRandom,
  'summon_random_minions': executeSummonRandomMinions,
  'summon_copy': executeSummonCopy,
  'summon_copy_from_deck': executeSummonCopyFromDeck,
  'summon_from_spell_cost': executeSummonFromSpellCost,
  'summon_yggdrasil_golem': executeSummonJadeGolem,
  'fill_board': executeFillBoard,
  
  // Discover
  'discover': executeDiscover,
  'discover_triclass': executeDiscoverTriclass,
  'conditional_discover': executeConditionalDiscover,
  'discover_from_graveyard': executeDiscoverFromGraveyard,
  
  // Transform
  'transform': executeTransform,
  'transform_random': executeTransformRandom,
  'transform_copy': executeTransformCopy,
  'transform_copy_from_deck': executeTransformCopyFromDeck,
  'transform_deck': executeTransformDeck,
  'transform_and_silence': executeTransformAndSilence,
  
  // Stats/Keywords
  'divine_shield_gain': executeDivineShieldGain,
  'gain_keyword': executeGainKeyword,
  'health_per_card': executeHealthPerCard,
  'set_mana': executeSetMana,
  'set_stats': executeSetStats,
  'alter_mana': executeAlterMana,
  'give_mana': executeGiveMana,
  'gain_armor_equal_to_attack': executeGainArmorEqualToAttack,
  'gain_armor_conditional_draw': executeGainArmorConditionalDraw,
  'grant_persistent_effect': executeGrantPersistentEffect,
  'grant_stealth': executeGrantStealth,
  'persistent_effect': executePersistentEffect,
  'give_divine_shield': executeGiveDivineShield,
  
  // Special mechanics
  'adapt': executeAdapt,
  'change_hero_power': executeChangeHeroPower,
  'extra_turns': executeExtraTurns,
  'mind_control_random': executeMindControlRandom,
  'swap_stats': executeSwapStats,
  'swap_stats_with_target': executeSwapStatsWithTarget,
  'swap_decks': executeSwapDecks,
  'swap_with_deck': executeSwapWithDeck,
  'replace_hero_power': executeReplaceHeroPower,
  'replay_battlecries': executeReplayBattlecries,
  'replay_spells': executeReplaySpells,
  'wheel_of_yogg': executeWheelOfYogg,
  
  // Card manipulation
  'add_card': executeAddCard,
  'copy_to_hand': executeCopyToHand,
  'give_cards': executeGiveCards,
  'shuffle_card': executeShuffleCard,
  'shuffle_special': executeShuffleSpecial,
  'return': executeReturn,
  'reorder_deck': executeReorderDeck,
  'replace_spells': executeReplaceSpells,
  'resurrect_all': executeResurrectAll,
  
  // Weapon
  'equip_helgrind': executeEquipHelgrind,
  'equip_weapon_from_deck_gain_armor': executeEquipWeaponFromDeckGainArmor,
  'random_weapon': executeRandomWeapon,
  'weapon_attack_buff': executeWeaponAttackBuff,
  'weapon_durability_damage': executeWeaponDurabilityDamage,
  
  // Misc
  'consume_adjacent': executeConsumeAdjacent,
  'eat_opponent_card': executeEatOpponentCard,
  'limit_attack_target': executeLimitAttackTarget,
  'opponent_summon_from_hand': executeOpponentSummonFromHand,
  'freeze': executeFreeze,
  
  // Necromancer specific
  'buff_from_graveyard_count': executeBuffFromGraveyardCount,
  'summon_skeletons_based_on_graveyard': executeSummonSkeletonsBasedOnGraveyard,

  // Norse mechanics
  'summon_dead_einherjar': executeSummonDeadEinherjar,
  'summon_copy_if_blood': executeSummonCopyIfBlood,
  'gain_armor': executeGainArmor,
  'deal_damage': executeDamage,
};

export default battlecryHandlers;
