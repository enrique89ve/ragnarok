/**
 * UnifiedAnimationOrchestrator.ts
 * 
 * Centralized animation orchestration service that consolidates all animation
 * management into a single system with:
 * - Cancelable timer management
 * - Phase-aware cleanup
 * - Animation queuing and sequencing
 * - Proper lifecycle management
 */

import { debug } from '../config/debugConfig';
import { create } from 'zustand';

export type AnimationCategory = 
  | 'summon'
  | 'attack'
  | 'damage'
  | 'heal'
  | 'spell'
  | 'death'
  | 'battlecry'
  | 'deathrattle'
  | 'buff'
  | 'announcement'
  | 'particle'
  | 'transition'
  | 'shuffle';

export type AnimationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Position {
  x: number;
  y: number;
}

export interface AnimationEffect {
  id: string;
  category: AnimationCategory;
  priority: AnimationPriority;
  position?: Position;
  sourcePosition?: Position;
  targetPosition?: Position;
  data: Record<string, any>;
  startTime: number;
  duration: number;
  phase?: string;
  onComplete?: () => void;
}

interface TimerHandle {
  id: string;
  timeoutId: ReturnType<typeof setTimeout>;
  phase?: string;
  category: AnimationCategory;
}

interface AnimationOrchestratorState {
  activeEffects: Map<string, AnimationEffect>;
  effectQueue: AnimationEffect[];
  isProcessing: boolean;
  currentPhase: string | null;
  timerHandles: Map<string, TimerHandle>;
  
  scheduleEffect: (effect: Omit<AnimationEffect, 'id' | 'startTime'>) => string;
  cancelEffect: (id: string) => void;
  cancelCategory: (category: AnimationCategory) => void;
  cancelPhase: (phase: string) => void;
  cancelAll: () => void;
  setPhase: (phase: string) => void;
  getActiveEffects: () => AnimationEffect[];
  getEffectsByCategory: (category: AnimationCategory) => AnimationEffect[];
}

let effectIdCounter = 0;

const generateEffectId = (category: AnimationCategory): string => {
  return `${category}-${++effectIdCounter}-${Date.now()}`;
};

export const useAnimationOrchestrator = create<AnimationOrchestratorState>((set, get) => ({
  activeEffects: new Map(),
  effectQueue: [],
  isProcessing: false,
  currentPhase: null,
  timerHandles: new Map(),
  
  scheduleEffect: (effectConfig) => {
    const id = generateEffectId(effectConfig.category);
    const effect: AnimationEffect = {
      ...effectConfig,
      id,
      startTime: Date.now(),
    };
    
    set(state => {
      const newEffects = new Map(state.activeEffects);
      newEffects.set(id, effect);
      return { activeEffects: newEffects };
    });
    
    const timeoutId = setTimeout(() => {
      // Use a single atomic state update to prevent race conditions
      set(s => {
        const newEffects = new Map(s.activeEffects);
        newEffects.delete(id);
        const newHandles = new Map(s.timerHandles);
        newHandles.delete(id);
        return { activeEffects: newEffects, timerHandles: newHandles };
      });
      
      effect.onComplete?.();
    }, effect.duration);
    
    const handle: TimerHandle = {
      id,
      timeoutId,
      phase: effect.phase,
      category: effect.category,
    };
    
    set(state => {
      const newHandles = new Map(state.timerHandles);
      newHandles.set(id, handle);
      return { timerHandles: newHandles };
    });
    
    return id;
  },
  
  cancelEffect: (id) => {
    const state = get();
    const handle = state.timerHandles.get(id);
    
    if (handle) {
      clearTimeout(handle.timeoutId);
    }
    
    set(s => {
      const newEffects = new Map(s.activeEffects);
      newEffects.delete(id);
      const newHandles = new Map(s.timerHandles);
      newHandles.delete(id);
      return { activeEffects: newEffects, timerHandles: newHandles };
    });
  },
  
  cancelCategory: (category) => {
    const state = get();
    const toCancel: string[] = [];
    
    state.timerHandles.forEach((handle, id) => {
      if (handle.category === category) {
        clearTimeout(handle.timeoutId);
        toCancel.push(id);
      }
    });
    
    set(s => {
      const newEffects = new Map(s.activeEffects);
      const newHandles = new Map(s.timerHandles);
      toCancel.forEach(id => {
        newEffects.delete(id);
        newHandles.delete(id);
      });
      return { activeEffects: newEffects, timerHandles: newHandles };
    });
  },
  
  cancelPhase: (phase) => {
    const state = get();
    const toCancel: string[] = [];
    
    state.timerHandles.forEach((handle, id) => {
      if (handle.phase === phase) {
        clearTimeout(handle.timeoutId);
        toCancel.push(id);
      }
    });
    
    set(s => {
      const newEffects = new Map(s.activeEffects);
      const newHandles = new Map(s.timerHandles);
      toCancel.forEach(id => {
        newEffects.delete(id);
        newHandles.delete(id);
      });
      return { activeEffects: newEffects, timerHandles: newHandles };
    });
  },
  
  cancelAll: () => {
    const state = get();
    
    state.timerHandles.forEach(handle => {
      clearTimeout(handle.timeoutId);
    });
    
    set({
      activeEffects: new Map(),
      timerHandles: new Map(),
      effectQueue: [],
      isProcessing: false,
    });
  },
  
  setPhase: (phase) => {
    const state = get();
    const previousPhase = state.currentPhase;
    
    if (previousPhase && previousPhase !== phase) {
      state.cancelPhase(previousPhase);
    }
    
    set({ currentPhase: phase });
  },
  
  getActiveEffects: () => {
    return Array.from(get().activeEffects.values());
  },
  
  getEffectsByCategory: (category) => {
    return Array.from(get().activeEffects.values()).filter(e => e.category === category);
  },
}));

export function scheduleSummonEffect(
  position: Position,
  cardName: string,
  rarity: 'basic' | 'common' | 'rare' | 'epic' | 'mythic',
  phase?: string
): string {
  const duration = rarity === 'mythic' ? 2000 : 1200;

  return useAnimationOrchestrator.getState().scheduleEffect({
    category: 'summon',
    priority: rarity === 'mythic' ? 'high' : 'normal',
    position,
    duration,
    phase,
    data: { cardName, rarity },
  });
}

export function scheduleAttackEffect(
  sourcePosition: Position,
  targetPosition: Position,
  damage: number,
  phase?: string
): string {
  return useAnimationOrchestrator.getState().scheduleEffect({
    category: 'attack',
    priority: 'high',
    sourcePosition,
    targetPosition,
    duration: 600,
    phase,
    data: { damage },
  });
}

export function scheduleDamageEffect(
  position: Position,
  damage: number,
  phase?: string
): string {
  return useAnimationOrchestrator.getState().scheduleEffect({
    category: 'damage',
    priority: 'normal',
    position,
    duration: 1000,
    phase,
    data: { damage },
  });
}

export function scheduleHealEffect(
  position: Position,
  amount: number,
  phase?: string
): string {
  return useAnimationOrchestrator.getState().scheduleEffect({
    category: 'heal',
    priority: 'normal',
    position,
    duration: 1000,
    phase,
    data: { amount },
  });
}

export function scheduleAnnouncementEffect(
  title: string,
  type: string,
  options?: {
    subtitle?: string;
    rarity?: string;
    duration?: number;
  }
): string {
  return useAnimationOrchestrator.getState().scheduleEffect({
    category: 'announcement',
    priority: 'high',
    duration: options?.duration || 1800,
    data: { title, type, ...options },
  });
}

export type SpellEffectType = 'damage' | 'heal' | 'buff' | 'debuff' | 'summon' | 'aoe' | 'draw' | 'quest' | 'transform' | 'default';

export function scheduleSpellEffect(
  spellName: string,
  description: string,
  spellType: SpellEffectType = 'default',
  options?: {
    duration?: number;
    phase?: string;
  }
): string {
  debug.animation(`[Animation] Scheduling spell effect: ${spellName} (${spellType})`);
  return useAnimationOrchestrator.getState().scheduleEffect({
    category: 'spell',
    priority: 'high',
    duration: options?.duration || 2000,
    phase: options?.phase,
    data: { spellName, description, spellType },
  });
}

export function scheduleShuffleEffect(
  heroName: string,
  cardCount: number = 10,
  sourcePosition?: Position,
  targetPosition?: Position,
  phase?: string
): string {
  if (typeof window === 'undefined') {
    debug.warn('[Animation] scheduleShuffleEffect called in non-browser context');
    return '';
  }
  
  const calculatedDuration = 1500 + (cardCount * 80);
  const defaultSource = { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 };
  const defaultTarget = { x: window.innerWidth / 2 + 100, y: window.innerHeight / 2 };
  
  return useAnimationOrchestrator.getState().scheduleEffect({
    category: 'shuffle',
    priority: 'high',
    duration: calculatedDuration,
    phase,
    data: { 
      heroName, 
      cardCount,
      sourcePosition: sourcePosition || defaultSource,
      targetPosition: targetPosition || defaultTarget
    },
  });
}

export function cancelAllAnimations(): void {
  useAnimationOrchestrator.getState().cancelAll();
}

export function cancelAnimationsByPhase(phase: string): void {
  useAnimationOrchestrator.getState().cancelPhase(phase);
}

export function cancelAnimationsByCategory(category: AnimationCategory): void {
  useAnimationOrchestrator.getState().cancelCategory(category);
}
