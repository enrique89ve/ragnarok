/**
 * Animation Adapter Hook
 * 
 * Provides announcement state from unifiedUIStore.
 * Components import this instead of directly using the store.
 */

import { useUnifiedUIStore, AnnouncementType, ActionAnnouncement, getAnnouncementConfig, fireAnnouncement } from '../stores/unifiedUIStore';

export type { AnnouncementType, ActionAnnouncement };
export { getAnnouncementConfig, fireAnnouncement };

export interface AnimationAdapter {
  currentAnnouncement: ActionAnnouncement | null;
  isProcessing: boolean;
  addAnnouncement: (announcement: Omit<ActionAnnouncement, 'id'>) => void;
  clearAll: () => void;
}

export function useAnimationAdapter(): AnimationAdapter {
  const store = useUnifiedUIStore();

  return {
    currentAnnouncement: store.currentAnnouncement,
    isProcessing: store.isProcessingAnnouncements,
    addAnnouncement: store.addAnnouncement,
    clearAll: store.clearAnnouncements,
  };
}

export function fireAnnouncementAdapter(
  type: AnnouncementType,
  title: string,
  options?: {
    subtitle?: string;
    rarity?: 'common' | 'rare' | 'epic' | 'mythic';
    cardClass?: string;
    duration?: number;
    icon?: string;
  }
) {
  fireAnnouncement(type, title, options);
}
