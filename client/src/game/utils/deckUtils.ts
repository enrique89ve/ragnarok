import { GameState, CardData, Player } from '../types';
import { getHealth } from './cards/typeGuards';
import { debug } from '../config/debugConfig';
import { createCardInstance } from './cards/cardUtils';
import { MAX_HAND_SIZE } from '../constants/gameConstants';

/**
 * Draw a card from player's deck and add it to their hand
 */
export function drawCard(state: GameState, playerType: 'player' | 'opponent'): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerType];

  if (player.deck.length === 0) {
    return newState;
  }
  
  if (player.hand.length >= MAX_HAND_SIZE) {
    return newState; // hand full — draw is missed, card stays in deck
  }
  
  // Draw the top card from the deck
  const drawnCard = player.deck.shift() as CardData;

  // Add the card to the player's hand
  const cardInstance = createCardInstance(drawnCard);

  player.hand.push(cardInstance);
  
  return newState;
}

/**
 * Add a card to player's hand (different from drawing - can create cards not in deck)
 */
export function addCardToHand(state: GameState, playerType: 'player' | 'opponent', cardData: CardData): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerType];
  
  if (player.hand.length >= MAX_HAND_SIZE) {
    return newState;
  }
  
  // Add the card to the player's hand (generated cards → level 3 default)
  const cardInstance = createCardInstance(cardData);

  player.hand.push(cardInstance);
  
  return newState;
}

/**
 * Add a card to player's deck
 */
export function addCardToDeck(state: GameState, playerType: 'player' | 'opponent', cardData: CardData): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerType];
  
  // Add card to the deck
  player.deck.push(cardData);
  
  return newState;
}

/**
 * Shuffle player's deck
 */
export function shuffleDeck(state: GameState, playerType: 'player' | 'opponent'): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[playerType];
  
  // Fisher-Yates shuffle algorithm
  for (let i = player.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
  }
  
  return newState;
}

/**
 * Draw multiple cards
 */
export function drawCards(state: GameState, playerType: 'player' | 'opponent', count: number): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  for (let i = 0; i < count; i++) {
    newState = drawCard(newState, playerType);
  }
  
  return newState;
}