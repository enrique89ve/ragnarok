import { v4 as uuidv4 } from 'uuid';
import { 
  BattlecryEffect, 
  CardInstance, 
  GameState,
  BattlecryTargetType,
  CardData,
  SpellEffect,
  CardAnimationType,
  MinionCardData,
  WeaponCardData
} from '../types';
import { debug } from '../config/debugConfig';
import { assetPath } from './assetPath';
import { trackQuestProgress } from './quests/questProgress';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../constants/gameConstants';
import { useAnimationStore } from '../animations/AnimationManager';
import allCards, { getCardById } from '../data/allCards';
import { addKeyword, setKeywords, getKeywords, hasKeyword } from './cards/keywordUtils';
import { 
  findCardInstance, 
  createCardInstance, 
  getCardTribe, 
  isCardOfTribe, 
  isNagaCard,
  instanceToCardData,
  getCardKeywords
} from './cards/cardUtils';
import { transformMinion, silenceMinion } from './transformUtils';
import { dealDamage } from './effects/damageUtils';
import { destroyCard } from './zoneUtils';
import { healTarget } from './effects/effectUtils';
import { setHeroHealth } from './effects/healthModifierUtils';
import { getCardsFromPool } from '../data/discoverPools';
import { getDiscoveryOptions, createDiscoveryFromSpell } from './discoveryUtils';
import {
  executeRazaBattlecry
} from './highlanderUtils';
import { summonColossalParts } from './mechanics/colossalUtils';
import executeReturnReturn from '../effects/handlers/battlecry/returnHandler';
import { checkPetEvolutionTrigger } from './petEvolutionTriggers';
import { executeCThunBattlecry, executeYoggSaronBattlecry, executeNZothBattlecry, buffCThun } from './oldGodsUtils';

/**
 * Execute an AoE damage battlecry effect
 * This can be used for effects like "Deal X damage to all enemy minions"
 * or "Deal damage equal to this minion's Attack to all enemy minions"
 */
function executeAoEDamageBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  // Determine the damage amount
  let damageAmount = battlecry.value || 1;
  
  // If damage is based on a minion's stats (e.g., its Attack)
  if (battlecry.isBasedOnStats && targetType === 'minion' && targetId) {
    // Find the target minion to base damage on
    const playerBattlefield = state.players.player.battlefield || [];
    const opponentBattlefield = state.players.opponent.battlefield || [];
    const targetInfo = findCardInstance(
      [...playerBattlefield, ...opponentBattlefield], 
      targetId
    );
    
    if (targetInfo) {
      // Use the minion's attack value as the damage amount
      const minionCard = targetInfo.card.card as MinionCardData;
      damageAmount = minionCard.attack || 1; // Default to 1 if attack is undefined
    }
  }
  
  // Special case for World Ender-like effects (destroy all other minions)
  if (battlecry.targetType === 'all_minions' && damageAmount >= 1000) {
    
    // Find the source minion (the one that caused the battlecry)
    // This needs to be more robust since the targetId parameter may not be set correctly for non-targeted battlecries
    let sourceMinion;
    
    // Make sure battlefield arrays exist to prevent undefined errors
    const playerBattlefield = state.players.player.battlefield || [];
    
    // Try to find the card instance by ID if targetId is provided
    if (targetId) {
      sourceMinion = playerBattlefield.find(
        m => m.instanceId === targetId
      );
      
      if (sourceMinion) {
      }
    }
    
    // If we couldn't find it by targetId, try to find it by name (World Ender)
    if (!sourceMinion) {
      sourceMinion = playerBattlefield.find(
        m => m.card.name === 'World Ender'
      );
      
      if (sourceMinion) {
      }
    }
    
    // If we found a source minion, preserve it and destroy all others
    if (sourceMinion) {
      // Get the ID of the source minion before we filter
      const sourceId = sourceMinion.instanceId;
      
      // Clear player's minions except the source
      state.players.player.battlefield = state.players.player.battlefield.filter(
        m => m.instanceId === sourceId
      );
      
      // Clear opponent's minions
      state.players.opponent.battlefield = [];
      
    } else {
      debug.error('Could not find source minion for World Ender battlecry');
    }
    
    // Handle discarding the player's hand if specified in the battlecry
    if (battlecry.discardCount !== undefined && battlecry.discardCount === -1) {
      // -1 is a special value that means "discard entire hand"
      state.players.player.hand = [];
    }
    
    return state;
  }
  
  // Resolve AoE via targetType or legacy affectsAllEnemies flag
  const aoeTgt = (battlecry as any).targetType as string | undefined;
  const isEnemyAoE = battlecry.affectsAllEnemies
    || aoeTgt === 'all_enemy_minions'
    || aoeTgt === 'all_enemies';
  const isAllMinionsAoE = aoeTgt === 'all_minions';

  if (isEnemyAoE || isAllMinionsAoE) {
    // Damage all enemy minions
    const oppBf = state.players.opponent.battlefield || [];
    const oppRemove: number[] = [];
    for (let i = 0; i < oppBf.length; i++) {
      const minion = oppBf[i];
      if (minion.currentHealth === undefined) {
        minion.currentHealth = (minion.card as MinionCardData).health || 1;
      }
      if (minion.hasDivineShield) {
        state.players.opponent.battlefield[i].hasDivineShield = false;
      } else {
        state.players.opponent.battlefield[i].currentHealth! -= damageAmount;
        if (state.players.opponent.battlefield[i].currentHealth! <= 0) {
          oppRemove.push(i);
        }
      }
    }
    for (let i = oppRemove.length - 1; i >= 0; i--) {
      state.players.opponent.battlefield.splice(oppRemove[i], 1);
    }

    // For 'all_enemies' also hit enemy hero
    if (aoeTgt === 'all_enemies') {
      state = dealDamage(state, 'opponent', 'hero', damageAmount);
    }

    // For 'all_minions' also hit friendly minions
    if (isAllMinionsAoE) {
      const plrBf = state.players.player.battlefield || [];
      const plrRemove: number[] = [];
      for (let i = 0; i < plrBf.length; i++) {
        const minion = plrBf[i];
        if (minion.currentHealth === undefined) {
          minion.currentHealth = (minion.card as MinionCardData).health || 1;
        }
        if (minion.hasDivineShield) {
          state.players.player.battlefield[i].hasDivineShield = false;
        } else {
          state.players.player.battlefield[i].currentHealth! -= damageAmount;
          if (state.players.player.battlefield[i].currentHealth! <= 0) {
            plrRemove.push(i);
          }
        }
      }
      for (let i = plrRemove.length - 1; i >= 0; i--) {
        state.players.player.battlefield.splice(plrRemove[i], 1);
      }
    }
  }
  
  // Handle discarding cards if specified in the battlecry for other cards too
  if (battlecry.discardCount) {
    if (battlecry.discardCount === -1) {
      // Discard entire hand
      state.players.player.hand = [];
    } else if (battlecry.discardCount > 0) {
      // Discard a specific number of cards
      const discardCount = Math.min(battlecry.discardCount, state.players.player.hand.length);
      
      if (discardCount > 0) {
        // Cards are usually discarded at random
        for (let i = 0; i < discardCount; i++) {
          if (state.players.player.hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * state.players.player.hand.length);
            const discardedCard = state.players.player.hand.splice(randomIndex, 1)[0];
          }
        }
      }
    }
  }
  
  return state;
}

/**
 * Execute a battlecry effect based on the card and chosen target
 */
/**
 * Execute a battlecry effect based on the card and chosen target
 * @param state Current game state
 * @param cardInstanceId ID of the card with the battlecry
 * @param targetId Optional ID of the target
 * @param targetType Optional type of the target (minion or hero)
 * @returns Updated game state after battlecry execution
 */
export function executeBattlecry(
  state: GameState,
  cardInstanceId: string,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  // Deep clone the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  try {
    // Find the card on the battlefield - the card should already be on the battlefield
    // at this point since playCard moves it there before calling executeBattlecry
    const player = newState.players.player;
    const playerBattlefield = player.battlefield || [];
    let cardInfo = findCardInstance(playerBattlefield, cardInstanceId);
    
    // If not found on battlefield, check the hand as a fallback
    // (though this shouldn't happen in normal gameplay)
    if (!cardInfo) {
      const playerHand = player.hand || [];
      cardInfo = findCardInstance(playerHand, cardInstanceId);
      
      if (!cardInfo) {
        const opponent = newState.players.opponent;
        const opponentBattlefield = opponent.battlefield || [];
        cardInfo = findCardInstance(opponentBattlefield, cardInstanceId);
        
        if (!cardInfo) {
          const opponentHand = opponent.hand || [];
          cardInfo = findCardInstance(opponentHand, cardInstanceId);
        }
        
        if (!cardInfo) {
          debug.error('Card not found for battlecry execution');
          debug.error(`Looking for card ID: ${cardInstanceId}`);
          debug.error(`Player battlefield cards: ${playerBattlefield.map(c => c.instanceId).join(', ')}`);
          debug.error(`Player hand cards: ${(player.hand || []).map(c => c.instanceId).join(', ')}`);
          debug.error(`Opponent battlefield cards: ${(opponent.battlefield || []).map(c => c.instanceId).join(', ')}`);
          debug.error(`Opponent hand cards: ${(opponent.hand || []).map(c => c.instanceId).join(', ')}`);
          return state;
        }
      }
    }
    
    const cardInstance = cardInfo.card;
    const minionCardData = cardInstance.card as MinionCardData;
    const battlecry = minionCardData.battlecry;
    
    // If the card doesn't have a battlecry, just return the current state
    if (!battlecry || !getCardKeywords(cardInstance.card).includes('battlecry')) {
      return newState;
    }
    
    
    // Check if battlecry has a condition and if it's met
    if (battlecry.condition) {
      // Check minion count condition for cards like Gormok the Impaler
      if (battlecry.condition === "minion_count" && battlecry.conditionValue) {
        // Get the number of friendly minions on the battlefield (excluding the card being played)
        const friendlyMinionCount = playerBattlefield.length - 1; // Subtract 1 to exclude the card being played
        
        // Log the condition check for debugging
        
        // If the condition is not met, don't execute the battlecry
        if (friendlyMinionCount < battlecry.conditionValue) {
          return newState; // Return without executing the battlecry
        }
        
      }
    }
    
    // Check if a target is required but not provided
    if (battlecry.requiresTarget && !targetId) {
      debug.error('Battlecry requires a target but none provided');
      return state;
    }
    
    // Process different battlecry types
    switch (battlecry.type) {
      case 'damage':
        return executeDamageBattlecry(newState, battlecry, targetId, targetType);
        
      case 'heal':
        return checkPetEvolutionTrigger(executeHealBattlecry(newState, battlecry, targetId, targetType), 'on_heal');

      case 'buff':
        return checkPetEvolutionTrigger(executeBuffBattlecry(newState, battlecry, targetId), 'on_buff');
        
      case 'summon':
        return executeSummonBattlecry(newState, battlecry);

      case 'summon_random':
        return executeSummonRandomBattlecry(newState, battlecry);

      case 'summon_copy':
        return executeSummonCopyBattlecry(newState, battlecry, cardInstanceId);

      case 'fill_board':
        return executeFillBoardBattlecry(newState, battlecry);

      case 'summon_yggdrasil_golem':
        return executeSummonYggdrasilGolemBattlecry(newState);

      case 'summon_random_minions':
        return executeSummonRandomMinionsBattlecry(newState, battlecry);

      case 'summon_copy_from_deck':
        return executeSummonCopyFromDeckBattlecry(newState, battlecry);

      case 'summon_from_spell_cost':
        return executeSummonFromSpellCostBattlecry(newState);

      case 'summon_skeletons_based_on_graveyard':
        return executeSummonSkeletonsBasedOnGraveyardBattlecry(newState, battlecry);
        
      case 'draw':
        return executeDrawBattlecry(newState, battlecry);
        
      case 'draw_both':
      case 'draw_both_players':
        return executeDrawBothBattlecry(newState, battlecry);
        
      case 'discover':
        return executeDiscoverBattlecry(newState, cardInstanceId, battlecry);
        
      case 'aoe_damage':
        return executeAoEDamageBattlecry(newState, battlecry, targetId, targetType);
        
      case 'transform':
        // Check if we have a target ID and a value to use as the cardId to transform into
        if (!targetId || !battlecry.value) {
          debug.error('Transform battlecry requires a target and a card ID to transform into');
          return state;
        }
        return transformMinion(newState, targetId, battlecry.value);
        
      case 'silence': {
        const silTarget = (battlecry as any).targetType as string | undefined;
        if (silTarget === 'random_enemy_minion') {
          const oppBf = newState.players.opponent.battlefield || [];
          if (oppBf.length > 0) {
            const randIdx = Math.floor(Math.random() * oppBf.length);
            newState = silenceMinion(newState, oppBf[randIdx].instanceId);
          }
          return checkPetEvolutionTrigger(newState, 'on_silence');
        }
        if (!targetId) {
          debug.error('Silence battlecry requires a target');
          return state;
        }
        return checkPetEvolutionTrigger(silenceMinion(newState, targetId), 'on_silence');
      }

      case 'silence_or_destroy_automaton': {
        if (!targetId) {
          debug.error('silence_or_destroy_automaton battlecry requires a target');
          return state;
        }
        newState = silenceMinion(newState, targetId);
        const allMinions = [...(newState.players.player.battlefield || []), ...(newState.players.opponent.battlefield || [])];
        const targetMinion = findCardInstance(allMinions, targetId);
        if (targetMinion) {
          const race = (targetMinion.card.card.race || '').toLowerCase();
          if (race === 'automaton' || race === 'mech') {
            const ownerKey = (newState.players.player.battlefield || []).some(m => m.instanceId === targetId) ? 'player' : 'opponent';
            newState = destroyCard(newState, targetId, ownerKey as 'player' | 'opponent');
          }
        }
        return checkPetEvolutionTrigger(newState, 'on_silence');
      }

      case 'set_health':
        // Execute a set health battlecry (like Alexstrasza)
        return executeSetHealthBattlecry(newState, battlecry, targetId, targetType);
        
      case 'cast_all_spells':
        // Execute a cast all spells battlecry (like Zul'jin)
        return executeCastAllSpellsBattlecry(newState);
        
      case 'set_hero_health':
        // Execute a set hero health battlecry (like Amara, Warden of Hope)
        const healthValue = battlecry.value || 40; // Default to 40 if not specified
        // Use the setHeroHealth function from healthModifierUtils
        // Target is always player for now
        return setHeroHealth(newState, 'player', healthValue, cardInstanceId);
        
      case 'debuff':
        // Execute a debuff battlecry (like Aldor Peacekeeper)
        return executeDebuffBattlecry(newState, battlecry, targetId);
        
      case 'add_to_hand':
        // Execute an add card to hand battlecry (like Swashburglar)
        return executeAddToHandBattlecry(newState, battlecry);
        
      case 'destroy':
        // Execute a destroy minion battlecry (like Void Terror, World Ender)
        return executeDestroyBattlecry(newState, battlecry, targetId);
        
      case 'copy':
        // Execute a copy battlecry (like Faceless Manipulator)
        return executeCopyBattlecry(newState, battlecry, targetId);

      case 'copy_to_hand':
        return executeCopyToHandBattlecry(newState, targetId);

      case 'return_to_hand':
      case 'return':
        // Execute a return to hand battlecry (like Youthful Brewmaster)
        // Use the specialized handler from returnHandler.ts
        if (cardInstance) {
          return executeReturnReturn(newState, battlecry, cardInstance, targetId);
        }
        return executeReturnToHandBattlecry(newState, battlecry, targetId);
        
      case 'equip_weapon':
        // Execute an equip weapon battlecry (like Arathi Weaponsmith)
        return executeEquipWeaponBattlecry(newState, battlecry);
        
      case 'freeze':
        // Execute a freeze battlecry (like Frost Elemental)
        return executeFreezeBattlecry(newState, battlecry, targetId, targetType);
      
      case 'mind_control':
        // Execute a mind control battlecry (like Sylvanas, Cabal Shadow Priest)
        return executeMindControlBattlecry(newState, battlecry, targetId);
        
      // Highlander card battlecries (no duplicates in deck)
      case 'conditional_free_hero_power':
        // Execute Bound-Spirit's battlecry (hero power costs 0)
        return executeRazaBattlecry(newState, 'player');
        
      // Elder Titan battlecries (Gullveig/Hyrrokkin/Utgarda-Loki — implemented in oldGodsUtils.ts)
      case 'cthun_damage':
        return executeCThunBattlecry(newState, cardInstanceId, 'player');

      case 'buff_cthun':
      case 'cthun_cultist_damage': {
        const buffAtk = battlecry.buffAttack || battlecry.value || 1;
        const buffHp = battlecry.buffHealth || battlecry.value || 1;
        return buffCThun(newState, 'player', buffAtk, buffHp);
      }

      case 'resurrect_deathrattle':
        return executeNZothBattlecry(newState, cardInstanceId, 'player');

      case 'yogg_saron':
        return executeYoggSaronBattlecry(newState, cardInstanceId, 'player');

      case 'conditional_self_buff':
        return executeConditionalSelfBuffBattlecry(newState, battlecry, cardInstanceId);
      case 'conditional_armor':
        return executeConditionalArmorBattlecry(newState, battlecry, cardInstanceId);
      case 'conditional_summon':
        return executeConditionalSummonBattlecry(newState, battlecry);
      case 'summon_by_condition':
        return executeSummonByConditionBattlecry(newState, battlecry);
        
      case 'heal_hero': {
        const healAmount = battlecry.value || 0;
        if (healAmount > 0) {
          let heroOwner: 'player' | 'opponent' = 'player';
          const onPlayerField = (newState.players.player.battlefield || []).some(c => c.instanceId === cardInstanceId);
          if (!onPlayerField) {
            const onOpponentField = (newState.players.opponent.battlefield || []).some(c => c.instanceId === cardInstanceId);
            if (onOpponentField) {
              heroOwner = 'opponent';
            }
          }
          const hero = newState.players[heroOwner];
          const maxHp = hero.maxHealth ?? 100;
          hero.heroHealth = Math.min(maxHp, (hero.heroHealth ?? hero.health ?? 0) + healAmount);
        }
        return newState;
      }
        
      case 'summon_parts':
        // Execute a battlecry to summon colossal parts
        // This will handle summoning the right parts for Neptulon and other colossal minions
        return executeSummonColossalPartsBattlecry(newState, cardInstanceId);
        
      case 'buff_tribe':
        // Execute a battlecry to buff all minions of a specific tribe
        // Used by cards like Coldlight Seer (Give your other Murlocs +2 Health)
        return executeBuffTribeBattlecry(newState, cardInstanceId, battlecry);
        
      case 'conditional_grant_keyword':
        return executeConditionalGrantKeywordBattlecry(newState, battlecry, cardInstanceId);
        
      case 'self_damage': {
        const selfDamage = battlecry.value || 0;
        if (selfDamage > 0) {
          let ownerKey: 'player' | 'opponent' = 'player';
          let idx = newState.players.player.battlefield.findIndex(c => c.instanceId === cardInstanceId);
          if (idx === -1) {
            idx = newState.players.opponent.battlefield.findIndex(c => c.instanceId === cardInstanceId);
            ownerKey = 'opponent';
          }
          if (idx !== -1) {
            const minion = newState.players[ownerKey].battlefield[idx];
            const currentHp = minion.currentHealth ?? (minion.card as any).health ?? 0;
            newState.players[ownerKey].battlefield[idx].currentHealth = currentHp - selfDamage;
            if (currentHp - selfDamage <= 0) {
              newState = destroyCard(newState, cardInstanceId, ownerKey);
            }
          }
        }
        return newState;
      }

      case 'self_damage_buff': {
        const dmg = battlecry.value || 0;
        let sdOwner: 'player' | 'opponent' = 'player';
        let sdIdx = newState.players.player.battlefield.findIndex(c => c.instanceId === cardInstanceId);
        if (sdIdx === -1) {
          sdIdx = newState.players.opponent.battlefield.findIndex(c => c.instanceId === cardInstanceId);
          sdOwner = 'opponent';
        }
        if (sdIdx !== -1) {
          const minion = newState.players[sdOwner].battlefield[sdIdx];
          const currentHp = minion.currentHealth ?? (minion.card as any).health ?? 0;
          if (dmg > 0) {
            minion.currentHealth = currentHp - dmg;
          }
          if ((battlecry as any).buff) {
            (minion.card as any).attack = ((minion.card as any).attack || 0) + ((battlecry as any).buff.attack || 0);
            minion.currentHealth = (minion.currentHealth || 0) + ((battlecry as any).buff.health || 0);
          }
          if ((minion.currentHealth || 0) <= 0) {
            newState = destroyCard(newState, cardInstanceId, sdOwner);
          }
        }
        return newState;
      }
        
      case 'deal_damage':
        return executeDamageBattlecry(newState, battlecry, targetId, targetType);

      case 'damage_aoe':
      case 'damage_all':
        return executeAoEDamageBattlecry(newState, battlecry, targetId, targetType);

      case 'buff_adjacent':
        return executeBuffAdjacentBattlecry(newState, battlecry, cardInstanceId);

      case 'summon_multiple':
        return executeSummonMultipleBattlecry(newState, battlecry);

      case 'buff_hand':
        return executeBuffHandBattlecry(newState, battlecry);

      case 'conditional_damage':
        return executeConditionalDamageBattlecry(newState, battlecry, targetId, targetType);

      case 'add_random_to_hand':
        return executeAddRandomToHandBattlecry(newState, battlecry);

      case 'buff_attack':
        return executeBuffAttackBattlecry(newState, battlecry, targetId);

      case 'recruit':
        return executeRecruitBattlecry(newState, battlecry);

      case 'summon_for_opponent':
        return executeSummonForOpponentBattlecry(newState, battlecry);

      case 'swap_stats':
        return executeSwapStatsBattlecry(newState, targetId);

      case 'give_mana':
        return executeGiveManaBattlecry(newState, battlecry);

      case 'heal_aoe':
        return executeHealAoeBattlecry(newState, battlecry);

      case 'buff_temp':
        return executeBuffTempBattlecry(newState, battlecry, targetId);

      case 'gain_temporary_mana':
        return executeGainTemporaryManaBattlecry(newState, battlecry);

      case 'buff_weapon':
        return executeBuffWeaponBattlecry(newState, battlecry);

      case 'reduce_next_spell_cost':
        return executeReduceNextSpellCostBattlecry(newState, battlecry);

      case 'add_card':
        return executeAddToHandBattlecry(newState, battlecry);

      case 'conditional_discover':
        return executeConditionalDiscoverBattlecry(newState, cardInstanceId, battlecry);

      case 'conditional_buff':
        return executeConditionalBuffBattlecry(newState, battlecry, cardInstanceId, targetId);

      case 'conditional_buff_and_taunt':
        return executeConditionalBuffAndTauntBattlecry(newState, battlecry, cardInstanceId, targetId);

      case 'give_divine_shield':
        return executeGiveDivineShieldBattlecry(newState, targetId);

      case 'grant_deathrattle':
        return executeGrantDeathrattleBattlecry(newState, battlecry, targetId);

      case 'mind_control_temporary':
        return executeMindControlTemporaryBattlecry(newState, targetId);

      case 'copy_from_opponent':
        return executeCopyFromOpponentBattlecry(newState, battlecry);

      case 'adapt':
        return executeAdaptBattlecry(newState, cardInstanceId);

      case 'summon_until_full':
        return executeSummonUntilFullBattlecry(newState, battlecry);

      case 'transform_friendly':
        return executeTransformFriendlyBattlecry(newState, battlecry, targetId);

      case 'trigger_deathrattle':
        return executeTriggerDeathrattleBattlecry(newState, targetId);

      case 'buff_and_damage':
        return executeBuffAndDamageBattlecry(newState, battlecry, cardInstanceId, targetId);

      case 'buff_and_taunt':
        return executeBuffAndTauntBattlecry(newState, battlecry, targetId || cardInstanceId);

      case 'buff_aoe':
        return executeBuffAoeBattlecry(newState, battlecry, cardInstanceId);

      case 'buff_beasts_in_hand':
        return executeBuffBeastsInHandBattlecry(newState, battlecry);

      case 'buff_by_hand_size':
        return executeBuffByHandSizeBattlecry(newState, battlecry, cardInstanceId);

      case 'buff_health_by_hand_size':
        return executeBuffHealthByHandSizeBattlecry(newState, cardInstanceId);

      case 'buff_per_card_in_hand':
        return executeBuffPerCardInHandBattlecry(newState, battlecry, cardInstanceId);

      case 'buff_per_dead_friendly_minion':
        return executeBuffPerDeadFriendlyMinionBattlecry(newState, battlecry, cardInstanceId);

      case 'buff_hero':
        return executeBuffHeroBattlecry(newState, battlecry);

      case 'brawl':
        return executeBrawlBattlecry(newState);

      case 'cast_opponent_spell':
        return executeCastOpponentSpellBattlecry(newState);

      case 'choose_keywords':
        return executeChooseKeywordsBattlecry(newState, cardInstanceId);

      case 'weapon_attack_buff':
        return executeWeaponAttackBuffBattlecry(newState, battlecry);

      case 'weapon_durability_damage':
        return executeWeaponDurabilityDamageBattlecry(newState, battlecry, targetId, targetType);

      case 'steal_from_deck':
        return executeStealFromDeckBattlecry(newState, battlecry);

      case 'swap_hands':
        return executeSwapHandsBattlecry(newState);

      case 'adapt_nagas':
        return executeAdaptNagasBattlecry(newState);

      case 'zephrys_wish':
        return executeDiscoverBattlecry(newState, cardInstanceId, battlecry);

      case 'summon_horseman':
        return executeSummonHorsemanBattlecry(newState, battlecry);

      case 'summon_random_mythic':
        return executeSummonRandomMythicBattlecry(newState);

      case 'summon_splitting':
        return executeSummonSplittingBattlecry(newState, battlecry);

      case 'summon_if_other_died':
        return executeSummonIfOtherDiedBattlecry(newState, battlecry);

      case 'summon_and_draw':
        return executeSummonAndDrawBattlecry(newState, battlecry);

      case 'summon_copy_from_hand':
        return executeSummonCopyFromHandBattlecry(newState);

      case 'summon_from_both_hands':
        return executeSummonFromBothHandsBattlecry(newState);

      case 'summon_from_opponent_hand':
        return executeSummonFromOpponentHandBattlecry(newState);

      case 'summon_all_totems':
        return executeSummonAllTotemsBattlecry(newState);

      case 'summon_defender':
        return executeSummonDefenderBattlecry(newState, battlecry);

      case 'summon_dead_einherjar': {
        const gy = newState.players.player.graveyard || [];
        const deadEinherjar = gy.filter(
          m => m.card.type === 'minion' && hasKeyword(m, 'einherjar')
        );
        const bf = newState.players.player.battlefield;
        for (const dead of deadEinherjar) {
          if (bf.length >= MAX_BATTLEFIELD_SIZE) break;
          const resummoned: CardInstance = {
            ...JSON.parse(JSON.stringify(dead)),
            instanceId: uuidv4(),
            canAttack: false,
            isSummoningSick: true,
            currentHealth: (dead.card as any).health || 1,
            currentAttack: (dead.card as any).attack || 0,
          };
          bf.push(resummoned);
        }
        return newState;
      }

      case 'gain_armor': {
        const armorVal = battlecry.value || 0;
        newState.players.player.heroArmor = Math.min(30, (newState.players.player.heroArmor || 0) + armorVal);
        return newState;
      }

      case 'grant_divine_shield':
        return executeGiveDivineShieldBattlecry(newState, targetId);

      case 'freeze_and_damage': {
        const frzDmg = battlecry.value || 1;
        const frzTgt = (battlecry as any).targetType as string | undefined;
        if (frzTgt === 'all_enemies') {
          for (let i = 0; i < newState.players.opponent.battlefield.length; i++) {
            const m = newState.players.opponent.battlefield[i];
            m.isFrozen = true;
            if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
            if (m.hasDivineShield) {
              m.hasDivineShield = false;
            } else {
              m.currentHealth -= frzDmg;
            }
          }
          newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(
            m => (m.currentHealth ?? 1) > 0
          );
          newState = dealDamage(newState, 'opponent', 'hero', frzDmg);
        }
        return newState;
      }

      case 'silence_and_damage': {
        const silDmg = battlecry.value || 1;
        const silTgt = (battlecry as any).targetType as string | undefined;
        if (silTgt === 'all_enemy_minions') {
          for (let i = 0; i < newState.players.opponent.battlefield.length; i++) {
            const m = newState.players.opponent.battlefield[i];
            newState = silenceMinion(newState, m.instanceId);
          }
          const oppBf = newState.players.opponent.battlefield;
          for (let i = 0; i < oppBf.length; i++) {
            if (oppBf[i].currentHealth === undefined) oppBf[i].currentHealth = (oppBf[i].card as MinionCardData).health || 1;
            if (oppBf[i].hasDivineShield) {
              oppBf[i].hasDivineShield = false;
            } else {
              oppBf[i].currentHealth! -= silDmg;
            }
          }
          newState.players.opponent.battlefield = oppBf.filter(m => (m.currentHealth ?? 1) > 0);
        }
        return newState;
      }

      case 'bounce': {
        const bncTgt = (battlecry as any).targetType as string | undefined;
        if (bncTgt === 'enemy_minion' && targetId) {
          const oppBf = newState.players.opponent.battlefield;
          const idx = oppBf.findIndex(m => m.instanceId === targetId);
          if (idx !== -1) {
            const bounced = oppBf.splice(idx, 1)[0];
            if (newState.players.opponent.hand.length < MAX_HAND_SIZE) {
              bounced.isPlayed = false;
              bounced.isSummoningSick = true;
              bounced.canAttack = false;
              newState.players.opponent.hand.push(bounced);
            }
          }
        } else if (bncTgt === 'all_enemy_minions_low_attack') {
          const atkThreshold = battlecry.value || 3;
          const oppBf = newState.players.opponent.battlefield;
          const toReturn = oppBf.filter(m => {
            const atk = m.currentAttack ?? (m.card as MinionCardData).attack ?? 0;
            return atk <= atkThreshold;
          });
          newState.players.opponent.battlefield = oppBf.filter(m => {
            const atk = m.currentAttack ?? (m.card as MinionCardData).attack ?? 0;
            return atk > atkThreshold;
          });
          for (const card of toReturn) {
            if (newState.players.opponent.hand.length < MAX_HAND_SIZE) {
              card.isPlayed = false;
              card.isSummoningSick = true;
              card.canAttack = false;
              newState.players.opponent.hand.push(card);
            }
          }
        }
        return newState;
      }

      case 'sacrifice_and_devastate': {
        const currentP = newState.currentTurn;
        const opponentKey = currentP === 'player' ? 'opponent' : 'player';
        const selfCard = newState.players[currentP].battlefield.find(
          (m: CardInstance) => m.instanceId === cardInstanceId
        );

        // Destroy all other minions on both sides, count kills
        let killCount = 0;
        const friendlyOthers = newState.players[currentP].battlefield
          .filter((m: CardInstance) => m.instanceId !== cardInstanceId)
          .map((m: CardInstance) => m.instanceId);
        const enemyAll = newState.players[opponentKey].battlefield
          .map((m: CardInstance) => m.instanceId);

        for (const id of friendlyOthers) {
          newState = destroyCard(newState, id, currentP);
          killCount++;
        }
        for (const id of enemyAll) {
          newState = destroyCard(newState, id, opponentKey);
          killCount++;
        }

        // Buff Behemoth +2/+2 per kill
        if (selfCard && killCount > 0) {
          const refreshed = newState.players[currentP].battlefield.find(
            (m: CardInstance) => m.instanceId === cardInstanceId
          );
          if (refreshed) {
            refreshed.currentAttack = (refreshed.currentAttack ?? (refreshed.card as MinionCardData).attack ?? 0) + (killCount * 2);
            refreshed.currentHealth = (refreshed.currentHealth ?? (refreshed.card as MinionCardData).health ?? 0) + (killCount * 2);
          }
        }

        // Opponent discards their highest cost card
        const oppHand = newState.players[opponentKey].hand;
        if (oppHand.length > 0) {
          let highestIdx = 0;
          let highestCost = oppHand[0].card.manaCost ?? 0;
          for (let i = 1; i < oppHand.length; i++) {
            const cost = oppHand[i].card.manaCost ?? 0;
            if (cost > highestCost) {
              highestCost = cost;
              highestIdx = i;
            }
          }
          oppHand.splice(highestIdx, 1);
        }

        return newState;
      }

      case 'submerge': {
        return executeSubmergeBattlecry(newState, battlecry, cardInstanceId);
      }

      case 'coil_enemy': {
        return executeCoilEnemyBattlecry(newState, battlecry, cardInstanceId, targetId);
      }

      case 'blood_price_count_aoe': {
        return executeBloodPriceCountAoE(newState, cardInstanceId);
      }

      case 'destroy_weapon_or_artifact': {
        return executeDestroyWeaponOrArtifact(newState);
      }

      case 'buff_einherjar_in_deck': {
        return executeBuffEinherjarInDeck(newState, battlecry);
      }

      case 'conditional_draw':
        return executeConditionalDrawBattlecry(newState, battlecry);

      case 'grant_persistent_effect': {
        const gpe = battlecry as any;
        if (gpe.targetType === 'self') {
          const selfMinion = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
          if (selfMinion && gpe.effect) {
            addKeyword(selfMinion, gpe.effect);
          }
        } else if (gpe.targetType === 'friendly_mech' || gpe.targetType === 'friendly_automaton') {
          for (const m of newState.players.player.battlefield) {
            const race = ((m.card as any).race || '').toLowerCase();
            if (race === 'automaton' || race === 'mech') {
              if (gpe.effect) addKeyword(m, gpe.effect);
            }
          }
        }
        return newState;
      }

      case 'summon_copy_if_blood': {
        if (!checkBattlecryCondition(newState, 'blood_price_paid')) return newState;
        if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
        const srcMinion = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (srcMinion) {
          const copy = createCardInstance(srcMinion.card);
          copy.isSummoningSick = true;
          copy.isPlayed = true;
          copy.currentHealth = (srcMinion.card as MinionCardData).health || 1;
          newState.players.player.battlefield.push(copy);
        }
        return newState;
      }

      case 'destroy_random_enemy': {
        const dreOppBf = newState.players.opponent.battlefield || [];
        if (dreOppBf.length > 0) {
          const dreRandIdx = Math.floor(Math.random() * dreOppBf.length);
          const dreTarget = dreOppBf[dreRandIdx];
          newState = destroyCard(newState, dreTarget.instanceId, 'opponent');
        }
        return newState;
      }

      case 'destroy_target': {
        if (!targetId) return newState;
        const dtOnOpp = (newState.players.opponent.battlefield || []).some(m => m.instanceId === targetId);
        newState = destroyCard(newState, targetId, dtOnOpp ? 'opponent' : 'player');
        return newState;
      }

      case 'conditional_buff_and_add': {
        const cba = battlecry as any;
        if (checkBattlecryCondition(newState, cba.condition || '')) {
          const cbaMinion = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
          if (cbaMinion) {
            cbaMinion.currentAttack = (cbaMinion.currentAttack ?? (cbaMinion.card as MinionCardData).attack ?? 0) + (cba.buffAttack || 0);
            cbaMinion.currentHealth = (cbaMinion.currentHealth ?? (cbaMinion.card as MinionCardData).health ?? 0) + (cba.buffHealth || 0);
          }
        }
        return newState;
      }

      case 'gain_stealth_until_next_turn': {
        const stealthMinion = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (stealthMinion) {
          (stealthMinion as any).hasStealth = true;
          (stealthMinion as any).stealthUntilNextTurn = true;
        }
        return newState;
      }

      case 'reduce_hero_power_cost': {
        const rpCost = battlecry.value ?? 0;
        const rpPlayer = newState.players.player;
        if ((rpPlayer as any).heroPower) {
          (rpPlayer as any).heroPower.manaCost = rpCost;
        }
        return newState;
      }

      case 'deal_damage_to_hero': {
        const heroDmg = battlecry.value || 1;
        return dealDamage(newState, 'opponent', 'hero', heroDmg);
      }

      case 'conditional_gain_taunt': {
        const cgt = battlecry as any;
        if (checkBattlecryCondition(newState, cgt.condition || '')) {
          const cgtMinion = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
          if (cgtMinion) {
            (cgtMinion as any).hasTaunt = true;
          }
        }
        return newState;
      }

      case 'conditional_adapt': {
        const caEffect = battlecry as any;
        if (checkBattlecryCondition(newState, caEffect.condition || '')) {
          return executeAdaptBattlecry(newState, cardInstanceId);
        }
        return newState;
      }

      case 'copy_from_opponent_hand': {
        const cfohHand = newState.players.opponent.hand || [];
        const cfohCount = battlecry.value || 1;
        for (let i = 0; i < cfohCount; i++) {
          if (cfohHand.length === 0 || newState.players.player.hand.length >= MAX_HAND_SIZE) break;
          const cfohIdx = Math.floor(Math.random() * cfohHand.length);
          const cfohCopy = createCardInstance(cfohHand[cfohIdx].card);
          newState.players.player.hand.push(cfohCopy);
        }
        return newState;
      }

      case 'destroy_and_buff': {
        const dab = battlecry as any;
        if (!targetId) return newState;
        const dabOnOpp = (newState.players.opponent.battlefield || []).some(m => m.instanceId === targetId);
        const dabOwner = dabOnOpp ? 'opponent' : 'player';
        newState = destroyCard(newState, targetId, dabOwner);
        const dabSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (dabSelf) {
          dabSelf.currentAttack = (dabSelf.currentAttack ?? (dabSelf.card as MinionCardData).attack ?? 0) + (dab.buffAttack || 0);
          dabSelf.currentHealth = (dabSelf.currentHealth ?? (dabSelf.card as MinionCardData).health ?? 0) + (dab.buffHealth || 0);
        }
        return newState;
      }

      case 'conditional_mind_control': {
        const cmcEffect = battlecry as any;
        if (!checkBattlecryCondition(newState, cmcEffect.condition || '')) return newState;
        const cmcOppBf = newState.players.opponent.battlefield || [];
        if (cmcOppBf.length === 0 || newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
        const cmcIdx = Math.floor(Math.random() * cmcOppBf.length);
        const cmcStolen = cmcOppBf.splice(cmcIdx, 1)[0];
        cmcStolen.isSummoningSick = true;
        cmcStolen.canAttack = false;
        newState.players.player.battlefield.push(cmcStolen);
        return newState;
      }

      case 'copy_deathrattle': {
        if (!targetId) return newState;
        const cdBf = newState.players.player.battlefield || [];
        const cdTarget = cdBf.find(c => c.instanceId === targetId);
        const cdSelf = cdBf.find(c => c.instanceId === cardInstanceId);
        if (cdTarget && cdSelf) {
          const cdData = cdTarget.card as MinionCardData;
          if (cdData.deathrattle) {
            (cdSelf.card as any).deathrattle = JSON.parse(JSON.stringify(cdData.deathrattle));
            const kw = cdSelf.card.keywords || [];
            if (!kw.includes('deathrattle')) {
              cdSelf.card.keywords = [...kw, 'deathrattle'];
            }
          }
        }
        return newState;
      }

      case 'mass_silence': {
        const msTargetType = (battlecry as any).targetType as string | undefined;
        const msTargets = msTargetType === 'all_enemy_minions'
          ? [...newState.players.opponent.battlefield]
          : [...newState.players.player.battlefield, ...newState.players.opponent.battlefield];
        for (const m of msTargets) {
          newState = silenceMinion(newState, m.instanceId);
        }
        return newState;
      }

      case 'cost_reduction': {
        const crEffect = battlecry as any;
        const crValue = crEffect.value || 1;
        const crCardType = crEffect.cardType?.toLowerCase();
        for (const c of newState.players.player.hand) {
          if (crCardType && c.card.type !== crCardType) continue;
          c.card = { ...c.card, manaCost: Math.max(0, (c.card.manaCost ?? 0) - crValue) };
        }
        return newState;
      }

      case 'joust': {
        const jstEffect = battlecry as any;
        const jstPlayerDeck = newState.players.player.deck;
        const jstOppDeck = newState.players.opponent.deck;
        if (jstPlayerDeck.length === 0 || jstOppDeck.length === 0) return newState;
        const jstPlayerCard = jstPlayerDeck[Math.floor(Math.random() * jstPlayerDeck.length)];
        const jstOppCard = jstOppDeck[Math.floor(Math.random() * jstOppDeck.length)];
        const jstPlayerCost = jstPlayerCard.manaCost ?? 0;
        const jstOppCost = jstOppCard.manaCost ?? 0;
        if (jstPlayerCost > jstOppCost && jstEffect.winEffect === 'draw') {
          if (jstPlayerDeck.length > 0 && newState.players.player.hand.length < MAX_HAND_SIZE) {
            const drawn = jstPlayerDeck.shift()!;
            newState.players.player.hand.push(createCardInstance(drawn));
          }
        }
        return newState;
      }

      case 'increase_spell_cost': {
        const iscEffect = battlecry as any;
        const iscValue = iscEffect.value || 1;
        if (!(newState.players.opponent as any).activeEffects) (newState.players.opponent as any).activeEffects = [];
        ((newState.players.opponent as any).activeEffects as any[]).push({
          type: 'spell_cost_increase',
          value: iscValue,
          duration: iscEffect.duration || 1,
          source: cardInstanceId
        });
        return newState;
      }

      case 'draw_for_both':
        return executeDrawBothBattlecry(newState, battlecry);

      case 'grant_keyword_adjacent': {
        const gkaEffect = battlecry as any;
        const gkaKeywords = gkaEffect.grantKeywords || [];
        const gkaBf = newState.players.player.battlefield || [];
        const gkaSelfIdx = gkaBf.findIndex(c => c.instanceId === cardInstanceId);
        if (gkaSelfIdx === -1) return newState;
        const gkaAdjIdxs = [gkaSelfIdx - 1, gkaSelfIdx + 1];
        for (const idx of gkaAdjIdxs) {
          if (idx >= 0 && idx < gkaBf.length) {
            for (const kw of gkaKeywords) {
              addKeyword(gkaBf[idx], kw);
              if (kw === 'taunt') (gkaBf[idx] as any).hasTaunt = true;
            }
          }
        }
        return newState;
      }

      case 'copy_minion': {
        if (!targetId) return newState;
        return executeCopyBattlecry(newState, { ...battlecry, requiresTarget: true }, targetId);
      }

      case 'destroy_weapon': {
        const dwOpp = newState.players.opponent;
        if ((dwOpp as any).weapon) {
          (dwOpp as any).weapon = undefined;
        }
        return newState;
      }

      case 'destroy_weapon_draw': {
        const dwdOpp = newState.players.opponent;
        if ((dwdOpp as any).weapon) {
          (dwdOpp as any).weapon = undefined;
          if (newState.players.player.deck.length > 0 && newState.players.player.hand.length < MAX_HAND_SIZE) {
            const dwdDrawn = newState.players.player.deck.shift()!;
            newState.players.player.hand.push(createCardInstance(dwdDrawn));
          }
        }
        return newState;
      }

      case 'destroy_all_and_discard': {
        newState.players.player.battlefield = newState.players.player.battlefield.filter(
          m => m.instanceId === cardInstanceId
        );
        newState.players.opponent.battlefield = [];
        newState.players.player.hand = [];
        return newState;
      }

      case 'gain_weapon_attack': {
        const gwaWpn = (newState.players.player as any).weapon;
        if (gwaWpn) {
          const gwaMinion = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
          if (gwaMinion) {
            const gwaAtk = gwaWpn.attack || 0;
            gwaMinion.currentAttack = (gwaMinion.currentAttack ?? (gwaMinion.card as MinionCardData).attack ?? 0) + gwaAtk;
          }
        }
        return newState;
      }

      case 'conditional_destroy': {
        const cdEffect = battlecry as any;
        if (!checkBattlecryCondition(newState, cdEffect.condition || '')) return newState;
        if (!targetId) return newState;
        if (cdEffect.attackFilter) {
          const cdAllM = [...(newState.players.opponent.battlefield || []), ...(newState.players.player.battlefield || [])];
          const cdTgt = cdAllM.find(m => m.instanceId === targetId);
          if (cdTgt) {
            const cdAtk = cdTgt.currentAttack ?? (cdTgt.card as MinionCardData).attack ?? 0;
            if (cdAtk > cdEffect.attackFilter) return newState;
          }
        }
        const cdOnOpp = (newState.players.opponent.battlefield || []).some(m => m.instanceId === targetId);
        newState = destroyCard(newState, targetId, cdOnOpp ? 'opponent' : 'player');
        return newState;
      }

      case 'conditional_buff_and_rush': {
        const cbrEffect = battlecry as any;
        if (!checkBattlecryCondition(newState, cbrEffect.condition || '')) return newState;
        const cbrMinion = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (cbrMinion) {
          cbrMinion.currentAttack = (cbrMinion.currentAttack ?? (cbrMinion.card as MinionCardData).attack ?? 0) + (cbrEffect.buffAttack || 0);
          cbrMinion.currentHealth = (cbrMinion.currentHealth ?? (cbrMinion.card as MinionCardData).health ?? 0) + (cbrEffect.buffHealth || 0);
          if (cbrEffect.grantRush) {
            addKeyword(cbrMinion, 'rush');
            cbrMinion.canAttack = true;
            cbrMinion.isSummoningSick = false;
          }
        }
        return newState;
      }

      case 'draw_until_non_dragon': {
        const dunPlayer = newState.players.player;
        while (dunPlayer.deck.length > 0 && dunPlayer.hand.length < MAX_HAND_SIZE) {
          const dunTop = dunPlayer.deck[0];
          const dunIsDragon = isCardOfTribe(dunTop, 'dragon');
          const dunDrawn = dunPlayer.deck.shift()!;
          dunPlayer.hand.push(createCardInstance(dunDrawn));
          if (!dunIsDragon) break;
        }
        return newState;
      }

      case 'extra_turns': {
        const etEffect = battlecry as any;
        if (!(newState.players.player as any).activeEffects) (newState.players.player as any).activeEffects = [];
        if (etEffect.opponentTurns) {
          if (!(newState.players.opponent as any).activeEffects) (newState.players.opponent as any).activeEffects = [];
          ((newState.players.opponent as any).activeEffects as any[]).push({
            type: 'extra_turns',
            value: etEffect.opponentTurns,
            source: cardInstanceId
          });
        }
        if (etEffect.playerTurns) {
          ((newState.players.player as any).activeEffects as any[]).push({
            type: 'extra_turns',
            value: etEffect.playerTurns,
            source: cardInstanceId
          });
        }
        return newState;
      }

      case 'conditional_craft_spell': {
        const ccsEffect = battlecry as any;
        if (!checkBattlecryCondition(newState, ccsEffect.condition || '')) return newState;
        return executeDiscoverBattlecry(newState, cardInstanceId, {
          ...battlecry,
          type: 'discover',
          cardType: ccsEffect.spellType || 'spell',
        });
      }

      case 'lose_health_per_opponent_cards': {
        const lhpocSize = (newState.players.opponent.hand || []).length;
        if (lhpocSize > 0) {
          newState = dealDamage(newState, 'player', 'hero', lhpocSize);
        }
        return newState;
      }

      case 'damage_equal_to_attack':
      case 'deal_damage_equal_to_attack': {
        if (!targetId) return newState;
        const deaMinion = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        const deaAtk = deaMinion
          ? (deaMinion.currentAttack ?? (deaMinion.card as MinionCardData).attack ?? 0)
          : 0;
        if (deaAtk <= 0) return newState;
        const deaOnOpp = (newState.players.opponent.battlefield || []).some(m => m.instanceId === targetId);
        if (deaOnOpp) {
          const deaTgt = newState.players.opponent.battlefield.find(m => m.instanceId === targetId);
          if (deaTgt) {
            if (deaTgt.currentHealth === undefined) deaTgt.currentHealth = (deaTgt.card as MinionCardData).health || 1;
            if (deaTgt.hasDivineShield) {
              deaTgt.hasDivineShield = false;
            } else {
              deaTgt.currentHealth -= deaAtk;
              if (deaTgt.currentHealth <= 0) {
                newState = destroyCard(newState, targetId, 'opponent');
              }
            }
          }
        } else if (targetType === 'hero') {
          newState = dealDamage(newState, 'opponent', 'hero', deaAtk);
        }
        return newState;
      }

      case 'give_opponent_cards': {
        const gocEffect = battlecry as any;
        const gocCardId = gocEffect.cardId;
        const gocCount = gocEffect.count || 1;
        const gocCardData = getCardById(gocCardId);
        if (!gocCardData) return newState;
        for (let i = 0; i < gocCount; i++) {
          if (newState.players.opponent.hand.length >= MAX_HAND_SIZE) break;
          newState.players.opponent.hand.push(createCardInstance(gocCardData));
        }
        return newState;
      }

      case 'draw_per_spell_cast': {
        const dpsEffect = battlecry as any;
        const dpsSpells = (newState.gameLog || []).filter(
          entry => entry.player === newState.currentTurn && entry.type === 'spell_cast'
        ).length;
        const dpsCount = Math.min(dpsSpells, dpsEffect.maxValue || 3);
        for (let i = 0; i < dpsCount; i++) {
          if (newState.players.player.deck.length === 0 || newState.players.player.hand.length >= MAX_HAND_SIZE) break;
          const dpsDrawn = newState.players.player.deck.shift()!;
          newState.players.player.hand.push(createCardInstance(dpsDrawn));
        }
        return newState;
      }

      case 'draw_until_hand_size': {
        const duhsEffect = battlecry as any;
        const duhsTarget = duhsEffect.targetHandSize || 5;
        const duhsPlayer = newState.players.player;
        while (duhsPlayer.hand.length < duhsTarget && duhsPlayer.deck.length > 0) {
          const duhsDrawn = duhsPlayer.deck.shift()!;
          duhsPlayer.hand.push(createCardInstance(duhsDrawn));
        }
        return newState;
      }

      case 'copy_random_card_in_hand': {
        const crcHand = newState.players.player.hand || [];
        if (crcHand.length === 0 || crcHand.length >= MAX_HAND_SIZE) return newState;
        const crcIdx = Math.floor(Math.random() * crcHand.length);
        const crcCopy = createCardInstance(crcHand[crcIdx].card);
        newState.players.player.hand.push(crcCopy);
        return newState;
      }

      case 'set_random_card_cost': {
        const srcEffect = battlecry as any;
        const srcCost = srcEffect.value ?? 1;
        const srcHand = newState.players.player.hand || [];
        if (srcHand.length === 0) return newState;
        const srcIdx = Math.floor(Math.random() * srcHand.length);
        srcHand[srcIdx].card = { ...srcHand[srcIdx].card, manaCost: srcCost };
        return newState;
      }

      case 'increase_opponent_costs': {
        const iocEffect = battlecry as any;
        const iocValue = iocEffect.value || 1;
        if (!(newState.players.opponent as any).activeEffects) (newState.players.opponent as any).activeEffects = [];
        ((newState.players.opponent as any).activeEffects as any[]).push({
          type: 'cost_increase_all',
          value: iocValue,
          duration: iocEffect.duration || 'next_turn',
          source: cardInstanceId
        });
        return newState;
      }

      case 'copy_minion_to_hand': {
        if (!targetId) return newState;
        const cmthAll = [...(newState.players.player.battlefield || []), ...(newState.players.opponent.battlefield || [])];
        const cmthTgt = cmthAll.find(m => m.instanceId === targetId);
        if (!cmthTgt || newState.players.player.hand.length >= MAX_HAND_SIZE) return newState;
        const cmthCopy = createCardInstance(cmthTgt.card);
        newState.players.player.hand.push(cmthCopy);
        return newState;
      }

      case 'draw_tribes': {
        const dtEffect = battlecry as any;
        const dtTribes: string[] = dtEffect.tribes || [];
        const dtPlayer = newState.players.player;
        for (const tribe of dtTribes) {
          const dtIdx = dtPlayer.deck.findIndex(c => isCardOfTribe(c, tribe.toLowerCase()));
          if (dtIdx !== -1 && dtPlayer.hand.length < MAX_HAND_SIZE) {
            const dtDrawn = dtPlayer.deck.splice(dtIdx, 1)[0];
            dtPlayer.hand.push(createCardInstance(dtDrawn));
          }
        }
        return newState;
      }

      case 'draw_lowest_cost_minion': {
        const dlcPlayer = newState.players.player;
        if (dlcPlayer.hand.length >= MAX_HAND_SIZE) return newState;
        let dlcLowestCost = Infinity;
        let dlcLowestIdx = -1;
        for (let i = 0; i < dlcPlayer.deck.length; i++) {
          if (dlcPlayer.deck[i].type === 'minion' && (dlcPlayer.deck[i].manaCost ?? 0) < dlcLowestCost) {
            dlcLowestCost = dlcPlayer.deck[i].manaCost ?? 0;
            dlcLowestIdx = i;
          }
        }
        if (dlcLowestIdx !== -1) {
          const dlcDrawn = dlcPlayer.deck.splice(dlcLowestIdx, 1)[0];
          dlcPlayer.hand.push(createCardInstance(dlcDrawn));
        }
        return newState;
      }

      case 'draw_tribe': {
        const dtbEffect = battlecry as any;
        const dtbTribe = (dtbEffect.tribe || '').toLowerCase();
        const dtbPlayer = newState.players.player;
        const dtbIdx = dtbPlayer.deck.findIndex(c => isCardOfTribe(c, dtbTribe));
        if (dtbIdx !== -1 && dtbPlayer.hand.length < MAX_HAND_SIZE) {
          const dtbDrawn = dtbPlayer.deck.splice(dtbIdx, 1)[0];
          dtbPlayer.hand.push(createCardInstance(dtbDrawn));
        }
        return newState;
      }

      case 'destroy_and_shuffle': {
        if (!targetId) return newState;
        const dasAllM = [...(newState.players.player.battlefield || []), ...(newState.players.opponent.battlefield || [])];
        const dasTgt = dasAllM.find(m => m.instanceId === targetId);
        if (!dasTgt) return newState;
        const dasOnOpp = (newState.players.opponent.battlefield || []).some(m => m.instanceId === targetId);
        const dasOwner = dasOnOpp ? 'opponent' : 'player';
        const dasCardData = { ...dasTgt.card };
        newState = destroyCard(newState, targetId, dasOwner);
        const dasEffect = battlecry as any;
        const dasShuffleTarget = dasEffect.shuffleTarget === 'opponent_deck' ? 'opponent' : dasOwner;
        const dasDeck = newState.players[dasShuffleTarget].deck;
        const dasInsertIdx = Math.floor(Math.random() * (dasDeck.length + 1));
        dasDeck.splice(dasInsertIdx, 0, dasCardData);
        return newState;
      }

      case 'increase_hero_power_cost': {
        const ihpcEffect = battlecry as any;
        const ihpcValue = ihpcEffect.value || 5;
        const ihpcOpp = newState.players.opponent;
        if ((ihpcOpp as any).heroPower) {
          (ihpcOpp as any).heroPower.manaCost = ((ihpcOpp as any).heroPower.manaCost || 2) + ihpcValue;
        }
        return newState;
      }

      case 'draw_and_set_cost': {
        const dascEffect = battlecry as any;
        const dascDrawCount = dascEffect.drawCount || 1;
        const dascSetCost = dascEffect.setCost ?? 5;
        const dascPlayer = newState.players.player;
        for (let i = 0; i < dascDrawCount; i++) {
          if (dascPlayer.deck.length === 0 || dascPlayer.hand.length >= MAX_HAND_SIZE) break;
          const dascDrawn = dascPlayer.deck.shift()!;
          const dascInst = createCardInstance({ ...dascDrawn, manaCost: dascSetCost });
          dascPlayer.hand.push(dascInst);
        }
        return newState;
      }

      case 'deathrattle_double': {
        if (!(newState.players.player as any).activeEffects) (newState.players.player as any).activeEffects = [];
        ((newState.players.player as any).activeEffects as any[]).push({
          type: 'deathrattle_double',
          duration: 'this_turn',
          source: cardInstanceId
        });
        return newState;
      }

      case 'conditional_buff_deck': {
        const cbdEffect = battlecry as any;
        if (!checkBattlecryCondition(newState, cbdEffect.condition || '')) return newState;
        const cbdBuffAtk = cbdEffect.buffAttack || 0;
        const cbdBuffHp = cbdEffect.buffHealth || 0;
        for (let i = 0; i < newState.players.player.deck.length; i++) {
          const cbdCard = newState.players.player.deck[i];
          if (cbdCard.type !== 'minion') continue;
          const cbdMc = cbdCard as MinionCardData;
          newState.players.player.deck[i] = {
            ...cbdMc,
            attack: (cbdMc.attack || 0) + cbdBuffAtk,
            health: (cbdMc.health || 0) + cbdBuffHp,
          };
        }
        return newState;
      }

      case 'transform_and_silence': {
        const tasTargetType = (battlecry as any).targetType as string | undefined;
        if (tasTargetType === 'all_enemy_minions') {
          const tasOppBf = newState.players.opponent.battlefield || [];
          for (let i = 0; i < tasOppBf.length; i++) {
            newState = silenceMinion(newState, tasOppBf[i].instanceId);
            const m = newState.players.opponent.battlefield[i];
            if (m) {
              m.currentAttack = 1;
              m.currentHealth = 1;
              m.card = { ...m.card, name: 'Sheep', attack: 1, health: 1 } as any;
            }
          }
        } else if (targetId) {
          newState = silenceMinion(newState, targetId);
          const tasAllM = [...(newState.players.player.battlefield || []), ...(newState.players.opponent.battlefield || [])];
          const tasTgt = tasAllM.find(m => m.instanceId === targetId);
          if (tasTgt) {
            tasTgt.currentAttack = 1;
            tasTgt.currentHealth = 1;
            tasTgt.card = { ...tasTgt.card, name: 'Sheep', attack: 1, health: 1 } as any;
          }
        }
        return newState;
      }

      case 'summon_token': {
        const stEffect = battlecry as any;
        const stTokenIds = [stEffect.summonCardId, ...(stEffect.additionalSummons || [])];
        for (const stTokenId of stTokenIds) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const stTokenCard = getCardById(stTokenId);
          if (stTokenCard) {
            const stInst = createCardInstance(stTokenCard);
            stInst.isSummoningSick = true;
            stInst.isPlayed = true;
            stInst.currentHealth = (stTokenCard as MinionCardData).health || 1;
            newState.players.player.battlefield.push(stInst);
          }
        }
        return newState;
      }

      case 'damage_and_buff': {
        const dnbEffect = battlecry as any;
        const dnbDmg = dnbEffect.value || 1;
        const dnbBuffAtk = dnbEffect.buffAttack || 0;
        if (!targetId) return newState;
        const dnbAllM = [...(newState.players.player.battlefield || []), ...(newState.players.opponent.battlefield || [])];
        const dnbTgt = dnbAllM.find(m => m.instanceId === targetId);
        if (dnbTgt) {
          if (dnbTgt.currentHealth === undefined) dnbTgt.currentHealth = (dnbTgt.card as MinionCardData).health || 1;
          if (dnbTgt.hasDivineShield) {
            dnbTgt.hasDivineShield = false;
          } else {
            dnbTgt.currentHealth -= dnbDmg;
          }
          const dnbSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
          if (dnbSelf) {
            dnbSelf.currentAttack = (dnbSelf.currentAttack ?? (dnbSelf.card as MinionCardData).attack ?? 0) + dnbBuffAtk;
          }
          const dnbOnOpp = (newState.players.opponent.battlefield || []).some(m => m.instanceId === targetId);
          if (dnbTgt.currentHealth <= 0) {
            newState = destroyCard(newState, targetId, dnbOnOpp ? 'opponent' : 'player');
          }
        }
        return newState;
      }

      case 'equip_helgrind':
        return executeEquipWeaponBattlecry(newState, { ...battlecry, type: 'equip_weapon' });

      case 'consume_adjacent': {
        const caBf = newState.players.player.battlefield || [];
        const caSelfIdx = caBf.findIndex(c => c.instanceId === cardInstanceId);
        if (caSelfIdx === -1) return newState;
        const caAdjacentIds: string[] = [];
        if (caSelfIdx - 1 >= 0) caAdjacentIds.push(caBf[caSelfIdx - 1].instanceId);
        if (caSelfIdx + 1 < caBf.length) caAdjacentIds.push(caBf[caSelfIdx + 1].instanceId);
        let caTotalAtk = 0;
        let caTotalHp = 0;
        for (const adjId of caAdjacentIds) {
          const caAdj = caBf.find(m => m.instanceId === adjId);
          if (caAdj) {
            caTotalAtk += caAdj.currentAttack ?? (caAdj.card as MinionCardData).attack ?? 0;
            caTotalHp += caAdj.currentHealth ?? (caAdj.card as MinionCardData).health ?? 0;
          }
        }
        for (const adjId of caAdjacentIds) {
          newState = destroyCard(newState, adjId, 'player');
        }
        const caRefreshed = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (caRefreshed && (battlecry as any).gainStats) {
          caRefreshed.currentAttack = (caRefreshed.currentAttack ?? (caRefreshed.card as MinionCardData).attack ?? 0) + caTotalAtk;
          caRefreshed.currentHealth = (caRefreshed.currentHealth ?? (caRefreshed.card as MinionCardData).health ?? 0) + caTotalHp;
        }
        return newState;
      }

      case 'destroy_mana_crystal': {
        const dmcEffect = battlecry as any;
        const dmcCrystals = dmcEffect.value || 1;
        const dmcOppMana = newState.players.opponent.mana;
        if (dmcOppMana) {
          dmcOppMana.max = Math.max(0, (dmcOppMana.max || 0) - dmcCrystals);
          dmcOppMana.current = Math.min(dmcOppMana.current || 0, dmcOppMana.max);
        }
        return newState;
      }

      case 'resurrect_all': {
        const raEffect = battlecry as any;
        const raRace = (raEffect.race || '').toLowerCase();
        const raGraveyard = newState.players.player.graveyard || [];
        const raToRes = raRace
          ? raGraveyard.filter(m => m.card.type === 'minion' && ((m.card as any).race || '').toLowerCase() === raRace)
          : raGraveyard.filter(m => m.card.type === 'minion');
        for (const dead of raToRes) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const raResurrected: CardInstance = {
            ...JSON.parse(JSON.stringify(dead)),
            instanceId: uuidv4(),
            canAttack: false,
            isSummoningSick: true,
            currentHealth: (dead.card as MinionCardData).health || 1,
            currentAttack: (dead.card as MinionCardData).attack || 0,
          };
          newState.players.player.battlefield.push(raResurrected);
        }
        return newState;
      }

      // ═══════════════════════════════════════════════════════════════
      // SUPER MINION COMPOSITE BATTLECRIES
      // Each handler composes existing primitives to deliver the
      // intended multi-effect design of super minion cards.
      // ═══════════════════════════════════════════════════════════════

      case 'damage_all_enemies': {
        const daeVal = battlecry.value || 1;
        for (const m of newState.players.opponent.battlefield) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= daeVal; }
        }
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        newState = dealDamage(newState, 'opponent', 'hero', daeVal);
        return newState;
      }

      case 'damage_split': {
        const dsTotal = battlecry.value || 1;
        const dsTargets = [...newState.players.opponent.battlefield.map(m => ({ type: 'minion' as const, ref: m })), { type: 'hero' as const, ref: null }];
        for (let i = 0; i < dsTotal && dsTargets.length > 0; i++) {
          const pick = dsTargets[Math.floor(Math.random() * dsTargets.length)];
          if (pick.type === 'hero') {
            newState = dealDamage(newState, 'opponent', 'hero', 1);
          } else if (pick.ref) {
            const m = pick.ref as CardInstance;
            if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
            if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= 1; }
            if ((m.currentHealth ?? 1) <= 0) {
              const idx = dsTargets.indexOf(pick);
              if (idx !== -1) dsTargets.splice(idx, 1);
            }
          }
        }
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        return newState;
      }

      case 'damage_and_bounce': {
        const dabDmg = battlecry.value || 1;
        for (const m of newState.players.opponent.battlefield) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= dabDmg; }
        }
        newState = dealDamage(newState, 'opponent', 'hero', dabDmg);
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        const dabSurvivors = [...newState.players.opponent.battlefield]
          .sort((a, b) => (a.currentAttack ?? (a.card as MinionCardData).attack ?? 0) - (b.currentAttack ?? (b.card as MinionCardData).attack ?? 0));
        const dabBounceCount = Math.min(2, dabSurvivors.length);
        for (let i = 0; i < dabBounceCount; i++) {
          const m = dabSurvivors[i];
          const idx = newState.players.opponent.battlefield.findIndex(c => c.instanceId === m.instanceId);
          if (idx !== -1) {
            const bounced = newState.players.opponent.battlefield.splice(idx, 1)[0];
            if (newState.players.opponent.hand.length < MAX_HAND_SIZE) {
              bounced.isPlayed = false;
              bounced.isSummoningSick = true;
              newState.players.opponent.hand.push(bounced);
            }
          }
        }
        return newState;
      }

      case 'damage_all_buff_self': {
        const dabsVal = battlecry.value || 1;
        let dabsCount = 0;
        for (const m of newState.players.opponent.battlefield) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= dabsVal; }
          dabsCount++;
        }
        newState = dealDamage(newState, 'opponent', 'hero', dabsVal);
        dabsCount++;
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        const dabsSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (dabsSelf) {
          dabsSelf.currentAttack = (dabsSelf.currentAttack ?? (dabsSelf.card as MinionCardData).attack ?? 0) + dabsCount;
        }
        return newState;
      }

      case 'damage_all_enemies_armor': {
        const daeaVal = battlecry.value || 1;
        for (const m of newState.players.opponent.battlefield) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= daeaVal; }
        }
        newState = dealDamage(newState, 'opponent', 'hero', daeaVal);
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        newState.players.player.heroArmor = Math.min(30, (newState.players.player.heroArmor || 0) + daeaVal);
        return newState;
      }

      case 'damage_all_summon': {
        const dasVal = battlecry.value || 1;
        for (const m of newState.players.opponent.battlefield) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= dasVal; }
        }
        newState = dealDamage(newState, 'opponent', 'hero', dasVal);
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        if (newState.players.player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
          const dasToken = createCardInstance({ id: 0, name: 'Hippocampus', type: 'minion', manaCost: 4, attack: dasVal, health: dasVal, rarity: 'common', keywords: ['lifesteal', 'rush'] } as CardData);
          dasToken.isSummoningSick = false;
          dasToken.canAttack = true;
          dasToken.isPlayed = true;
          dasToken.currentHealth = dasVal;
          dasToken.currentAttack = dasVal;
          newState.players.player.battlefield.push(dasToken);
        }
        return newState;
      }

      case 'damage_all_immune': {
        const daiVal = battlecry.value || 1;
        for (const m of newState.players.opponent.battlefield) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= daiVal; }
        }
        newState = dealDamage(newState, 'opponent', 'hero', daiVal);
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        (newState.players.player as any).heroImmune = true;
        return newState;
      }

      case 'damage_all_draw_on_kill': {
        const dadVal = battlecry.value || 1;
        const dadBefore = newState.players.opponent.battlefield.length;
        for (const m of newState.players.opponent.battlefield) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= dadVal; }
        }
        newState = dealDamage(newState, 'opponent', 'hero', dadVal);
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        const dadKilled = dadBefore - newState.players.opponent.battlefield.length;
        for (let i = 0; i < dadKilled && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) newState.players.player.hand.push(createCardInstance(drawn));
        }
        return newState;
      }

      case 'damage_all_poison': {
        const dapVal = battlecry.value || 1;
        const dapAll = [...newState.players.player.battlefield.filter(c => c.instanceId !== cardInstanceId), ...newState.players.opponent.battlefield];
        for (const m of dapAll) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= dapVal; }
          addKeyword(m, 'poisonous');
        }
        newState.players.player.battlefield = newState.players.player.battlefield.filter(m => m.instanceId === cardInstanceId || (m.currentHealth ?? 1) > 0);
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        return newState;
      }

      case 'damage_split_restealth': {
        const dsrTotal = battlecry.value || 1;
        let dsrKilled = false;
        const dsrTargets = [...newState.players.opponent.battlefield.map(m => ({ type: 'minion' as const, ref: m })), { type: 'hero' as const, ref: null }];
        for (let i = 0; i < dsrTotal && dsrTargets.length > 0; i++) {
          const pick = dsrTargets[Math.floor(Math.random() * dsrTargets.length)];
          if (pick.type === 'hero') {
            newState = dealDamage(newState, 'opponent', 'hero', 1);
          } else if (pick.ref) {
            const m = pick.ref as CardInstance;
            if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
            if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= 1; }
            if ((m.currentHealth ?? 1) <= 0) {
              dsrKilled = true;
              const idx = dsrTargets.indexOf(pick);
              if (idx !== -1) dsrTargets.splice(idx, 1);
            }
          }
        }
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        if (dsrKilled) {
          const dsrSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
          if (dsrSelf) (dsrSelf as any).hasStealth = true;
        }
        return newState;
      }

      case 'damage_split_poison': {
        const dspTotal = battlecry.value || 1;
        const dspTargets = [...newState.players.opponent.battlefield.map(m => ({ type: 'minion' as const, ref: m })), { type: 'hero' as const, ref: null }];
        for (let i = 0; i < dspTotal && dspTargets.length > 0; i++) {
          const pick = dspTargets[Math.floor(Math.random() * dspTargets.length)];
          if (pick.type === 'hero') {
            newState = dealDamage(newState, 'opponent', 'hero', 1);
          } else if (pick.ref) {
            const m = pick.ref as CardInstance;
            if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
            if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= 1; }
            if ((m.currentHealth ?? 1) <= 0) {
              const idx = dspTargets.indexOf(pick);
              if (idx !== -1) dspTargets.splice(idx, 1);
            }
          }
        }
        for (const m of newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0)) {
          addKeyword(m, 'poisonous');
        }
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        return newState;
      }

      case 'damage_hero_execute': {
        const dheBase = battlecry.value || 4;
        const oppHp = newState.players.opponent.heroHealth || 100;
        const dheDmg = oppHp <= 15 ? dheBase * 2 : dheBase;
        newState = dealDamage(newState, 'opponent', 'hero', dheDmg);
        return newState;
      }

      case 'chain_damage': {
        const cdVal = battlecry.value || 5;
        let cdTarget = targetId;
        const cdIsOnOpp = (id: string) => newState.players.opponent.battlefield.some(m => m.instanceId === id);
        for (let chain = 0; chain < 10 && cdTarget; chain++) {
          const allM = [...newState.players.player.battlefield, ...newState.players.opponent.battlefield];
          const tgt = allM.find(m => m.instanceId === cdTarget);
          if (!tgt) break;
          if (tgt.currentHealth === undefined) tgt.currentHealth = (tgt.card as MinionCardData).health || 1;
          if (tgt.hasDivineShield) { tgt.hasDivineShield = false; } else { tgt.currentHealth -= cdVal; }
          const killed = (tgt.currentHealth ?? 1) <= 0;
          if (killed) {
            newState = destroyCard(newState, cdTarget, cdIsOnOpp(cdTarget) ? 'opponent' : 'player');
            const remaining = newState.players.opponent.battlefield;
            if (remaining.length > 0) {
              cdTarget = remaining[Math.floor(Math.random() * remaining.length)].instanceId;
            } else { break; }
          } else { break; }
        }
        return newState;
      }

      case 'overkill_cleave': {
        const ocVal = battlecry.value || 10;
        if (!targetId) return newState;
        const allMinions = [...newState.players.player.battlefield, ...newState.players.opponent.battlefield];
        const ocTgt = allMinions.find(m => m.instanceId === targetId);
        if (!ocTgt) return newState;
        if (ocTgt.currentHealth === undefined) ocTgt.currentHealth = (ocTgt.card as MinionCardData).health || 1;
        const ocHpBefore = ocTgt.currentHealth;
        if (ocTgt.hasDivineShield) { ocTgt.hasDivineShield = false; } else { ocTgt.currentHealth -= ocVal; }
        const ocOnOpp = newState.players.opponent.battlefield.some(m => m.instanceId === targetId);
        if ((ocTgt.currentHealth ?? 1) <= 0) {
          const excess = ocVal - ocHpBefore;
          newState = destroyCard(newState, targetId, ocOnOpp ? 'opponent' : 'player');
          if (excess > 0) {
            const ocBf = ocOnOpp ? newState.players.opponent.battlefield : newState.players.player.battlefield;
            for (const adj of ocBf) {
              if (adj.currentHealth === undefined) adj.currentHealth = (adj.card as MinionCardData).health || 1;
              if (adj.hasDivineShield) { adj.hasDivineShield = false; } else { adj.currentHealth -= excess; }
            }
            if (ocOnOpp) {
              newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
            } else {
              newState.players.player.battlefield = newState.players.player.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
            }
          }
        }
        return newState;
      }

      case 'buff_all_attack': {
        const baaVal = battlecry.value || 1;
        for (const m of [...newState.players.player.battlefield, ...newState.players.opponent.battlefield]) {
          m.currentAttack = (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) + baaVal;
        }
        return newState;
      }

      case 'buff_all_friendly_divine_shield': {
        const bafdsVal = battlecry.value || 0;
        for (const m of newState.players.player.battlefield) {
          m.hasDivineShield = true;
          if (bafdsVal > 0) {
            m.currentHealth = (m.currentHealth ?? (m.card as MinionCardData).health ?? 0) + bafdsVal;
          }
        }
        return newState;
      }

      case 'buff_all_friendly_attack_lifesteal': {
        const bafalVal = battlecry.value || 1;
        for (const m of newState.players.player.battlefield) {
          m.currentAttack = (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) + bafalVal;
          addKeyword(m, 'lifesteal');
        }
        return newState;
      }

      case 'buff_from_damaged': {
        const bfdVal = battlecry.value || 1;
        let bfdCount = 0;
        for (const m of newState.players.player.battlefield) {
          const hp = m.currentHealth ?? (m.card as MinionCardData).health ?? 1;
          const maxHp = (m.card as MinionCardData).health ?? 1;
          if (hp < maxHp) bfdCount++;
        }
        for (const m of newState.players.opponent.battlefield) {
          const hp = m.currentHealth ?? (m.card as MinionCardData).health ?? 1;
          const maxHp = (m.card as MinionCardData).health ?? 1;
          if (hp < maxHp) bfdCount++;
        }
        const oppHeroHp = newState.players.opponent.heroHealth || 100;
        if (oppHeroHp < 100) bfdCount++;
        const playerHeroHp = newState.players.player.heroHealth || 100;
        if (playerHeroHp < 100) bfdCount++;
        const bfdSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (bfdSelf && bfdCount > 0) {
          bfdSelf.currentAttack = (bfdSelf.currentAttack ?? (bfdSelf.card as MinionCardData).attack ?? 0) + bfdCount * bfdVal;
          bfdSelf.currentHealth = (bfdSelf.currentHealth ?? (bfdSelf.card as MinionCardData).health ?? 0) + bfdCount * bfdVal;
        }
        return newState;
      }

      case 'buff_attack_draw_on_kill': {
        const badkVal = battlecry.value || 1;
        for (const m of newState.players.player.battlefield) {
          m.currentAttack = (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) + badkVal;
        }
        return newState;
      }

      case 'buff_lifesteal_heal': {
        const blhVal = battlecry.value || 1;
        for (const m of newState.players.player.battlefield) {
          m.currentAttack = (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) + blhVal;
          m.currentHealth = (m.currentHealth ?? (m.card as MinionCardData).health ?? 0) + blhVal;
          addKeyword(m, 'lifesteal');
        }
        newState = healTarget(newState, 'player', 'hero', 10);
        return newState;
      }

      case 'buff_taunt_reveal_draw': {
        const btrdVal = battlecry.value || 2;
        for (const m of newState.players.player.battlefield) {
          m.currentHealth = (m.currentHealth ?? (m.card as MinionCardData).health ?? 0) + btrdVal;
          (m as any).hasTaunt = true;
        }
        for (let i = 0; i < 2 && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) newState.players.player.hand.push(createCardInstance(drawn));
        }
        return newState;
      }

      case 'buff_grant_deathrattle_draw': {
        const bgddVal = battlecry.value || 3;
        for (const m of newState.players.player.battlefield) {
          if (m.instanceId === cardInstanceId) continue;
          m.currentHealth = (m.currentHealth ?? (m.card as MinionCardData).health ?? 0) + bgddVal;
          (m.card as any).deathrattle = { type: 'heal_hero', value: 5 };
          addKeyword(m, 'deathrattle');
        }
        for (let i = 0; i < bgddVal && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) newState.players.player.hand.push(createCardInstance(drawn));
        }
        return newState;
      }

      case 'buff_from_treants_summon': {
        const bftsVal = battlecry.value || 3;
        let bftsTreants = 0;
        for (const m of newState.players.player.battlefield) {
          if (m.card.name?.toLowerCase().includes('treant')) bftsTreants++;
        }
        const bftsSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (bftsSelf && bftsTreants > 0) {
          bftsSelf.currentAttack = (bftsSelf.currentAttack ?? (bftsSelf.card as MinionCardData).attack ?? 0) + bftsTreants;
          bftsSelf.currentHealth = (bftsSelf.currentHealth ?? (bftsSelf.card as MinionCardData).health ?? 0) + bftsTreants;
        }
        for (let i = 0; i < bftsVal; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const treant = createCardInstance({ id: 0, name: 'Treant', type: 'minion', manaCost: 1, attack: 2, health: 2, rarity: 'common', keywords: ['taunt'] } as CardData);
          treant.isSummoningSick = true;
          treant.isPlayed = true;
          treant.currentHealth = 2;
          treant.currentAttack = 2;
          (treant as any).hasTaunt = true;
          newState.players.player.battlefield.push(treant);
        }
        return newState;
      }

      case 'destroy_and_draw': {
        const dadOppBf = newState.players.opponent.battlefield;
        let dadDrawCount = 0;
        if (dadOppBf.length > 0) {
          const idx1 = Math.floor(Math.random() * dadOppBf.length);
          const t1 = dadOppBf[idx1];
          const t1Atk = t1.currentAttack ?? (t1.card as MinionCardData).attack ?? 0;
          newState = destroyCard(newState, t1.instanceId, 'opponent');
          dadDrawCount++;
          if (t1Atk >= (battlecry.value || 5) && newState.players.opponent.battlefield.length > 0) {
            const idx2 = Math.floor(Math.random() * newState.players.opponent.battlefield.length);
            newState = destroyCard(newState, newState.players.opponent.battlefield[idx2].instanceId, 'opponent');
            dadDrawCount++;
          }
        }
        for (let i = 0; i < dadDrawCount && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) newState.players.player.hand.push(createCardInstance(drawn));
        }
        return newState;
      }

      case 'destroy_low_health_summon': {
        const dlhsThreshold = battlecry.value || 3;
        let dlhsKills = 0;
        const dlhsToDestroy = newState.players.opponent.battlefield
          .filter(m => (m.currentHealth ?? (m.card as MinionCardData).health ?? 1) <= dlhsThreshold)
          .map(m => m.instanceId);
        for (const id of dlhsToDestroy) {
          newState = destroyCard(newState, id, 'opponent');
          dlhsKills++;
        }
        for (let i = 0; i < dlhsKills; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const draugr = createCardInstance({ id: 0, name: 'Draugr', type: 'minion', manaCost: 1, attack: 2, health: 2, rarity: 'common', keywords: ['rush'] } as CardData);
          draugr.isSummoningSick = false;
          draugr.canAttack = true;
          draugr.isPlayed = true;
          draugr.currentHealth = 2;
          draugr.currentAttack = 2;
          newState.players.player.battlefield.push(draugr);
        }
        return newState;
      }

      case 'destroy_extremes_gain_stats': {
        const oppBfDe = newState.players.opponent.battlefield;
        if (oppBfDe.length === 0) return newState;
        let deTotalAtk = 0, deTotalHp = 0;
        const deSorted = [...oppBfDe].sort((a, b) => (a.currentAttack ?? (a.card as MinionCardData).attack ?? 0) - (b.currentAttack ?? (b.card as MinionCardData).attack ?? 0));
        const deLowest = deSorted[0];
        const deHighest = deSorted[deSorted.length - 1];
        const deTargets = deLowest.instanceId === deHighest.instanceId ? [deLowest] : [deLowest, deHighest];
        for (const t of deTargets) {
          deTotalAtk += t.currentAttack ?? (t.card as MinionCardData).attack ?? 0;
          deTotalHp += t.currentHealth ?? (t.card as MinionCardData).health ?? 0;
          newState = destroyCard(newState, t.instanceId, 'opponent');
        }
        const deSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (deSelf) {
          deSelf.currentAttack = (deSelf.currentAttack ?? (deSelf.card as MinionCardData).attack ?? 0) + deTotalAtk;
          deSelf.currentHealth = (deSelf.currentHealth ?? (deSelf.card as MinionCardData).health ?? 0) + deTotalHp;
        }
        return newState;
      }

      case 'destroy_gain_armor': {
        if (!targetId) return newState;
        const dgaTarget = newState.players.opponent.battlefield.find(m => m.instanceId === targetId);
        const dgaAtk = dgaTarget ? (dgaTarget.currentAttack ?? (dgaTarget.card as MinionCardData).attack ?? 0) : 0;
        newState = destroyCard(newState, targetId, 'opponent');
        newState.players.player.heroArmor = Math.min(30, (newState.players.player.heroArmor || 0) + dgaAtk);
        return newState;
      }

      case 'destroy_deathrattle_buff': {
        const ddbVal = battlecry.value || 1;
        let ddbKills = 0;
        const ddbTargets = newState.players.opponent.battlefield
          .filter(m => hasKeyword(m, 'deathrattle') || (m.card as any).deathrattle)
          .map(m => m.instanceId);
        for (const id of ddbTargets) {
          newState = destroyCard(newState, id, 'opponent');
          ddbKills++;
        }
        const ddbSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (ddbSelf && ddbKills > 0) {
          ddbSelf.currentAttack = (ddbSelf.currentAttack ?? (ddbSelf.card as MinionCardData).attack ?? 0) + ddbKills * ddbVal;
          ddbSelf.currentHealth = (ddbSelf.currentHealth ?? (ddbSelf.card as MinionCardData).health ?? 0) + ddbKills * ddbVal;
        }
        return newState;
      }

      case 'destroy_weak_buff': {
        const dwbThreshold = battlecry.value || 4;
        let dwbKills = 0;
        const dwbTargets = newState.players.opponent.battlefield
          .filter(m => (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) <= dwbThreshold)
          .map(m => m.instanceId);
        for (const id of dwbTargets) {
          newState = destroyCard(newState, id, 'opponent');
          dwbKills++;
        }
        const dwbSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (dwbSelf && dwbKills > 0) {
          dwbSelf.currentAttack = (dwbSelf.currentAttack ?? (dwbSelf.card as MinionCardData).attack ?? 0) + dwbKills * 2;
          dwbSelf.currentHealth = (dwbSelf.currentHealth ?? (dwbSelf.card as MinionCardData).health ?? 0) + dwbKills * 2;
        }
        return newState;
      }

      case 'destroy_low_attack_summon_shades': {
        const dlasThreshold = battlecry.value || 4;
        let dlasKills = 0;
        const dlasTargets = newState.players.opponent.battlefield
          .filter(m => (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) <= dlasThreshold)
          .map(m => m.instanceId);
        for (const id of dlasTargets) {
          newState = destroyCard(newState, id, 'opponent');
          dlasKills++;
        }
        for (let i = 0; i < dlasKills; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const shade = createCardInstance({ id: 0, name: 'Shade', type: 'minion', manaCost: 2, attack: 3, health: 3, rarity: 'common', keywords: ['lifesteal'] } as CardData);
          shade.isSummoningSick = true;
          shade.isPlayed = true;
          shade.currentHealth = 3;
          shade.currentAttack = 3;
          newState.players.player.battlefield.push(shade);
        }
        return newState;
      }

      case 'conditional_destroy_summon': {
        const cdsThreshold = battlecry.value || 4;
        let cdsKills = 0;
        const cdsTargets = newState.players.opponent.battlefield
          .filter(m => (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) <= cdsThreshold)
          .map(m => m.instanceId);
        for (const id of cdsTargets) {
          newState = destroyCard(newState, id, 'opponent');
          cdsKills++;
        }
        for (let i = 0; i < cdsKills; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const shade = createCardInstance({ id: 0, name: 'Shade', type: 'minion', manaCost: 1, attack: 2, health: 2, rarity: 'common' } as CardData);
          shade.isSummoningSick = true;
          shade.isPlayed = true;
          shade.currentHealth = 2;
          shade.currentAttack = 2;
          newState.players.player.battlefield.push(shade);
        }
        return newState;
      }

      case 'summon_pair': {
        const spVal = battlecry.value || 4;
        const spTokens = [
          { name: 'Fear', atk: spVal, hp: spVal, kw: ['elusive'] },
          { name: 'Terror', atk: spVal, hp: spVal, kw: ['windfury'] }
        ];
        for (const t of spTokens) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const tok = createCardInstance({ id: 0, name: t.name, type: 'minion', manaCost: spVal, attack: t.atk, health: t.hp, rarity: 'common', keywords: t.kw } as CardData);
          tok.isSummoningSick = true;
          tok.isPlayed = true;
          tok.currentHealth = t.hp;
          tok.currentAttack = t.atk;
          newState.players.player.battlefield.push(tok);
        }
        return newState;
      }

      case 'summon_growing_pair': {
        const sgpVal = battlecry.value || 4;
        const sgpTokens = [
          { name: 'Askr', kw: ['taunt'] },
          { name: 'Embla', kw: ['rush'] }
        ];
        for (const t of sgpTokens) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const tok = createCardInstance({ id: 0, name: t.name, type: 'minion', manaCost: sgpVal, attack: sgpVal, health: sgpVal, rarity: 'common', keywords: t.kw } as CardData);
          tok.isSummoningSick = t.kw.includes('rush') ? false : true;
          tok.canAttack = t.kw.includes('rush');
          tok.isPlayed = true;
          tok.currentHealth = sgpVal;
          tok.currentAttack = sgpVal;
          if (t.kw.includes('taunt')) (tok as any).hasTaunt = true;
          newState.players.player.battlefield.push(tok);
        }
        return newState;
      }

      case 'summon_with_death_buff': {
        const swdbCount = battlecry.value || 4;
        for (let i = 0; i < swdbCount; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const ox = createCardInstance({ id: 0, name: 'Ox', type: 'minion', manaCost: 1, attack: 2, health: 2, rarity: 'common', keywords: ['taunt'] } as CardData);
          ox.isSummoningSick = true;
          ox.isPlayed = true;
          ox.currentHealth = 2;
          ox.currentAttack = 2;
          (ox as any).hasTaunt = true;
          newState.players.player.battlefield.push(ox);
        }
        return newState;
      }

      case 'summon_all_totems_buff': {
        const satbVal = battlecry.value || 2;
        const totemNames = ['Healing Totem', 'Searing Totem', 'Stoneclaw Totem', 'Wrath of Air Totem'];
        const totemStats = [[0, 2], [1, 1], [0, 2], [0, 2]];
        for (let i = 0; i < totemNames.length; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const tok = createCardInstance({ id: 0, name: totemNames[i], type: 'minion', manaCost: 1, attack: totemStats[i][0] + satbVal, health: totemStats[i][1] + satbVal, rarity: 'common', race: 'Spirit' } as CardData);
          tok.isSummoningSick = true;
          tok.isPlayed = true;
          tok.currentHealth = totemStats[i][1] + satbVal;
          tok.currentAttack = totemStats[i][0] + satbVal;
          newState.players.player.battlefield.push(tok);
        }
        return newState;
      }

      case 'summon_totems_draw': {
        const stdVal = battlecry.value || 2;
        const stdTotemNames = ['Healing Totem', 'Searing Totem', 'Stoneclaw Totem', 'Wrath of Air Totem'];
        const stdTotemStats = [[0, 2], [1, 1], [0, 2], [0, 2]];
        let stdTotemCount = 0;
        for (let i = 0; i < stdTotemNames.length; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const tok = createCardInstance({ id: 0, name: stdTotemNames[i], type: 'minion', manaCost: 1, attack: stdTotemStats[i][0] + stdVal, health: stdTotemStats[i][1] + stdVal, rarity: 'common', race: 'Spirit' } as CardData);
          tok.isSummoningSick = true;
          tok.isPlayed = true;
          tok.currentHealth = stdTotemStats[i][1] + stdVal;
          tok.currentAttack = stdTotemStats[i][0] + stdVal;
          newState.players.player.battlefield.push(tok);
          stdTotemCount++;
        }
        const stdExistingTotems = newState.players.player.battlefield.filter(m => ((m.card as any).race || '').toLowerCase() === 'spirit').length;
        for (let i = 0; i < stdExistingTotems && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) newState.players.player.hand.push(createCardInstance(drawn));
        }
        return newState;
      }

      case 'summon_beast_synergy': {
        const sbsVal = battlecry.value || 5;
        if (newState.players.player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
          const wolf = createCardInstance({ id: 0, name: 'Moonlit Wolf', type: 'minion', manaCost: 5, attack: sbsVal, health: sbsVal, rarity: 'common', race: 'Beast', keywords: ['rush'] } as CardData);
          wolf.isSummoningSick = false;
          wolf.canAttack = true;
          wolf.isPlayed = true;
          wolf.currentHealth = sbsVal;
          wolf.currentAttack = sbsVal;
          newState.players.player.battlefield.push(wolf);
        }
        const sbsBeastCount = newState.players.player.battlefield.filter(m => ((m.card as any).race || '').toLowerCase() === 'beast').length;
        const sbsSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (sbsSelf) {
          sbsSelf.currentAttack = (sbsSelf.currentAttack ?? (sbsSelf.card as MinionCardData).attack ?? 0) + sbsBeastCount;
        }
        const sbsWolf = newState.players.player.battlefield[newState.players.player.battlefield.length - 1];
        if (sbsWolf && sbsWolf.card.name === 'Moonlit Wolf') {
          sbsWolf.currentAttack = (sbsWolf.currentAttack ?? sbsVal) + sbsBeastCount;
        }
        return newState;
      }

      case 'summon_from_dead_beasts': {
        const sfdbVal = battlecry.value || 3;
        const sfdbGy = newState.players.player.graveyard || [];
        const sfdbDeadBeasts = sfdbGy.filter(m => m.card.type === 'minion' && ((m.card as any).race || '').toLowerCase() === 'beast');
        const sfdbCount = Math.min(sfdbDeadBeasts.length, 5);
        for (let i = 0; i < sfdbCount; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const wolf = createCardInstance({ id: 0, name: 'Wolf', type: 'minion', manaCost: 2, attack: sfdbVal, health: sfdbVal, rarity: 'common', race: 'Beast', keywords: ['rush'] } as CardData);
          wolf.isSummoningSick = false;
          wolf.canAttack = true;
          wolf.isPlayed = true;
          wolf.currentHealth = sfdbVal;
          wolf.currentAttack = sfdbVal;
          newState.players.player.battlefield.push(wolf);
        }
        for (const m of newState.players.player.battlefield) {
          if (m.card.name === 'Wolf' || (m.card.name || '').toLowerCase().includes('wolf')) {
            m.currentAttack = (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) + 2;
          }
        }
        return newState;
      }

      case 'equip_weapon_summon': {
        const ewsVal = battlecry.value || 4;
        const ewsWeapon = createCardInstance({ id: 0, name: 'Divine Hammer', type: 'weapon', manaCost: 4, attack: ewsVal, health: 2, rarity: 'common' } as CardData);
        ewsWeapon.currentAttack = ewsVal;
        ewsWeapon.currentHealth = 2;
        (ewsWeapon as any).durability = 2;
        newState.players.player.weapon = ewsWeapon;
        for (let i = 0; i < 2; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const auto = createCardInstance({ id: 0, name: 'Bronze Automaton', type: 'minion', manaCost: 2, attack: 3, health: 3, rarity: 'common', race: 'Automaton', keywords: ['reborn'] } as CardData);
          auto.isSummoningSick = true;
          auto.isPlayed = true;
          auto.currentHealth = 3;
          auto.currentAttack = 3;
          newState.players.player.battlefield.push(auto);
        }
        return newState;
      }

      case 'stealth_all_and_summon': {
        const saasVal = battlecry.value || 4;
        for (const m of newState.players.player.battlefield) {
          (m as any).hasStealth = true;
        }
        if (newState.players.player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
          const wolf = createCardInstance({ id: 0, name: 'Shadow Wolf', type: 'minion', manaCost: 4, attack: saasVal, health: saasVal, rarity: 'common', race: 'Beast', keywords: ['lifesteal'] } as CardData);
          wolf.isSummoningSick = true;
          wolf.isPlayed = true;
          wolf.currentHealth = saasVal;
          wolf.currentAttack = saasVal;
          newState.players.player.battlefield.push(wolf);
        }
        return newState;
      }

      case 'stealth_all_damage': {
        const sadVal = battlecry.value || 2;
        let sadStealthCount = 0;
        for (const m of newState.players.player.battlefield) {
          (m as any).hasStealth = true;
          sadStealthCount++;
        }
        const sadDmg = sadVal * sadStealthCount;
        for (const m of newState.players.opponent.battlefield) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= sadDmg; }
        }
        newState = dealDamage(newState, 'opponent', 'hero', sadDmg);
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        return newState;
      }

      case 'stealth_all_friendly': {
        for (const m of newState.players.player.battlefield) {
          (m as any).hasStealth = true;
        }
        return newState;
      }

      case 'grant_stealth': {
        for (const m of newState.players.player.battlefield) {
          (m as any).hasStealth = true;
        }
        return newState;
      }

      case 'freeze_all_summon': {
        const fasVal = battlecry.value || 3;
        for (const m of newState.players.opponent.battlefield) {
          m.isFrozen = true;
        }
        for (let i = 0; i < 2; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const totem = createCardInstance({ id: 0, name: 'Frost Totem', type: 'minion', manaCost: 2, attack: fasVal, health: fasVal, rarity: 'common', race: 'Spirit', keywords: ['taunt'] } as CardData);
          totem.isSummoningSick = true;
          totem.isPlayed = true;
          totem.currentHealth = fasVal;
          totem.currentAttack = fasVal;
          (totem as any).hasTaunt = true;
          newState.players.player.battlefield.push(totem);
        }
        return newState;
      }

      case 'freeze_damage_buff': {
        const fdbVal = battlecry.value || 2;
        let fdbFrozen = 0;
        for (const m of newState.players.opponent.battlefield) {
          m.isFrozen = true;
          fdbFrozen++;
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= fdbVal; }
        }
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        const fdbSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (fdbSelf && fdbFrozen > 0) {
          fdbSelf.currentAttack = (fdbSelf.currentAttack ?? (fdbSelf.card as MinionCardData).attack ?? 0) + fdbFrozen * fdbVal;
          fdbSelf.currentHealth = (fdbSelf.currentHealth ?? (fdbSelf.card as MinionCardData).health ?? 0) + fdbFrozen * fdbVal;
        }
        return newState;
      }

      case 'freeze_all_damage_hero': {
        const fadhVal = battlecry.value || 2;
        let fadhFrozen = 0;
        for (const m of newState.players.opponent.battlefield) {
          m.isFrozen = true;
          fadhFrozen++;
        }
        newState = dealDamage(newState, 'opponent', 'hero', fadhVal * fadhFrozen);
        return newState;
      }

      case 'bounce_weak_summon': {
        const bwsThreshold = battlecry.value || 3;
        const bwsOppBf = newState.players.opponent.battlefield;
        const bwsToReturn = bwsOppBf.filter(m => (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) <= bwsThreshold);
        newState.players.opponent.battlefield = bwsOppBf.filter(m => (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) > bwsThreshold);
        let bwsBounced = 0;
        for (const card of bwsToReturn) {
          if (newState.players.opponent.hand.length < MAX_HAND_SIZE) {
            card.isPlayed = false;
            card.isSummoningSick = true;
            newState.players.opponent.hand.push(card);
          }
          bwsBounced++;
        }
        for (let i = 0; i < bwsBounced; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const sailor = createCardInstance({ id: 0, name: 'Drowned Sailor', type: 'minion', manaCost: 1, attack: 2, health: 2, rarity: 'common', keywords: ['rush'] } as CardData);
          sailor.isSummoningSick = false;
          sailor.canAttack = true;
          sailor.isPlayed = true;
          sailor.currentHealth = 2;
          sailor.currentAttack = 2;
          newState.players.player.battlefield.push(sailor);
        }
        return newState;
      }

      case 'bounce_free_draw': {
        const bfdDrawCount = battlecry.value || 3;
        if (targetId) {
          const bfdBf = newState.players.player.battlefield;
          const bfdIdx = bfdBf.findIndex(m => m.instanceId === targetId);
          if (bfdIdx !== -1 && newState.players.player.hand.length < MAX_HAND_SIZE) {
            const bounced = bfdBf.splice(bfdIdx, 1)[0];
            bounced.isPlayed = false;
            bounced.isSummoningSick = true;
            bounced.canAttack = false;
            (bounced.card as any).manaCost = 0;
            newState.players.player.hand.push(bounced);
          }
        }
        for (let i = 0; i < bfdDrawCount && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) newState.players.player.hand.push(createCardInstance(drawn));
        }
        return newState;
      }

      case 'bounce_all_increase_cost': {
        const baicExtra = battlecry.value || 2;
        const baicOppBf = [...newState.players.opponent.battlefield];
        newState.players.opponent.battlefield = [];
        for (const card of baicOppBf) {
          if (newState.players.opponent.hand.length < MAX_HAND_SIZE) {
            card.isPlayed = false;
            card.isSummoningSick = true;
            card.canAttack = false;
            (card.card as any).manaCost = ((card.card as any).manaCost || 0) + baicExtra;
            newState.players.opponent.hand.push(card);
          }
        }
        return newState;
      }

      case 'copy_strongest_buff': {
        const csbVal = battlecry.value || 2;
        const csbOppBf = newState.players.opponent.battlefield;
        if (csbOppBf.length === 0) return newState;
        const csbStrongest = [...csbOppBf].sort((a, b) => (b.currentAttack ?? (b.card as MinionCardData).attack ?? 0) - (a.currentAttack ?? (a.card as MinionCardData).attack ?? 0))[0];
        const csbSelf = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (csbSelf) {
          csbSelf.card = JSON.parse(JSON.stringify(csbStrongest.card));
          csbSelf.currentAttack = (csbStrongest.currentAttack ?? (csbStrongest.card as MinionCardData).attack ?? 0) + csbVal;
          csbSelf.currentHealth = (csbStrongest.currentHealth ?? (csbStrongest.card as MinionCardData).health ?? 0) + csbVal;
          addKeyword(csbSelf, 'elusive');
        }
        return newState;
      }

      case 'copy_lowest_free': {
        const clfCount = battlecry.value || 3;
        const clfOppHand = newState.players.opponent.hand;
        if (clfOppHand.length === 0) return newState;
        const clfLowest = [...clfOppHand].sort((a, b) => ((a.card as any).manaCost || 0) - ((b.card as any).manaCost || 0))[0];
        for (let i = 0; i < clfCount && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const copy = createCardInstance(JSON.parse(JSON.stringify(clfLowest.card)));
          (copy.card as any).manaCost = 0;
          newState.players.player.hand.push(copy);
        }
        return newState;
      }

      case 'mind_control_random': {
        const mcrOppBf = newState.players.opponent.battlefield;
        if (mcrOppBf.length === 0 || newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
        const mcrIdx = Math.floor(Math.random() * mcrOppBf.length);
        const mcrStolen = mcrOppBf.splice(mcrIdx, 1)[0];
        mcrStolen.isSummoningSick = true;
        mcrStolen.canAttack = false;
        newState.players.player.battlefield.push(mcrStolen);
        return newState;
      }

      case 'reveal_and_draw': {
        const radCount = battlecry.value || 2;
        for (let i = 0; i < radCount && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) newState.players.player.hand.push(createCardInstance(drawn));
        }
        return newState;
      }

      case 'discover_spells': {
        return executeDiscoverBattlecry(newState, cardInstanceId, { ...battlecry, type: 'discover', discoveryType: 'spell' });
      }

      case 'draw_and_buff_self': {
        const dabsDrawCount = battlecry.value || 4;
        let dabsDrawn = 0;
        for (let i = 0; i < dabsDrawCount && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) { newState.players.player.hand.push(createCardInstance(drawn)); dabsDrawn++; }
        }
        const dabsSelfM = newState.players.player.battlefield.find(c => c.instanceId === cardInstanceId);
        if (dabsSelfM) {
          dabsSelfM.currentAttack = (dabsSelfM.currentAttack ?? (dabsSelfM.card as MinionCardData).attack ?? 0) + dabsDrawn;
          dabsSelfM.currentHealth = (dabsSelfM.currentHealth ?? (dabsSelfM.card as MinionCardData).health ?? 0) + dabsDrawn;
        }
        return newState;
      }

      case 'discover_weapon_buff_all': {
        const dwbaVal = battlecry.value || 2;
        for (const m of newState.players.player.battlefield) {
          m.currentAttack = (m.currentAttack ?? (m.card as MinionCardData).attack ?? 0) + dwbaVal;
          m.currentHealth = (m.currentHealth ?? (m.card as MinionCardData).health ?? 0) + dwbaVal;
        }
        return executeDiscoverBattlecry(newState, cardInstanceId, { ...battlecry, type: 'discover', discoveryType: 'weapon' });
      }

      case 'extra_turn': {
        (newState as any).extraTurn = true;
        return newState;
      }

      case 'divine_shield_all_immune': {
        for (const m of newState.players.player.battlefield) {
          m.hasDivineShield = true;
        }
        (newState.players.player as any).heroImmune = true;
        return newState;
      }

      case 'heal_all_protect': {
        for (const m of newState.players.player.battlefield) {
          m.currentHealth = (m.card as MinionCardData).health || 1;
        }
        newState = healTarget(newState, 'player', 'hero', 99);
        for (const m of newState.players.opponent.battlefield) {
          m.currentHealth = (m.card as MinionCardData).health || 1;
        }
        return newState;
      }

      case 'fill_hand_discount_armor': {
        const fhdaDiscount = battlecry.value || 2;
        const fhdaSpells = allCards.filter(c => c.type === 'spell' && ((c as any).class === 'Druid' || (c as any).heroClass === 'druid'));
        while (newState.players.player.hand.length < MAX_HAND_SIZE && fhdaSpells.length > 0) {
          const pick = fhdaSpells[Math.floor(Math.random() * fhdaSpells.length)];
          const inst = createCardInstance(JSON.parse(JSON.stringify(pick)));
          (inst.card as any).manaCost = Math.max(0, ((inst.card as any).manaCost || 0) - fhdaDiscount);
          newState.players.player.hand.push(inst);
        }
        newState.players.player.heroArmor = Math.min(30, (newState.players.player.heroArmor || 0) + 5);
        return newState;
      }

      case 'resurrect_buff': {
        const rbCount = battlecry.value || 3;
        const rbGy = newState.players.player.graveyard || [];
        const rbDead = rbGy.filter(m => m.card.type === 'minion');
        const rbShuffled = [...rbDead].sort(() => Math.random() - 0.5);
        for (let i = 0; i < rbCount && i < rbShuffled.length; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const dead = rbShuffled[i];
          const res: CardInstance = {
            ...JSON.parse(JSON.stringify(dead)),
            instanceId: uuidv4(),
            canAttack: true,
            isSummoningSick: false,
            currentHealth: ((dead.card as MinionCardData).health || 1) + 1,
            currentAttack: ((dead.card as MinionCardData).attack || 0) + 1,
          };
          addKeyword(res, 'rush');
          newState.players.player.battlefield.push(res);
        }
        return newState;
      }

      case 'sacrifice_all_summon': {
        const sasVal = battlecry.value || 4;
        let sasKills = 0;
        const sasIds = newState.players.player.battlefield
          .filter(m => m.instanceId !== cardInstanceId)
          .map(m => m.instanceId);
        for (const id of sasIds) {
          newState = destroyCard(newState, id, 'player');
          sasKills++;
        }
        for (let i = 0; i < sasKills; i++) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const shade = createCardInstance({ id: 0, name: 'Shade', type: 'minion', manaCost: 3, attack: sasVal, health: sasVal, rarity: 'common', keywords: ['rush'] } as CardData);
          shade.isSummoningSick = false;
          shade.canAttack = true;
          shade.isPlayed = true;
          shade.currentHealth = sasVal;
          shade.currentAttack = sasVal;
          newState.players.player.battlefield.push(shade);
        }
        return newState;
      }

      case 'silence_freeze_draw': {
        let sfdCount = 0;
        for (const m of newState.players.opponent.battlefield) {
          newState = silenceMinion(newState, m.instanceId);
          m.isFrozen = true;
          sfdCount++;
        }
        for (let i = 0; i < sfdCount && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) newState.players.player.hand.push(createCardInstance(drawn));
        }
        return newState;
      }

      case 'set_all_stats_draw': {
        const sasdVal = battlecry.value || 3;
        let sasdEnemyCount = 0;
        for (const m of [...newState.players.player.battlefield, ...newState.players.opponent.battlefield]) {
          if (m.instanceId === cardInstanceId) continue;
          const wasEnemy = newState.players.opponent.battlefield.some(e => e.instanceId === m.instanceId);
          m.currentAttack = sasdVal;
          m.currentHealth = sasdVal;
          if (wasEnemy) sasdEnemyCount++;
        }
        for (let i = 0; i < sasdEnemyCount && newState.players.player.hand.length < MAX_HAND_SIZE; i++) {
          const drawn = newState.players.player.deck.shift();
          if (drawn) newState.players.player.hand.push(createCardInstance(drawn));
        }
        return newState;
      }

      case 'heal_all_grant_reborn': {
        for (const m of newState.players.player.battlefield) {
          m.currentHealth = (m.card as MinionCardData).health || 1;
          addKeyword(m, 'reborn');
        }
        newState = healTarget(newState, 'player', 'hero', 99);
        return newState;
      }

      case 'recruit_beasts_buff': {
        const rbbCount = battlecry.value || 3;
        const rbbVal = 2;
        const rbbDeck = newState.players.player.deck;
        const rbbBeasts = rbbDeck.filter(c => c.type === 'minion' && ((c as any).race || '').toLowerCase() === 'beast');
        const rbbToSummon = rbbBeasts.slice(0, rbbCount);
        for (const cardData of rbbToSummon) {
          if (newState.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
          const idx = rbbDeck.indexOf(cardData);
          if (idx !== -1) rbbDeck.splice(idx, 1);
          const inst = createCardInstance(cardData);
          inst.isSummoningSick = false;
          inst.canAttack = true;
          inst.isPlayed = true;
          inst.currentHealth = ((inst.card as MinionCardData).health || 1) + rbbVal;
          inst.currentAttack = ((inst.card as MinionCardData).attack || 0) + rbbVal;
          addKeyword(inst, 'rush');
          newState.players.player.battlefield.push(inst);
        }
        return newState;
      }

      case 'full_heal_and_aoe': {
        const fhaaVal = battlecry.value || 4;
        for (const m of newState.players.player.battlefield) {
          m.currentHealth = (m.card as MinionCardData).health || 1;
        }
        newState = healTarget(newState, 'player', 'hero', 99);
        for (const m of newState.players.opponent.battlefield) {
          if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
          if (m.hasDivineShield) { m.hasDivineShield = false; } else { m.currentHealth -= fhaaVal; }
        }
        newState = dealDamage(newState, 'opponent', 'hero', fhaaVal);
        newState.players.opponent.battlefield = newState.players.opponent.battlefield.filter(m => (m.currentHealth ?? 1) > 0);
        return newState;
      }

      case 'conditional_buff_self': {
        const cbsCondition = battlecry.condition;
        let cbsConditionMet = false;
        if (cbsCondition === 'hero_hp_30_or_below') {
          const heroHP = player.heroHealth ?? player.health ?? 100;
          cbsConditionMet = heroHP <= 30;
        }
        if (cbsConditionMet) {
          const sourceMinion = newState.players.player.battlefield.find((m: CardInstance) => m.instanceId === cardInstanceId);
          if (sourceMinion) {
            sourceMinion.currentAttack = (sourceMinion.currentAttack || 0) + (battlecry.buffAttack || 0);
            sourceMinion.currentHealth = (sourceMinion.currentHealth || 0) + (battlecry.buffHealth || 0);
            sourceMinion.card = { ...sourceMinion.card, attack: ((sourceMinion.card as any).attack ?? 0) + (battlecry.buffAttack || 0), health: ((sourceMinion.card as any).health ?? 0) + (battlecry.buffHealth || 0) } as any;
            if (battlecry.grantKeywords) {
              for (const kw of battlecry.grantKeywords) {
                if (kw === 'rush') { sourceMinion.canAttack = true; sourceMinion.isSummoningSick = false; }
                if (kw === 'divine_shield') { sourceMinion.hasDivineShield = true; }
                if (kw === 'taunt') { sourceMinion.isTaunt = true; }
              }
            }
          }
        }
        break;
      }
      case 'conditional_aoe': {
        const caoCondition = battlecry.condition;
        let caoConditionMet = false;
        if (caoCondition === 'hero_hp_30_or_below') {
          const heroHP = player.heroHealth ?? player.health ?? 100;
          caoConditionMet = heroHP <= 30;
        }
        if (caoConditionMet && battlecry.damage) {
          const deadMinions: string[] = [];
          for (const m of newState.players.opponent.battlefield) {
            m.currentHealth = (m.currentHealth || 0) - battlecry.damage;
            if (m.currentHealth <= 0) deadMinions.push(m.instanceId);
          }
          for (const id of deadMinions) {
            newState = destroyCard(newState, id, 'opponent');
          }
        }
        break;
      }
      case 'buff_per_realm': {
        const realmsCount = (newState.realmsVisited?.length || 0);
        const bprMinion = newState.players.player.battlefield.find((m: CardInstance) => m.instanceId === cardInstanceId);
        if (bprMinion && realmsCount > 0) {
          bprMinion.currentAttack = (bprMinion.currentAttack || 0) + (battlecry.buffAttack || 0) * realmsCount;
          bprMinion.currentHealth = (bprMinion.currentHealth || 0) + (battlecry.buffHealth || 0) * realmsCount;
          bprMinion.card = { ...bprMinion.card, attack: ((bprMinion.card as any).attack ?? 0) + (battlecry.buffAttack || 0) * realmsCount, health: ((bprMinion.card as any).health ?? 0) + (battlecry.buffHealth || 0) * realmsCount } as any;
          if (battlecry.bonusThreshold && realmsCount >= battlecry.bonusThreshold && battlecry.bonusKeyword === 'divine_shield') {
            bprMinion.hasDivineShield = true;
          }
        }
        break;
      }

      default:
        debug.error('Unknown battlecry type: ' + battlecry.type);
        return newState;
    }
  } catch (error) {
    debug.error('Error executing battlecry:', error);
    return state;
  }
  return newState;
}

/**
 * Execute a damage battlecry effect
 */
function executeDamageBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  // Get damage amount, default to 1 if not specified
  const damage = battlecry.value || 1;
  const dmgTarget = (battlecry as any).targetType as string | undefined;

  // Auto-targeted damage (no player target selection needed)
  if (dmgTarget === 'random_enemy') {
    const oppBf = state.players.opponent.battlefield || [];
    const targets = [...oppBf.map((m, i) => ({ type: 'minion' as const, idx: i })), { type: 'hero' as const, idx: -1 }];
    if (targets.length > 0) {
      const pick = targets[Math.floor(Math.random() * targets.length)];
      if (pick.type === 'hero') {
        state = dealDamage(state, 'opponent', 'hero', damage);
      } else {
        const m = oppBf[pick.idx];
        if (m.currentHealth === undefined) m.currentHealth = (m.card as MinionCardData).health || 1;
        if (m.hasDivineShield) {
          state.players.opponent.battlefield[pick.idx].hasDivineShield = false;
        } else {
          state.players.opponent.battlefield[pick.idx].currentHealth! -= damage;
          if (state.players.opponent.battlefield[pick.idx].currentHealth! <= 0) {
            state.players.opponent.battlefield.splice(pick.idx, 1);
          }
        }
      }
    }
    return state;
  }
  if (dmgTarget === 'enemy_hero') {
    return dealDamage(state, 'opponent', 'hero', damage);
  }

  // If no target is needed, return the state unchanged
  if (!battlecry.requiresTarget) {
    return state;
  }
  
  // Process damage based on target type
  if (targetType === 'hero') {
    // Targeting a hero
    if (targetId === 'opponent') {
      // Damage opponent hero using dealDamage utility
      state = dealDamage(state, 'opponent', 'hero', damage);
      
      // Game over check handled by dealDamage function
    } else {
      // Damage player hero (self-damage effects) using dealDamage utility
      state = dealDamage(state, 'player', 'hero', damage);
      
      // Game over check handled by dealDamage function
    }
  } else if (targetType === 'minion') {
    // Targeting a minion
    // Find target on opponent's battlefield
    const opponentBattlefield = state.players.opponent.battlefield || [];
    let targetInfo = findCardInstance(opponentBattlefield, targetId!);
    
    if (targetInfo) {
      // Target is on opponent's side
      const targetMinion = targetInfo.card;
      const targetIndex = targetInfo.index;
      const targetMinionCard = targetMinion.card as MinionCardData;
      
      // Ensure minion has a currentHealth value
      if (targetMinion.currentHealth === undefined) {
        targetMinion.currentHealth = targetMinionCard.health || 1;
      }
      
      // Check for Divine Shield
      if (targetMinion.hasDivineShield) {
        state.players.opponent.battlefield[targetIndex].hasDivineShield = false;
      } else {
        // Apply damage
        if (state.players.opponent.battlefield[targetIndex].currentHealth !== undefined) {
          state.players.opponent.battlefield[targetIndex].currentHealth -= damage;
          
          // Check if the minion is destroyed
          if (state.players.opponent.battlefield[targetIndex].currentHealth <= 0) {
            state.players.opponent.battlefield.splice(targetIndex, 1);
          }
        }
      }
    } else {
      // Check on player's battlefield (for self-targeting battlecries)
      const playerBattlefield = state.players.player.battlefield || [];
      targetInfo = findCardInstance(playerBattlefield, targetId!);
      
      if (!targetInfo) {
        debug.error('Target minion not found for battlecry');
        return state;
      }
      
      const targetMinion = targetInfo.card;
      const targetIndex = targetInfo.index;
      const targetMinionCard = targetMinion.card as MinionCardData;
      
      // Ensure minion has a currentHealth value
      if (targetMinion.currentHealth === undefined) {
        targetMinion.currentHealth = targetMinionCard.health || 1;
      }
      
      // Check for Divine Shield
      if (targetMinion.hasDivineShield) {
        state.players.player.battlefield[targetIndex].hasDivineShield = false;
      } else {
        // Apply damage
        if (state.players.player.battlefield[targetIndex].currentHealth !== undefined) {
          state.players.player.battlefield[targetIndex].currentHealth -= damage;
          
          // Check if the minion is destroyed
          if (state.players.player.battlefield[targetIndex].currentHealth <= 0) {
            state.players.player.battlefield.splice(targetIndex, 1);
          }
        }
      }
    }
  }
  
  return state;
}

/**
 * Execute a heal battlecry effect
 */
function executeHealBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  // Get heal amount, default to 2 if not specified
  const healAmount = battlecry.value || 2;
  const healTarget_ = (battlecry as any).targetType as string | undefined;

  // Auto-targeted heals (no player selection needed)
  if (healTarget_ === 'friendly_hero') {
    return healTarget(state, 'player', 'hero', healAmount);
  }
  if (healTarget_ === 'all_friendly_minions') {
    const bf = state.players.player.battlefield || [];
    for (const minion of bf) {
      state = healTarget(state, 'player', minion.instanceId, healAmount);
    }
    return state;
  }
  if (healTarget_ === 'all_friendly' || healTarget_ === 'all_friendly_characters') {
    state = healTarget(state, 'player', 'hero', healAmount);
    const bf = state.players.player.battlefield || [];
    for (const minion of bf) {
      state = healTarget(state, 'player', minion.instanceId, healAmount);
    }
    return state;
  }

  // If no target is needed, return the state unchanged
  if (!battlecry.requiresTarget) {
    return state;
  }
  
  // Process healing based on target type
  if (targetType === 'hero') {
    // Targeting a hero
    if (targetId === 'opponent') {
      // Heal opponent hero using healTarget function
      state = healTarget(state, 'opponent', 'hero', healAmount);
    } else {
      // Heal player hero using healTarget function
      state = healTarget(state, 'player', 'hero', healAmount);
    }
  } else if (targetType === 'minion') {
    // Targeting a minion
    // Find target on opponent's battlefield
    const opponentBattlefield = state.players.opponent.battlefield || [];
    let targetInfo = findCardInstance(opponentBattlefield, targetId!);
    
    if (targetInfo) {
      // Target is on opponent's side
      const targetMinion = targetInfo.card;
      
      // Use healTarget utility function
      state = healTarget(state, 'opponent', targetId!, healAmount);
    } else {
      // Check on player's battlefield
      const playerBattlefield = state.players.player.battlefield || [];
      targetInfo = findCardInstance(playerBattlefield, targetId!);
      
      if (!targetInfo) {
        debug.error('Target minion not found for heal battlecry');
        return state;
      }
      
      const targetMinion = targetInfo.card;
      
      // Use healTarget utility function
      state = healTarget(state, 'player', targetId!, healAmount);
    }
  }
  
  return state;
}

/**
 * Execute a buff battlecry effect (giving +X/+Y stats to a minion)
 */
function executeBuffBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  // Get buff values — default to 0 if grantKeywords exists (pure keyword grant), else 1
  const grantKeywords = (battlecry as any).grantKeywords as string[] | undefined;
  const defaultBuff = grantKeywords ? 0 : 1;
  const attackBuff = battlecry.buffAttack ?? defaultBuff;
  const healthBuff = battlecry.buffHealth ?? defaultBuff;

  // Handle AoE buffs first (no target required)
  if (battlecry.targetType === 'all_friendly_minions') {
    const battlefield = state.players.player.battlefield || [];
    for (let i = 0; i < battlefield.length; i++) {
      const minion = battlefield[i];
      const minionCard = minion.card as MinionCardData;
      if (minion.currentHealth === undefined) {
        minion.currentHealth = minionCard.health || 1;
      }
      const newAttack = (minionCard.attack || 0) + attackBuff;
      const newMaxHealth = (minionCard.health || 1) + healthBuff;
      const newCurrentHealth = (minion.currentHealth || 1) + healthBuff;
      battlefield[i].card = { ...minionCard, attack: newAttack, health: newMaxHealth } as MinionCardData;
      battlefield[i].currentHealth = newCurrentHealth;
      battlefield[i].currentAttack = newAttack;
      if (grantKeywords) {
        const existingKeywords = [...(battlefield[i].card.keywords || [])];
        for (const kw of grantKeywords) {
          if (!existingKeywords.includes(kw)) existingKeywords.push(kw);
          if (kw === 'divine_shield') battlefield[i].hasDivineShield = true;
        }
        battlefield[i].card = { ...battlefield[i].card, keywords: existingKeywords } as MinionCardData;
      }
    }
    return state;
  }

  // Handle filtered AoE buffs (e.g., all taunt minions)
  if (battlecry.targetType === 'all_friendly_taunt_minions') {
    const battlefield = state.players.player.battlefield || [];
    for (let i = 0; i < battlefield.length; i++) {
      const minion = battlefield[i];
      const kws = minion.card.keywords || [];
      if (!kws.includes('taunt') && !(minion as any).isTaunt) continue;
      const minionCard = minion.card as MinionCardData;
      if (minion.currentHealth === undefined) minion.currentHealth = minionCard.health || 1;
      const newAttack = (minionCard.attack || 0) + attackBuff;
      const newMaxHealth = (minionCard.health || 1) + healthBuff;
      const newCurrentHealth = (minion.currentHealth || 1) + healthBuff;
      battlefield[i].card = { ...minionCard, attack: newAttack, health: newMaxHealth } as MinionCardData;
      battlefield[i].currentHealth = newCurrentHealth;
      battlefield[i].currentAttack = newAttack;
    }
    return state;
  }

  // If no target is needed, return the state unchanged
  if (!battlecry.requiresTarget) {
    return state;
  }

  // Find target minion based on battlecry target type
  if (battlecry.targetType === 'friendly_minion' || battlecry.targetType === 'any_minion') {
    // Try to find on player's battlefield
    const playerBattlefield = state.players.player.battlefield || [];
    const targetInfo = findCardInstance(playerBattlefield, targetId!);
    
    if (!targetInfo) {
      debug.error('Target minion not found for buff battlecry');
      return state;
    }
    
    const targetMinion = targetInfo.card;
    const targetIndex = targetInfo.index;
    const targetMinionCard = targetMinion.card as MinionCardData;
    
    // Ensure minion has a currentHealth value
    if (targetMinion.currentHealth === undefined) {
      targetMinion.currentHealth = targetMinionCard.health || 1;
    }
    
    // Apply buff to attack and health
    const newAttack = (targetMinionCard.attack || 0) + attackBuff;
    const currentHealth = targetMinion.currentHealth || 1;
    const maxHealth = targetMinionCard.health || 1;
    const newMaxHealth = maxHealth + healthBuff;
    const newCurrentHealth = currentHealth + healthBuff;
    
    // Ensure player battlefield exists
    if (!state.players.player.battlefield) {
      state.players.player.battlefield = [];
      debug.error('Player battlefield was undefined during buff battlecry');
      return state;
    }
    
    // Update the card's stats
    state.players.player.battlefield[targetIndex].card = {
      ...targetMinion.card,
      attack: newAttack,
      health: newMaxHealth
    } as MinionCardData;
    
    // Update current health
    state.players.player.battlefield[targetIndex].currentHealth = newCurrentHealth;
    
  } else if (battlecry.targetType === 'enemy_minion') {
    // Try to find on opponent's battlefield (for debuffs or enemy buffs)
    const opponentBattlefield = state.players.opponent.battlefield || [];
    const targetInfo = findCardInstance(opponentBattlefield, targetId!);
    
    if (!targetInfo) {
      debug.error('Target enemy minion not found for buff battlecry');
      return state;
    }
    
    const targetMinion = targetInfo.card;
    const targetIndex = targetInfo.index;
    const targetMinionCard = targetMinion.card as MinionCardData;
    
    // Ensure minion has a currentHealth value
    if (targetMinion.currentHealth === undefined) {
      targetMinion.currentHealth = targetMinionCard.health || 1;
    }
    
    // Apply buff to attack and health
    const newAttack = (targetMinionCard.attack || 0) + attackBuff;
    const currentHealth = targetMinion.currentHealth || 1;
    const maxHealth = targetMinionCard.health || 1;
    const newMaxHealth = maxHealth + healthBuff;
    const newCurrentHealth = currentHealth + healthBuff;
    
    // Ensure opponent battlefield exists
    if (!state.players.opponent.battlefield) {
      state.players.opponent.battlefield = [];
      debug.error('Opponent battlefield was undefined during buff battlecry');
      return state;
    }
    
    // Update the card's stats
    state.players.opponent.battlefield[targetIndex].card = {
      ...targetMinion.card,
      attack: newAttack,
      health: newMaxHealth
    } as MinionCardData;
    
    // Update current health
    state.players.opponent.battlefield[targetIndex].currentHealth = newCurrentHealth;
    
  }
  
  return state;
}

/**
 * Execute a buff tribe battlecry effect (e.g. Coldlight Seer buffing all Murlocs)
 * This handles cards like Coldlight Seer that buff all minions of a specific tribe
 */
function executeBuffTribeBattlecry(
  state: GameState,
  cardInstanceId: string,
  battlecry: BattlecryEffect
): GameState {
  // Create a deep copy of the state to avoid mutation
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  try {
    // Get the source card (the one with the buff tribe battlecry)
    const cardInfo = findCardInstance(newState.players.player.battlefield || [], cardInstanceId);
    if (!cardInfo) {
      debug.error('Card not found for buff tribe battlecry', cardInstanceId);
      return state;
    }
    
    const sourceCard = cardInfo.card;
    const tribeName = battlecry.tribe || '';
    
    if (!tribeName) {
      debug.error('No tribe specified for buff tribe battlecry');
      return state;
    }
    
    
    // Get buff values from the battlecry
    const attackBuff = battlecry.buffAttack || (battlecry as any).buffs?.attack || 0;
    const healthBuff = battlecry.buffHealth || (battlecry as any).buffs?.health || 0;
    
    // Only proceed if at least one stat is being buffed
    if (attackBuff === 0 && healthBuff === 0) {
      debug.error('No buff values provided for buff tribe battlecry');
      return state;
    }
    
    // Track buffed minions for logging
    let buffedCount = 0;
    
    // Apply buffs to all matching minions on the player's battlefield
    if (newState.players.player.battlefield) {
      newState.players.player.battlefield.forEach((minion, index) => {
        // Skip the source minion if it's "other" minions only (which is the usual case)
        if (minion.instanceId === cardInstanceId) {
          return;
        }
        
        // Check if this minion belongs to the specified tribe
        if (isCardOfTribe(minion.card, tribeName)) {
          // Found a matching minion, buff it
          const minionCard = minion.card as MinionCardData;
          const currentAttack = minionCard.attack || 0;
          const currentHealth = minionCard.health || 0;
          const currentHealthValue = minion.currentHealth || currentHealth;
          
          // Update the stats
          newState.players.player.battlefield[index].card = {
            ...minion.card,
            attack: currentAttack + attackBuff,
            health: currentHealth + healthBuff
          } as MinionCardData;
          
          // Update current health
          newState.players.player.battlefield[index].currentHealth = currentHealthValue + healthBuff;
          
          buffedCount++;
        }
      });
    }
    
    
    // Trigger animation
    const addAnimation = useAnimationStore.getState().addAnimation;
    addAnimation({
      id: `buff-tribe-${tribeName}-${Date.now()}`,
      type: 'buff',
      sourceId: sourceCard.card.id as number,
      position: { x: 400, y: 300 },
      duration: 800
    } as any);
    
    return newState;
  } catch (error) {
    debug.error('Error executing buff tribe battlecry:', error);
    return state;
  }
}

/**
 * Execute a summon battlecry effect (summoning a specific minion)
 */
function executeSummonBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  // Check board limit before summoning
  if (state.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return state;
  }

  // Support both summonCardId and tokenId field names
  const cardId = battlecry.summonCardId || (battlecry as any).tokenId;
  const summonCount = (battlecry as any).count || 1;

  if (!cardId) {
    debug.error('No card ID provided for summon battlecry');
    return state;
  }

  const cardToSummon = getCardById(cardId);

  if (!cardToSummon) {
    debug.error(`Card with ID ${cardId} not found for summoning`);
    return state;
  }

  for (let i = 0; i < summonCount; i++) {
    if (state.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
    const summonedCard = createCardInstance(cardToSummon);
    summonedCard.isPlayed = true;
    if (!state.players.player.battlefield) {
      state.players.player.battlefield = [];
    }
    state.players.player.battlefield.push(summonedCard);
    trackQuestProgress('player', 'summon_minion', summonedCard.card);
  }

  return state;
}

const MAX_BOARD_SIZE = MAX_BATTLEFIELD_SIZE;

function executeSummonRandomBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const count = (battlecry as any).value || (battlecry as any).count || 1;
  const pool = (battlecry as any).pool as (number | string)[] | undefined;
  const manaCostFilter = (battlecry as any).manaCost as number | undefined;
  const raceFilter = (battlecry as any).race as string | undefined;

  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  const availableSlots = MAX_BOARD_SIZE - state.players.player.battlefield.length;
  if (availableSlots <= 0) return state;
  const actualCount = Math.min(count, availableSlots);

  let candidates: CardData[];
  if (pool && pool.length > 0) {
    candidates = allCards.filter(c => pool.includes(c.id));
  } else {
    candidates = allCards.filter(c => c.type === 'minion');
    if (manaCostFilter !== undefined) {
      candidates = candidates.filter(c => c.manaCost === manaCostFilter);
    }
    if (raceFilter) {
      candidates = candidates.filter(c => ((c as any).race || '').toLowerCase() === raceFilter.toLowerCase());
    }
  }

  if (candidates.length === 0) return state;

  for (let i = 0; i < actualCount; i++) {
    if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    const instance = createCardInstance(selected);
    instance.isPlayed = true;
    state.players.player.battlefield.push(instance);
  }
  return state;
}

function executeSummonCopyBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  const availableSlots = MAX_BOARD_SIZE - state.players.player.battlefield.length;
  if (availableSlots <= 0) return state;

  const condition = (battlecry as any).condition as string | undefined;
  if (condition) {
    const bf = state.players.player.battlefield;
    if (condition === 'has_taunt' && !bf.some(m => getCardKeywords(m.card).includes('taunt'))) return state;
    if (condition === 'has_divine_shield' && !bf.some(m => m.hasDivineShield || getCardKeywords(m.card).includes('divine_shield'))) return state;
    if (condition === 'holding_dragon' && !(state.players.player.hand || []).some(c => isCardOfTribe(c.card, 'dragon'))) return state;
  }

  const sourceCard = state.players.player.battlefield.find(m => m.instanceId === cardInstanceId);
  if (!sourceCard) return state;

  const count = Math.min((battlecry as any).count || 1, availableSlots);
  for (let i = 0; i < count; i++) {
    if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;
    const cardData = getCardById(sourceCard.card.id as number);
    if (cardData) {
      const copy = createCardInstance(cardData);
      copy.isPlayed = true;
      state.players.player.battlefield.push(copy);
    }
  }
  return state;
}

function executeFillBoardBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  const availableSlots = MAX_BOARD_SIZE - state.players.player.battlefield.length;
  if (availableSlots <= 0) return state;

  const summonCardId = (battlecry as any).summonCardId as number | undefined;
  const summonName = (battlecry as any).summonName as string | undefined;
  const summonAttack = (battlecry as any).summonAttack as number | undefined;
  const summonHealth = (battlecry as any).summonHealth as number | undefined;

  for (let i = 0; i < availableSlots; i++) {
    if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;

    if (summonCardId) {
      const cardData = getCardById(summonCardId);
      if (cardData) {
        const instance = createCardInstance(cardData);
        instance.isPlayed = true;
        if (summonAttack !== undefined) (instance.card as any).attack = summonAttack;
        if (summonHealth !== undefined) {
          (instance.card as any).health = summonHealth;
          instance.currentHealth = summonHealth;
        }
        state.players.player.battlefield.push(instance);
      }
    } else {
      const tokenCard: CardData = {
        id: 99990 + i,
        name: summonName || 'Whelp',
        description: 'Summoned token',
        manaCost: 1,
        type: 'minion',
        rarity: 'token' as any,
        heroClass: 'neutral',
        attack: summonAttack !== undefined ? summonAttack : 1,
        health: summonHealth !== undefined ? summonHealth : 1,
        keywords: []
      } as any;
      const instance = createCardInstance(tokenCard);
      instance.isPlayed = true;
      state.players.player.battlefield.push(instance);
    }
  }
  return state;
}

function executeSummonYggdrasilGolemBattlecry(
  state: GameState
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  const player = state.players.player as any;
  const currentCounter = player.yggdrasilGolemCounter || 0;
  player.yggdrasilGolemCounter = currentCounter + 1;
  const golemSize = Math.min(currentCounter + 1, 30);

  const golemCard: CardData = {
    id: 85100 + golemSize,
    name: 'Yggdrasil Golem',
    description: `A ${golemSize}/${golemSize} Yggdrasil Golem.`,
    manaCost: Math.min(golemSize, 10),
    type: 'minion',
    rarity: 'token' as any,
    heroClass: 'neutral',
    attack: golemSize,
    health: golemSize,
    keywords: []
  } as any;

  const instance = createCardInstance(golemCard);
  instance.isPlayed = true;
  state.players.player.battlefield.push(instance);
  return state;
}

function executeSummonRandomMinionsBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const count = (battlecry as any).value || (battlecry as any).count || 1;
  const manaCostFilter = (battlecry as any).manaCost as number | undefined;
  const minManaCost = (battlecry as any).minManaCost as number | undefined;
  const maxManaCost = (battlecry as any).maxManaCost as number | undefined;
  const raceFilter = (battlecry as any).race as string | undefined;
  const rarityFilter = (battlecry as any).rarity as string | undefined;

  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  const availableSlots = MAX_BOARD_SIZE - state.players.player.battlefield.length;
  if (availableSlots <= 0) return state;
  const actualCount = Math.min(count, availableSlots);

  let candidates = allCards.filter(c => c.type === 'minion');
  if (manaCostFilter !== undefined) candidates = candidates.filter(c => c.manaCost === manaCostFilter);
  if (minManaCost !== undefined) candidates = candidates.filter(c => (c.manaCost ?? 0) >= minManaCost);
  if (maxManaCost !== undefined) candidates = candidates.filter(c => (c.manaCost ?? 0) <= maxManaCost);
  if (raceFilter) candidates = candidates.filter(c => ((c as any).race || '').toLowerCase() === raceFilter.toLowerCase());
  if (rarityFilter) candidates = candidates.filter(c => c.rarity === rarityFilter);

  if (candidates.length === 0) return state;

  const usedIndices = new Set<number>();
  for (let i = 0; i < actualCount; i++) {
    if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;
    let available = candidates.filter((_, idx) => !usedIndices.has(idx));
    if (available.length === 0) {
      available = candidates;
      usedIndices.clear();
    }
    const randomIdx = Math.floor(Math.random() * available.length);
    const selected = available[randomIdx];
    const originalIdx = candidates.indexOf(selected);
    usedIndices.add(originalIdx);
    const instance = createCardInstance(selected);
    instance.isPlayed = true;
    state.players.player.battlefield.push(instance);
  }
  return state;
}

function executeSummonCopyFromDeckBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  const availableSlots = MAX_BOARD_SIZE - state.players.player.battlefield.length;
  if (availableSlots <= 0) return state;

  const count = (battlecry as any).value || (battlecry as any).count || 1;
  const statOverride = (battlecry as any).statOverride as boolean | undefined;
  const overrideAttack = (battlecry as any).attack as number | undefined;
  const overrideHealth = (battlecry as any).health as number | undefined;

  const deck = (state.players.player.deck || []) as any[];
  const minionsInDeck = deck.filter(
    c => (c.card ? c.card.type : c.type) === 'minion'
  );
  if (minionsInDeck.length === 0) return state;

  const actualCount = Math.min(count, availableSlots, minionsInDeck.length);
  const shuffled = [...minionsInDeck].sort(() => Math.random() - 0.5);

  for (let i = 0; i < actualCount; i++) {
    if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;
    const deckMinion = shuffled[i];
    const minionId = deckMinion.card ? deckMinion.card.id : deckMinion.id;
    let cardData = getCardById(minionId);
    
    if (cardData) {
      const instance = createCardInstance(cardData);
      instance.isPlayed = true;
      if (statOverride) {
        (instance.card as any).attack = overrideAttack !== undefined ? overrideAttack : 1;
        const hp = overrideHealth !== undefined ? overrideHealth : 1;
        (instance.card as any).health = hp;
        instance.currentHealth = hp;
      }
      state.players.player.battlefield.push(instance);
    } else if (deckMinion.card) {
      // Fallback: create CardInstance directly from deck card's data when allCards lookup fails
      const instance = createCardInstance(deckMinion.card);
      instance.isPlayed = true;
      if (statOverride) {
        (instance.card as any).attack = overrideAttack !== undefined ? overrideAttack : 1;
        const hp = overrideHealth !== undefined ? overrideHealth : 1;
        (instance.card as any).health = hp;
        instance.currentHealth = hp;
      }
      state.players.player.battlefield.push(instance);
    }
  }
  return state;
}

function executeSummonFromSpellCostBattlecry(
  state: GameState
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  const spellDeck = (state.players.player.deck || []) as any[];
  const spellsInDeck = spellDeck.filter(
    c => (c.card ? c.card.type : c.type) === 'spell'
  );
  if (spellsInDeck.length === 0) return state;

  const randomIdx = Math.floor(Math.random() * spellsInDeck.length);
  const revealedSpell = spellsInDeck[randomIdx];
  const spellCost = revealedSpell.card ? revealedSpell.card.manaCost : revealedSpell.manaCost;

  const spellId = revealedSpell.instanceId || revealedSpell.id;
  const deckIdx = spellDeck.findIndex(
    (c: any) => (c.instanceId || c.id) === spellId
  );
  if (deckIdx !== -1) {
    (state.players.player.deck as any[]).splice(deckIdx, 1);
    if (!state.players.player.graveyard) state.players.player.graveyard = [] as any;
    (state.players.player.graveyard as any[]).push(revealedSpell);
  }

  const minionsWithCost = allCards.filter(
    c => c.type === 'minion' && c.manaCost === spellCost
  );
  if (minionsWithCost.length === 0) return state;

  const selected = minionsWithCost[Math.floor(Math.random() * minionsWithCost.length)];
  const instance = createCardInstance(selected);
  instance.isPlayed = true;
  state.players.player.battlefield.push(instance);
  return state;
}

function executeSummonSkeletonsBasedOnGraveyardBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  const availableSlots = MAX_BOARD_SIZE - state.players.player.battlefield.length;
  if (availableSlots <= 0) return state;

  const graveyard = (state.players.player.graveyard || []) as any[];
  const graveyardMinionCount = graveyard.filter(c => (c.card ? c.card.type : c.type) === 'minion').length;
  if (graveyardMinionCount === 0) return state;

  const maxSkeletons = (battlecry as any).value || 3;
  const skeletonsToSummon = Math.min(graveyardMinionCount, maxSkeletons, availableSlots);

  const skeletonCardId = (battlecry as any).summonCardId || 4900;
  const skeletonData = getCardById(skeletonCardId);

  for (let i = 0; i < skeletonsToSummon; i++) {
    if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;
    if (skeletonData) {
      const instance = createCardInstance(skeletonData);
      instance.isPlayed = true;
      state.players.player.battlefield.push(instance);
    } else {
      const tokenCard: CardData = {
        id: 4900,
        name: 'Skeleton',
        description: 'Summoned skeleton',
        manaCost: 1,
        type: 'minion',
        rarity: 'token' as any,
        heroClass: 'neutral',
        attack: 1,
        health: 1,
        keywords: []
      } as any;
      const instance = createCardInstance(tokenCard);
      instance.isPlayed = true;
      state.players.player.battlefield.push(instance);
    }
  }
  return state;
}

/**
 * Execute a draw battlecry effect (drawing X cards)
 */
function executeDrawBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  // Get number of cards to draw, default to 1 if not specified
  const cardsToDraw = battlecry.value || 1;
  let drawnCount = 0;
  
  // Check if we need to draw specific card types (e.g., Murlocs)
  const cardType = battlecry.cardType?.toLowerCase();
  
  // Handle discard effects (negative card draw values)
  if (cardsToDraw < 0) {
    const cardsToDiscard = Math.abs(cardsToDraw);
    
    // Only discard if there are cards in hand
    if (state.players.player.hand.length > 0) {
      // Choose random cards to discard
      for (let i = 0; i < cardsToDiscard; i++) {
        if (state.players.player.hand.length === 0) break;
        
        // Get a random index
        const randomIndex = Math.floor(Math.random() * state.players.player.hand.length);
        const discardedCard = state.players.player.hand[randomIndex];
        
        // Remove the card from hand
        state.players.player.hand.splice(randomIndex, 1);
      }
    } else {
    }
    
    return state;
  }
  
  
  // If filtering by card type, create a filtered deck copy
  let eligibleCards = [...state.players.player.deck];
  
  if (cardType) {
    
    // Debug all cards in the deck BEFORE filtering
    state.players.player.deck.forEach(card => {
      // Using our new utility function to get tribe/race consistently
      const tribe = getCardTribe(card);
    });
    
    // Use our new utility functions for consistent tribe/race checking
    if (cardType === 'naga' || cardType === 'murloc') {
      eligibleCards = state.players.player.deck.filter(card => isNagaCard(card));
    } else if (cardType === 'beast' || cardType === 'dragon' ||
               cardType === 'automaton' || cardType === 'mech' || cardType === 'demon' ||
               cardType === 'elemental' || cardType === 'totem' ||
               cardType === 'pirate' || cardType === 'einherjar') {
      eligibleCards = state.players.player.deck.filter(card => isCardOfTribe(card, cardType));
    } else {
      // For non-tribe filtering (like card types: spell, weapon, etc.)
      eligibleCards = state.players.player.deck.filter(card => 
        card.type?.toLowerCase() === cardType
      );
    }
    
    // Log matching cards
    eligibleCards.forEach(card => {
      const tribe = getCardTribe(card);
    });
    
    
    // If no cards found, try fallback to allCards to ensure at least some cards are available
    if (eligibleCards.length === 0) {
      
      // Check hand for matching cards using our new utility functions
      if (cardType === 'naga' || cardType === 'murloc') {
        const handNagas = state.players.player.hand
          .filter(cardInstance => isNagaCard(cardInstance))
          .map(instance => instance.card);

        eligibleCards = [...handNagas];
      } else {
        const handTribes = state.players.player.hand
          .filter(cardInstance => isCardOfTribe(cardInstance, cardType))
          .map(instance => instance.card);
        
        eligibleCards = [...handTribes];
      }
      
      if (eligibleCards.length === 0) {
        
        if (cardType === 'naga' || cardType === 'murloc') {
          const nagaCards = allCards.filter((card: CardData) => isNagaCard(card));
          eligibleCards = nagaCards.slice(0, cardsToDraw);
        }
      }
    }
  }
  
  // Draw cards from the eligible cards
  while (drawnCount < cardsToDraw && eligibleCards.length > 0) {
    // Get the first eligible card
    const drawnCard = eligibleCards[0];
    
    // Remove from eligible cards
    eligibleCards.splice(0, 1);
    
    // Log detailed information about the card being drawn
    const cardTribe = getCardTribe(drawnCard);
    
    // Remove from the actual deck if it exists there
    const indexInDeck = state.players.player.deck.findIndex(
      card => card.id === drawnCard.id
    );
    
    if (indexInDeck !== -1) {
      // Card exists in deck, remove it
      state.players.player.deck.splice(indexInDeck, 1);
    } else {
      // Card doesn't exist in deck, but we'll still add it to hand
      // This is a special case for when we had to use the fallback
    }
    
    if (state.players.player.hand.length >= MAX_HAND_SIZE) break;
    const cardInstance = createCardInstance(drawnCard);
    state.players.player.hand.push(cardInstance);

    drawnCount++;
  }
  
  // Log if we couldn't draw enough cards
  if (drawnCount < cardsToDraw) {
  } else {
  }
  
  // Apply armor gain if specified on the draw battlecry
  const armorGain = (battlecry as any).armor as number | undefined;
  if (armorGain && armorGain > 0) {
    state.players.player.heroArmor = Math.min(30, (state.players.player.heroArmor || 0) + armorGain);
  }

  if (typeof window !== 'undefined' && drawnCount > 0) {
    setTimeout(() => {
      const animationStore = useAnimationStore.getState();

      animationStore.addAnimation({
        id: `draw_cards_player_${Date.now()}`,
        type: 'card_draw_notification',
        startTime: Date.now(),
        value: drawnCount,
        playerId: 'player',
        cardName: cardType ? `${cardType} card${drawnCount > 1 ? 's' : ''}` : undefined,
        duration: 2500
      } as any);

      if (cardType === 'murloc' || cardType === 'beast') {
        const src = cardType === 'murloc' ? assetPath('/sounds/tribes/murloc_summon.mp3') : assetPath('/sounds/tribes/beast_summon.mp3');
        try {
          const a = document.querySelector<HTMLAudioElement>(`audio[data-pool="${src}"]`) || (() => {
            const el = new Audio(src);
            el.setAttribute('data-pool', src);
            el.preload = 'auto';
            return el;
          })();
          a.volume = 0.7;
          a.currentTime = 0;
          a.play().catch(err => debug.warn('[battlecryUtils] Audio play blocked:', err));
        } catch { /* no audio */ }
      }
    }, 100);
  }
  
  return state;
}

/**
 * Execute a battlecry effect that draws cards for both players
 * Used for cards like Coldlight Oracle: "Battlecry: Each player draws 2 cards."
 */
function executeDrawBothBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  // Get number of cards to draw, default to 2 if not specified
  const cardsToDraw = battlecry.value || 2;
  let playerDrawnCount = 0;
  let opponentDrawnCount = 0;
  
  
  // Draw cards for player
  for (let i = 0; i < cardsToDraw; i++) {
    if (state.players.player.deck.length > 0 && state.players.player.hand.length < MAX_HAND_SIZE) {
      const drawnCard = state.players.player.deck.shift()!;
      const cardInstance = createCardInstance(drawnCard);
      state.players.player.hand.push(cardInstance);
      playerDrawnCount++;
    }
  }

  // Draw cards for opponent
  for (let i = 0; i < cardsToDraw; i++) {
    if (state.players.opponent.deck.length > 0 && state.players.opponent.hand.length < MAX_HAND_SIZE) {
      const drawnCard = state.players.opponent.deck.shift()!;
      const cardInstance = createCardInstance(drawnCard);
      state.players.opponent.hand.push(cardInstance);
      opponentDrawnCount++;
    } else {
      // Apply fatigue damage here if needed
    }
  }
  
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      const animationStore = useAnimationStore.getState();
      
      if (playerDrawnCount > 0) {
        animationStore.addAnimation({
          id: `draw_cards_player_${Date.now()}`,
          type: 'card_draw_notification',
          startTime: Date.now(),
          value: playerDrawnCount,
          playerId: 'player',
          duration: 2500
        } as any);
      }
      
      if (opponentDrawnCount > 0) {
        animationStore.addAnimation({
          id: `draw_cards_opponent_${Date.now()}`,
          type: 'card_draw_notification',
          startTime: Date.now(),
          value: opponentDrawnCount,
          playerId: 'opponent',
          duration: 2500
        } as any);
      }
    }, 100);
  }
  
  return state;
}

/**
 * Execute a discover battlecry effect - allowing the player to discover a card
 */
function executeDiscoverBattlecry(
  state: GameState,
  cardInstanceId: string,
  battlecry: BattlecryEffect
): GameState {
  
  try {
    // Get cards from the discovery pool
    let discoveryCards: CardData[] = [];
    
    if (battlecry.discoveryPoolId) {
      // Get cards from a predefined pool like 'beast', 'dragon', etc.
      discoveryCards = getCardsFromPool(battlecry.discoveryPoolId);
    } else {
      // Map special discovery types to valid type values for discovery
      let discoveryCardType: 'spell' | 'minion' | 'weapon' | 'secret' | 'any' = 'any';
      if (battlecry.discoveryType) {
        // Handle special discovery types that aren't direct CardType values
        if (battlecry.discoveryType === 'taunt_minion' || battlecry.discoveryType === 'deathrattle_minion') {
          discoveryCardType = 'minion';
        } else if (battlecry.discoveryType === 'spell') {
          discoveryCardType = 'spell';
        } else if (battlecry.discoveryType === 'minion') {
          discoveryCardType = 'minion';
        } else if (battlecry.discoveryType === 'weapon') {
          discoveryCardType = 'weapon';
        } else if (battlecry.discoveryType === 'secret') {
          discoveryCardType = 'secret';
        }
      }
      
      // Fall back to general discovery based on type if no pool is specified
      discoveryCards = getDiscoveryOptions(
        3, // Default to 3 options
        discoveryCardType,
        battlecry.discoveryClass || 'any',
        'any', // Card rarity
        battlecry.discoveryManaCost || 'any',
        'any' // Mana cost range
      );
    }
    
    // If we couldn't get any cards, return the state unchanged
    if (discoveryCards.length === 0) {
      debug.error('No cards available for discovery');
      return state;
    }
    
    // Map special discovery types to valid discoveryType values for SpellEffect
    let spellDiscoveryType: 'spell' | 'minion' | 'weapon' | 'secret' | 'any' | undefined = undefined;
    if (battlecry.discoveryType) {
      if (battlecry.discoveryType === 'taunt_minion' || battlecry.discoveryType === 'deathrattle_minion') {
        spellDiscoveryType = 'minion';
      } else if (['spell', 'minion', 'weapon', 'secret', 'any'].includes(battlecry.discoveryType)) {
        spellDiscoveryType = battlecry.discoveryType as 'spell' | 'minion' | 'weapon' | 'secret' | 'any';
      } else {
        spellDiscoveryType = 'any';
      }
    } else {
      spellDiscoveryType = 'any';
    }
    
    // Create a discovery effect to use with the existing discovery system
    const dummySpellEffect: SpellEffect = {
      type: 'discover',
      requiresTarget: false,
      discoveryType: spellDiscoveryType,
      discoveryClass: battlecry.discoveryClass || 'any',
      discoveryCount: battlecry.discoveryCount || 3,
      discoveryRarity: 'any',
      discoveryManaCost: battlecry.discoveryManaCost || 'any',
      discoveryPoolId: battlecry.discoveryPoolId,
      targetType: 'none'
    };
    
    // Create a discovery state
    const discoveryState = createDiscoveryFromSpell(state, dummySpellEffect, cardInstanceId);
    
    // Override the options with our discovery cards
    discoveryState.options = discoveryCards.slice(0, 3); // Limit to 3 options
    discoveryState.allOptions = [...discoveryCards]; // Store all for filtering
    
    // Special handling for opponent's turn - AI should auto-select a card instead of showing the discovery UI
    if (state.currentTurn === 'opponent') {
      
      // Choose a card with higher value/cost for the AI (simple heuristic)
      let bestCardIndex = 0;
      let bestCardValue = -1;
      
      discoveryState.options.forEach((card, index) => {
        // Simple AI heuristic: prefer higher mana cost cards as a starting point
        let cardValue = (card.manaCost ?? 0) * 2;
        
        // Add value for keywords that are generally powerful
        if (getCardKeywords(card).includes('taunt')) cardValue += 2;
        if (getCardKeywords(card).includes('divine_shield')) cardValue += 3;
        if (getCardKeywords(card).includes('rush') || getCardKeywords(card).includes('charge')) cardValue += 4;
        if (getCardKeywords(card).includes('poisonous')) cardValue += 3;
        if (getCardKeywords(card).includes('windfury')) cardValue += 2;
        if (getCardKeywords(card).includes('lifesteal')) cardValue += 3;
        
        // Add value for high attack or health (only for minions)
        if (card.type === 'minion') {
          const minionCard = card as MinionCardData;
          if (minionCard.attack && minionCard.attack > 4) cardValue += minionCard.attack; 
          if (minionCard.health && minionCard.health > 4) cardValue += minionCard.health;
        }
        
        if (cardValue > bestCardValue) {
          bestCardValue = cardValue;
          bestCardIndex = index;
        }
      });
      
      const selectedCard = discoveryState.options[bestCardIndex];
      
      
      // Add the selected card directly to the opponent's hand as CardInstance
      if (state.players.opponent.hand.length < MAX_HAND_SIZE) {
        const cardInstance = createCardInstance(selectedCard);
        state.players.opponent.hand.push(cardInstance);
      }
      
      // Return the state without setting up the discovery UI since the AI handled it
      return state;
    }
    
    // For the player's turn, update the game state with the discovery UI
    return {
      ...state,
      discovery: discoveryState
    };
  } catch (error) {
    debug.error('Error executing discover battlecry:', error);
    return state;
  }
}

/**
 * Check if a card requires a battlecry target
 */
export function requiresBattlecryTarget(card: CardData): boolean {
  if (card.type !== 'minion') return false;
  const minionCard = card as MinionCardData;
  return (
    getCardKeywords(card).includes('battlecry') &&
    minionCard.battlecry !== undefined &&
    minionCard.battlecry.requiresTarget === true
  );
}

/**
 * Execute a set health battlecry effect (setting a hero's health to a specific value)
 */
function executeSetHealthBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  // Get the health value to set
  const healthValue = battlecry.value || 15; // Default to 15 for Alexstrasza
  
  // If no target is needed or target is not a hero, return the state unchanged
  if (!battlecry.requiresTarget || targetType !== 'hero') {
    debug.error('Set health battlecry requires a hero target');
    return state;
  }
  
  // Set health based on target (keep both fields in sync)
  if (targetId === 'opponent') {
    state.players.opponent.health = healthValue;
    state.players.opponent.heroHealth = healthValue;
  } else {
    state.players.player.health = healthValue;
    state.players.player.heroHealth = healthValue;
  }
  
  return state;
}

/**
 * Execute a cast all spells battlecry effect (like Zul'jin / Skoll Death-Hunter)
 * Replays random spells equal to spellsCastThisGame count.
 */
function executeCastAllSpellsBattlecry(state: GameState): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const spellsCast = (newState.players.player as any).spellsCastThisGame || 0;
  if (spellsCast === 0) return newState;

  const { getCardDatabase } = require('../data/cardDatabaseUtils');
  const { executeSpell } = require('./spells/spellUtils');
  const cardDatabase = getCardDatabase();
  const allSpells = cardDatabase.filter((card: CardData) => card.type === 'spell');
  if (allSpells.length === 0) return newState;

  let result = newState;
  for (let i = 0; i < spellsCast; i++) {
    const randomSpell = allSpells[Math.floor(Math.random() * allSpells.length)];
    const fakeInstance = {
      instanceId: `replay-spell-${i}`,
      card: randomSpell,
      currentHealth: 0,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0,
    } as CardInstance;
    if ((randomSpell as any).spellEffect) {
      result = executeSpell(result, fakeInstance);
    }
  }
  return result;
}

/**
 * Cast a random spell from the opponent's hand with random targets.
 */
function executeCastOpponentSpellBattlecry(state: GameState): GameState {
	const newState = JSON.parse(JSON.stringify(state)) as GameState;
	const opponentHand = newState.players.opponent.hand || [];
	const spellIndices: number[] = [];
	opponentHand.forEach((c, i) => {
		if (c.card.type === 'spell') spellIndices.push(i);
	});
	if (spellIndices.length === 0) return newState;

	const pickedIndex = spellIndices[Math.floor(Math.random() * spellIndices.length)];
	const spellCard = opponentHand[pickedIndex];
	newState.players.opponent.hand = opponentHand.filter((_, i) => i !== pickedIndex);

	const { executeSpell } = require('./spells/spellUtils');
	const fakeInstance = {
		instanceId: `cast-opponent-spell-${uuidv4()}`,
		card: spellCard.card,
		currentHealth: 0,
		canAttack: false,
		isPlayed: true,
		isSummoningSick: false,
		attacksPerformed: 0,
	} as CardInstance;

	if ((spellCard.card as any).spellEffect) {
		return executeSpell(newState, fakeInstance);
	}
	return newState;
}

/**
 * Execute a debuff battlecry effect (reducing a minion's stats)
 */
function executeDebuffBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  // Get debuff values
  const attackDebuff = battlecry.buffAttack || -1;
  
  // If no target is needed, return the state unchanged
  if (!battlecry.requiresTarget) {
    return state;
  }
  
  // Since this is a debuff, we're likely targeting an enemy minion
  if (battlecry.targetType === 'enemy_minion') {
    // Find the target on opponent's battlefield
    const targetInfo = findCardInstance(state.players.opponent.battlefield, targetId!);
    
    if (!targetInfo) {
      debug.error('Target enemy minion not found for debuff battlecry');
      return state;
    }
    
    const targetMinion = targetInfo.card;
    const targetIndex = targetInfo.index;
    const targetMinionCard = targetMinion.card as MinionCardData;
    
    // Ensure card attack value is defined
    if (targetMinionCard.attack === undefined) {
      targetMinionCard.attack = 0;
    }
    
    // Handle the Aldor Peacekeeper special case (set attack to 1)
    let newAttack = targetMinionCard.attack || 0;
    if (attackDebuff === -1000) { // Special value we defined for "set to 1"
      newAttack = 1;
    } else {
      // Apply regular debuff, but don't go below 0
      newAttack = Math.max(0, (targetMinionCard.attack || 0) + attackDebuff);
    }
    
    // Update the card's attack
    state.players.opponent.battlefield[targetIndex].card = {
      ...targetMinion.card,
      attack: newAttack
    } as MinionCardData;
    
  }
  
  return state;
}

/**
 * Execute an add to hand battlecry effect (adding cards to player's hand)
 */
function executeAddToHandBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  // Get number of cards to add and the card ID if specified
  const numCards = battlecry.value || 1;
  const cardId = battlecry.summonCardId; // Optional specific card to add
  
  if (cardId) {
    // Add a specific card to the hand
    const cardToAdd = getCardById(cardId);
    
    if (!cardToAdd) {
      debug.error(`Card with ID ${cardId} not found for add to hand battlecry`);
      return state;
    }
    
    // Add the specific card to hand
    for (let i = 0; i < numCards; i++) {
      if (state.players.player.hand.length >= MAX_HAND_SIZE) {
        break;
      }

      // Create a card instance and add it to the hand
      const cardInstance = createCardInstance(cardToAdd);
      state.players.player.hand.push(cardInstance);
    }
  } else {
    // Add random cards (like a discovery/random generation effect)
    // For now, just adding random cards from the database as a placeholder
    for (let i = 0; i < numCards; i++) {
      if (state.players.player.hand.length >= MAX_HAND_SIZE) {
        break;
      }
      
      // Generate a random card as a placeholder
      // In a real implementation, this would follow specific rules based on the card's effect
      const randomIndex = Math.floor(Math.random() * allCards.length);
      const randomCard = allCards[randomIndex];
      
      // Create a card instance and add it to the hand
      const cardInstance = createCardInstance(randomCard);
      state.players.player.hand.push(cardInstance);
    }
  }
  
  return state;
}

/**
 * Execute a destroy battlecry effect (destroying targeted minions)
 */
function executeDestroyBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  // If no target is required, it might be a "destroy all" effect
  if (!battlecry.requiresTarget) {
    if (battlecry.targetType === 'all_minions') {
      // Clear all minions from both sides of the battlefield (like World Ender)
      state.players.player.battlefield = [];
      state.players.opponent.battlefield = [];
    } else if (battlecry.targetType === 'all_enemy_minions') {
      // Clear enemy minions
      state.players.opponent.battlefield = [];
    }
    return state;
  }
  
  // Otherwise find and destroy the targeted minion
  // First check if this is a tribe-specific destroy (like "Destroy a Beast")
  const tribeTargets = ['beast', 'mech', 'automaton', 'murloc', 'naga', 'dragon', 'demon', 'titan', 'pirate', 'einherjar', 'totem', 'spirit', 'elemental', 'undead', 'draugr'];
  const isTribeTarget = tribeTargets.includes(battlecry.targetType || '');
  
  if (isTribeTarget || battlecry.targetType === 'enemy_minion' || battlecry.targetType === 'any_minion') {
    // Check opponent's battlefield first
    let targetInfo = findCardInstance(state.players.opponent.battlefield, targetId!);
    
    if (targetInfo) {
      const targetMinion = targetInfo.card;
      const targetIndex = targetInfo.index;
      
      // If tribe-specific, validate the target has the correct race
      if (isTribeTarget) {
        const minionCard = targetMinion.card as MinionCardData;
        const targetRace = (minionCard.race || '').toLowerCase();
        if (targetRace !== battlecry.targetType) {
          return state;
        }
      }
      
      // Remove the minion
      const removed = state.players.opponent.battlefield.splice(targetIndex, 1);
      if (removed.length > 0) {
        if (!state.players.opponent.graveyard) state.players.opponent.graveyard = [] as any;
        (state.players.opponent.graveyard as any[]).push(removed[0]);
      }
      return state;
    }
    
    // If targeting any minion or tribe, also check player's battlefield
    if (battlecry.targetType === 'any_minion' || isTribeTarget) {
      targetInfo = findCardInstance(state.players.player.battlefield, targetId!);
      
      if (targetInfo) {
        const targetMinion = targetInfo.card;
        const targetIndex = targetInfo.index;
        
        // If tribe-specific, validate the target has the correct race
        if (isTribeTarget) {
          const minionCard = targetMinion.card as MinionCardData;
          const targetRace = (minionCard.race || '').toLowerCase();
          if (targetRace !== battlecry.targetType) {
            return state;
          }
        }
        
        // Remove the minion
        const removedPlayer = state.players.player.battlefield.splice(targetIndex, 1);
        if (removedPlayer.length > 0) {
          if (!state.players.player.graveyard) state.players.player.graveyard = [] as any;
          (state.players.player.graveyard as any[]).push(removedPlayer[0]);
        }
      } else {
        debug.error('Target minion not found for destroy battlecry');
      }
    }
  }
  
  return state;
}

/**
 * Execute a copy battlecry effect (creating copies of minions)
 */
function executeCopyBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  if (state.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return state;
  }

  // If no target is needed, return the state unchanged
  if (!battlecry.requiresTarget) {
    return state;
  }
  
  // Find the target minion to copy
  let targetInfo;
  let isPlayerMinion = false;
  
  // Check opponent's battlefield
  targetInfo = findCardInstance(state.players.opponent.battlefield, targetId!);
  
  // If not found, check player's battlefield
  if (!targetInfo) {
    targetInfo = findCardInstance(state.players.player.battlefield, targetId!);
    isPlayerMinion = true;
    
    if (!targetInfo) {
      debug.error('Target minion not found for copy battlecry');
      return state;
    }
  }
  
  const targetMinion = targetInfo.card;
  
  // Create a copy of the minion with the same stats and effects
  const copiedMinionData = { ...targetMinion.card };
  const copiedMinion = createCardInstance(copiedMinionData);
  
  // Copy current health and other relevant status effects
  copiedMinion.currentHealth = targetMinion.currentHealth;
  copiedMinion.hasDivineShield = targetMinion.hasDivineShield;
  copiedMinion.isSummoningSick = true; // A newly copied minion still has summoning sickness
  copiedMinion.isPlayed = true;
  
  // Add the copy to the player's battlefield
  state.players.player.battlefield.push(copiedMinion);
  
  
  return state;
}

/**
 * Execute a return to hand battlecry effect (returning minions to hand)
 */
function executeReturnToHandBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  // If no target is needed, return the state unchanged
  if (!battlecry.requiresTarget) {
    return state;
  }
  
  if (battlecry.targetType === 'friendly_minion' || battlecry.targetType === 'any_minion') {
    // Find target on player's battlefield
    const targetInfo = findCardInstance(state.players.player.battlefield, targetId!);
    
    if (!targetInfo) {
      debug.error('Target minion not found for return to hand battlecry');
      return state;
    }
    
    const targetMinion = targetInfo.card;
    const targetIndex = targetInfo.index;
    
    if (state.players.player.hand.length >= MAX_HAND_SIZE) {
      state.players.player.battlefield.splice(targetIndex, 1);
      return state;
    }
    
    // Create a new card instance and add it to the hand
    const cardInstance = createCardInstance(targetMinion.card);
    state.players.player.hand.push(cardInstance);
    
    // Remove from battlefield
    state.players.player.battlefield.splice(targetIndex, 1);
    
  }
  
  return state;
}

/**
 * Execute an equip weapon battlecry effect
 */
function executeEquipWeaponBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  // Check if a card ID is provided for the weapon
  if (!battlecry.summonCardId) {
    debug.error('No weapon card ID provided for equip weapon battlecry');
    return state;
  }
  
  // Find the weapon in the database
  const found = getCardById(battlecry.summonCardId as number);
  const weaponCard = found?.type === 'weapon' ? found : undefined;
  
  if (!weaponCard) {
    debug.error(`Weapon card with ID ${battlecry.summonCardId} not found`);
    return state;
  }
  
  // If player already has a weapon, destroy it
  if (state.players.player.weapon) {
    // @ts-ignore - Null and undefined are being handled differently by TypeScript
    state.players.player.weapon = undefined;
  }
  
  // Create and equip the new weapon
  const weaponCardData = weaponCard as WeaponCardData;
  state.players.player.weapon = {
    instanceId: uuidv4(),
    card: weaponCardData,
    currentHealth: weaponCardData.durability || 1,
    canAttack: true,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };
  
  
  return state;
}

/**
 * Execute a freeze battlecry effect (freezing a character so it can't attack next turn)
 */
function executeFreezeBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  const frzTarget = (battlecry as any).targetType as string | undefined;

  // Auto-targeted freeze (no player selection needed)
  if (frzTarget === 'all_enemy_minions') {
    for (let i = 0; i < state.players.opponent.battlefield.length; i++) {
      state.players.opponent.battlefield[i].isFrozen = true;
    }
    return state;
  }
  if (frzTarget === 'random_enemy' || frzTarget === 'random_enemy_minion') {
    const oppBf = state.players.opponent.battlefield || [];
    if (oppBf.length > 0) {
      const idx = Math.floor(Math.random() * oppBf.length);
      state.players.opponent.battlefield[idx].isFrozen = true;
    }
    return state;
  }

  // If no target is needed, return the state unchanged
  if (!battlecry.requiresTarget) {
    return state;
  }
  
  // Process freezing based on target type
  if (targetType === 'hero') {
    // Freeze a hero (Typically only makes sense to freeze the enemy hero)
    if (targetId === 'opponent') {
      // Set isFrozen property on the hero state
      if (!state.players.opponent.hero) {
        state.players.opponent.hero = { isFrozen: true };
      } else {
        state.players.opponent.hero.isFrozen = true;
      }
    }
  } else if (targetType === 'minion') {
    // Find target on opponent's battlefield
    let targetInfo = findCardInstance(state.players.opponent.battlefield, targetId!);
    
    if (targetInfo) {
      // Freeze the enemy minion
      state.players.opponent.battlefield[targetInfo.index].isFrozen = true;
    } else {
      // Check player's battlefield (for any_minion targets)
      targetInfo = findCardInstance(state.players.player.battlefield, targetId!);
      
      if (targetInfo) {
        // Freeze the friendly minion
        state.players.player.battlefield[targetInfo.index].isFrozen = true;
      } else {
        debug.error('Target minion not found for freeze battlecry');
      }
    }
  }
  
  return state;
}

/**
 * Execute a mind control battlecry effect (taking control of an enemy minion)
 */
function executeMindControlBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  // If no target is needed, return the state unchanged
  if (!battlecry.requiresTarget) {
    return state;
  }
  
  // Ensure opponent battlefield array exists
  if (!state.players.opponent.battlefield) {
    state.players.opponent.battlefield = [];
    return state;
  }
  
  // Find target on opponent's battlefield
  const targetInfo = findCardInstance(state.players.opponent.battlefield, targetId!);
  
  if (!targetInfo) {
    debug.error('Target enemy minion not found for mind control battlecry');
    return state;
  }
  
  const targetMinion = targetInfo.card;
  const targetIndex = targetInfo.index;
  
  // Remove minion from opponent's battlefield (ALWAYS remove regardless of board state)
  state.players.opponent.battlefield.splice(targetIndex, 1);
  
  // Ensure player battlefield array exists
  if (!state.players.player.battlefield) {
    state.players.player.battlefield = [];
  }
  
  // Check if player board is full
  if (state.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    // Board is full, send the minion to graveyard instead
    if (!state.players.player.graveyard) {
      state.players.player.graveyard = [];
    }
    (state.players.player.graveyard as any[]).push(targetMinion);
    return state;
  }

  // Board is not full, add to player's battlefield
  targetMinion.isSummoningSick = true; // Mind controlled minions can't attack immediately
  state.players.player.battlefield.push(targetMinion);
  
  
  return state;
}

/**
 * Execute a battlecry that summons colossal parts for a colossal minion
 * This is used for minions like Neptulon the Tidehunter that summon additional parts when played
 */
function executeSummonColossalPartsBattlecry(
  state: GameState,
  cardInstanceId: string
): GameState {
  
  // Find the card on the battlefield
  const cardInfo = findCardInstance(state.players.player.battlefield, cardInstanceId);
  
  if (!cardInfo) {
    debug.error(`Colossal minion with ID ${cardInstanceId} not found on battlefield`);
    return state;
  }
  
  const cardInstance = cardInfo.card;
  
  // Verify the card has the colossal keyword
  if (!getCardKeywords(cardInstance.card).includes('colossal')) {
    debug.error(`Card ${cardInstance.card.name} does not have the colossal keyword`);
    return state;
  }
  
  
  // Use the colossalUtils function to summon the parts
  return summonColossalParts(state, cardInstanceId, 'player');
}

export function isValidBattlecryTarget(
  card: CardData,
  targetId: string,
  targetType: 'minion' | 'hero',
  state: GameState
): boolean {
  // Only minions can have battlecry
  if (card.type !== 'minion') return false;
  const minionCard = card as MinionCardData;
  
  // If the card doesn't have a battlecry or doesn't require a target, all targets are invalid
  if (!minionCard.battlecry || !minionCard.battlecry.requiresTarget) {
    return false;
  }
  
  type BattlecryTargetTypeString = string;
  const targetTypeMap: Record<BattlecryTargetTypeString, { validTypes: ('minion' | 'hero')[], validOwners: ('player' | 'opponent')[] }> = {
    'none': { validTypes: [], validOwners: [] },
    'friendly_minion': { validTypes: ['minion'], validOwners: ['player'] },
    'enemy_minion': { validTypes: ['minion'], validOwners: ['opponent'] },
    'any_minion': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'enemy_hero': { validTypes: ['hero'], validOwners: ['opponent'] },
    'friendly_hero': { validTypes: ['hero'], validOwners: ['player'] },
    'any_hero': { validTypes: ['hero'], validOwners: ['player', 'opponent'] },
    'any': { validTypes: ['minion', 'hero'], validOwners: ['player', 'opponent'] },
    'all_minions': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'all_friendly_minions': { validTypes: ['minion'], validOwners: ['player'] },
    'all_enemy_minions': { validTypes: ['minion'], validOwners: ['opponent'] },
    'adjacent_minions': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'damaged_minion': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'undamaged_minion': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'beast': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'dragon': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'mech': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'automaton': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'murloc': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'naga': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'demon': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'titan': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'pirate': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'einherjar': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'elemental': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'totem': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'spirit': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'undead': { validTypes: ['minion'], validOwners: ['player', 'opponent'] },
    'draugr': { validTypes: ['minion'], validOwners: ['player', 'opponent'] }
  };
  
  const battlecryTargetType = minionCard.battlecry.targetType || 'none';
  const validationConfig = targetTypeMap[battlecryTargetType] || targetTypeMap['any'];
  
  // Check if the target type (minion/hero) is valid
  if (!validationConfig.validTypes.includes(targetType)) {
    return false;
  }
  
  // For hero targets
  if (targetType === 'hero') {
    // Check if targeting the owner is allowed
    if (targetId === 'player' && !validationConfig.validOwners.includes('player')) {
      return false;
    }
    
    // Check if targeting the opponent is allowed
    if (targetId === 'opponent' && !validationConfig.validOwners.includes('opponent')) {
      return false;
    }
    
    return true;
  } 
  
  // For minion targets
  if (targetType === 'minion') {
    // Try to find the minion on player's battlefield
    const playerMinion = findCardInstance(state.players.player.battlefield, targetId);
    
    if (playerMinion && !validationConfig.validOwners.includes('player')) {
      return false;
    }
    
    // Try to find the minion on opponent's battlefield
    const opponentMinion = findCardInstance(state.players.opponent.battlefield, targetId);
    
    if (opponentMinion && !validationConfig.validOwners.includes('opponent')) {
      return false;
    }
    
    // If the minion wasn't found on either battlefield, it's an invalid target
    return (playerMinion !== undefined || opponentMinion !== undefined);
  }
  
  return false;
}

function executeBuffAdjacentBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string
): GameState {
  const battlefield = state.players.player.battlefield || [];
  const cardIndex = battlefield.findIndex(c => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return state;

  const buffAttack = battlecry.buffAttack || 0;
  const buffHealth = battlecry.buffHealth || 0;

  const adjacentIndices = [cardIndex - 1, cardIndex + 1];
  for (const idx of adjacentIndices) {
    if (idx >= 0 && idx < battlefield.length) {
      const minion = battlefield[idx];
      (minion.card as any).attack = ((minion.card as any).attack || 0) + buffAttack;
      (minion.card as any).health = ((minion.card as any).health || 0) + buffHealth;
      minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health ?? 0) + buffHealth;
    }
  }

  const armorGain = (battlecry as any).armor as number | undefined;
  if (armorGain && armorGain > 0) {
    state.players.player.heroArmor = Math.min(30, (state.players.player.heroArmor || 0) + armorGain);
  }

  return state;
}

function executeSummonMultipleBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];

  const summonCardIds = (battlecry as any).summonCardIds as number[] | undefined;
  if (Array.isArray(summonCardIds)) {
    for (const cardId of summonCardIds) {
      if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;
      const cardData = getCardById(cardId);
      if (cardData) {
        const instance = createCardInstance(cardData);
        instance.isPlayed = true;
        state.players.player.battlefield.push(instance);
      }
    }
  } else {
    const cardId = battlecry.summonCardId;
    const count = (battlecry as any).count || 1;
    if (cardId) {
      const cardData = getCardById(cardId);
      if (cardData) {
        for (let i = 0; i < count; i++) {
          if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;
          const instance = createCardInstance(cardData);
          instance.isPlayed = true;
          state.players.player.battlefield.push(instance);
        }
      }
    }
  }
  return state;
}

function executeBuffHandBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const buffAttack = battlecry.buffAttack || 0;
  const buffHealth = battlecry.buffHealth || 0;
  const manaCostReduction = (battlecry as any).manaCostReduction || 0;

  for (const card of state.players.player.hand) {
    if (card.card.type === 'minion') {
      (card.card as any).attack = ((card.card as any).attack || 0) + buffAttack;
      (card.card as any).health = ((card.card as any).health || 0) + buffHealth;
    }
    if (manaCostReduction > 0) {
      card.card.manaCost = Math.max(0, (card.card.manaCost || 0) - manaCostReduction);
    }
  }
  return state;
}

function executeConditionalDamageBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  const condition = (battlecry as any).condition as string | undefined;
  let conditionMet = false;

  if (condition === 'holding_dragon') {
    conditionMet = state.players.player.hand.some(c => isCardOfTribe(c.card, 'dragon'));
  } else if (condition === 'minion_count') {
    const conditionValue = (battlecry as any).conditionValue || 0;
    conditionMet = (state.players.player.battlefield || []).length >= conditionValue;
  } else if (condition === 'combo') {
    conditionMet = true;
  } else {
    conditionMet = true;
  }

  if (!conditionMet) return state;

  return executeDamageBattlecry(state, battlecry, targetId, targetType);
}

function executeAddRandomToHandBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const count = battlecry.value || 1;
  const cardType = (battlecry as any).cardType as string | undefined;

  let candidates = [...allCards];
  if (cardType) {
    candidates = candidates.filter(c => c.type === cardType);
  }
  if (candidates.length === 0) return state;

  for (let i = 0; i < count; i++) {
    if (state.players.player.hand.length >= MAX_HAND_SIZE) break;
    const randomIdx = Math.floor(Math.random() * candidates.length);
    const cardInstance = createCardInstance(candidates[randomIdx]);
    state.players.player.hand.push(cardInstance);
  }
  return state;
}

function executeBuffAttackBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  if (!targetId) return state;

  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, targetId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, targetId);
  if (!targetInfo) return state;

  const buffAmount = battlecry.value || battlecry.buffAttack || 1;
  (targetInfo.card.card as any).attack = ((targetInfo.card.card as any).attack || 0) + buffAmount;
  return state;
}

function executeRecruitBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  const count = battlecry.value || 1;
  const deck = state.players.player.deck as any[];
  const maxCost = (battlecry as any).maxCost;
  const recruitRace = (battlecry as any).recruitRace;

  for (let i = 0; i < count; i++) {
    if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;
    const minionIndices: number[] = [];
    deck.forEach((c, idx) => {
      const card = c.card ? c.card : c;
      if (card.type !== 'minion') return;
      if (maxCost !== undefined && (card.manaCost || 0) > maxCost) return;
      if (recruitRace && (card.race || '').toLowerCase() !== recruitRace.toLowerCase()) return;
      minionIndices.push(idx);
    });
    if (minionIndices.length === 0) break;

    const randomIdx = minionIndices[Math.floor(Math.random() * minionIndices.length)];
    const recruited = deck.splice(randomIdx, 1)[0];
    const cardData = recruited.card || recruited;
    const lookupCard = getCardById(cardData.id as number);
    const instance = createCardInstance(lookupCard || cardData);
    instance.isPlayed = true;
    instance.isSummoningSick = true;
    instance.canAttack = false;
    instance.attacksPerformed = 0;
    state.players.player.battlefield.push(instance);
  }
  return state;
}

function executeSummonForOpponentBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.opponent.battlefield) state.players.opponent.battlefield = [];
  const cardId = battlecry.summonCardId;
  const count = (battlecry as any).count || 1;
  if (!cardId) return state;

  const cardData = getCardById(cardId);
  if (!cardData) return state;

  for (let i = 0; i < count; i++) {
    if (state.players.opponent.battlefield.length >= MAX_BOARD_SIZE) break;
    const instance = createCardInstance(cardData);
    instance.isPlayed = true;
    state.players.opponent.battlefield.push(instance);
  }
  return state;
}

function executeSwapStatsBattlecry(
  state: GameState,
  targetId?: string
): GameState {
  if (!targetId) return state;

  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, targetId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, targetId);
  if (!targetInfo) return state;

  const minion = targetInfo.card;
  const minionCard = minion.card as any;
  const currentAttack = minionCard.attack || 0;
  const currentHealth = minion.currentHealth ?? minionCard.health ?? 0;

  minionCard.attack = currentHealth;
  minionCard.health = currentAttack;
  minion.currentHealth = currentAttack;
  return state;
}

function executeGiveManaBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const amount = battlecry.value || 1;
  const player = state.players.player as any;
  player.maxMana = Math.min(10, (player.maxMana || 0) + amount);
  player.currentMana = Math.min(player.maxMana, (player.currentMana || 0) + amount);
  return state;
}

function executeHealAoeBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const healAmount = battlecry.value || 2;
  const battlefield = state.players.player.battlefield || [];

  for (const minion of battlefield) {
    const maxHealth = (minion.card as any).health || 0;
    const current = minion.currentHealth ?? maxHealth;
    minion.currentHealth = Math.min(maxHealth, current + healAmount);
  }
  return state;
}

function executeBuffTempBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  if (!targetId) return state;

  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, targetId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, targetId);
  if (!targetInfo) return state;

  const buffAmount = battlecry.buffAttack || battlecry.value || 1;
  const minion = targetInfo.card;
  (minion.card as any).attack = ((minion.card as any).attack || 0) + buffAmount;
  (minion as any).tempAttackBuff = buffAmount;
  return state;
}

function executeGainTemporaryManaBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const amount = battlecry.value || 1;
  (state.players.player as any).currentMana = ((state.players.player as any).currentMana || 0) + amount;
  return state;
}

function executeBuffWeaponBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const weapon = (state.players.player as any).weapon;
  if (!weapon) return state;

  weapon.attack = (weapon.attack || 0) + (battlecry.buffAttack || battlecry.value || 1);
  if (battlecry.buffHealth) {
    weapon.durability = (weapon.durability || 0) + battlecry.buffHealth;
  }
  return state;
}

function executeReduceNextSpellCostBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  (state.players.player as any).nextSpellCostReduction = battlecry.value || 1;
  return state;
}

function checkBattlecryCondition(state: GameState, condition: string): boolean {
  const player = state.players.player;
  const battlefield = player.battlefield || [];
  switch (condition) {
    case 'no_duplicates': {
      const deck = player.deck || [];
      const cardIds = deck.map(c => (c as any).card?.id || (c as any).id);
      const uniqueIds = new Set(cardIds);
      return uniqueIds.size === cardIds.length;
    }
    case 'holding_dragon': {
      const hand = player.hand || [];
      return hand.some(c => isCardOfTribe(c.card, 'dragon'));
    }
    case 'combo':
      return (state as any).comboActive === true;
    case 'minion_count':
      return battlefield.length > 0;
    case 'minion_count_3':
      return battlefield.length >= 3;
    case 'minion_count_7':
      return battlefield.length >= 7;
    case 'control_2_minions':
      return battlefield.length >= 2;
    case 'control_automaton':
      return battlefield.some(c => (c.card as any).race?.toLowerCase() === 'automaton');
    case 'control_another_beast':
      return battlefield.some(c => isCardOfTribe(c.card, 'beast'));
    case 'control_all_basic_totems': {
      const totemNames = ['healing totem', 'searing totem', 'stoneclaw totem', 'wrath of air totem'];
      const fieldNames = battlefield.map(c => c.card.name.toLowerCase());
      return totemNames.every(t => fieldNames.includes(t));
    }
    case 'cthun_attack_10': {
      const cthunBuff = (state as any).cthunBuffs || { attack: 6, health: 6 };
      return (cthunBuff.attack || 6) >= 10;
    }
    case 'elemental_last_turn':
    case 'played_elemental_last_turn':
      return (state as any).playedElementalLastTurn === true;
    case 'weapon_equipped':
      return !!(player as any).weapon;
    case 'have_10_mana':
      return (player.mana?.max ?? 0) >= 10;
    case 'enemy_minion_count_2_or_more':
      return (state.players.opponent.battlefield || []).length >= 2;
    case 'opponent_controls_dragon':
      return (state.players.opponent.battlefield || []).some(c => isCardOfTribe(c.card, 'dragon'));
    case 'opponent_has_4_minions':
      return (state.players.opponent.battlefield || []).length >= 4;
    case 'blood_price_paid':
      return (state.gameLog || []).some(entry => entry.player === state.currentTurn && entry.text?.includes('Blood Price'));
    case 'no_2_cost_in_deck': {
      const deck2 = player.deck || [];
      return !deck2.some(c => (c.manaCost ?? 0) === 2);
    }
    case 'no_1_cost_cards_in_deck': {
      const deck1 = player.deck || [];
      return !deck1.some(c => (c.manaCost ?? 0) === 1);
    }
    case 'hand_size_10_plus':
      return (player.hand || []).length >= 10;
    default:
      return true;
  }
}

function executeConditionalSelfBuffBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string
): GameState {
  const condition = (battlecry as any).condition;
  if (!checkBattlecryCondition(state, condition)) {
    return state;
  }
  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, cardInstanceId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, cardInstanceId);
  if (!targetInfo) return state;

  const minion = targetInfo.card;
  const buffAtk = battlecry.buffAttack || 0;
  const buffHp = battlecry.buffHealth || 0;
  (minion.card as any).attack = ((minion.card as any).attack || 0) + buffAtk;
  (minion.card as any).health = ((minion.card as any).health || 0) + buffHp;
  minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + buffHp;
  return state;
}

function executeConditionalArmorBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string
): GameState {
  const condition = (battlecry as any).condition;
  if (!checkBattlecryCondition(state, condition)) {
    return state;
  }
  let ownerKey: 'player' | 'opponent' = 'player';
  const onPlayerField = (state.players.player.battlefield || []).some(c => c.instanceId === cardInstanceId);
  if (!onPlayerField) {
    const onOpponentField = (state.players.opponent.battlefield || []).some(c => c.instanceId === cardInstanceId);
    if (onOpponentField) ownerKey = 'opponent';
  }
  const armorGain = (battlecry as any).armorGain || battlecry.value || 5;
  state.players[ownerKey].heroArmor = Math.min(30, (state.players[ownerKey].heroArmor || 0) + armorGain);
  return state;
}

function executeConditionalSummonBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const condition = (battlecry as any).condition;
  if (!checkBattlecryCondition(state, condition)) {
    return state;
  }
  return executeSummonBattlecry(state, battlecry);
}

function executeSummonByConditionBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const countCondition = (battlecry as any).summonCountCondition as string | undefined;
  let summonCount = 1;
  if (countCondition === 'friendly_minion_count') {
    summonCount = (state.players.player.battlefield || []).length;
  }
  const cardId = battlecry.summonCardId || (battlecry as any).tokenId;
  if (!cardId || summonCount <= 0) return state;
  const cardToSummon = getCardById(cardId);
  if (!cardToSummon) return state;
  for (let i = 0; i < summonCount; i++) {
    if (state.players.player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
    const summonedCard = createCardInstance(cardToSummon);
    summonedCard.isPlayed = true;
    state.players.player.battlefield.push(summonedCard);
    trackQuestProgress('player', 'summon_minion', summonedCard.card);
  }
  return state;
}

function executeConditionalGrantKeywordBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string
): GameState {
  const condition = (battlecry as any).condition;
  if (!checkBattlecryCondition(state, condition)) {
    return state;
  }
  const keyword = (battlecry as any).keyword as string | undefined;
  if (!keyword) return state;
  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, cardInstanceId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, cardInstanceId);
  if (!targetInfo) return state;

  const minion = targetInfo.card;
  addKeyword(minion, keyword);
  if (keyword === 'taunt') (minion as any).hasTaunt = true;
  if (keyword === 'divine_shield') minion.hasDivineShield = true;
  return state;
}

function executeConditionalDiscoverBattlecry(
  state: GameState,
  cardInstanceId: string,
  battlecry: BattlecryEffect
): GameState {
  const condition = (battlecry as any).condition;
  if (!checkBattlecryCondition(state, condition)) {
    return state;
  }
  return executeDiscoverBattlecry(state, cardInstanceId, battlecry);
}

function executeConditionalBuffBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string,
  targetId?: string
): GameState {
  const condition = (battlecry as any).condition;
  if (!checkBattlecryCondition(state, condition)) {
    return state;
  }

  const searchId = battlecry.requiresTarget && targetId ? targetId : cardInstanceId;
  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, searchId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, searchId);
  if (!targetInfo) return state;

  const minion = targetInfo.card;
  const buffAtk = battlecry.buffAttack || 0;
  const buffHp = battlecry.buffHealth || 0;
  (minion.card as any).attack = ((minion.card as any).attack || 0) + buffAtk;
  (minion.card as any).health = ((minion.card as any).health || 0) + buffHp;
  minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + buffHp;
  return state;
}

function executeConditionalBuffAndTauntBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string,
  targetId?: string
): GameState {
  const condition = (battlecry as any).condition;
  if (!checkBattlecryCondition(state, condition)) {
    return state;
  }

  const searchId = battlecry.requiresTarget && targetId ? targetId : cardInstanceId;
  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, searchId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, searchId);
  if (!targetInfo) return state;

  const minion = targetInfo.card;
  const buffAtk = battlecry.buffAttack || 0;
  const buffHp = battlecry.buffHealth || 0;
  (minion.card as any).attack = ((minion.card as any).attack || 0) + buffAtk;
  (minion.card as any).health = ((minion.card as any).health || 0) + buffHp;
  minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + buffHp;

  addKeyword(minion, 'taunt');
  (minion as any).hasTaunt = true;
  return state;
}

function executeGiveDivineShieldBattlecry(
  state: GameState,
  targetId?: string
): GameState {
  if (!targetId) return state;

  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, targetId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, targetId);
  if (!targetInfo) return state;

  targetInfo.card.hasDivineShield = true;
  return state;
}

function executeGrantDeathrattleBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  if (!targetId) return state;

  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, targetId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, targetId);
  if (!targetInfo) return state;

  const minion = targetInfo.card;
  (minion.card as any).deathrattle = (battlecry as any).deathrattle;

  addKeyword(minion, 'deathrattle');
  return state;
}

function executeMindControlTemporaryBattlecry(
  state: GameState,
  targetId?: string
): GameState {
  if (!targetId) return state;

  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  const opponentBattlefield = state.players.opponent.battlefield || [];
  const targetInfo = findCardInstance(opponentBattlefield, targetId);
  if (!targetInfo) return state;

  const minion = targetInfo.card;
  state.players.opponent.battlefield.splice(targetInfo.index, 1);
  (minion as any).temporaryControl = true;
  minion.isSummoningSick = false;
  state.players.player.battlefield.push(minion);
  return state;
}

function executeCopyFromOpponentBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const count = battlecry.value || 1;
  const opponentHand = state.players.opponent.hand || [];
  if (opponentHand.length === 0) return state;

  const maxHandSize = 9;
  for (let i = 0; i < count; i++) {
    if (state.players.player.hand.length >= maxHandSize) break;
    if (opponentHand.length === 0) break;

    const randomIndex = Math.floor(Math.random() * opponentHand.length);
    const card = opponentHand[randomIndex];
    const copy = createCardInstance(card.card);
    state.players.player.hand.push(copy);
  }
  return state;
}

function executeAdaptBattlecry(
  state: GameState,
  cardInstanceId: string
): GameState {
  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, cardInstanceId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, cardInstanceId);
  if (!targetInfo) return state;

  const minion = targetInfo.card;
  const adaptations = [
    { type: 'stats', attack: 1, health: 1 },
    { type: 'stats', attack: 3, health: 0 },
    { type: 'stats', attack: 0, health: 3 },
    { type: 'keyword', keyword: 'divine_shield' },
    { type: 'keyword', keyword: 'taunt' },
    { type: 'keyword', keyword: 'windfury' },
    { type: 'keyword', keyword: 'stealth' },
    { type: 'keyword', keyword: 'poisonous' },
    { type: 'keyword', keyword: 'elusive' },
    { type: 'keyword', keyword: 'deathrattle_tokens' },
  ];

  const chosen = adaptations[Math.floor(Math.random() * adaptations.length)];

  if (chosen.type === 'stats') {
    (minion.card as any).attack = ((minion.card as any).attack || 0) + (chosen.attack || 0);
    (minion.card as any).health = ((minion.card as any).health || 0) + (chosen.health || 0);
    minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + (chosen.health || 0);
  } else if (chosen.type === 'keyword') {
    switch (chosen.keyword) {
      case 'divine_shield':
        minion.hasDivineShield = true;
        addKeyword(minion, 'divine_shield');
        break;
      case 'taunt':
        (minion as any).hasTaunt = true;
        addKeyword(minion, 'taunt');
        break;
      case 'windfury':
        (minion as any).hasWindfury = true;
        addKeyword(minion, 'windfury');
        break;
      case 'stealth':
        (minion as any).hasStealth = true;
        addKeyword(minion, 'stealth');
        break;
      case 'poisonous':
        (minion as any).hasPoisonous = true;
        addKeyword(minion, 'poisonous');
        break;
      case 'elusive':
        (minion as any).cantBeTargeted = true;
        addKeyword(minion, 'elusive');
        break;
      case 'deathrattle_tokens':
        addKeyword(minion, 'deathrattle');
        (minion.card as any).deathrattle = { type: 'summon', summonCardId: 'token_1_1', count: 2 };
        break;
    }
  }
  return state;
}

function executeSummonUntilFullBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const summonCardId = (battlecry as any).summonCardId;
  if (!summonCardId) return state;

  const cardTemplate = getCardById(summonCardId);
  if (!cardTemplate) return state;

  while (state.players.player.battlefield.length < MAX_BOARD_SIZE) {
    const instance = createCardInstance(cardTemplate);
    instance.currentHealth = (cardTemplate as any).health || 1;
    state.players.player.battlefield.push(instance);
  }
  return state;
}

function executeTransformFriendlyBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string
): GameState {
  if (!targetId || !battlecry.value) {
    return state;
  }
  return transformMinion(state, targetId, battlecry.value);
}

function executeTriggerDeathrattleBattlecry(
  state: GameState,
  targetId?: string
): GameState {
  if (!targetId) return state;
  return state;
}

function executeBuffAndDamageBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string,
  targetId?: string
): GameState {
  if (!targetId) return state;

  const damage = (battlecry as any).damageValue ?? battlecry.value ?? 1;
  const buffAtk = battlecry.buffAttack || 0;
  const buffHp = battlecry.buffHealth || 0;

  // Find target in either battlefield (card description says "Give a minion" — any minion)
  let targetInfo = findCardInstance(state.players.opponent.battlefield || [], targetId);
  let ownerKey: 'opponent' | 'player' = 'opponent';
  if (!targetInfo) {
    targetInfo = findCardInstance(state.players.player.battlefield || [], targetId);
    ownerKey = 'player';
  }
  if (!targetInfo) return state;

  const m = targetInfo.card;
  if (m.currentHealth === undefined) m.currentHealth = (m.card as any).health || 1;

  // Apply attack buff to the target
  if (buffAtk > 0) {
    (m.card as any).attack = ((m.card as any).attack || 0) + buffAtk;
    m.currentAttack = (m.currentAttack ?? (m.card as any).attack) + buffAtk;
  }
  if (buffHp > 0) {
    (m.card as any).health = ((m.card as any).health || 0) + buffHp;
    m.currentHealth += buffHp;
  }

  // Deal damage to the target (after buff so max health is updated first)
  if (m.hasDivineShield) {
    m.hasDivineShield = false;
  } else {
    m.currentHealth = (m.currentHealth ?? 0) - damage;
    if ((m.currentHealth ?? 0) <= 0) {
      state.players[ownerKey].battlefield.splice(targetInfo.index, 1);
    }
  }

  return state;
}

function executeBuffAndTauntBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId: string
): GameState {
  const playerBattlefield = state.players.player.battlefield || [];
  const opponentBattlefield = state.players.opponent.battlefield || [];
  let targetInfo = findCardInstance(playerBattlefield, targetId);
  if (!targetInfo) targetInfo = findCardInstance(opponentBattlefield, targetId);
  if (!targetInfo) return state;

  const minion = targetInfo.card;
  (minion.card as any).attack = ((minion.card as any).attack || 0) + (battlecry.buffAttack || 0);
  (minion.card as any).health = ((minion.card as any).health || 0) + (battlecry.buffHealth || 0);
  minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + (battlecry.buffHealth || 0);

  addKeyword(minion, 'taunt');
  (minion as any).hasTaunt = true;
  return state;
}

function executeBuffAoeBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string
): GameState {
  const battlefield = state.players.player.battlefield || [];
  const buffAtk = battlecry.buffAttack || 0;
  const buffHp = battlecry.buffHealth || 0;

  for (const minion of battlefield) {
    if (minion.instanceId === cardInstanceId) continue;
    (minion.card as any).attack = ((minion.card as any).attack || 0) + buffAtk;
    (minion.card as any).health = ((minion.card as any).health || 0) + buffHp;
    minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + buffHp;
  }
  return state;
}

function executeBuffBeastsInHandBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const buffAtk = battlecry.buffAttack || 0;
  const buffHp = battlecry.buffHealth || 0;
  const hand = state.players.player.hand || [];

  for (const card of hand) {
    if (isCardOfTribe(card.card, 'beast')) {
      (card.card as any).attack = ((card.card as any).attack || 0) + buffAtk;
      (card.card as any).health = ((card.card as any).health || 0) + buffHp;
    }
  }
  return state;
}

function executeBuffByHandSizeBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string
): GameState {
  const handSize = (state.players.player.hand || []).length;
  const battlefield = state.players.player.battlefield || [];
  const idx = battlefield.findIndex(c => c.instanceId === cardInstanceId);
  if (idx === -1) return state;

  const minion = battlefield[idx];
  (minion.card as any).attack = ((minion.card as any).attack || 0) + handSize;
  (minion.card as any).health = ((minion.card as any).health || 0) + handSize;
  minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + handSize;
  return state;
}

function executeBuffHealthByHandSizeBattlecry(
  state: GameState,
  cardInstanceId: string
): GameState {
  const handSize = (state.players.player.hand || []).length;
  const battlefield = state.players.player.battlefield || [];
  const idx = battlefield.findIndex(c => c.instanceId === cardInstanceId);
  if (idx === -1) return state;

  const minion = battlefield[idx];
  (minion.card as any).health = ((minion.card as any).health || 0) + handSize;
  minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + handSize;
  return state;
}

function executeBuffPerCardInHandBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string
): GameState {
  const handSize = (state.players.player.hand || []).length;
  const battlefield = state.players.player.battlefield || [];
  const idx = battlefield.findIndex(c => c.instanceId === cardInstanceId);
  if (idx === -1) return state;

  const minion = battlefield[idx];
  const totalAtk = handSize * (battlecry.buffAttack || 0);
  const totalHp = handSize * (battlecry.buffHealth || 0);
  (minion.card as any).attack = ((minion.card as any).attack || 0) + totalAtk;
  (minion.card as any).health = ((minion.card as any).health || 0) + totalHp;
  minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + totalHp;
  return state;
}

function executeBuffPerDeadFriendlyMinionBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId: string
): GameState {
  const graveyard = (state.players.player.graveyard || []) as any[];
  const deadCount = graveyard.filter(c => (c.card ? c.card.type : c.type) === 'minion').length;
  if (deadCount === 0) return state;

  const battlefield = state.players.player.battlefield || [];
  const idx = battlefield.findIndex(c => c.instanceId === cardInstanceId);
  if (idx === -1) return state;

  const minion = battlefield[idx];
  const buffPerMinion = battlecry.buffAttack || 1;
  const totalBuff = deadCount * buffPerMinion;
  (minion.card as any).attack = ((minion.card as any).attack || 0) + totalBuff;
  (minion.card as any).health = ((minion.card as any).health || 0) + totalBuff;
  minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + totalBuff;
  return state;
}

function executeBuffHeroBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const amount = battlecry.value || 0;
  state.players.player.heroArmor = Math.min(30, (state.players.player.heroArmor || 0) + amount);
  return state;
}

function executeBrawlBattlecry(
  state: GameState
): GameState {
  const playerBf = state.players.player.battlefield || [];
  const opponentBf = state.players.opponent.battlefield || [];
  const allMinions: { minion: any; side: 'player' | 'opponent' }[] = [];

  for (const m of playerBf) allMinions.push({ minion: m, side: 'player' });
  for (const m of opponentBf) allMinions.push({ minion: m, side: 'opponent' });

  if (allMinions.length <= 1) return state;

  const survivorIdx = Math.floor(Math.random() * allMinions.length);
  const survivor = allMinions[survivorIdx];

  state.players.player.battlefield = [];
  state.players.opponent.battlefield = [];

  if (survivor.side === 'player') {
    state.players.player.battlefield.push(survivor.minion);
  } else {
    state.players.opponent.battlefield.push(survivor.minion);
  }
  return state;
}

function executeChooseKeywordsBattlecry(
  state: GameState,
  cardInstanceId: string
): GameState {
  const battlefield = state.players.player.battlefield || [];
  const idx = battlefield.findIndex(c => c.instanceId === cardInstanceId);
  if (idx === -1) return state;

  const minion = battlefield[idx];
  const options = ['taunt', 'divine_shield', 'windfury', 'stealth'];
  const chosen = options[Math.floor(Math.random() * options.length)];

  addKeyword(minion, chosen);

  switch (chosen) {
    case 'taunt': (minion as any).hasTaunt = true; break;
    case 'divine_shield': minion.hasDivineShield = true; break;
    case 'windfury': (minion as any).hasWindfury = true; break;
    case 'stealth': (minion as any).hasStealth = true; break;
  }
  return state;
}

function executeWeaponAttackBuffBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const weapon = (state.players.player as any).weapon;
  if (!weapon) return state;
  const buffAmount = battlecry.value || 1;
  weapon.attack = (weapon.attack || ((weapon.card as any)?.attack || 0)) + buffAmount;
  if (weapon.card) (weapon.card as any).attack = ((weapon.card as any).attack || 0) + buffAmount;
  return state;
}

function executeWeaponDurabilityDamageBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
): GameState {
  const weapon = (state.players.player as any).weapon;
  if (!weapon) return state;
  if (!targetId) return state;

  const durability = weapon.currentHealth || (weapon.card as any)?.durability || 1;

  if (targetType === 'hero') {
    if (targetId === 'opponent') {
      state = dealDamage(state, 'opponent', 'hero', durability);
    } else {
      state = dealDamage(state, 'player', 'hero', durability);
    }
  } else if (targetType === 'minion') {
    let targetInfo = findCardInstance(state.players.opponent.battlefield || [], targetId);
    if (targetInfo) {
      const m = targetInfo.card;
      if (m.currentHealth === undefined) m.currentHealth = (m.card as any).health || 1;
      m.currentHealth! -= durability;
      if (m.currentHealth! <= 0) {
        state.players.opponent.battlefield.splice(targetInfo.index, 1);
      }
    } else {
      targetInfo = findCardInstance(state.players.player.battlefield || [], targetId);
      if (targetInfo) {
        const m = targetInfo.card;
        if (m.currentHealth === undefined) m.currentHealth = (m.card as any).health || 1;
        m.currentHealth! -= durability;
        if (m.currentHealth! <= 0) {
          state.players.player.battlefield.splice(targetInfo.index, 1);
        }
      }
    }
  }
  return state;
}

function executeStealFromDeckBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const count = battlecry.value || 1;
  const opponentDeck = state.players.opponent.deck as any[];
  if (!opponentDeck || opponentDeck.length === 0) return state;

  for (let i = 0; i < count; i++) {
    if (state.players.player.hand.length >= MAX_HAND_SIZE) break;
    if (opponentDeck.length === 0) break;
    const randomIdx = Math.floor(Math.random() * opponentDeck.length);
    const stolen = opponentDeck.splice(randomIdx, 1)[0];
    const cardData = stolen.card || stolen;
    const instance = createCardInstance(cardData);
    state.players.player.hand.push(instance);
  }
  return state;
}

function executeSwapHandsBattlecry(
  state: GameState
): GameState {
  const temp = state.players.player.hand;
  state.players.player.hand = state.players.opponent.hand;
  state.players.opponent.hand = temp;
  return state;
}

function executeAdaptNagasBattlecry(
  state: GameState
): GameState {
  const battlefield = state.players.player.battlefield || [];
  const nagas = battlefield.filter(m => isCardOfTribe(m.card, 'naga'));
  if (nagas.length === 0) return state;

  const adaptations = [
    { type: 'stats', attack: 1, health: 1 },
    { type: 'stats', attack: 3, health: 0 },
    { type: 'stats', attack: 0, health: 3 },
    { type: 'keyword', keyword: 'divine_shield' },
    { type: 'keyword', keyword: 'taunt' },
    { type: 'keyword', keyword: 'windfury' },
    { type: 'keyword', keyword: 'stealth' },
    { type: 'keyword', keyword: 'poisonous' },
  ];

  const chosen = adaptations[Math.floor(Math.random() * adaptations.length)];

  for (const minion of nagas) {
    if (chosen.type === 'stats') {
      (minion.card as any).attack = ((minion.card as any).attack || 0) + (chosen.attack || 0);
      (minion.card as any).health = ((minion.card as any).health || 0) + (chosen.health || 0);
      minion.currentHealth = (minion.currentHealth ?? (minion.card as any).health) + (chosen.health || 0);
    } else if (chosen.type === 'keyword' && chosen.keyword) {
      addKeyword(minion, chosen.keyword);
      switch (chosen.keyword) {
        case 'divine_shield': minion.hasDivineShield = true; break;
        case 'taunt': (minion as any).hasTaunt = true; break;
        case 'windfury': (minion as any).hasWindfury = true; break;
        case 'stealth': (minion as any).hasStealth = true; break;
        case 'poisonous': (minion as any).hasPoisonous = true; break;
      }
    }
  }
  return state;
}

function executeSummonHorsemanBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  if (battlecry.summonCardId) {
    const cardData = getCardById(battlecry.summonCardId as number);
    if (cardData) {
      const instance = createCardInstance(cardData);
      instance.isPlayed = true;
      state.players.player.battlefield.push(instance);
      return state;
    }
  }

  const tokenCard: CardData = {
    id: 99800,
    name: 'Herald of Ragnarök',
    description: 'A 2/2 Herald of Ragnarök.',
    manaCost: 2,
    type: 'minion',
    rarity: 'token' as any,
    heroClass: 'neutral',
    attack: 2,
    health: 2,
    keywords: []
  } as any;
  const instance = createCardInstance(tokenCard);
  instance.isPlayed = true;
  state.players.player.battlefield.push(instance);
  return state;
}

function executeSummonRandomMythicBattlecry(
  state: GameState
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  const legendaries = allCards.filter(c => c.type === 'minion' && c.rarity === 'mythic');
  if (legendaries.length === 0) return state;

  const selected = legendaries[Math.floor(Math.random() * legendaries.length)];
  const instance = createCardInstance(selected);
  instance.isPlayed = true;
  state.players.player.battlefield.push(instance);
  return state;
}

function executeSummonSplittingBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  if (battlecry.summonCardId) {
    const cardData = getCardById(battlecry.summonCardId as number);
    if (cardData) {
      const instance = createCardInstance(cardData);
      instance.isPlayed = true;
      state.players.player.battlefield.push(instance);
    }
  }
  return state;
}

function executeSummonIfOtherDiedBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  const graveyard = (state.players.player.graveyard || []) as any[];
  const hasDead = graveyard.some(c => (c.card ? c.card.type : c.type) === 'minion');
  if (!hasDead) return state;

  if (battlecry.summonCardId) {
    const cardData = getCardById(battlecry.summonCardId as number);
    if (cardData) {
      const instance = createCardInstance(cardData);
      instance.isPlayed = true;
      state.players.player.battlefield.push(instance);
    }
  }
  return state;
}

function executeSummonAndDrawBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];

  if (battlecry.summonCardId && state.players.player.battlefield.length < MAX_BOARD_SIZE) {
    const cardData = getCardById(battlecry.summonCardId as number);
    if (cardData) {
      const instance = createCardInstance(cardData);
      instance.isPlayed = true;
      state.players.player.battlefield.push(instance);
    }
  }

  const drawCount = (battlecry as any).drawCount || 1;
  for (let i = 0; i < drawCount; i++) {
    if (state.players.player.deck.length === 0) break;
    if (state.players.player.hand.length >= MAX_HAND_SIZE) break;
    const drawn = state.players.player.deck.shift()!;
    const instance = createCardInstance(drawn);
    state.players.player.hand.push(instance);
  }
  return state;
}

function executeSummonCopyFromHandBattlecry(
  state: GameState
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  const hand = state.players.player.hand || [];
  const minionsInHand = hand.filter(c => c.card.type === 'minion');
  if (minionsInHand.length === 0) return state;

  const randomCard = minionsInHand[Math.floor(Math.random() * minionsInHand.length)];
  const copy = createCardInstance(randomCard.card);
  copy.isPlayed = true;
  state.players.player.battlefield.push(copy);
  return state;
}

function executeSummonFromBothHandsBattlecry(
  state: GameState
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  const opponentHand = state.players.opponent.hand || [];
  const minionsInHand = opponentHand.filter(c => c.card.type === 'minion');
  if (minionsInHand.length === 0) return state;

  const randomIdx = Math.floor(Math.random() * minionsInHand.length);
  const selected = minionsInHand[randomIdx];
  const handIdx = opponentHand.indexOf(selected);
  if (handIdx !== -1) opponentHand.splice(handIdx, 1);

  const instance = createCardInstance(selected.card);
  instance.isPlayed = true;
  state.players.player.battlefield.push(instance);
  return state;
}

function executeSummonFromOpponentHandBattlecry(
  state: GameState
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  const opponentHand = state.players.opponent.hand || [];
  const minionsInHand = opponentHand.filter(c => c.card.type === 'minion');
  if (minionsInHand.length === 0) return state;

  const randomIdx = Math.floor(Math.random() * minionsInHand.length);
  const selected = minionsInHand[randomIdx];
  const handIdx = opponentHand.indexOf(selected);
  if (handIdx !== -1) opponentHand.splice(handIdx, 1);

  const instance = createCardInstance(selected.card);
  instance.isPlayed = true;
  state.players.player.battlefield.push(instance);
  return state;
}

function executeSummonAllTotemsBattlecry(
  state: GameState
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];

  const totems: { name: string; attack: number; health: number; keywords: string[] }[] = [
    { name: 'Healing Totem', attack: 0, health: 2, keywords: [] },
    { name: 'Stoneclaw Totem', attack: 0, health: 2, keywords: ['taunt'] },
    { name: 'Searing Totem', attack: 1, health: 1, keywords: [] },
    { name: 'Wrath of Air Totem', attack: 0, health: 2, keywords: ['spell_damage'] },
  ];

  for (let i = 0; i < totems.length; i++) {
    if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) break;
    const totemDef = totems[i];
    const tokenCard: CardData = {
      id: 99810 + i,
      name: totemDef.name,
      description: `A basic ${totemDef.name}.`,
      manaCost: 1,
      type: 'minion',
      rarity: 'token' as any,
      heroClass: 'shaman',
      attack: totemDef.attack,
      health: totemDef.health,
      race: 'Spirit',
      keywords: totemDef.keywords
    } as any;
    const instance = createCardInstance(tokenCard);
    instance.isPlayed = true;
    if (totemDef.keywords.includes('taunt')) {
      (instance as any).hasTaunt = true;
    }
    state.players.player.battlefield.push(instance);
  }
  return state;
}

function executeSummonDefenderBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  if (!state.players.player.battlefield) state.players.player.battlefield = [];
  if (state.players.player.battlefield.length >= MAX_BOARD_SIZE) return state;

  const atk = (battlecry as any).summonAttack || battlecry.buffAttack || battlecry.value || 1;
  const hp = (battlecry as any).summonHealth || battlecry.buffHealth || battlecry.value || 1;

  const tokenCard: CardData = {
    id: 99820,
    name: 'Defender',
    description: 'A defender with Taunt.',
    manaCost: 1,
    type: 'minion',
    rarity: 'token' as any,
    heroClass: 'neutral',
    attack: atk,
    health: hp,
    keywords: ['taunt']
  } as any;
  const instance = createCardInstance(tokenCard);
  instance.isPlayed = true;
  (instance as any).hasTaunt = true;
  state.players.player.battlefield.push(instance);
  return state;
}

function executeCopyToHandBattlecry(state: GameState, targetId?: string): GameState {
  if (!targetId) return state;

  const player = state.players.player;
  const target = player.battlefield.find(c => c.instanceId === targetId);
  if (!target) return state;

  if ((player.hand?.length ?? 0) >= MAX_HAND_SIZE) return state;

  const copy = createCardInstance(target.card);
  player.hand = player.hand || [];
  player.hand.push(copy);

  return state;
}

function executeSubmergeBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId?: string
): GameState {
  if (!cardInstanceId) return state;
  const player = state.players[state.currentTurn];
  const minion = player.battlefield.find(m => m.instanceId === cardInstanceId);
  if (!minion) return state;

  const bc = battlecry as any;
  minion.isSubmerged = true;
  minion.submergeTurnsLeft = bc.value || 1;
  minion.surfaceEffect = bc.surfaceEffect || '';
  minion.surfaceDamage = bc.surfaceDamage || 0;
  minion.canAttack = false;
  minion.isSummoningSick = true;

  return state;
}

function executeCoilEnemyBattlecry(
  state: GameState,
  battlecry: BattlecryEffect,
  cardInstanceId?: string,
  targetId?: string
): GameState {
  if (!targetId || !cardInstanceId) return state;
  const opponent = state.currentTurn === 'player' ? 'opponent' : 'player';
  const target = state.players[opponent].battlefield.find(m => m.instanceId === targetId);
  if (!target) return state;

  const bc = battlecry as any;
  if (bc.maxAttack !== undefined) {
    const currentAtk = target.currentAttack ?? (target.card as MinionCardData).attack ?? 0;
    if (currentAtk > bc.maxAttack) return state;
  }

  target.originalAttackBeforeCoil = target.currentAttack ?? (target.card as MinionCardData).attack ?? 0;
  target.currentAttack = 0;
  target.coiledBy = cardInstanceId;
  target.canAttack = false;

  return state;
}

function executeBloodPriceCountAoE(
  state: GameState,
  _cardInstanceId?: string
): GameState {
  const currentPlayer = state.currentTurn;
  const opponent = currentPlayer === 'player' ? 'opponent' : 'player';

  const bloodPriceCount = (state.gameLog || []).filter(
    entry => entry.player === currentPlayer && entry.text?.includes('Blood Price')
  ).length;

  if (bloodPriceCount <= 0) return state;

  const oppBf = state.players[opponent].battlefield;
  for (let i = 0; i < oppBf.length; i++) {
    if (oppBf[i].currentHealth === undefined) {
      oppBf[i].currentHealth = (oppBf[i].card as MinionCardData).health || 1;
    }
    if (oppBf[i].hasDivineShield) {
      oppBf[i].hasDivineShield = false;
    } else {
      oppBf[i].currentHealth! -= bloodPriceCount;
    }
  }
  state.players[opponent].battlefield = oppBf.filter(m => (m.currentHealth ?? 1) > 0);
  state = dealDamage(state, opponent, 'hero', bloodPriceCount);

  return state;
}

function executeDestroyWeaponOrArtifact(state: GameState): GameState {
  const opponent = state.currentTurn === 'player' ? 'opponent' : 'player';
  const oppPlayer = state.players[opponent];

  if (oppPlayer.weapon) {
    oppPlayer.weapon = undefined;
    return state;
  }

  if (oppPlayer.artifact) {
    oppPlayer.artifact = undefined;
    oppPlayer.artifactState = undefined;
    return state;
  }

  return state;
}

function executeBuffEinherjarInDeck(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const bc = battlecry as any;
  const buffAtk = bc.buffAttack || 2;
  const buffHp = bc.buffHealth || 2;
  const grantKw: string[] = bc.grantKeywords || [];
  const player = state.players[state.currentTurn];

  for (let i = 0; i < player.deck.length; i++) {
    const card = player.deck[i];
    if (card.type !== 'minion') continue;
    if (!card.keywords?.includes('einherjar')) continue;

    const mc = card as MinionCardData;
    player.deck[i] = {
      ...mc,
      attack: (mc.attack || 0) + buffAtk,
      health: (mc.health || 0) + buffHp,
      keywords: [...(mc.keywords || []), ...grantKw.filter(k => !mc.keywords?.includes(k))],
    };
  }

  return state;
}

function executeConditionalDrawBattlecry(
  state: GameState,
  battlecry: BattlecryEffect
): GameState {
  const bc = battlecry as any;
  const condition = bc.condition || '';
  const baseValue = bc.baseValue || bc.value || 1;
  const bonusValue = bc.bonusValue || 0;

  const conditionMet = condition ? checkBattlecryCondition(state, condition) : true;
  const drawCount = conditionMet ? baseValue + bonusValue : baseValue;

  const player = state.players.player;
  for (let i = 0; i < drawCount; i++) {
    if (player.deck.length === 0 || player.hand.length >= MAX_HAND_SIZE) break;
    const drawn = player.deck.shift()!;
    player.hand.push(createCardInstance(drawn));
  }

  return state;
}