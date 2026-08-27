import { create } from 'zustand';
import { GameState, CardInstance } from '../types';
import { debug } from '../config/debugConfig';
import { destroyCard } from '../utils/zoneUtils';
import { updateEnrageEffects } from '../utils/mechanics/enrageUtils';
import { processFrenzyEffects } from '../utils/mechanics/frenzyUtils';
import { processAfterAttackEffects } from '../utils/mechanics/afterAttackUtils';
import { getHealth } from '../utils/cards/typeGuards';

export type CombatSide = 'player' | 'opponent';

export type ResolvedStatChange = {
	readonly entityId: string;
	readonly stat: 'attack';
	readonly before: number;
	readonly after: number;
};

export type ResolvedZoneChange = {
	readonly entityId: string;
	readonly from: 'battlefield';
	readonly to: 'graveyard';
};

/**
 * Gameplay-owned facts produced after an attack has been applied.
 *
 * `damageToTarget` and `damageToAttacker` are the resolved combat amounts
 * before a Divine Shield absorbs them. The health deltas are exposed
 * separately so a renderer can distinguish an impact from actual HP loss.
 * No presentation code should read CardInstance stats to reconstruct these
 * values.
 */
export type ResolvedAttack = {
	readonly id: string;
	readonly attackerId: string;
	readonly targetId: string | null;
	readonly targetType: 'hero' | 'minion';
	readonly attackerSide: CombatSide;
	readonly damageToTarget: number;
	readonly damageToAttacker: number;
	readonly healthDamageToTarget: number;
	readonly healthDamageToAttacker: number;
	readonly targetHealthBefore: number;
	readonly targetHealthAfter: number;
	readonly attackerHealthBefore: number;
	readonly attackerHealthAfter: number;
	readonly targetShieldConsumed: boolean;
	readonly attackerShieldConsumed: boolean;
	readonly targetLethal: boolean;
	readonly attackerLethal: boolean;
	readonly counterAttackOccurred: boolean;
	readonly triggeredEffects: readonly string[];
	readonly statChanges: readonly ResolvedStatChange[];
	readonly zoneChanges: readonly ResolvedZoneChange[];
};

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
	return resolveDamageToState(state, step).state;
}

export function resolveDamageToState(
	state: GameState,
	step: CombatStep,
): { readonly state: GameState; readonly resolvedAttack: ResolvedAttack } {
	const newState = applyDamageToStateInternal(state, step);
	return {
		state: newState,
		resolvedAttack: createResolvedAttackFromStates(state, newState, step),
	};
}

function applyDamageToStateInternal(
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

function cardForCombatant(
	state: GameState,
	side: CombatSide,
	type: 'hero' | 'minion',
	id: string | null,
): CardInstance | undefined {
	if (type === 'hero' || id === null) return undefined;
	return state.players?.[side]?.battlefield?.find(card => card.instanceId === id);
}

function healthForCard(card: CardInstance | undefined): number {
	if (!card) return 0;
	return card.currentHealth ?? getHealth(card.card);
}

function healthForCombatant(
	state: GameState,
	side: CombatSide,
	type: 'hero' | 'minion',
	id: string | null,
): number {
	const player = state.players?.[side];
	if (!player) return 0;
	if (type === 'hero') return player.heroHealth ?? player.health ?? 0;
	return healthForCard(cardForCombatant(state, side, type, id));
}

function shieldWasConsumed(
	beforeState: GameState,
	afterState: GameState,
	side: CombatSide,
	type: 'hero' | 'minion',
	id: string | null,
): boolean {
	if (type === 'hero') return false;
	const before = cardForCombatant(beforeState, side, type, id);
	const after = cardForCombatant(afterState, side, type, id);
	return before?.hasDivineShield === true && after?.hasDivineShield !== true;
}

function combatantIsLethal(
	state: GameState,
	side: CombatSide,
	type: 'hero' | 'minion',
	id: string | null,
): boolean {
	if (type === 'hero') return healthForCombatant(state, side, type, id) <= 0;
	const card = cardForCombatant(state, side, type, id);
	return id !== null && (!card || healthForCard(card) <= 0);
}

function attackStatChange(
	beforeState: GameState,
	afterState: GameState,
	side: CombatSide,
	id: string,
): ResolvedStatChange | null {
	const before = cardForCombatant(beforeState, side, 'minion', id);
	const after = cardForCombatant(afterState, side, 'minion', id);
	if (!before || !after) return null;
	const beforeAttack = before.currentAttack ?? getBaseAttack(before);
	const afterAttack = after.currentAttack ?? getBaseAttack(after);
	if (beforeAttack === afterAttack) return null;
	return { entityId: id, stat: 'attack', before: beforeAttack, after: afterAttack };
}

function getBaseAttack(card: CardInstance): number {
	return 'attack' in card.card && typeof card.card.attack === 'number' ? card.card.attack : 0;
}

/**
 * Builds a resolved result from the authoritative before/after states. This
 * is intentionally a pure snapshot adapter: it never mutates gameplay state
 * and it does not infer new mechanics.
 */
export function createResolvedAttackFromStates(
	beforeState: GameState,
	afterState: GameState,
	step: CombatStep,
): ResolvedAttack {
	const defenderSide: CombatSide = step.attackerSide === 'player' ? 'opponent' : 'player';
	const targetBefore = healthForCombatant(beforeState, defenderSide, step.targetType, step.targetId);
	const targetAfter = healthForCombatant(afterState, defenderSide, step.targetType, step.targetId);
	const attackerBefore = healthForCombatant(beforeState, step.attackerSide, 'minion', step.attackerId);
	const attackerAfter = healthForCombatant(afterState, step.attackerSide, 'minion', step.attackerId);
	const targetLethal = combatantIsLethal(afterState, defenderSide, step.targetType, step.targetId);
	const attackerLethal = combatantIsLethal(afterState, step.attackerSide, 'minion', step.attackerId);
	const zoneChanges: ResolvedZoneChange[] = [];

	if (step.targetType === 'minion' && step.targetId !== null && targetLethal) {
		zoneChanges.push({ entityId: step.targetId, from: 'battlefield', to: 'graveyard' });
	}
	if (attackerLethal) {
		zoneChanges.push({ entityId: step.attackerId, from: 'battlefield', to: 'graveyard' });
	}

	const statChanges = [
		attackStatChange(beforeState, afterState, step.attackerSide, step.attackerId),
		attackStatChange(beforeState, afterState, defenderSide, step.targetId ?? ''),
	].filter((change): change is ResolvedStatChange => change !== null);

	return {
		id: step.id,
		attackerId: step.attackerId,
		targetId: step.targetId,
		targetType: step.targetType,
		attackerSide: step.attackerSide,
		damageToTarget: Math.max(0, step.damage),
		damageToAttacker: Math.max(0, step.counterDamage),
		healthDamageToTarget: Math.max(0, targetBefore - targetAfter),
		healthDamageToAttacker: Math.max(0, attackerBefore - attackerAfter),
		targetHealthBefore: targetBefore,
		targetHealthAfter: targetAfter,
		attackerHealthBefore: attackerBefore,
		attackerHealthAfter: attackerAfter,
		targetShieldConsumed: shieldWasConsumed(beforeState, afterState, defenderSide, step.targetType, step.targetId),
		attackerShieldConsumed: shieldWasConsumed(beforeState, afterState, step.attackerSide, 'minion', step.attackerId),
		targetLethal,
		attackerLethal,
		counterAttackOccurred: step.targetType === 'minion' && step.counterDamage > 0,
		triggeredEffects: [],
		statChanges,
		zoneChanges,
	};
}
