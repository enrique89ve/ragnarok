/**
 * useQuestTracker Hook
 * Connects quest state with game events to track progress
 * 
 * Responsibilities:
 * - Subscribe to card play events
 * - Check if played cards satisfy quest conditions
 * - Update quest progress accordingly
 * 
 * Note: For non-React contexts, use trackQuestProgress from utils/quests/questProgress.ts
 * 
 * Architecture: This hook delegates to the utility layer (questProgress.ts)
 * instead of re-implementing quest logic. All quest condition checking
 * flows through the centralized utilities.
 */

import { useCallback } from 'react';
import { useQuestStore } from '../stores/questStore';
import { 
  extractQuestData,
  isQuestCard 
} from '../utils/quests/questUtils';
import { 
  trackQuestProgress, 
  activateQuest as utilActivateQuest 
} from '../utils/quests/questProgress';
import { CardData } from '../types';
import { ActiveQuest } from '../utils/quests/types';

interface UseQuestTrackerOptions {
  enabled?: boolean;
}

interface UseQuestTrackerReturn {
  playerQuests: ActiveQuest[];
  opponentQuests: ActiveQuest[];
  activateQuest: (owner: 'player' | 'opponent', card: CardData, rewardCardName?: string) => void;
  onMinionPlayed: (owner: 'player' | 'opponent', card: CardData) => void;
  onMinionSummoned: (owner: 'player' | 'opponent', card: CardData) => void;
  onSpellCast: (owner: 'player' | 'opponent', card: CardData) => void;
}

/**
 * Hook for tracking quest progress in the game
 * Delegates to questProgress.ts utilities for all quest logic
 */
export function useQuestTracker(options: UseQuestTrackerOptions = {}): UseQuestTrackerReturn {
  const { enabled = true } = options;
  
  const playerQuests = useQuestStore(state => state.playerQuests);
  const opponentQuests = useQuestStore(state => state.opponentQuests);

  /**
   * Activate a quest when a quest card is played
   * Delegates to utility layer
   */
  const activateQuest = useCallback((owner: 'player' | 'opponent', card: CardData, rewardCardName?: string) => {
    if (!enabled) return;
    if (!isQuestCard(card)) return;
    
    const questData = extractQuestData(card, rewardCardName);
    if (!questData) return;
    
    utilActivateQuest(owner, questData);
  }, [enabled]);

  /**
   * Check and update quest progress when a minion is played from hand
   * Delegates to trackQuestProgress utility
   */
  const onMinionPlayed = useCallback((owner: 'player' | 'opponent', card: CardData) => {
    if (!enabled) return;
    trackQuestProgress(owner, 'play_minion', card);
  }, [enabled]);

  /**
   * Check and update quest progress when a minion is summoned (not from hand)
   * Delegates to trackQuestProgress utility
   */
  const onMinionSummoned = useCallback((owner: 'player' | 'opponent', card: CardData) => {
    if (!enabled) return;
    trackQuestProgress(owner, 'summon_minion', card);
  }, [enabled]);

  /**
   * Check and update quest progress when a spell is cast
   * Delegates to trackQuestProgress utility
   */
  const onSpellCast = useCallback((owner: 'player' | 'opponent', card: CardData) => {
    if (!enabled) return;
    trackQuestProgress(owner, 'cast_spell', card);
  }, [enabled]);

  return {
    playerQuests,
    opponentQuests,
    activateQuest,
    onMinionPlayed,
    onMinionSummoned,
    onSpellCast
  };
}
