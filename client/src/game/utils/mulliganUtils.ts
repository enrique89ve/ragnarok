import { GameState, CardInstance, CardData } from '../types';
import { drawCards } from './cards/cardUtils';
import { getManaCost } from './cards/typeGuards';
import { shuffleInPlace, cryptoIdGen } from './seededRng';

export interface MulliganState {
  active: boolean;
  playerSelections: Record<string, boolean>; // Track selected cards by instanceId
  opponentSelections: Record<string, boolean>; // Remote/AI selections from the local perspective
  playerReady: boolean;
  opponentReady: boolean;
}

export type MulliganActor = 'player' | 'opponent';

/**
 * Initialize the mulligan phase at the start of the game
 */
export function initializeMulligan(state: GameState): GameState {
  return {
    ...state,
    mulligan: {
      active: true,
      playerSelections: {},
      opponentSelections: {},
      playerReady: false,
      opponentReady: false
    }
  };
}

/**
 * Toggle selection of a card during mulligan phase
 */
export function toggleCardSelection(
  state: GameState,
  cardInstanceId: string,
  actor: MulliganActor = 'player',
): GameState {
  if (!state.mulligan || !state.mulligan.active) return state;

  const selectionKey = actor === 'player' ? 'playerSelections' : 'opponentSelections';
  const selections = { ...state.mulligan[selectionKey] };
  selections[cardInstanceId] = !selections[cardInstanceId];

  return {
    ...state,
    mulligan: {
      ...state.mulligan,
      [selectionKey]: selections,
    }
  };
}

/**
 * Mark player as ready to finish the mulligan phase
 */
export function confirmMulligan(state: GameState): GameState {
  return confirmMulliganForActor(state, 'player');
}

export function confirmMulliganForActor(state: GameState, actor: MulliganActor): GameState {
  if (!state.mulligan || !state.mulligan.active) return state;

  const readyKey = actor === 'player' ? 'playerReady' : 'opponentReady';
  if (state.mulligan[readyKey]) return state;
  const updatedState: GameState = {
    ...state,
    mulligan: {
      ...state.mulligan,
      [readyKey]: true,
    }
  };

  const mulligan = updatedState.mulligan;
  if (!mulligan) return updatedState;

  // Both actors must explicitly confirm. This remains idempotent when a
  // duplicate local or remote command is replayed after the ready bit is set.
  if (mulligan.playerReady && mulligan.opponentReady) {
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

  // The opponent selection is supplied by the AI controller or the remote
  // peer. A missing selection map means keep all cards; never invent AI
  // choices in this core transition because P2P uses the same function.
  const opponentSelectedCards = state.players.opponent.hand.filter(
    card => state.mulligan?.opponentSelections?.[card.instanceId] === true
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
    opponentSelections: { ...state.mulligan.opponentSelections },
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

  // Replace the opponent's selected cards. The map is populated by the AI
  // policy in local modes or by the remote command in P2P mode.
  if (opponentSelectedCards.length > 0) {
    const opponentHand = nextPlayers.opponent.hand.filter(
      card => !nextMulligan.opponentSelections[card.instanceId]
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
        opponentSelections: nextMulligan.opponentSelections,
        playerReady: nextMulligan.playerReady,
        opponentReady: nextMulligan.opponentReady
      }
    };
}

/**
 * Local-only AI policy. Keeping this outside `confirmMulliganForActor` makes
 * the core actor transition safe for P2P commands while preserving the
 * existing Campaign/VS AI behaviour.
 */
export function confirmAiMulligan(state: GameState): GameState {
  if (!state.mulligan || !state.mulligan.active) return state;

  const opponentSelections = Object.fromEntries(
    state.players.opponent.hand
      .filter(card => getManaCost(card.card) > 4)
      .map(card => [card.instanceId, true]),
  );

  return confirmMulliganForActor({
    ...state,
    mulligan: {
      ...state.mulligan,
      opponentSelections,
    },
  }, 'opponent');
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
      playerSelections: {},
      }
  });
}
