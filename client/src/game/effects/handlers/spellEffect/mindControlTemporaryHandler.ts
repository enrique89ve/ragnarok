/**
 * MindControlTemporary SpellEffect Handler
 * 
 * Implements the "mind_control_temporary" spellEffect effect.
 * Takes control of an enemy minion until end of turn.
 * Example card: Card ID: 3014 (Shadow Madness-style effect)
 * 
 * Note: The minion is marked with `returnToOwnerAtEndOfTurn` flag which
 * should be processed by the end-of-turn cleanup system.
 */
import { GameState, CardInstance, GameLogEvent } from '../../../types';
import { SpellEffect } from '../../../types/CardTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a mind_control_temporary spellEffect effect
 * Takes control of an enemy minion until end of turn.
 */
export function executeMindControlTemporaryMindControlTemporary(
  state: GameState,
  effect: SpellEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  const currentPlayerId = state.currentTurn;
  const opponentId: 'player' | 'opponent' = currentPlayerId === 'player' ? 'opponent' : 'player';

  if (!targetId) {
    const logEntry: GameLogEvent = {
      id: Math.random().toString(36).substring(2, 15),
      type: 'spell_cast',
      player: currentPlayerId,
      text: `${sourceCard.card.name} failed: no target`,
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

  const opponentPlayer = state.players[opponentId];
  const currentPlayer = state.players[currentPlayerId];
  const opponentBattlefield = opponentPlayer.battlefield || [];
  const minionIndex = opponentBattlefield.findIndex(m => m.instanceId === targetId);

  if (minionIndex === -1) {
    return state;
  }

  const currentBattlefield = currentPlayer.battlefield || [];
  if (currentBattlefield.length >= MAX_BATTLEFIELD_SIZE) {
    return state;
  }

  const minion = opponentBattlefield[minionIndex];
  const newOpponentBattlefield = opponentBattlefield.filter(
    m => m.instanceId !== targetId
  );

  const controlledMinion: CardInstance = {
    ...minion,
    isSummoningSick: false,
    canAttack: true,
    attacksPerformed: 0,
    returnToOwnerAtEndOfTurn: true,
    originalOwner: opponentId,
    isPlayerOwned: currentPlayerId === 'player'
  };

  const newCurrentBattlefield = [...currentBattlefield, controlledMinion];

  const logEntry: GameLogEvent = {
    id: Math.random().toString(36).substring(2, 15),
    type: 'spell_cast',
    player: currentPlayerId,
    text: `${sourceCard.card.name} took temporary control of ${minion.card.name}`,
    timestamp: Date.now(),
    turn: state.turnNumber,
    cardId: String(sourceCard.card.id),
    cardName: sourceCard.card.name,
    targetId: targetId
  };

  return {
    ...state,
    players: {
      ...state.players,
      [opponentId]: {
        ...opponentPlayer,
        battlefield: newOpponentBattlefield
      },
      [currentPlayerId]: {
        ...currentPlayer,
        battlefield: newCurrentBattlefield
      }
    },
    gameLog: [...(state.gameLog || []), logEntry]
  };
}

export default executeMindControlTemporaryMindControlTemporary;
