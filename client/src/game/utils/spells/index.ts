/**
 * Spell Utilities - Modular Structure
 * 
 * This index file re-exports all spell-related functions organized by category.
 * 
 * ARCHITECTURE:
 * - types.ts: Shared types and interfaces
 * - damageSpells.ts: Damage-dealing spell effects
 * - healSpells.ts: Healing and health modification spells
 * - buffSpells.ts: Buff and debuff spell effects
 * - summonSpells.ts: Minion summoning and resurrection spells
 * - transformSpells.ts: Card transformation spells
 * - drawSpells.ts: Card draw and deck manipulation spells
 * - controlSpells.ts: Destroy, silence, and mind control spells
 * - utilitySpells.ts: Mana, hero power, and misc utility spells
 * 
 * NOTE: This is the first phase of refactoring spellUtils.ts (5665 lines).
 * Main executeSpell function and exports remain in spellUtils.ts for backward compatibility.
 * Individual category files will be populated incrementally.
 */

// Shared types
export * from './types';

// Category modules will be added as refactoring progresses
// export * from './damageSpells';
// export * from './healSpells';
// export * from './buffSpells';
// export * from './summonSpells';
// export * from './transformSpells';
// export * from './drawSpells';
// export * from './controlSpells';
// export * from './utilitySpells';
