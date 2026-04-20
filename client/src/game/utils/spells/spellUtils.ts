import { GameState, SpellEffect, CardData, CardInstance, MinionCardData, GameLogEventType } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { executeBattlecry } from '../battlecryUtils';
import { createCardInstance } from '../cards/cardUtils';
import { updateEnrageEffects } from '../mechanics/enrageUtils';
import { dealDamage } from '../effects/damageUtils';
import { removeDeadMinions, destroyCard as destroyCardFromZone } from '../zoneUtils';
import { drawCard, drawMultipleCards } from '../drawUtils';
import executeSetHealthHandler from '../../effects/handlers/spellEffect/set_healthHandler';
import allCards, { getCardById } from '../../data/allCards';
import { useAnimationStore } from '../../animations/AnimationManager';
import { logActivity } from '../../stores/activityLogStore';
import { GameEventBus } from '@/core/events/GameEventBus';
import { scheduleSpellEffect, SpellEffectType } from '../../animations/UnifiedAnimationOrchestrator';
// Lazy access to break game-engine <-> game-store circular dependency
const useGameStore = {
	getState: () => ((globalThis as Record<string, unknown>).__ragnarokGameStore as
		{ getState: () => { gameState: GameState } }).getState()
};
import { isMinion, isSpell, isWeapon, getAttack, getHealth } from '../cards/typeGuards';
import { trackQuestProgress } from '../quests/questProgress';
import { debug } from '../../config/debugConfig';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../../constants/gameConstants';
import { checkPetEvolutionTrigger } from '../petEvolutionTriggers';
import { addKeyword, removeKeyword, hasKeyword } from '../cards/keywordUtils';
import { shuffleInPlace, shuffleArray } from '../seededRng';

function getSpellEffectType(effectType: string): SpellEffectType {
  const typeMap: Record<string, SpellEffectType> = {
    'damage': 'damage',
    'heal': 'heal',
    'buff': 'buff',
    'debuff': 'debuff',
    'summon': 'summon',
    'aoe_damage': 'aoe',
    'cleave_damage': 'aoe',
    'draw': 'draw',
    'quest': 'quest',
    'transform': 'transform',
    'freeze': 'debuff',
    'silence': 'debuff',
  };
  return typeMap[effectType] || 'default';
}

/**
 * Queue a spell damage popup animation
 */
function queueSpellDamagePopup(spellName: string, damage: number, targetName?: string) {
  try {
    const addAnimation = useAnimationStore.getState().addAnimation;
    addAnimation({
      id: `spell-damage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'spell_damage_popup',
      startTime: Date.now(),
      duration: 3500,
      damage,
      spellName,
      targetName
    });
  } catch (error) {
    debug.error('[SpellDamagePopup] Failed to queue popup:', error);
  }
}

/**
 * Execute a mana crystal spell effect
 * Used for spells like The Coin or Innervate that give temporary mana
 */
function executeManaSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Mana crystal spell missing value parameter');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const manaAmount = effect.value;
  
  // Give mana to current player
  if (currentPlayer === 'player') {
    newState.players.player.mana.current += manaAmount;
    
    // If this is temporary mana, we don't need to cap it
    // Otherwise, ensure we don't exceed max mana
    if (!effect.isTemporaryMana) {
      newState.players.player.mana.current = Math.min(
        newState.players.player.mana.current,
        newState.players.player.mana.max
      );
    }
  } else {
    newState.players.opponent.mana.current += manaAmount;
    
    // If this is temporary mana, we don't need to cap it
    // Otherwise, ensure we don't exceed max mana
    if (!effect.isTemporaryMana) {
      newState.players.opponent.mana.current = Math.min(
        newState.players.opponent.mana.current,
        newState.players.opponent.mana.max
      );
    }
  }
  
  return newState;
}

/**
 * Execute a spell card's effect
 */
export function executeSpell(
  state: GameState,
  spellCard: CardInstance,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  // Type guard: ensure card is a spell with spellEffect
  if (!isSpell(spellCard.card) || !spellCard.card.spellEffect) {
    debug.error(`Card ${spellCard.card.name} does not have a spell effect`);
    return state;
  }
  
  // Create a new effect with the card property for special handling
  const effect: SpellEffect = {
    ...spellCard.card.spellEffect,
    card: spellCard.card // Add the card reference for special cases like Divine Favor
  };
  
  const playerType = state.currentTurn;
  
  
  logActivity(
    'spell_cast',
    playerType === 'player' ? 'player' : 'opponent',
    `${spellCard.card.name} cast`,
    { cardName: spellCard.card.name, cardId: Number(spellCard.card.id) }
  );
  
  try {
    const spellType = getSpellEffectType(effect.type);
    const description = spellCard.card.description || '';
    scheduleSpellEffect(spellCard.card.name, description, spellType);
  } catch (error) {
    debug.error('[SpellAnimation] Failed to schedule spell effect:', error);
  }
  
  // Execute the appropriate effect based on the type
  let resultState: GameState;
  
  switch (effect.type) {
    case 'damage':
      resultState = executeDamageSpell(state, effect, targetId, targetType);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, targetType === 'hero' ? 'Enemy Hero' : undefined);
      }
      break;
    case 'heal':
      resultState = executeHealSpell(state, effect, targetId, targetType);
      break;
    case 'buff':
      resultState = executeBuffSpell(state, effect, targetId);
      break;
    case 'aoe_damage':
      resultState = executeAoEDamageSpell(state, effect);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, 'All Enemies');
      }
      break;
    case 'draw':
      resultState = executeDrawSpell(state, effect);
      break;
    case 'summon':
      resultState = executeSummonSpell(state, effect);
      break;
    case 'discover':
      debug.log('[executeSpell] Discovery spell detected, processing discovery state');
      resultState = executeDiscoverSpell(state, effect, spellCard.instanceId);
      break;
    case 'freeze':
      resultState = executeFreezeSpell(state, effect, targetId, targetType);
      break;
    case 'freeze_and_damage':
      // Freeze all targets first, then deal damage to frozen ones
      resultState = applyFreezeEffect(state, effect.targetType || 'all_enemy_minions');
      resultState = executeAoEDamageSpell(resultState, { ...effect, targetType: effect.targetType || 'all_enemy_minions' });
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, 'Freeze & Damage');
      }
      break;
    case 'transform':
      resultState = executeTransformSpell(state, effect, targetId);
      break;
    case 'silence':
      resultState = executeSilenceSpell(state, effect, targetId);
      break;
    case 'mana_crystal':
      resultState = executeManaSpell(state, effect);
      break;
    case 'quest':
      resultState = executeQuestSpell(state, spellCard);
      break;
    case 'extra_turn':
      resultState = executeExtraTurnSpell(state, effect);
      break;
    case 'crystal_core':
      resultState = executeCrystalCoreSpell(state, effect);
      break;
    case 'cleave_damage':
      resultState = executeCleaveSpell(state, effect, targetId, targetType);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, 'Cleave');
      }
      break;
    case 'cleave_damage_with_freeze':
      resultState = executeCleaveWithFreezeSpell(state, effect, targetId, targetType);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, 'Cleave & Freeze');
      }
      break;
    case 'conditional_damage':
      resultState = executeConditionalDamageSpell(state, effect, targetId, targetType);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value);
      }
      break;
    case 'conditional_freeze_or_destroy':
      resultState = executeConditionalFreezeOrDestroySpell(state, effect, targetId, targetType);
      break;
    case 'draw_and_damage':
      resultState = executeDrawAndDamageSpell(state, effect, targetId, targetType);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value);
      }
      break;
    case 'draw_both':
      resultState = executeDrawBothPlayersSpell(state, effect);
      break;
    case 'damage_and_shuffle':
      resultState = executeDamageAndShuffleSpell(state, effect, targetId, targetType);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value);
      }
      break;
    case 'cost_reduction':
      resultState = executeCostReductionSpell(state, effect);
      break;
    case 'set_health':
      resultState = executeSetHealthSpell(state, effect, targetId, targetType);
      break;
    case 'destroy':
      resultState = executeDestroySpell(state, effect, targetId, targetType);
      break;
    case 'mind_control':
      resultState = executeMindControlSpell(state, effect, targetId);
      break;
    case 'mind_control_temporary':
      resultState = executeMindControlSpell(state, effect, targetId, true);
      break;
    case 'return_to_hand':
      resultState = executeReturnToHandSpell(state, effect, targetId);
      break;
    case 'buff_weapon':
      resultState = executeBuffWeaponSpell(state, effect);
      break;
    case 'equip_weapon':
      resultState = executeEquipWeaponSpell(state, effect);
      break;
    case 'add_card':
      resultState = executeAddCardSpell(state, effect);
      break;
    case 'random_damage':
    case 'damage_random_enemy':
      resultState = executeRandomDamageSpell(state, effect);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, 'Random Target');
      }
      break;
    case 'destroy_random':
      resultState = executeDestroyRandomSpell(state, effect);
      break;
    case 'shuffle_into_deck':
      resultState = executeShuffleIntoDeckSpell(state, effect, targetId);
      break;
    case 'give_stealth':
    case 'grant_keyword':
      resultState = executeGrantKeywordSpell(state, effect, targetId);
      break;
    case 'grant_deathrattle':
      resultState = executeGrantDeathrattleSpell(state, effect, targetId);
      break;
    case 'damage_based_on_armor':
      resultState = executeDamageBasedOnArmorSpell(state, effect, targetId, targetType);
      // Calculate actual damage based on current player's armor for popup
      const currentPlayerState = state.currentTurn === 'player' ? state.players.player : state.players.opponent;
      const armorDamage = currentPlayerState.armor || 0;
      if (armorDamage > 0) {
        queueSpellDamagePopup(spellCard.card.name, armorDamage, 'Armor Damage');
      }
      break;
    case 'summon_yggdrasil_golem':
      resultState = executeSummonYggdrasilGolemSpell(state);
      break;
    case 'gain_mana':
    case 'gain_temporary_mana':
      resultState = executeGainManaSpell(state, effect);
      break;
    case 'summon_random':
      resultState = executeSummonRandomSpell(state, effect);
      break;
    case 'summon_copies':
      resultState = executeSummonCopiesSpell(state, effect, targetId);
      break;
    case 'summon_token':
      resultState = executeSummonTokenSpell(state, effect);
      break;
    case 'summon_minions':
      resultState = executeSummonMultipleSpell(state, effect);
      break;
    case 'summon_from_graveyard':
      resultState = executeSummonFromGraveyardSpell(state, effect);
      break;
    case 'summon_highest_cost_from_graveyard':
      resultState = executeSummonHighestCostFromGraveyardSpell(state, effect);
      break;
    case 'summon_stored':
      resultState = executeSummonStoredSpell(state, effect);
      break;
    case 'resurrect_random':
      resultState = executeResurrectSpell(state, effect);
      break;
    case 'resurrect_multiple':
      resultState = executeResurrectMultipleSpell(state, effect);
      break;
    case 'resurrect_deathrattle':
      resultState = executeResurrectDeathrattleSpell(state, effect);
      break;
    case 'silence_all':
      resultState = executeSilenceAllSpell(state, effect);
      break;
    case 'silence_and_damage':
      resultState = executeSilenceAndDamageSpell(state, effect, targetId, targetType);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, 'Silence + Damage');
      }
      break;
    case 'set_attack':
      resultState = executeSetAttackSpell(state, effect, targetId);
      break;
    case 'set_hero_health':
      resultState = executeSetHeroHealthSpell(state, effect, targetId);
      break;
    case 'self_damage':
      resultState = executeSelfDamageSpell(state, effect);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, 'Self Damage');
      }
      break;
    case 'self_damage_buff':
      resultState = executeSelfDamageBuffSpell(state, effect);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, 'Self Damage + Buff');
      }
      break;
    case 'sacrifice':
      resultState = executeSacrificeSpell(state, effect, targetId);
      break;
    case 'sacrifice_and_aoe_damage':
      resultState = executeSacrificeAndAoEDamageSpell(state, effect, targetId);
      if (effect.value) {
        queueSpellDamagePopup(spellCard.card.name, effect.value, 'Sacrifice + AoE');
      }
      break;
    case 'return':
      resultState = executeReturnToHandSpell(state, effect, targetId);
      break;
    case 'return_to_hand_next_turn':
      resultState = executeReturnToHandNextTurnSpell(state, effect, targetId);
      break;
    case 'transform_random':
      resultState = executeTransformRandomSpell(state, effect);
      break;
    case 'transform_copy':
    case 'transform_into_copy':
      resultState = executeTransformCopySpell(state, effect, targetId);
      break;
    case 'transform_random_in_hand':
      resultState = executeTransformRandomInHandSpell(state, effect);
      break;
    case 'transform_and_silence':
      resultState = executeTransformAndSilenceSpell(state, effect, targetId);
      break;
    case 'transform_deck':
      resultState = executeTransformDeckSpell(state, effect);
      break;
    case 'transform_copy_from_deck':
      resultState = executeTransformCopyFromDeckSpell(state, effect, targetId);
      break;
    case 'transform_healing_to_damage':
      resultState = executeTransformHealingToDamageSpell(state, effect);
      break;
    case 'split_damage':
      resultState = executeSplitDamageSpell(state, effect);
      break;
    case 'swap_decks':
      resultState = executeSwapDecksSpell(state, effect);
      break;
    case 'swap_hero_power':
      resultState = executeSwapHeroPowerSpell(state, effect);
      break;
    case 'reduce_deck_cost':
      resultState = executeReduceDeckCostSpell(state, effect);
      break;
    case 'reduce_next_spell_cost':
      resultState = executeReduceNextSpellCostSpell(state, effect);
      break;
    case 'reduce_opponent_mana':
      resultState = executeReduceOpponentManaSpell(state, effect);
      break;
    case 'reduce_spell_cost':
      resultState = executeReduceSpellCostSpell(state, effect);
      break;
    case 'replace_hero_power':
    case 'change_hero_power':
      resultState = executeReplaceHeroPowerSpell(state, effect);
      break;
    case 'replay_battlecries':
      resultState = executeReplayBattlecriesSpell(state, effect);
      break;
    case 'replay_spells':
      resultState = executeReplaySpellsSpell(state, effect);
      break;
    case 'random_damage_and_buff':
      resultState = executeRandomDamageAndBuffSpell(state, effect);
      break;
    case 'random_damage_with_self_damage':
      resultState = executeRandomDamageWithSelfDamageSpell(state, effect);
      break;
    case 'random_weapon':
      resultState = executeRandomWeaponSpell(state, effect);
      break;
    case 'shuffle_copies':
      resultState = executeShuffleCopiesSpell(state, effect, targetId);
      break;
    case 'shuffle_cards':
      resultState = executeShuffleCardsSpell(state, effect);
      break;
    case 'gain_mana_crystal':
      resultState = executeManaSpell(state, { ...effect, value: effect.value || 1 });
      break;
    case 'draw_multiple':
      resultState = executeDrawSpell(state, { ...effect, value: effect.count || effect.value || 1 });
      break;
    case 'draw_until':
      resultState = executeDrawUntilSpell(state, effect);
      break;
    case 'gain_armor_and_draw':
      resultState = executeGainArmorAndDrawSpell(state, effect);
      break;
    case 'gain_armor_and_immunity':
      resultState = executeGainArmorAndImmunitySpell(state, effect);
      break;
    case 'gain_armor_and_lifesteal':
      resultState = executeGainArmorAndLifestealSpell(state, effect);
      break;
    case 'add_to_hand':
      resultState = executeAddCardSpell(state, effect);
      break;
    case 'give_cards':
      resultState = executeGiveCardsSpell(state, effect);
      break;
    case 'copy_card':
      resultState = executeCopyCardSpell(state, effect, targetId);
      break;
    case 'copy_from_opponent_deck':
      resultState = executeCopyFromOpponentDeckSpell(state, effect);
      break;
    case 'aoe_heal':
      resultState = executeAoEHealSpell(state, effect);
      break;
    case 'buff_all':
    case 'buff_all_minions':
      resultState = executeBuffAllSpell(state, effect);
      break;
    case 'debuff':
    case 'debuff_attack':
      resultState = executeDebuffSpell(state, effect, targetId);
      break;
    case 'resurrect':
      resultState = executeResurrectSpell(state, effect);
      break;
    case 'summon_multiple':
    case 'summon_tokens':
      resultState = executeSummonMultipleSpell(state, effect);
      break;
    case 'summon_copy':
      resultState = executeSummonCopySpell(state, effect, targetId);
      break;
    case 'destroy_all_minions':
    case 'destroy_all':
      resultState = executeDestroyAllMinionsSpell(state, effect);
      break;
    case 'destroy_tribe':
      resultState = executeDestroyTribeSpell(state, effect);
      break;
    case 'swap_stats':
      resultState = executeSwapStatsSpell(state, effect, targetId);
      break;
    // NOTE: 'discover' case removed - already handled earlier in switch at line 165
    case 'swap_stats_with_target':
      resultState = executeSwapStatsWithTargetSpell(state, effect, targetId);
      break;
    case 'double_health':
      resultState = executeDoubleHealthSpell(state, effect, targetId);
      break;
    case 'divine_shield_gain':
      resultState = executeGainDivineShieldSpell(state, effect, targetId);
      break;
    case 'grant_immunity':
      resultState = executeGrantImmunitySpell(state, effect, targetId);
      break;
    case 'mana_discount':
    case 'mana_reduction':
      resultState = executeManaDiscountSpell(state, effect);
      break;
    case 'hero_attack':
      resultState = executeHeroAttackSpell(state, effect);
      break;
    case 'weapon_damage_aoe':
      resultState = executeWeaponDamageAoESpell(state, effect);
      break;
    case 'shadowflame':
      resultState = executeShadowflameSpell(state, effect, targetId);
      break;
    case 'conditional_effect':
      resultState = executeConditionalEffectSpell(state, effect, targetId);
      break;
    case 'conditional_summon':
      resultState = executeConditionalSummonSpell(state, effect);
      break;
    case 'conditional_draw':
      resultState = executeConditionalDrawSpell(state, effect);
      break;
    case 'conditional_armor':
    case 'conditional_gain_armor':
      resultState = executeConditionalArmorSpell(state, effect);
      break;
    case 'draw_specific':
    case 'draw_by_type':
      resultState = executeDrawSpecificSpell(state, effect);
      break;
    case 'discard':
    case 'discard_random':
      resultState = executeDiscardSpell(state, effect);
      break;
    case 'mill':
    case 'mill_cards':
      resultState = executeMillSpell(state, effect);
      break;
    case 'buff_hand':
      resultState = executeBuffHandSpell(state, effect);
      break;
    case 'buff_deck':
      resultState = executeBuffDeckSpell(state, effect);
      break;
    case 'transform_all':
      resultState = executeTransformAllSpell(state, effect);
      break;
    case 'freeze_all':
      resultState = applyFreezeEffect(state, 'all_enemy_minions');
      break;
    case 'restore_health':
      resultState = executeHealSpell(state, effect, targetId, targetType);
      break;
    case 'shuffle_card':
      resultState = executeShuffleIntoDeckSpell(state, effect, targetId);
      break;
    case 'mind_control_random':
      resultState = executeMindControlRandomSpell(state, effect);
      break;
    case 'gain_mana_crystals':
      resultState = executeGainManaCrystalsSpell(state, effect);
      break;
    case 'buff_attack':
      resultState = executeBuffAttackSpell(state, effect, targetId);
      break;
    case 'deal_damage':
      resultState = executeDamageSpell(state, effect, targetId, targetType);
      if (effect.value) {
        queueSpellDamagePopup('Spell', effect.value);
      }
      break;
    case 'summon_from_hand':
      resultState = executeSummonFromHandSpell(state, effect);
      break;
    case 'buff_tribe':
      resultState = executeBuffTribeSpell(state, effect);
      break;
    case 'buff_self':
      resultState = executeBuffSelfSpell(state, effect, targetId);
      break;
    case 'conditional_self_buff':
      resultState = executeConditionalSelfBuffSpell(state, effect, targetId);
      break;
    case 'gain_stealth_until_next_turn':
      resultState = executeGrantKeywordSpell(state, { ...effect, keyword: 'stealth' }, targetId);
      break;
    case 'copy_card_to_hand':
      resultState = executeCopyCardSpell(state, effect, targetId);
      break;
    case 'steal_card':
      resultState = executeStealCardSpell(state, effect);
      break;
    case 'swap_attack_health':
      resultState = executeSwapStatsSpell(state, effect, targetId);
      break;
    case 'buff_damaged_minions':
      resultState = executeBuffDamagedMinionsSpell(state, effect);
      break;
    case 'draw_from_deck':
      resultState = executeDrawSpell(state, effect);
      break;
    case 'armor':
    case 'gain_armor':
      resultState = executeGainArmorSpell(state, effect);
      break;
    case 'armor_based_on_missing_health':
      resultState = executeArmorBasedOnMissingHealthSpell(state, effect);
      break;
    case 'gain_armor_reduce_cost':
      resultState = executeGainArmorReduceCostSpell(state, effect);
      break;
    case 'death_coil':
      resultState = executeDeathCoilSpell(state, effect, targetId, targetType);
      break;
    case 'aoe_with_on_kill':
      resultState = executeAoEWithOnKillSpell(state, effect, spellCard.card.name);
      break;
    case 'freeze_adjacent':
      resultState = executeFreezeAdjacentSpell(state, effect, targetId);
      break;
    case 'fill_board':
      resultState = executeFillBoardSpell(state, effect);
      break;
    case 'hero_attack_buff':
      resultState = executeHeroAttackBuffSpell(state, effect);
      break;
    case 'polymorph':
      resultState = executeTransformSpell(state, effect, targetId);
      break;
    case 'enchant':
    case 'buff_and_enchant':
      resultState = executeBuffSpell(state, effect, targetId);
      break;
    case 'give_divine_shield':
      resultState = executeGainDivineShieldSpell(state, effect, targetId);
      break;
    case 'copy_to_hand':
      resultState = executeCopyCardSpell(state, effect, targetId);
      break;
    case 'copy_from_opponent':
      resultState = executeCopyFromOpponentDeckSpell(state, effect);
      break;
    case 'discover_from_deck':
      resultState = executeDiscoverSpell(state, { ...effect, discoveryType: 'from_deck' }, spellCard.instanceId);
      break;
    case 'draw_to_match_opponent':
      resultState = executeDrawToMatchOpponentSpell(state);
      break;
    case 'freeze_and_draw':
      resultState = executeFreezeAndDrawSpell(state, effect, targetId, targetType);
      break;
    case 'armor_to_aoe_damage':
      resultState = executeArmorToAoeDamageSpell(state);
      break;
    case 'damage_and_heal_hero':
      resultState = executeDamageAndHealHeroSpell(state, effect, targetId, targetType);
      break;
    case 'damage_and_buff':
      resultState = executeDamageAndBuffSpell(state, effect, targetId, targetType);
      break;
    case 'damage_based_on_missing_health':
      resultState = executeDmgBasedOnMissingHpSpell(state, effect, targetId, targetType);
      break;
    case 'damage_draw_if_survives':
      resultState = executeDamageDrawIfSurvivesSpell(state, effect, targetId, targetType);
      break;
    case 'damage_with_adjacent':
      resultState = executeDamageWithAdjacentSpell(state, effect, targetId);
      break;
    case 'discover_and_summon':
      resultState = executeDiscoverAndSummonSpell(state, effect, spellCard.instanceId);
      break;
    case 'draw_and_reduce_cost':
      resultState = executeDrawAndReduceCostSpell(state, effect);
      break;
    case 'draw_and_repeat':
      resultState = executeDrawAndRepeatSpell(state, effect);
      break;
    case 'gain_armor_and_recruit':
      resultState = executeGainArmorAndRecruitSpell(state, effect);
      break;
    case 'recruit':
      resultState = executeRecruitSpell(state, effect);
      break;
    case 'summon_copy_from_hand':
      resultState = executeSummonCopyFromHandSpell(state);
      break;
    case 'summon_from_both_hands':
      resultState = executeSummonFromBothHandsSpell(state);
      break;
    case 'attack_equals_health':
      resultState = executeAttackEqualsHealthSpell(state, targetId);
      break;
    case 'buff_all_with_deathrattle':
      resultState = executeBuffAllWithDeathrattleSpell(state, effect);
      break;
    case 'buff_and_immune':
      resultState = executeBuffAndImmuneSpell(state, effect, targetId);
      break;
    case 'buff_then_destroy':
      resultState = executeBuffThenDestroySpell(state, effect, targetId);
      break;
    case 'commanding_shout':
      resultState = executeCommandingShoutSpell(state);
      break;
    case 'conditional_freeze_or_damage':
      resultState = executeConditionalFreezeOrDamageSpell(state, effect, targetId, targetType);
      break;
    case 'next_spell_costs_health':
      resultState = executeNextSpellCostsHealthSpell(state);
      break;
    case 'realm_shift': {
      const eff = effect as any;
      const caster = state.currentTurn === 'player' ? 'player' : 'opponent';
      let newState: GameState = {
        ...state,
        players: {
          player: {
            ...state.players.player,
            battlefield: state.players.player.battlefield.map(m => ({ ...m })),
          },
          opponent: {
            ...state.players.opponent,
            battlefield: state.players.opponent.battlefield.map(m => ({ ...m })),
          },
        },
        gameLog: [...(state.gameLog || [])],
      };
      if (state.activeRealm) {
        for (const oldEff of state.activeRealm.effects) {
          if (oldEff.type === 'buff_all_attack' || oldEff.type === 'debuff_all_attack') {
            const mod = oldEff.type === 'buff_all_attack' ? -oldEff.value : oldEff.value;
            for (const side of ['player', 'opponent'] as const) {
              const isFriendlyToOwner = side === state.activeRealm.owner;
              if (oldEff.target === 'all' || (oldEff.target === 'friendly' && isFriendlyToOwner) || (oldEff.target === 'enemy' && !isFriendlyToOwner)) {
                for (const minion of newState.players[side].battlefield) {
                  minion.currentAttack = Math.max(0, (minion.currentAttack ?? 0) + mod);
                }
              }
            }
          }
        }
      }
      if (eff.realmId === 'midgard') {
        newState.activeRealm = undefined;
        for (const side of ['player', 'opponent'] as const) {
          for (const minion of newState.players[side].battlefield) {
            minion.currentAttack = (minion.card as any).attack ?? minion.currentAttack;
            const baseHealth = (minion.card as any).health ?? 1;
            minion.currentHealth = Math.min(minion.currentHealth ?? baseHealth, baseHealth);
          }
        }
      } else {
        newState.activeRealm = {
          id: eff.realmId,
          name: eff.realmName,
          description: eff.realmDescription,
          owner: caster as 'player' | 'opponent',
          effects: eff.realmEffects || [],
        };
        // Yggdrasil's Gift: track unique realms visited
        if (eff.realmId) {
          if (!newState.realmsVisited) newState.realmsVisited = [];
          if (!newState.realmsVisited.includes(eff.realmId)) {
            newState.realmsVisited.push(eff.realmId);
          }
        }
        for (const realmEff of newState.activeRealm.effects) {
          if (realmEff.type === 'buff_all_attack') {
            for (const side of ['player', 'opponent'] as const) {
              const isFriendly = side === caster;
              if (realmEff.target === 'all' || (realmEff.target === 'friendly' && isFriendly) || (realmEff.target === 'enemy' && !isFriendly)) {
                for (const minion of newState.players[side].battlefield) {
                  minion.currentAttack = (minion.currentAttack ?? 0) + realmEff.value;
                }
              }
            }
            newState = checkPetEvolutionTrigger(newState, 'on_buff');
          } else if (realmEff.type === 'debuff_all_attack') {
            for (const side of ['player', 'opponent'] as const) {
              const isFriendly = side === caster;
              if (realmEff.target === 'all' || (realmEff.target === 'friendly' && isFriendly) || (realmEff.target === 'enemy' && !isFriendly)) {
                for (const minion of newState.players[side].battlefield) {
                  minion.currentAttack = Math.max(0, (minion.currentAttack ?? 0) - realmEff.value);
                }
              }
            }
            newState = checkPetEvolutionTrigger(newState, 'on_reduce_attack');
          }
        }
      }
      newState.gameLog.push({
        id: `realm-shift-${Date.now()}`,
        type: 'effect' as any,
        player: newState.currentTurn,
        text: eff.realmId === 'midgard'
          ? 'The realm shifts back to Midgard — all realm effects removed.'
          : `Realm shifted to ${eff.realmName}: ${eff.realmDescription}`,
        timestamp: Date.now(),
        turn: newState.turnNumber,
      });
      resultState = newState;
      break;
    }
    case 'create_prophecy': {
      const eff = effect as any;
      if (!eff.resolveEffect) return state;
      const prophecies = [...(state.prophecies || [])];
      prophecies.push({
        id: `prophecy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: eff.prophecyName || 'Prophecy',
        description: eff.prophecyDescription || '',
        turnsRemaining: eff.turnsRemaining || 3,
        effect: eff.resolveEffect,
        owner: state.currentTurn === 'player' ? 'player' : 'opponent',
        sourceCardId: spellCard.card.id,
      });
      const gameLog = [...(state.gameLog || [])];
      gameLog.push({
        id: `prophecy-cast-${Date.now()}`,
        type: 'effect' as any,
        player: state.currentTurn,
        text: `Prophecy inscribed: ${eff.prophecyName} — ${eff.prophecyDescription} (${eff.turnsRemaining} turns)`,
        timestamp: Date.now(),
        turn: state.turnNumber,
      });
      resultState = { ...state, prophecies, gameLog };
      break;
    }
    case 'damage_submerged': {
      const dmgVal = effect.value || 5;
      const opponent = state.currentTurn === 'player' ? 'opponent' : 'player';
      const subTargets = state.players[opponent].battlefield.filter((m: any) => m.isSubmerged);
      let dmgState = state;
      for (const target of subTargets) {
        dmgState = dealDamage(dmgState, opponent, 'minion', dmgVal, target.instanceId, undefined, state.currentTurn);
      }
      if (subTargets.length === 0) {
        dmgState = dealDamage(dmgState, opponent, 'hero', dmgVal, undefined, undefined, state.currentTurn);
      }
      resultState = dmgState;
      break;
    }
    case 'submerge_friendly': {
      const ownSide = state.currentTurn;
      if (targetId) {
        const bf = state.players[ownSide].battlefield;
        const target = bf.find((m: any) => m.instanceId === targetId);
        if (target) {
          target.isSubmerged = true;
          target.submergeTurnsLeft = (effect as any).value || 1;
          target.canAttack = false;
          const buffAtk = (effect as any).buffAttack || 0;
          const buffHp = (effect as any).buffHealth || 0;
          target.submergeBuff = { attack: buffAtk, health: buffHp };
        }
      }
      resultState = state;
      break;
    }
    case 'copy_prophecy': {
      const prophecies = state.prophecies || [];
      if (prophecies.length === 0) {
        resultState = state;
        break;
      }
      const ownerSide = state.currentTurn === 'player' ? 'player' : 'opponent';
      const friendly = prophecies.filter(p => p.owner === ownerSide);
      if (friendly.length === 0) {
        resultState = state;
        break;
      }
      const source = friendly[Math.floor(Math.random() * friendly.length)];
      const copy = {
        ...JSON.parse(JSON.stringify(source)),
        id: `prophecy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      resultState = { ...state, prophecies: [...prophecies, copy] };
      break;
    }
    case 'einherjar_count_heal': {
      const eff = effect as any;
      const ownerKey = state.currentTurn;
      const graveyard = state.players[ownerKey].graveyard || [];
      const einherjarDead = graveyard.filter(
        c => c.card.type === 'minion' && c.card.keywords?.includes('einherjar')
      ).length;
      const healAmount = (eff.healPerEinherjar || 3) * einherjarDead;
      let healState = state;
      if (healAmount > 0) {
        const player = healState.players[ownerKey];
        const maxHp = player.maxHealth || 100;
        player.heroHealth = Math.min((player.heroHealth ?? player.health ?? maxHp) + healAmount, maxHp);
        if (player.health !== undefined) player.health = player.heroHealth;
      }
      if (eff.bonusEffect?.type === 'draw') {
        const drawCount = eff.bonusEffect.value || 1;
        for (let i = 0; i < drawCount; i++) {
          healState = drawCard(healState);
        }
      }
      resultState = healState;
      break;
    }
    case 'blood_price_discount': {
      const eff = effect as any;
      const discountValue = eff.value || 99;
      const ownerSide = state.currentTurn;
      let discountState = JSON.parse(JSON.stringify(state)) as GameState;
      const hand = discountState.players[ownerSide].hand;
      let applied = false;
      for (const inst of hand) {
        if (inst.card.keywords?.includes('blood_price') && !applied) {
          const mana = (inst.card as any).manaCost ?? 0;
          (inst.card as any).manaCost = Math.max(0, mana - discountValue);
          applied = true;
        }
      }
      if (eff.bonusEffect?.type === 'draw') {
        const drawCount = eff.bonusEffect.value || 1;
        for (let i = 0; i < drawCount; i++) {
          discountState = drawCard(discountState);
        }
      }
      resultState = discountState;
      break;
    }
    case 'reveal_hand': {
      const eff = effect as any;
      let revealState = JSON.parse(JSON.stringify(state)) as GameState;
      const casterSide = state.currentTurn;
      const oppSide = casterSide === 'player' ? 'opponent' : 'player';
      (revealState.players[oppSide] as any).handRevealed = true;
      debug.log(`[Spell] ${casterSide} revealed ${oppSide}'s hand`);
      if (eff.bonusEffect?.type === 'copy_random_card') {
        const oppHand = revealState.players[oppSide].hand;
        if (oppHand.length > 0) {
          const wasPaidWithBlood = (revealState as any).lastCardPaidWithBloodPrice === true;
          if (!eff.bonusEffect.condition || eff.bonusEffect.condition !== 'blood_price_paid' || wasPaidWithBlood) {
            const pick = oppHand[Math.floor(Math.random() * oppHand.length)];
            const playerHand = revealState.players[casterSide].hand;
            if (playerHand.length < MAX_HAND_SIZE) {
              const copy = createCardInstance(pick.card);
              playerHand.push(copy);
            }
          }
        }
      }
      resultState = revealState;
      break;
    }
    case 'buff_per_realm_aoe': {
      const bpraState = JSON.parse(JSON.stringify(state)) as GameState;
      const realmsCount = (state.realmsVisited?.length || 0);
      if (realmsCount > 0) {
        const bf = bpraState.players[bpraState.currentTurn].battlefield;
        for (const m of bf) {
          m.currentAttack = (m.currentAttack || 0) + ((effect as any).buffAttack || 0) * realmsCount;
          m.currentHealth = (m.currentHealth || 0) + ((effect as any).buffHealth || 0) * realmsCount;
        }
      }
      resultState = bpraState;
      break;
    }
    case 'grant_blood_echo': {
      const gbeState = JSON.parse(JSON.stringify(state)) as GameState;
      const gbeTarget = gbeState.players[gbeState.currentTurn].battlefield.find(
        (m: CardInstance) => m.instanceId === targetId
      );
      if (gbeTarget) {
        const kws = gbeTarget.card.keywords || [];
        if (!kws.includes('blood_echo')) (gbeTarget.card as any).keywords = [...kws, 'blood_echo'];
        gbeTarget.currentAttack = (gbeTarget.currentAttack || 0) + ((effect as any).buffAttack || 0);
        gbeTarget.currentHealth = (gbeTarget.currentHealth || 0) + ((effect as any).buffHealth || 0);
        (gbeTarget.card as any).bloodPrice = gbeTarget.card.manaCost || 3;
      }
      resultState = gbeState;
      break;
    }
    case 'grant_valhalla_call': {
      const gvcState = JSON.parse(JSON.stringify(state)) as GameState;
      const gvcTarget = gvcState.players[gvcState.currentTurn].battlefield.find(
        (m: CardInstance) => m.instanceId === targetId && m.card?.keywords?.includes('einherjar')
      );
      if (gvcTarget) {
        debug.state(`[Valhalla's Call] Granted to ${gvcTarget.card.name}`);
      }
      resultState = gvcState;
      break;
    }
    case 'conditional_aoe': {
      let caoState = JSON.parse(JSON.stringify(state)) as GameState;
      const hasProphecy = (state.prophecies?.length || 0) > 0;
      const caoDmg = hasProphecy ? ((effect as any).fateweaveValue || (effect as any).baseValue || 2) : ((effect as any).baseValue || 2);
      const caoEnemySide: 'player' | 'opponent' = caoState.currentTurn === 'player' ? 'opponent' : 'player';
      const caoDeadMinions: string[] = [];
      for (const m of caoState.players[caoEnemySide].battlefield) {
        m.currentHealth = (m.currentHealth || 0) - caoDmg;
        if (m.currentHealth <= 0) caoDeadMinions.push(m.instanceId);
      }
      if (effect.targetType === 'all_enemies') {
        caoState.players[caoEnemySide].heroHealth = Math.max(0, (caoState.players[caoEnemySide].heroHealth ?? 0) - caoDmg);
      }
      for (const id of caoDeadMinions) {
        caoState = destroyCardFromZone(caoState, id, caoEnemySide);
      }
      resultState = caoState;
      break;
    }
    default:
      debug.error(`Unknown spell effect type: ${effect.type}`);
      return state;
  }

  // Process secondary effects (e.g., heal + discover like Renew)
  if (effect.secondaryEffect) {
    
    if (effect.secondaryEffect.type === 'discover') {
      // Create a discover effect from the secondary effect
      const discoverEffect: SpellEffect = {
        type: 'discover',
        discoveryType: effect.secondaryEffect.cardType || 'spell',
        discoveryCount: effect.secondaryEffect.count || 3
      };
      resultState = executeDiscoverSpell(resultState, discoverEffect, spellCard.instanceId);
    }
  }
  
  return resultState;
}

/**
 * Execute a damage spell effect
 */
function executeDamageSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!effect.value) {
    debug.error('Damage spell missing value parameter');
    return state;
  }
  
  if (!targetId || !targetType) {
    debug.error('Damage spell requires target ID and type');
    return state;
  }
  
  let newState = { ...state };
  const damageAmount = effect.value;
  
  if (targetType === 'minion') {
    // Find the target minion
    const player = newState.players.player;
    const opponent = newState.players.opponent;
    
    let targetFound = false;
    
    // Check player's battlefield
    const playerBattlefield = [...player.battlefield];
    for (let i = 0; i < playerBattlefield.length; i++) {
      if (playerBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = playerBattlefield[i];
        
        // Apply damage to the minion
        if (target.currentHealth !== undefined) {
          // Check for Divine Shield
          if (target.hasDivineShield) {
            target.hasDivineShield = false;
          } else {
            target.currentHealth -= damageAmount;
            
            // Apply enrage effects after damage
            newState = updateEnrageEffects(newState);
          }
        }
        
        break;
      }
    }
    
    // If not found on player's battlefield, check opponent's battlefield
    if (!targetFound) {
      const opponentBattlefield = [...opponent.battlefield];
      for (let i = 0; i < opponentBattlefield.length; i++) {
        if (opponentBattlefield[i].instanceId === targetId) {
          targetFound = true;
          const target = opponentBattlefield[i];
          
          // Apply damage to the minion
          if (target.currentHealth !== undefined) {
            // Check for Divine Shield
            if (target.hasDivineShield) {
              target.hasDivineShield = false;
            } else {
              target.currentHealth -= damageAmount;
              
              // Apply enrage effects after damage
              newState = updateEnrageEffects(newState);
            }
          }
          
          break;
        }
      }
      
      // Update opponent's battlefield
      newState.players.opponent.battlefield = opponentBattlefield;
    }
    
    // Update player's battlefield
    newState.players.player.battlefield = playerBattlefield;
    
    // Use removeDeadMinions to properly trigger deathrattles via destroyCard
    newState = removeDeadMinions(newState);
  } else if (targetType === 'hero') {
    // Damage a hero using dealDamage to handle armor properly
    if (targetId === 'opponent' || targetId === 'opponent-hero') {
      // Use dealDamage function to handle armor properly
      newState = dealDamage(newState, 'opponent', 'hero', damageAmount);
      // Game over check is handled in dealDamage function
    } else if (targetId === 'player' || targetId === 'player-hero') {
      // Use dealDamage function to handle armor properly
      newState = dealDamage(newState, 'player', 'hero', damageAmount);
      // Game over check is handled in dealDamage function
    } else {
      debug.error(`Unknown hero target ID: ${targetId}`);
    }
  }
  
  return newState;
}

/**
 * Execute a set_health spell effect
 * Used by cards like Hunter's Mark that set a minion's health to a specific value,
 * or like Alexstrasza that sets a hero's health to a specific value
 */
function executeSetHealthSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!targetId) {
    debug.error('Set health spell requires a target ID');
    return state;
  }
  
  if (targetType === 'hero') {
    // Get the health value to set
    const healthValue = effect.value || 15; // Default to 15 (like Alexstrasza)
    let newState = { ...state };
    
    // Set the target hero's health to the specified value (keep both fields in sync)
    if (targetId === 'opponent' || targetId === 'opponent-hero') {
      newState.players.opponent.health = healthValue;
      newState.players.opponent.heroHealth = healthValue;
    } else if (targetId === 'player' || targetId === 'player-hero') {
      newState.players.player.health = healthValue;
      newState.players.player.heroHealth = healthValue;
    } else {
      debug.error(`Unknown hero target ID: ${targetId}`);
    }

    return newState;
  } else {
    // For minions, use the handler from the set_healthHandler file
    return executeSetHealthHandler(state, effect, {
      card: effect.card || { 
        id: 0, 
        name: 'Effect Source', 
        type: 'effect',
        manaCost: 0,
        rarity: 'common',
        description: 'Internal effect source',
        keywords: []
      },
      instanceId: 'source-' + Math.random().toString(36).substring(2, 10),
      isPlayed: true,
      attacksPerformed: 0,
      canAttack: false,
      currentHealth: 1,
      isSummoningSick: true
    }, targetId);
  }
}

/**
 * Execute an AoE damage spell effect
 */
function executeAoEDamageSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  // Consider value 0 as valid for effects like Frost Nova which just freeze without dealing damage
  if (effect.value === undefined) {
    debug.error('AoE damage spell missing value parameter');
    return state;
  }
  
  let newState = { ...state };
  const damageAmount = effect.value;
  
  // Damage depends on the target type
  if (effect.targetType === 'all_minions') {
    // Damage all minions on both sides
    newState = applyAoEDamage(newState, damageAmount, 'all');
  } else if (effect.targetType === 'all_enemy_minions') {
    // Damage all enemy minions
    newState = applyAoEDamage(newState, damageAmount, 'enemy');
  } else if (effect.targetType === 'all_friendly_minions') {
    // Damage all friendly minions
    newState = applyAoEDamage(newState, damageAmount, 'friendly');
  }
  
  // Handle freeze effect if present (for spells like Frost Nova and Niflheim's Embrace)
  if (effect.freezeTarget && effect.targetType) {
    newState = applyFreezeEffect(newState, effect.targetType);
  }
  
  return newState;
}

/**
 * Apply AoE damage to minions based on the specified filter
 */
function applyAoEDamage(
  state: GameState,
  damageAmount: number,
  filter: 'all' | 'enemy' | 'friendly'
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Helper to apply damage on a single battlefield (leaves dead minions in place for removeDeadMinions)
  const applyDamageToBattlefield = (battlefield: CardInstance[]): CardInstance[] => {
    return battlefield.map(minion => {
      if (minion.currentHealth !== undefined) {
        const newMinion = { ...minion };
        
        if (newMinion.currentHealth === undefined) {
          newMinion.currentHealth = getHealth(newMinion.card);
        }
        
        if (newMinion.hasDivineShield) {
          newMinion.hasDivineShield = false;
        } else {
          newMinion.currentHealth! -= damageAmount;
        }
        
        return newMinion;
      }
      return minion;
    });
  };
  
  // Apply damage according to filter
  if (filter === 'all' || filter === 'friendly') {
    if (currentPlayer === 'player') {
      newState.players.player.battlefield = applyDamageToBattlefield(player.battlefield);
    } else {
      newState.players.opponent.battlefield = applyDamageToBattlefield(opponent.battlefield);
    }
  }
  
  if (filter === 'all' || filter === 'enemy') {
    if (currentPlayer === 'player') {
      newState.players.opponent.battlefield = applyDamageToBattlefield(opponent.battlefield);
    } else {
      newState.players.player.battlefield = applyDamageToBattlefield(player.battlefield);
    }
  }
  
  // Apply enrage effects after all AoE damage
  newState = updateEnrageEffects(newState);
  
  // Use removeDeadMinions to properly trigger deathrattles via destroyCard
  newState = removeDeadMinions(newState);
  
  return newState;
}

/**
 * Apply AoE freeze effects based on the specified target type
 * Used by spells like Frost Nova and Niflheim's Embrace
 */
function applyFreezeEffect(
  state: GameState,
  targetType: string
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const opposingPlayer = currentPlayer === 'player' ? 'opponent' : 'player';
  
  // Determine which minions to freeze based on target type
  if (targetType === 'all_minions') {
    // Freeze all minions on the battlefield
    newState.players.player.battlefield = 
      newState.players.player.battlefield.map(minion => ({
        ...minion,
        isFrozen: true,
        canAttack: false
      }));
    
    newState.players.opponent.battlefield = 
      newState.players.opponent.battlefield.map(minion => ({
        ...minion,
        isFrozen: true,
        canAttack: false
      }));
    
  } else if (targetType === 'all_enemy_minions') {
    // Freeze all enemy minions
    if (opposingPlayer === 'player') {
      newState.players.player.battlefield = 
        newState.players.player.battlefield.map(minion => ({
          ...minion,
          isFrozen: true,
          canAttack: false
        }));
    } else {
      newState.players.opponent.battlefield = 
        newState.players.opponent.battlefield.map(minion => ({
          ...minion,
          isFrozen: true,
          canAttack: false
        }));
    }
    
  } else if (targetType === 'all_friendly_minions') {
    // Freeze all friendly minions (rare, but possible)
    if (currentPlayer === 'player') {
      newState.players.player.battlefield = 
        newState.players.player.battlefield.map(minion => ({
          ...minion,
          isFrozen: true,
          canAttack: false
        }));
    } else {
      newState.players.opponent.battlefield = 
        newState.players.opponent.battlefield.map(minion => ({
          ...minion,
          isFrozen: true,
          canAttack: false
        }));
    }
    
  } else {
    debug.warn(`Unsupported freeze target type: ${targetType}`);
  }

  newState = checkPetEvolutionTrigger(newState, 'on_freeze');
  return newState;
}

/**
 * Execute a heal spell effect
 */
function executeHealSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!effect.value) {
    debug.error('Heal spell missing value parameter');
    return state;
  }
  
  if (!targetId || !targetType) {
    debug.error('Heal spell requires target ID and type');
    return state;
  }
  
  let newState = { ...state };
  const healAmount = effect.value;
  
  if (targetType === 'minion') {
    // Find the target minion
    const player = newState.players.player;
    const opponent = newState.players.opponent;
    
    let targetFound = false;
    
    // Check player's battlefield
    const playerBattlefield = [...player.battlefield];
    for (let i = 0; i < playerBattlefield.length; i++) {
      if (playerBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = playerBattlefield[i];
        
        // Apply healing to the minion
        if (target.currentHealth !== undefined && isMinion(target.card)) {
          // Heal but don't exceed max health
          target.currentHealth = Math.min(target.currentHealth + healAmount, target.card.health ?? target.currentHealth);
          
          // Check and update enrage status after healing
          newState = updateEnrageEffects(newState);
        }
        
        break;
      }
    }
    
    // If not found on player's battlefield, check opponent's battlefield
    if (!targetFound) {
      const opponentBattlefield = [...opponent.battlefield];
      for (let i = 0; i < opponentBattlefield.length; i++) {
        if (opponentBattlefield[i].instanceId === targetId) {
          targetFound = true;
          const target = opponentBattlefield[i];
          
          // Apply healing to the minion
          if (target.currentHealth !== undefined && isMinion(target.card)) {
            // Heal but don't exceed max health
            target.currentHealth = Math.min(target.currentHealth + healAmount, target.card.health ?? target.currentHealth);
            
            // Check and update enrage status after healing
            newState = updateEnrageEffects(newState);
          }
          
          break;
        }
      }
      
      // Update opponent's battlefield
      newState.players.opponent.battlefield = opponentBattlefield;
    }
    
    // Update player's battlefield
    newState.players.player.battlefield = playerBattlefield;
  } else if (targetType === 'hero') {
    // Heal a hero
    if (targetId === 'opponent' || targetId === 'opponent-hero') {
      const opp = newState.players.opponent;
      opp.heroHealth = Math.min((opp.heroHealth ?? opp.health ?? opp.maxHealth) + healAmount, opp.maxHealth);
    } else if (targetId === 'player' || targetId === 'player-hero') {
      const plr = newState.players.player;
      plr.heroHealth = Math.min((plr.heroHealth ?? plr.health ?? plr.maxHealth) + healAmount, plr.maxHealth);
    } else {
      debug.error(`Unknown hero target ID: ${targetId}`);
    }
  }

  newState = checkPetEvolutionTrigger(newState, 'on_heal');
  return newState;
}

/**
 * Execute a buff spell effect
 */
function executeBuffSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Buff spell requires a target ID');
    return state;
  }
  
  // Allow buff spells that only grant keywords without stat changes
  if (!effect.buffAttack && !effect.buffHealth && !effect.grantKeywords) {
    debug.error('Buff spell missing buff values or keywords to grant');
    return state;
  }
  
  let newState = { ...state };
  // Find the target minion
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Check if this is a hero buff (like Chaos Strike)
  if (targetId === 'player' || targetId === 'opponent') {
    
    // Get the correct player object
    const targetPlayer = targetId === 'player' ? player : opponent;
    
    // Apply hero attack buff - store as temporary attack for this turn
    if (effect.buffAttack) {
      if (!targetPlayer.tempStats) {
        (targetPlayer as any).tempStats = { attack: 0 };
      }
      (targetPlayer as any).tempStats.attack = ((targetPlayer as any).tempStats?.attack || 0) + effect.buffAttack;
    }
    
    // Handle additional effects
    if (effect.drawCards && effect.drawCards > 0) {
      // Determine which player should draw cards
      const drawForPlayer = targetId === 'player' ? 'player' : 'opponent';
      
      // Store the original turn to restore it later
      const originalTurn = newState.currentTurn;
      
      // Use standardized draw function directly
      newState = drawMultipleCards(newState, drawForPlayer, effect.drawCards);
      
      // Restore the original currentTurn
      newState = {
        ...newState,
        currentTurn: originalTurn
      };
      
    }
    
    return newState;
  }
  
  // Otherwise proceed with regular minion buff handling
  let targetFound = false;
  
  // Check player's battlefield
  const playerBattlefield = [...player.battlefield];
  for (let i = 0; i < playerBattlefield.length; i++) {
    if (playerBattlefield[i].instanceId === targetId) {
      targetFound = true;
      const target = playerBattlefield[i];
      
      // Apply attack buff
      if (effect.buffAttack && isMinion(target.card) && target.card.attack !== undefined) {
        (target.card as any).attack += effect.buffAttack;
      }
      
      // Apply health buff
      if (effect.buffHealth && target.currentHealth !== undefined && isMinion(target.card) && target.card.health !== undefined) {
        (target.card as any).health += effect.buffHealth;
        target.currentHealth += effect.buffHealth;
      }
      
      // Apply keyword buffs if specified
      if (effect.grantKeywords && effect.grantKeywords.length > 0) {
        for (const keyword of effect.grantKeywords) {
          addKeyword(target, keyword);

          if (keyword === 'divine_shield') {
            target.hasDivineShield = true;
          }
        }
      }

      break;
    }
  }

  // If not found on player's battlefield, check opponent's battlefield
  if (!targetFound) {
    const opponentBattlefield = [...opponent.battlefield];
    for (let i = 0; i < opponentBattlefield.length; i++) {
      if (opponentBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = opponentBattlefield[i];
        
        // Apply attack buff
        if (effect.buffAttack && isMinion(target.card) && target.card.attack !== undefined) {
          (target.card as any).attack += effect.buffAttack;
        }
        
        // Apply health buff
        if (effect.buffHealth && target.currentHealth !== undefined && isMinion(target.card) && target.card.health !== undefined) {
          (target.card as any).health += effect.buffHealth;
          target.currentHealth += effect.buffHealth;
        }
        
        // Apply keyword buffs if specified
        if (effect.grantKeywords && effect.grantKeywords.length > 0) {
          for (const keyword of effect.grantKeywords) {
            addKeyword(target, keyword);

            if (keyword === 'divine_shield') {
              target.hasDivineShield = true;
            }
          }
        }
        
        break;
      }
    }
    
    // Update opponent's battlefield
    newState.players.opponent.battlefield = opponentBattlefield;
  }
  
  // Update player's battlefield
  newState.players.player.battlefield = playerBattlefield;
  
  // Check and update enrage status after health buffs, as they may remove enrage effects
  newState = updateEnrageEffects(newState);

  newState = checkPetEvolutionTrigger(newState, 'on_buff');
  newState = checkPetEvolutionTrigger(newState, 'on_gain_health');

  // Emit buff applied event for animations
  if (targetFound && targetId) {
    GameEventBus.emitBuffApplied({
      targetId,
      targetName: 'minion',
      attackChange: effect.buffAttack,
      healthChange: effect.buffHealth,
      keywords: effect.grantKeywords,
    });
  }

  return newState;
}

/**
 * Execute a summon spell effect
 */
function executeSummonSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.summonCardId) {
    debug.error('Summon spell missing summonCardId parameter');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const cardToSummon = effect.summonCardId;
  
  // Look up the card data from the registry
  const foundCard = getCardById(cardToSummon as number);
  if (!foundCard || foundCard.type !== 'minion') {
    debug.error(`Summon spell: card ID ${cardToSummon} not found or not a minion`);
    return state;
  }
  const summonedCard: CardData = foundCard;
  
  // Create a card instance for the summoned minion
  const summonedInstance: CardInstance = {
    instanceId: uuidv4(),
    card: summonedCard,
    currentHealth: summonedCard.health,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: true,
    attacksPerformed: 0
  };
  
  // Add the summoned minion to the current player's battlefield
  if (currentPlayer === 'player') {
    // Check if battlefield is full
    if (newState.players.player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
      newState.players.player.battlefield.push(summonedInstance);
      trackQuestProgress('player', 'summon_minion', summonedInstance.card);
    } else {
    }
  } else {
    // Check if battlefield is full
    if (newState.players.opponent.battlefield.length < MAX_BATTLEFIELD_SIZE) {
      newState.players.opponent.battlefield.push(summonedInstance);
      trackQuestProgress('opponent', 'summon_minion', summonedInstance.card);
    } else {
    }
  }
  
  return newState;
}

/**
 * Execute a draw spell effect
 * 
 * This uses the standardized draw functions from drawUtils.ts for consistency
 */
function executeDrawSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  
  // Special handling for Divine Favor which has a dynamic value
  if (effect.value === 0 && effect.card?.name === "Divine Favor") {
    // Calculate cards to draw based on opponent's hand size
    const playerHandSize = currentPlayer === 'player' 
      ? state.players.player.hand.length 
      : state.players.opponent.hand.length;
      
    const opponentHandSize = currentPlayer === 'player' 
      ? state.players.opponent.hand.length 
      : state.players.player.hand.length;
      
    // Draw until hand size is equal to opponent's
    if (playerHandSize < opponentHandSize) {
      const drawAmount = opponentHandSize - playerHandSize;
      
      // Use our standardized drawMultipleCards function
      return drawMultipleCards(newState, currentPlayer, drawAmount);
    } else {
      return state;
    }
  }
  
  if (effect.value === undefined) {
    debug.error('Draw spell missing value parameter');
    return state;
  }
  
  const drawAmount = effect.value;
  
  // Use our standardized draw function from drawUtils.ts
  // This handles all the logic for drawing cards, including:
  // - Fatigue damage if deck is empty
  // - Creating card instances
  // - Adding cards to hand
  // - Handling hand size limits
  return drawMultipleCards(newState, currentPlayer, drawAmount);
}

/**
 * Execute a freeze spell effect
 */
function executeFreezeSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  // If this is an AoE freeze spell that doesn't require a target
  if (!effect.requiresTarget) {
    
    // Use our new utility function for AoE freeze effects
    if (effect.targetType) {
      return applyFreezeEffect(state, effect.targetType);
    } else {
      debug.error('Freeze spell missing target type');
      return state;
    }
  }
  
  // Single target freeze effects
  if (!targetId || !targetType) {
    debug.error('Targeted freeze spell requires a target');
    return state;
  }
  
  // Create a new state to avoid mutations
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  let targetFound = false;
  
  // Check player's battlefield
  const playerBattlefield = [...player.battlefield];
  for (let i = 0; i < playerBattlefield.length; i++) {
    if (playerBattlefield[i].instanceId === targetId) {
      targetFound = true;
      const target = playerBattlefield[i];
      
      // Apply freeze
      target.isFrozen = true;
      target.canAttack = false;
      
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's battlefield
  if (!targetFound) {
    const opponentBattlefield = [...opponent.battlefield];
    for (let i = 0; i < opponentBattlefield.length; i++) {
      if (opponentBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = opponentBattlefield[i];
        
        // Apply freeze
        target.isFrozen = true;
        target.canAttack = false;
        
        break;
      }
    }
    
    // Update opponent's battlefield
    newState.players.opponent.battlefield = opponentBattlefield;
  }
  
  // Update player's battlefield
  newState.players.player.battlefield = playerBattlefield;

  newState = checkPetEvolutionTrigger(newState, 'on_freeze');

  // Emit battlecry-style event for freeze VFX
  if (targetFound && targetId) {
    GameEventBus.emitBattlecryTriggered({
      sourceId: 'spell',
      sourceName: 'Freeze Spell',
      effectType: 'freeze',
      player: state.currentTurn,
      targetId,
    });
  }

  return newState;
}

/**
 * Execute a transform spell effect (polymorph)
 */
function executeTransformSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Transform spell requires a target ID');
    return state;
  }
  
  let newState = { ...state };
  
  // Find the target minion
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  let targetFound = false;
  
  // Create a default sheep (or frog) transformation
  const transformedCard: CardData = {
    id: 9999, // Placeholder ID
    name: "Sheep",
    type: 'minion',
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "This minion was transformed into a sheep.",
    rarity: 'common',
    keywords: []
  };
  
  // Check player's battlefield
  const playerBattlefield = [...player.battlefield];
  for (let i = 0; i < playerBattlefield.length; i++) {
    if (playerBattlefield[i].instanceId === targetId) {
      targetFound = true;
      const target = playerBattlefield[i];
      
      // Apply transform
      const transformedInstance: CardInstance = {
        instanceId: target.instanceId, // Keep same ID for tracking
        card: transformedCard,
        currentHealth: 1,
        canAttack: false, // Can't attack after transform
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      
      playerBattlefield[i] = transformedInstance;
      
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's battlefield
  if (!targetFound) {
    const opponentBattlefield = [...opponent.battlefield];
    for (let i = 0; i < opponentBattlefield.length; i++) {
      if (opponentBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = opponentBattlefield[i];
        
        // Apply transform
        const transformedInstance: CardInstance = {
          instanceId: target.instanceId, // Keep same ID for tracking
          card: transformedCard,
          currentHealth: 1,
          canAttack: false, // Can't attack after transform
          isPlayed: true,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        
        opponentBattlefield[i] = transformedInstance;
        
        break;
      }
    }
    
    // Update opponent's battlefield
    newState.players.opponent.battlefield = opponentBattlefield;
  }
  
  // Update player's battlefield
  newState.players.player.battlefield = playerBattlefield;
  
  return newState;
}

/**
 * Execute a discover spell effect
 */
function executeDiscoverSpell(
  state: GameState,
  effect: SpellEffect,
  sourceCardId: string
): GameState {
  debug.log('[executeDiscoverSpell] Called with effect:', effect, 'sourceCardId:', sourceCardId);
  
  // Number of cards to choose from (typically 3)
  const discoveryCount = effect.discoveryCount || 3;
  
  // Create discovery options
  const discoveryType = effect.discoveryType || 'any';
  const discoveryClass = effect.discoveryClass || 'any';
  
  debug.log('[executeDiscoverSpell] discoveryType:', discoveryType, 'discoveryClass:', discoveryClass, 'discoveryCount:', discoveryCount);
  
  // Get random cards based on discovery type/class
  let pool = [...allCards];
  debug.log('[executeDiscoverSpell] Total card pool size:', pool.length);
  
  // Filter by type if specified
  if (discoveryType !== 'any') {
    pool = pool.filter(card => card.type === discoveryType);
    debug.log('[executeDiscoverSpell] After type filter, pool size:', pool.length);
  }
  
  // Filter by class if specified
  if (discoveryClass !== 'any') {
    pool = pool.filter(card => 
      card.class?.toLowerCase() === discoveryClass.toLowerCase() || 
      card.heroClass?.toLowerCase() === discoveryClass.toLowerCase()
    );
    debug.log('[executeDiscoverSpell] After class filter, pool size:', pool.length);
  }

  // Shuffle and pick
  const discoveryOptions = pool
    .sort(() => 0.5 - Math.random())
    .slice(0, discoveryCount);

  if (discoveryOptions.length === 0) {
    debug.log('[executeDiscoverSpell] No valid cards to discover — skipping discovery');
    return state;
  }

  debug.log('[executeDiscoverSpell] Discovery options:', discoveryOptions.map(c => c.name));
  debug.log('[executeDiscoverSpell] Setting discovery.active = true');

  // Set discovery state - get fresh state from store in callback
  return {
    ...state,
    discovery: {
      active: true,
      options: discoveryOptions,
      allOptions: [...discoveryOptions],
      sourceCardId,
      filters: {
        type: discoveryType as any,
        rarity: 'any',
        manaCost: 'any'
      },
      callback: (selectedCard: CardData | null) => {
        // Get the CURRENT game state from the store, not the stale captured state
        const { gameState: currentState } = useGameStore.getState();
        const updatedState = JSON.parse(JSON.stringify(currentState));
        
        if (selectedCard) {
          
          // Add the selected card to the player's hand if there's room
          if (updatedState.players.player.hand.length < MAX_HAND_SIZE) {
            const cardInstance: CardInstance = {
              instanceId: uuidv4(),
              card: selectedCard,
              currentHealth: getHealth(selectedCard),
              canAttack: false,
              isPlayed: false,
              isSummoningSick: true,
              attacksPerformed: 0
            };
            
            updatedState.players.player.hand.push(cardInstance);
          } else {
          }
        } else {
        }
        
        // Clear discovery state
        updatedState.discovery = undefined;
        
        return updatedState;
      }
    }
  };
}

/**
 * Execute a silence spell effect
 * Silence removes all card text, abilities, and enchantments from a minion
 */
function executeSilenceSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Handle AoE silence effects like Mass Dispel
  if (!targetId && effect.targetType && effect.targetType.includes('all')) {
    
    // Handle silence based on targetType
    if (effect.targetType === 'all_enemy_minions') {
      // Silence all enemy minions
      const currentPlayer = state.currentTurn;
      const targetBattlefield = currentPlayer === 'player' 
        ? opponent.battlefield 
        : player.battlefield;
        
      // Apply silence to all minions in the target battlefield
      for (const target of targetBattlefield) {
        // Store original keywords if not already stored (using enchantments array as storage)
        if (!target.enchantments) {
          target.enchantments = [];
        }

        // Remove all ability-based keywords
        removeKeyword(target, 'taunt');
        removeKeyword(target, 'divine_shield');
        removeKeyword(target, 'windfury');
        removeKeyword(target, 'deathrattle');
        removeKeyword(target, 'battlecry');
        removeKeyword(target, 'spell_damage');
        
        // Remove divine shield if present
        target.hasDivineShield = false;
        
        // Remove any deathrattle and battlecry effects (only for minions)
        if (isMinion(target.card)) {
          (target.card as any).deathrattle = undefined;
          (target.card as any).battlecry = undefined;
        }
        
        // Mark the minion as silenced
        target.silenced = true;
        
      }
      
      // For Mass Dispel, draw a card
      if (effect.drawCards && effect.drawCards > 0) {
        // Use standardized draw function directly
        newState = drawMultipleCards(newState, state.currentTurn, effect.drawCards);
      }

      newState = checkPetEvolutionTrigger(newState, 'on_silence');
      return newState;
    }

    // Handle other AoE silence targets if needed
    if (effect.targetType === 'all_minions') {
      // Silence all minions on both sides of the battlefield
      // (Implementation similar to above but for both player and opponent)
    }

    newState = checkPetEvolutionTrigger(newState, 'on_silence');
    return newState;
  }
  
  // Handle single-target silence effects
  if (!targetId) {
    debug.error('Single-target silence spell requires a target ID');
    return state;
  }
  
  let targetFound = false;
  
  // Check player's battlefield
  const playerBattlefield = [...player.battlefield];
  for (let i = 0; i < playerBattlefield.length; i++) {
    if (playerBattlefield[i].instanceId === targetId) {
      targetFound = true;
      const target = playerBattlefield[i];
      
      // Apply silence effect - using enchantments to track silenced state
      if (!target.enchantments) {
        target.enchantments = [];
      }
      
      // Remove all ability-based keywords
      removeKeyword(target, 'taunt');
      removeKeyword(target, 'divine_shield');
      removeKeyword(target, 'windfury');
      removeKeyword(target, 'deathrattle');
      removeKeyword(target, 'battlecry');
      removeKeyword(target, 'spell_damage');

      // Remove divine shield if present
      target.hasDivineShield = false;

      // Remove any deathrattle and battlecry effects (only for minions)
      if (isMinion(target.card)) {
        (target.card as any).deathrattle = undefined;
        (target.card as any).battlecry = undefined;
      }

      // Mark the minion as silenced
      target.silenced = true;
      
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's battlefield
  if (!targetFound) {
    const opponentBattlefield = [...opponent.battlefield];
    for (let i = 0; i < opponentBattlefield.length; i++) {
      if (opponentBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = opponentBattlefield[i];
        
        // Apply silence effect - using enchantments to track silenced state
        if (!target.enchantments) {
          target.enchantments = [];
        }
        
        // Remove all ability-based keywords
        removeKeyword(target, 'taunt');
        removeKeyword(target, 'divine_shield');
        removeKeyword(target, 'windfury');
        removeKeyword(target, 'deathrattle');
        removeKeyword(target, 'battlecry');
        removeKeyword(target, 'spell_damage');

        // Remove divine shield if present
        target.hasDivineShield = false;

        // Remove any deathrattle and battlecry effects (only for minions)
        if (isMinion(target.card)) {
          (target.card as any).deathrattle = undefined;
          (target.card as any).battlecry = undefined;
        }
        
        // Mark the minion as silenced
        target.silenced = true;
        
        break;
      }
    }
    
    // Update opponent's battlefield
    newState.players.opponent.battlefield = opponentBattlefield;
  }
  
  // Update player's battlefield
  newState.players.player.battlefield = playerBattlefield;

  newState = checkPetEvolutionTrigger(newState, 'on_silence');
  return newState;
}

/**
 * Execute a quest spell effect
 * This activates a quest card when played
 */
function executeQuestSpell(
  state: GameState,
  spellCard: CardInstance
): GameState {
  // Make sure it's a valid quest card with quest data
  if (
    !spellCard.card || 
    !isSpell(spellCard.card) ||
    !spellCard.card.spellEffect || 
    spellCard.card.spellEffect.type !== 'quest' ||
    !spellCard.card.spellEffect.questData
  ) {
    debug.error('Not a valid quest card:', spellCard);
    return state;
  }
  
  // We need to directly implement the quest activation logic here
  // to avoid circular dependency issues
  
  // Get the quest data from the card
  const questData = spellCard.card.spellEffect.questData;
  
  // Create a new state with deep copies to avoid mutation
  const newState = JSON.parse(JSON.stringify(state));
  
  // Set the quest as active for the player
  (newState.players[state.currentTurn] as any).activeQuest = {
    ...questData,
    cardId: spellCard.card.id,
    cardName: spellCard.card.name
  };

  // Add event to game log
  newState.gameLog.push({
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: 'quest_started' as GameLogEventType,
    turn: state.turnNumber,
    timestamp: Date.now(),
    player: state.currentTurn,
    text: `${state.currentTurn === 'player' ? 'You' : 'Opponent'} started quest: ${spellCard.card.name}`,
    progress: 0,
    target: questData.target,
    cardId: String(spellCard.card.id),
    cardName: spellCard.card.name
  });
  
  return newState;
}

/**
 * Execute an extra turn spell effect
 * Grants the player an additional turn after their current one
 */
function executeExtraTurnSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = JSON.parse(JSON.stringify(state));
  const currentPlayer = state.currentTurn;
  
  // Set the flag for an extra turn
  if (currentPlayer === 'player') {
    (newState.players.player as any).extraTurn = true;
  } else {
    (newState.players.opponent as any).extraTurn = true;
  }
  
  return newState;
}

/**
 * Execute the Crystal Core spell effect
 * For the rest of the game, your minions are 4/4
 */
function executeCrystalCoreSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = JSON.parse(JSON.stringify(state));
  const currentPlayer = state.currentTurn;
  
  // Apply the Crystal Core effect
  if (currentPlayer === 'player') {
    // Set the Crystal Core flag
    (newState.players.player as any).crystalCoreActive = true;
    
    // Transform all current minions on the battlefield to 4/4
    for (let minion of newState.players.player.battlefield) {
      if (isMinion(minion.card)) {
        (minion.card as any).attack = 4;
        (minion.card as any).health = 4;
      }
      minion.currentHealth = 4;
    }
    
    // Transform all minions in hand to 4/4
    for (let card of newState.players.player.hand) {
      if (isMinion(card.card)) {
        (card.card as any).attack = 4;
        (card.card as any).health = 4;
      }
    }
    
  } else {
    // Set the Crystal Core flag
    (newState.players.opponent as any).crystalCoreActive = true;
    
    // Transform all current minions on the battlefield to 4/4
    for (let minion of newState.players.opponent.battlefield) {
      if (isMinion(minion.card)) {
        (minion.card as any).attack = 4;
        (minion.card as any).health = 4;
      }
      minion.currentHealth = 4;
    }
    
    // Transform all minions in hand to 4/4
    for (let card of newState.players.opponent.hand) {
      if (isMinion(card.card)) {
        (card.card as any).attack = 4;
        (card.card as any).health = 4;
      }
    }
    
  }
  
  return newState;
}

// [Removed duplicate executeSetHealthSpell function as it's already defined earlier in the file]

/**
 * Execute a debuff spell effect (reducing a minion's stats)
 */
function executeDebuffSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Debuff spell requires a target ID');
    return state;
  }
  
  let newState = { ...state };
  // Get debuff values
  const attackDebuff = effect.buffAttack || -1;
  const healthDebuff = effect.buffHealth || 0;
  
  // Find the target minion
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  let targetFound = false;
  
  // Check player's battlefield
  const playerBattlefield = [...player.battlefield];
  for (let i = 0; i < playerBattlefield.length; i++) {
    if (playerBattlefield[i].instanceId === targetId) {
      targetFound = true;
      const target = playerBattlefield[i];
      
      // Apply attack debuff (only for minions)
      if (isMinion(target.card) && target.card.attack !== undefined) {
        // Special handling for Aldor Peacekeeper effect (set to 1)
        if (attackDebuff === -1000) {
          (target.card as any).attack = 1;
        } else {
          // Regular debuff
          (target.card as any).attack = Math.max(0, target.card.attack + attackDebuff);
        }
      }
      
      // Apply health debuff if any (only for minions)
      if (healthDebuff < 0 && target.currentHealth !== undefined && isMinion(target.card) && target.card.health !== undefined) {
        (target.card as any).health = Math.max(1, target.card.health + healthDebuff);
        target.currentHealth = Math.max(1, target.currentHealth + healthDebuff);
      }
      
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's battlefield
  if (!targetFound) {
    const opponentBattlefield = [...opponent.battlefield];
    for (let i = 0; i < opponentBattlefield.length; i++) {
      if (opponentBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = opponentBattlefield[i];
        
        // Apply attack debuff (only for minions)
        if (isMinion(target.card) && target.card.attack !== undefined) {
          // Special handling for Aldor Peacekeeper effect (set to 1)
          if (attackDebuff === -1000) {
            (target.card as any).attack = 1;
          } else {
            // Regular debuff
            (target.card as any).attack = Math.max(0, target.card.attack + attackDebuff);
          }
        }
        
        // Apply health debuff if any (only for minions)
        if (healthDebuff < 0 && target.currentHealth !== undefined && isMinion(target.card) && target.card.health !== undefined) {
          (target.card as any).health = Math.max(1, target.card.health + healthDebuff);
          target.currentHealth = Math.max(1, target.currentHealth + healthDebuff);
        }
        
        break;
      }
    }
    
    // Update opponent's battlefield
    newState.players.opponent.battlefield = opponentBattlefield;
  }
  
  // Update player's battlefield
  newState.players.player.battlefield = playerBattlefield;
  
  return newState;
}

/**
 * Check if a target is valid for a spell
 */
export function isValidSpellTarget(
  spell: CardData,
  targetType: 'minion' | 'hero',
  targetId: string,
  state: GameState
): boolean {
  if (!isSpell(spell) || !spell.spellEffect || !spell.spellEffect.requiresTarget) {
    return false; // Spell doesn't need a target
  }
  
  const targetRequirement = spell.spellEffect.targetType;
  const currentTurn = state.currentTurn;
  
  // Handle hero targeting
  if (targetType === 'hero') {
    const isPlayerHero = targetId === 'player';
    const isOpponentHero = targetId === 'opponent';
    
    // Valid if targeting any hero
    if (targetRequirement === 'any_hero') {
      return true;
    }
    
    // Valid if targeting friendly hero and it is friendly
    if (targetRequirement === 'friendly_hero') {
      return (currentTurn === 'player' && isPlayerHero) || 
             (currentTurn === 'opponent' && isOpponentHero);
    }
    
    // Valid if targeting enemy hero and it is enemy
    if (targetRequirement === 'enemy_hero') {
      return (currentTurn === 'player' && isOpponentHero) || 
             (currentTurn === 'opponent' && isPlayerHero);
    }
    
    return false;
  }
  
  // Handle minion targeting
  if (targetType === 'minion') {
    // Find the target minion
    let targetMinion: CardInstance | undefined;
    let isPlayerMinion = false;
    
    // Check player's battlefield
    for (const minion of state.players.player.battlefield) {
      if (minion.instanceId === targetId) {
        targetMinion = minion;
        isPlayerMinion = true;
        break;
      }
    }
    
    // Check opponent's battlefield if not found
    if (!targetMinion) {
      for (const minion of state.players.opponent.battlefield) {
        if (minion.instanceId === targetId) {
          targetMinion = minion;
          isPlayerMinion = false;
          break;
        }
      }
    }
    
    if (!targetMinion) {
      return false; // Target not found
    }
    
    // Check if it's a valid target based on requirements
    
    // Can target any minion
    if (targetRequirement === 'any_minion') {
      return true;
    }
    
    // Can target only friendly minions
    if (targetRequirement === 'friendly_minion') {
      return (currentTurn === 'player' && isPlayerMinion) ||
             (currentTurn === 'opponent' && !isPlayerMinion);
    }
    
    // Can target only enemy minions
    if (targetRequirement === 'enemy_minion') {
      return (currentTurn === 'player' && !isPlayerMinion) ||
             (currentTurn === 'opponent' && isPlayerMinion);
    }
    
    return false;
  }
  
  return false;
}

/**
 * Determine if a spell requires a target
 */
export function requiresSpellTarget(card: CardData): boolean {
  if (!isSpell(card) || !card.spellEffect) return false;
  
  // If explicitly defined, use that value
  if (card.spellEffect.requiresTarget !== undefined) {
    return card.spellEffect.requiresTarget;
  }
  
  // Otherwise determine based on effect type
  switch (card.spellEffect.type) {
    case 'damage':
    case 'transform':
    case 'silence':
    case 'cleave_damage':
    case 'cleave_damage_with_freeze':
    case 'conditional_damage':
    case 'conditional_freeze_or_destroy':
    case 'draw_and_damage':
    case 'damage_and_shuffle':
      return true;
    case 'aoe_damage':
    case 'draw':
    case 'quest':
    case 'draw_both':
    case 'cost_reduction':
      return false;
    default:
      return false;
  }
}

/**
 * Execute a cleave spell effect that damages a target and adjacent minions
 */
function executeCleaveSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!effect.value) {
    debug.error('Cleave spell missing value parameter');
    return state;
  }
  
  if (!targetId || !targetType || targetType !== 'minion') {
    debug.error('Cleave spell requires a minion target');
    return state;
  }
  
  let newState = { ...state };
  const damageAmount = effect.value;
  
  // Find the target minion and its owner
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  let targetOwner: 'player' | 'opponent' | null = null;
  let targetIndex = -1;
  
  // Check if target is on player's battlefield
  for (let i = 0; i < player.battlefield.length; i++) {
    if (player.battlefield[i].instanceId === targetId) {
      targetOwner = 'player';
      targetIndex = i;
      break;
    }
  }
  
  // If not found, check opponent's battlefield
  if (targetOwner === null) {
    for (let i = 0; i < opponent.battlefield.length; i++) {
      if (opponent.battlefield[i].instanceId === targetId) {
        targetOwner = 'opponent';
        targetIndex = i;
        break;
      }
    }
  }
  
  if (targetOwner === null || targetIndex < 0) {
    debug.error('Target minion not found for cleave spell');
    return state;
  }
  
  // Get the battlefield array and apply damage to target and adjacent minions
  const battlefield = targetOwner === 'player' ? player.battlefield : opponent.battlefield;
  
  // Create a helper function to apply damage to a single minion
  const applyDamageToMinion = (minion: CardInstance) => {
    if (minion.currentHealth !== undefined) {
      // Check for Divine Shield
      if (minion.hasDivineShield) {
        minion.hasDivineShield = false;
      } else {
        minion.currentHealth -= damageAmount;
        
        // Apply enrage effects if minion is still alive
        if (minion.currentHealth > 0) {
          // Will be handled collectively at the end
        }
      }
    }
  };
  
  // Apply damage to target and adjacent minions
  // First get indices of minions to damage
  const minionsToModify: number[] = [targetIndex];
  if (targetIndex > 0) {
    minionsToModify.push(targetIndex - 1); // Left minion
  }
  if (targetIndex < battlefield.length - 1) {
    minionsToModify.push(targetIndex + 1); // Right minion
  }
  
  // Apply damage to these minions
  const newBattlefield = [...battlefield];
  
  minionsToModify.forEach(index => {
    if (index >= 0 && index < newBattlefield.length) {
      const minion = newBattlefield[index];
      applyDamageToMinion(minion);
    }
  });
  
  // Update the battlefield with damaged minions (leave dead ones for removeDeadMinions)
  if (targetOwner === 'player') {
    newState.players.player.battlefield = newBattlefield;
  } else {
    newState.players.opponent.battlefield = newBattlefield;
  }
  
  // Apply enrage effects after all damage
  newState = updateEnrageEffects(newState);
  
  // Use removeDeadMinions to properly trigger deathrattles via destroyCard
  newState = removeDeadMinions(newState);
  
  return newState;
}

/**
 * Execute a cleave spell with freeze effect that damages a target and freezes adjacent minions
 */
function executeCleaveWithFreezeSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!effect.value) {
    debug.error('Cleave with freeze spell missing value parameter');
    return state;
  }
  
  if (!targetId || !targetType || targetType !== 'minion') {
    debug.error('Cleave with freeze spell requires a minion target');
    return state;
  }
  
  let newState = { ...state };
  const damageAmount = effect.value;
  
  // Find the target minion and its owner
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  let targetOwner: 'player' | 'opponent' | null = null;
  let targetIndex = -1;
  
  // Check if target is on player's battlefield
  for (let i = 0; i < player.battlefield.length; i++) {
    if (player.battlefield[i].instanceId === targetId) {
      targetOwner = 'player';
      targetIndex = i;
      break;
    }
  }
  
  // If not found, check opponent's battlefield
  if (targetOwner === null) {
    for (let i = 0; i < opponent.battlefield.length; i++) {
      if (opponent.battlefield[i].instanceId === targetId) {
        targetOwner = 'opponent';
        targetIndex = i;
        break;
      }
    }
  }
  
  if (targetOwner === null || targetIndex < 0) {
    debug.error('Target minion not found for cleave with freeze spell');
    return state;
  }
  
  // Get the battlefield array and apply effects
  const battlefield = targetOwner === 'player' ? player.battlefield : opponent.battlefield;
  
  // Create a helper function to apply damage to the target minion
  const applyDamageToMinion = (minion: CardInstance) => {
    if (minion.currentHealth !== undefined) {
      // Check for Divine Shield
      if (minion.hasDivineShield) {
        minion.hasDivineShield = false;
      } else {
        minion.currentHealth -= damageAmount;
        
        // Apply enrage effects if minion is still alive
        if (minion.currentHealth > 0) {
          // Will be handled collectively at the end
        }
      }
    }
  };
  
  // Create a helper function to apply freeze to minions
  const applyFreezeToMinion = (minion: CardInstance) => {
    minion.isFrozen = true;
    minion.canAttack = false;
  };
  
  // Apply damage to target and freeze to adjacent minions
  const newBattlefield = [...battlefield];
  
  // Apply damage to target
  if (targetIndex >= 0 && targetIndex < newBattlefield.length) {
    const targetMinion = newBattlefield[targetIndex];
    applyDamageToMinion(targetMinion);
  }
  
  // Apply freeze to adjacent minions
  // Left adjacent
  if (targetIndex > 0) {
    const leftMinion = newBattlefield[targetIndex - 1];
    applyFreezeToMinion(leftMinion);
  }
  
  // Right adjacent
  if (targetIndex < newBattlefield.length - 1) {
    const rightMinion = newBattlefield[targetIndex + 1];
    applyFreezeToMinion(rightMinion);
  }
  
  // Update the battlefield with damaged minions (leave dead ones for removeDeadMinions)
  if (targetOwner === 'player') {
    newState.players.player.battlefield = newBattlefield;
  } else {
    newState.players.opponent.battlefield = newBattlefield;
  }
  
  // Apply enrage effects after all damage
  newState = updateEnrageEffects(newState);
  
  // Use removeDeadMinions to properly trigger deathrattles via destroyCard
  newState = removeDeadMinions(newState);
  
  return newState;
}

/**
 * Execute a conditional damage spell effect (deals more damage if condition is met)
 */
function executeConditionalDamageSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!effect.value || !effect.enhancedValue) {
    debug.error('Conditional damage spell missing value parameters');
    return state;
  }
  
  if (!targetId || !targetType) {
    debug.error('Conditional damage spell requires target ID and type');
    return state;
  }
  
  let newState = { ...state };
  const baseValue = effect.value;
  const enhancedValue = effect.enhancedValue;
  
  // Default to base value
  let damageAmount = baseValue;
  
  // Check if target meets the condition
  if (effect.condition === 'is_frozen') {
    // For now, we only handle the "is_frozen" condition
    
    if (targetType === 'minion') {
      // Find the target minion
      const player = newState.players.player;
      const opponent = newState.players.opponent;
      let targetMinion: CardInstance | null = null;
      
      // Check player's battlefield
      player.battlefield.forEach(minion => {
        if (minion.instanceId === targetId) {
          targetMinion = minion;
        }
      });
      
      // If not found, check opponent's battlefield
      if (!targetMinion) {
        opponent.battlefield.forEach(minion => {
          if (minion.instanceId === targetId) {
            targetMinion = minion;
          }
        });
      }
      
      // If target found and is frozen, use enhanced damage
      if (targetMinion && (targetMinion as any).isFrozen) {
        damageAmount = enhancedValue;
      }
    }
  }
  
  // Execute the damage spell with determined damage amount
  const modifiedEffect = { ...effect, value: damageAmount };
  return executeDamageSpell(newState, modifiedEffect, targetId, targetType);
}

/**
 * Execute a conditional freeze or destroy spell effect
 */
function executeConditionalFreezeOrDestroySpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!targetId || !targetType || targetType !== 'minion') {
    debug.error('Conditional freeze or destroy spell requires a minion target');
    return state;
  }
  
  let newState = { ...state };
  
  // Find the target minion
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  let targetFound = false;
  let targetOwner: 'player' | 'opponent' | null = null;
  let targetIndex = -1;
  
  // Check player's battlefield
  for (let i = 0; i < player.battlefield.length; i++) {
    if (player.battlefield[i].instanceId === targetId) {
      targetFound = true;
      targetOwner = 'player';
      targetIndex = i;
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's battlefield
  if (!targetFound) {
    for (let i = 0; i < opponent.battlefield.length; i++) {
      if (opponent.battlefield[i].instanceId === targetId) {
        targetFound = true;
        targetOwner = 'opponent';
        targetIndex = i;
        break;
      }
    }
  }
  
  if (!targetFound || targetOwner === null || targetIndex < 0) {
    debug.error('Target minion not found for conditional freeze or destroy spell');
    return state;
  }
  
  const battlefield = targetOwner === 'player' ? player.battlefield : opponent.battlefield;
  const target = battlefield[targetIndex];
  
  // Check if target is already frozen
  if (target.isFrozen) {
    
    // Target is frozen, so destroy it - use destroyCard for proper deathrattle handling
    newState = destroyCardFromZone(newState, target.instanceId, targetOwner!);
  } else {
    // Target is not frozen, so freeze it
    target.isFrozen = true;
    target.canAttack = false;
  }
  
  return newState;
}

/**
 * Execute a draw and damage spell effect (draw a card and deal damage equal to its cost)
 */
function executeDrawAndDamageSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!targetId || !targetType) {
    debug.error('Draw and damage spell requires target ID and type');
    return state;
  }
  
  if (!effect.drawCards) {
    debug.error('Draw and damage spell missing drawCards parameter');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const drawCount = effect.drawCards;
  
  // First, draw the cards
  const cardsDrawn: CardData[] = [];
  
  // Get the player's cards before drawing
  const playerHandBefore = [...newState.players[currentPlayer === 'player' ? 'player' : 'opponent'].hand];
  
  // Draw the cards using the standardized drawMultipleCards function
  // Ensure currentPlayer is a valid player type
  newState = drawMultipleCards(
    newState, 
    currentPlayer === 'player' ? 'player' : 'opponent', 
    drawCount
  );
  
  // Compare the hand after drawing with the hand before to find the newly drawn cards
  const safePlayerType = currentPlayer === 'player' ? 'player' : 'opponent';
  const playerHandAfter = newState.players[safePlayerType].hand;
  const newCardInstances = playerHandAfter.filter(
    cardAfter => !playerHandBefore.some(cardBefore => cardBefore.instanceId === cardAfter.instanceId)
  );
  
  // Add the newly drawn cards to our list
  for (const cardInstance of newCardInstances) {
    cardsDrawn.push(cardInstance.card);
  }
  
  // If no cards were drawn, exit early
  if (cardsDrawn.length === 0) {
    return newState;
  }
  
  // Calculate damage based on card cost
  let damageAmount = 0;
  
  if (effect.damageBasedOnDrawnCardCost && cardsDrawn.length > 0) {
    // Use the mana cost of the first drawn card
    damageAmount = cardsDrawn[0].manaCost ?? 0;
  }
  
  // Now apply the damage using a modified damage spell effect
  const damageEffect: SpellEffect = {
    type: 'damage',
    value: damageAmount,
    requiresTarget: true,
    targetType: effect.targetType
  };
  
  return executeDamageSpell(newState, damageEffect, targetId, targetType);
}

/**
 * Execute a draw for both players spell effect
 */
function executeDrawBothPlayersSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Draw both players spell missing value parameter');
    return state;
  }
  
  let newState = { ...state };
  const drawCount = effect.value;
  const currentPlayer = state.currentTurn || 'player';
  
  // Draw cards for current player using the standardized drawMultipleCards function
  // First, ensure currentPlayer is a valid player type
  const safeCurrentPlayer = 'player';
  newState = drawMultipleCards(
    { ...newState, currentTurn: safeCurrentPlayer }, 
    safeCurrentPlayer,
    drawCount
  );
  
  // Draw cards for opposing player using the standardized drawMultipleCards function
  // Since opposingPlayer is guaranteed to be either 'player' or 'opponent', this is safe
  newState = drawMultipleCards(
    { ...newState, currentTurn: 'opponent' },
    'opponent',
    drawCount
  );
  
  // Restore the original current turn
  newState = { ...newState, currentTurn: currentPlayer };
  
  return newState;
}

/**
 * Execute a damage and shuffle spell effect (like Forgotten Torch)
 */
function executeDamageAndShuffleSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!effect.value) {
    debug.error('Damage and shuffle spell missing value parameter');
    return state;
  }
  
  if (!effect.shuffleCardId) {
    debug.error('Damage and shuffle spell missing shuffleCardId parameter');
    return state;
  }
  
  if (!targetId || !targetType) {
    debug.error('Damage and shuffle spell requires target ID and type');
    return state;
  }
  
  let newState = { ...state };
  const damageAmount = effect.value;
  const cardIdToShuffle = effect.shuffleCardId;
  const currentPlayer = state.currentTurn || 'player';
  
  // First apply the damage effect
  const damageEffect: SpellEffect = {
    type: 'damage',
    value: damageAmount,
    requiresTarget: true,
    targetType: effect.targetType
  };
  
  newState = executeDamageSpell(newState, damageEffect, targetId, targetType);
  
  // Then shuffle the card into the deck
  // Find the card to shuffle by ID
  const cardToShuffle = getCardById(cardIdToShuffle as number);
  
  if (!cardToShuffle) {
    debug.error(`Card with ID ${cardIdToShuffle} not found for shuffling`);
    return newState;
  }
  
  // Get current player's deck
  const playerDeck = currentPlayer === 'player' ? 
    newState.players.player.deck : 
    newState.players.opponent.deck;
  
  // Create a card instance to shuffle in
  const cardInstance: CardInstance = {
    instanceId: uuidv4(),
    card: cardToShuffle,
    currentHealth: 0, // Not applicable for spells but required by CardInstance interface
    canAttack: false, // Not applicable for spells but required by CardInstance interface
    isSummoningSick: false, // Not applicable for spells but required by CardInstance interface
    attacksPerformed: 0 // Not applicable for spells but required by CardInstance interface
  };
  
  // Shuffle the card into the current player's deck (using type assertion for deck compatibility)
  if (currentPlayer === 'player') {
    newState.players.player.deck = [...playerDeck, cardInstance] as any;
  } else {
    newState.players.opponent.deck = [...playerDeck, cardInstance] as any;
  }
  
  
  return newState;
}

/**
 * Execute a cost reduction spell effect
 */
function executeCostReductionSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Cost reduction spell missing value parameter');
    return state;
  }
  
  let newState = { ...state };
  const reductionAmount = effect.value;
  const currentPlayer = state.currentTurn || 'player';
  const specificRace = effect.specificRace; // For "The next Elemental you play this turn costs (2) less"
  
  // We need to set a temporary state flag to track cost reduction for the next played card
  // This would be implemented in the game engine to apply the discount when playing cards
  
  
  // Mark cost reduction in game state 
  // In a real implementation, this would be more sophisticated with proper tracking
  // Using type assertion to add temporary effect tracking
  if (currentPlayer === 'player') {
    (newState.players.player as any).tempEffects = {
      ...((newState.players.player as any).tempEffects || {}),
      costReduction: {
        amount: reductionAmount,
        specificRace: specificRace,
        duration: 'next_card'
      }
    };
  } else {
    (newState.players.opponent as any).tempEffects = {
      ...((newState.players.opponent as any).tempEffects || {}),
      costReduction: {
        amount: reductionAmount,
        specificRace: specificRace,
        duration: 'next_card'
      }
    };
  }
  
  return newState;
}

/**
 * Execute a destroy spell effect - destroys a targeted minion
 */
function executeDestroySpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  _targetType?: 'minion' | 'hero'
): GameState {
  if (!targetId) {
    debug.error('Destroy spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Find and destroy the target minion
  let destroyedMinion: CardInstance | null = null;
  
  // Check player's battlefield
  const playerIdx = player.battlefield.findIndex(m => m.instanceId === targetId);
  if (playerIdx !== -1) {
    destroyedMinion = player.battlefield[playerIdx];
    player.battlefield.splice(playerIdx, 1);
    player.graveyard = [...(player.graveyard || []), destroyedMinion];
  }
  
  // Check opponent's battlefield
  const oppIdx = opponent.battlefield.findIndex(m => m.instanceId === targetId);
  if (oppIdx !== -1) {
    destroyedMinion = opponent.battlefield[oppIdx];
    opponent.battlefield.splice(oppIdx, 1);
    opponent.graveyard = [...(opponent.graveyard || []), destroyedMinion];
  }
  
  if (destroyedMinion) {
    
    // Apply secondary effect (e.g., heal hero for Soul's Siphon)
    if (effect.secondaryValue && effect.secondaryType === 'heal') {
      const currentPlayer = state.currentTurn || 'player';
      if (currentPlayer === 'player') {
        const p = newState.players.player;
        p.heroHealth = Math.min(p.maxHealth, (p.heroHealth ?? p.health ?? p.maxHealth) + effect.secondaryValue);
      } else {
        const p = newState.players.opponent;
        p.heroHealth = Math.min(p.maxHealth, (p.heroHealth ?? p.health ?? p.maxHealth) + effect.secondaryValue);
      }
    }
  }
  
  return newState;
}

/**
 * Execute a mind control spell - take control of enemy minion
 */
function executeMindControlSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  temporary: boolean = false
): GameState {
  if (!targetId) {
    debug.error('Mind control spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  // Clone arrays to avoid direct mutations
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  const myBattlefield = currentPlayer === 'player' ? [...player.battlefield] : [...opponent.battlefield];
  const enemyBattlefield = currentPlayer === 'player' ? [...opponent.battlefield] : [...player.battlefield];
  
  // Find target in enemy battlefield
  const targetIdx = enemyBattlefield.findIndex(m => m.instanceId === targetId);
  if (targetIdx === -1) {
    debug.error('Mind control target not found in enemy battlefield');
    return state;
  }
  
  // Check if player's battlefield is full
  if (myBattlefield.length >= MAX_BATTLEFIELD_SIZE) {
    debug.warn(`Cannot take control of ${enemyBattlefield[targetIdx].card.name}: your battlefield is full`);
    return state;
  }
  
  // Take control of the minion
  const stolenMinion = { ...enemyBattlefield[targetIdx] };
  stolenMinion.isSummoningSick = true;
  stolenMinion.canAttack = false;
  if (temporary) {
    (stolenMinion as any).temporaryControl = true;
  }
  
  // Remove from enemy battlefield and add to own battlefield
  enemyBattlefield.splice(targetIdx, 1);
  myBattlefield.push(stolenMinion);
  
  // Update the state with cloned arrays
  if (currentPlayer === 'player') {
    newState.players.player.battlefield = myBattlefield;
    newState.players.opponent.battlefield = enemyBattlefield;
  } else {
    newState.players.opponent.battlefield = myBattlefield;
    newState.players.player.battlefield = enemyBattlefield;
  }
  
  
  return newState;
}

/**
 * Execute a return to hand spell - bounces minion back to owner's hand
 */
function executeReturnToHandSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Return to hand spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Clone arrays to avoid direct mutations
  let playerBattlefield = [...player.battlefield];
  let playerHand = [...player.hand];
  let opponentBattlefield = [...opponent.battlefield];
  let opponentHand = [...opponent.hand];
  
  // Check player's battlefield
  const playerIdx = playerBattlefield.findIndex(m => m.instanceId === targetId);
  if (playerIdx !== -1) {
    const minion = playerBattlefield[playerIdx];
    
    // Check if hand is full before adding
    if (playerHand.length >= 10) {
      debug.warn(`Cannot return ${minion.card.name} to hand: hand is full (10/10)`);
      return state;
    }
    
    // Remove from battlefield
    playerBattlefield.splice(playerIdx, 1);
    
    // Reset minion state and add to hand
    minion.currentHealth = getHealth(minion.card);
    minion.isSummoningSick = true;
    minion.canAttack = false;
    playerHand.push(minion);
    
    // Update state
    newState.players.player.battlefield = playerBattlefield;
    newState.players.player.hand = playerHand;

    newState = checkPetEvolutionTrigger(newState, 'on_return_to_hand');
    return newState;
  }

  // Check opponent's battlefield
  const oppIdx = opponentBattlefield.findIndex(m => m.instanceId === targetId);
  if (oppIdx !== -1) {
    const minion = opponentBattlefield[oppIdx];

    // Check if hand is full before adding
    if (opponentHand.length >= 10) {
      debug.warn(`Cannot return ${minion.card.name} to opponent's hand: hand is full (10/10)`);
      return state;
    }

    // Remove from battlefield
    opponentBattlefield.splice(oppIdx, 1);

    // Reset minion state and add to hand
    minion.currentHealth = getHealth(minion.card);
    minion.isSummoningSick = true;
    minion.canAttack = false;
    opponentHand.push(minion);

    // Update state
    newState.players.opponent.battlefield = opponentBattlefield;
    newState.players.opponent.hand = opponentHand;

    newState = checkPetEvolutionTrigger(newState, 'on_return_to_hand');
    return newState;
  }
  
  return newState;
}

/**
 * Execute a buff weapon spell - adds attack/durability to equipped weapon
 */
function executeBuffWeaponSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  if (!playerState.weapon) {
    return state;
  }
  
  if (effect.value) {
    playerState.weapon.currentAttack = (playerState.weapon.currentAttack || getAttack(playerState.weapon.card)) + effect.value;
  }
  if (effect.secondaryValue) {
    playerState.weapon.currentDurability = (playerState.weapon.currentDurability || 0) + effect.secondaryValue;
  }
  
  
  return newState;
}

/**
 * Execute an equip weapon spell - equips a weapon from a spell
 */
function executeEquipWeaponSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.weaponCardId) {
    debug.error('Equip weapon spell missing weaponCardId');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Find the weapon card
  const weaponCard = getCardById(effect.weaponCardId as number);
  if (!weaponCard || weaponCard.type !== 'weapon') {
    debug.error(`Weapon card ${effect.weaponCardId} not found`);
    return state;
  }
  
  playerState.weapon = {
    instanceId: uuidv4(),
    card: weaponCard,
    currentAttack: getAttack(weaponCard),
    currentDurability: isWeapon(weaponCard) ? weaponCard.durability || 1 : 1
  };
  
  
  return newState;
}

/**
 * Execute an add card spell - generates cards into hand
 */
function executeAddCardSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerHand = currentPlayer === 'player' ? newState.players.player.hand : newState.players.opponent.hand;
  
  const count = effect.count || 1;
  
  if (effect.addCardId) {
    // Add specific card(s)
    const cardToAdd = getCardById(effect.addCardId as number);
    if (cardToAdd) {
      for (let i = 0; i < count && playerHand.length < 10; i++) {
        const instance: CardInstance = {
          instanceId: uuidv4(),
          card: cardToAdd,
          currentHealth: getHealth(cardToAdd),
          canAttack: false,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        playerHand.push(instance);
      }
    }
  } else if (effect.addRandomType) {
    // Add random cards of a type
    const validCards = allCards.filter(c => c.type === effect.addRandomType && c.collectible);
    for (let i = 0; i < count && playerHand.length < 10; i++) {
      const randomCard = validCards[Math.floor(Math.random() * validCards.length)];
      if (randomCard) {
        const instance: CardInstance = {
          instanceId: uuidv4(),
          card: randomCard,
          currentHealth: getHealth(randomCard),
          canAttack: false,
          isSummoningSick: true,
          attacksPerformed: 0
        };
        playerHand.push(instance);
      }
    }
  }
  
  return newState;
}

/**
 * Execute a random damage spell - deals damage to random enemy
 */
function executeRandomDamageSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Random damage spell missing value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const enemyBattlefield = currentPlayer === 'player' ? 
    newState.players.opponent.battlefield : 
    newState.players.player.battlefield;
  
  // Get valid targets (enemy minions and optionally hero)
  const targets: Array<{ type: 'minion' | 'hero'; id?: string; idx?: number }> = [];
  
  enemyBattlefield.forEach((minion, idx) => {
    targets.push({ type: 'minion', id: minion.instanceId, idx });
  });
  
  if (effect.targetType !== 'enemy_minion_only') {
    targets.push({ type: 'hero' });
  }
  
  if (targets.length === 0) {
    return state;
  }
  
  // Pick random target
  const target = targets[Math.floor(Math.random() * targets.length)];
  
  if (target.type === 'hero') {
    const enemyType: 'player' | 'opponent' = currentPlayer === 'player' ? 'opponent' : 'player';
    newState = dealDamage(newState, enemyType, 'hero', effect.value, undefined, undefined, currentPlayer as 'player' | 'opponent');
  } else if (target.idx !== undefined) {
    const minion = enemyBattlefield[target.idx];
    minion.currentHealth = (minion.currentHealth || getHealth(minion.card)) - (effect.value || 0);
    
    // Check for death - use removeDeadMinions to properly trigger deathrattles
    if (minion.currentHealth <= 0) {
      newState = removeDeadMinions(newState);
    }
  }
  
  return newState;
}

/**
 * Execute destroy random spell - destroys a random enemy minion
 */
function executeDestroyRandomSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const enemyBattlefield = currentPlayer === 'player' ? 
    newState.players.opponent.battlefield : 
    newState.players.player.battlefield;
  
  if (enemyBattlefield.length === 0) {
    return state;
  }
  
  const randomIdx = Math.floor(Math.random() * enemyBattlefield.length);
  const destroyed = enemyBattlefield[randomIdx];
  const targetOwner = currentPlayer === 'player' ? 'opponent' : 'player';
  newState = destroyCardFromZone(newState, destroyed.instanceId, targetOwner);
  
  return newState;
}

/**
 * Execute shuffle into deck spell
 */
function executeShuffleIntoDeckSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  if (targetId) {
    // Shuffle a specific minion from battlefield
    const player = newState.players.player;
    const opponent = newState.players.opponent;
    
    const playerIdx = player.battlefield.findIndex(m => m.instanceId === targetId);
    if (playerIdx !== -1) {
      const minion = player.battlefield.splice(playerIdx, 1)[0];
      (player.deck as any[]).push(minion);
      shuffleInPlace(player.deck);
    }

    const oppIdx = opponent.battlefield.findIndex(m => m.instanceId === targetId);
    if (oppIdx !== -1) {
      const minion = opponent.battlefield.splice(oppIdx, 1)[0];
      (opponent.deck as any[]).push(minion);
      shuffleInPlace(opponent.deck);
    }
  } else if (effect.shuffleCardId) {
    // Shuffle a specific card into deck
    const cardToShuffle = getCardById(effect.shuffleCardId as number);
    if (cardToShuffle) {
      const instance: CardInstance = {
        instanceId: uuidv4(),
        card: cardToShuffle,
        currentHealth: getHealth(cardToShuffle),
        canAttack: false,
        isSummoningSick: true,
        attacksPerformed: 0
      };

      const deck = currentPlayer === 'player' ?
        newState.players.player.deck :
        newState.players.opponent.deck;
      (deck as any[]).push(instance);
      shuffleInPlace(deck);
    }
  }
  
  return newState;
}

/**
 * Execute grant keyword spell - gives a minion a keyword like stealth
 */
function executeGrantKeywordSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Grant keyword spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Find target minion
  let target: CardInstance | null = null;
  const playerIdx = player.battlefield.findIndex(m => m.instanceId === targetId);
  if (playerIdx !== -1) {
    target = player.battlefield[playerIdx];
  }
  
  const oppIdx = opponent.battlefield.findIndex(m => m.instanceId === targetId);
  if (oppIdx !== -1) {
    target = opponent.battlefield[oppIdx];
  }
  
  if (!target) {
    debug.error('Target minion not found');
    return state;
  }
  
  // Apply keyword
  const keyword = effect.keyword || effect.grantKeyword || 'stealth';
  switch (keyword.toLowerCase()) {
    case 'stealth':
      target.isStealth = true;
      break;
    case 'taunt':
      target.isTaunt = true;
      break;
    case 'divine shield':
      target.hasDivineShield = true;
      break;
    case 'windfury':
      target.hasWindfury = true;
      break;
    case 'lifesteal':
      target.hasLifesteal = true;
      break;
    case 'poisonous':
      target.hasPoisonous = true;
      break;
    case 'rush':
      target.hasRush = true;
      target.canAttack = true;
      break;
    case 'charge':
      target.hasCharge = true;
      target.canAttack = true;
      target.isSummoningSick = false;
      break;
  }
  
  
  return newState;
}

/**
 * Execute grant deathrattle spell
 */
function executeGrantDeathrattleSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Grant deathrattle spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Find target
  let target: CardInstance | null = null;
  const playerIdx = player.battlefield.findIndex(m => m.instanceId === targetId);
  if (playerIdx !== -1) {
    target = player.battlefield[playerIdx];
  }
  
  const oppIdx = opponent.battlefield.findIndex(m => m.instanceId === targetId);
  if (oppIdx !== -1) {
    target = opponent.battlefield[oppIdx];
  }
  
  if (target && effect.deathrattle) {
    // Store added deathrattle in enchantments
    if (!target.enchantments) target.enchantments = [];
    target.enchantments.push({ type: 'deathrattle', effect: effect.deathrattle });
  }
  
  return newState;
}

/**
 * Execute damage based on armor spell (like Shield Slam)
 */
function executeDamageBasedOnArmorSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!targetId) {
    debug.error('Damage based on armor spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  const armor = playerState.armor || 0;
  const damageAmount = armor;
  
  if (damageAmount <= 0) {
    return state;
  }
  
  // Apply damage using the damage spell logic
  const damageEffect: SpellEffect = {
    type: 'damage',
    value: damageAmount,
    requiresTarget: true
  };
  
  return executeDamageSpell(newState, damageEffect, targetId, targetType);
}

/**
 * Execute summon Yggdrasil Golem spell
 */
function executeSummonYggdrasilGolemSpell(
  state: GameState
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Increment Yggdrasil Golem counter
  const currentGolemCounter = (playerState as any).yggdrasilGolemCounter || 0;
  const newGolemCounter = Math.min(currentGolemCounter + 1, 30);
  (playerState as any).yggdrasilGolemCounter = newGolemCounter;

  const golemSize = newGolemCounter;

  // Create Yggdrasil Golem token
  const golem: CardInstance = {
    instanceId: uuidv4(),
    card: {
      id: 99999,
      name: 'Yggdrasil Golem',
      type: 'minion',
      manaCost: golemSize,
      attack: golemSize,
      health: golemSize,
      description: '',
      rarity: 'common',
      class: 'Neutral',
      race: 'Elemental'
    },
    currentHealth: golemSize,
    canAttack: false,
    isSummoningSick: true,
    attacksPerformed: 0
  };

  // Check battlefield limit
  if (playerState.battlefield.length < MAX_BATTLEFIELD_SIZE) {
    playerState.battlefield.push(golem);

    trackQuestProgress(currentPlayer, 'summon_minion', golem.card);
  }
  
  return newState;
}

/**
 * Execute gain mana spell
 */
function executeGainManaSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Gain mana spell missing value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  if (effect.permanent) {
    // Permanent mana crystal (like Wild Growth)
    playerState.mana.max = Math.min((playerState.mana.max || 1) + effect.value, 10);
    // Also increase current mana for this turn
    playerState.mana.current = Math.min(playerState.mana.current + effect.value, playerState.mana.max);
  } else {
    // Temporary mana this turn (like Innervate) - no cap, can exceed max
    playerState.mana.current = (playerState.mana.current || 0) + effect.value;
  }
  
  
  return newState;
}

/**
 * Execute summon_random spell effect
 * Summons a random minion from the card pool
 */
function executeSummonRandomSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Check battlefield limit
  if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return newState;
  }
  
  // Get all minion cards from allCards
  const minions = allCards.filter(card => card && card.type === 'minion');
  if (minions.length === 0) {
    debug.error('No minions available to summon randomly');
    return newState;
  }
  
  // Pick a random minion
  const randomMinion = minions[Math.floor(Math.random() * minions.length)];
  
  // Create a card instance
  const summonedInstance: CardInstance = {
    instanceId: uuidv4(),
    card: randomMinion as CardData,
    currentHealth: randomMinion.health || 1,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: true,
    attacksPerformed: 0
  };
  
  playerState.battlefield.push(summonedInstance);
  
  // Track quest progress for summoned minion
  trackQuestProgress(currentPlayer, 'summon_minion', summonedInstance.card);
  
  return newState;
}

/**
 * Execute summon_copies spell effect
 * Summons multiple copies of a target minion
 */
function executeSummonCopiesSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Summon copies spell requires a target ID');
    return state;
  }
  
  if (!effect.count) {
    debug.error('Summon copies spell missing count parameter');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Find the target minion
  let targetMinion: CardInstance | undefined;
  for (const minion of newState.players.player.battlefield.concat(newState.players.opponent.battlefield)) {
    if (minion.instanceId === targetId) {
      targetMinion = minion;
      break;
    }
  }
  
  if (!targetMinion) {
    debug.error(`Target minion ${targetId} not found`);
    return state;
  }
  
  // Summon copies
  for (let i = 0; i < effect.count; i++) {
    if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
      break;
    }
    
    const copiedInstance: CardInstance = {
      instanceId: uuidv4(),
      card: targetMinion.card,
      currentHealth: targetMinion.currentHealth || getHealth(targetMinion.card),
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    
    playerState.battlefield.push(copiedInstance);
  }
  
  
  return newState;
}

/**
 * Execute summon_token spell effect
 * Similar to summon_tokens - summons a specific token minion
 */
function executeSummonTokenSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.tokenId || !effect.count) {
    debug.error('Summon token spell missing tokenId or count');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Find the token card
  const tokenCard = getCardById(effect.tokenId as number);
  if (!tokenCard) {
    debug.error(`Token with ID ${effect.tokenId} not found`);
    return state;
  }
  
  // Summon tokens
  for (let i = 0; i < effect.count; i++) {
    if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
      break;
    }
    
    const tokenInstance: CardInstance = {
      instanceId: uuidv4(),
      card: tokenCard as CardData,
      currentHealth: getHealth(tokenCard as CardData),
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    
    playerState.battlefield.push(tokenInstance);
  }
  
  
  return newState;
}

/**
 * Execute summon_from_graveyard spell effect
 * Summons a random minion from the player's graveyard
 */
function executeSummonFromGraveyardSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Check battlefield limit
  if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return newState;
  }
  
  // Check if graveyard is empty
  const graveyard = playerState.graveyard || [];
  if (graveyard.length === 0) {
    return newState;
  }
  
  // Pick a random minion from graveyard
  const randomIndex = Math.floor(Math.random() * graveyard.length);
  const minionToSummon = { ...graveyard[randomIndex] };
  
  // Reset minion state
  minionToSummon.currentHealth = getHealth(minionToSummon.card);
  minionToSummon.isSummoningSick = true;
  minionToSummon.canAttack = false;
  
  // Add to battlefield and remove from graveyard
  playerState.battlefield.push(minionToSummon);
  graveyard.splice(randomIndex, 1);
  playerState.graveyard = graveyard;
  
  
  return newState;
}

/**
 * Execute summon_highest_cost_from_graveyard spell effect
 * Summons the highest cost minion from the player's graveyard
 */
function executeSummonHighestCostFromGraveyardSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Check battlefield limit
  if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return newState;
  }
  
  // Check if graveyard is empty
  const graveyard = playerState.graveyard || [];
  if (graveyard.length === 0) {
    return newState;
  }
  
  // Find the highest cost minion
  let highestCostIndex = 0;
  let highestCost = graveyard[0].card.manaCost || 0;
  
  for (let i = 1; i < graveyard.length; i++) {
    const cost = graveyard[i].card.manaCost || 0;
    if (cost > highestCost) {
      highestCost = cost;
      highestCostIndex = i;
    }
  }
  
  const minionToSummon = { ...graveyard[highestCostIndex] };
  
  // Reset minion state
  minionToSummon.currentHealth = getHealth(minionToSummon.card);
  minionToSummon.isSummoningSick = true;
  minionToSummon.canAttack = false;
  
  // Add to battlefield and remove from graveyard
  playerState.battlefield.push(minionToSummon);
  graveyard.splice(highestCostIndex, 1);
  playerState.graveyard = graveyard;
  
  
  return newState;
}

/**
 * Execute summon_stored spell effect
 * Summons minions that were stored previously (typically in effect.storedMinions array)
 */
function executeSummonStoredSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  if (!effect.storedMinions || !Array.isArray(effect.storedMinions) || effect.storedMinions.length === 0) {
    return newState;
  }
  
  // Summon each stored minion
  for (const storedMinion of effect.storedMinions) {
    if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
      break;
    }
    
    // Create instance from stored minion (already a CardInstance)
    const summonedInstance: CardInstance = {
      ...storedMinion,
      instanceId: uuidv4(),  // Generate new instance ID
      isSummoningSick: true,
      canAttack: false
    };
    
    playerState.battlefield.push(summonedInstance);
  }
  
  
  return newState;
}

/**
 * Execute resurrect_multiple spell effect
 * Resurrects multiple minions from the player's graveyard
 */
function executeResurrectMultipleSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  if (!effect.count) {
    debug.error('Resurrect multiple spell missing count');
    return state;
  }
  
  // Check graveyard
  const graveyard = [...(playerState.graveyard || [])];
  if (graveyard.length === 0) {
    return newState;
  }
  
  // Resurrect multiple minions
  for (let i = 0; i < effect.count && graveyard.length > 0; i++) {
    if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
      break;
    }
    
    // Pick a random minion from graveyard
    const randomIndex = Math.floor(Math.random() * graveyard.length);
    const minionToResurrect = { ...graveyard[randomIndex] };
    
    // Reset minion state
    minionToResurrect.currentHealth = getHealth(minionToResurrect.card);
    minionToResurrect.isSummoningSick = true;
    minionToResurrect.canAttack = false;
    
    // Add to battlefield
    playerState.battlefield.push(minionToResurrect);
    graveyard.splice(randomIndex, 1);
  }
  
  playerState.graveyard = graveyard;
  
  return newState;
}

/**
 * Execute resurrect_deathrattle spell effect
 * Resurrects a minion and triggers its deathrattle effect
 */
function executeResurrectDeathrattleSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Check battlefield limit
  if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return newState;
  }
  
  // Check graveyard
  const graveyard = [...(playerState.graveyard || [])];
  if (graveyard.length === 0) {
    return newState;
  }
  
  // Pick a random minion from graveyard
  const randomIndex = Math.floor(Math.random() * graveyard.length);
  const minionToResurrect = { ...graveyard[randomIndex] };
  
  // Reset minion state
  minionToResurrect.currentHealth = getHealth(minionToResurrect.card);
  minionToResurrect.isSummoningSick = true;
  minionToResurrect.canAttack = false;
  
  // Add to battlefield
  playerState.battlefield.push(minionToResurrect);
  graveyard.splice(randomIndex, 1);
  playerState.graveyard = graveyard;
  
  
  return newState;
}

/**
 * Execute silence_all spell effect - silences all minions on the battlefield
 */
function executeSilenceAllSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Helper function to silence a minion
  const silenceMinion = (minion: CardInstance) => {
    // Store original keywords if not already stored (using type assertion)
    if (!(minion as any).originalKeywords) {
      (minion as any).originalKeywords = [...(minion.card.keywords || [])];
    }
    
    // Remove all ability-based keywords
    removeKeyword(minion, 'taunt');
    removeKeyword(minion, 'divine_shield');
    removeKeyword(minion, 'windfury');
    removeKeyword(minion, 'deathrattle');
    removeKeyword(minion, 'battlecry');
    removeKeyword(minion, 'spell_damage');

    // Remove divine shield if present
    minion.hasDivineShield = false;

    // Remove any deathrattle and battlecry effects (using type assertion)
    if (isMinion(minion.card)) {
      (minion.card as any).deathrattle = undefined;
      (minion.card as any).battlecry = undefined;
    }
    
    // Mark the minion as silenced
    minion.silenced = true;
    
    // Reset spell power if present (using type assertion)
    (minion as any).spellPower = 0;
    
  };
  
  // Silence all minions on player's battlefield
  for (const minion of player.battlefield) {
    silenceMinion(minion);
  }
  
  // Silence all minions on opponent's battlefield
  for (const minion of opponent.battlefield) {
    silenceMinion(minion);
  }
  
  
  return newState;
}

/**
 * Execute silence_and_damage spell effect - silences a minion and deals damage to it
 */
function executeSilenceAndDamageSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!targetId || !targetType || targetType !== 'minion') {
    debug.error('Silence and damage spell requires a minion target');
    return state;
  }
  
  if (!effect.value) {
    debug.error('Silence and damage spell missing damage value');
    return state;
  }
  
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Find the target minion
  let targetFound = false;
  
  // Check player's battlefield
  for (const minion of player.battlefield) {
    if (minion.instanceId === targetId) {
      targetFound = true;
      
      // Apply silence effect - store state in enchantments
      if (!minion.enchantments) minion.enchantments = [];

      removeKeyword(minion, 'taunt');
      removeKeyword(minion, 'divine_shield');
      removeKeyword(minion, 'windfury');
      removeKeyword(minion, 'deathrattle');
      removeKeyword(minion, 'battlecry');
      removeKeyword(minion, 'spell_damage');

      minion.hasDivineShield = false;
      if (isMinion(minion.card)) {
        (minion.card as any).deathrattle = undefined;
        (minion.card as any).battlecry = undefined;
      }
      minion.silenced = true;

      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's
  if (!targetFound) {
    for (const minion of opponent.battlefield) {
      if (minion.instanceId === targetId) {
        targetFound = true;
        
        // Apply silence effect - store state in enchantments
        if (!minion.enchantments) minion.enchantments = [];

        removeKeyword(minion, 'taunt');
        removeKeyword(minion, 'divine_shield');
        removeKeyword(minion, 'windfury');
        removeKeyword(minion, 'deathrattle');
        removeKeyword(minion, 'battlecry');
        removeKeyword(minion, 'spell_damage');
        
        minion.hasDivineShield = false;
        if (isMinion(minion.card)) {
          (minion.card as any).deathrattle = undefined;
          (minion.card as any).battlecry = undefined;
        }
        minion.silenced = true;
        
        break;
      }
    }
  }
  
  if (!targetFound) {
    debug.error('Target minion not found for silence and damage spell');
    return state;
  }
  
  // Now apply damage using the damage spell effect
  const damageEffect: SpellEffect = {
    type: 'damage',
    value: effect.value,
    requiresTarget: true
  };
  
  return executeDamageSpell(newState, damageEffect, targetId, 'minion');
}

/**
 * Execute set_attack spell effect - sets a minion's attack to a specific value
 */
function executeSetAttackSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Set attack spell requires a target');
    return state;
  }
  
  if (effect.value === undefined) {
    debug.error('Set attack spell missing attack value');
    return state;
  }
  
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Find the target minion
  let targetFound = false;
  
  // Check player's battlefield
  for (const minion of player.battlefield) {
    if (minion.instanceId === targetId) {
      targetFound = true;
      minion.currentAttack = effect.value;
      if (isMinion(minion.card)) {
        (minion.card as any).attack = effect.value;
      }
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's
  if (!targetFound) {
    for (const minion of opponent.battlefield) {
      if (minion.instanceId === targetId) {
        targetFound = true;
        minion.currentAttack = effect.value;
        if (isMinion(minion.card)) {
          (minion.card as any).attack = effect.value;
        }
        break;
      }
    }
  }
  
  if (!targetFound) {
    debug.error('Target minion not found for set attack spell');
    return state;
  }
  
  return newState;
}

/**
 * Execute set_hero_health spell effect - sets a hero's health to a specific value
 */
function executeSetHeroHealthSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Set hero health spell requires a target');
    return state;
  }
  
  if (effect.value === undefined) {
    debug.error('Set hero health spell missing health value');
    return state;
  }
  
  let newState = { ...state };
  
  // Set the target hero's health to the specified value (keep both fields in sync)
  if (targetId === 'opponent' || targetId === 'opponent-hero') {
    newState.players.opponent.health = effect.value;
    newState.players.opponent.heroHealth = effect.value;
  } else if (targetId === 'player' || targetId === 'player-hero') {
    newState.players.player.health = effect.value;
    newState.players.player.heroHealth = effect.value;
  } else {
    debug.error(`Unknown hero target ID: ${targetId}`);
    return state;
  }

  return newState;
}

/**
 * Execute self_damage spell effect - deals damage to the caster's hero
 */
function executeSelfDamageSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Self damage spell missing damage value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const damageAmount = effect.value;
  
  // Deal damage to the current player's hero using dealDamage to handle armor properly
  newState = dealDamage(newState, currentPlayer, 'hero', damageAmount);
  
  
  return newState;
}

/**
 * Execute self_damage_buff spell effect - deals damage to self and gains a buff
 */
function executeSelfDamageBuffSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Self damage buff spell missing damage value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const damageAmount = effect.value;

  // First, deal damage to self
  newState = dealDamage(newState, currentPlayer, 'hero', damageAmount);

  // Then apply buff effect if specified (re-fetch playerState after dealDamage deep copy)
  if (effect.buffAttack || effect.buffHealth || effect.grantKeywords) {
    const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
    // Apply buff to all friendly minions
    for (const minion of playerState.battlefield) {
      if (effect.buffAttack) {
        minion.currentAttack = (minion.currentAttack || getAttack(minion.card)) + effect.buffAttack;
      }
      
      if (effect.buffHealth) {
        minion.currentHealth = (minion.currentHealth || getHealth(minion.card)) + effect.buffHealth;
      }
      
      if (effect.grantKeywords && effect.grantKeywords.length > 0) {
        for (const keyword of effect.grantKeywords) {
          addKeyword(minion, keyword);
        }
      }
    }
  }
  
  return newState;
}

/**
 * Execute sacrifice spell effect - destroys a friendly minion
 */
function executeSacrificeSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Sacrifice spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Find and destroy the target minion from friendly battlefield
  let sacrificedMinion: CardInstance | null = null;
  const minionIdx = playerState.battlefield.findIndex(m => m.instanceId === targetId);
  
  if (minionIdx !== -1) {
    sacrificedMinion = playerState.battlefield[minionIdx];
    playerState.battlefield.splice(minionIdx, 1);
    playerState.graveyard = [...(playerState.graveyard || []), sacrificedMinion];
  } else {
    debug.error('Target minion not found in friendly battlefield');
    return state;
  }
  
  return newState;
}

/**
 * Execute sacrifice_and_aoe_damage spell effect - sacrifices a minion to deal AoE damage
 */
function executeSacrificeAndAoEDamageSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Sacrifice and AoE damage spell requires a target');
    return state;
  }
  
  if (!effect.value && !effect.damageBasedOnSacrifice) {
    debug.error('Sacrifice and AoE damage spell missing damage value or flag');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Find the target minion
  let sacrificedMinion: CardInstance | null = null;
  const minionIdx = playerState.battlefield.findIndex(m => m.instanceId === targetId);
  
  if (minionIdx === -1) {
    debug.error('Target minion not found in friendly battlefield');
    return state;
  }
  
  sacrificedMinion = playerState.battlefield[minionIdx];
  
  // Determine damage amount
  let damageAmount = effect.value || 0;
  
  if (effect.damageBasedOnSacrifice) {
    if (effect.damageBasedOnSacrifice === 'attack') {
      damageAmount = sacrificedMinion.currentAttack || getAttack(sacrificedMinion.card);
    } else if (effect.damageBasedOnSacrifice === 'health') {
      damageAmount = sacrificedMinion.currentHealth || getHealth(sacrificedMinion.card);
    } else if (effect.damageBasedOnSacrifice === 'total_stats') {
      damageAmount = (sacrificedMinion.currentAttack || getAttack(sacrificedMinion.card)) + (sacrificedMinion.currentHealth || getHealth(sacrificedMinion.card));
    }
  }
  
  
  // Remove minion from battlefield and add to graveyard
  playerState.battlefield.splice(minionIdx, 1);
  playerState.graveyard = [...(playerState.graveyard || []), sacrificedMinion];
  
  // Apply AoE damage to enemy minions
  const aoeEffect: SpellEffect = {
    type: 'aoe_damage',
    value: damageAmount,
    targetType: 'all_enemy_minions'
  };
  
  return executeAoEDamageSpell(newState, aoeEffect);
}

/**
 * Execute return_to_hand_next_turn spell effect - sets up a minion to return to hand next turn
 */
function executeReturnToHandNextTurnSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Return to hand next turn spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Find the target minion
  let targetFound = false;
  
  // Check player's battlefield
  for (const minion of player.battlefield) {
    if (minion.instanceId === targetId) {
      targetFound = true;
      // Mark the minion as returning next turn (using type assertion)
      (minion as any).returnsToHandNextTurn = true;
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's
  if (!targetFound) {
    for (const minion of opponent.battlefield) {
      if (minion.instanceId === targetId) {
        targetFound = true;
        // Mark the minion as returning next turn (using type assertion)
        (minion as any).returnsToHandNextTurn = true;
        break;
      }
    }
  }
  
  if (!targetFound) {
    debug.error('Target minion not found for return to hand next turn spell');
    return state;
  }
  
  return newState;
}

/**
 * Execute transform_random spell effect - transforms a random minion
 */
function executeTransformRandomSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  // Get the opponent's battlefield (we transform one of their minions)
  const opponentState = currentPlayer === 'player' ? newState.players.opponent : newState.players.player;
  
  if (opponentState.battlefield.length === 0) {
    return newState;
  }
  
  // Pick a random minion to transform
  const randomIdx = Math.floor(Math.random() * opponentState.battlefield.length);
  const targetMinion = opponentState.battlefield[randomIdx];
  
  // Create a default sheep transformation
  const transformedCard: CardData = {
    id: 9999,
    name: "Sheep",
    type: 'minion',
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "This minion was transformed into a sheep.",
    rarity: 'common',
    keywords: []
  };
  
  // Apply transform
  const transformedInstance: CardInstance = {
    instanceId: targetMinion.instanceId,
    card: transformedCard,
    currentHealth: 1,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: true,
    attacksPerformed: 0
  };
  
  opponentState.battlefield[randomIdx] = transformedInstance;
  
  return newState;
}

/**
 * Execute transform_copy spell effect - transforms a minion into a copy of another minion
 */
function executeTransformCopySpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId || !effect.transformTargetId) {
    debug.error('Transform copy spell requires both target ID and transform target ID');
    return state;
  }
  
  let newState = { ...state };
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  
  // Find the minion to copy from (the source)
  let sourceMinion: CardInstance | null = null;
  for (const minion of player.battlefield.concat(opponent.battlefield)) {
    if (minion.instanceId === effect.transformTargetId) {
      sourceMinion = minion;
      break;
    }
  }
  
  if (!sourceMinion) {
    debug.error(`Source minion ${effect.transformTargetId} not found`);
    return state;
  }
  
  // Find the target minion to be transformed
  let targetFound = false;
  
  // Check player's battlefield
  const playerBattlefield = [...player.battlefield];
  for (let i = 0; i < playerBattlefield.length; i++) {
    if (playerBattlefield[i].instanceId === targetId) {
      targetFound = true;
      const target = playerBattlefield[i];
      
      // Transform into a copy
      target.card = { ...sourceMinion.card };
      target.currentHealth = getHealth(sourceMinion.card) || 1;
      target.canAttack = false;
      target.isSummoningSick = true;
      
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's
  if (!targetFound) {
    const opponentBattlefield = [...opponent.battlefield];
    for (let i = 0; i < opponentBattlefield.length; i++) {
      if (opponentBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = opponentBattlefield[i];
        
        // Transform into a copy
        target.card = { ...sourceMinion.card };
        target.currentHealth = getHealth(sourceMinion.card) || 1;
        target.canAttack = false;
        target.isSummoningSick = true;
        
        break;
      }
    }
    
    newState.players.opponent.battlefield = opponentBattlefield;
  }
  
  newState.players.player.battlefield = playerBattlefield;
  
  return newState;
}

/**
 * Execute transform_random_in_hand spell effect - transforms a random card in hand
 */
function executeTransformRandomInHandSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  if (playerState.hand.length === 0) {
    return newState;
  }
  
  // Pick a random card from hand
  const randomIdx = Math.floor(Math.random() * playerState.hand.length);
  const cardToTransform = playerState.hand[randomIdx];
  
  // Create a transformation card - use type assertion for discriminated union
  const transformCard = {
    id: 9998,
    name: "Transformed Card",
    type: 'minion' as const,
    manaCost: effect.transformManaCost || 1,
    attack: effect.transformAttack || 1,
    health: effect.transformHealth || 1,
    description: "This card was transformed.",
    rarity: 'common' as const,
    keywords: []
  } satisfies CardData;
  
  // Replace the card
  cardToTransform.card = transformCard;
  
  return newState;
}

/**
 * Execute transform_and_silence spell effect - transforms and silences a minion
 */
function executeTransformAndSilenceSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Transform and silence spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  
  // First transform the minion
  const transformedCard: CardData = {
    id: 9999,
    name: "Sheep",
    type: 'minion',
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "This minion was transformed and silenced.",
    rarity: 'common',
    keywords: []
  };
  
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  let targetFound = false;
  
  // Check player's battlefield
  const playerBattlefield = [...player.battlefield];
  for (let i = 0; i < playerBattlefield.length; i++) {
    if (playerBattlefield[i].instanceId === targetId) {
      targetFound = true;
      const target = playerBattlefield[i];
      
      // Transform
      target.card = transformedCard;
      target.currentHealth = 1;
      target.canAttack = false;
      target.isSummoningSick = true;
      
      // Silence
      target.silenced = true;
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's
  if (!targetFound) {
    const opponentBattlefield = [...opponent.battlefield];
    for (let i = 0; i < opponentBattlefield.length; i++) {
      if (opponentBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = opponentBattlefield[i];
        
        // Transform
        target.card = transformedCard;
        target.currentHealth = 1;
        target.canAttack = false;
        target.isSummoningSick = true;
        
        // Silence
        target.silenced = true;
        break;
      }
    }
    
    newState.players.opponent.battlefield = opponentBattlefield;
  }
  
  newState.players.player.battlefield = playerBattlefield;
  
  return newState;
}

/**
 * Execute transform_deck spell effect - transforms cards in the deck
 */
function executeTransformDeckSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  if (playerState.deck.length === 0) {
    return newState;
  }
  
  // Transform cards in deck based on effect parameters
  const cardsToTransform = Math.min(effect.count || playerState.deck.length, playerState.deck.length);
  
  for (let i = 0; i < cardsToTransform && i < playerState.deck.length; i++) {
    const deckEntry = playerState.deck[i] as any;
    const deckCard = deckEntry.card ? deckEntry.card : deckEntry;
    
    // Create transformed card (using type assertion for minion properties)
    const transformedCard: CardData = {
      ...deckCard,
      id: 9997 + i,
      name: `${deckCard.name} (Transformed)`
    } as CardData;
    
    // Set attack/health if this is a minion card
    if (isMinion(transformedCard)) {
      (transformedCard as any).attack = effect.transformAttack || getAttack(deckCard) || 1;
      (transformedCard as any).health = effect.transformHealth || getHealth(deckCard) || 1;
    }
    
    if (deckEntry.card) {
      deckEntry.card = transformedCard;
    } else {
      playerState.deck[i] = transformedCard as any;
    }
  }
  
  
  return newState;
}

/**
 * Execute transform_copy_from_deck spell effect - transforms a minion into a copy from deck
 */
function executeTransformCopyFromDeckSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Transform copy from deck spell requires a target');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Get a random card from deck
  if (playerState.deck.length === 0) {
    return newState;
  }
  
  const randomDeckCardIdx = Math.floor(Math.random() * playerState.deck.length);
  const deckEntry = playerState.deck[randomDeckCardIdx] as any;
  const deckCardData = deckEntry.card ? deckEntry.card : deckEntry;
  
  // Find and transform the target minion
  const player = newState.players.player;
  const opponent = newState.players.opponent;
  let targetFound = false;
  
  // Check player's battlefield
  const playerBattlefield = [...player.battlefield];
  for (let i = 0; i < playerBattlefield.length; i++) {
    if (playerBattlefield[i].instanceId === targetId) {
      targetFound = true;
      const target = playerBattlefield[i];
      
      // Transform into copy of deck card
      target.card = { ...deckCardData };
      target.currentHealth = getHealth(deckCardData) || 1;
      target.canAttack = false;
      target.isSummoningSick = true;
      
      break;
    }
  }
  
  // If not found on player's battlefield, check opponent's
  if (!targetFound) {
    const opponentBattlefield = [...opponent.battlefield];
    for (let i = 0; i < opponentBattlefield.length; i++) {
      if (opponentBattlefield[i].instanceId === targetId) {
        targetFound = true;
        const target = opponentBattlefield[i];
        
        // Transform into copy of deck card
        target.card = { ...deckCardData };
        target.currentHealth = getHealth(deckCardData) || 1;
        target.canAttack = false;
        target.isSummoningSick = true;
        
        break;
      }
    }
    
    newState.players.opponent.battlefield = opponentBattlefield;
  }
  
  newState.players.player.battlefield = playerBattlefield;
  
  return newState;
}

/**
 * Execute transform_healing_to_damage spell effect - switches healing to damage (Auchenai-like)
 */
function executeTransformHealingToDamageSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Set flag to convert healing to damage (using type assertion)
  (playerState as any).healingToDamage = true;
  
  // Set duration if provided (using type assertion)
  if (effect.duration) {
    (playerState as any).healingToDamageTurns = effect.duration;
  } else {
    // Default to rest of game if no duration specified
    (playerState as any).healingToDamageTurns = 100;
  }
  
  
  return newState;
}

/**
 * Execute split_damage spell effect - splits damage among targets
 */
function executeSplitDamageSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Split damage spell missing damage value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const enemyState = currentPlayer === 'player' ? newState.players.opponent : newState.players.player;
  const totalTargets = enemyState.battlefield.length;
  
  if (totalTargets === 0) {
    return newState;
  }
  
  // Calculate damage per minion
  const damagePerTarget = Math.floor(effect.value / totalTargets);
  const remainingDamage = effect.value % totalTargets;
  
  
  // Apply damage to each minion
  for (let i = 0; i < enemyState.battlefield.length; i++) {
    const minion = enemyState.battlefield[i];
    
    // Apply base damage
    let damage = damagePerTarget;
    // Distribute remaining damage starting from first minion
    if (i < remainingDamage) {
      damage += 1;
    }
    
    if (minion.currentHealth !== undefined) {
      // Check for Divine Shield
      if (minion.hasDivineShield) {
        minion.hasDivineShield = false;
      } else {
        minion.currentHealth -= damage;
      }
    }
  }
  
  // Remove dead minions properly through destroyCard flow for deathrattle triggers
  newState = removeDeadMinions(newState);
  
  return newState;
}

/**
 * Execute swap_decks spell effect - swaps decks with opponent
 */
function executeSwapDecksSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  
  // Swap the decks
  const tempDeck = newState.players.player.deck;
  newState.players.player.deck = newState.players.opponent.deck;
  newState.players.opponent.deck = tempDeck;
  
  
  return newState;
}

/**
 * Execute swap_hero_power spell effect - swaps hero powers with opponent
 */
function executeSwapHeroPowerSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  
  // Swap the hero powers
  const tempHeroPower = newState.players.player.heroPower;
  newState.players.player.heroPower = newState.players.opponent.heroPower;
  newState.players.opponent.heroPower = tempHeroPower;
  
  // Reset hero power usage for current turn if applicable (using type assertion)
  if (effect.resetUsage) {
    (newState.players.player as any).heroPowerUsed = false;
    (newState.players.opponent as any).heroPowerUsed = false;
  }
  
  
  return newState;
}

/**
 * Execute reduce_deck_cost spell effect - reduce mana cost of cards in deck
 */
function executeReduceDeckCostSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Reduce deck cost spell missing cost reduction value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  const costReduction = effect.value;
  const cardsToReduce = effect.count || playerState.deck.length;
  
  // Apply cost reduction to cards in deck
  for (let i = 0; i < Math.min(cardsToReduce, playerState.deck.length); i++) {
    const deckEntry = playerState.deck[i] as any;
    const deckCardData = deckEntry.card ? deckEntry.card : deckEntry;
    deckCardData.manaCost = Math.max(0, (deckCardData.manaCost || 0) - costReduction);
  }
  
  
  return newState;
}

/**
 * Execute reduce_next_spell_cost spell effect - make next spell cast cheaper
 */
function executeReduceNextSpellCostSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Reduce next spell cost spell missing cost reduction value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Store the cost reduction for next spell (using type assertion)
  (playerState as any).nextSpellCostReduction = ((playerState as any).nextSpellCostReduction || 0) + effect.value;
  (playerState as any).nextSpellCostReductionCount = ((playerState as any).nextSpellCostReductionCount || 1);
  
  
  return newState;
}

/**
 * Execute reduce_opponent_mana spell effect - reduce opponent's current mana
 */
function executeReduceOpponentManaSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Reduce opponent mana spell missing mana reduction value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const opponentState = currentPlayer === 'player' ? newState.players.opponent : newState.players.player;
  
  const manaReduction = effect.value;
  opponentState.mana.current = Math.max(0, opponentState.mana.current - manaReduction);
  
  
  return newState;
}

/**
 * Execute reduce_spell_cost spell effect - reduce spell costs
 */
function executeReduceSpellCostSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Reduce spell cost spell missing cost reduction value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  const costReduction = effect.value;
  
  // Apply cost reduction to all spells in hand
  for (const handCard of playerState.hand) {
    if (handCard.card.type === 'spell') {
      handCard.card.manaCost = Math.max(0, (handCard.card.manaCost || 0) - costReduction);
    }
  }
  
  
  return newState;
}

/**
 * Execute replace_hero_power spell effect - replace current hero power
 */
function executeReplaceHeroPowerSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.heroPowerId && !effect.heroPower) {
    debug.error('Replace hero power spell missing hero power data');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Get the new hero power from the effect or from card data
  const newHeroPower = effect.heroPower || { 
    id: effect.heroPowerId || 0,
    name: 'New Power',
    description: 'Replacement hero power',
    cost: effect.heroPowerCost || 2,
    effect: effect.heroPowerEffect
  };
  
  playerState.heroPower = newHeroPower;
  (playerState as any).heroPowerUsed = false;
  
  
  return newState;
}

/**
 * Execute replay_battlecries spell effect - replay battlecry effects of minions
 */
function executeReplayBattlecriesSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Find minions with battlecry effects on battlefield
  const minionsWithBattlecry = playerState.battlefield.filter(minion =>
    hasKeyword(minion, 'battlecry')
  );
  
  
  // Re-trigger battlecry for each minion on the battlefield
  for (const minion of minionsWithBattlecry) {
    // Check if card has battlecry effect (using type assertion for MinionCardData)
    const minionCard = minion.card as any;
    if (minionCard.battlecryEffect) {
      // Actual battlecry execution would be handled by executeBattlecry function
      newState = executeBattlecry(newState, minionCard.battlecryEffect, minion.instanceId);
    }
  }
  
  return newState;
}

/**
 * Execute replay_spells spell effect - replay spells cast this game
 */
function executeReplaySpellsSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  
  const spellCount = effect.count || 1;
  const currentPlayer = state.currentTurn || 'player';

  // Gather spells cast this game from the game log
  const castSpells = (newState.gameLog || [])
    .filter((entry: any) => entry.type === 'spell' && entry.player === currentPlayer && entry.cardId)
    .map((entry: any) => getCardById(Number(entry.cardId)))
    .filter((c: any): c is CardData => c != null && c.type === 'spell');

  // Pick random spells to replay (up to spellCount)
  const shuffled = shuffleArray(castSpells);
  const toReplay = shuffled.slice(0, Math.min(spellCount, shuffled.length));

  for (const spell of toReplay) {
    if ((spell as any).spellEffect) {
      const fakeInstance = { instanceId: uuidv4(), card: spell, currentHealth: 0, canAttack: false, isPlayed: true, isSummoningSick: false, attacksPerformed: 0 } as CardInstance;
      newState = executeSpell(newState, fakeInstance);
    }
  }

  return newState;
}

/**
 * Execute random_damage_and_buff spell effect - deal random damage and gain buff
 */
function executeRandomDamageAndBuffSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Random damage and buff spell missing damage value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  const enemyState = currentPlayer === 'player' ? newState.players.opponent : newState.players.player;
  
  // Deal random damage to a random enemy minion
  if (enemyState.battlefield.length > 0) {
    const randomTarget = enemyState.battlefield[Math.floor(Math.random() * enemyState.battlefield.length)];
    const damage = effect.value;
    
    if (randomTarget.currentHealth !== undefined) {
      randomTarget.currentHealth -= damage;
      
      if (randomTarget.currentHealth <= 0) {
        const survivors = enemyState.battlefield.filter(m => m.instanceId !== randomTarget.instanceId);
        enemyState.battlefield = survivors;
      }
    }
  }
  
  // Apply buff to current player's minions
  if (effect.buffAttack || effect.buffHealth) {
    for (const minion of playerState.battlefield) {
      if (effect.buffAttack) {
        minion.currentAttack = (minion.currentAttack || getAttack(minion.card)) + effect.buffAttack;
      }
      if (effect.buffHealth && minion.currentHealth !== undefined) {
        minion.currentHealth += effect.buffHealth;
      }
    }
  }
  
  return newState;
}

/**
 * Execute random_damage_with_self_damage spell effect - deal damage with self harm
 */
function executeRandomDamageWithSelfDamageSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  if (!effect.value) {
    debug.error('Random damage with self damage spell missing damage value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = (state.currentTurn || 'player') as 'player' | 'opponent';
  const enemyType: 'player' | 'opponent' = currentPlayer === 'player' ? 'opponent' : 'player';

  const damage = effect.value;

  // Deal random damage to a random enemy minion
  const enemyBattlefield = newState.players[enemyType].battlefield;
  if (enemyBattlefield.length > 0) {
    const randomTarget = enemyBattlefield[Math.floor(Math.random() * enemyBattlefield.length)];

    if (randomTarget.currentHealth !== undefined) {
      randomTarget.currentHealth -= damage;

      if (randomTarget.currentHealth <= 0) {
        newState.players[enemyType].battlefield = enemyBattlefield.filter(m => m.instanceId !== randomTarget.instanceId);
      }
    }
  } else {
    // Damage enemy hero if no minions — goes through armor
    newState = dealDamage(newState, enemyType, 'hero', damage, undefined, undefined, currentPlayer);
  }

  // Deal self damage — goes through armor
  const selfDamage = effect.selfDamage || damage;
  newState = dealDamage(newState, currentPlayer, 'hero', selfDamage, undefined, undefined, enemyType);

  return newState;
}

/**
 * Execute random_weapon spell effect - equip a random weapon
 */
function executeRandomWeaponSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Create a random weapon
  const weaponAttack = effect.attack || Math.floor(Math.random() * 5) + 1; // 1-5 attack
  const weaponDurability = effect.durability || Math.floor(Math.random() * 3) + 1; // 1-3 durability
  
  const weaponCardData: CardData = {
    id: Math.floor(Math.random() * 10000),
    name: `Random ${['Battle', 'War', 'Steel', 'Frost', 'Fire'][Math.floor(Math.random() * 5)]} Axe`,
    type: 'weapon',
    manaCost: 2,
    attack: weaponAttack,
    durability: weaponDurability,
    rarity: 'common',
    description: 'A random weapon'
  } as CardData;
  
  playerState.weapon = {
    instanceId: uuidv4(),
    card: weaponCardData,
    currentDurability: weaponDurability,
    currentAttack: weaponAttack
  };
  
  
  return newState;
}

/**
 * Execute shuffle_copies spell effect - shuffle copies of a card into deck
 */
function executeShuffleCopiesSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!effect.count) {
    debug.error('Shuffle copies spell missing count value');
    return state;
  }
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // If targetId is provided, find that card and shuffle copies
  if (targetId) {
    // Search for the card in hand
    const targetCardInHand = playerState.hand.find(c => c.instanceId === targetId);
    const targetCardInDeck = (playerState.deck as any[]).find(c => c.instanceId === targetId);
    const targetCard = targetCardInHand || targetCardInDeck;
    
    if (targetCard) {
      // Shuffle copies into deck
      for (let i = 0; i < effect.count; i++) {
        const cardCopy = {
          ...targetCard,
          instanceId: uuidv4(),
          isPlayed: false
        } as CardInstance;
        (playerState.deck as any[]).push(cardCopy);
      }
    } else {
    }
  } else {
  }
  
  return newState;
}

/**
 * Execute shuffle_cards spell effect - shuffle specific cards into deck
 */
function executeShuffleCardsSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Shuffle cards into the player's deck based on effect.cardIds or effect.cardType
  
  if (effect.cardIds) {
    // Shuffle specific cards by ID
    for (const cardId of effect.cardIds) {
      const foundCard = getCardById(cardId as number);
      if (foundCard) {
        const cardInstance = {
          card: foundCard,
          instanceId: uuidv4(),
          attacksPerformed: 0,
          canAttack: false,
          currentHealth: getHealth(foundCard) || 0,
          isSummoningSick: true
        } as CardInstance;
        (playerState.deck as any[]).push(cardInstance);
      }
    }
  } else if (effect.cardType) {
    // Shuffle random cards of a type
    const count = effect.count || 1;
    const cardsOfType = allCards.filter(c => c.type === effect.cardType);
    
    for (let i = 0; i < count && cardsOfType.length > 0; i++) {
      const randomCard = cardsOfType[Math.floor(Math.random() * cardsOfType.length)];
      const cardInstance = {
        card: randomCard,
        instanceId: uuidv4(),
        attacksPerformed: 0,
        canAttack: false,
        currentHealth: getHealth(randomCard) || 0,
        isSummoningSick: true
      } as CardInstance;
      (playerState.deck as any[]).push(cardInstance);
    }
  } else {
  }
  
  return newState;
}
/**
 * Execute mind control random spell - take control of a random enemy minion
 */
function executeMindControlRandomSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  const opponentState = currentPlayer === 'player' ? newState.players.opponent : newState.players.player;
  
  if (opponentState.battlefield.length === 0) {
    return newState;
  }
  
  if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return newState;
  }
  
  const randomIndex = Math.floor(Math.random() * opponentState.battlefield.length);
  const stolenMinion = opponentState.battlefield[randomIndex];
  
  opponentState.battlefield = [...opponentState.battlefield.slice(0, randomIndex), ...opponentState.battlefield.slice(randomIndex + 1)];
  playerState.battlefield = [...playerState.battlefield, { ...stolenMinion, canAttack: false, isSummoningSick: true }];
  
  return newState;
}

/**
 * Execute gain mana crystals spell - gain permanent mana crystals
 */
function executeGainManaCrystalsSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  const crystals = effect.value || 1;
  playerState.mana.max = Math.min(10, playerState.mana.max + crystals);
  playerState.mana.current = Math.min(playerState.mana.max, playerState.mana.current + crystals);
  
  return newState;
}

/**
 * Execute buff attack spell - buff only attack of a minion (supports both friendly and enemy targets)
 */
function executeBuffAttackSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Buff attack spell requires a target');
    return state;
  }
  
  const newState = { ...state };
  const buffAmount = effect.value || 0;
  
  // Check player battlefield first
  const playerTargetIndex = newState.players.player.battlefield.findIndex(m => m.instanceId === targetId);
  if (playerTargetIndex !== -1) {
    newState.players = {
      ...newState.players,
      player: {
        ...newState.players.player,
        battlefield: newState.players.player.battlefield.map((m, i) => 
          i === playerTargetIndex 
            ? { ...m, currentAttack: (m.currentAttack || getAttack(m.card)) + buffAmount }
            : m
        )
      }
    };
    return newState;
  }
  
  // Check opponent battlefield
  const opponentTargetIndex = newState.players.opponent.battlefield.findIndex(m => m.instanceId === targetId);
  if (opponentTargetIndex !== -1) {
    newState.players = {
      ...newState.players,
      opponent: {
        ...newState.players.opponent,
        battlefield: newState.players.opponent.battlefield.map((m, i) => 
          i === opponentTargetIndex 
            ? { ...m, currentAttack: (m.currentAttack || getAttack(m.card)) + buffAmount }
            : m
        )
      }
    };
    return newState;
  }
  
  return newState;
}

/**
 * Execute summon from hand spell - summon a minion from hand to battlefield
 */
function executeSummonFromHandSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return newState;
  }
  
  const minionsInHand = playerState.hand.filter(c => c.card.type === 'minion');
  if (minionsInHand.length === 0) {
    return newState;
  }
  
  const randomMinion = minionsInHand[Math.floor(Math.random() * minionsInHand.length)];
  playerState.hand = playerState.hand.filter(c => c.instanceId !== randomMinion.instanceId);
  playerState.battlefield = [...playerState.battlefield, { ...randomMinion, canAttack: false, isSummoningSick: true }];
  
  return newState;
}

/**
 * Execute buff tribe spell - buff all minions of a specific tribe
 */
function executeBuffTribeSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  const tribe = effect.tribe || effect.race;
  if (!tribe) {
    return newState;
  }
  
  playerState.battlefield = playerState.battlefield.map(minion => {
    const minionCard = minion.card as any;
    if ((minionCard.race || '').toLowerCase() === tribe.toLowerCase() || (minionCard.tribe || '').toLowerCase() === tribe.toLowerCase()) {
      return {
        ...minion,
        currentAttack: (minion.currentAttack || getAttack(minion.card)) + (effect.attack || effect.value || 0),
        currentHealth: (minion.currentHealth || getHealth(minion.card)) + (effect.health || 0)
      };
    }
    return minion;
  });
  
  return newState;
}

/**
 * Execute buff self spell - buff the minion that cast this effect (immutable)
 */
function executeBuffSelfSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) return state;
  
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const attackBuff = effect.attack || effect.value || 0;
  const healthBuff = effect.health || 0;
  
  if (currentPlayer === 'player') {
    const targetIndex = newState.players.player.battlefield.findIndex(m => m.instanceId === targetId);
    if (targetIndex !== -1) {
      newState.players = {
        ...newState.players,
        player: {
          ...newState.players.player,
          battlefield: newState.players.player.battlefield.map((m, i) =>
            i === targetIndex
              ? {
                  ...m,
                  currentAttack: (m.currentAttack || getAttack(m.card)) + attackBuff,
                  currentHealth: (m.currentHealth || getHealth(m.card)) + healthBuff
                }
              : m
          )
        }
      };
    }
  } else {
    const targetIndex = newState.players.opponent.battlefield.findIndex(m => m.instanceId === targetId);
    if (targetIndex !== -1) {
      newState.players = {
        ...newState.players,
        opponent: {
          ...newState.players.opponent,
          battlefield: newState.players.opponent.battlefield.map((m, i) =>
            i === targetIndex
              ? {
                  ...m,
                  currentAttack: (m.currentAttack || getAttack(m.card)) + attackBuff,
                  currentHealth: (m.currentHealth || getHealth(m.card)) + healthBuff
                }
              : m
          )
        }
      };
    }
  }
  
  return newState;
}

/**
 * Execute conditional self buff spell
 */
function executeConditionalSelfBuffSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  return executeBuffSelfSpell(state, effect, targetId);
}

/**
 * Execute steal card spell - steal a card from opponent's hand
 */
function executeStealCardSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  const opponentState = currentPlayer === 'player' ? newState.players.opponent : newState.players.player;
  
  if (opponentState.hand.length === 0) {
    return newState;
  }
  
  if (playerState.hand.length >= MAX_HAND_SIZE) {
    return newState;
  }

  const randomIndex = Math.floor(Math.random() * opponentState.hand.length);
  const stolenCard = opponentState.hand[randomIndex];
  
  opponentState.hand = [...opponentState.hand.slice(0, randomIndex), ...opponentState.hand.slice(randomIndex + 1)];
  playerState.hand = [...playerState.hand, stolenCard];
  
  return newState;
}

/**
 * Execute buff damaged minions spell
 */
function executeBuffDamagedMinionsSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  playerState.battlefield = playerState.battlefield.map(minion => {
    const baseHealth = getHealth(minion.card);
    if ((minion.currentHealth || baseHealth) < baseHealth) {
      return {
        ...minion,
        currentAttack: (minion.currentAttack || getAttack(minion.card)) + (effect.attack || effect.value || 0),
        currentHealth: (minion.currentHealth || baseHealth) + (effect.health || 0)
      };
    }
    return minion;
  });
  
  return newState;
}

/**
 * Execute AoE heal spell - heal all friendly minions
 */
function executeAoEHealSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  const healAmount = effect.value || 0;
  
  playerState.battlefield = playerState.battlefield.map(minion => ({
    ...minion,
    currentHealth: Math.min(getHealth(minion.card), (minion.currentHealth || getHealth(minion.card)) + healAmount)
  }));
  
  return newState;
}

/**
 * Execute gain armor spell
 */
function executeGainArmorSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  const armorAmount = effect.value || 0;
  playerState.heroArmor = Math.min(30, (playerState.heroArmor || 0) + armorAmount);

  return newState;
}

function executeArmorBasedOnMissingHealthSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;

  const maxHp = playerState.maxHealth;
  const currentHealth = playerState.heroHealth ?? playerState.health ?? maxHp;
  const missingHealth = Math.max(0, maxHp - currentHealth);

  playerState.heroArmor = Math.min(30, (playerState.heroArmor || 0) + missingHealth);

  const drawPerArmor = (effect as any).drawPerArmorGained || 0;
  if (drawPerArmor > 0 && missingHealth > 0) {
    const cardsToDraw = Math.floor(missingHealth / drawPerArmor);
    for (let i = 0; i < cardsToDraw; i++) {
      newState = drawCard(newState);
    }
  }

  return newState;
}

/**
 * Execute gain armor and immunity spell - gain armor and grant immunity
 */
function executeGainArmorAndImmunitySpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  // Clone player state to avoid mutation (using spread with type assertion for isImmune)
  if (currentPlayer === 'player') {
    const updatedPlayer = {
      ...newState.players.player,
      heroArmor: (newState.players.player.heroArmor || 0) + (effect.value || 0)
    };
    (updatedPlayer as any).isImmune = true;
    newState.players = { ...newState.players, player: updatedPlayer };
  } else {
    const updatedOpponent = {
      ...newState.players.opponent,
      heroArmor: (newState.players.opponent.heroArmor || 0) + (effect.value || 0)
    };
    (updatedOpponent as any).isImmune = true;
    newState.players = { ...newState.players, opponent: updatedOpponent };
  }
  
  return newState;
}

/**
 * Execute gain armor and lifesteal spell - gain armor and grant lifesteal to hero
 */
function executeGainArmorAndLifestealSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  // Clone player state to avoid mutation (using type assertion for hasLifesteal)
  if (currentPlayer === 'player') {
    const updatedPlayer = {
      ...newState.players.player,
      heroArmor: (newState.players.player.heroArmor || 0) + (effect.value || 0)
    };
    (updatedPlayer as any).hasLifesteal = true;
    newState.players = { ...newState.players, player: updatedPlayer };
  } else {
    const updatedOpponent = {
      ...newState.players.opponent,
      heroArmor: (newState.players.opponent.heroArmor || 0) + (effect.value || 0)
    };
    (updatedOpponent as any).hasLifesteal = true;
    newState.players = { ...newState.players, opponent: updatedOpponent };
  }
  
  return newState;
}

/**
 * Execute resurrect spell - resurrect a random friendly minion that died this game
 */
function executeResurrectSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  // Get graveyard (dead minions)
  const graveyard = playerState.graveyard || [];
  if (graveyard.length === 0) {
    debug.log('[executeResurrectSpell] No minions in graveyard');
    return newState;
  }
  
  // Check board space (reuse playerState, don't redeclare)
  if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    debug.log('[executeResurrectSpell] Board is full');
    return newState;
  }
  
  // Pick a random dead minion
  const randomIndex = Math.floor(Math.random() * graveyard.length);
  const minionToResurrect = graveyard[randomIndex];
  
  // Create a fresh copy with full health
  const resurrectedMinion: CardInstance = {
    instanceId: uuidv4(),
    card: { ...minionToResurrect.card },
    currentHealth: getHealth(minionToResurrect.card),
    currentAttack: getAttack(minionToResurrect.card),
    canAttack: false,
    isSummoningSick: true,
    attacksPerformed: 0
  };
  
  // Add to battlefield
  playerState.battlefield.push(resurrectedMinion);
  
  logActivity('minion_summoned', currentPlayer, `${minionToResurrect.card.name} resurrected`);
  
  return newState;
}

/**
 * Execute summon multiple spell - summon multiple specific minions
 */
function executeSummonMultipleSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const minionIds = effect.minionIds || effect.cardIds || [];
  const count = effect.count || minionIds.length || 1;
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  for (let i = 0; i < count && i < minionIds.length; i++) {
    if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
    
    const minionId = minionIds[i];
    const cardData = getCardById(minionId as number);
    
    if (cardData && cardData.type === 'minion') {
      const newMinion: CardInstance = {
        instanceId: uuidv4(),
        card: { ...cardData },
        currentHealth: getHealth(cardData),
        currentAttack: getAttack(cardData),
        canAttack: false,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      
      playerState.battlefield.push(newMinion);
    }
  }
  
  return newState;
}

/**
 * Execute swap stats spell - swap a minion's attack and health
 */
function executeSwapStatsSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) return state;
  
  const newState = { ...state };
  
  // Find target on either battlefield
  newState.players.player.battlefield = newState.players.player.battlefield.map((minion: CardInstance) => {
    if (minion.instanceId === targetId) {
      const newAttack = minion.currentHealth || 0;
      const newHealth = minion.currentAttack || getAttack(minion.card);
      return {
        ...minion,
        currentAttack: newAttack,
        currentHealth: newHealth
      };
    }
    return minion;
  });
  
  newState.players.opponent.battlefield = newState.players.opponent.battlefield.map((minion: CardInstance) => {
    if (minion.instanceId === targetId) {
      const newAttack = minion.currentHealth || 0;
      const newHealth = minion.currentAttack || getAttack(minion.card);
      return {
        ...minion,
        currentAttack: newAttack,
        currentHealth: newHealth
      };
    }
    return minion;
  });
  
  return newState;
}

/**
 * Execute copy card spell - copy a card to hand
 */
function executeCopyCardSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  // Find target minion on either battlefield
  const allMinions = [...newState.players.player.battlefield, ...newState.players.opponent.battlefield];
  const targetMinion = allMinions.find((m: CardInstance) => m.instanceId === targetId);
  
  if (!targetMinion) return newState;
  
  // Create copy of the card
  const copiedCard: CardInstance = {
    instanceId: uuidv4(),
    card: { ...targetMinion.card },
    currentHealth: getHealth(targetMinion.card),
    currentAttack: getAttack(targetMinion.card),
    canAttack: false,
    isSummoningSick: true,
    attacksPerformed: 0
  };
  
  // Add to hand
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  if (playerState.hand.length < MAX_HAND_SIZE) {
    playerState.hand.push(copiedCard);
  }
  
  return newState;
}

/**
 * Execute give cards spell - add specific cards to hand
 */
function executeGiveCardsSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const cardIds = effect.cardIds || [];
  
  // Early exit if no cardIds specified
  if (cardIds.length === 0) {
    debug.log('[executeGiveCardsSpell] No cardIds specified');
    return state;
  }
  
  const count = effect.count || cardIds.length;
  
  for (let i = 0; i < count; i++) {
    const hand = currentPlayer === 'player' ? newState.players.player.hand : newState.players.opponent.hand;
    if (hand.length >= MAX_HAND_SIZE) break;

    const cardId = cardIds[i % cardIds.length];
    const cardData = getCardById(cardId as number);
    
    if (cardData) {
      const newCard = {
        instanceId: uuidv4(),
        card: { ...cardData },
        currentHealth: getHealth(cardData),
        currentAttack: getAttack(cardData),
        canAttack: false,
        hasAttacked: false,
        buffs: []
      } as CardInstance;
      
      if (currentPlayer === 'player') {
        newState = {
          ...newState,
          players: {
            ...newState.players,
            player: {
              ...newState.players.player,
              hand: [...newState.players.player.hand, newCard]
            }
          }
        };
      } else {
        newState = {
          ...newState,
          players: {
            ...newState.players,
            opponent: {
              ...newState.players.opponent,
              hand: [...newState.players.opponent.hand, newCard]
            }
          }
        };
      }
    }
  }
  
  return newState;
}

/**
 * Execute draw until spell - draw cards until you have X cards
 */
function executeDrawUntilSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const targetHandSize = effect.value || 3;
  
  const hand = currentPlayer === 'player' ? newState.players.player.hand : newState.players.opponent.hand;
  const cardsToDraw = Math.max(0, targetHandSize - hand.length);
  
  for (let i = 0; i < cardsToDraw; i++) {
    newState = drawCard(newState);
  }
  
  return newState;
}

/**
 * Execute destroy tribe spell - destroy all minions of a specific tribe
 */
function executeDestroyTribeSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const tribe = effect.tribe || effect.targetTribe;
  
  if (!tribe) return state;
  
  // Collect minions to destroy (immutably)
  const playerDestroyedMinions = state.players.player.battlefield.filter((minion: CardInstance) => {
    const minionTribe = isMinion(minion.card) ? (minion.card as any).tribe || (minion.card as any).race : undefined;
    return minionTribe === tribe;
  });
  
  const opponentDestroyedMinions = state.players.opponent.battlefield.filter((minion: CardInstance) => {
    const minionTribe = isMinion(minion.card) ? (minion.card as any).tribe || (minion.card as any).race : undefined;
    return minionTribe === tribe;
  });
  
  const playerSurvivingMinions = state.players.player.battlefield.filter((minion: CardInstance) => {
    const minionTribe = isMinion(minion.card) ? (minion.card as any).tribe || (minion.card as any).race : undefined;
    return minionTribe !== tribe;
  });
  
  const opponentSurvivingMinions = state.players.opponent.battlefield.filter((minion: CardInstance) => {
    const minionTribe = isMinion(minion.card) ? (minion.card as any).tribe || (minion.card as any).race : undefined;
    return minionTribe !== tribe;
  });
  
  return {
    ...state,
    players: {
      ...state.players,
      player: {
        ...state.players.player,
        battlefield: playerSurvivingMinions,
        graveyard: [...(state.players.player.graveyard || []), ...playerDestroyedMinions]
      },
      opponent: {
        ...state.players.opponent,
        battlefield: opponentSurvivingMinions,
        graveyard: [...(state.players.opponent.graveyard || []), ...opponentDestroyedMinions]
      }
    }
  };
}

/**
 * Execute destroy all minions spell - destroy all minions on the board
 */
function executeDestroyAllMinionsSpell(
  state: GameState,
  _effect: SpellEffect
): GameState {
  logActivity('damage_dealt' as any, 'player', 'All minions destroyed');
  
  return {
    ...state,
    players: {
      ...state.players,
      player: {
        ...state.players.player,
        battlefield: [],
        graveyard: [...(state.players.player.graveyard || []), ...state.players.player.battlefield]
      },
      opponent: {
        ...state.players.opponent,
        battlefield: [],
        graveyard: [...(state.players.opponent.graveyard || []), ...state.players.opponent.battlefield]
      }
    }
  };
}

/**
 * Execute gain armor and draw spell - gain armor and draw cards
 */
function executeGainArmorAndDrawSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const armorGain = effect.value || effect.armor || 0;
  const cardsToDraw = effect.drawCount || effect.count || 1;
  
  // Gain armor
  if (currentPlayer === 'player') {
    newState.players = {
      ...newState.players,
      player: {
        ...newState.players.player,
        heroArmor: (newState.players.player.heroArmor || 0) + armorGain
      }
    };
  } else {
    newState.players = {
      ...newState.players,
      opponent: {
        ...newState.players.opponent,
        heroArmor: (newState.players.opponent.heroArmor || 0) + armorGain
      }
    };
  }

  // Draw cards
  for (let i = 0; i < cardsToDraw; i++) {
    newState = drawCard(newState);
  }
  
  return newState;
}

/**
 * Execute buff all spell - buff all friendly minions
 */
function executeBuffAllSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const attackBuff = effect.attack || effect.value || 0;
  const healthBuff = effect.health || effect.value || 0;
  
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  
  playerState.battlefield = playerState.battlefield.map((minion: CardInstance) => ({
    ...minion,
    currentAttack: (minion.currentAttack || getAttack(minion.card)) + attackBuff,
    currentHealth: (minion.currentHealth || getHealth(minion.card)) + healthBuff
  }));
  
  return newState;
}

/**
 * Execute draw specific spell - draw a specific type of card
 */
function executeDrawSpecificSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const cardType = effect.cardType || effect.targetType;
  const count = effect.count || 1;
  
  const deck = currentPlayer === 'player' ? [...newState.players.player.deck] : [...newState.players.opponent.deck];
  
  for (let i = 0; i < count; i++) {
    const hand = currentPlayer === 'player' ? newState.players.player.hand : newState.players.opponent.hand;
    if (hand.length >= MAX_HAND_SIZE) break;

    // Find matching card in deck (using type assertion for deck compatibility)
    const matchIndex = (deck as any[]).findIndex((entry: any) => {
      const cardData = entry.card ? entry.card : entry;
      if (cardType === 'spell') return cardData.type === 'spell';
      if (cardType === 'minion') return cardData.type === 'minion';
      if (cardType === 'weapon') return cardData.type === 'weapon';
      // Check for tribe/race on minion cards
      if (isMinion(cardData)) {
        return ((cardData as any).tribe || '').toLowerCase() === cardType.toLowerCase() || ((cardData as any).race || '').toLowerCase() === cardType.toLowerCase();
      }
      return false;
    });
    
    if (matchIndex >= 0) {
      const drawnEntry = deck.splice(matchIndex, 1)[0];
      // Convert to CardInstance if it's a CardData
      const drawnCard: CardInstance = (drawnEntry as any).card ? drawnEntry as unknown as CardInstance : {
        card: drawnEntry,
        instanceId: uuidv4(),
        canAttack: false,
        isSummoningSick: true,
        attacksPerformed: 0,
        currentHealth: getHealth(drawnEntry) || 0
      } as CardInstance;
      
      if (currentPlayer === 'player') {
        newState.players = {
          ...newState.players,
          player: {
            ...newState.players.player,
            hand: [...newState.players.player.hand, drawnCard],
            deck: deck
          }
        };
      } else {
        newState.players = {
          ...newState.players,
          opponent: {
            ...newState.players.opponent,
            hand: [...newState.players.opponent.hand, drawnCard],
            deck: deck
          }
        };
      }
    }
  }
  
  return newState;
}

/**
 * Execute discard spell - discard cards from hand
 */
function executeDiscardSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const count = effect.count || effect.value || 1;
  
  if (currentPlayer === 'player') {
    const hand = [...newState.players.player.hand];
    for (let i = 0; i < count && hand.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * hand.length);
      hand.splice(randomIndex, 1);
    }
    newState.players = {
      ...newState.players,
      player: {
        ...newState.players.player,
        hand: hand
      }
    };
  } else {
    const hand = [...newState.players.opponent.hand];
    for (let i = 0; i < count && hand.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * hand.length);
      hand.splice(randomIndex, 1);
    }
    newState.players = {
      ...newState.players,
      opponent: {
        ...newState.players.opponent,
        hand: hand
      }
    };
  }
  
  return newState;
}

/**
 * Execute double health spell - double a minion's health
 */
function executeDoubleHealthSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) return state;
  
  const newState = { ...state };
  
  // Find and update target on either battlefield
  newState.players.player.battlefield = newState.players.player.battlefield.map((minion: CardInstance) => {
    if (minion.instanceId === targetId) {
      return {
        ...minion,
        currentHealth: (minion.currentHealth || getHealth(minion.card)) * 2
      };
    }
    return minion;
  });
  
  newState.players.opponent.battlefield = newState.players.opponent.battlefield.map((minion: CardInstance) => {
    if (minion.instanceId === targetId) {
      return {
        ...minion,
        currentHealth: (minion.currentHealth || getHealth(minion.card)) * 2
      };
    }
    return minion;
  });
  
  return newState;
}

/**
 * Execute conditional draw spell - draw cards if condition is met
 */
function executeConditionalDrawSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const condition = effect.condition || 'always';
  const cardsToDraw = effect.count || effect.value || 1;
  
  let conditionMet = false;
  
  switch (condition) {
    case 'no_minions':
      const playerBf = currentPlayer === 'player' ? newState.players.player.battlefield : newState.players.opponent.battlefield;
      conditionMet = playerBf.length === 0;
      break;
    case 'damaged_hero':
      const playerHp = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
      conditionMet = (playerHp.heroHealth ?? playerHp.health ?? 100) < (playerHp.maxHealth ?? 100);
      break;
    case 'always':
    default:
      conditionMet = true;
  }
  
  if (conditionMet) {
    for (let i = 0; i < cardsToDraw; i++) {
      newState = drawCard(newState);
    }
  }
  
  return newState;
}

/**
 * Execute conditional armor spell - gain armor if condition is met
 */
function executeConditionalArmorSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const condition = effect.condition || 'always';
  const armorGain = effect.value || 0;
  
  let conditionMet = false;
  
  switch (condition) {
    case 'no_minions':
      const playerBattlefield = currentPlayer === 'player' ? newState.players.player.battlefield : newState.players.opponent.battlefield;
      conditionMet = playerBattlefield.length === 0;
      break;
    case 'holding_dragon':
      const hand = currentPlayer === 'player' ? newState.players.player.hand : newState.players.opponent.hand;
      conditionMet = hand.some((c: CardInstance) => isMinion(c.card) && ((c.card as any).tribe === 'Dragon' || (c.card as any).race === 'Dragon'));
      break;
    case 'always':
    default:
      conditionMet = true;
  }
  
  if (conditionMet) {
    if (currentPlayer === 'player') {
      newState.players = {
        ...newState.players,
        player: {
          ...newState.players.player,
          heroArmor: (newState.players.player.heroArmor || 0) + armorGain
        }
      };
    } else {
      newState.players = {
        ...newState.players,
        opponent: {
          ...newState.players.opponent,
          heroArmor: (newState.players.opponent.heroArmor || 0) + armorGain
        }
      };
    }
  }

  return newState;
}

/**
 * Execute conditional summon spell - summon minions if condition is met
 */
function executeConditionalSummonSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const condition = effect.condition || 'always';
  
  let conditionMet = false;
  
  switch (condition) {
    case 'combo':
      conditionMet = (state as any).comboActive || false;
      break;
    case 'no_minions':
      const bf = currentPlayer === 'player' ? newState.players.player.battlefield : newState.players.opponent.battlefield;
      conditionMet = bf.length === 0;
      break;
    case 'always':
    default:
      conditionMet = true;
  }
  
  if (conditionMet) {
    newState = executeSummonSpell(newState, effect);
  }
  
  return newState;
}

/**
 * Execute conditional effect spell - apply effect if condition is met
 */
function executeConditionalEffectSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  let newState = { ...state };
  const condition = effect.condition || 'always';
  
  let conditionMet = false;
  
  switch (condition) {
    case 'combo':
      conditionMet = (state as any).comboActive || false;
      break;
    case 'spell_damage':
      conditionMet = ((state as any).spellDamageBonus || 0) > 0;
      break;
    case 'always':
    default:
      conditionMet = true;
  }
  
  if (conditionMet && effect.thenEffect) {
    // Execute the conditional effect
    newState = executeSpell(newState, {
      instanceId: uuidv4(),
      card: { 
        id: 0,
        name: 'Conditional Effect',
        manaCost: 0,
        type: 'spell',
        spellEffect: effect.thenEffect
      } as CardData,
      currentHealth: 0,
      currentAttack: 0,
      canAttack: false,
      isSummoningSick: false,
      attacksPerformed: 0
    }, targetId);
  }
  
  return newState;
}

/**
 * Execute buff deck spell - buff all minions in deck
 */
function executeBuffDeckSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const attackBuff = effect.attack || 0;
  const healthBuff = effect.health || 0;
  
  if (currentPlayer === 'player') {
    newState.players = {
      ...newState.players,
      player: {
        ...newState.players.player,
        deck: newState.players.player.deck.map((entry: any) => {
          const cardData = entry.card ? entry.card : entry;
          if (cardData.type === 'minion') {
            if (entry.card) {
              return {
                ...entry,
                card: {
                  ...cardData,
                  attack: (cardData.attack || 0) + attackBuff,
                  health: (cardData.health || 0) + healthBuff
                }
              };
            } else {
              return {
                ...entry,
                attack: (cardData.attack || 0) + attackBuff,
                health: (cardData.health || 0) + healthBuff
              };
            }
          }
          return entry;
        })
      }
    };
  } else {
    newState.players = {
      ...newState.players,
      opponent: {
        ...newState.players.opponent,
        deck: newState.players.opponent.deck.map((entry: any) => {
          const cardData = entry.card ? entry.card : entry;
          if (cardData.type === 'minion') {
            if (entry.card) {
              return {
                ...entry,
                card: {
                  ...cardData,
                  attack: (cardData.attack || 0) + attackBuff,
                  health: (cardData.health || 0) + healthBuff
                }
              };
            } else {
              return {
                ...entry,
                attack: (cardData.attack || 0) + attackBuff,
                health: (cardData.health || 0) + healthBuff
              };
            }
          }
          return entry;
        })
      }
    };
  }
  
  return newState;
}

/**
 * Execute buff hand spell - buff all minions in hand
 */
function executeBuffHandSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const attackBuff = effect.attack || 0;
  const healthBuff = effect.health || 0;
  
  if (currentPlayer === 'player') {
    newState.players = {
      ...newState.players,
      player: {
        ...newState.players.player,
        hand: newState.players.player.hand.map(card => {
          if (card.card.type === 'minion') {
            return {
              ...card,
              currentAttack: (card.currentAttack || 0) + attackBuff,
              currentHealth: (card.currentHealth || 0) + healthBuff,
              card: {
                ...card.card,
                attack: (card.card.attack || 0) + attackBuff,
                health: (card.card.health || 0) + healthBuff
              }
            };
          }
          return card;
        })
      }
    };
  } else {
    newState.players = {
      ...newState.players,
      opponent: {
        ...newState.players.opponent,
        hand: newState.players.opponent.hand.map(card => {
          if (card.card.type === 'minion') {
            return {
              ...card,
              currentAttack: (card.currentAttack || 0) + attackBuff,
              currentHealth: (card.currentHealth || 0) + healthBuff,
              card: {
                ...card.card,
                attack: (card.card.attack || 0) + attackBuff,
                health: (card.card.health || 0) + healthBuff
              }
            };
          }
          return card;
        })
      }
    };
  }
  
  return newState;
}

/**
 * Execute copy from opponent deck spell - copy a card from opponent's deck
 */
function executeCopyFromOpponentDeckSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const count = effect.count || 1;
  
  const opponentDeck = currentPlayer === 'player' 
    ? [...newState.players.opponent.deck] 
    : [...newState.players.player.deck];
  
  for (let i = 0; i < count && opponentDeck.length > 0; i++) {
    const hand = currentPlayer === 'player' ? newState.players.player.hand : newState.players.opponent.hand;
    if (hand.length >= MAX_HAND_SIZE) break;

    const randomIndex = Math.floor(Math.random() * opponentDeck.length);
    const deckEntry = opponentDeck[randomIndex] as any;
    const cardData = deckEntry.card ? deckEntry.card : deckEntry;
    const copiedCard: CardInstance = {
      instanceId: uuidv4(),
      card: { ...cardData },
      canAttack: false,
      isSummoningSick: true,
      attacksPerformed: 0,
      currentHealth: getHealth(cardData) || 0
    };
    
    if (currentPlayer === 'player') {
      newState.players = {
        ...newState.players,
        player: {
          ...newState.players.player,
          hand: [...newState.players.player.hand, copiedCard]
        }
      };
    } else {
      newState.players = {
        ...newState.players,
        opponent: {
          ...newState.players.opponent,
          hand: [...newState.players.opponent.hand, copiedCard]
        }
      };
    }
  }
  
  return newState;
}

/**
 * Execute mill spell - destroy cards from opponent's deck
 */
function executeMillSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const count = effect.count || effect.value || 1;
  
  if (currentPlayer === 'player') {
    newState.players = {
      ...newState.players,
      opponent: {
        ...newState.players.opponent,
        deck: newState.players.opponent.deck.slice(count)
      }
    };
  } else {
    newState.players = {
      ...newState.players,
      player: {
        ...newState.players.player,
        deck: newState.players.player.deck.slice(count)
      }
    };
  }
  
  logActivity('damage_dealt' as any, currentPlayer, `Milled ${count} cards from opponent's deck`);
  
  return newState;
}

/**
 * Execute mana discount spell - reduce cost of cards in hand
 */
function executeManaDiscountSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const discount = effect.value || 1;
  const cardType = effect.cardType || 'all';
  
  const updateHand = (hand: CardInstance[]): CardInstance[] => {
    return hand.map(card => {
      const shouldDiscount = cardType === 'all' || card.card.type === cardType;
      if (shouldDiscount) {
        return {
          ...card,
          card: {
            ...card.card,
            manaCost: Math.max(0, (card.card.manaCost || 0) - discount)
          }
        };
      }
      return card;
    });
  };
  
  if (currentPlayer === 'player') {
    newState.players = {
      ...newState.players,
      player: {
        ...newState.players.player,
        hand: updateHand(newState.players.player.hand)
      }
    };
  } else {
    newState.players = {
      ...newState.players,
      opponent: {
        ...newState.players.opponent,
        hand: updateHand(newState.players.opponent.hand)
      }
    };
  }
  
  return newState;
}

/**
 * Execute hero attack spell - give hero attack this turn
 */
function executeHeroAttackSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const attackValue = effect.value || 0;
  
  if (currentPlayer === 'player') {
    const updatedPlayer = {
      ...newState.players.player,
      canAttack: true
    };
    (updatedPlayer as any).heroAttack = ((newState.players.player as any).heroAttack || 0) + attackValue;
    newState.players = { ...newState.players, player: updatedPlayer };
  } else {
    const updatedOpponent = {
      ...newState.players.opponent,
      canAttack: true
    };
    (updatedOpponent as any).heroAttack = ((newState.players.opponent as any).heroAttack || 0) + attackValue;
    newState.players = { ...newState.players, opponent: updatedOpponent };
  }
  
  return newState;
}

/**
 * Execute grant immunity spell - grant immunity to a target
 */
function executeGrantImmunitySpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  if (targetId) {
    // Grant to minion
    newState.players.player.battlefield = newState.players.player.battlefield.map((minion: CardInstance) => {
      if (minion.instanceId === targetId) {
        return { ...minion, immune: true };
      }
      return minion;
    });
    
    newState.players.opponent.battlefield = newState.players.opponent.battlefield.map((minion: CardInstance) => {
      if (minion.instanceId === targetId) {
        return { ...minion, immune: true };
      }
      return minion;
    });
  } else {
    // Grant to hero (using type assertion for optional property)
    if (currentPlayer === 'player') {
      (newState.players.player as any).immune = true;
    } else {
      (newState.players.opponent as any).immune = true;
    }
  }
  
  return newState;
}

/**
 * Execute gain divine shield spell - give divine shield to minions
 */
function executeGainDivineShieldSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  if (targetId) {
    // Grant to specific minion
    newState.players.player.battlefield = newState.players.player.battlefield.map((minion: CardInstance) => {
      if (minion.instanceId === targetId) {
        const keywords = minion.card.keywords || [];
        if (!keywords.includes('Divine Shield')) {
          return {
            ...minion,
            card: {
              ...minion.card,
              keywords: [...keywords, 'Divine Shield']
            },
            hasDivineShield: true
          };
        }
      }
      return minion;
    });
    
    newState.players.opponent.battlefield = newState.players.opponent.battlefield.map((minion: CardInstance) => {
      if (minion.instanceId === targetId) {
        const keywords = minion.card.keywords || [];
        if (!keywords.includes('Divine Shield')) {
          return {
            ...minion,
            card: {
              ...minion.card,
              keywords: [...keywords, 'Divine Shield']
            },
            hasDivineShield: true
          };
        }
      }
      return minion;
    });
  } else if (effect.targetType === 'all_friendly_minions') {
    // Grant to all friendly minions
    const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
    playerState.battlefield = playerState.battlefield.map((minion: CardInstance) => {
      const keywords = minion.card.keywords || [];
      if (!keywords.includes('Divine Shield')) {
        return {
          ...minion,
          card: {
            ...minion.card,
            keywords: [...keywords, 'Divine Shield']
          },
          hasDivineShield: true
        };
      }
      return minion;
    });
  }
  
  return newState;
}

/**
 * Execute shadowflame spell - destroy a friendly minion and deal its attack damage to all enemies
 */
function executeShadowflameSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) return state;
  
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  // Find the target minion
  const friendlyBattlefield = currentPlayer === 'player' ? newState.players.player.battlefield : newState.players.opponent.battlefield;
  const targetMinion = friendlyBattlefield.find((m: CardInstance) => m.instanceId === targetId);
  
  if (!targetMinion) return newState;
  
  const damage = targetMinion.currentAttack || getAttack(targetMinion.card);
  
  // Destroy the target minion through proper destroyCard flow for deathrattle triggers
  newState = destroyCardFromZone(newState, targetId, currentPlayer);
  
  // Deal damage to all enemy minions
  const enemyPlayerState = currentPlayer === 'player' ? newState.players.opponent : newState.players.player;
  enemyPlayerState.battlefield = enemyPlayerState.battlefield.map((minion: CardInstance) => ({
    ...minion,
    currentHealth: (minion.currentHealth || getHealth(minion.card)) - damage
  }));
  // Remove dead enemy minions properly for deathrattle triggers
  newState = removeDeadMinions(newState);
  
  return newState;
}

/**
 * Execute summon copy spell - summon a copy of a minion
 */
function executeSummonCopySpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) return state;
  
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  // Find target minion
  const allMinions = [...newState.players.player.battlefield, ...newState.players.opponent.battlefield];
  const targetMinion = allMinions.find((m: CardInstance) => m.instanceId === targetId);
  
  if (!targetMinion) return newState;
  
  // Check board space
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
  
  // Create copy
  const copy: CardInstance = {
    instanceId: uuidv4(),
    card: { ...targetMinion.card },
    currentHealth: targetMinion.currentHealth || getHealth(targetMinion.card),
    currentAttack: targetMinion.currentAttack || getAttack(targetMinion.card),
    canAttack: false,
    isSummoningSick: true,
    attacksPerformed: 0
  };
  
  // Add to battlefield
  playerState.battlefield.push(copy);
  
  return newState;
}

/**
 * Execute swap stats with target spell - swap stats between two minions
 */
function executeSwapStatsWithTargetSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) return state;
  
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  // Get the friendly minion that casts this (usually first friendly minion or specified)
  const friendlyBf = currentPlayer === 'player' ? newState.players.player.battlefield : newState.players.opponent.battlefield;
  const sourceMinion = friendlyBf[0]; // Could be enhanced to specify source
  
  if (!sourceMinion) return newState;
  
  // Find target
  const allMinions = [...newState.players.player.battlefield, ...newState.players.opponent.battlefield];
  const targetMinion = allMinions.find((m: CardInstance) => m.instanceId === targetId);
  
  if (!targetMinion) return newState;
  
  // Swap stats
  const sourceAttack = sourceMinion.currentAttack || getAttack(sourceMinion.card);
  const sourceHealth = sourceMinion.currentHealth || getHealth(sourceMinion.card);
  const targetAttack = targetMinion.currentAttack || getAttack(targetMinion.card);
  const targetHealth = targetMinion.currentHealth || getHealth(targetMinion.card);
  
  // Update both battlefields
  newState.players.player.battlefield = newState.players.player.battlefield.map((m: CardInstance) => {
    if (m.instanceId === sourceMinion.instanceId) {
      return { ...m, currentAttack: targetAttack, currentHealth: targetHealth };
    }
    if (m.instanceId === targetId) {
      return { ...m, currentAttack: sourceAttack, currentHealth: sourceHealth };
    }
    return m;
  });
  
  newState.players.opponent.battlefield = newState.players.opponent.battlefield.map((m: CardInstance) => {
    if (m.instanceId === sourceMinion.instanceId) {
      return { ...m, currentAttack: targetAttack, currentHealth: targetHealth };
    }
    if (m.instanceId === targetId) {
      return { ...m, currentAttack: sourceAttack, currentHealth: sourceHealth };
    }
    return m;
  });
  
  return newState;
}

/**
 * Execute transform all spell - transform all minions into something
 */
function executeTransformAllSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const transformInto = effect.transformInto || effect.cardId;
  const targetType = effect.targetType || 'all_minions';
  
  if (!transformInto) return newState;
  
  const cardData = getCardById(transformInto as number);
  if (!cardData) return newState;
  
  const createTransformedMinion = (): CardInstance => ({
    instanceId: uuidv4(),
    card: { ...cardData },
    currentHealth: getHealth(cardData) || 1,
    currentAttack: getAttack(cardData) || 0,
    canAttack: false,
    isSummoningSick: true,
    attacksPerformed: 0
  });
  
  if (targetType === 'all_minions' || targetType === 'all_enemy_minions') {
    if (targetType === 'all_minions') {
      newState.players.player.battlefield = newState.players.player.battlefield.map(() => createTransformedMinion());
      newState.players.opponent.battlefield = newState.players.opponent.battlefield.map(() => createTransformedMinion());
    } else {
      const currentPlayer = state.currentTurn || 'player';
      const enemyPlayerState = currentPlayer === 'player' ? newState.players.opponent : newState.players.player;
      enemyPlayerState.battlefield = enemyPlayerState.battlefield.map(() => createTransformedMinion());
    }
  }
  
  return newState;
}

/**
 * Execute weapon damage AoE spell - deal damage equal to weapon attack to all enemies
 */
function executeWeaponDamageAoESpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  
  // Get weapon attack
  const weapon = currentPlayer === 'player' 
    ? newState.players.player.weapon 
    : newState.players.opponent.weapon;
  
  if (!weapon) return newState;
  
  const weaponCard = weapon.card;
  const damage = isWeapon(weaponCard) ? (weaponCard.attack || 0) : 0;
  
  // Deal damage to all enemy minions
  const enemyPlayerState = currentPlayer === 'player' ? newState.players.opponent : newState.players.player;
  
  enemyPlayerState.battlefield = enemyPlayerState.battlefield.map((minion: CardInstance) => ({
    ...minion,
    currentHealth: (minion.currentHealth || getHealth(minion.card)) - (damage || 0)
  })).filter((minion: CardInstance) => (minion.currentHealth || 0) > 0);
  
  // Optionally damage enemy hero too
  if (effect.damageHero) {
    const enemyType: 'player' | 'opponent' = currentPlayer === 'player' ? 'opponent' : 'player';
    const friendlyType: 'player' | 'opponent' = currentPlayer === 'player' ? 'player' : 'opponent';
    newState = dealDamage(newState, enemyType, 'hero', damage || 0, undefined, undefined, friendlyType);
  }

  return newState;
}

function executeGainArmorReduceCostSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;

  const armorAmount = effect.value || 5;
  playerState.heroArmor = Math.min(30, (playerState.heroArmor || 0) + armorAmount);

  const costReduction = (effect as any).costReduction || 1;
  const targetCardType = (effect as any).targetCardType || 'all';

  playerState.hand = playerState.hand.map((cardInst: CardInstance) => {
    const manaCost = cardInst.card.manaCost ?? 0;
    const matchesType = targetCardType === 'all' || cardInst.card.type === targetCardType;
    if (matchesType && manaCost > 0) {
      const reduction = Math.min(costReduction, manaCost);
      return {
        ...cardInst,
        card: { ...cardInst.card, manaCost: manaCost - reduction }
      };
    }
    return cardInst;
  });

  return newState;
}

function executeDeathCoilSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!targetId || !targetType) {
    debug.error('Death Coil spell requires a target');
    return state;
  }

  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const damageValue = effect.value || 5;
  const healValue = (effect as any).healValue || effect.value || 5;

  const friendlyType: 'player' | 'opponent' = currentPlayer === 'player' ? 'player' : 'opponent';
  const enemyType: 'player' | 'opponent' = currentPlayer === 'player' ? 'opponent' : 'player';

  const enemyBoard = newState.players[enemyType].battlefield;
  const friendlyBoard = newState.players[friendlyType].battlefield;

  const isEnemyMinion = enemyBoard.some(m => m.instanceId === targetId);
  const isFriendlyMinion = friendlyBoard.some(m => m.instanceId === targetId);
  const isEnemyHero = targetType === 'hero' && !isFriendlyMinion;

  if (isEnemyMinion || isEnemyHero) {
    if (targetType === 'hero') {
      newState = dealDamage(newState, enemyType, 'hero', damageValue, undefined, undefined, friendlyType);
    } else {
      newState = dealDamage(newState, enemyType, 'minion', damageValue, targetId, undefined, friendlyType);
    }
  } else if (isFriendlyMinion) {
    newState.players[friendlyType].battlefield = friendlyBoard.map(m => {
      if (m.instanceId === targetId) {
        const maxHealth = getHealth(m.card) || 1;
        const newHealth = Math.min((m.currentHealth || 0) + healValue, maxHealth);
        return { ...m, currentHealth: newHealth };
      }
      return m;
    });
  }

  return newState;
}

function executeAoEWithOnKillSpell(
  state: GameState,
  effect: SpellEffect,
  _spellName?: string
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const friendlyType: 'player' | 'opponent' = currentPlayer === 'player' ? 'player' : 'opponent';
  const enemyType: 'player' | 'opponent' = currentPlayer === 'player' ? 'opponent' : 'player';

  const damageValue = effect.value || 1;
  const healValue = (effect as any).healValue || 0;
  const drawOnKill = (effect as any).drawOnKill || 0;
  const buffOnKill = (effect as any).buffOnKill || 0;

  const enemyBoard = newState.players[enemyType].battlefield;
  const beforeCount = enemyBoard.length;

  enemyBoard.forEach((minion: CardInstance) => {
    const currentHp = minion.currentHealth || getHealth(minion.card);
    minion.currentHealth = currentHp - damageValue;
  });

  newState.players[enemyType].battlefield = enemyBoard.filter(
    (m: CardInstance) => (m.currentHealth || 0) > 0
  );

  const killed = beforeCount - newState.players[enemyType].battlefield.length;

  if (killed > 0) {
    if (healValue > 0) {
      const totalHeal = healValue * killed;
      const hero = newState.players[friendlyType];
      hero.heroHealth = Math.min((hero.heroHealth ?? hero.health ?? hero.maxHealth) + totalHeal, hero.maxHealth);
    }
    if (drawOnKill > 0) {
      for (let i = 0; i < drawOnKill * killed; i++) {
        newState = drawCard(newState);
      }
    }
    if (buffOnKill > 0) {
      newState.players[friendlyType].battlefield = newState.players[friendlyType].battlefield.map(
        (m: CardInstance) => ({
          ...m,
          card: { ...m.card, attack: (getAttack(m.card) || 0) + buffOnKill },
          currentHealth: (m.currentHealth || getHealth(m.card)) + buffOnKill
        })
      );
    }
  }

  newState = removeDeadMinions(newState);
  return newState;
}

function executeFreezeAdjacentSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Freeze adjacent spell requires a target');
    return state;
  }

  const newState = { ...state };
  const includeTarget = (effect as any).includeTarget !== false;

  for (const side of ['player', 'opponent'] as const) {
    const board = newState.players[side].battlefield;
    const targetIdx = board.findIndex(m => m.instanceId === targetId);
    if (targetIdx === -1) continue;

    newState.players[side].battlefield = board.map((minion, idx) => {
      const isTarget = idx === targetIdx;
      const isAdjacent = idx === targetIdx - 1 || idx === targetIdx + 1;

      if ((isTarget && includeTarget) || isAdjacent) {
        return { ...minion, isFrozen: true, canAttack: false };
      }
      return minion;
    });
    break;
  }

  return newState;
}

function executeFillBoardSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const side = currentPlayer === 'player' ? 'player' : 'opponent' as const;
  const playerState = newState.players[side];
  const maxBoardSize = 5;
  const slotsAvailable = maxBoardSize - playerState.battlefield.length;

  if (slotsAvailable <= 0) return newState;

  const summonId = (effect as any).summonCardId || effect.value;
  const summonCount = Math.min((effect as any).count || slotsAvailable, slotsAvailable);

  for (let i = 0; i < summonCount; i++) {
    let cardData: CardData | undefined;
    if (summonId) {
      cardData = getCardById(summonId as number);
    }
    if (!cardData) {
      cardData = {
        id: 9999,
        name: 'Risen Skeleton',
        manaCost: 1,
        attack: 1,
        health: 1,
        type: 'minion',
        description: 'Summoned from the grave.',
        rarity: 'common',
        keywords: [],
      } as MinionCardData;
    }

    const instance: CardInstance = {
      instanceId: uuidv4(),
      card: cardData,
      currentHealth: getHealth(cardData) || 1,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0,
    };
    playerState.battlefield.push(instance);
  }

  return newState;
}

function executeHeroAttackBuffSpell(
  state: GameState,
  effect: SpellEffect
): GameState {
  const newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const attackValue = effect.value || 0;
  const armorValue = (effect as any).armorValue || 0;

  const side = currentPlayer === 'player' ? 'player' : 'opponent' as const;
  const updatedPlayer = {
    ...newState.players[side],
    canAttack: true
  };
  (updatedPlayer as any).heroAttack = ((newState.players[side] as any).heroAttack || 0) + attackValue;
  if (armorValue > 0) {
    updatedPlayer.heroArmor = Math.min(30, (updatedPlayer.heroArmor || 0) + armorValue);
  }
  newState.players = { ...newState.players, [side]: updatedPlayer };

  return newState;
}

// ==================== NEWLY WIRED SPELL HANDLERS ====================

function executeDrawToMatchOpponentSpell(state: GameState): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const myHand = currentPlayer === 'player' ? state.players.player.hand : state.players.opponent.hand;
  const oppHand = currentPlayer === 'player' ? state.players.opponent.hand : state.players.player.hand;
  const deficit = oppHand.length - myHand.length;
  if (deficit <= 0) return state;
  return drawMultipleCards(newState, currentPlayer, deficit);
}

function executeFreezeAndDrawSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  let newState = executeFreezeSpell(state, effect, targetId, targetType);
  const drawCount = (effect as any).drawCount || effect.value || 1;
  return drawMultipleCards(newState, newState.currentTurn || 'player', drawCount);
}

function executeArmorToAoeDamageSpell(state: GameState): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  const armor = playerState.heroArmor || 0;
  if (armor <= 0) return state;
  playerState.heroArmor = 0;
  return applyAoEDamage(newState, armor, 'all');
}

function executeDamageAndHealHeroSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  let newState = executeDamageSpell(state, effect, targetId, targetType);
  const currentPlayer = newState.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  const healAmount = (effect as any).healValue || effect.value || 0;
  const maxHp = playerState.maxHealth || 100;
  const currentHp = playerState.heroHealth ?? playerState.health ?? maxHp;
  if (currentPlayer === 'player') {
    newState.players.player.heroHealth = Math.min(currentHp + healAmount, maxHp);
    newState.players.player.health = newState.players.player.heroHealth;
  } else {
    newState.players.opponent.heroHealth = Math.min(currentHp + healAmount, maxHp);
    newState.players.opponent.health = newState.players.opponent.heroHealth;
  }
  return newState;
}

function executeDamageAndBuffSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  let newState = executeDamageSpell(state, effect, targetId, targetType);
  const currentPlayer = newState.currentTurn || 'player';
  const battlefield = currentPlayer === 'player' ? newState.players.player.battlefield : newState.players.opponent.battlefield;
  const buffAttack = (effect as any).buffAttack || 0;
  const buffHealth = (effect as any).buffHealth || 0;
  if (buffAttack || buffHealth) {
    battlefield.forEach((m: CardInstance) => {
      if (buffAttack) m.currentAttack = (m.currentAttack || getAttack(m.card) || 0) + buffAttack;
      if (buffHealth) m.currentHealth = (m.currentHealth || getHealth(m.card) || 0) + buffHealth;
    });
  }
  return newState;
}

function executeDmgBasedOnMissingHpSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? state.players.player : state.players.opponent;
  const maxHp = playerState.maxHealth || 100;
  const currentHp = playerState.heroHealth ?? playerState.health ?? maxHp;
  const missingHp = Math.max(0, maxHp - currentHp);
  if (missingHp <= 0) return state;
  const damageEffect: SpellEffect = { type: 'damage', value: missingHp, requiresTarget: true };
  return executeDamageSpell(state, damageEffect, targetId, targetType);
}

function executeDamageDrawIfSurvivesSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  let newState = executeDamageSpell(state, effect, targetId, targetType);
  if (targetType === 'minion' && targetId) {
    const allMinions = [...newState.players.player.battlefield, ...newState.players.opponent.battlefield];
    const target = allMinions.find((m: CardInstance) => m.instanceId === targetId);
    if (target && (target.currentHealth || 0) > 0) {
      const drawCount = (effect as any).drawCount || 1;
      newState = drawMultipleCards(newState, newState.currentTurn || 'player', drawCount);
    }
  }
  return newState;
}

function executeDamageWithAdjacentSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  if (!targetId || !effect.value) return state;
  let newState = { ...state };
  const damageAmount = effect.value;
  const sides = ['player', 'opponent'] as const;
  for (const side of sides) {
    const battlefield = newState.players[side].battlefield;
    const idx = battlefield.findIndex((m: CardInstance) => m.instanceId === targetId);
    if (idx === -1) continue;
    const targets = [idx];
    if (idx > 0) targets.push(idx - 1);
    if (idx < battlefield.length - 1) targets.push(idx + 1);
    for (const ti of targets) {
      const m = battlefield[ti];
      if (m.hasDivineShield) { m.hasDivineShield = false; }
      else { m.currentHealth = (m.currentHealth || getHealth(m.card) || 0) - damageAmount; }
    }
    break;
  }
  return newState;
}

function executeDiscoverAndSummonSpell(
  state: GameState,
  effect: SpellEffect,
  sourceCardId: string
): GameState {
  let pool = allCards.filter(c => c.type === 'minion');
  const condition = (effect as any).discoverCondition;
  if (condition === 'cost_8_or_more') pool = pool.filter(c => (c.manaCost || 0) >= 8);
  else if (condition === 'cost_4_or_less') pool = pool.filter(c => (c.manaCost || 0) <= 4);
  const options = pool.sort(() => 0.5 - Math.random()).slice(0, 3);
  if (options.length === 0) return state;
  return {
    ...state,
    discovery: {
      active: true,
      options,
      allOptions: [...options],
      sourceCardId,
      filters: { type: 'minion' as any, rarity: 'any', manaCost: 'any' },
      callback: (selectedCard: CardData | null) => {
        const { gameState: currentState } = useGameStore.getState();
        if (!selectedCard || !isMinion(selectedCard)) return currentState;
        const updatedState = { ...currentState };
        const currentPlayer = updatedState.currentTurn || 'player';
        const playerState = currentPlayer === 'player' ? updatedState.players.player : updatedState.players.opponent;
        if (playerState.battlefield.length < MAX_BATTLEFIELD_SIZE) {
          const instance: CardInstance = {
            instanceId: uuidv4(),
            card: selectedCard,
            currentHealth: getHealth(selectedCard) || 1,
            currentAttack: getAttack(selectedCard) || 0,
            canAttack: false,
            isPlayed: true,
            isSummoningSick: true,
            attacksPerformed: 0
          };
          playerState.battlefield.push(instance);
          trackQuestProgress(currentPlayer, 'summon_minion', selectedCard);
        }
        return updatedState;
      }
    }
  };
}

function executeDrawAndReduceCostSpell(state: GameState, effect: SpellEffect): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const drawCount = (effect as any).drawCount || 1;
  const costReduction = (effect as any).costReduction || 3;
  newState = drawMultipleCards(newState, currentPlayer, drawCount);
  const hand = currentPlayer === 'player' ? newState.players.player.hand : newState.players.opponent.hand;
  if (hand.length > 0) {
    const lastDrawn = hand[hand.length - 1];
    lastDrawn.card = { ...lastDrawn.card, manaCost: Math.max(0, (lastDrawn.card.manaCost || 0) - costReduction) };
  }
  return newState;
}

function executeDrawAndRepeatSpell(state: GameState, effect: SpellEffect): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const condition = (effect as any).condition || 'has_deathrattle';
  const maxRepeats = 10;
  for (let i = 0; i < maxRepeats; i++) {
    const handBefore = currentPlayer === 'player' ? newState.players.player.hand.length : newState.players.opponent.hand.length;
    newState = drawMultipleCards(newState, currentPlayer, 1);
    const hand = currentPlayer === 'player' ? newState.players.player.hand : newState.players.opponent.hand;
    if (hand.length <= handBefore) break;
    const drawnCard = hand[hand.length - 1];
    const keywords = drawnCard.card.keywords || [];
    const hasDeathrattle = condition === 'has_deathrattle' && (keywords.includes('deathrattle') || keywords.includes('Deathrattle'));
    if (!hasDeathrattle) break;
  }
  return newState;
}

function executeRecruitSpell(state: GameState, effect: SpellEffect): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  const count = (effect as any).recruitCount || 1;
  const condition = (effect as any).recruitCondition;
  const maxCost = (effect as any).maxCost;
  const recruitRace = (effect as any).recruitRace;

  for (let r = 0; r < count; r++) {
    if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
    const eligible = playerState.deck.filter((entry: any) => {
      const card = entry.card ? entry.card : entry;
      if (card.type !== 'minion') return false;
      if (condition === 'cost_4_or_less' && (card.manaCost || 0) > 4) return false;
      if (condition === 'cost_3_or_less' && (card.manaCost || 0) > 3) return false;
      if (maxCost !== undefined && (card.manaCost || 0) > maxCost) return false;
      if (recruitRace && (card.race || '').toLowerCase() !== recruitRace.toLowerCase()) return false;
      return true;
    });
    if (eligible.length === 0) break;
    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    const cardData = (picked as any).card ? (picked as any).card : picked;
    const idx = playerState.deck.indexOf(picked);
    if (idx !== -1) playerState.deck.splice(idx, 1);
    const instance: CardInstance = {
      instanceId: uuidv4(),
      card: cardData,
      currentHealth: getHealth(cardData) || 1,
      currentAttack: getAttack(cardData) || 0,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    playerState.battlefield.push(instance);
    trackQuestProgress(currentPlayer, 'summon_minion', cardData);
  }
  return newState;
}

function executeGainArmorAndRecruitSpell(state: GameState, effect: SpellEffect): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  const armorAmount = (effect as any).armorValue || effect.value || 0;
  playerState.heroArmor = Math.min(30, (playerState.heroArmor || 0) + armorAmount);
  return executeRecruitSpell(newState, effect);
}

function executeSummonCopyFromHandSpell(state: GameState): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) return state;
  const minionsInHand = playerState.hand.filter((c: CardInstance) => c.card.type === 'minion');
  if (minionsInHand.length === 0) return state;
  const picked = minionsInHand[Math.floor(Math.random() * minionsInHand.length)];
  const instance: CardInstance = {
    instanceId: uuidv4(),
    card: { ...picked.card },
    currentHealth: getHealth(picked.card) || 1,
    currentAttack: getAttack(picked.card) || 0,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: true,
    attacksPerformed: 0
  };
  playerState.battlefield.push(instance);
  trackQuestProgress(currentPlayer, 'summon_minion', picked.card);
  return newState;
}

function executeSummonFromBothHandsSpell(state: GameState): GameState {
  let newState = { ...state };
  const sides = ['player', 'opponent'] as const;
  for (const side of sides) {
    const playerState = newState.players[side];
    if (playerState.battlefield.length >= MAX_BATTLEFIELD_SIZE) continue;
    const minionsInHand = playerState.hand.filter((c: CardInstance) => c.card.type === 'minion');
    if (minionsInHand.length === 0) continue;
    const picked = minionsInHand[Math.floor(Math.random() * minionsInHand.length)];
    playerState.hand = playerState.hand.filter((c: CardInstance) => c.instanceId !== picked.instanceId);
    const instance: CardInstance = {
      instanceId: picked.instanceId,
      card: picked.card,
      currentHealth: getHealth(picked.card) || 1,
      currentAttack: getAttack(picked.card) || 0,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    playerState.battlefield.push(instance);
    trackQuestProgress(side, 'summon_minion', picked.card);
  }
  return newState;
}

function executeAttackEqualsHealthSpell(state: GameState, targetId?: string): GameState {
  if (!targetId) return state;
  let newState = { ...state };
  const sides = ['player', 'opponent'] as const;
  for (const side of sides) {
    const idx = newState.players[side].battlefield.findIndex((m: CardInstance) => m.instanceId === targetId);
    if (idx !== -1) {
      const m = newState.players[side].battlefield[idx];
      m.currentAttack = m.currentHealth || getHealth(m.card) || 1;
      break;
    }
  }
  return newState;
}

function executeBuffAllWithDeathrattleSpell(state: GameState, effect: SpellEffect): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const battlefield = currentPlayer === 'player' ? newState.players.player.battlefield : newState.players.opponent.battlefield;
  const buffAttack = effect.buffAttack || (effect as any).attack || 0;
  const buffHealth = effect.buffHealth || (effect as any).health || 0;
  battlefield.forEach((m: CardInstance) => {
    const keywords = m.card.keywords || [];
    if (keywords.includes('deathrattle') || keywords.includes('Deathrattle')) {
      if (buffAttack) m.currentAttack = (m.currentAttack || getAttack(m.card) || 0) + buffAttack;
      if (buffHealth) m.currentHealth = (m.currentHealth || getHealth(m.card) || 0) + buffHealth;
    }
  });
  return newState;
}

function executeBuffAndImmuneSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  let newState = executeBuffSpell(state, effect, targetId);
  const currentPlayer = newState.currentTurn || 'player';
  if (targetId) {
    const sides = ['player', 'opponent'] as const;
    for (const side of sides) {
      const m = newState.players[side].battlefield.find((m: CardInstance) => m.instanceId === targetId);
      if (m) { (m as any).isImmune = true; break; }
    }
  } else {
    const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
    (playerState as any).isImmune = true;
  }
  return newState;
}

function executeBuffThenDestroySpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string
): GameState {
  let newState = executeBuffSpell(state, effect, targetId);
  if (targetId) {
    const sides = ['player', 'opponent'] as const;
    for (const side of sides) {
      const idx = newState.players[side].battlefield.findIndex((m: CardInstance) => m.instanceId === targetId);
      if (idx !== -1) {
        newState.players[side].battlefield[idx].currentHealth = 0;
        break;
      }
    }
  }
  return newState;
}

function executeCommandingShoutSpell(state: GameState): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const battlefield = currentPlayer === 'player' ? newState.players.player.battlefield : newState.players.opponent.battlefield;
  battlefield.forEach((m: CardInstance) => {
    if ((m.currentHealth || 0) < 1) m.currentHealth = 1;
    (m as any).minHealth = 1;
  });
  return newState;
}

function executeConditionalFreezeOrDamageSpell(
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  if (!targetId) return state;
  let shouldFreeze = false;
  if (targetType === 'minion') {
    const allMinions = [...state.players.player.battlefield, ...state.players.opponent.battlefield];
    const target = allMinions.find((m: CardInstance) => m.instanceId === targetId);
    if (target?.isFrozen) shouldFreeze = false;
    else shouldFreeze = true;
  }
  if (shouldFreeze) {
    return executeFreezeSpell(state, effect, targetId, targetType);
  }
  return executeDamageSpell(state, effect, targetId, targetType);
}

function executeNextSpellCostsHealthSpell(state: GameState): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn || 'player';
  const playerState = currentPlayer === 'player' ? newState.players.player : newState.players.opponent;
  (playerState as any).nextSpellCostsHealth = true;
  return newState;
}
