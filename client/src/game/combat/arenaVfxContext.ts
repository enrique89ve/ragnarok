import { createContext, useContext } from 'react';
import type { QueryRoot } from './arenaVfxTargets';

/**
 * Keeps portal and target lookups inside the arena that owns the effect.
 * The DOM fallback remains available for legacy surfaces outside the arena.
 */
export const ArenaVfxRootContext = createContext<QueryRoot | null>(null);

export function useArenaVfxRoot(): QueryRoot | null {
	return useContext(ArenaVfxRootContext);
}
