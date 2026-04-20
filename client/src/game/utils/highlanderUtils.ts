/**
 * Utility functions for Highlander cards mechanics
 * Checking for no duplicates in deck and handling Highlander battlecries
 */

import { GameState, GameLogEventType } from '../types';
import { createGameLogEvent } from '../utils/gameLogUtils';
import { fireAnnouncementAdapter } from '../hooks';

/**
 * Check if a player's deck has no duplicates (for Highlander card effects)
 * @param state Current game state
 * @param playerType Player to check
 * @returns Boolean indicating if the player's deck has no duplicates
 */
export function deckHasNoDuplicates(
  state: GameState,
  playerType: 'player' | 'opponent'
): boolean {
  const deck = state.players[playerType].deck;
  
  // If deck is empty, technically it has no duplicates
  if (deck.length === 0) {
    return true;
  }
  
  // Create a map to count occurrences of each card by ID
  const cardCounts = new Map<number, number>();
  
  // Count each card in the deck
  for (const card of deck) {
    const cardId = typeof card.id === 'number' ? card.id : parseInt(card.id as string, 10);
    const currentCount = cardCounts.get(cardId) || 0;
    cardCounts.set(cardId, currentCount + 1);
  }
  
  // Check if any card appears more than once
  const countValues = Array.from(cardCounts.values());
  for (const count of countValues) {
    if (count > 1) {
      return false;
    }
  }
  
  // No duplicates found
  return true;
}

/**
 * Execute Bound-Spirit's battlecry (hero power costs 0 if deck has no duplicates)
 * @param state Current game state
 * @param playerType Player who played Bound-Spirit
 * @returns Updated game state after Bound-Spirit's battlecry
 */
export function executeRazaBattlecry(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // Check if the player's deck has no duplicates
  const noDuplicates = deckHasNoDuplicates(newState, playerType);
  
  // Log the battlecry attempt
  newState.gameLog.push(
    createGameLogEvent(
      newState,
      'raza_battlecry' as GameLogEventType,
      playerType,
      `Bound-Spirit attempts to make your Hero Power cost (0).`,
      { cardId: '70004' }
    )
  );
  
  // If the condition is not met, show notification and return unchanged state
  if (!noDuplicates) {
    newState.gameLog.push(
      createGameLogEvent(
        newState,
        'play_card' as GameLogEventType,
        playerType,
        `The effect fails because ${playerType}'s deck has duplicates.`,
        { cardId: '70004' } // Bound-Spirit's ID
      )
    );
    
    // Show visual notification for failed Highlander effect
    fireAnnouncementAdapter('condition_not_met', 'Bound-Spirit Effect Failed!', {
      subtitle: 'Deck contains duplicate cards',
      duration: 2000
    });
    
    return newState;
  }
  
  // Set the hero power costs zero flag
  (newState.players[playerType] as any).heroPowerCostsZero = true;
  
  // Log the effect
  newState.gameLog.push(
    createGameLogEvent(
      newState,
      'effect_applied' as GameLogEventType,
      playerType,
      `Bound-Spirit makes ${playerType}'s Hero Power cost (0) for the rest of the game.`,
      { cardId: '70004' } // Bound-Spirit's ID
    )
  );
  
  return newState;
}
