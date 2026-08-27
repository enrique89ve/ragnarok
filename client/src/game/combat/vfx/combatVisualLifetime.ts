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
	postDeathGap: 40,
} as const;

export const COMBAT_REDUCED_MOTION_EXIT_MS = 60;

export function lethalVisualLifetimeMs(hasCounter: boolean): number {
	return COMBAT_LETHAL_TIMELINE_MS.travel
		+ COMBAT_LETHAL_TIMELINE_MS.impact
		+ (hasCounter ? COMBAT_LETHAL_TIMELINE_MS.counterImpact : 0)
		+ COMBAT_LETHAL_TIMELINE_MS.lethalEmphasis
		+ COMBAT_LETHAL_TIMELINE_MS.death
		+ COMBAT_LETHAL_TIMELINE_MS.postDeathGap;
}

/** Worst-case hold, useful for tests and callers that do not have a plan. */
export const COMBAT_LETHAL_VISUAL_LIFETIME_MS = lethalVisualLifetimeMs(true);

export const COMBAT_NORMAL_EXIT_MS = 350;

export function combatVisualExitTiming(
	remainingMs: number,
	reducedMotion: boolean,
): { readonly lifetimeMs: number; readonly deathDelayMs: number } {
	if (reducedMotion) {
		return { lifetimeMs: COMBAT_REDUCED_MOTION_EXIT_MS, deathDelayMs: 0 };
	}
	if (remainingMs <= 0) {
		return { lifetimeMs: COMBAT_NORMAL_EXIT_MS, deathDelayMs: 0 };
	}

	return {
		lifetimeMs: remainingMs,
		deathDelayMs: Math.max(
			0,
			remainingMs
				- COMBAT_LETHAL_TIMELINE_MS.death
				- COMBAT_LETHAL_TIMELINE_MS.postDeathGap,
		),
	};
}

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
