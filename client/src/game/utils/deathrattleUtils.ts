import { CardInstance, GameState, CardData, DeathrattleEffect, CardAnimationType, GameLogEvent, AnimationParams, MinionCardData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createCardInstance, isCardOfTribe } from './cards/cardUtils';
import { drawCardFromDeck, removeDeadMinions, destroyCard } from './zoneUtils';
import allCards, { getCardById } from '../data/allCards';
import { trackQuestProgress } from './quests/questProgress';
import { debug } from '../config/debugConfig';
import { dealDamage } from './effects/damageUtils';
import { MAX_BATTLEFIELD_SIZE, MAX_HAND_SIZE } from '../constants/gameConstants';
import { addKeyword } from './cards/keywordUtils';
import { isMinion } from './cards/typeGuards';

const MAX_DEATHRATTLE_DEPTH = 10;
let deathrattleDepth = 0;

export function executeDeathrattle(
  state: GameState,
  card: CardInstance,
  playerId: 'player' | 'opponent'
): GameState {
  if (deathrattleDepth >= MAX_DEATHRATTLE_DEPTH) {
    debug.warn(`[Deathrattle] Max recursion depth (${MAX_DEATHRATTLE_DEPTH}) reached, skipping ${card.card.name}`);
    return state;
  }

  deathrattleDepth++;
  try {
    return executeDeathrattleInner(state, card, playerId);
  } finally {
    deathrattleDepth--;
  }
}

function executeDeathrattleInner(
  state: GameState,
  card: CardInstance,
  playerId: 'player' | 'opponent'
): GameState {
  if (card.card.type !== 'minion') {
    debug.log(`[Deathrattle] Skipped: ${card.card.name} is not a minion`);
    return state;
  }
  
  // Get the deathrattle from the minion card
  const minionCard = card.card as MinionCardData;
  
  // Check for deathrattle keyword OR deathrattle effect (some cards may have one without the other)
  const hasDeathrattleKeyword = minionCard.keywords?.includes('deathrattle') === true;
  const hasDeathrattleEffect = minionCard.deathrattle !== undefined;
  
  if (!hasDeathrattleKeyword && !hasDeathrattleEffect) {
    return state;
  }
  
  // If keyword exists but no effect, log warning
  if (hasDeathrattleKeyword && !hasDeathrattleEffect) {
    debug.warn(`[Deathrattle] Card ${card.card.name} has deathrattle keyword but no effect defined!`);
    return state;
  }
  
  // If effect exists but no keyword, still execute but log for debugging
  if (!hasDeathrattleKeyword && hasDeathrattleEffect) {
    debug.warn(`[Deathrattle] Card ${card.card.name} has deathrattle effect but no keyword - executing anyway`);
  }
  
  debug.log(`[Deathrattle] Triggered: ${card.card.name} (ID: ${card.card.id}) - Effect: ${minionCard.deathrattle!.type}`, minionCard.deathrattle);


  // Create a deep copy of the state to safely modify
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Process the deathrattle based on its type
  const deathrattle = minionCard.deathrattle!;
  
  // Add deathrattle animation to the queue if animations are supported
  if ((newState as any).animations) {
    // Create a properly typed animation object that matches the AnimationParams interface
    const deathrattleAnimation: AnimationParams & {
      id: string;
      startTime: number;
      endTime: number;
      completed: boolean;
      message: string;
      attackBuff?: number;
      healthBuff?: number;
    } = {
      id: `deathrattle_${card.instanceId}_${Date.now()}`,
      type: 'deathrattle' as const,
      sourceId: card.card.id.toString(),
      position: { x: 0, y: 0 }, // In a real implementation, this would be the card's position
      value: deathrattle.value,
      startTime: Date.now(),
      endTime: Date.now() + 1500, // 1.5 seconds animation
      completed: false,
      message: `${card.card.name} triggers deathrattle: ${deathrattle.type}`,
      duration: 1500 // Default animation duration
    };
    
    // Add type-specific properties based on deathrattle type
    if (deathrattle.type === 'damage') {
      deathrattleAnimation.damage = deathrattle.value;
    } else if (deathrattle.type === 'heal') {
      deathrattleAnimation.healing = deathrattle.value;
    } else if (deathrattle.type === 'buff' && (deathrattle.buffAttack || deathrattle.buffHealth)) {
      deathrattleAnimation.attackBuff = deathrattle.buffAttack;
      deathrattleAnimation.healthBuff = deathrattle.buffHealth;
    }
    
    // Add the animation to the state
    (newState as any).animations.push(deathrattleAnimation);
  }
  
  // Add to game log if it exists
  if (newState.gameLog) {
    newState.gameLog.push({
      id: uuidv4(),
      type: 'deathrattle',
      player: playerId,
      text: `${card.card.name} triggered its deathrattle: ${deathrattle.type}`,
      timestamp: Date.now(),
      turn: newState.turnNumber,
      cardId: card.card.id.toString()
    });
  }
  
  // Process the deathrattle effect based on its type
  switch (deathrattle.type) {
    case 'summon':
      return executeSummonDeathrattle(newState, deathrattle, playerId);
    case 'draw':
      return executeDrawDeathrattle(newState, deathrattle, playerId);
    case 'damage':
      return executeDamageDeathrattle(newState, deathrattle, playerId);
    case 'heal':
      return executeHealDeathrattle(newState, deathrattle, playerId);
    case 'buff':
      return executeBuffDeathrattle(newState, deathrattle, playerId);
    case 'give_divine_shield':
      return executeGiveDivineShieldDeathrattle(newState, deathrattle, playerId);
    case 'mind_control':
      return executeMindControlDeathrattle(newState, deathrattle, playerId);
    case 'damage_conditional':
      return executeDamageConditionalDeathrattle(newState, deathrattle, card, playerId);
    case 'deal_damage':
      return executeDamageDeathrattle(newState, deathrattle, playerId);
    case 'recruit':
      return executeRecruitDeathrattle(newState, deathrattle, playerId);
    case 'summon_splitting':
      return executeSummonSplittingDeathrattle(newState, deathrattle, playerId);
    case 'summon_multiple':
      return executeSummonMultipleDeathrattle(newState, deathrattle, playerId);
    case 'summon_if_other_died':
      return executeSummonIfOtherDiedDeathrattle(newState, deathrattle, playerId);
    case 'summon_for_opponent':
      return executeSummonForOpponentDeathrattle(newState, deathrattle, playerId);
    case 'add_random_to_hand':
      return executeAddRandomToHandDeathrattle(newState, deathrattle, playerId);
    case 'summon_random_mythic':
      return executeSummonRandomMythicDeathrattle(newState, deathrattle, playerId);
    case 'summon_from_hand':
      return executeSummonFromHandDeathrattle(newState, deathrattle, playerId);
    case 'shuffle_copies_buffed':
      return executeShuffleCopiesBuffedDeathrattle(newState, deathrattle, playerId);
    case 'return_to_hand':
      return executeReturnToHandDeathrattle(newState, card, playerId);
    case 'random_damage':
      return executeRandomDamageDeathrattle(newState, deathrattle, playerId);
    case 'grant_keyword':
      return executeGrantKeywordDeathrattle(newState, deathrattle, playerId);
    case 'give_spare_part':
      return executeGiveSparePartDeathrattle(newState, deathrattle, playerId);
    case 'freeze_random':
      return executeFreezeRandomDeathrattle(newState, deathrattle, playerId);
    case 'equip_weapon':
      return executeEquipWeaponDeathrattle(newState, deathrattle, playerId);
    case 'conditional_aoe':
      return executeConditionalAoeDeathrattle(newState, deathrattle, playerId);
    case 'buff_friendly_beasts':
      return executeBuffFriendlyBeastsDeathrattle(newState, deathrattle, playerId);
    case 'buff_and_enchant':
      return executeBuffAndEnchantDeathrattle(newState, deathrattle, playerId);
    case 'split_damage':
      return executeRandomDamageDeathrattle(newState, deathrattle, playerId);
    case 'resurrect':
      return executeSummonDeathrattle(newState, deathrattle, playerId);
    case 'destroy':
      return executeDestroyDeathrattle(newState, deathrattle, playerId);
    case 'aoe_damage': {
      const aoeDmgVal = deathrattle.value || 1;
      const aoeTgt = (deathrattle as any).targetType as string | undefined;
      const oppId = playerId === 'player' ? 'opponent' : 'player';
      if (aoeTgt === 'all_enemies' || aoeTgt === 'all_enemy_minions' || !aoeTgt) {
        const oppBf = newState.players[oppId as 'player' | 'opponent'].battlefield;
        for (let i = 0; i < oppBf.length; i++) {
          if (oppBf[i].currentHealth === undefined) {
            oppBf[i].currentHealth = (oppBf[i].card as MinionCardData).health || 1;
          }
          if (oppBf[i].hasDivineShield) {
            oppBf[i].hasDivineShield = false;
          } else {
            oppBf[i].currentHealth! -= aoeDmgVal;
          }
        }
        const deadMinions = oppBf.filter(m => (m.currentHealth ?? 1) <= 0);
        for (const dead of deadMinions) {
          newState = destroyCard(newState, dead.instanceId, oppId as 'player' | 'opponent');
        }
        if (aoeTgt === 'all_enemies') {
          newState = dealDamage(newState, oppId as 'player' | 'opponent', 'hero', aoeDmgVal);
        }
      }
      return newState;
    }
    case 'gain_armor': {
      const armorVal = deathrattle.value || 0;
      newState.players[playerId].heroArmor = Math.min(30, (newState.players[playerId].heroArmor || 0) + armorVal);
      return newState;
    }
    case 'resummon': {
      const player = newState.players[playerId];
      if (player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
        const rebornCopy = createCardInstance(card.card);
        rebornCopy.currentHealth = (card.card as MinionCardData).health || 1;
        rebornCopy.isSummoningSick = true;
        rebornCopy.canAttack = false;
        player.battlefield.push(rebornCopy);
      }
      return newState;
    }
    case 'aoe_damage_and_buff': {
      const aoeDmg = deathrattle.value || 1;
      const opponent = playerId === 'player' ? 'opponent' : 'player';
      const oppBf = newState.players[opponent].battlefield;
      for (let i = 0; i < oppBf.length; i++) {
        if (oppBf[i].currentHealth === undefined) {
          oppBf[i].currentHealth = (oppBf[i].card as MinionCardData).health || 1;
        }
        if (oppBf[i].hasDivineShield) {
          oppBf[i].hasDivineShield = false;
        } else {
          oppBf[i].currentHealth! -= aoeDmg;
        }
      }
      const deadFromAoe = oppBf.filter(m => (m.currentHealth ?? 1) <= 0);
      for (const dead of deadFromAoe) {
        newState = destroyCard(newState, dead.instanceId, opponent as 'player' | 'opponent');
      }
      const buffAtk = (deathrattle as any).buffAttack || 0;
      const buffHp = (deathrattle as any).buffHealth || 0;
      if (buffAtk > 0 || buffHp > 0) {
        const friendlyBf = newState.players[playerId].battlefield;
        for (let i = 0; i < friendlyBf.length; i++) {
          const mc = friendlyBf[i].card as MinionCardData;
          friendlyBf[i].card = { ...mc, attack: (mc.attack || 0) + buffAtk, health: (mc.health || 0) + buffHp } as MinionCardData;
          friendlyBf[i].currentAttack = (friendlyBf[i].currentAttack ?? mc.attack ?? 0) + buffAtk;
          friendlyBf[i].currentHealth = (friendlyBf[i].currentHealth ?? mc.health ?? 0) + buffHp;
        }
      }
      return newState;
    }
    case 'silence': {
      const silTgt = (deathrattle as any).targetType as string | undefined;
      if (silTgt === 'all_enemy_minions') {
        const opponent = playerId === 'player' ? 'opponent' : 'player';
        const oppBf = newState.players[opponent].battlefield;
        for (const minion of oppBf) {
          minion.card = { ...minion.card, keywords: [], battlecry: undefined, deathrattle: undefined } as any;
          (minion as any).hasDivineShield = false;
          (minion as any).isTaunt = false;
          (minion as any).hasWindfury = false;
          (minion as any).isStealth = false;
          (minion as any).hasLifesteal = false;
          (minion as any).silenced = true;
        }
      }
      return newState;
    }
    case 'resummon_self': {
      const player = newState.players[playerId];
      if (player.battlefield.length < MAX_BATTLEFIELD_SIZE) {
        const selfCopy = createCardInstance(card.card);
        selfCopy.currentHealth = 1;
        selfCopy.isSummoningSick = true;
        selfCopy.canAttack = false;
        selfCopy.card = { ...selfCopy.card, deathrattle: undefined } as any;
        player.battlefield.push(selfCopy);
      }
      return newState;
    }
    case 'add_copy_to_hand': {
      const player = newState.players[playerId];
      if (player.hand.length < MAX_HAND_SIZE) {
        const handCopy = createCardInstance(card.card);
        player.hand.push(handCopy);
      }
      return newState;
    }
    case 'add_random_class_card': {
      const player = newState.players[playerId];
      if (player.hand.length < MAX_HAND_SIZE && player.deck.length > 0) {
        const randomIdx = Math.floor(Math.random() * player.deck.length);
        const randomCard = player.deck[randomIdx];
        const inst = createCardInstance(randomCard);
        player.hand.push(inst);
      }
      return newState;
    }
    case 'deal_attack_damage_random_enemy': {
      const opponent = playerId === 'player' ? 'opponent' : 'player';
      const atkDmg = card.currentAttack ?? (card.card as MinionCardData).attack ?? 0;
      if (atkDmg > 0) {
        const targets = newState.players[opponent].battlefield;
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          if (target.hasDivineShield) {
            target.hasDivineShield = false;
          } else {
            target.currentHealth = (target.currentHealth ?? (target.card as MinionCardData).health ?? 1) - atkDmg;
          }
        }
      }
      return newState;
    }
    case 'resurrect_to_hand': {
      const player = newState.players[playerId];
      const graveyard = player.graveyard || [];
      const deadMinions = graveyard.filter(c => isMinion(c.card));
      if (deadMinions.length > 0 && player.hand.length < MAX_HAND_SIZE) {
        const pick = deadMinions[Math.floor(Math.random() * deadMinions.length)];
        const inst = createCardInstance(pick.card);
        player.hand.push(inst);
      }
      return newState;
    }
    case 'return_to_hand_cost_increase': {
      const player = newState.players[playerId];
      if (player.hand.length < MAX_HAND_SIZE) {
        const handCopy = createCardInstance(card.card);
        const mana = (handCopy.card as any).manaCost ?? (handCopy.card as any).cost ?? 0;
        (handCopy.card as any).manaCost = mana + ((deathrattle as any).costIncrease || 2);
        (handCopy.card as any).cost = mana + ((deathrattle as any).costIncrease || 2);
        handCopy.card = { ...handCopy.card, deathrattle: undefined } as any;
        player.hand.push(handCopy);
      }
      return newState;
    }
    case 'summon_devoured_copies': {
      const player = newState.players[playerId];
      const devoured = (card as any).devouredCards || [];
      for (const devouredCard of devoured) {
        if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
        const inst = createCardInstance(devouredCard);
        inst.isSummoningSick = true;
        inst.canAttack = false;
        player.battlefield.push(inst);
      }
      return newState;
    }
    case 'uncoil': {
      return executeUncoilDeathrattle(newState, card, playerId);
    }
    case 'add_to_hand': {
      return executeAddToHandDeathrattle(newState, deathrattle, card, playerId);
    }
    case 'shuffle_card': {
      return executeShuffleCardDeathrattle(newState, deathrattle, card, playerId);
    }
    case 'summon_random': {
      return executeSummonRandomDeathrattle(newState, deathrattle, playerId);
    }
    case 'compound':
      return executeCompoundDeathrattle(newState, deathrattle, card, playerId);
    case 'heal_hero': {
      const healVal = deathrattle.value || 1;
      const targetHero = deathrattle.targetType === 'friendly_hero' ? playerId : (playerId === 'player' ? 'opponent' : 'player');
      const p = newState.players[targetHero as 'player' | 'opponent'];
      p.heroHealth = Math.min((p.heroHealth ?? p.health) + healVal, p.maxHealth);
      return newState;
    }
    case 'add_card': {
      const player = newState.players[playerId];
      if (player.hand.length >= MAX_HAND_SIZE) return newState;
      const addCardCondition = (deathrattle as any).condition as string | undefined;
      if (addCardCondition === 'random_mythic') {
        const mythics = allCards.filter(c => c.rarity === 'mythic');
        if (mythics.length > 0) {
          const pick = mythics[Math.floor(Math.random() * mythics.length)];
          player.hand.push(createCardInstance(pick));
        }
      } else if (addCardCondition && addCardCondition.startsWith('random_')) {
        const className = addCardCondition.replace('random_', '');
        const classCards = allCards.filter(c => (c as any).heroClass?.toLowerCase() === className.toLowerCase() || (c as any).class?.toLowerCase() === className.toLowerCase());
        if (classCards.length > 0) {
          const pick = classCards[Math.floor(Math.random() * classCards.length)];
          player.hand.push(createCardInstance(pick));
        }
      } else {
        const addId = (deathrattle as any).cardId || (deathrattle as any).summonCardId;
        if (addId) {
          const cardData = getCardById(typeof addId === 'string' ? parseInt(addId, 10) : addId);
          if (cardData) {
            player.hand.push(createCardInstance(cardData));
          }
        } else {
          const cardName = (deathrattle as any).cardName as string | undefined;
          if (cardName) {
            const found = allCards.find(c => c.name === cardName);
            if (found) {
              player.hand.push(createCardInstance(found));
            }
          }
        }
      }
      return newState;
    }
    case 'summon_token': {
      const player = newState.players[playerId];
      const tokenId = deathrattle.summonCardId || (deathrattle as any).cardId;
      const tokenCount = deathrattle.value || 1;
      if (tokenId) {
        const tokenData = getCardById(typeof tokenId === 'number' ? tokenId : parseInt(tokenId, 10));
        if (tokenData) {
          for (let i = 0; i < tokenCount; i++) {
            if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
            const inst = createCardInstance(tokenData);
            inst.isSummoningSick = true;
            inst.canAttack = false;
            player.battlefield.push(inst);
            trackQuestProgress(playerId, 'summon_minion', inst.card);
          }
        }
      }
      return newState;
    }
    case 'summon_copy': {
      const player = newState.players[playerId];
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
      const targetFromBattlecry = (deathrattle as any).targetFromBattlecry;
      if (targetFromBattlecry && (card as any).battlecryTargetCard) {
        const storedCard = (card as any).battlecryTargetCard;
        const inst = createCardInstance(storedCard);
        inst.isSummoningSick = true;
        inst.canAttack = false;
        player.battlefield.push(inst);
        trackQuestProgress(playerId, 'summon_minion', inst.card);
      } else {
        const selfCopy = createCardInstance(card.card);
        selfCopy.isSummoningSick = true;
        selfCopy.canAttack = false;
        player.battlefield.push(selfCopy);
        trackQuestProgress(playerId, 'summon_minion', selfCopy.card);
      }
      return newState;
    }
    case 'summon_yggdrasil_golem': {
      const player = newState.players[playerId];
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
      const currentCounter = (player as any).yggdrasilGolemCounter || 0;
      (player as any).yggdrasilGolemCounter = currentCounter + 1;
      const golemSize = Math.min(currentCounter + 1, 30);
      const golemCard: CardData = {
        id: 85100 + golemSize,
        name: 'Yggdrasil Golem',
        type: 'minion',
        manaCost: golemSize,
        attack: golemSize,
        health: golemSize,
        description: '',
        rarity: 'common',
        class: 'Neutral',
        race: 'Elemental',
        collectible: false
      } as CardData;
      const golemInst = createCardInstance(golemCard);
      golemInst.isSummoningSick = true;
      golemInst.canAttack = false;
      player.battlefield.push(golemInst);
      trackQuestProgress(playerId, 'summon_minion', golemInst.card);
      return newState;
    }
    case 'heal_all_friendly': {
      const healAmount = deathrattle.value || 1;
      const player = newState.players[playerId];
      player.battlefield.forEach(minion => {
        if (minion.card.type === 'minion') {
          const maxHp = (minion.card as MinionCardData).health ?? 0;
          minion.currentHealth = Math.min((minion.currentHealth ?? maxHp) + healAmount, maxHp);
        }
      });
      player.heroHealth = Math.min((player.heroHealth ?? player.health) + healAmount, player.maxHealth);
      return newState;
    }
    case 'shuffle_into_deck': {
      const player = newState.players[playerId];
      const shuffleId = (deathrattle as any).cardId || deathrattle.summonCardId;
      let shuffleCardData: CardData | undefined;
      if (shuffleId) {
        shuffleCardData = getCardById(typeof shuffleId === 'string' ? parseInt(shuffleId, 10) : shuffleId);
        if (!shuffleCardData) {
          const found = allCards.find(c => c.name === shuffleId);
          if (found) shuffleCardData = found;
        }
      }
      if (!shuffleCardData) {
        shuffleCardData = card.card;
      }
      const count = deathrattle.value || 1;
      for (let i = 0; i < count; i++) {
        const copy = JSON.parse(JSON.stringify(shuffleCardData)) as CardData;
        const insertIdx = Math.floor(Math.random() * (player.deck.length + 1));
        player.deck.splice(insertIdx, 0, copy);
      }
      return newState;
    }
    case 'damage_hero': {
      const dmgVal = deathrattle.value || 1;
      const dmgTarget = deathrattle.targetType === 'friendly_hero' ? playerId : (playerId === 'player' ? 'opponent' : 'player');
      newState = dealDamage(newState, dmgTarget as 'player' | 'opponent', 'hero', dmgVal, undefined, undefined, playerId);
      if (newState.players.player.health <= 0) {
        newState.gamePhase = 'game_over';
        newState.winner = 'opponent';
      } else if (newState.players.opponent.health <= 0) {
        newState.gamePhase = 'game_over';
        newState.winner = 'player';
      }
      return newState;
    }
    case 'copy_from_opponent_deck': {
      const player = newState.players[playerId];
      const oppId = playerId === 'player' ? 'opponent' : 'player';
      const opponent = newState.players[oppId];
      const copyCount = (deathrattle as any).count || deathrattle.value || 1;
      for (let i = 0; i < copyCount; i++) {
        if (player.hand.length >= MAX_HAND_SIZE) break;
        if (opponent.deck.length === 0) break;
        const randomIdx = Math.floor(Math.random() * opponent.deck.length);
        const copiedCardData = JSON.parse(JSON.stringify(opponent.deck[randomIdx])) as CardData;
        const inst = createCardInstance(copiedCardData);
        player.hand.push(inst);
      }
      return newState;
    }
    case 'conditional_summon': {
      const player = newState.players[playerId];
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
      const condSummonId = deathrattle.summonCardId || (deathrattle as any).cardId;
      if (!condSummonId) return newState;
      const condition = (deathrattle as any).condition as string | undefined;
      if (condition && !checkDeathrattleCondition(newState, condition, playerId)) {
        return newState;
      }
      const condCardData = getCardById(typeof condSummonId === 'number' ? condSummonId : parseInt(condSummonId, 10));
      if (!condCardData) return newState;
      const condInst = createCardInstance(condCardData);
      condInst.isSummoningSick = true;
      condInst.canAttack = false;
      player.battlefield.push(condInst);
      trackQuestProgress(playerId, 'summon_minion', condInst.card);
      return newState;
    }
    case 'summon_highest_cost_from_graveyard': {
      const player = newState.players[playerId];
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
      const graveyard = player.graveyard || [];
      const deadMinions = graveyard.filter(c => c.card.type === 'minion');
      if (deadMinions.length === 0) return newState;
      let highest = deadMinions[0];
      for (const m of deadMinions) {
        if (((m.card as any).manaCost ?? 0) > ((highest.card as any).manaCost ?? 0)) {
          highest = m;
        }
      }
      const resurrected = createCardInstance(highest.card);
      resurrected.isSummoningSick = true;
      resurrected.canAttack = false;
      player.battlefield.push(resurrected);
      trackQuestProgress(playerId, 'summon_minion', resurrected.card);
      return newState;
    }
    case 'shuffle': {
      const player = newState.players[playerId];
      const shuffCardId = deathrattle.summonCardId || (deathrattle as any).cardId;
      let cardToShuffle: CardData;
      if (shuffCardId) {
        const found = getCardById(typeof shuffCardId === 'number' ? shuffCardId : parseInt(shuffCardId, 10));
        cardToShuffle = found ? JSON.parse(JSON.stringify(found)) as CardData : JSON.parse(JSON.stringify(card.card)) as CardData;
      } else {
        cardToShuffle = JSON.parse(JSON.stringify(card.card)) as CardData;
      }
      const insertIdx = Math.floor(Math.random() * (player.deck.length + 1));
      player.deck.splice(insertIdx, 0, cardToShuffle);
      return newState;
    }
    case 'add_random_class_spell': {
      const player = newState.players[playerId];
      if (player.hand.length >= MAX_HAND_SIZE) return newState;
      const targetClass = ((deathrattle as any).class || player.heroClass || '').toLowerCase();
      const classSpells = allCards.filter(c =>
        c.type === 'spell' &&
        ((c as any).heroClass?.toLowerCase() === targetClass || (c as any).class?.toLowerCase() === targetClass)
      );
      if (classSpells.length === 0) return newState;
      const picked = classSpells[Math.floor(Math.random() * classSpells.length)];
      player.hand.push(createCardInstance(picked));
      return newState;
    }
    case 'summon_with_triggered': {
      const player = newState.players[playerId];
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
      const summonName = (deathrattle as any).summonName || 'Summoned Minion';
      const summonAtk = (deathrattle as any).summonAttack || deathrattle.value || 1;
      const summonHp = (deathrattle as any).summonHealth || deathrattle.value || 1;
      const tokenCard: CardData = {
        id: 99990,
        name: summonName,
        type: 'minion',
        manaCost: 0,
        attack: summonAtk,
        health: summonHp,
        description: '',
        rarity: 'common',
        class: 'Neutral',
        collectible: false
      } as CardData;
      const tokenInst = createCardInstance(tokenCard);
      tokenInst.isSummoningSick = true;
      tokenInst.canAttack = false;
      player.battlefield.push(tokenInst);
      trackQuestProgress(playerId, 'summon_minion', tokenInst.card);
      return newState;
    }
    case 'summon_stored': {
      const player = newState.players[playerId];
      const devoured = (card as any).devouredCards || (card as any).storedCards || [];
      const storedCount = deathrattle.value || devoured.length || 1;
      for (let i = 0; i < Math.min(storedCount, devoured.length); i++) {
        if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
        const inst = createCardInstance(devoured[i]);
        inst.isSummoningSick = true;
        inst.canAttack = false;
        player.battlefield.push(inst);
        trackQuestProgress(playerId, 'summon_minion', inst.card);
      }
      return newState;
    }
    case 'return_to_hand_buffed': {
      const player = newState.players[playerId];
      if (player.hand.length >= MAX_HAND_SIZE) return newState;
      const buffVal = deathrattle.value || 1;
      const buffedCopy = createCardInstance(card.card);
      if (buffedCopy.card.type === 'minion') {
        const mc = buffedCopy.card as MinionCardData;
        mc.attack = (mc.attack ?? 0) + buffVal;
        mc.health = (mc.health ?? 0) + buffVal;
      }
      buffedCopy.isPlayed = false;
      player.hand.push(buffedCopy);
      return newState;
    }
    case 'return_stolen_minion': {
      const opponentId = playerId === 'player' ? 'opponent' : 'player';
      const ownBf = newState.players[playerId].battlefield;
      const oppPlayer = newState.players[opponentId];
      const stolenMinions = ownBf.filter(m => m.originalOwner === opponentId);
      for (const stolen of stolenMinions) {
        if (oppPlayer.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
        newState.players[playerId].battlefield = newState.players[playerId].battlefield.filter(
          m => m.instanceId !== stolen.instanceId
        );
        stolen.isSummoningSick = true;
        stolen.canAttack = false;
        stolen.originalOwner = undefined;
        oppPlayer.battlefield.push(stolen);
      }
      return newState;
    }
    case 'resurrect_self': {
      const player = newState.players[playerId];
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
      const selfCopy = createCardInstance(card.card);
      selfCopy.currentHealth = deathrattle.value || 1;
      selfCopy.isSummoningSick = true;
      selfCopy.canAttack = false;
      selfCopy.card = { ...selfCopy.card, deathrattle: undefined } as any;
      player.battlefield.push(selfCopy);
      trackQuestProgress(playerId, 'summon_minion', selfCopy.card);
      return newState;
    }
    case 'resurrect_buffed': {
      const player = newState.players[playerId];
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
      const graveyard = player.graveyard || [];
      const deadMinions = graveyard.filter(c => c.card.type === 'minion');
      if (deadMinions.length === 0) return newState;
      const pick = deadMinions[Math.floor(Math.random() * deadMinions.length)];
      const resInst = createCardInstance(pick.card);
      if (resInst.card.type === 'minion') {
        const mc = resInst.card as MinionCardData;
        mc.attack = (mc.attack ?? 0) + (deathrattle.buffAttack || 0);
        mc.health = (mc.health ?? 0) + (deathrattle.buffHealth || 0);
        resInst.currentHealth = mc.health;
      }
      resInst.isSummoningSick = true;
      resInst.canAttack = false;
      player.battlefield.push(resInst);
      trackQuestProgress(playerId, 'summon_minion', resInst.card);
      return newState;
    }
    case 'draw_and_damage_hero': {
      const drawCount = deathrattle.value || 1;
      const dmg = (deathrattle as any).damage || 1;
      for (let i = 0; i < drawCount; i++) {
        if (newState.players[playerId].deck.length > 0) {
          newState = drawCardFromDeck(newState, playerId);
        }
      }
      newState = dealDamage(newState, playerId, 'hero', dmg, undefined, undefined, playerId === 'player' ? 'opponent' : 'player');
      if (newState.players.player.health <= 0) {
        newState.gamePhase = 'game_over';
        newState.winner = 'opponent';
      } else if (newState.players.opponent.health <= 0) {
        newState.gamePhase = 'game_over';
        newState.winner = 'player';
      }
      return newState;
    }
    case 'debuff_adjacent': {
      const enemyId = playerId === 'player' ? 'opponent' : 'player';
      const enemyBf = newState.players[enemyId].battlefield;
      const debuffAtk = (deathrattle as any).buffAttack || 0;
      const debuffHp = (deathrattle as any).buffHealth || 0;
      for (const minion of enemyBf) {
        if (minion.card.type === 'minion') {
          const mc = minion.card as MinionCardData;
          if (debuffAtk) {
            mc.attack = Math.max((mc.attack ?? 0) + debuffAtk, 0);
            minion.currentAttack = Math.max((minion.currentAttack ?? mc.attack ?? 0) + debuffAtk, 0);
          }
          if (debuffHp) {
            mc.health = Math.max((mc.health ?? 0) + debuffHp, 1);
            minion.currentHealth = Math.max((minion.currentHealth ?? mc.health ?? 0) + debuffHp, 1);
          }
        }
      }
      return newState;
    }
    case 'damage_enemy_hero': {
      const dmgAmount = deathrattle.value || 1;
      const enemyId = playerId === 'player' ? 'opponent' : 'player';
      newState = dealDamage(newState, enemyId, 'hero', dmgAmount, undefined, undefined, playerId);
      if (newState.players.player.health <= 0) {
        newState.gamePhase = 'game_over';
        newState.winner = 'opponent';
      } else if (newState.players.opponent.health <= 0) {
        newState.gamePhase = 'game_over';
        newState.winner = 'player';
      }
      return newState;
    }
    case 'buff_random_friendly': {
      const player = newState.players[playerId];
      if (player.battlefield.length === 0) return newState;
      const buffAmount = deathrattle.value || 1;
      const randomIdx = Math.floor(Math.random() * player.battlefield.length);
      const target = player.battlefield[randomIdx];
      if (target.card.type === 'minion') {
        const mc = target.card as MinionCardData;
        mc.attack = (mc.attack ?? 0) + buffAmount;
        mc.health = (mc.health ?? 0) + buffAmount;
        target.currentHealth = (target.currentHealth ?? mc.health ?? 0) + buffAmount;
      }
      return newState;
    }
    default:
      debug.warn(`Unknown deathrattle type: ${deathrattle.type}`);
      return newState;
  }
}

function executeCompoundDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  card: CardInstance,
  playerId: 'player' | 'opponent'
): GameState {
  const effects = (deathrattle as any).effects as DeathrattleEffect[] | undefined;
  if (!effects || !Array.isArray(effects) || effects.length === 0) {
    debug.warn('[Deathrattle] compound deathrattle has no effects array');
    return state;
  }
  let currentState = state;
  for (const subEffect of effects) {
    currentState = executeDeathrattleEffect(currentState, subEffect, card, playerId);
  }
  return currentState;
}

function executeDeathrattleEffect(
  state: GameState,
  deathrattle: DeathrattleEffect,
  card: CardInstance,
  playerId: 'player' | 'opponent'
): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  switch (deathrattle.type) {
    case 'damage': {
      const dmg = deathrattle.value || 1;
      const target = deathrattle.targetType;
      if (target === 'all_enemies' || target === 'all_enemy_minions' || target === 'enemy_minions') {
        const enemyId = playerId === 'player' ? 'opponent' : 'player';
        const enemyBf = newState.players[enemyId].battlefield;
        for (const m of enemyBf) {
          if (m.hasDivineShield) { m.hasDivineShield = false; }
          else { m.currentHealth = (m.currentHealth ?? (m.card as MinionCardData).health ?? 1) - dmg; }
        }
        if (target === 'all_enemies') {
          newState = dealDamage(newState, enemyId, 'hero', dmg, undefined, undefined, playerId);
        }
      }
      return removeDeadMinions(newState);
    }
    case 'heal': case 'heal_all': {
      const healVal = deathrattle.value || 1;
      const target = deathrattle.targetType;
      if (target === 'friendly_characters' || target === 'all_friendly') {
        const p = newState.players[playerId];
        p.battlefield.forEach(m => {
          if (m.card.type === 'minion') {
            const maxHp = (m.card as MinionCardData).health ?? 0;
            m.currentHealth = Math.min((m.currentHealth ?? maxHp) + healVal, maxHp);
          }
        });
        p.heroHealth = Math.min((p.heroHealth ?? p.health) + healVal, p.maxHealth);
      }
      return newState;
    }
    case 'buff': {
      const bAtk = deathrattle.buffAttack || 0;
      const bHp = deathrattle.buffHealth || 0;
      newState.players[playerId].battlefield.forEach(m => {
        if (m.card.type === 'minion') {
          const mc = m.card as MinionCardData;
          mc.attack = (mc.attack ?? 0) + bAtk;
          mc.health = (mc.health ?? 0) + bHp;
          m.currentHealth = (m.currentHealth ?? mc.health ?? 0) + bHp;
        }
      });
      return newState;
    }
    case 'summon': {
      const summonId = deathrattle.summonCardId || (deathrattle as any).cardId;
      if (!summonId) return newState;
      const cardData = getCardById(typeof summonId === 'number' ? summonId : parseInt(summonId, 10));
      if (!cardData) return newState;
      const p = newState.players[playerId];
      const count = deathrattle.value || 1;
      for (let i = 0; i < count; i++) {
        if (p.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
        const inst = createCardInstance(cardData);
        inst.isSummoningSick = true;
        inst.canAttack = false;
        p.battlefield.push(inst);
      }
      return newState;
    }
    case 'draw': {
      const drawCount = deathrattle.value || 1;
      for (let i = 0; i < drawCount; i++) {
        if (newState.players[playerId].deck.length > 0) {
          newState = drawCardFromDeck(newState, playerId);
        }
      }
      return newState;
    }
    case 'destroy': {
      const enemyId = playerId === 'player' ? 'opponent' : 'player';
      const specificId = (deathrattle as any).specificCardId;
      if (specificId) {
        const bf = newState.players[enemyId].battlefield;
        const toDestroy = bf.filter(m => m.card.id === specificId);
        for (const m of toDestroy) {
          newState = destroyCard(newState, m.instanceId, enemyId);
        }
      } else {
        const bf = newState.players[enemyId].battlefield;
        if (bf.length > 0) {
          const idx = Math.floor(Math.random() * bf.length);
          newState = destroyCard(newState, bf[idx].instanceId, enemyId);
        }
      }
      return newState;
    }
    default:
      debug.warn(`[Deathrattle] Unknown compound sub-effect type: ${deathrattle.type}`);
      return newState;
  }
}

/**
 * Execute a summon deathrattle effect
 */
function executeSummonDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  // Deep copy the state to avoid mutation
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Find the card to summon — support summonCardId, cardId, and summonId
  const summonId = deathrattle.summonCardId || (deathrattle as any).cardId || (deathrattle as any).summonId;
  if (!summonId) {
    debug.error("No summon card ID specified in the deathrattle effect");
    return state;
  }

  const cardToSummon = getCardById(summonId);
  
  if (!cardToSummon) {
    debug.error(`Card with ID ${summonId} not found in the database`);
    return state;
  }
  
  const player = newState.players[playerId];
  
  // Check if there's room on the battlefield (max 7 minions)
  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return newState;
  }
  
  // Determine how many copies to summon (default to 1 if not specified)
  const summonCount = deathrattle.value || 1;
  
  // Create and add instances for each summon, up to the battlefield limit
  for (let i = 0; i < summonCount; i++) {
    // Check battlefield space again on each iteration
    if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
      break;
    }
    
    // Create a new instance of the card to summon
    const summonedCard = createCardInstance(cardToSummon);
    
    // Add the summoned card to the battlefield
    player.battlefield.push(summonedCard);
    
    // Track quest progress for summoned minion
    trackQuestProgress(playerId, 'summon_minion', summonedCard.card);
  }
  
  return newState;
}

/**
 * Execute a draw deathrattle effect
 */
function executeDrawDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Default to 1 card if no value is specified
  const cardsToDraw = deathrattle.value || 1;
  
  
  // Check if player has enough cards in deck
  const player = newState.players[playerId];
  
  if (player.deck.length === 0) {
    return newState;
  }
  
  // Draw the specified number of cards, but stop if deck is empty
  for (let i = 0; i < cardsToDraw; i++) {
    if (player.deck.length > 0) {
      newState = drawCardFromDeck(newState, playerId);
    } else {
      break;
    }
  }
  
  return newState;
}

/**
 * Execute a damage deathrattle effect
 */
function executeDamageDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  const damageAmount = deathrattle.value || 1;
  const targets = deathrattle.targetType;
  
  // Determine the targets based on the deathrattle target type
  if (targets === 'all_enemies') {
    // The opponent player is the enemy of the current player
    const enemyId = playerId === 'player' ? 'opponent' : 'player';
    const enemyPlayer = newState.players[enemyId];
    
    // Deal damage to all enemy minions
    enemyPlayer.battlefield.forEach(minion => {
      // Handle divine shield
      if (minion.hasDivineShield) {
        minion.hasDivineShield = false;
      } else {
        const currentHealth = minion.currentHealth ?? (minion.card.type === 'minion' ? minion.card.health : 0) ?? 0;
        minion.currentHealth = currentHealth - damageAmount;
      }
    });
    
    // Deal damage to enemy hero
    newState = dealDamage(newState, enemyId, 'hero', damageAmount, undefined, undefined, playerId);
  } else if (targets === 'all') {
    // Deal damage to all minions on both sides
    for (const playerKey of ['player', 'opponent'] as const) {
      newState.players[playerKey].battlefield.forEach(minion => {
        // Handle divine shield
        if (minion.hasDivineShield) {
          minion.hasDivineShield = false;
        } else {
          const currentHealth = minion.currentHealth ?? (minion.card.type === 'minion' ? minion.card.health : 0) ?? 0;
          minion.currentHealth = currentHealth - damageAmount;
        }
      });
    }
  } else if (targets === 'enemy_hero') {
    // Deal damage to enemy hero only
    const enemyId = playerId === 'player' ? 'opponent' : 'player';
    newState = dealDamage(newState, enemyId, 'hero', damageAmount, undefined, undefined, playerId);
  }
  
  // Check if any minions died as a result of the deathrattle damage
  // Note: Chained deathrattles from AOE damage are NOT processed here to prevent infinite loops.
  // The game uses a sequential resolution model where deaths from deathrattles are moved to graveyard
  // but their deathrattles are deferred until the next combat phase check.
  // Simultaneous deaths resolve together.
  
  for (const playerKey of ['player', 'opponent'] as const) {
    const deadMinions = newState.players[playerKey].battlefield.filter(minion => (minion.currentHealth ?? 0) <= 0);
    if (deadMinions.length > 0) {
      // Remove dead minions from the battlefield
      newState.players[playerKey].battlefield = newState.players[playerKey].battlefield.filter(
        minion => (minion.currentHealth ?? 0) > 0
      );
      
      // Add them to the graveyard
      if (!newState.players[playerKey].graveyard) {
        newState.players[playerKey].graveyard = [];
      }
      newState.players[playerKey].graveyard = [
        ...newState.players[playerKey].graveyard,
        ...deadMinions
      ];
      
      // Log deaths with deathrattles for debugging - these will be handled by the combat resolution phase
      for (const minion of deadMinions) {
        if (shouldTriggerDeathrattle(minion)) {
          debug.log(`[Deathrattle] Minion ${minion.card.name} died from AOE damage - deathrattle queued for combat resolution`);
          // Mark on the state that there are pending deathrattles to process
          if (!(newState as any).pendingDeathrattles) {
            (newState as any).pendingDeathrattles = [];
          }
          (newState as any).pendingDeathrattles.push({ 
            minion, 
            playerId: playerKey,
            source: 'aoe_damage'
          });
        }
      }
    }
  }
  
  // Also check for hero death (game over)
  if (newState.players.player.health <= 0) {
    newState.gamePhase = "game_over";
    newState.winner = 'opponent';
  } else if (newState.players.opponent.health <= 0) {
    newState.gamePhase = "game_over";
    newState.winner = 'player';
  }
  
  // Process pending deathrattles now (since we bypassed destroyCard for AOE deaths)
  // This is safe because processPendingDeathrattles handles the iteration itself
  return processPendingDeathrattles(newState);
}

function checkDeathrattleCondition(state: GameState, condition: string, playerId: 'player' | 'opponent'): boolean {
  const player = state.players[playerId];
  const battlefield = player.battlefield || [];
  switch (condition) {
    case 'minion_count_7':
      return battlefield.length >= 7;
    case 'minion_died_this_turn':
      return ((state as any).minionsDeadThisTurn || 0) > 0;
    default:
      return true;
  }
}

function executeDamageConditionalDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  card: CardInstance,
  playerId: 'player' | 'opponent'
): GameState {
  const condition = (deathrattle as any).condition as string | undefined;
  if (condition && !checkDeathrattleCondition(state, condition, playerId)) {
    return state;
  }
  return executeDamageDeathrattle(state, deathrattle, playerId);
}

function executeReturnToHandDeathrattle(
  state: GameState,
  card: CardInstance,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];
  if ((player.hand || []).length >= MAX_HAND_SIZE) {
    return newState;
  }
  const returnedCard = createCardInstance(card.card);
  returnedCard.isPlayed = false;
  player.hand.push(returnedCard);
  return newState;
}

/**
 * Execute a heal deathrattle effect
 */
function executeHealDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  const healAmount = deathrattle.value || 1;
  const targets = deathrattle.targetType;
  
  // Determine the targets based on the deathrattle target type
  if (targets === 'all_friendly') {
    const currentPlayer = newState.players[playerId];
    
    // Heal all friendly minions
    currentPlayer.battlefield.forEach(minion => {
      const currentHealth = minion.currentHealth ?? (minion.card.type === 'minion' ? minion.card.health : 0) ?? 0;
      const maxHealth = minion.card.type === 'minion' ? (minion.card.health ?? 0) : 0;
      minion.currentHealth = Math.min(currentHealth + healAmount, maxHealth);
    });
    
    // Heal friendly hero
    currentPlayer.heroHealth = Math.min((currentPlayer.heroHealth ?? currentPlayer.health) + healAmount, currentPlayer.maxHealth);
  } else if (targets === 'all') {
    // Heal all minions and heroes
    for (const playerKey of ['player', 'opponent'] as const) {
      newState.players[playerKey].battlefield.forEach(minion => {
        const currentHealth = minion.currentHealth ?? (minion.card.type === 'minion' ? minion.card.health : 0) ?? 0;
        const maxHealth = minion.card.type === 'minion' ? (minion.card.health ?? 0) : 0;
        minion.currentHealth = Math.min(currentHealth + healAmount, maxHealth);
      });

      const p = newState.players[playerKey];
      p.heroHealth = Math.min((p.heroHealth ?? p.health) + healAmount, p.maxHealth);
    }
  } else if (targets === 'friendly_hero') {
    // Heal friendly hero only
    const p = newState.players[playerId];
    p.heroHealth = Math.min((p.heroHealth ?? p.health) + healAmount, p.maxHealth);
  }
  
  return newState;
}

/**
 * Execute a buff deathrattle effect
 */
function executeBuffDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Buff values with fallbacks to 0
  const attackBuff = deathrattle.buffAttack || 0;
  const healthBuff = deathrattle.buffHealth || 0;
  
  if (attackBuff === 0 && healthBuff === 0) {
    debug.warn('Deathrattle buff effect has no attack or health changes');
    return state;
  }
  
  const player = newState.players[playerId];
  
  // Apply buff to all friendly minions
  player.battlefield.forEach(minion => {
    if (minion.card.type === 'minion') {
      const minionCard = minion.card as MinionCardData;
      // Increase attack
      if (attackBuff !== 0) {
        minionCard.attack = (minionCard.attack ?? 0) + attackBuff;
      }
      
      // Increase max health and current health
      if (healthBuff !== 0) {
        minionCard.health = (minionCard.health ?? 0) + healthBuff;
        minion.currentHealth = (minion.currentHealth ?? minionCard.health ?? 0) + healthBuff;
      }
    }
  });
  
  return newState;
}

/**
 * Execute a divine shield deathrattle effect
 */
function executeGiveDivineShieldDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  const targetType = deathrattle.targetType || 'friendly_minions';
  
  // Determine the targets based on the target type
  if (targetType === 'friendly_minions') {
    // Give divine shield to all friendly minions
    const currentPlayer = newState.players[playerId];
    
    if (currentPlayer.battlefield) {
      currentPlayer.battlefield.forEach(minion => {
        minion.hasDivineShield = true;
      });
    }
  } else if (targetType === 'all_minions') {
    // Give divine shield to all minions on both sides
    for (const playerKey of ['player', 'opponent'] as const) {
      const playerState = newState.players[playerKey];
      
      if (playerState.battlefield) {
        playerState.battlefield.forEach(minion => {
          minion.hasDivineShield = true;
        });
      }
    }
  } else if (targetType === 'random_friendly_minion') {
    // Give divine shield to a random friendly minion
    const currentPlayer = newState.players[playerId];
    
    if (currentPlayer.battlefield && currentPlayer.battlefield.length > 0) {
      const randomIndex = Math.floor(Math.random() * currentPlayer.battlefield.length);
      const targetMinion = currentPlayer.battlefield[randomIndex];
      
      targetMinion.hasDivineShield = true;
    }
  }
  
  return newState;
}

/**
 * Execute a mind control deathrattle effect
 */
function executeMindControlDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // The opponent of the current player
  const opponentId = playerId === 'player' ? 'opponent' : 'player';
  
  // Get references to both players
  const currentPlayer = newState.players[playerId];
  const opponentPlayer = newState.players[opponentId];
  
  // Default target type is random_enemy_minion if not specified
  const targetType = deathrattle.targetType || 'random_enemy_minion';
  
  if (targetType === 'random_enemy_minion') {
    // Check if opponent has any minions
    if (!opponentPlayer.battlefield || opponentPlayer.battlefield.length === 0) {
      return newState;
    }
    
    // Check if current player has room for a new minion
    if (currentPlayer.battlefield && currentPlayer.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
      return newState;
    }
    
    // Select a random enemy minion
    const randomIndex = Math.floor(Math.random() * opponentPlayer.battlefield.length);
    const targetMinion = opponentPlayer.battlefield[randomIndex];
    
    // Remove the minion from opponent's battlefield
    opponentPlayer.battlefield = opponentPlayer.battlefield.filter(
      (minion) => minion.instanceId !== targetMinion.instanceId
    );
    
    // Add the minion to current player's battlefield
    currentPlayer.battlefield = currentPlayer.battlefield || [];
    currentPlayer.battlefield.push(targetMinion);
    
    // The minion has just been mind-controlled, so it can't attack this turn
    targetMinion.canAttack = false;
    targetMinion.isSummoningSick = true;
    
  }
  
  return newState;
}

/**
 * Check if a card should trigger its deathrattle
 */
// Helper function to safely check for undefined battlefield
function safeBattlefield(battlefield: CardInstance[] | undefined): CardInstance[] {
  return battlefield || [];
}

// Helper function to safely check for undefined health
function safeHealth(health: number | undefined): number {
  return health !== undefined ? health : 100;
}

// Helper function to safely update health with a minimum of 0
function updateHealth(currentHealth: number | undefined, change: number, maxHealth?: number): number {
  const health = currentHealth !== undefined ? currentHealth : 100;
  const result = maxHealth !== undefined ? 
    Math.min(Math.max(health + change, 0), maxHealth) : 
    Math.max(health + change, 0);
  return result;
}

// Helper function to safely check for undefined current health
function safeCurrentHealth(minion: CardInstance): number {
  if (minion.currentHealth !== undefined) {
    return minion.currentHealth;
  }
  if (minion.card.type === 'minion') {
    return (minion.card as MinionCardData).health ?? 1;
  }
  return 1;
}

// Helper function to safely set divine shield
function setDivineShield(minion: CardInstance, value: boolean): void {
  minion.hasDivineShield = value;
}

/**
 * Check if a card should trigger its deathrattle
 * Only returns true if the card has a deathrattle effect defined (not just keyword)
 */
export function shouldTriggerDeathrattle(card: CardInstance): boolean {
  if (card.card.type !== 'minion') {
    return false;
  }
  
  const minionCard = card.card as MinionCardData;
  const hasDeathrattleEffect = minionCard.deathrattle !== undefined;
  
  // Only trigger if effect exists - keyword-only cards are data errors
  if (!hasDeathrattleEffect) {
    const hasDeathrattleKeyword = minionCard.keywords?.includes('deathrattle') === true;
    if (hasDeathrattleKeyword) {
      debug.warn(`[Deathrattle] Card ${card.card.name} has deathrattle keyword but no effect defined - data error`);
    }
  }
  
  return hasDeathrattleEffect;
}

/**
 * Process any pending deathrattles in the game state
 * This should be called at the end of combat resolution phases
 * Returns the updated state with pending deathrattles cleared
 */
export function processPendingDeathrattles(state: GameState): GameState {
  const pendingDeathrattles = (state as any).pendingDeathrattles as Array<{
    minion: CardInstance;
    playerId: 'player' | 'opponent';
    source: string;
  }> | undefined;
  
  if (!pendingDeathrattles || pendingDeathrattles.length === 0) {
    return state;
  }
  
  debug.log(`[Deathrattle] Processing ${pendingDeathrattles.length} pending deathrattles`);
  
  let currentState = state;
  const MAX_ITERATIONS = 30; // Safety limit
  let iterations = 0;
  
  // Process pending deathrattles - each may create new ones
  while ((currentState as any).pendingDeathrattles?.length > 0 && iterations < MAX_ITERATIONS) {
    const queue = [...(currentState as any).pendingDeathrattles];
    (currentState as any).pendingDeathrattles = [];
    
    for (const { minion, playerId } of queue) {
      debug.log(`[Deathrattle] Processing pending: ${minion.card.name} for ${playerId}`);
      currentState = executeDeathrattle(currentState, minion, playerId);
    }
    
    iterations++;
  }
  
  if (iterations >= MAX_ITERATIONS) {
    debug.warn('[Deathrattle] Maximum iterations reached while processing pending deathrattles');
  }
  
  // Clear any remaining pending deathrattles
  delete (currentState as any).pendingDeathrattles;
  
  return currentState;
}

function executeRecruitDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];
  const maxCost = (deathrattle as any).maxCost;
  const recruitRace = (deathrattle as any).recruitRace;

  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;

  const minionIndices: number[] = [];
  player.deck.forEach((cardData: any, i: number) => {
    const card = cardData.card ? cardData.card : cardData;
    if (card.type !== 'minion') return;
    if (maxCost !== undefined && (card.manaCost || 0) > maxCost) return;
    if (recruitRace && (card.race || '').toLowerCase() !== recruitRace.toLowerCase()) return;
    minionIndices.push(i);
  });

  if (minionIndices.length === 0) return newState;

  const randomIdx = minionIndices[Math.floor(Math.random() * minionIndices.length)];
  const recruitedCardData = player.deck.splice(randomIdx, 1)[0] as any;
  const cardData = recruitedCardData.card || recruitedCardData;
  const instance = createCardInstance(cardData);
  instance.isSummoningSick = true;
  instance.canAttack = false;
  instance.attacksPerformed = 0;
  player.battlefield.push(instance);
  trackQuestProgress(playerId, 'summon_minion', instance.card);

  return newState;
}

function executeSummonSplittingDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];

  if (!deathrattle.summonCardId) return newState;

  const cardData = getCardById(deathrattle.summonCardId as number);
  if (!cardData) return newState;

  for (let i = 0; i < 2; i++) {
    if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
    const instance = createCardInstance(cardData);
    player.battlefield.push(instance);
    trackQuestProgress(playerId, 'summon_minion', instance.card);
  }

  return newState;
}

function executeSummonMultipleDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];

  const summonCardIds: string[] = (deathrattle as any).summonCardIds || [];

  if (summonCardIds.length > 0) {
    for (const cardId of summonCardIds) {
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
      const cardData = getCardById(typeof cardId === 'string' ? parseInt(cardId, 10) : cardId);
      if (!cardData) continue;
      const instance = createCardInstance(cardData);
      player.battlefield.push(instance);
      trackQuestProgress(playerId, 'summon_minion', instance.card);
    }
  } else if (deathrattle.summonCardId) {
    const cardData = getCardById(deathrattle.summonCardId as number);
    if (!cardData) return newState;
    const count = deathrattle.value || 1;
    for (let i = 0; i < count; i++) {
      if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
      const instance = createCardInstance(cardData);
      player.battlefield.push(instance);
      trackQuestProgress(playerId, 'summon_minion', instance.card);
    }
  }

  return newState;
}

function executeSummonIfOtherDiedDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];

  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
  if (!deathrattle.summonCardId) return newState;

  const graveyard = player.graveyard || [];
  const hasDeadMinion = graveyard.some(c => c.card.type === 'minion');
  if (!hasDeadMinion) return newState;

  const cardData = getCardById(deathrattle.summonCardId as number);
  if (!cardData) return newState;

  const instance = createCardInstance(cardData);
  player.battlefield.push(instance);
  trackQuestProgress(playerId, 'summon_minion', instance.card);

  return newState;
}

function executeSummonForOpponentDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const opponentId = playerId === 'player' ? 'opponent' : 'player';
  const opponent = newState.players[opponentId];

  if (opponent.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;
  if (!deathrattle.summonCardId) return newState;

  const cardData = getCardById(deathrattle.summonCardId as number);
  if (!cardData) return newState;

  const count = deathrattle.value || 1;
  for (let i = 0; i < count; i++) {
    if (opponent.battlefield.length >= MAX_BATTLEFIELD_SIZE) break;
    const instance = createCardInstance(cardData);
    opponent.battlefield.push(instance);
  }

  return newState;
}

function executeAddRandomToHandDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];
  const count = deathrattle.value || 1;

  for (let i = 0; i < count; i++) {
    if (player.hand.length >= MAX_HAND_SIZE) break;
    if (allCards.length === 0) break;
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    const instance = createCardInstance(randomCard);
    player.hand.push(instance);
  }

  return newState;
}

function executeSummonRandomMythicDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];

  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;

  const mythics = allCards.filter(c => c.type === 'minion' && c.rarity === 'mythic');
  if (mythics.length === 0) return newState;

  const randomCard = mythics[Math.floor(Math.random() * mythics.length)];
  const instance = createCardInstance(randomCard);
  player.battlefield.push(instance);
  trackQuestProgress(playerId, 'summon_minion', instance.card);

  return newState;
}

function executeSummonFromHandDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];

  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return newState;

  const minionIndices: number[] = [];
  player.hand.forEach((card, i) => {
    if (card.card.type === 'minion') minionIndices.push(i);
  });

  if (minionIndices.length === 0) return newState;

  const randomIdx = minionIndices[Math.floor(Math.random() * minionIndices.length)];
  const minion = player.hand.splice(randomIdx, 1)[0];
  player.battlefield.push(minion);
  trackQuestProgress(playerId, 'summon_minion', minion.card);

  return newState;
}

function executeShuffleCopiesBuffedDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];
  const buffAmount = deathrattle.value || 1;
  const copyCount = deathrattle.value || 1;

  if (!deathrattle.summonCardId) return newState;

  const cardData = getCardById(deathrattle.summonCardId as number);
  if (!cardData) return newState;

  for (let i = 0; i < copyCount; i++) {
    const copy = JSON.parse(JSON.stringify(cardData)) as CardData;
    if (copy.type === 'minion') {
      const minionCopy = copy as MinionCardData;
      minionCopy.attack = (minionCopy.attack ?? 0) + buffAmount;
      minionCopy.health = (minionCopy.health ?? 0) + buffAmount;
    }
    const insertIdx = Math.floor(Math.random() * (player.deck.length + 1));
    player.deck.splice(insertIdx, 0, copy);
  }

  return newState;
}

function executeRandomDamageDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  const enemyId = playerId === 'player' ? 'opponent' : 'player';
  const enemy = newState.players[enemyId];
  const totalDamage = deathrattle.value || 1;

  for (let i = 0; i < totalDamage; i++) {
    const targets: Array<{ type: 'minion'; index: number } | { type: 'hero' }> = [];
    enemy.battlefield.forEach((m, idx) => {
      const currentHp = m.currentHealth ?? ((m.card as any).health || 1);
      if (currentHp > 0) {
        targets.push({ type: 'minion', index: idx });
      }
    });
    targets.push({ type: 'hero' });

    if (targets.length === 0) break;

    const target = targets[Math.floor(Math.random() * targets.length)];
    if (target.type === 'hero') {
      newState = dealDamage(newState, enemyId, 'hero', 1, undefined, undefined, playerId);
    } else {
      const minion = enemy.battlefield[target.index];
      if (minion.hasDivineShield) {
        minion.hasDivineShield = false;
      } else {
        const currentHp = minion.currentHealth ?? ((minion.card as any).health || 1);
        minion.currentHealth = currentHp - 1;
      }
    }
  }

  // Use removeDeadMinions to properly handle graveyard and deathrattles
  return removeDeadMinions(newState);
}

function executeGrantKeywordDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];
  const keyword = (deathrattle as any).keyword as string;

  if (!keyword) return newState;

  player.battlefield.forEach(minion => {
    if (minion.card.type === 'minion') {
      addKeyword(minion, keyword);
    }
  });

  return newState;
}

function executeGiveSparePartDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];
  const count = deathrattle.value || 1;

  for (let i = 0; i < count; i++) {
    if (player.hand.length >= MAX_HAND_SIZE) break;
    if (allCards.length === 0) break;
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    const instance = createCardInstance(randomCard);
    player.hand.push(instance);
  }

  return newState;
}

function executeFreezeRandomDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const enemyId = playerId === 'player' ? 'opponent' : 'player';
  const enemy = newState.players[enemyId];

  if (enemy.battlefield.length === 0) return newState;

  const randomIdx = Math.floor(Math.random() * enemy.battlefield.length);
  (enemy.battlefield[randomIdx] as any).isFrozen = true;

  return newState;
}

function executeEquipWeaponDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];

  const attack = deathrattle.value || 1;
  const durability = (deathrattle as any).durability || 2;
  (player as any).weapon = { attack, durability };

  return newState;
}

function executeConditionalAoeDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const enemyId = playerId === 'player' ? 'opponent' : 'player';
  const enemy = newState.players[enemyId];
  const damageAmount = deathrattle.value || 1;

  enemy.battlefield.forEach(minion => {
    if (minion.hasDivineShield) {
      minion.hasDivineShield = false;
    } else {
      const currentHp = minion.currentHealth ?? ((minion.card as any).health || 1);
      minion.currentHealth = currentHp - damageAmount;
    }
  });

  // Use removeDeadMinions to properly handle graveyard and deathrattles
  return removeDeadMinions(newState);
}

function executeBuffFriendlyBeastsDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];
  const attackBuff = deathrattle.buffAttack || deathrattle.value || 1;
  const healthBuff = deathrattle.buffHealth || deathrattle.value || 1;

  player.battlefield.forEach(minion => {
    if (minion.card.type === 'minion' && isCardOfTribe(minion.card, 'beast')) {
      const minionCard = minion.card as MinionCardData;
      minionCard.attack = (minionCard.attack ?? 0) + attackBuff;
      minionCard.health = (minionCard.health ?? 0) + healthBuff;
      minion.currentHealth = (minion.currentHealth ?? minionCard.health ?? 0) + healthBuff;
    }
  });

  return newState;
}

function executeBuffAndEnchantDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerId];
  const attackBuff = deathrattle.buffAttack || 0;
  const healthBuff = deathrattle.buffHealth || 0;

  player.battlefield.forEach(minion => {
    if (minion.card.type === 'minion') {
      const minionCard = minion.card as MinionCardData;
      if (attackBuff !== 0) {
        minionCard.attack = (minionCard.attack ?? 0) + attackBuff;
      }
      if (healthBuff !== 0) {
        minionCard.health = (minionCard.health ?? 0) + healthBuff;
        minion.currentHealth = (minion.currentHealth ?? minionCard.health ?? 0) + healthBuff;
      }
    }
  });

  return newState;
}

function executeDestroyDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const enemyId = playerId === 'player' ? 'opponent' : 'player';
  const enemy = newState.players[enemyId];

  if (enemy.battlefield.length === 0) return newState;

  const randomIdx = Math.floor(Math.random() * enemy.battlefield.length);
  const toDestroy = enemy.battlefield[randomIdx];

  // Use destroyCard to properly handle graveyard and deathrattle triggers
  return destroyCard(newState, toDestroy.instanceId, enemyId);
}

function executeUncoilDeathrattle(
  state: GameState,
  card: CardInstance,
  playerId: 'player' | 'opponent'
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const coilSourceId = card.instanceId;

  for (const side of ['player', 'opponent'] as const) {
    const bf = newState.players[side].battlefield;
    for (const minion of bf) {
      if (minion.coiledBy === coilSourceId) {
        minion.currentAttack = minion.originalAttackBeforeCoil ?? (minion.card as MinionCardData).attack ?? 0;
        minion.coiledBy = undefined;
        minion.originalAttackBeforeCoil = undefined;
        minion.canAttack = true;
      }
    }
  }

  return newState;
}

function executeAddToHandDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  card: CardInstance,
  playerId: 'player' | 'opponent'
): GameState {
  const player = state.players[playerId];
  if (player.hand.length >= MAX_HAND_SIZE) return state;

  const cardId = (deathrattle as any).cardId;
  let cardData: CardData | undefined;
  if (cardId) {
    cardData = getCardById(cardId);
  }
  if (!cardData) {
    cardData = card.card;
  }

  const copy = createCardInstance(cardData);
  player.hand.push(copy);
  debug.log(`[Deathrattle] add_to_hand: Added ${cardData.name} to ${playerId}'s hand`);
  return state;
}

function executeShuffleCardDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  card: CardInstance,
  playerId: 'player' | 'opponent'
): GameState {
  const cardId = (deathrattle as any).cardId;
  let cardData: CardData | undefined;
  if (cardId) {
    cardData = getCardById(cardId);
  }
  if (!cardData) {
    cardData = card.card;
  }

  const player = state.players[playerId];
  const cardCopy = { ...cardData };
  const insertIdx = Math.floor(Math.random() * (player.deck.length + 1));
  player.deck.splice(insertIdx, 0, cardCopy);
  debug.log(`[Deathrattle] shuffle_card: Shuffled ${cardData.name} into ${playerId}'s deck`);
  return state;
}

function executeSummonRandomDeathrattle(
  state: GameState,
  deathrattle: DeathrattleEffect,
  playerId: 'player' | 'opponent'
): GameState {
  const player = state.players[playerId];
  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return state;

  const costFilter = (deathrattle as any).specificManaCost ?? (deathrattle as any).costFilter;
  const candidates = allCards.filter(c =>
    c.type === 'minion' &&
    c.collectible !== false &&
    (costFilter === undefined || c.manaCost === costFilter)
  );

  if (candidates.length === 0) return state;

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const inst = createCardInstance(picked);
  inst.isSummoningSick = true;
  inst.canAttack = false;
  player.battlefield.push(inst);
  trackQuestProgress(playerId, 'summon_minion', inst.card);
  debug.log(`[Deathrattle] summon_random: Summoned ${picked.name} for ${playerId}`);
  return state;
}