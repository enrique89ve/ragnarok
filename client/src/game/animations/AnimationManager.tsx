/**
 * AnimationManager.tsx
 * 
 * Manages and coordinates game animations, providing utilities
 * for position calculation and timing control.
 * 
 * Uses a Context-based system for React components and a global
 * animation queue for utility functions that need to add animations
 * from outside the React component tree.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AnimationParams } from '../types';

export interface Animation {
  id: string;
  type: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  position?: Position;
  sourcePosition?: Position;
  targetPosition?: Position;
  sourceId?: number;
  targetIds?: number[];
  value?: number;
  damage?: number;
  card?: any;
  spellType?: string;
  spellName?: string;
  targetName?: string;
  cardName?: string;
  playerId?: 'player' | 'opponent';
  playType?: 'spell' | 'minion' | 'weapon';
  particleType?: string;
  intensity?: 'normal' | 'critical' | number;
  scale?: number;
  effect?: string;
  data?: Record<string, any>;
}

export type AnimationType = 
  | 'attack'
  | 'damage'
  | 'heal'
  | 'spell'
  | 'spell_damage_popup'
  | 'card_burn'
  | 'battlecry'
  | 'deathrattle'
  | 'play'
  | 'draw'
  | 'death'
  | 'enhanced_death';

export interface Position {
  x: number;
  y: number;
}

export interface AnimationConfig {
  duration: number;
  type: string;
  target?: string;
}

// Global Animation Queue - simple event-based system for use outside React components
type AnimationListener = (animations: Animation[]) => void;

class GlobalAnimationQueue {
  private animations: Animation[] = [];
  private listeners: Set<AnimationListener> = new Set();
  private timerMap: Map<string, ReturnType<typeof setTimeout>> = new Map();

  getState() {
    return {
      animations: this.animations,
      addAnimation: this.addAnimation.bind(this),
      removeAnimation: this.removeAnimation.bind(this),
      clearAnimations: this.clearAnimations.bind(this),
    };
  }

  addAnimation(animation: Animation) {
    const animationWithDefaults = {
      ...animation,
      id: animation.id || `animation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: animation.startTime || Date.now(),
    };
    
    this.animations = [...this.animations, animationWithDefaults];
    this.notifyListeners();
    
    if (animation.duration) {
      const timerId = setTimeout(() => {
        this.timerMap.delete(animationWithDefaults.id);
        this.removeAnimation(animationWithDefaults.id);
      }, animation.duration);
      this.timerMap.set(animationWithDefaults.id, timerId);
    }
  }

  removeAnimation(id: string) {
    const timerId = this.timerMap.get(id);
    if (timerId) {
      clearTimeout(timerId);
      this.timerMap.delete(id);
    }
    this.animations = this.animations.filter(a => a.id !== id);
    this.notifyListeners();
  }

  clearAnimations() {
    this.timerMap.forEach(timerId => clearTimeout(timerId));
    this.timerMap.clear();
    this.animations = [];
    this.notifyListeners();
  }

  clearAll() {
    this.timerMap.forEach(timerId => clearTimeout(timerId));
    this.timerMap.clear();
    this.animations = [];
    this.listeners.clear();
  }

  subscribe(listener: AnimationListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.animations));
  }
}

const globalAnimationQueue = new GlobalAnimationQueue();

if (import.meta.hot) {
	import.meta.hot.dispose(() => globalAnimationQueue.clearAll());
}

interface AnimationStoreState {
  animations: Animation[];
  removeAnimation: (id: string) => void;
  clearAnimations: () => void;
}

interface AnimationStoreWithGetState extends AnimationStoreState {
  getState: () => ReturnType<GlobalAnimationQueue['getState']>;
}

export function useAnimationStore(): AnimationStoreWithGetState {
  const [animations, setAnimations] = useState<Animation[]>(globalAnimationQueue.getState().animations);
  
  useEffect(() => {
    const unsubscribe = globalAnimationQueue.subscribe((newAnimations) => {
      setAnimations(newAnimations);
    });
    return unsubscribe;
  }, []);
  
  return {
    animations,
    removeAnimation: globalAnimationQueue.removeAnimation.bind(globalAnimationQueue),
    clearAnimations: globalAnimationQueue.clearAnimations.bind(globalAnimationQueue),
    getState: () => globalAnimationQueue.getState(),
  };
}

useAnimationStore.getState = () => globalAnimationQueue.getState();

// Animation Context and Provider
interface AnimationContextType {
  animations: AnimationParams[];
  activeAnimation?: AnimationParams;
  isAnimating: boolean;
  queueAnimation: (animation: AnimationParams) => void;
  clearAnimations: () => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

interface AnimationProviderProps {
  children: ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  const [animations, setAnimations] = useState<AnimationParams[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<AnimationParams | undefined>(undefined);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const addAnimationToGlobalQueue = useCallback((animation: AnimationParams) => {
    const animationAny = animation as any;
    const queueAnimation: Animation = {
      id: `${animation.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: animation.type,
      startTime: Date.now(),
      duration: animation.duration || 1000,
      position: animation.position,
      sourcePosition: animationAny.sourcePosition,
      targetPosition: animationAny.targetPosition,
      sourceId: typeof animation.sourceId === 'number' ? animation.sourceId : undefined,
      targetIds: animationAny.targetIds,
      damage: animationAny.damage,
      card: animationAny.card
    };
    
    globalAnimationQueue.addAnimation(queueAnimation);
  }, []);
  
  const queueAnimation = useCallback((animation: AnimationParams) => {
    setAnimations(prev => [...prev, animation]);
    
    addAnimationToGlobalQueue(animation);
    
    if (!isAnimating) {
      setIsAnimating(true);
      setActiveAnimation(animation);
      
      const timer = setTimeout(() => {
        setActiveAnimation(undefined);
        setAnimations(prev => prev.slice(1));
        setIsAnimating(false);
        
        const animationAny = animation as any;
        if (animationAny.callback) {
          animationAny.callback();
        }
      }, animation.duration || 1000);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isAnimating, addAnimationToGlobalQueue]);
  
  const clearAnimations = useCallback(() => {
    setAnimations([]);
    setActiveAnimation(undefined);
    setIsAnimating(false);
    globalAnimationQueue.clearAnimations();
  }, []);
  
  return (
    <AnimationContext.Provider 
      value={{ 
        animations, 
        activeAnimation, 
        isAnimating, 
        queueAnimation, 
        clearAnimations 
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};

// Animation Utility Functions
export const calculateCenterPosition = (element: HTMLElement): Position => {
  if (!element) return { x: 0, y: 0 };
  
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
};

export const getRandomPositionAround = (center: Position, radius: number): Position => {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * radius;
  
  return {
    x: center.x + Math.cos(angle) * distance,
    y: center.y + Math.sin(angle) * distance
  };
};

export const calculatePath = (
  start: Position, 
  end: Position, 
  curveStrength: number = 0.3,
  segments: number = 20
): Position[] => {
  const path: Position[] = [];
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 - (Math.abs(end.x - start.x) * curveStrength);
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    
    const x = Math.pow(1 - t, 2) * start.x + 
              2 * (1 - t) * t * midX + 
              Math.pow(t, 2) * end.x;
              
    const y = Math.pow(1 - t, 2) * start.y + 
              2 * (1 - t) * t * midY + 
              Math.pow(t, 2) * end.y;
              
    path.push({ x, y });
  }
  
  return path;
};

export default {
  calculateCenterPosition,
  getRandomPositionAround,
  calculatePath
};
