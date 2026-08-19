/**
 * DestroyRandom SpellEffect Handler
 * 
 * Implements the "destroy_random" spellEffect effect.
 * Example card: Card ID: 7017
 */
import { GameState, CardInstance, GameLogEvent } from '../../../types';
import { SpellEffect } from '../../../types/CardTypes';
import { cryptoIdGen } from '../../../utils/seededRng';
import { cardsRng } from '../../../utils/cardsCommandRng';

/**
 * Execute a destroy_random spellEffect effect
 * Destroys a random enemy minion on the battlefield.
 */
export function executeDestroyRandomDestroyRandom(
  state: GameState,
  effect: SpellEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  const currentPlayerId = state.currentTurn;
  
  const targetPlayerId = effect.targetType === 'enemy_minions' ? 
    (currentPlayerId === 'player' ? 'opponent' : 'player') : 
    currentPlayerId;

  const player = state.players[targetPlayerId];
  if (!player || !player.battlefield || player.battlefield.length === 0) {
    return state;
  }

  const battlefield = [...player.battlefield];
  const randomIndex = Math.floor(cardsRng() * battlefield.length);
  const targetMinion = battlefield[randomIndex];

  const newBattlefield = battlefield.filter(m => m.instanceId !== targetMinion.instanceId);

  const logEntry: GameLogEvent = {
    id: cryptoIdGen(),
    type: 'spell_cast',
    player: currentPlayerId,
    text: `${sourceCard.card.name} destroyed ${targetMinion.card.name}`,
    timestamp: Date.now(),
    turn: state.turnNumber,
    cardId: String(sourceCard.card.id),
    cardName: sourceCard.card.name,
    targetId: targetMinion.instanceId
  };

  const newState: GameState = {
    ...state,
    players: {
      ...state.players,
      [targetPlayerId]: {
        ...player,
        battlefield: newBattlefield
      }
    },
    gameLog: [...(state.gameLog || []), logEntry]
  };
  
  return newState;
}

export default executeDestroyRandomDestroyRandom;
