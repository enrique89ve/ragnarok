/**
 * Battlecry Utils Module
 * 
 * This module provides modular battlecry utility functions.
 * The index file re-exports types and will re-export functions as they're extracted.
 * 
 * Migration Strategy:
 * 1. Types are extracted first (types.ts) - DONE
 * 2. Individual battlecry categories will be extracted incrementally
 * 3. battlecryUtils.ts will become a re-export barrel file
 * 
 * Main exports from battlecryUtils.ts:
 * - executeBattlecry (lines 211-1216, ~1000 lines) - Main battlecry execution
 * - requiresBattlecryTarget (lines 1217-1712, ~495 lines) - Target requirement check
 * - isValidBattlecryTarget (lines 1713-1799, ~86 lines) - Target validation
 */

// Export types
export * from './types';

// Future: Re-export from category modules
// export * from './execution';
// export * from './targeting';
// export * from './damage';
// export * from './heal';
// export * from './buff';
// export * from './summon';
// export * from './discover';
// export * from './transform';
// export * from './highlander';
