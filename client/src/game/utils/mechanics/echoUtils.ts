/**
 * Utility functions for handling Echo card mechanics
 * Echo allows cards to be re-added to your hand after being played (until the end of the turn)
 */

import { CardInstance, GameState, GameLogEventType } from '../../types';
import { createGameLogEvent } from '../logUtils';
import { MAX_HAND_SIZE } from '../../constants/gameConstants';
import { hasKeyword } from '../cards/keywordUtils';

/**
 * Check if a card has the Echo keyword
 * @param card The card to check
 * @returns True if the card has the Echo keyword and is not silenced
 */
export function hasEcho(card: CardInstance): boolean {
  // A card has Echo if:
  // 1. It has the 'echo' keyword
  // 2. It's not silenced (silencing removes all card text/keywords)
  // 3. It's not an expired Echo copy (Echo copies expire at the end of the turn)
  // 4. The original card had Echo (for cards that gained Echo through effects)
  return (
    (hasKeyword(card, 'echo') || card.hasEcho === true) &&
    !card.isSilenced &&
    card.isEchoExpired !== true
  );
}

/**
 * Initialize a card with the Echo effect
 * @param card Card instance to initialize
 * @returns Card instance with Echo effect initialized
 */
export function initializeEchoEffect(card: CardInstance): CardInstance {
  return {
    ...card,
    hasEcho: true
  };
}

/**
 * Create an Echo copy of a card after it's played
 * By design, Echo copies maintain the original cost of the card,
 * and any cost modifications apply separately to the copy
 * @param state Current game state
 * @param playedCard Card that was played
 * @param player Player who played the card
 * @returns Updated game state with an Echo copy added to the player's hand
 */
export function createEchoCopy(
  state: GameState,
  playedCard: CardInstance,
  player: 'player' | 'opponent'
): GameState {
  // Check if we're in the right game phase
  if (state.gamePhase !== 'playing') {
    return state;
  }

  // Create a deep copy of the current state
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Create a new instance of the card that was played
  // Important: Reset certain attributes for the Echo copy
  const originalCard = { ...JSON.parse(JSON.stringify(playedCard)) };
  
  // By design, Echo copies use the base card's original cost
  // but retain other modified properties
  const echoCopy: CardInstance = {
    ...originalCard,
    instanceId: `${player}_echo_${playedCard.card.id}_${Date.now()}`,
    isPlayed: false,
    isEchoCopy: true, 
    echoCreatedThisTurn: true, // Mark that this echo copy was created this turn
    // Reset summoning sickness - Echo copies are new cards
    isSummoningSick: true,
    // Reset attack count - Echo copies haven't attacked yet
    attacksPerformed: 0,
    // Store the original mana cost to handle discounts correctly
    originalManaCost: playedCard.card.manaCost
  };

  // If hand isn't full, add the echo copy
  if (newState.players[player].hand.length < MAX_HAND_SIZE) {
    newState.players[player].hand.push(echoCopy);
    
    // Log the echo copy creation
    newState.gameLog.push(
      createGameLogEvent({
        type: 'echo' as GameLogEventType,
        player,
        text: `Added an Echo copy of ${playedCard.card.name} to ${player}'s hand.`,
        cardId: playedCard.card.id.toString()
      }) as any
    );

    // Log if the Echo copy has a different cost due to other effects
    if (echoCopy.card.manaCost !== playedCard.card.manaCost) {
      newState.gameLog.push(
        createGameLogEvent({
          type: 'card_cost_changed' as GameLogEventType, 
          player,
          text: `The Echo copy costs ${echoCopy.card.manaCost} mana (original cost: ${playedCard.card.manaCost}).`,
          cardId: playedCard.card.id.toString(),
          value: echoCopy.card.manaCost
        }) as any
      );
    }
  } else {
    // Log that the hand was full
    newState.gameLog.push(
      createGameLogEvent({
        type: 'echo_failed' as GameLogEventType,
        player,
        text: `Could not add Echo copy of ${playedCard.card.name} to ${player}'s hand because it was full.`,
        cardId: playedCard.card.id.toString()
      }) as any
    );
  }
  
  return newState;
}

/**
 * Handle Echo cards at the end of turn
 * By design, Echo copies are discarded at the end of the turn they were created
 * @param state Current game state
 * @returns Updated game state with Echo copies discarded
 */
export function expireEchoCardsAtEndOfTurn(state: GameState): GameState {
  // Create a deep copy of the state
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Process each player's hand
  const playerTypes: Array<'player' | 'opponent'> = ['player', 'opponent'];
  
  playerTypes.forEach((playerType: 'player' | 'opponent') => {
    // Find Echo copies to discard
    const discardedEchoCards: CardInstance[] = [];
    const remainingCards: CardInstance[] = [];
    
    newState.players[playerType].hand.forEach((card: CardInstance) => {
      if (card.isEchoCopy || card.echoCreatedThisTurn) {
        // This is an Echo copy - discard it
        discardedEchoCards.push(card);
      } else {
        // Regular card - keep it
        remainingCards.push(card);
      }
    });
    
    // Update player's hand without the Echo copies
    newState.players[playerType].hand = remainingCards;
    
    // Log the Echo cards being discarded
    discardedEchoCards.forEach(card => {
      newState.gameLog.push(
        createGameLogEvent({
          type: 'discard' as GameLogEventType,
          player: playerType,
          text: `Echo copy of ${card.card.name} has been discarded at the end of turn.`,
          cardId: card.card.id.toString()
        }) as any
      );
    });
  });
  
  return newState;
}
