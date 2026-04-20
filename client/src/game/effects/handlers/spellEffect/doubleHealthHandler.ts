/**
 * DoubleHealth SpellEffect Handler
 * 
 * Implements the "double_health" spellEffect effect.
 * Example card: Card ID: 9008
 */
import { GameState, CardInstance, GameLogEvent } from '../../../types';
import { SpellEffect } from '../../../types/CardTypes';
import { isMinion, getHealth } from '../../../utils/cards/typeGuards';

/**
 * Execute a double_health spellEffect effect
 * Doubles the health of a target minion.
 */
export function executeDoubleHealthDoubleHealth(
  state: GameState,
  effect: SpellEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  const currentPlayerId = state.currentTurn;

  if (!targetId) {
    const logEntry: GameLogEvent = {
      id: Math.random().toString(36).substring(2, 15),
      type: 'spell_cast',
      player: currentPlayerId,
      text: `${sourceCard.card.name} effect failed: no target`,
      timestamp: Date.now(),
      turn: state.turnNumber,
      cardId: String(sourceCard.card.id),
      cardName: sourceCard.card.name
    };
    return {
      ...state,
      gameLog: [...(state.gameLog || []), logEntry]
    };
  }

  for (const playerId of ['player', 'opponent'] as const) {
    const player = state.players[playerId];
    const battlefield = player.battlefield;
    if (!battlefield) continue;

    const minionIndex = battlefield.findIndex(m => m.instanceId === targetId);
    if (minionIndex !== -1) {
      const minion = battlefield[minionIndex];
      
      // Ensure the target is actually a minion
      if (!isMinion(minion.card)) continue;
      
      const currentHealth = minion.currentHealth ?? getHealth(minion.card) ?? 1;
      const baseHealth = getHealth(minion.card) ?? 1;
      const newHealth = currentHealth * 2;
      const newBaseHealth = baseHealth * 2;

      const updatedMinion: CardInstance = {
        ...minion,
        currentHealth: newHealth,
        card: {
          ...minion.card,
          health: newBaseHealth
        }
      };

      const newBattlefield = [...battlefield];
      newBattlefield[minionIndex] = updatedMinion;

      const logEntry: GameLogEvent = {
        id: Math.random().toString(36).substring(2, 15),
        type: 'spell_cast',
        player: currentPlayerId,
        text: `${sourceCard.card.name} doubled ${minion.card.name}'s health to ${newHealth}`,
        timestamp: Date.now(),
        turn: state.turnNumber,
        cardId: String(sourceCard.card.id),
        cardName: sourceCard.card.name,
        targetId: targetId,
        value: newHealth
      };

      return {
        ...state,
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            battlefield: newBattlefield
          }
        },
        gameLog: [...(state.gameLog || []), logEntry]
      };
    }
  }

  return state;
}

export default executeDoubleHealthDoubleHealth;
