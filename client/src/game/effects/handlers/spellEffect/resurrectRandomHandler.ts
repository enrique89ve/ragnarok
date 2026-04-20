/**
 * ResurrectRandom SpellEffect Handler
 * 
 * Implements the "resurrect_random" spellEffect effect.
 * Example card: Card ID: 3017
 */
import { GameState, CardInstance, GameLogEvent, MinionCardData } from '../../../types';
import { SpellEffect } from '../../../types/CardTypes';
import { v4 as uuidv4 } from 'uuid';
import { hasKeyword } from '../../../utils/cards/keywordUtils';

/**
 * Execute a resurrect_random spellEffect effect
 * Resurrects random friendly minions that died this game.
 */
export function executeResurrectRandomResurrectRandom(
  state: GameState,
  effect: SpellEffect,
  sourceCard: CardInstance,
  targetId?: string
): GameState {
  const currentPlayerId = state.currentTurn;
  const player = state.players[currentPlayerId];

  const count = effect.value ?? 1;

  const graveyard = player.graveyard || [];
  const deadMinions = graveyard.filter((card: CardInstance) => card.card?.type === 'minion');

  if (deadMinions.length === 0) {
    const logEntry: GameLogEvent = {
      id: Math.random().toString(36).substring(2, 15),
      type: 'spell_cast',
      player: currentPlayerId,
      text: `${sourceCard.card.name} found no minions to resurrect`,
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

  const battlefield = [...(player.battlefield || [])];
  const maxMinions = 5;
  const availableSlots = maxMinions - battlefield.length;
  const resurrectionCount = Math.min(count, deadMinions.length, availableSlots);

  if (resurrectionCount <= 0) {
    return state;
  }

  const shuffled = [...deadMinions].sort(() => Math.random() - 0.5);
  const toResurrect = shuffled.slice(0, resurrectionCount);

  const logEntries: GameLogEvent[] = [];
  const newBattlefield = [...battlefield];

  for (const deadMinion of toResurrect) {
    const minionData = deadMinion.card as MinionCardData;
    const resurrectedMinion: CardInstance = {
      instanceId: uuidv4(),
      card: { ...deadMinion.card },
      currentHealth: minionData.health,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0,
      hasDivineShield: hasKeyword(deadMinion, 'divine_shield')
    };

    newBattlefield.push(resurrectedMinion);

    logEntries.push({
      id: Math.random().toString(36).substring(2, 15),
      type: 'spell_cast',
      player: currentPlayerId,
      text: `${sourceCard.card.name} resurrected ${resurrectedMinion.card.name}`,
      timestamp: Date.now(),
      turn: state.turnNumber,
      cardId: String(sourceCard.card.id),
      cardName: sourceCard.card.name
    });
  }

  return {
    ...state,
    players: {
      ...state.players,
      [currentPlayerId]: {
        ...player,
        battlefield: newBattlefield
      }
    },
    gameLog: [...(state.gameLog || []), ...logEntries]
  };
}

export default executeResurrectRandomResurrectRandom;
