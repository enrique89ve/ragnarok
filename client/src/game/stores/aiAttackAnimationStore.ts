import { create } from 'zustand';
import { CombatStep } from '../services/AttackResolutionService';
import { debug } from '../config/debugConfig';

export interface AIAttackEvent {
  id: string;
  attackerId: string;
  attackerName: string;
  targetId: string | null;
  targetName: string;
  targetType: 'hero' | 'minion';
  damage: number;
  counterDamage: number;
  timestamp: number;
  damageApplied?: boolean;
  combatStepId: string;
  attackerHasDivineShield: boolean;
  defenderHasDivineShield: boolean;
  attackerSide: 'player' | 'opponent';
}

interface AIAttackAnimationState {
  pendingAttacks: AIAttackEvent[];
  currentAttack: AIAttackEvent | null;
  isAnimating: boolean;
  deferDamage: boolean;
  
  queueAttack: (event: Omit<AIAttackEvent, 'id' | 'timestamp'>) => void;
  queueAttackFromStep: (step: CombatStep & { damageApplied?: boolean }) => void;
  startAnimation: () => AIAttackEvent | null;
  completeAnimation: () => void;
  clearAll: () => void;
  markDamageApplied: () => void;
  setDeferDamage: (defer: boolean) => void;
}

let attackIdCounter = 0;

export const useAIAttackAnimationStore = create<AIAttackAnimationState>((set, get) => ({
  pendingAttacks: [],
  currentAttack: null,
  isAnimating: false,
  deferDamage: false,
  
  setDeferDamage: (defer) => {
    set({ deferDamage: defer });
  },
  
  queueAttack: (event) => {
    const id = `ai-attack-${++attackIdCounter}-${Date.now()}`;
    const newEvent: AIAttackEvent = {
      ...event,
      id,
      timestamp: Date.now(),
      damageApplied: event.damageApplied ?? false
    };
    
    debug.animation(`[AI-ATTACK-ANIM] Queued attack: ${event.attackerName} -> ${event.targetName} (damageApplied: ${newEvent.damageApplied})`);
    
    set(state => ({
      pendingAttacks: [...state.pendingAttacks, newEvent]
    }));
  },
  
  queueAttackFromStep: (step: CombatStep & { damageApplied?: boolean }) => {
    const id = `ai-attack-${++attackIdCounter}-${Date.now()}`;
    const newEvent: AIAttackEvent = {
      id,
      attackerId: step.attackerId,
      attackerName: step.attackerName,
      targetId: step.targetId,
      targetName: step.targetName,
      targetType: step.targetType,
      damage: step.damage,
      counterDamage: step.counterDamage,
      timestamp: Date.now(),
      damageApplied: step.damageApplied ?? false,
      combatStepId: step.id,
      attackerHasDivineShield: step.attackerHasDivineShield,
      defenderHasDivineShield: step.defenderHasDivineShield,
      attackerSide: step.attackerSide
    };
    
    debug.animation(`[AI-ATTACK-ANIM] Queued attack from step: ${step.attackerName} -> ${step.targetName} (${step.damage} dmg, damageApplied: ${newEvent.damageApplied})`);
    
    set(state => ({
      pendingAttacks: [...state.pendingAttacks, newEvent]
    }));
  },
  
  startAnimation: () => {
    const state = get();
    
    if (state.pendingAttacks.length === 0 || state.isAnimating) {
      return null;
    }
    
    const [next, ...rest] = state.pendingAttacks;
    
    debug.animation(`[AI-ATTACK-ANIM] Starting animation: ${next.attackerName} -> ${next.targetName}`);
    
    set({
      currentAttack: next,
      pendingAttacks: rest,
      isAnimating: true
    });
    
    return next;
  },
  
  completeAnimation: () => {
    debug.animation('[AI-ATTACK-ANIM] Animation complete');
    set({
      currentAttack: null,
      isAnimating: false
    });
  },
  
  clearAll: () => {
    set({
      pendingAttacks: [],
      currentAttack: null,
      isAnimating: false
    });
  },
  
  markDamageApplied: () => {
    const state = get();
    if (state.currentAttack && !state.currentAttack.damageApplied) {
      set({
        currentAttack: { ...state.currentAttack, damageApplied: true }
      });
    }
  }
}));

export function queueAIAttackAnimation(
  attackerName: string,
  attackerId: string,
  targetName: string,
  targetId: string | null,
  targetType: 'hero' | 'minion',
  damage: number,
  counterDamage: number = 0,
  attackerHasDivineShield: boolean = false,
  defenderHasDivineShield: boolean = false,
  attackerSide: 'player' | 'opponent' = 'opponent',
  damageAlreadyApplied: boolean = false
): void {
  useAIAttackAnimationStore.getState().queueAttack({
    attackerId,
    attackerName,
    targetId,
    targetName,
    targetType,
    damage,
    counterDamage,
    combatStepId: `legacy-${Date.now()}`,
    attackerHasDivineShield,
    defenderHasDivineShield,
    attackerSide,
    damageApplied: damageAlreadyApplied
  });
}
