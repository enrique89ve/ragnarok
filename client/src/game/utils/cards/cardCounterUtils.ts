/**
 * Utility functions for tracking and displaying card counts
 * Includes deck counts, hand sizes, and card history
 */

import { GameLogEvent, GameState } from "../../types";
import { isMinion, getAttack, getHealth } from "./typeGuards";

/**
 * Interface to represent card counts for a player
 */
export interface CardCounts {
  deckCount: number;
  handCount: number;
  battlefieldCount: number;
  graveyardCount: number;
  secretsCount: number;
  cardsPlayedThisTurn: number;
  cardsPlayedTotal: number;
  minionsPlayedThisTurn: number;
  minionsPlayedTotal: number;
  spellsPlayedThisTurn: number;
  spellsPlayedTotal: number;
  weaponsPlayedThisTurn: number;
  weaponsPlayedTotal: number;
}

/**
 * Get the card counts for a player
 * @param state Current game state
 * @param playerType The player to get counts for ('player' or 'opponent')
 * @returns Object containing all card counts
 */
export function getCardCounts(state: GameState, playerType: 'player' | 'opponent'): CardCounts {
  const player = state.players[playerType];
  
  // Basic counts
  const deckCount = player.deck.length;
  const handCount = player.hand.length;
  const battlefieldCount = player.battlefield.length;
  const graveyardCount = player.graveyard ? player.graveyard.length : 0;
  const secretsCount = player.secrets ? player.secrets.length : 0;
  
  // Count cards played this turn and total (from game log)
  const cardsPlayedThisTurn = player.cardsPlayedThisTurn || 0;
  
  // Calculate cards played totals by type using game log
  const minionsPlayedThisTurn = countCardTypesPlayedThisTurn(state, playerType, 'minion');
  const spellsPlayedThisTurn = countCardTypesPlayedThisTurn(state, playerType, 'spell');
  const weaponsPlayedThisTurn = countCardTypesPlayedThisTurn(state, playerType, 'weapon');
  
  // Calculate totals from game log
  const cardsPlayedTotal = countCardTypesPlayed(state, playerType, 'all');
  const minionsPlayedTotal = countCardTypesPlayed(state, playerType, 'minion');
  const spellsPlayedTotal = countCardTypesPlayed(state, playerType, 'spell');
  const weaponsPlayedTotal = countCardTypesPlayed(state, playerType, 'weapon');
  
  return {
    deckCount,
    handCount,
    battlefieldCount,
    graveyardCount,
    secretsCount,
    cardsPlayedThisTurn,
    cardsPlayedTotal,
    minionsPlayedThisTurn,
    minionsPlayedTotal,
    spellsPlayedThisTurn,
    spellsPlayedTotal,
    weaponsPlayedThisTurn,
    weaponsPlayedTotal
  };
}

/**
 * Count the number of cards of a specific type played this turn
 * @param state Current game state
 * @param playerType The player to check for ('player' or 'opponent')
 * @param cardType The type of card to count ('minion', 'spell', 'weapon', 'secret')
 * @returns Number of cards of that type played this turn
 */
function countCardTypesPlayedThisTurn(
  state: GameState, 
  playerType: 'player' | 'opponent',
  cardType: 'minion' | 'spell' | 'weapon' | 'secret' | 'all'
): number {
  const currentTurn = state.turnNumber;
  
  // Filter game log events for the current turn and player
  return state.gameLog.filter(event => 
    event.turn === currentTurn && 
    event.player === playerType && 
    event.type === 'play_card' &&
    (cardType === 'all' || event.text.toLowerCase().includes(cardType))
  ).length;
}

/**
 * Count the total number of cards of a specific type played in the game
 * @param state Current game state
 * @param playerType The player to check for ('player' or 'opponent')
 * @param cardType The type of card to count ('minion', 'spell', 'weapon', 'secret')
 * @returns Total number of cards of that type played
 */
function countCardTypesPlayed(
  state: GameState, 
  playerType: 'player' | 'opponent',
  cardType: 'minion' | 'spell' | 'weapon' | 'secret' | 'all'
): number {
  // Filter game log events for the player
  return state.gameLog.filter(event => 
    event.player === playerType && 
    event.type === 'play_card' &&
    (cardType === 'all' || event.text.toLowerCase().includes(cardType))
  ).length;
}

/**
 * Get recent card history (for displaying in the UI)
 * @param state Current game state
 * @param playerType The player to get history for ('player' or 'opponent')
 * @param limit Max number of recent cards to return
 * @returns Array of recent card play events
 */
export function getRecentCardHistory(
  state: GameState, 
  playerType: 'player' | 'opponent',
  limit: number = 5
): GameLogEvent[] {
  // Filter log for this player's "play_card" events and sort by most recent
  const playerEvents = state.gameLog
    .filter(event => event.player === playerType)
    .sort((a, b) => (b.turn ?? 0) - (a.turn ?? 0) || (b.timestamp ?? 0) - (a.timestamp ?? 0));
  
  // Return the most recent events up to the limit
  return playerEvents.slice(0, limit);
}

/**
 * Format a card count display string (for UI)
 * @param deckCount Number of cards in deck
 * @param handCount Number of cards in hand
 * @returns Formatted string for display
 */
export function formatCardCountDisplay(deckCount: number, handCount: number): string {
  return `Deck: ${deckCount} | Hand: ${handCount}`;
}