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

import { create } from 'zustand';
import {
	COMBAT_DAMAGE_NUMBER_CRITICAL_READ_MS,
	COMBAT_DAMAGE_NUMBER_READ_MS,
} from '@/game/combat/feedback/combatFeedback';
import {
	gameEffectCoordinator,
	type GameEffectHandle,
} from '@/game/effects/core/gameEffectCoordinator';

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
  effectHandle: GameEffectHandle;
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
    
    const effectHandle = gameEffectCoordinator.schedule({
      owner: 'animation-overlay',
      lane: effect.category,
      key: id,
      priority: effect.priority,
      delayMs: effect.duration,
      run: () => {
      // Use a single atomic state update to prevent race conditions
      set(s => {
        const newEffects = new Map(s.activeEffects);
        newEffects.delete(id);
        const newHandles = new Map(s.timerHandles);
        newHandles.delete(id);
        return { activeEffects: newEffects, timerHandles: newHandles };
      });

      effect.onComplete?.();
      },
    });

    const handle: TimerHandle = {
      id,
      effectHandle,
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
      handle.effectHandle.cancel();
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
        handle.effectHandle.cancel();
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
        handle.effectHandle.cancel();
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
      handle.effectHandle.cancel();
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

// Damage must remain readable after the impact/counter choreography has landed.
export const DAMAGE_EFFECT_DURATION_MS = COMBAT_DAMAGE_NUMBER_READ_MS;
export const DAMAGE_CRITICAL_EFFECT_DURATION_MS = COMBAT_DAMAGE_NUMBER_CRITICAL_READ_MS;

export function cancelAllAnimations(): void {
  useAnimationOrchestrator.getState().cancelAll();
}

export function cancelAnimationsByPhase(phase: string): void {
  useAnimationOrchestrator.getState().cancelPhase(phase);
}

export function cancelAnimationsByCategory(category: AnimationCategory): void {
  useAnimationOrchestrator.getState().cancelCategory(category);
}
