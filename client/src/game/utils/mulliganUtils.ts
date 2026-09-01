import { GameState, CardData } from '../types';
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

export type MulliganActorOrder = readonly [MulliganActor, MulliganActor];

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
export function confirmMulligan(state: GameState, actorOrder?: MulliganActorOrder): GameState {
  return confirmMulliganForActor(state, 'player', actorOrder);
}

export function confirmMulliganForActor(
  state: GameState,
  actor: MulliganActor,
  actorOrder?: MulliganActorOrder,
): GameState {
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
    return completeMulligan(updatedState, actorOrder);
  }

  return updatedState;
}

/**
 * Complete the mulligan phase by replacing selected cards
 */
export function completeMulligan(state: GameState, actorOrder: MulliganActorOrder = ['player', 'opponent']): GameState {
  if (!state.mulligan || !state.mulligan.active) return state;

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
  
  // Consume the shared command RNG in canonical seat order. `applyOpponentCommand`
  // swaps the viewer perspective before invoking this reducer; passing the
  // inverted order there keeps p1/p2 draw and id streams identical on both peers.
  for (const actor of actorOrder) {
    const selectedCards = actor === 'player'
      ? nextPlayers.player.hand.filter(card => nextMulligan.playerSelections[card.instanceId])
      : nextPlayers.opponent.hand.filter(card => nextMulligan.opponentSelections?.[card.instanceId] === true);
    if (selectedCards.length === 0) continue;

    const player = nextPlayers[actor];
    const deck = actor === 'player' ? playerDeck : opponentDeck;
    const selections = actor === 'player' ? nextMulligan.playerSelections : nextMulligan.opponentSelections;
    const hand = player.hand.filter(card => !selections[card.instanceId]);
    const updatedDeck = [...deck, ...selectedCards.map(card => card.card as CardData)];
    shuffleInPlace(updatedDeck);
    const { drawnCards, remainingDeck } = drawCards(updatedDeck, selectedCards.length, cryptoIdGen);
    nextPlayers[actor] = {
      ...player,
      hand: [...hand, ...drawnCards].slice(0, 7),
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
export function skipMulligan(state: GameState, actorOrder?: MulliganActorOrder): GameState {
  if (!state.mulligan || !state.mulligan.active) return state;
  
  // Clear all selections
  return confirmMulligan({
      ...state,
      mulligan: {
        ...state.mulligan,
      playerSelections: {},
      }
  }, actorOrder);
}
