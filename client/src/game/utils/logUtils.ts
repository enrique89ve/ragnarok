/**
 * Game log utilities
 */
import { GameLogEvent, GameLogEventType } from '../types';

/**
 * Creates a game log event
 * @param data Event data
 * @returns Game log event
 */
export function createGameLogEvent(data: {
  type: GameLogEventType;
  player: 'player' | 'opponent';
  text: string;
  cardId?: string;
  cardName?: string;
  targetId?: string;
  value?: number;
  progress?: number;
  target?: number;
}): GameLogEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: data.type,
    turn: 0, // This would be filled in with the current turn
    timestamp: Date.now(),
    player: data.player,
    text: data.text,
    cardId: data.cardId,
    targetId: data.targetId,
    value: data.value,
    progress: data.progress,
    target: data.target,
    cardName: data.cardName
  };
}