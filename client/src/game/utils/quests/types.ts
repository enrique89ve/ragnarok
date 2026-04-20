/**
 * Quest System Types
 * Defines types for tracking active quests and their progress
 */

/**
 * Quest condition types - what action completes the quest
 */
export type QuestConditionType =
  | 'summon_deathrattle_minions'
  | 'summon_minion'
  | 'play_taunt_minions'
  | 'cast_generated_spells'
  | 'play_minions_same_name'
  | 'summon_minions_with_attack'
  | 'play_minions_cost_1'
  | 'generic';

/**
 * Active quest state tracked during gameplay
 */
export interface ActiveQuest {
  id: string;
  cardId: number;
  name: string;
  description: string;
  conditionType: QuestConditionType;
  conditionDescription: string;
  current: number;
  goal: number;
  completed: boolean;
  rewardCardId: number;
  rewardCardName: string;
  activatedAt: number;
  completedAt?: number;
  metadata?: {
    targetCardName?: string;
  };
}

/**
 * Quest progress update event
 */
export interface QuestProgressUpdate {
  questId: string;
  previousProgress: number;
  newProgress: number;
  isComplete: boolean;
}

/**
 * Quest activation data from a played quest card
 */
export interface QuestActivationData {
  cardId: number;
  name: string;
  description: string;
  conditionType: QuestConditionType;
  goal: number;
  rewardCardId: number;
  rewardCardName: string;
}
