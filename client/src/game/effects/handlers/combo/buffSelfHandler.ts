/**
 * BuffSelf Combo Handler
 * 
 * Implements the "buff_self" combo effect.
 * Buffs the card that triggered the combo with attack/health bonuses.
 * Example card: Card ID: 12016 (Defias Ringleader, Edwin VanCleef, etc.)
 */
import { debug } from '../../../config/debugConfig';
import { GameState, CardInstance, GameLogEvent } from '../../../types';
import { ComboEffect } from '../../../types/CardTypes';

/**
 * Execute a buff_self combo effect
 * 
 * @param state Current game state
 * @param effect The effect to execute (should have buffAttack and/or buffHealth)
 * @param sourceCard The card that triggered the effect
 * @param targetId Optional target ID (unused for buff_self)
 * @returns Updated game state with the source card buffed
 */
export function executeBuffSelfBuffSelf(
  state: GameState,
  effect: ComboEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  // Get buff values with defaults
  const buffAttack = effect.buffAttack ?? 0;
  const buffHealth = effect.buffHealth ?? 0;
  
  if (buffAttack === 0 && buffHealth === 0) {
    debug.warn(`BuffSelf combo effect has no buff values (buffAttack: ${buffAttack}, buffHealth: ${buffHealth})`);
    return state;
  }
  
  // Find and update the source card on the battlefield
  const currentPlayerId = state.currentTurn;
  const player = state.players[currentPlayerId];
  
  const updatedBattlefield = player.battlefield.map(minion => {
    if (minion.instanceId === sourceCard.instanceId) {
      // Apply the buffs to the minion - use type-safe access
      const cardData = minion.card as { attack?: number; health?: number };
      const currentAttack = minion.currentAttack ?? cardData.attack ?? 0;
      const currentHealth = minion.currentHealth ?? cardData.health ?? 0;
      const existingMaxHealth = (minion as { maxHealth?: number }).maxHealth ?? cardData.health ?? 0;
      
      return {
        ...minion,
        currentAttack: currentAttack + buffAttack,
        currentHealth: currentHealth + buffHealth,
        maxHealth: existingMaxHealth + buffHealth
      };
    }
    return minion;
  });
  
  // Create the log entry with correct type
  const logEntry: GameLogEvent = {
    id: Math.random().toString(36).substring(2, 15),
    type: 'card_played',
    player: currentPlayerId,
    text: `${sourceCard.card.name} gains +${buffAttack}/+${buffHealth} from Combo!`,
    timestamp: Date.now(),
    turn: state.turnNumber,
    cardId: String(sourceCard.card.id),
    cardName: sourceCard.card.name
  };
  
  // Create the new state with updated battlefield
  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [currentPlayerId]: {
        ...player,
        battlefield: updatedBattlefield
      }
    },
    gameLog: [...(state.gameLog || []), logEntry]
  };
  
  debug.combat(`Combo: ${sourceCard.card.name} gained +${buffAttack}/+${buffHealth}`);
  
  return newState;
}

export default executeBuffSelfBuffSelf;
