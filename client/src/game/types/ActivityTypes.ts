/**
 * ActivityTypes.ts
 * Types for the activity log/history system (Saga Feed)
 */

export type ActivityCategory = 'minion' | 'poker';

export type ActivityEventType = 
  | 'spell_cast'
  | 'minion_played'
  | 'minion_summoned'
  | 'minion_attack'
  | 'minion_death'
  | 'attack'
  | 'hero_attack'
  | 'hero_damage'
  | 'card_draw'
  | 'card_burn'
  | 'battlecry'
  | 'deathrattle'
  | 'poker_bet'
  | 'poker_check'
  | 'poker_fold'
  | 'poker_phase'
  | 'poker_resolution'
  | 'heal'
  | 'buff'
  | 'secret_triggered'
  | 'weapon_equipped'
  | 'turn_start'
  | 'turn_end';

export const EVENT_CATEGORY_MAP: Record<ActivityEventType, ActivityCategory> = {
  'spell_cast': 'minion',
  'minion_played': 'minion',
  'minion_summoned': 'minion',
  'minion_attack': 'minion',
  'minion_death': 'minion',
  'attack': 'minion',
  'hero_attack': 'minion',
  'hero_damage': 'minion',
  'card_draw': 'minion',
  'card_burn': 'minion',
  'battlecry': 'minion',
  'deathrattle': 'minion',
  'heal': 'minion',
  'buff': 'minion',
  'secret_triggered': 'minion',
  'weapon_equipped': 'minion',
  'turn_start': 'minion',
  'turn_end': 'minion',
  'poker_bet': 'poker',
  'poker_check': 'poker',
  'poker_fold': 'poker',
  'poker_phase': 'poker',
  'poker_resolution': 'poker',
};

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  category: ActivityCategory;
  actor: 'player' | 'opponent' | 'system';
  actorName?: string;
  targetName?: string;
  value?: number;
  summary: string;
  timestamp: number;
  cardName?: string;
  cardId?: number;
}

export interface ActivityLogState {
  minionEvents: ActivityEvent[];
  pokerEvents: ActivityEvent[];
  maxEvents: number;
}
