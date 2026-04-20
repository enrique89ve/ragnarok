/**
 * activityLogStore.ts
 * Zustand store for managing the activity log/history (Saga Feed)
 * Supports two separate feeds: minion events and poker events
 */

import { create } from 'zustand';
import { ActivityEvent, ActivityEventType, ActivityLogState, EVENT_CATEGORY_MAP, ActivityCategory } from '../types/ActivityTypes';

interface ActivityLogStore extends ActivityLogState {
  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'category'>) => void;
  clearEvents: (category?: ActivityCategory) => void;
  getAllEvents: () => ActivityEvent[];
}

let eventIdCounter = 0;

export const useActivityLogStore = create<ActivityLogStore>((set, get) => ({
  minionEvents: [],
  pokerEvents: [],
  maxEvents: 10,
  
  getAllEvents: () => {
    const state = get();
    return [...state.minionEvents, ...state.pokerEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, state.maxEvents);
  },
  
  addEvent: (event) => {
    const category = EVENT_CATEGORY_MAP[event.type] || 'minion';
    const newEvent: ActivityEvent = {
      ...event,
      category,
      id: `activity-${++eventIdCounter}`,
      timestamp: Date.now(),
    };
    
    set((state) => {
      if (category === 'poker') {
        const updatedEvents = [newEvent, ...state.pokerEvents].slice(0, state.maxEvents);
        return { pokerEvents: updatedEvents };
      } else {
        const updatedEvents = [newEvent, ...state.minionEvents].slice(0, state.maxEvents);
        return { minionEvents: updatedEvents };
      }
    });
  },
  
  clearEvents: (category) => {
    if (category === 'poker') {
      set({ pokerEvents: [] });
    } else if (category === 'minion') {
      set({ minionEvents: [] });
    } else {
      set({ minionEvents: [], pokerEvents: [] });
    }
  },
}));

/**
 * Selector to get all events combined (for backward compatibility)
 */
export function useAllEvents(): ActivityEvent[] {
  const minionEvents = useActivityLogStore(state => state.minionEvents);
  const pokerEvents = useActivityLogStore(state => state.pokerEvents);
  const maxEvents = useActivityLogStore(state => state.maxEvents);
  
  return [...minionEvents, ...pokerEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxEvents);
}

/**
 * Helper function to log activity events from anywhere in the app
 */
export function logActivity(
  type: ActivityEventType,
  actor: 'player' | 'opponent' | 'system',
  summary: string,
  options?: {
    actorName?: string;
    targetName?: string;
    value?: number;
    cardName?: string;
    cardId?: number;
  }
) {
  useActivityLogStore.getState().addEvent({
    type,
    actor,
    summary,
    ...options,
  });
}
