/**
 * resetUtils.ts
 * 
 * Utility functions for resetting game state components at the start of a turn
 */

import { GameState } from '../types';
import { debug } from '../config/debugConfig';
import { resetArtifactTurnState } from './artifactUtils';

/**
 * Resets all minions' attack state at the start of a player's turn
 * - Clears summoning sickness for minions that have been on the field
 * - Resets attack counter
 * - Sets canAttack to true for all minions that aren't frozen
 * 
 * IMPORTANT: Uses deep clone to ensure state updates propagate correctly
 */
export function resetMinionsForTurn(state: GameState): GameState {
  const currentPlayer = state.currentTurn;
  // Deep clone to avoid mutation issues
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Get player object based on whose turn it is
  const player = newState.players[currentPlayer];
  
  debug.state(`[resetMinionsForTurn] Resetting ${player.battlefield.length} minions for ${currentPlayer}`);
  
  // Update each minion on the battlefield
  player.battlefield = player.battlefield.map(minion => {
    const wasSummoningSick = minion.isSummoningSick;
    const wasFrozen = minion.isFrozen;
    
    // Create updated minion with turn-start resets
    const updatedMinion = {
      ...minion,
      // Enable attacking for all non-frozen minions
      canAttack: !minion.isFrozen,
      // Reset attacks performed counter for the new turn
      attacksPerformed: 0,
      // minions surviving to turn start are no longer summoning sick
      isSummoningSick: false
    };
    
    // Log state changes for debugging
    if (wasSummoningSick || wasFrozen) {
      debug.state(`[resetMinionsForTurn] ${minion.card.name}: summoningSick ${wasSummoningSick}->false, frozen: ${wasFrozen}, canAttack: ${updatedMinion.canAttack}`);
    }
    
    return updatedMinion;
  });
  
  return newState;
}

/**
 * Applies overload mana penalties from the previous turn
 */
export function applyOverload(state: GameState): GameState {
  const currentPlayer = state.currentTurn;
  const newState = { ...state };
  
  // Get player object
  const player = newState.players[currentPlayer];
  
  // Apply pending overload to current overload
  player.mana.overloaded = player.mana.pendingOverload || 0;
  player.mana.pendingOverload = 0;
  
  // Ensure mana.current reflects the overload penalty
  player.mana.current = Math.max(0, player.mana.max - player.mana.overloaded);
  
  return newState;
}

/**
 * Performs all necessary resets at the start of a turn
 * 
 * IMPORTANT: Uses deep clone to ensure all state updates propagate correctly.
 * This fixes the bug where minions couldn't attack after summoning sickness wore off.
 */
export function performTurnStartResets(state: GameState): GameState {
  // Deep clone to avoid mutation issues
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  debug.state(`[performTurnStartResets] Starting resets for ${newState.currentTurn}'s turn`);
  
  // Apply overload penalties
  newState = applyOverload(newState);
  
  // Reset minion states (clears summoning sickness, enables attacks)
  newState = resetMinionsForTurn(newState);
  
  // Reset card played counter
  newState.players[newState.currentTurn].cardsPlayedThisTurn = 0;
  
  // Reset hero power usage
  newState.players[newState.currentTurn].heroPower.used = false;

  // Reset artifact per-turn state (firstSpell, damagePrevented, heroDamaged)
  resetArtifactTurnState(newState, newState.currentTurn);
  
  debug.state(`[performTurnStartResets] Resets complete. Player minions:`, 
    newState.players[newState.currentTurn].battlefield.map(m => ({
      name: m.card.name,
      canAttack: m.canAttack,
      isSummoningSick: m.isSummoningSick,
      attacksPerformed: m.attacksPerformed
    }))
  );
  
  return newState;
}