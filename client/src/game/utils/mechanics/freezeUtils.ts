/**
 * Utility functions for handling Freeze mechanics
 * Freeze prevents a character from attacking for a turn
 */

import { GameState, CardInstance } from '../../types';
import { logDamage } from '../gameLogUtils';
import { v4 as uuidv4 } from 'uuid';
import { debug } from '../../config/debugConfig';

/**
 * Apply freeze effect to a minion or hero
 * @param state Current game state
 * @param targetId ID of the target to freeze
 * @param targetType Type of target ('minion' or 'hero')
 * @returns Updated game state with frozen target
 */
export function applyFreezeEffect(
  state: GameState,
  targetId: string,
  targetType: 'minion' | 'hero'
): GameState {
  // Create a new state to avoid mutations
  let newState = { ...state };
  
  // Handle freezing a minion
  if (targetType === 'minion') {
    // Check the player's battlefield
    const playerIndex = newState.players.player.battlefield.findIndex(
      (card) => card.instanceId === targetId
    );
    
    if (playerIndex !== -1) {
      // Found the minion on player's side
      const target = { ...newState.players.player.battlefield[playerIndex] };
      target.isFrozen = true;
      target.canAttack = false;
      (target as any).frozenLastTurn = false;
      
      // Replace the minion with updated version
      newState.players.player.battlefield = [
        ...newState.players.player.battlefield.slice(0, playerIndex),
        target,
        ...newState.players.player.battlefield.slice(playerIndex + 1)
      ];
      
      return newState;
    }
    
    // Check opponent's battlefield
    const opponentIndex = newState.players.opponent.battlefield.findIndex(
      (card) => card.instanceId === targetId
    );
    
    if (opponentIndex !== -1) {
      // Found the minion on opponent's side
      const target = { ...newState.players.opponent.battlefield[opponentIndex] };
      target.isFrozen = true;
      target.canAttack = false;
      (target as any).frozenLastTurn = false;
      
      // Replace the minion with updated version
      newState.players.opponent.battlefield = [
        ...newState.players.opponent.battlefield.slice(0, opponentIndex),
        target,
        ...newState.players.opponent.battlefield.slice(opponentIndex + 1)
      ];
      
      return newState;
    }
    
    // Target not found
    debug.warn(`Target minion ${targetId} not found for freeze effect`);
    return state;
  }
  
  return newState;
}

/**
 * Apply area of effect (AoE) freeze to multiple targets
 * @param state Current game state
 * @param targets Target type to freeze
 * @returns Updated game state with frozen targets
 */
export function applyAoEFreeze(
  state: GameState, 
  targets: 'all_minions' | 'all_enemy_minions' | 'all_friendly_minions'
): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;
  
  // Freeze appropriate targets based on the target type
  if (targets === 'all_minions') {
    // Freeze all minions on both sides
    newState.players.player.battlefield = newState.players.player.battlefield.map(
      minion => ({
        ...minion,
        isFrozen: true,
        canAttack: false,
        frozenLastTurn: false
      })
    );
    
    newState.players.opponent.battlefield = newState.players.opponent.battlefield.map(
      minion => ({
        ...minion,
        isFrozen: true,
        canAttack: false,
        frozenLastTurn: false
      })
    );
    
  } else if (targets === 'all_enemy_minions') {
    if (currentPlayer === 'player') {
      newState.players.opponent.battlefield = newState.players.opponent.battlefield.map(
        minion => ({
          ...minion,
          isFrozen: true,
          canAttack: false,
          frozenLastTurn: false
        })
      );
    } else {
      newState.players.player.battlefield = newState.players.player.battlefield.map(
        minion => ({
          ...minion,
          isFrozen: true,
          canAttack: false,
          frozenLastTurn: false
        })
      );
    }
  } else if (targets === 'all_friendly_minions') {
    if (currentPlayer === 'player') {
      newState.players.player.battlefield = newState.players.player.battlefield.map(
        minion => ({
          ...minion,
          isFrozen: true,
          canAttack: false,
          frozenLastTurn: false
        })
      );
    } else {
      newState.players.opponent.battlefield = newState.players.opponent.battlefield.map(
        minion => ({
          ...minion,
          isFrozen: true,
          canAttack: false,
          frozenLastTurn: false
        })
      );
    }
  }
  
  return newState;
}

/**
 * Check if a minion can attack based on frozen status
 * @param minion The minion to check
 * @returns True if the minion can attack (not frozen)
 */
export function canAttackWhileFrozen(minion: CardInstance): boolean {
  return !minion.isFrozen;
}

/**
 * Process turn end for frozen minions/heroes
 * Frozen status is cleared at the end of the owner's next turn
 * @param state Current game state
 * @returns Updated game state with frozen status cleared as appropriate
 */
export function processFrozenEffectsAtTurnEnd(state: GameState): GameState {
  let newState = { ...state };
  const currentPlayer = state.currentTurn;

  const processFrozen = (minion: CardInstance): CardInstance => {
    if (!minion.isFrozen) return minion;
    if ((minion as any).frozenLastTurn) {
      return {
        ...minion,
        isFrozen: false,
        frozenLastTurn: undefined
      } as any;
    }
    return {
      ...minion,
      frozenLastTurn: true
    } as any;
  };

  if (currentPlayer === 'player') {
    newState.players.player.battlefield = newState.players.player.battlefield.map(processFrozen);
  } else {
    newState.players.opponent.battlefield = newState.players.opponent.battlefield.map(processFrozen);
  }

  return newState;
}
