/**
 * UnifiedUIStore - Consolidated UI State
 * 
 * Combines animations, targeting, activity log, announcements, and visual effects
 * into a single coherent store for all UI operations.
 */

import { create } from 'zustand';

export type AnimationType = 
  | 'attack'
  | 'damage'
  | 'heal'
  | 'death'
  | 'summon'
  | 'spell'
  | 'buff'
  | 'debuff'
  | 'card_draw'
  | 'card_play'
  | 'hero_power'
  | 'weapon'
  | 'secret'
  | 'poker_deal'
  | 'poker_bet'
  | 'poker_win';

export type AnnouncementType = 
  | 'battlecry'
  | 'deathrattle'
  | 'spell'
  | 'attack'
  | 'damage'
  | 'heal'
  | 'buff'
  | 'summon'
  | 'draw'
  | 'discover'
  | 'secret'
  | 'mythic'
  | 'combo'
  | 'taunt'
  | 'divine_shield'
  | 'freeze'
  | 'silence'
  | 'transform'
  | 'destroy'
  | 'phase_change'
  | 'turn_start'
  | 'turn_end'
  | 'victory'
  | 'defeat'
  | 'poker_check'
  | 'poker_bet'
  | 'poker_call'
  | 'poker_fold'
  | 'blocked'
  | 'effect_failed'
  | 'condition_not_met'
  | 'warning'
  | 'info'
  | 'status_effect';

export interface ActionAnnouncement {
  id: string;
  type: AnnouncementType;
  title: string;
  subtitle?: string;
  icon?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'mythic';
  cardClass?: string;
  duration?: number;
}

export function getAnnouncementConfig(type: AnnouncementType): { icon: string; color: string } {
  const configs: Record<AnnouncementType, { icon: string; color: string }> = {
    battlecry: { icon: '⚔️', color: '#FFD700' },
    deathrattle: { icon: '💀', color: '#9B59B6' },
    spell: { icon: '✨', color: '#3498DB' },
    attack: { icon: '🗡️', color: '#E74C3C' },
    damage: { icon: '💥', color: '#E74C3C' },
    heal: { icon: '💚', color: '#2ECC71' },
    buff: { icon: '💪', color: '#F39C12' },
    summon: { icon: '🧩', color: '#1ABC9C' },
    draw: { icon: '📜', color: '#3498DB' },
    discover: { icon: '🔮', color: '#9B59B6' },
    secret: { icon: '❓', color: '#E91E63' },
    mythic: { icon: '👑', color: '#FF8C00' },
    combo: { icon: '🎯', color: '#F1C40F' },
    taunt: { icon: '🛡️', color: '#7F8C8D' },
    divine_shield: { icon: '✨', color: '#F1C40F' },
    freeze: { icon: '❄️', color: '#00BCD4' },
    silence: { icon: '🔇', color: '#95A5A6' },
    transform: { icon: '🔄', color: '#9B59B6' },
    destroy: { icon: '💀', color: '#2C3E50' },
    phase_change: { icon: '⚡', color: '#E67E22' },
    turn_start: { icon: '🌅', color: '#3498DB' },
    turn_end: { icon: '🌙', color: '#34495E' },
    victory: { icon: '🏆', color: '#FFD700' },
    defeat: { icon: '💔', color: '#7F8C8D' },
    poker_check: { icon: '🛡️', color: '#4CAF50' },
    poker_bet: { icon: '⚔️', color: '#FF9800' },
    poker_call: { icon: '⚔️', color: '#2196F3' },
    poker_fold: { icon: '🛡️', color: '#9E9E9E' },
    blocked: { icon: '🚫', color: '#E74C3C' },
    effect_failed: { icon: '❌', color: '#95A5A6' },
    condition_not_met: { icon: '⚠️', color: '#F39C12' },
    warning: { icon: '⚠️', color: '#FF9800' },
    info: { icon: 'ℹ️', color: '#2196F3' },
    status_effect: { icon: '🔮', color: '#A855F7' }
  };
  
  return configs[type] || { icon: '✨', color: '#FFFFFF' };
}

export const ANNOUNCEMENT_DURATIONS: Record<string, number> = {
  default: 1800,
  short: 1200,
  long: 2500,
};

export interface Animation {
  id: string;
  type: AnimationType;
  sourceId: string;
  targetId?: string;
  value?: number;
  startTime: number;
  duration: number;
  data?: Record<string, unknown>;
}

export interface TargetingState {
  isTargeting: boolean;
  sourceId: string | null;
  sourceType: 'minion' | 'hero' | 'spell' | 'hero_power' | null;
  validTargets: string[];
  targetingMode: 'friendly' | 'enemy' | 'any' | 'minion' | 'hero' | null;
  hoveredTargetId: string | null;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  type: 'action' | 'info' | 'warning' | 'error';
  message: string;
  actor?: string;
}

export interface TooltipState {
  isVisible: boolean;
  content: unknown;
  position: { x: number; y: number };
  anchor: 'top' | 'bottom' | 'left' | 'right';
}

export interface ModalState {
  isOpen: boolean;
  type: string | null;
  data: Record<string, unknown>;
}

interface UnifiedUIStore {
  animations: Animation[];
  animationQueue: Animation[];
  isAnimating: boolean;
  
  announcements: ActionAnnouncement[];
  currentAnnouncement: ActionAnnouncement | null;
  isProcessingAnnouncements: boolean;
  
  targeting: TargetingState;
  
  activityLog: ActivityLogEntry[];
  
  tooltip: TooltipState;
  modal: ModalState;
  
  queueAnimation: (animation: Omit<Animation, 'id' | 'startTime'>) => string;
  playNextAnimation: () => Animation | null;
  completeAnimation: (id: string) => void;
  clearAnimations: () => void;
  
  addAnnouncement: (announcement: Omit<ActionAnnouncement, 'id'>) => void;
  removeAnnouncement: (id: string) => void;
  processNextAnnouncement: () => void;
  clearAnnouncements: () => void;
  
  startTargeting: (sourceId: string, sourceType: TargetingState['sourceType'], validTargets: string[], mode: TargetingState['targetingMode']) => void;
  selectTarget: (targetId: string) => string | null;
  setHoveredTarget: (targetId: string | null) => void;
  cancelTargeting: () => void;
  
  addLogEntry: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
  clearLog: () => void;
  
  showTooltip: (content: unknown, position: { x: number; y: number }, anchor?: TooltipState['anchor']) => void;
  hideTooltip: () => void;
  
  openModal: (type: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  
  reset: () => void;
}

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const ANIMATION_DURATIONS: Record<AnimationType, number> = {
  attack: 500,
  damage: 400,
  heal: 400,
  death: 800,
  summon: 600,
  spell: 700,
  buff: 400,
  debuff: 400,
  card_draw: 300,
  card_play: 400,
  hero_power: 500,
  weapon: 400,
  secret: 500,
  poker_deal: 300,
  poker_bet: 200,
  poker_win: 1000,
};

let announcementIdCounter = 0;

export const useUnifiedUIStore = create<UnifiedUIStore>((set, get) => ({
  animations: [],
  animationQueue: [],
  isAnimating: false,
  
  announcements: [],
  currentAnnouncement: null,
  isProcessingAnnouncements: false,
  
  targeting: {
    isTargeting: false,
    sourceId: null,
    sourceType: null,
    validTargets: [],
    targetingMode: null,
    hoveredTargetId: null,
  },
  
  activityLog: [],
  
  tooltip: {
    isVisible: false,
    content: null,
    position: { x: 0, y: 0 },
    anchor: 'top',
  },
  
  modal: {
    isOpen: false,
    type: null,
    data: {},
  },
  
  queueAnimation: (animation) => {
    const id = generateId();
    const duration = ANIMATION_DURATIONS[animation.type] || 500;
    
    const speedMultiplier = 1;
    
    const fullAnimation: Animation = {
      ...animation,
      id,
      startTime: 0,
      duration: duration * speedMultiplier,
    };
    
    set({
      animationQueue: [...get().animationQueue, fullAnimation],
    });
    
    return id;
  },

  playNextAnimation: () => {
    const queue = get().animationQueue;
    if (queue.length === 0) {
      set({ isAnimating: false });
      return null;
    }
    
    const [next, ...rest] = queue;
    const playingAnimation = { ...next, startTime: Date.now() };
    
    set({
      animationQueue: rest,
      animations: [...get().animations, playingAnimation],
      isAnimating: true,
    });
    
    return playingAnimation;
  },

  completeAnimation: (id) => {
    set({
      animations: get().animations.filter((a) => a.id !== id),
    });
    
    if (get().animations.length === 0 && get().animationQueue.length === 0) {
      set({ isAnimating: false });
    }
  },

  clearAnimations: () => {
    set({
      animations: [],
      animationQueue: [],
      isAnimating: false,
    });
  },

  addAnnouncement: (announcement) => {
    const id = `announcement-${++announcementIdCounter}-${Date.now()}`;
    const newAnnouncement: ActionAnnouncement = {
      ...announcement,
      id,
      duration: announcement.duration || 1800
    };
    
    set(state => ({
      announcements: [...state.announcements, newAnnouncement]
    }));
    
    const state = get();
    if (!state.isProcessingAnnouncements) {
      get().processNextAnnouncement();
    }
  },

  removeAnnouncement: (id) => {
    set(state => ({
      announcements: state.announcements.filter(a => a.id !== id),
      currentAnnouncement: state.currentAnnouncement?.id === id ? null : state.currentAnnouncement
    }));
  },

  processNextAnnouncement: () => {
    const state = get();
    
    if (state.announcements.length === 0) {
      set({ isProcessingAnnouncements: false, currentAnnouncement: null });
      return;
    }
    
    const [next, ...rest] = state.announcements;
    
    set({
      isProcessingAnnouncements: true,
      currentAnnouncement: next,
      announcements: rest
    });
    
    setTimeout(() => {
      set({ currentAnnouncement: null });
      setTimeout(() => {
        get().processNextAnnouncement();
      }, 150);
    }, next.duration || 1800);
  },

  clearAnnouncements: () => {
    set({
      announcements: [],
      currentAnnouncement: null,
      isProcessingAnnouncements: false,
    });
  },

  startTargeting: (sourceId, sourceType, validTargets, mode) => {
    set({
      targeting: {
        isTargeting: true,
        sourceId,
        sourceType,
        validTargets,
        targetingMode: mode,
        hoveredTargetId: null,
      },
    });
  },

  selectTarget: (targetId) => {
    const { targeting } = get();
    if (!targeting.isTargeting || !targeting.validTargets.includes(targetId)) {
      return null;
    }
    
    const sourceId = targeting.sourceId;
    get().cancelTargeting();
    return sourceId;
  },

  setHoveredTarget: (targetId) => {
    const { targeting } = get();
    if (targetId && !targeting.validTargets.includes(targetId)) {
      return;
    }
    set({
      targeting: {
        ...targeting,
        hoveredTargetId: targetId,
      },
    });
  },

  cancelTargeting: () => {
    set({
      targeting: {
        isTargeting: false,
        sourceId: null,
        sourceType: null,
        validTargets: [],
        targetingMode: null,
        hoveredTargetId: null,
      },
    });
  },

  addLogEntry: (entry) => {
    set({
      activityLog: [
        ...get().activityLog,
        {
          ...entry,
          id: generateId(),
          timestamp: Date.now(),
        },
      ].slice(-100),
    });
  },

  clearLog: () => {
    set({ activityLog: [] });
  },

  showTooltip: (content, position, anchor = 'top') => {
    set({
      tooltip: {
        isVisible: true,
        content,
        position,
        anchor,
      },
    });
  },

  hideTooltip: () => {
    set({
      tooltip: {
        isVisible: false,
        content: null,
        position: { x: 0, y: 0 },
        anchor: 'top',
      },
    });
  },

  openModal: (type, data = {}) => {
    set({
      modal: {
        isOpen: true,
        type,
        data,
      },
    });
  },

  closeModal: () => {
    set({
      modal: {
        isOpen: false,
        type: null,
        data: {},
      },
    });
  },

  reset: () => {
    set({
      animations: [],
      animationQueue: [],
      isAnimating: false,
      announcements: [],
      currentAnnouncement: null,
      isProcessingAnnouncements: false,
      targeting: {
        isTargeting: false,
        sourceId: null,
        sourceType: null,
        validTargets: [],
        targetingMode: null,
        hoveredTargetId: null,
      },
      activityLog: [],
      tooltip: {
        isVisible: false,
        content: null,
        position: { x: 0, y: 0 },
        anchor: 'top',
      },
      modal: {
        isOpen: false,
        type: null,
        data: {},
      },
    });
  },
}));

export function fireAnnouncement(
  type: AnnouncementType,
  title: string,
  options?: {
    subtitle?: string;
    rarity?: 'common' | 'rare' | 'epic' | 'mythic';
    cardClass?: string;
    duration?: number;
  }
) {
  const config = getAnnouncementConfig(type);
  
  useUnifiedUIStore.getState().addAnnouncement({
    type,
    title,
    subtitle: options?.subtitle,
    icon: config.icon,
    rarity: options?.rarity,
    cardClass: options?.cardClass,
    duration: options?.duration
  });
}
