/**
 * Quest Progress Tracking Utilities
 * Pure functions for tracking quest progress from game events
 * 
 * This file follows the TSX→Hook→Store→Utils pattern:
 * - This is a utility layer that can interact directly with the store
 * - Does not use React hooks, safe to call from any context
 */

import { CardData } from '../../types';
import { getQuestStoreState } from '../../stores/questStore';
import { shouldIncrementQuest } from './questUtils';
import { ActiveQuest, QuestActivationData } from './types';
import { debug } from '../../config/debugConfig';

export type QuestActionType = 'play_minion' | 'summon_minion' | 'cast_spell';
export type QuestOwner = 'player' | 'opponent';

/**
 * Activate a quest for a player
 * Call this when a quest card is played to start tracking progress
 * 
 * @param owner - The player who owns the quest
 * @param questData - The quest activation data extracted from the quest card
 */
export function activateQuest(
  owner: QuestOwner,
  questData: QuestActivationData
): void {
  const state = getQuestStoreState();
  state.activateQuest(owner, questData);
  debug.log(`[Quest] Activated quest: ${questData.name} for ${owner}`);
}

/**
 * Track quest progress for a card action
 * Call this when a card is played, summoned, or a spell is cast
 * 
 * @param owner - The player who owns the quests to check
 * @param actionType - The type of action performed
 * @param cardData - The card data for the action
 * @param metadata - Optional metadata for special quest conditions (e.g., targetCardName for same-name quests)
 */
export function trackQuestProgress(
  owner: QuestOwner,
  actionType: QuestActionType,
  cardData: CardData,
  metadata?: { targetCardName?: string }
): void {
  const state = getQuestStoreState();
  const quests = owner === 'player' ? state.playerQuests : state.opponentQuests;
  
  for (const quest of quests) {
    if (shouldIncrementQuest(quest, actionType, cardData, metadata)) {
      state.updateQuestProgress(owner, quest.id, 1);
    }
  }
}

/**
 * Check if any quest would progress for a given action
 * Useful for UI indicators without actually updating progress
 * 
 * @param owner - The player who owns the quests to check
 * @param actionType - The type of action that would be performed
 * @param cardData - The card data for the potential action
 * @returns true if at least one quest would progress
 */
export function wouldProgressQuest(
  owner: QuestOwner,
  actionType: QuestActionType,
  cardData: CardData,
  metadata?: { targetCardName?: string }
): boolean {
  const state = getQuestStoreState();
  const quests = owner === 'player' ? state.playerQuests : state.opponentQuests;
  
  for (const quest of quests) {
    if (shouldIncrementQuest(quest, actionType, cardData, metadata)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get all quests that would progress for a given action
 * 
 * @param owner - The player who owns the quests to check
 * @param actionType - The type of action that would be performed
 * @param cardData - The card data for the potential action
 * @returns Array of quest IDs that would progress
 */
export function getProgressingQuests(
  owner: QuestOwner,
  actionType: QuestActionType,
  cardData: CardData,
  metadata?: { targetCardName?: string }
): ActiveQuest[] {
  const state = getQuestStoreState();
  const quests = owner === 'player' ? state.playerQuests : state.opponentQuests;
  
  return quests.filter(quest => shouldIncrementQuest(quest, actionType, cardData, metadata));
}

