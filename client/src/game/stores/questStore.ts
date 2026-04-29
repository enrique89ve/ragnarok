/**
 * Quest Store
 * Zustand store for tracking active quests and their progress
 * 
 * Following the separation of responsibilities pattern:
 * - Store handles state management only
 * - Quest logic extracted to utils/quests/
 */

import { create } from 'zustand';
import { 
  ActiveQuest, 
  QuestProgressUpdate,
  QuestActivationData 
} from '../utils/quests/types';
import { debug } from '../config/debugConfig';
import { 
  generateQuestId, 
  getQuestConditionDescription,
  isQuestComplete 
} from '../utils/quests/questUtils';

interface QuestStoreState {
  playerQuests: ActiveQuest[];
  opponentQuests: ActiveQuest[];
  recentProgressUpdates: QuestProgressUpdate[];
}

interface QuestStoreActions {
  activateQuest: (owner: 'player' | 'opponent', questData: QuestActivationData) => void;
  updateQuestProgress: (owner: 'player' | 'opponent', questId: string, increment: number) => void;
  completeQuest: (owner: 'player' | 'opponent', questId: string) => void;
  clearQuests: () => void;
  getActiveQuests: (owner: 'player' | 'opponent') => ActiveQuest[];
}

type QuestStore = QuestStoreState & QuestStoreActions;

export const useQuestStore = create<QuestStore>((set, get) => ({
  playerQuests: [],
  opponentQuests: [],
  recentProgressUpdates: [],

  activateQuest: (owner, questData) => {
    const newQuest: ActiveQuest = {
      id: generateQuestId(questData.cardId),
      cardId: questData.cardId,
      name: questData.name,
      description: questData.description,
      conditionType: questData.conditionType,
      conditionDescription: getQuestConditionDescription(questData.conditionType, questData.goal),
      current: 0,
      goal: questData.goal,
      completed: false,
      rewardCardId: questData.rewardCardId,
      rewardCardName: questData.rewardCardName,
      activatedAt: Date.now()
    };

    if (owner === 'player') {
      set(state => ({
        playerQuests: [...state.playerQuests, newQuest]
      }));
    } else {
      set(state => ({
        opponentQuests: [...state.opponentQuests, newQuest]
      }));
    }

    debug.log(`[QuestStore] Quest activated: ${newQuest.name} for ${owner}`);
  },

  updateQuestProgress: (owner, questId, increment = 1) => {
    const quests = owner === 'player' ? get().playerQuests : get().opponentQuests;
    const questIndex = quests.findIndex(q => q.id === questId);
    
    if (questIndex === -1) return;
    
    const quest = quests[questIndex];
    if (quest.completed) return;
    
    const previousProgress = quest.current;
    const newProgress = Math.min(quest.current + increment, quest.goal);
    const isComplete = newProgress >= quest.goal;
    
    const updatedQuest: ActiveQuest = {
      ...quest,
      current: newProgress,
      completed: isComplete,
      completedAt: isComplete ? Date.now() : undefined
    };
    
    const progressUpdate: QuestProgressUpdate = {
      questId,
      previousProgress,
      newProgress,
      isComplete
    };
    
    if (owner === 'player') {
      set(state => ({
        playerQuests: state.playerQuests.map((q, i) => 
          i === questIndex ? updatedQuest : q
        ),
        recentProgressUpdates: [...state.recentProgressUpdates.slice(-4), progressUpdate]
      }));
    } else {
      set(state => ({
        opponentQuests: state.opponentQuests.map((q, i) => 
          i === questIndex ? updatedQuest : q
        ),
        recentProgressUpdates: [...state.recentProgressUpdates.slice(-4), progressUpdate]
      }));
    }
    
    debug.log(`[QuestStore] Quest progress: ${quest.name} ${newProgress}/${quest.goal}${isComplete ? ' (COMPLETE!)' : ''}`);
  },

  // TODO(quest-reward-auto-grant): when a quest completes, the reward card
  // promised by `quest.rewardCardId` is NOT instantiated into the owner's
  // hand. The UI (QuestTracker.tsx) shows `rewardCardName` so the player
  // expects it, but no code reads `rewardCardId` to summon/give the card.
  // To implement: after the quest is marked completed, look up the card
  // definition by id (cardRegistry.find), instantiate it, and push to the
  // owner's hand via the same mechanism used by `summon`/`draw` effects.
  // Affected quest cards: 95507–95512 (questCards.ts) and 70013 (rogue.ts).
  completeQuest: (owner, questId) => {
    const quests = owner === 'player' ? get().playerQuests : get().opponentQuests;
    const questIndex = quests.findIndex(q => q.id === questId);

    if (questIndex === -1) return;

    const updatedQuest: ActiveQuest = {
      ...quests[questIndex],
      completed: true,
      current: quests[questIndex].goal,
      completedAt: Date.now()
    };

    if (owner === 'player') {
      set(state => ({
        playerQuests: state.playerQuests.map((q, i) =>
          i === questIndex ? updatedQuest : q
        )
      }));
    } else {
      set(state => ({
        opponentQuests: state.opponentQuests.map((q, i) =>
          i === questIndex ? updatedQuest : q
        )
      }));
    }

    debug.log(`[QuestStore] Quest completed: ${updatedQuest.name}`);
  },

  clearQuests: () => {
    set({
      playerQuests: [],
      opponentQuests: [],
      recentProgressUpdates: []
    });
  },

  getActiveQuests: (owner) => {
    return owner === 'player' ? get().playerQuests : get().opponentQuests;
  }
}));

/**
 * Selector for getting incomplete quests only
 */
export const selectIncompleteQuests = (owner: 'player' | 'opponent') => {
  return useQuestStore.getState()[owner === 'player' ? 'playerQuests' : 'opponentQuests']
    .filter(q => !q.completed);
};

/**
 * Non-hook access to quest store for event handlers
 */
export const getQuestStoreState = () => useQuestStore.getState();
