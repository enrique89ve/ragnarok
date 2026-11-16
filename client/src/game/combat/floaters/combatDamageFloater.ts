/**
 * Single authority for combat damage/heal floater requests.
 * Presentation dedupes by stable event id before scheduling DamageIndicator.
 * Listener failures stay inside this bus and never roll back gameplay.
 */

import { debug } from '../../config/debugConfig';

export type CombatDamageFloaterVariant = 'combat' | 'showdown' | 'stake';
export type CombatDamageFloaterCoordinateSpace = 'arena' | 'viewport';

export interface CombatDamageFloaterRequest {
	readonly id: string;
	readonly targetId: string;
	readonly amount: number;
	readonly isHeal?: boolean;
	readonly delayMs?: number;
	readonly variant?: CombatDamageFloaterVariant;
	readonly x?: number;
	readonly y?: number;
	readonly coordinateSpace?: CombatDamageFloaterCoordinateSpace;
}

type Listener = (request: CombatDamageFloaterRequest) => void;

const listeners = new Set<Listener>();
const seenIds = new Map<string, number>();
const SEEN_TTL_MS = 30_000;

function pruneSeenIds(now: number): void {
	for (const [id, expiresAt] of seenIds) {
		if (expiresAt <= now) seenIds.delete(id);
	}
}

export function requestCombatDamageFloater(request: CombatDamageFloaterRequest): boolean {
	const now = Date.now();
	pruneSeenIds(now);
	if (seenIds.has(request.id)) return false;
	if (request.amount <= 0) return false;
	seenIds.set(request.id, now + SEEN_TTL_MS);
	for (const listener of listeners) {
		try {
			listener(request);
		} catch (error) {
			debug.error('[combatDamageFloater] listener failed', error);
		}
	}
	return true;
}

export function subscribeCombatDamageFloater(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Test helper */
export function resetCombatDamageFloaterRegistry(): void {
	seenIds.clear();
}