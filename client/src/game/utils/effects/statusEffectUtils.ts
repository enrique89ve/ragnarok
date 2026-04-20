/**
 * Status Effect Utilities
 * Manages all Ragnarok-specific status effects for god mythic minions
 */

import { CardInstance } from '../../types/CardTypes';

// Status effect types
export type StatusEffectType = 
  | 'poison_dot'    // 3 damage at turn start
  | 'bleed'         // +3 damage when taking damage
  | 'paralysis'     // 50% action fail chance
  | 'weakness'      // -3 Attack
  | 'vulnerable'    // +3 damage taken
  | 'freeze'        // Cannot act (frozen)
  | 'marked'        // Ignores stealth/protection
  | 'burn';         // 3 damage on attack, +3 damage dealt

// Status effect metadata
export const STATUS_EFFECTS: Record<StatusEffectType, {
  name: string;
  icon: string;
  description: string;
  element: string;
}> = {
  poison_dot: { name: 'Poison', icon: '☠️', description: 'Takes 3 damage at the start of its turn', element: 'water' },
  bleed: { name: 'Bleed', icon: '🩸', description: 'Takes +3 damage whenever it takes damage', element: 'earth' },
  paralysis: { name: 'Paralysis', icon: '⚡', description: '50% chance to fail actions', element: 'lightning' },
  weakness: { name: 'Weakened', icon: '⬇️', description: 'Has -3 Attack', element: 'earth' },
  vulnerable: { name: 'Vulnerable', icon: '🎯', description: 'Takes +3 damage from all sources', element: 'fire' },
  freeze: { name: 'Frozen', icon: '❄️', description: 'Cannot act', element: 'ice' },
  marked: { name: 'Marked', icon: '👁️', description: 'Can always be targeted, ignores stealth', element: 'light' },
  burn: { name: 'Burn', icon: '🔥', description: 'Takes 3 damage when attacking, deals +3 damage', element: 'fire' }
};

// Apply a status effect to a minion
export function applyStatusEffect(minion: CardInstance, effect: StatusEffectType): CardInstance {
  const updated = { ...minion };
  
  switch (effect) {
    case 'poison_dot': updated.isPoisonedDoT = true; break;
    case 'bleed': updated.isBleeding = true; break;
    case 'paralysis': updated.isParalyzed = true; break;
    case 'weakness': updated.isWeakened = true; break;
    case 'vulnerable': updated.isVulnerable = true; break;
    case 'freeze': updated.isFrozen = true; break;
    case 'marked': updated.isMarked = true; break;
    case 'burn': updated.isBurning = true; break;
  }
  
  return updated;
}

// Remove a status effect from a minion
export function removeStatusEffect(minion: CardInstance, effect: StatusEffectType): CardInstance {
  const updated = { ...minion };
  
  switch (effect) {
    case 'poison_dot': updated.isPoisonedDoT = false; break;
    case 'bleed': updated.isBleeding = false; break;
    case 'paralysis': updated.isParalyzed = false; break;
    case 'weakness': updated.isWeakened = false; break;
    case 'vulnerable': updated.isVulnerable = false; break;
    case 'freeze': updated.isFrozen = false; break;
    case 'marked': updated.isMarked = false; break;
    case 'burn': updated.isBurning = false; break;
  }
  
  return updated;
}

// Check if a minion has a specific status effect
export function hasStatusEffect(minion: CardInstance, effect: StatusEffectType): boolean {
  switch (effect) {
    case 'poison_dot': return minion.isPoisonedDoT === true;
    case 'bleed': return minion.isBleeding === true;
    case 'paralysis': return minion.isParalyzed === true;
    case 'weakness': return minion.isWeakened === true;
    case 'vulnerable': return minion.isVulnerable === true;
    case 'freeze': return minion.isFrozen === true;
    case 'marked': return minion.isMarked === true;
    case 'burn': return minion.isBurning === true;
    default: return false;
  }
}

// Get all active status effects on a minion
export function getActiveStatusEffects(minion: CardInstance): StatusEffectType[] {
  const active: StatusEffectType[] = [];
  
  if (minion.isPoisonedDoT) active.push('poison_dot');
  if (minion.isBleeding) active.push('bleed');
  if (minion.isParalyzed) active.push('paralysis');
  if (minion.isWeakened) active.push('weakness');
  if (minion.isVulnerable) active.push('vulnerable');
  if (minion.isFrozen) active.push('freeze');
  if (minion.isMarked) active.push('marked');
  if (minion.isBurning) active.push('burn');
  
  return active;
}

// Calculate modified attack (for Weakness and Burn bonuses)
export function getModifiedAttack(minion: CardInstance): number {
  let attack = minion.currentAttack ?? minion.card.attack ?? 0;
  
  if (minion.isWeakened) {
    attack = Math.max(0, attack - 3);
  }
  if (minion.isBurning) {
    attack += 3; // Burn grants +3 damage
  }
  
  return attack;
}

// Calculate damage taken (for Vulnerable and Bleed)
export function calculateDamageTaken(minion: CardInstance, baseDamage: number, isAdditionalDamage: boolean = false): number {
  let damage = baseDamage;
  
  if (minion.isVulnerable) {
    damage += 3;
  }
  if (minion.isBleeding && !isAdditionalDamage) {
    damage += 3;
  }
  
  return damage;
}

// Check if minion can act (for Frozen, Paralysis)
export function canMinionAct(minion: CardInstance): { canAct: boolean; reason?: string } {
  if (minion.isFrozen) {
    return { canAct: false, reason: 'Frozen - cannot act this turn' };
  }
  if (minion.isParalyzed) {
    const roll = Math.random();
    if (roll < 0.5) {
      return { canAct: false, reason: 'Paralyzed - action failed (50% chance)' };
    }
  }
  return { canAct: true };
}

// Check if minion can be targeted (for Marked overriding Stealth)
export function canBeTargeted(minion: CardInstance, hasStealthOrProtection: boolean): boolean {
  if (minion.isMarked) {
    return true; // Marked minions can always be targeted
  }
  return !hasStealthOrProtection;
}

// Process turn start effects (Poison DoT)
export function processTurnStartEffects(minion: CardInstance): { damage: number; effects: string[] } {
  const effects: string[] = [];
  let damage = 0;
  
  if (minion.isPoisonedDoT) {
    damage += 3;
    effects.push('☠️ Poison deals 3 damage');
  }
  
  return { damage, effects };
}

// Process on-attack effects (Burn self-damage)
export function processOnAttackEffects(minion: CardInstance): { selfDamage: number; effects: string[] } {
  const effects: string[] = [];
  let selfDamage = 0;
  
  if (minion.isBurning) {
    selfDamage += 3;
    effects.push('🔥 Burn deals 3 damage to self');
  }
  
  return { selfDamage, effects };
}

// Clear temporary status effects at end of turn
export function clearEndOfTurnEffects(minion: CardInstance): CardInstance {
  const updated = { ...minion };
  
  // Frozen is cleared after the turn (minion thaws after skipping one turn)
  if (updated.isFrozen) {
    updated.isFrozen = false;
  }
  
  return updated;
}
