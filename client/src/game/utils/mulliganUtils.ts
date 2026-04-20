import { GameState, CardInstance } from '../types';
import { drawCards } from './cards/cardUtils';
import { getManaCost } from './cards/typeGuards';
import { shuffleInPlace } from './seededRng';

export interface MulliganState {
  active: boolean;
  playerSelections: Record<string, boolean>; // Track selected cards by instanceId
  playerReady: boolean;
  opponentReady: boolean;
}

/**
 * Initialize the mulligan phase at the start of the game
 */
export function initializeMulligan(state: GameState): GameState {
  return {
    ...state,
    mulligan: {
      active: true,
      playerSelections: {},
      playerReady: false,
      opponentReady: false
    }
  };
}

/**
 * Toggle selection of a card during mulligan phase
 */
export function toggleCardSelection(state: GameState, cardInstanceId: string): GameState {
  if (!state.mulligan || !state.mulligan.active) return state;

  const playerSelections = { ...state.mulligan.playerSelections };
  playerSelections[cardInstanceId] = !playerSelections[cardInstanceId];

  return {
    ...state,
    mulligan: {
      ...state.mulligan,
      playerSelections
    }
  };
}

/**
 * Mark player as ready to finish the mulligan phase
 */
export function confirmMulligan(state: GameState): GameState {
  if (!state.mulligan || !state.mulligan.active) return state;

  // Mark player as ready
  const updatedState = {
    ...state,
    mulligan: {
      ...state.mulligan,
      playerReady: true
    }
  };

  // Simulate AI opponent immediately becoming ready
  updatedState.mulligan.opponentReady = true;

  // If both players are ready, complete the mulligan phase
  if (updatedState.mulligan.playerReady && updatedState.mulligan.opponentReady) {
    return completeMulligan(updatedState);
  }

  return updatedState;
}

/**
 * Complete the mulligan phase by replacing selected cards
 */
export function completeMulligan(state: GameState): GameState {
  if (!state.mulligan || !state.mulligan.active) return state;

  // Get selected cards for player
  const playerSelectedCards = state.players.player.hand.filter(
    card => state.mulligan?.playerSelections[card.instanceId]
  );

  // AI selects cards to mulligan (simple implementation: just select cards with cost > 4)
  const opponentSelectedCards = state.players.opponent.hand.filter(
    card => getManaCost(card.card) > 4
  );

  // Create a deep copy of the state to safely modify it
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Replace player's selected cards
  if (playerSelectedCards.length > 0) {
    // Remove selected cards from hand
    newState.players.player.hand = newState.players.player.hand.filter(
      card => !newState.mulligan?.playerSelections[card.instanceId]
    );
    
    // Put selected cards back into deck
    newState.players.player.deck = [
      ...newState.players.player.deck,
      ...playerSelectedCards.map(card => card.card)
    ];
    
    shuffleInPlace(newState.players.player.deck);
    
    // Draw new cards equal to the number of replaced cards
    const { drawnCards, remainingDeck } = drawCards(
      newState.players.player.deck,
      playerSelectedCards.length
    );
    
    // Update hand and deck — cap at 7
    const combined = [...newState.players.player.hand, ...drawnCards];
    newState.players.player.hand = combined.slice(0, 7);
    newState.players.player.deck = remainingDeck;
  }

  // Do the same for AI opponent
  if (opponentSelectedCards.length > 0) {
    // Remove selected cards from hand
    newState.players.opponent.hand = newState.players.opponent.hand.filter(
      card => getManaCost(card.card) <= 4 // Simple AI mulligan logic
    );
    
    // Put selected cards back into deck
    newState.players.opponent.deck = [
      ...newState.players.opponent.deck,
      ...opponentSelectedCards.map(card => card.card)
    ];
    
    shuffleInPlace(newState.players.opponent.deck);
    
    // Draw new cards equal to the number of replaced cards
    const { drawnCards, remainingDeck } = drawCards(
      newState.players.opponent.deck,
      opponentSelectedCards.length
    );
    
    // Update hand and deck — cap at 7
    const combined = [...newState.players.opponent.hand, ...drawnCards];
    newState.players.opponent.hand = combined.slice(0, 7);
    newState.players.opponent.deck = remainingDeck;
  }
  
  // End mulligan phase and transition to play phase
  // Set mulliganCompleted = true so poker battles skip mulligan phase
  return {
    ...newState,
    gamePhase: 'playing', // Update game phase to 'playing' to transition from mulligan
    mulliganCompleted: true, // Mulligan only happens ONCE per game
    mulligan: {
      active: false,
      playerSelections: newState.mulligan?.playerSelections ?? {},
      playerReady: newState.mulligan?.playerReady ?? false,
      opponentReady: newState.mulligan?.opponentReady ?? false
    }
  };
}

/**
 * Skip mulligan phase and keep current hand
 */
export function skipMulligan(state: GameState): GameState {
  if (!state.mulligan || !state.mulligan.active) return state;
  
  // Clear all selections
  return confirmMulligan({
    ...state,
    mulligan: {
      ...state.mulligan,
      playerSelections: {}
    }
  });
}