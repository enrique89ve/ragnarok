/**
 * Turn Effects Utilities
 * 
 * This file contains utility functions for handling turn-based effects like
 * start-of-turn and end-of-turn effects.
 */

import { GameState, CardInstance, CardData, MinionCardData, GameLogEvent } from '../../types';
import { drawCard } from '../drawUtils';
import { v4 as uuidv4 } from 'uuid';
import { processTurnStartEffects as processStatusTurnStart, clearEndOfTurnEffects } from './statusEffectUtils';
import { isMinion, getAttack, getHealth } from '../cards/typeGuards';
import { debug } from '../../config/debugConfig';
import { executeDeathrattle } from '../deathrattleUtils';
import { removeDeadMinions } from '../zoneUtils';
import { getCardById } from '../../data/allCards';

// Helper to create type-safe game log entries for effects
function createEffectLogEntry(
  text: string,
  player: 'player' | 'opponent',
  turnNumber: number,
  cardId?: number | string
): GameLogEvent {
  return {
    id: uuidv4(),
    type: 'card_played', // Use 'card_played' as closest valid type for effects
    player,
    text,
    timestamp: Date.now(),
    turn: turnNumber,
    cardId: cardId !== undefined ? String(cardId) : undefined
  };
}

/**
 * Process start of turn effects for a player
 * @param state Current game state
 * @returns Updated game state after applying start of turn effects
 */
export function processStartOfTurnEffects(state: GameState): GameState {
  let newState = { ...state };
  const currentPlayer: 'player' | 'opponent' = state.currentTurn || 'player';
  
  // Process minion start-of-turn effects for the current player
  const battlefield = newState.players[currentPlayer]?.battlefield || [];
  
  for (const minion of battlefield) {
    const currentBattlefield = newState.players[currentPlayer]?.battlefield || [];
    const stillOnBoard = currentBattlefield.some((m: CardInstance) => m.instanceId === minion.instanceId);
    if (!stillOnBoard) {
      continue;
    }

    switch (minion.card.id) {
      case 20607:
        newState = processFishingMasterEffect(newState, minion, currentPlayer);
        break;
      
      case 5103:
        newState = processClockworkAutomatonEffect(newState, minion, currentPlayer);
        break;
      
      default:
        if (minion.card.type === 'minion') {
          const minionCard = minion.card as MinionCardData;
          if (minionCard.startOfTurn) {
            newState = processGenericStartOfTurnEffect(newState, minion, currentPlayer, minionCard.startOfTurn);
          }
        }
    }
  }
  
  const currentBattlefieldAfterEffects = newState.players[currentPlayer]?.battlefield || [];
  for (let i = 0; i < currentBattlefieldAfterEffects.length; i++) {
    const m = newState.players[currentPlayer].battlefield[i];
    if (!m) continue;
    const { damage } = processStatusTurnStart(m as any);
    
    if (damage > 0) {
      const cardHealth = getHealth(m.card);
      const currentHealth = m.currentHealth ?? cardHealth ?? 0;
      const newHealth = currentHealth - damage;
      
      newState.players[currentPlayer].battlefield[i] = {
        ...m,
        currentHealth: newHealth
      };
    }
  }
  
  return newState;
}

function processGenericStartOfTurnEffect(
  state: GameState,
  minion: CardInstance,
  currentPlayer: 'player' | 'opponent',
  effect: { type: string; [key: string]: any }
): GameState {
  const opponentPlayer: 'player' | 'opponent' = currentPlayer === 'player' ? 'opponent' : 'player';
  let newState = { ...state };

  switch (effect.type) {
    case 'destroy_all_minions': {
      const playerBattlefield = [...(newState.players[currentPlayer]?.battlefield || [])];
      const opponentBattlefield = [...(newState.players[opponentPlayer]?.battlefield || [])];
      const totalDestroyed = playerBattlefield.length + opponentBattlefield.length;

      if (totalDestroyed === 0) {
        return newState;
      }

      debug.log(`[StartOfTurn] ${minion.card.name} triggers: destroying ALL ${totalDestroyed} minions`);

      const destroyedNames = [
        ...playerBattlefield.map((m: CardInstance) => m.card.name),
        ...opponentBattlefield.map((m: CardInstance) => m.card.name)
      ];

      newState = {
        ...newState,
        players: {
          ...newState.players,
          [currentPlayer]: {
            ...newState.players[currentPlayer],
            battlefield: []
          },
          [opponentPlayer]: {
            ...newState.players[opponentPlayer],
            battlefield: []
          }
        },
        gameLog: [
          ...(newState.gameLog || []),
          createEffectLogEntry(
            `${minion.card.name} destroyed ALL minions! (${destroyedNames.join(', ')})`,
            currentPlayer,
            newState.turnNumber || 1,
            minion.card.id
          )
        ]
      };

      for (const destroyed of playerBattlefield) {
        newState = executeDeathrattle(newState, destroyed, currentPlayer);
      }
      for (const destroyed of opponentBattlefield) {
        newState = executeDeathrattle(newState, destroyed, opponentPlayer);
      }
      break;
    }

    case 'heal_all': {
      const healValue = typeof effect.value === 'number' ? effect.value : 1;
      const friendlyMinions = newState.players[currentPlayer]?.battlefield || [];
      const healedBattlefield = friendlyMinions.map((m: CardInstance) => {
        const maxHealth = getHealth(m.card) ?? 0;
        const currentHp = m.currentHealth ?? maxHealth;
        const newHp = Math.min(currentHp + healValue, maxHealth);
        return { ...m, currentHealth: newHp };
      });

      newState = {
        ...newState,
        players: {
          ...newState.players,
          [currentPlayer]: {
            ...newState.players[currentPlayer],
            battlefield: healedBattlefield
          }
        },
        gameLog: [
          ...(newState.gameLog || []),
          createEffectLogEntry(
            `${minion.card.name} healed all friendly minions for ${healValue}.`,
            currentPlayer,
            newState.turnNumber || 1,
            minion.card.id
          )
        ]
      };
      break;
    }

    case 'buff_self': {
      const buffAttack = typeof effect.buffAttack === 'number' ? effect.buffAttack : (typeof effect.attackBuff === 'number' ? effect.attackBuff : 0);
      const buffHealth = typeof effect.buffHealth === 'number' ? effect.buffHealth : (typeof effect.healthBuff === 'number' ? effect.healthBuff : 0);
      const battlefield = newState.players[currentPlayer]?.battlefield || [];
      const updatedBattlefield = battlefield.map((m: CardInstance) => {
        if (m.instanceId === minion.instanceId) {
          const curAtk = m.currentAttack ?? (getAttack(m.card) ?? 0);
          const curHp = m.currentHealth ?? (getHealth(m.card) ?? 0);
          return {
            ...m,
            currentAttack: curAtk + buffAttack,
            currentHealth: curHp + buffHealth
          };
        }
        return m;
      });

      newState = {
        ...newState,
        players: {
          ...newState.players,
          [currentPlayer]: {
            ...newState.players[currentPlayer],
            battlefield: updatedBattlefield
          }
        },
        gameLog: [
          ...(newState.gameLog || []),
          createEffectLogEntry(
            `${minion.card.name} buffed itself +${buffAttack}/+${buffHealth}.`,
            currentPlayer,
            newState.turnNumber || 1,
            minion.card.id
          )
        ]
      };
      break;
    }

    case 'buff': {
      const friendlyMinions = newState.players[currentPlayer]?.battlefield || [];
      const otherMinions = friendlyMinions.filter((m: CardInstance) => m.instanceId !== minion.instanceId);
      if (otherMinions.length === 0) {
        debug.log(`[StartOfTurn] ${minion.card.name}: no friendly minions to buff`);
        break;
      }
      const target = otherMinions[Math.floor(Math.random() * otherMinions.length)];
      const bAttack = typeof effect.buffAttack === 'number' ? effect.buffAttack : (typeof effect.attackBuff === 'number' ? effect.attackBuff : 1);
      const bHealth = typeof effect.buffHealth === 'number' ? effect.buffHealth : (typeof effect.healthBuff === 'number' ? effect.healthBuff : 1);

      const buffedBattlefield = friendlyMinions.map((m: CardInstance) => {
        if (m.instanceId === target.instanceId) {
          const curAtk = m.currentAttack ?? (getAttack(m.card) ?? 0);
          const curHp = m.currentHealth ?? (getHealth(m.card) ?? 0);
          return {
            ...m,
            currentAttack: curAtk + bAttack,
            currentHealth: curHp + bHealth
          };
        }
        return m;
      });

      newState = {
        ...newState,
        players: {
          ...newState.players,
          [currentPlayer]: {
            ...newState.players[currentPlayer],
            battlefield: buffedBattlefield
          }
        },
        gameLog: [
          ...(newState.gameLog || []),
          createEffectLogEntry(
            `${minion.card.name} buffed ${target.card.name} +${bAttack}/+${bHealth}.`,
            currentPlayer,
            newState.turnNumber || 1,
            minion.card.id
          )
        ]
      };
      break;
    }

    case 'compound': {
      const effects = effect.effects || [];
      for (const subEffect of effects) {
        newState = processGenericStartOfTurnEffect(newState, minion, currentPlayer, subEffect);
      }
      break;
    }

    case 'transform_random_enemy': {
      const enemyMinions = newState.players[opponentPlayer]?.battlefield || [];
      if (enemyMinions.length === 0) {
        debug.log(`[StartOfTurn] ${minion.card.name}: no enemy minions to transform`);
        break;
      }
      const targetIdx = Math.floor(Math.random() * enemyMinions.length);
      const targetMinion = enemyMinions[targetIdx];
      const updatedEnemyBattlefield = enemyMinions.filter((_: CardInstance, i: number) => i !== targetIdx);

      newState = {
        ...newState,
        players: {
          ...newState.players,
          [opponentPlayer]: {
            ...newState.players[opponentPlayer],
            battlefield: updatedEnemyBattlefield
          }
        },
        gameLog: [
          ...(newState.gameLog || []),
          createEffectLogEntry(
            `${minion.card.name} transformed ${targetMinion.card.name}!`,
            currentPlayer,
            newState.turnNumber || 1,
            minion.card.id
          )
        ]
      };
      break;
    }

    case 'reduce_cost': {
      const reduceValue = typeof effect.value === 'number' ? effect.value : 1;
      const hand = newState.players[currentPlayer]?.hand || [];
      const updatedHand = hand.map((c: CardInstance) => {
        const currentCost = c.card.manaCost ?? 0;
        const newCost = Math.max(0, currentCost - reduceValue);
        return {
          ...c,
          card: { ...c.card, manaCost: newCost }
        };
      });

      newState = {
        ...newState,
        players: {
          ...newState.players,
          [currentPlayer]: {
            ...newState.players[currentPlayer],
            hand: updatedHand
          }
        },
        gameLog: [
          ...(newState.gameLog || []),
          createEffectLogEntry(
            `${minion.card.name} reduced cost of cards in hand by ${reduceValue}.`,
            currentPlayer,
            newState.turnNumber || 1,
            minion.card.id
          )
        ]
      };
      break;
    }

    case 'summon_token': {
      const tokenId = effect.summonCardId ?? effect.tokenId;
      const count = typeof effect.value === 'number' ? effect.value : 1;
      if (!tokenId) {
        debug.log(`[StartOfTurn] ${minion.card.name}: summon_token missing summonCardId/tokenId`);
        break;
      }
      const tokenCard = getCardById(tokenId);
      if (!tokenCard) {
        debug.log(`[StartOfTurn] ${minion.card.name}: token card ${tokenId} not found`);
        break;
      }
      const playerState = newState.players[currentPlayer];
      const MAX_BATTLEFIELD = 7;
      for (let i = 0; i < count; i++) {
        if (playerState.battlefield.length >= MAX_BATTLEFIELD) break;
        const tokenInstance: CardInstance = {
          instanceId: uuidv4(),
          card: tokenCard as CardData,
          currentHealth: getHealth(tokenCard as CardData),
          canAttack: false,
          isPlayed: true,
          isSummoningSick: true,
          attacksPerformed: 0,
        };
        playerState.battlefield.push(tokenInstance);
      }
      newState = {
        ...newState,
        gameLog: [
          ...(newState.gameLog || []),
          createEffectLogEntry(
            `${minion.card.name} summoned ${count} ${tokenCard.name}!`,
            currentPlayer,
            newState.turnNumber || 1,
            minion.card.id
          ),
        ],
      };
      debug.log(`[StartOfTurn] ${minion.card.name}: summoned ${count}x ${tokenCard.name}`);
      break;
    }

    default:
      debug.log(`[StartOfTurn] Unknown startOfTurn effect type: ${effect.type} on ${minion.card.name}`);
  }

  return newState;
}

/**
 * Process Fishing Master's effect (50% chance to draw a card at start of turn)
 * @param state Current game state
 * @param minion Fishing Master card instance
 * @param currentPlayer The current player
 * @returns Updated game state
 */
function processFishingMasterEffect(
  state: GameState, 
  minion: CardInstance,
  currentPlayer: 'player' | 'opponent'
): GameState {
  // 50% chance to draw an extra card
  const shouldDraw = Math.random() >= 0.5;
  
  if (shouldDraw) {
    // Add a game log entry
    const newState = {
      ...state,
      gameLog: [
        ...(state.gameLog || []),
        createEffectLogEntry(
          `Fishing Master caught an extra card for ${currentPlayer === 'player' ? 'you' : 'opponent'}!`,
          currentPlayer,
          state.turnNumber || 1,
          minion.card.id
        )
      ]
    };
    
    // Draw the card - use the core drawCard function without a second parameter
    return drawCard(newState);
  } else {
    // Add a game log entry for the failed draw
    return {
      ...state,
      gameLog: [
        ...(state.gameLog || []),
        createEffectLogEntry(
          `Fishing Master didn't catch anything this turn.`,
          currentPlayer,
          state.turnNumber || 1,
          minion.card.id
        )
      ]
    };
  }
}

/**
 * Process Clockwork Automaton effect (swap with random minion in hand at start of turn)
 * @param state Current game state
 * @param minion Automaton card instance
 * @param currentPlayer The current player
 * @returns Updated game state
 */
function processClockworkAutomatonEffect(
  state: GameState, 
  minion: CardInstance, 
  currentPlayer: 'player' | 'opponent'
): GameState {
  const hand = state.players[currentPlayer]?.hand || [];
  const battlefield = state.players[currentPlayer]?.battlefield || [];
  
  // Find minions in hand (cards with attack and health properties, type 'minion')
  const minionsInHand = hand.filter((card: CardInstance) => 
    isMinion(card.card) && 
    getAttack(card.card) > 0 && 
    getHealth(card.card) > 0
  );
  
  if (minionsInHand.length === 0) {
    debug.log('[Clockwork Automaton] No minions in hand to swap with');
    return {
      ...state,
      gameLog: [
        ...(state.gameLog || []),
        createEffectLogEntry(
          `Clockwork Automaton tried to swap but found no minions in hand.`,
          currentPlayer,
          state.turnNumber || 1,
          minion.card.id
        )
      ]
    };
  }
  
  // Pick a random minion from hand
  const randomIndex = Math.floor(Math.random() * minionsInHand.length);
  const handMinion = minionsInHand[randomIndex];
  
  // Find the indices
  const automatonIndex = battlefield.findIndex((m: CardInstance) => m.instanceId === minion.instanceId);
  const handMinionIndex = hand.findIndex((c: CardInstance) => c.instanceId === handMinion.instanceId);
  
  if (automatonIndex === -1 || handMinionIndex === -1) {
    debug.log('[Clockwork Automaton] Could not find cards to swap');
    return state;
  }
  
  // Create new arrays for the swap
  const newBattlefield = [...battlefield];
  const newHand = [...hand];
  
  // Swap: Put automaton in hand, put hand minion on battlefield
  const automatonFromField = newBattlefield[automatonIndex];
  const minionFromHand = newHand[handMinionIndex];
  
  // The automaton goes to hand (reset its played state)
  const automatonToHand: CardInstance = {
    ...automatonFromField,
    isPlayed: false,
    canAttack: false,
    isSummoningSick: true,
    attacksPerformed: 0
  };
  
  // Get the health from the minion card (type guard for MinionCardData)
  const minionCard = minionFromHand.card;
  const minionHealth = isMinion(minionCard) ? getHealth(minionCard) : undefined;
  
  // The hand minion goes to battlefield (mark as summoning sick)
  const minionToBattlefield: CardInstance = {
    ...minionFromHand,
    isPlayed: true,
    canAttack: false,
    isSummoningSick: true,
    attacksPerformed: 0,
    currentHealth: minionHealth
  };
  
  // Perform the swap
  newBattlefield[automatonIndex] = minionToBattlefield;
  newHand[handMinionIndex] = automatonToHand;
  
  debug.log(`[Clockwork Automaton] Swapped with ${handMinion.card.name} from hand`);
  
  return {
    ...state,
    players: {
      ...state.players,
      [currentPlayer]: {
        ...state.players[currentPlayer],
        battlefield: newBattlefield,
        hand: newHand
      }
    },
    gameLog: [
      ...(state.gameLog || []),
      createEffectLogEntry(
        `Clockwork Automaton swapped places with ${handMinion.card.name}!`,
        currentPlayer,
        state.turnNumber || 1,
        minion.card.id
      )
    ]
  };
}

/**
 * Process end of turn effects for a player
 * @param state Current game state
 * @returns Updated game state after applying end of turn effects
 */
export function processEndOfTurnEffects(state: GameState): GameState {
  let newState = { ...state };
  const currentPlayer: 'player' | 'opponent' = state.currentTurn || 'player';
  const opponentPlayer: 'player' | 'opponent' = currentPlayer === 'player' ? 'opponent' : 'player';
  
  // Process minion end-of-turn effects for the current player
  const battlefield = newState.players[currentPlayer]?.battlefield || [];
  
  for (const minion of battlefield) {
    // Handle specific card effects by ID
    switch (minion.card.id) {
      // Jormungandr's Coil - Deal 1 damage to all enemy minions
      case 20621:
        newState = processJormungandrCoilEffect(newState, minion, opponentPlayer);
        break;
      
      default:
        // Process generic end-of-turn effects (only for minion cards)
        if (minion.card.type === 'minion') {
          const minionCard = minion.card as MinionCardData;
          if (minionCard.endOfTurn) {
            newState = processCustomEndOfTurnEffect(newState, minion, opponentPlayer);
          }
        }
    }
  }
  
  // Clear temporary status effects using centralized utility
  for (let i = 0; i < newState.players[currentPlayer].battlefield.length; i++) {
    const minion = newState.players[currentPlayer].battlefield[i];
    newState.players[currentPlayer].battlefield[i] = clearEndOfTurnEffects(minion as any) as CardInstance;
  }
  
  return newState;
}

/**
 * Process Jormungandr's Coil effect (deal 1 damage to all enemy minions at end of turn)
 * @param state Current game state
 * @param minion Jormungandr's Coil card instance
 * @param opponentPlayer The opponent player id
 * @returns Updated game state
 */
function processJormungandrCoilEffect(
  state: GameState, 
  minion: CardInstance, 
  opponentPlayer: 'player' | 'opponent'
): GameState {
  const currentPlayer: 'player' | 'opponent' = opponentPlayer === 'player' ? 'opponent' : 'player';
  let newState = { ...state };
  const enemyMinions = newState.players[opponentPlayer]?.battlefield || [];
  
  if (enemyMinions.length === 0) {
    // Add a game log entry for the effect even if there are no targets
    return {
      ...newState,
      gameLog: [
        ...(newState.gameLog || []),
        createEffectLogEntry(
          `Jormungandr's Coil tried to deal damage, but found no enemy minions.`,
          currentPlayer,
          newState.turnNumber || 1,
          minion.card.id
        )
      ]
    };
  }
  
  // Apply 1 damage to all enemy minions
  const updatedEnemyMinions = enemyMinions.map((enemyMinion: CardInstance) => {
    // Safely get the current health with default values (type guard for MinionCardData)
    const cardHealth = getHealth(enemyMinion.card);
    const currentCardHealth = cardHealth ?? 0;
    const currentHealth = typeof enemyMinion.currentHealth !== 'undefined' ? enemyMinion.currentHealth : currentCardHealth;
    const updatedHealth = currentHealth - 1;
    
    return {
      ...enemyMinion,
      currentHealth: updatedHealth
    };
  });
  
  // Update the battlefield with the damaged minions
  newState = {
    ...newState,
    players: {
      ...newState.players,
      [opponentPlayer]: {
        ...newState.players[opponentPlayer],
        battlefield: updatedEnemyMinions
      }
    },
    gameLog: [
      ...(newState.gameLog || []),
      createEffectLogEntry(
        `Jormungandr's Coil dealt 1 damage to all enemy minions.`,
        currentPlayer,
        newState.turnNumber || 1,
        minion.card.id
      )
    ]
  };
  
  // Remove dead minions
  newState = removeDeadMinions(newState);
  
  return newState;
}

/**
 * Process custom end-of-turn effects from the card's endOfTurn property
 * @param state Current game state
 * @param minion Card instance with the end-of-turn effect
 * @param opponentPlayer The opponent player id
 * @returns Updated game state
 */
function processCustomEndOfTurnEffect(
  state: GameState, 
  minion: CardInstance, 
  opponentPlayer: 'player' | 'opponent'
): GameState {
  const currentPlayer: 'player' | 'opponent' = opponentPlayer === 'player' ? 'opponent' : 'player';
  
  // Type guard: this function is only called for minion cards with endOfTurn
  if (minion.card.type !== 'minion') {
    return state;
  }
  const minionCard = minion.card as MinionCardData;
  const effect = minionCard.endOfTurn;
  if (!effect) {
    return state;
  }
  
  let newState = { ...state };
  
  // Handle different effect types
  switch (effect.type) {
    case 'damage':
      // Handle damage effects
      if (effect.targetType === 'enemy_minions') {
        const enemyMinions = newState.players[opponentPlayer]?.battlefield || [];
        
        if (enemyMinions.length === 0) {
          return newState;
        }
        
        // Apply damage to all enemy minions
        const damageValue = typeof effect.value === 'number' ? effect.value : 1;
        const updatedEnemyMinions = enemyMinions.map((enemyMinion: CardInstance) => {
          // Safely get the current health with default values (type guard for MinionCardData)
          const cardHealth = getHealth(enemyMinion.card);
          const currentCardHealth = cardHealth ?? 0;
          const currentHealth = typeof enemyMinion.currentHealth !== 'undefined' ? enemyMinion.currentHealth : currentCardHealth;
          const updatedHealth = currentHealth - damageValue;
          
          return {
            ...enemyMinion,
            currentHealth: updatedHealth
          };
        });
        
        // Update the battlefield with the damaged minions
        newState = {
          ...newState,
          players: {
            ...newState.players,
            [opponentPlayer]: {
              ...newState.players[opponentPlayer],
              battlefield: updatedEnemyMinions
            }
          },
          gameLog: [
            ...(newState.gameLog || []),
            createEffectLogEntry(
              `${minion.card.name} dealt ${damageValue} damage to all enemy minions.`,
              currentPlayer,
              newState.turnNumber || 1,
              minion.card.id
            )
          ]
        };
        
        // Remove dead minions
        newState = removeDeadMinions(newState);
      }
      break;
      
    case 'damage_split_randomly': {
      const damageValue = typeof effect.value === 'number' ? effect.value : 1;
      const allEnemyTargets = [...(newState.players[opponentPlayer]?.battlefield || [])];
      if (allEnemyTargets.length === 0) break;
      
      for (let i = 0; i < damageValue; i++) {
        const currentEnemies = newState.players[opponentPlayer]?.battlefield || [];
        if (currentEnemies.length === 0) break;
        const randomIdx = Math.floor(Math.random() * currentEnemies.length);
        const target = currentEnemies[randomIdx];
        const hp = target.currentHealth ?? (getHealth(target.card) ?? 0);
        newState.players[opponentPlayer].battlefield[randomIdx] = {
          ...target,
          currentHealth: hp - 1
        };
      }
      
      newState = removeDeadMinions(newState);
      
      newState = {
        ...newState,
        gameLog: [
          ...(newState.gameLog || []),
          createEffectLogEntry(
            `${minion.card.name} dealt ${damageValue} damage split randomly among enemies.`,
            currentPlayer,
            newState.turnNumber || 1,
            minion.card.id
          )
        ]
      };
      break;
    }
    
    // Add more effect types as needed
    
    default:
  }
  
  return newState;
}