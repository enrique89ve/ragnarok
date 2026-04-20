/**
 * Armor SpellEffect Handler
 * 
 * Implements the "armor" spellEffect effect.
 * Grants armor to the player's hero. May also draw cards (like Shield Block).
 * Example card: Shield Block (ID: 31022) - Gain 5 Armor. Draw a card.
 */
import { debug } from '../../../config/debugConfig';
import { GameState, CardInstance, GameLogEvent } from '../../../types';
import { SpellEffect } from '../../../types/CardTypes';
import { drawCardFromDeck } from '../../../utils/zoneUtils';

/**
 * Execute an armor spellEffect effect
 * 
 * @param state Current game state
 * @param effect The effect to execute (should have value for armor amount, optionally drawCards)
 * @param sourceCard The card that triggered the effect
 * @param targetId Optional target ID (unused for armor effect)
 * @returns Updated game state with armor gained and cards drawn
 */
export function executeArmorArmor(
  state: GameState,
  effect: SpellEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  // Get effect values with defaults
  const armorValue = effect.value ?? 0;
  const drawCount = effect.drawCards ?? 0;
  
  if (armorValue === 0 && drawCount === 0) {
    debug.warn(`Armor effect has no value or drawCards property`);
    return state;
  }
  
  // Get the current player
  const currentPlayerId = state.currentTurn;
  const player = state.players[currentPlayerId];
  
  // Apply armor to the player
  const currentArmor = player.armor ?? 0;
  const newArmor = currentArmor + armorValue;
  
  // Create the log entry with correct type
  const logEntry: GameLogEvent = {
    id: Math.random().toString(36).substring(2, 15),
    type: 'spell_cast',
    player: currentPlayerId,
    text: armorValue > 0 ? `${sourceCard.card.name} grants ${armorValue} Armor` : '',
    timestamp: Date.now(),
    turn: state.turnNumber,
    cardId: String(sourceCard.card.id),
    cardName: sourceCard.card.name,
    value: armorValue
  };
  
  let newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [currentPlayerId]: {
        ...player,
        armor: newArmor
      }
    },
    gameLog: [...(state.gameLog || []), logEntry]
  };
  
  // Draw cards if specified
  if (drawCount > 0) {
    for (let i = 0; i < drawCount; i++) {
      newState = drawCardFromDeck(newState, currentPlayerId);
    }
  }
  
  debug.card(`Armor effect: Gained ${armorValue} armor${drawCount > 0 ? `, drew ${drawCount} card(s)` : ''}`);
  
  return newState;
}

export default executeArmorArmor;
