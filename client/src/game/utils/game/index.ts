/**
 * Game Utils Module
 * 
 * This module provides modular game utility functions, organized by category.
 * The index file re-exports everything for backward compatibility with gameUtils.ts.
 * 
 * Migration Strategy:
 * 1. Types and adapters are extracted first (types.ts) - DONE
 * 2. Individual function categories will be extracted incrementally
 * 3. gameUtils.ts will become a re-export barrel file
 * 
 * Categories planned for extraction:
 * - initialization.ts: initializeGame
 * - cardPlay.ts: playCard and related helpers
 * - cardDraw.ts: drawCard and fatigue logic
 * - turnManagement.ts: endTurn, turn phase handlers
 * - combat.ts: processAttack, attack resolution
 * - aiTargeting.ts: findOptimalAttackTargets, autoAttack functions
 * - damage.ts: applyDamage and damage calculation
 */

// Export type adapters and utilities
export * from './types';

// Future: Re-export from category modules
// export * from './initialization';
// export * from './cardPlay';
// export * from './cardDraw';
// export * from './turnManagement';
// export * from './combat';
// export * from './aiTargeting';
// export * from './damage';
