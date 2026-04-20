/**
 * SetHealth SpellEffect Handler
 * 
 * Implements the "set_health" spellEffect effect.
 * Example card: Hunter's Mark (sets a minion's health to 1)
 */

import { debug } from '../../../config/debugConfig';
import { GameState, CardInstance, SpellEffect } from '../../../types';

/**
 * Execute a set_health spellEffect effect
 * 
 * @param state Current game state
 * @param effect The effect to execute
 * @param sourceCard The card that triggered the effect
 * @param targetId Optional target ID if the effect requires a target
 * @returns Updated game state
 */
export default function executeSetHealthSetHealth(
  state: GameState,
  effect: SpellEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  if (!targetId) {
    debug.error('Set health effect requires a target ID');
    return state;
  }

  if (effect.value === undefined) {
    debug.error('Set health effect missing value parameter');
    return state;
  }

  let newState = { ...state };
  
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
      
      // Apply set health to the minion
      if (target.currentHealth !== undefined) {
        const oldHealth = target.currentHealth;
        // Set the health value but keep the minion's max health the same
        target.currentHealth = effect.value;
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
        
        // Apply set health to the minion
        if (target.currentHealth !== undefined) {
          const oldHealth = target.currentHealth;
          // Set the health value but keep the minion's max health the same
          target.currentHealth = effect.value;
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