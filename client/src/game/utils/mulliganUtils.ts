import { GameState, CardInstance, CardData } from '../types';
import { drawCards } from './cards/cardUtils';
import { getManaCost } from './cards/typeGuards';
import { shuffleInPlace, cryptoIdGen } from './seededRng';

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

  const playerDeck = [...state.players.player.deck];
  const opponentDeck = [...state.players.opponent.deck];

  const nextPlayers = {
    player: { ...state.players.player },
    opponent: { ...state.players.opponent },
  };

  const nextMulligan = {
    ...state.mulligan,
    playerSelections: { ...state.mulligan.playerSelections },
  };
  
  // Replace player's selected cards
  if (playerSelectedCards.length > 0) {
    const playerHand = nextPlayers.player.hand.filter(
      card => !nextMulligan.playerSelections[card.instanceId]
    );
    const playerReturnCards = playerSelectedCards.map(card => card.card as CardData);

    const updatedDeck = [...playerDeck, ...playerReturnCards];
    shuffleInPlace(updatedDeck);

    // Draw new cards equal to the number of replaced cards. Mulligan is
    // mid-match (post-init) — the host is authoritative, so cryptoIdGen
    // is fine here. Plan B replay-symmetric will plumb an EffectContext
    // SeededIdGen through this path.
    const { drawnCards, remainingDeck } = drawCards(
      updatedDeck,
      playerSelectedCards.length,
      cryptoIdGen,
    );

    // Update hand and deck — cap at 7
    const combined = [...playerHand, ...drawnCards];
    nextPlayers.player = {
      ...nextPlayers.player,
      hand: combined.slice(0, 7),
      deck: remainingDeck,
    };
  }

  // Do the same for AI opponent
  if (opponentSelectedCards.length > 0) {
    const opponentHand = nextPlayers.opponent.hand.filter(
      card => getManaCost(card.card) <= 4 // Simple AI mulligan logic
    );
    const opponentReturnCards = opponentSelectedCards.map(card => card.card as CardData);

    const updatedDeck = [...opponentDeck, ...opponentReturnCards];
    shuffleInPlace(updatedDeck);

    // Draw new cards equal to the number of replaced cards
    const { drawnCards, remainingDeck } = drawCards(
      updatedDeck,
      opponentSelectedCards.length,
      cryptoIdGen,
    );

    // Update hand and deck — cap at 7
    const combined = [...opponentHand, ...drawnCards];
    nextPlayers.opponent = {
      ...nextPlayers.opponent,
      hand: combined.slice(0, 7),
      deck: remainingDeck,
    };
  }
  
  // End mulligan phase and transition to play phase
  // Set mulliganCompleted = true so poker battles skip mulligan phase
  return {
      ...state,
      players: {
        ...state.players,
        player: nextPlayers.player,
        opponent: nextPlayers.opponent,
      },
      gamePhase: 'playing', // Update game phase to 'playing' to transition from mulligan
      mulliganCompleted: true, // Mulligan only happens ONCE per game
      mulligan: {
        active: false,
        playerSelections: nextMulligan.playerSelections,
        playerReady: nextMulligan.playerReady,
        opponentReady: nextMulligan.opponentReady
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
