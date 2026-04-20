import { create } from 'zustand';
import { GameState, CardInstance } from '../types';
import { debug } from '../config/debugConfig';
import { destroyCard } from '../utils/zoneUtils';
import { updateEnrageEffects } from '../utils/mechanics/enrageUtils';
import { processFrenzyEffects } from '../utils/mechanics/frenzyUtils';
import { processAfterAttackEffects } from '../utils/mechanics/afterAttackUtils';

export interface CombatStep {
  id: string;
  attackerId: string;
  attackerName: string;
  attackerAttack: number;
  targetId: string | null;
  targetName: string;
  targetType: 'hero' | 'minion';
  targetAttack: number;
  damage: number;
  counterDamage: number;
  attackerHasDivineShield: boolean;
  defenderHasDivineShield: boolean;
  resolved: boolean;
  timestamp: number;
  attackerSide: 'player' | 'opponent';
}

interface AttackResolutionState {
  pendingSteps: CombatStep[];
  preAttackState: GameState | null;
  postAttackState: GameState | null;
  isProcessing: boolean;
  
  initializeAttackSequence: (preState: GameState, postState: GameState, steps: CombatStep[]) => void;
  resolveStep: (stepId: string, applyDamage: (step: CombatStep) => void) => CombatStep | null;
  getNextUnresolvedStep: () => CombatStep | null;
  clearAll: () => void;
  isComplete: () => boolean;
}

let stepIdCounter = 0;

export function createCombatStep(
  attackerId: string,
  attackerName: string,
  attackerAttack: number,
  targetId: string | null,
  targetName: string,
  targetType: 'hero' | 'minion',
  targetAttack: number,
  attackerHasDivineShield: boolean,
  defenderHasDivineShield: boolean,
  attackerSide: 'player' | 'opponent' = 'opponent'
): CombatStep {
  return {
    id: `combat-step-${++stepIdCounter}-${Date.now()}`,
    attackerId,
    attackerName,
    attackerAttack,
    targetId,
    targetName,
    targetType,
    targetAttack,
    damage: attackerAttack,
    counterDamage: targetType === 'minion' ? targetAttack : 0,
    attackerHasDivineShield,
    defenderHasDivineShield,
    resolved: false,
    timestamp: Date.now(),
    attackerSide
  };
}

export const useAttackResolutionStore = create<AttackResolutionState>((set, get) => ({
  pendingSteps: [],
  preAttackState: null,
  postAttackState: null,
  isProcessing: false,
  
  initializeAttackSequence: (preState, postState, steps) => {
    debug.combat(`[AttackResolution] Initializing sequence with ${steps.length} steps`);
    set({
      preAttackState: preState,
      postAttackState: postState,
      pendingSteps: steps,
      isProcessing: true
    });
  },
  
  resolveStep: (stepId, applyDamage) => {
    const state = get();
    const stepIndex = state.pendingSteps.findIndex(s => s.id === stepId);
    
    if (stepIndex === -1) {
      debug.warn(`[AttackResolution] Step ${stepId} not found`);
      return null;
    }
    
    const step = state.pendingSteps[stepIndex];
    
    if (step.resolved) {
      debug.warn(`[AttackResolution] Step ${stepId} already resolved`);
      return step;
    }
    
    debug.combat(`[AttackResolution] Resolving step: ${step.attackerName} -> ${step.targetName}`);
    
    applyDamage(step);
    
    const updatedSteps = [...state.pendingSteps];
    updatedSteps[stepIndex] = { ...step, resolved: true };
    
    set({ pendingSteps: updatedSteps });
    
    return step;
  },
  
  getNextUnresolvedStep: () => {
    const state = get();
    return state.pendingSteps.find(s => !s.resolved) || null;
  },
  
  clearAll: () => {
    debug.combat('[AttackResolution] Clearing all steps');
    set({
      pendingSteps: [],
      preAttackState: null,
      postAttackState: null,
      isProcessing: false
    });
  },
  
  isComplete: () => {
    const state = get();
    return state.pendingSteps.length === 0 || state.pendingSteps.every(s => s.resolved);
  }
}));

export function applyDamageToState(
  state: GameState,
  step: CombatStep
): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  const damagedMinionIds: { id: string; playerId: 'player' | 'opponent' }[] = [];
  
  // Use the explicitly tracked attackerSide from the step
  const attackerSide: 'player' | 'opponent' = step.attackerSide;
  const defenderSide: 'player' | 'opponent' = attackerSide === 'player' ? 'opponent' : 'player';
  
  debug.combat(`[AttackResolution] ${attackerSide} attacking ${defenderSide} - ${step.attackerName} -> ${step.targetName}`);
  
  if (step.targetType === 'hero') {
    const targetPlayer = newState.players[defenderSide];
    let remainingDamage = step.damage;
    
    // Handle armor absorption first
    const armorAmount = targetPlayer.heroArmor || 0;
    if (armorAmount > 0) {
      if (armorAmount >= remainingDamage) {
        targetPlayer.heroArmor = armorAmount - remainingDamage;
        remainingDamage = 0;
      } else {
        targetPlayer.heroArmor = 0;
        remainingDamage = remainingDamage - armorAmount;
      }
    }
    
    // Apply remaining damage to health - update BOTH health properties for UI sync
    if (remainingDamage > 0) {
      const prevHealth = targetPlayer.health;
      const prevHeroHealth = targetPlayer.heroHealth ?? prevHealth;
      targetPlayer.health = Math.max(0, prevHealth - remainingDamage);
      targetPlayer.heroHealth = Math.max(0, prevHeroHealth - remainingDamage);
    }
    
    debug.combat(`[AttackResolution] ${defenderSide} Hero takes ${step.damage} damage (${remainingDamage} after armor), now at ${targetPlayer.heroHealth} HP`);
    
    const finalHeroHealth = targetPlayer.heroHealth ?? targetPlayer.health;
    if (finalHeroHealth <= 0 || targetPlayer.health <= 0) {
      newState.gamePhase = "game_over";
      newState.winner = attackerSide;
    }
  } else if (step.targetId) {
    const defenderIndex = newState.players[defenderSide].battlefield.findIndex(
      c => c.instanceId === step.targetId
    );
    
    if (defenderIndex !== -1) {
      const defender = newState.players[defenderSide].battlefield[defenderIndex];
      
      if (step.defenderHasDivineShield) {
        newState.players[defenderSide].battlefield[defenderIndex].hasDivineShield = false;
        debug.combat(`[AttackResolution] ${defender.card.name}'s Divine Shield absorbed damage`);
      } else {
        const baseHealth = 'health' in defender.card ? (defender.card as any).health : 1;
        const currentHP = defender.currentHealth ?? baseHealth;
        const newHP = Math.max(0, currentHP - step.damage);
        newState.players[defenderSide].battlefield[defenderIndex].currentHealth = newHP;
        debug.combat(`[AttackResolution] ${defender.card.name} takes ${step.damage} damage, now at ${newHP} HP`);
        
        damagedMinionIds.push({ id: step.targetId, playerId: defenderSide });
        
        if (newHP <= 0) {
          debug.combat(`[AttackResolution] ${defender.card.name} is destroyed`);
          newState = destroyCard(newState, step.targetId, defenderSide);
        }
      }
    }
    
    const attackerIndex = newState.players[attackerSide].battlefield.findIndex(
      c => c.instanceId === step.attackerId
    );
    
    if (attackerIndex !== -1 && step.counterDamage > 0) {
      const attacker = newState.players[attackerSide].battlefield[attackerIndex];
      
      if (step.attackerHasDivineShield) {
        newState.players[attackerSide].battlefield[attackerIndex].hasDivineShield = false;
        debug.combat(`[AttackResolution] ${attacker.card.name}'s Divine Shield absorbed counter damage`);
      } else {
        const baseHealth = 'health' in attacker.card ? (attacker.card as any).health : 1;
        const currentHP = attacker.currentHealth ?? baseHealth;
        const newHP = Math.max(0, currentHP - step.counterDamage);
        newState.players[attackerSide].battlefield[attackerIndex].currentHealth = newHP;
        debug.combat(`[AttackResolution] ${attacker.card.name} takes ${step.counterDamage} counter damage, now at ${newHP} HP`);
        
        damagedMinionIds.push({ id: step.attackerId, playerId: attackerSide });
        
        if (newHP <= 0) {
          debug.combat(`[AttackResolution] ${attacker.card.name} is destroyed`);
          newState = destroyCard(newState, step.attackerId, attackerSide);
        }
      }
    }
    
    newState = updateEnrageEffects(newState);
    
    if (damagedMinionIds.length > 0) {
      newState = processFrenzyEffects(newState, damagedMinionIds);
    }
    
    const attackerStillExists = newState.players[attackerSide].battlefield.some(
      c => c.instanceId === step.attackerId
    );
    if (attackerStillExists) {
      newState = processAfterAttackEffects(newState, 'minion', step.attackerId, attackerSide);
    }
  }
  
  return newState;
}
