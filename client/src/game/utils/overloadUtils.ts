/**
 * Utility functions for handling Overload mechanics
 * Overload locks mana crystals for the next turn
 */

import { GameState, CardData } from '../types';
import { hasOverload } from './cards/typeGuards';

export { hasOverload };

/**
 * Get the overload amount for a card
 * @param card Card data to check
 * @returns Overload amount (mana crystals to lock next turn) or 0 if no overload
 */
export function getOverloadAmount(card: CardData): number {
  if (hasOverload(card) && card.overload) {
    return card.overload.amount;
  }
  return 0;
}

/**
 * Apply overload when a card is played
 * This adds to the pendingOverload value which will become active on the next turn
 * @param state Current game state
 * @param playerType Player who played the card
 * @param overloadAmount Amount of mana crystals to lock next turn
 * @returns Updated game state with pending overload applied
 */
export function applyOverload(
  state: GameState,
  playerType: 'player' | 'opponent',
  overloadAmount: number
): GameState {
  if (overloadAmount <= 0) {
    return state;
  }
  
  const player = state.players[playerType];
  const currentPendingOverload = player.mana.pendingOverload || 0;
  
  
  // Update pending overload (will become active on next turn)
  return {
    ...state,
    players: {
      ...state.players,
      [playerType]: {
        ...player,
        mana: {
          ...player.mana,
          pendingOverload: currentPendingOverload + overloadAmount
        }
      }
    }
  };
}

/**
 * Calculate available mana after accounting for overloaded crystals
 * @param state Current game state
 * @param playerType Player to calculate mana for
 * @returns Available mana after overload is applied
 */
export function calculateAvailableMana(state: GameState, playerType: 'player' | 'opponent'): number {
  const player = state.players[playerType];
  const maxMana = player.mana.max;
  const overloadedMana = player.mana.overloaded || 0;
  
  return Math.max(0, maxMana - overloadedMana);
}

/**
 * Reset overload when a player's turn begins
 * This removes the "overloaded" status but does not affect pendingOverload
 * @param state Current game state
 * @param playerType Player whose turn is beginning
 * @returns Updated game state with overload reset
 */
export function resetOverload(state: GameState, playerType: 'player' | 'opponent'): GameState {
  // This would typically be called at the start of a player's turn
  // To fully reset overload (not just temporarily unlock)
  return {
    ...state,
    players: {
      ...state.players,
      [playerType]: {
        ...state.players[playerType],
        mana: {
          ...state.players[playerType].mana,
          overloaded: 0 // Reset active overload
        }
      }
    }
  };
}

/**
 * Format a mana display string showing overloaded crystals
 * @param currentMana Current available mana
 * @param maxMana Maximum mana this turn
 * @param overloadedMana Currently overloaded (locked) mana
 * @returns Formatted string like "4/7 (3 locked)"
 */
export function formatManaWithOverload(
  currentMana: number,
  maxMana: number,
  overloadedMana: number
): string {
  if (overloadedMana > 0) {
    return `${currentMana}/${maxMana} (⚡ ${overloadedMana} locked)`;
  }
  return `${currentMana}/${maxMana}`;
}

/**
 * Calculate pending overload to display to the player
 * @param state Current game state
 * @param playerType Player to calculate for
 * @returns String description of pending overload, or empty string if none
 */
export function getPendingOverloadDescription(state: GameState, playerType: 'player' | 'opponent'): string {
  const pendingOverload = state.players[playerType].mana.pendingOverload || 0;
  
  if (pendingOverload > 0) {
    return `⚡ WARNING: ${pendingOverload} mana crystal${pendingOverload > 1 ? 's' : ''} will be locked next turn!`;
  }
  return '';
}