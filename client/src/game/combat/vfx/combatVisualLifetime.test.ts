import { afterEach, describe, expect, it } from 'vitest';
import {
	clearCombatVisualLifetime,
	combatVisualLifetimeRemaining,
	combatVisualExitTiming,
	COMBAT_LETHAL_TIMELINE_MS,
	COMBAT_LETHAL_VISUAL_LIFETIME_MS,
	COMBAT_REDUCED_MOTION_EXIT_MS,
	holdCombatVisualLifetime,
	lethalVisualLifetimeMs,
} from './combatVisualLifetime';

describe('combat visual lifetime', () => {
	const entityId = 'lethal-card-1';

	afterEach(() => clearCombatVisualLifetime(entityId));

	it('retains a lethal card for impact, emphasis, and death before removal', () => {
		holdCombatVisualLifetime(entityId, COMBAT_LETHAL_VISUAL_LIFETIME_MS);

		expect(combatVisualLifetimeRemaining(entityId)).toBeGreaterThan(
			COMBAT_LETHAL_TIMELINE_MS.death,
		);
	});

	it('adds the counter impact window only when the exchange has a counter', () => {
		expect(lethalVisualLifetimeMs(true) - lethalVisualLifetimeMs(false)).toBe(
			COMBAT_LETHAL_TIMELINE_MS.counterImpact,
		);
	});

	it('starts death before the post-death reflow gap', () => {
		const lifetimeMs = lethalVisualLifetimeMs(true);
		const timing = combatVisualExitTiming(lifetimeMs, false);

		expect(timing).toEqual({
			lifetimeMs,
			deathDelayMs: lifetimeMs
				- COMBAT_LETHAL_TIMELINE_MS.death
				- COMBAT_LETHAL_TIMELINE_MS.postDeathGap,
		});
	});

	it('shortens the retained lifetime and skips death delay for reduced motion', () => {
		expect(combatVisualExitTiming(COMBAT_LETHAL_VISUAL_LIFETIME_MS, true)).toEqual({
			lifetimeMs: COMBAT_REDUCED_MOTION_EXIT_MS,
			deathDelayMs: 0,
		});
	});

	it('extends an existing hold instead of shortening it', () => {
		holdCombatVisualLifetime(entityId, 100);
		const firstRemaining = combatVisualLifetimeRemaining(entityId);
		holdCombatVisualLifetime(entityId, COMBAT_LETHAL_VISUAL_LIFETIME_MS);

		expect(combatVisualLifetimeRemaining(entityId)).toBeGreaterThan(firstRemaining);
	});
});
