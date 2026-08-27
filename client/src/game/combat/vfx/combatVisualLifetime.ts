/**
 * Presentation-only lifetime coordination for combat cards.
 *
 * Gameplay may remove a card from the battlefield immediately after an
 * authoritative resolution. This registry lets AnimatePresence retain the
 * exiting visual for the already-defined lethal sequence without introducing
 * a second dead-card gameplay state.
 */

export const COMBAT_LETHAL_TIMELINE_MS = {
	travel: 320,
	impact: 140,
	counterImpact: 140,
	lethalEmphasis: 100,
	death: 320,
} as const;

export function lethalVisualLifetimeMs(hasCounter: boolean): number {
	return COMBAT_LETHAL_TIMELINE_MS.travel
		+ COMBAT_LETHAL_TIMELINE_MS.impact
		+ (hasCounter ? COMBAT_LETHAL_TIMELINE_MS.counterImpact : 0)
		+ COMBAT_LETHAL_TIMELINE_MS.lethalEmphasis
		+ COMBAT_LETHAL_TIMELINE_MS.death
		+ 40;
}

/** Worst-case hold, useful for tests and callers that do not have a plan. */
export const COMBAT_LETHAL_VISUAL_LIFETIME_MS = lethalVisualLifetimeMs(true);

export const COMBAT_NORMAL_EXIT_MS = 350;

const visualDeadlines = new Map<string, number>();

export function holdCombatVisualLifetime(entityId: string, durationMs: number): void {
	const deadline = Date.now() + Math.max(0, durationMs);
	const previousDeadline = visualDeadlines.get(entityId) ?? 0;
	visualDeadlines.set(entityId, Math.max(previousDeadline, deadline));
}

export function combatVisualLifetimeRemaining(entityId: string, now = Date.now()): number {
	const deadline = visualDeadlines.get(entityId);
	if (deadline === undefined) return 0;
	const remaining = Math.max(0, deadline - now);
	if (remaining === 0) visualDeadlines.delete(entityId);
	return remaining;
}

export function clearCombatVisualLifetime(entityId: string): void {
	visualDeadlines.delete(entityId);
}
