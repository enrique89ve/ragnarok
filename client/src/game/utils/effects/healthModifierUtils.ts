/**
 * Utility functions for health modifier cards
 * Handles cards like Prince Renathal that modify player's health and deck size
 */
import { GameState, CardInstance } from '../../types';
import { createGameLogEvent } from '../gameLogUtils';
import { hasKeyword } from '../cards/keywordUtils';

/**
 * Start of game effect interface
 */
export interface StartOfGameEffect {
  type: string;
  healthValue?: number;
  deckSize?: number;
  [key: string]: any;
}

/**
 * Apply start of game health and deck size modifiers
 * @param state Current game state
 * @param playerType Player whose deck contains the modifier card
 * @param effect The start of game effect to apply
 * @param cardId ID of the card with the start of game effect
 * @returns Updated game state after applying the modifier
 */
export function applyHealthAndDeckSizeModifier(
  state: GameState,
  playerType: 'player' | 'opponent',
  effect: StartOfGameEffect,
  cardId: string
): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // Apply health modifier - add to base health
  const additionalHealth = effect.healthValue || 0;
  if (additionalHealth > 0) {
    newState.players[playerType].maxHealth += additionalHealth;
    newState.players[playerType].health += additionalHealth;
    newState.players[playerType].heroHealth = newState.players[playerType].health;

    // Log the health increase
    newState.gameLog.push(
      createGameLogEvent(
        newState,
        'start_of_game_effect' as any,
        playerType,
        `Prince Renathal increases ${playerType}'s maximum Health to ${newState.players[playerType].maxHealth}.`,
        { cardId }
      )
    );
  }
  
  // Apply deck size modifier (this would be relevant at deck creation, not during the game)
  // We just log it for reference
  if (effect.deckSize) {
    newState.gameLog.push(
      createGameLogEvent(
        newState,
        'start_of_game_effect' as any,
        playerType,
        `Prince Renathal allows ${playerType} to use a ${effect.deckSize} card deck.`,
        { cardId }
      )
    );
  }
  
  return newState;
}

/**
 * Set a hero's health to a specific value (for Amara)
 * @param state Current game state
 * @param playerType Player whose hero's health is being set
 * @param healthValue The health value to set
 * @param cardId ID of the card setting the health
 * @returns Updated game state after setting the health
 */
export function setHeroHealth(
  state: GameState,
  playerType: 'player' | 'opponent',
  healthValue: number,
  cardId: string
): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // Set max health to the specified value
  newState.players[playerType].maxHealth = healthValue;
  
  // Set current health to the max value (keep both fields in sync)
  newState.players[playerType].health = healthValue;
  newState.players[playerType].heroHealth = healthValue;
  
  // Log the health change
  newState.gameLog.push(
    createGameLogEvent(
      newState,
      'set_hero_health' as any,
      playerType,
      `${playerType}'s hero's Health is set to ${healthValue}.`,
      { cardId }
    )
  );
  
  return newState;
}

/**
 * Replace a player's hero with a new one (for Lord Jaraxxus)
 * @param state Current game state
 * @param playerType Player whose hero is being replaced
 * @param cardId ID of the card replacing the hero
 * @param heroId ID of the new hero
 * @returns Updated game state after replacing the hero
 */
export function replaceHero(
  state: GameState,
  playerType: 'player' | 'opponent',
  cardId: string,
  heroId: string
): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // When implementing the full functionality, this would:
  // 1. Store information about the new hero (health, hero power, etc.)
  // 2. Replace the current hero with the new one
  
  // For now, we just set health to Lord Jaraxxus's health (15)
  newState.players[playerType].maxHealth = 15;
  newState.players[playerType].health = Math.min(newState.players[playerType].health, 15);
  newState.players[playerType].heroHealth = Math.min(newState.players[playerType].heroHealth ?? newState.players[playerType].health, 15);
  
  // Replace hero power
  // newState.players[playerType].heroPower = getJaraxxusHeroPower();
  
  // Log the hero replacement
  newState.gameLog.push(
    createGameLogEvent(
      newState,
      'replace_hero' as any,
      playerType,
      `${playerType}'s hero is destroyed and replaced with Lord Jaraxxus!`,
      { cardId }
    )
  );
  
  return newState;
}

/**
 * Apply all start of game effects for all players
 * @param state Current game state
 * @returns Updated game state after applying all start of game effects
 */
export function applyAllStartOfGameEffects(state: GameState): GameState {
  // Create a deep copy of the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state));
  
  // Process for both players
  (['player', 'opponent'] as const).forEach((playerType) => {
    // Check both the deck and the starting hand for start of game effect cards
    const deck = newState.players[playerType].deck;
    const hand = newState.players[playerType].hand;
    
    // Combine deck and hand for searching
    const allCards = [...deck, ...hand];
    
    // Find all cards with start of game effects
    const startOfGameCards = allCards.filter(
      (card: any) =>
        hasKeyword(card, 'start_of_game') &&
        card.card.startOfGameEffect
    );

    // Apply each start of game effect
    startOfGameCards.forEach((card: any) => {
      if (card.card.startOfGameEffect) {
        const effect = card.card.startOfGameEffect;
        
        // Handle different types of start of game effects
        switch (effect.type) {
          case 'health_and_deck_size':
            newState = applyHealthAndDeckSizeModifier(
              newState, 
              playerType, 
              effect, 
              card.card.id.toString()
            );
            break;
          // Add cases for other start of game effect types
        }
      }
    });
  });
  
  return newState;
}

// Functions are already exported inline