/**
 * vfxOrchestrationDirector.ts
 *
 * Riot Games / Legends of Runeterra 4-Tier Visual Hierarchy & Pacing Director.
 *
 * Ensures coherent, zero-overlap VFX orchestration across combat attacks,
 * poker betting/spells, card spells, and ambient atmosphere:
 *
 * - Tier 0 (`ambient`):   Realm motes & convolutional perimeter mood (ducks during `critical`)
 * - Tier 1 (`secondary`): Summon glints, passive wagers, subtle stamina ticks (suppressed during `critical` spotlight)
 * - Tier 2 (`primary`):   Minion strikes, targeted spells, Battlecries, Hero Powers, Poker Spells
 *                         (automatically paced with a minimum cadence gap so multi-strikes read cleanly)
 * - Tier 3 (`critical`):  Showdown Blasts, Lethal Strikes, All-In / Ragnarok Gambit
 *                         (claims focal spotlight and smoothly ducks ambient/secondary layers)
 */

export type VfxHierarchyTier = 'ambient' | 'secondary' | 'primary' | 'critical';

export interface VfxOrchestrationConfig {
	/** Minimum ms spacing between consecutive `primary` strikes triggered in a burst. */
	readonly primaryPacingGapMs: number;
	/** Maximum cumulative stagger delay so rapid bursts never lag behind gameplay. */
	readonly maxPrimaryStaggerMs: number;
	/** Ambient alpha multiplier while a `critical` spotlight is active (0..1). */
	readonly criticalAmbientDuckMultiplier: number;
}

const DEFAULT_CONFIG: VfxOrchestrationConfig = {
	primaryPacingGapMs: 90,
	maxPrimaryStaggerMs: 360,
	criticalAmbientDuckMultiplier: 0.42,
};

export interface VfxOrchestrationDirector {
	/** Reserves a clean start delay (ms) for a `primary` cue in a simultaneous burst. */
	reservePrimaryPaceDelayMs(nowMs?: number): number;
	/** Claims exclusive focal spotlight for `critical` beats (Showdown, Lethal, All-In). */
	triggerCriticalSpotlight(durationMs?: number, nowMs?: number): void;
	/** True while a critical spotlight is active. */
	isCriticalSpotlightActive(nowMs?: number): boolean;
	/** Returns the target ambient/atmosphere alpha multiplier (`1.0` normal, `0.42` during critical). */
	getAmbientDuckFactor(nowMs?: number): number;
	/** Gates low-priority `secondary` cues so they never clutter a `critical` moment. */
	shouldAllowSecondary(nowMs?: number): boolean;
	/** Resets pacing clocks and spotlight state (e.g., on arena unmount). */
	reset(): void;
}

export function createVfxOrchestrationDirector(
	overrides: Partial<VfxOrchestrationConfig> = {},
): VfxOrchestrationDirector {
	const config: VfxOrchestrationConfig = { ...DEFAULT_CONFIG, ...overrides };
	let nextPrimarySlotMs = 0;
	let criticalUntilMs = 0;

	const currentTime = (nowMs?: number): number => nowMs ?? Date.now();

	return {
		reservePrimaryPaceDelayMs(nowMs?: number): number {
			const now = currentTime(nowMs);
			if (now >= nextPrimarySlotMs) {
				nextPrimarySlotMs = now + config.primaryPacingGapMs;
				return 0;
			}
			const rawDelay = nextPrimarySlotMs - now;
			const delay = Math.min(config.maxPrimaryStaggerMs, rawDelay);
			nextPrimarySlotMs = now + delay + config.primaryPacingGapMs;
			return delay;
		},

		triggerCriticalSpotlight(durationMs = 680, nowMs?: number): void {
			const now = currentTime(nowMs);
			const end = now + Math.max(120, durationMs);
			if (end > criticalUntilMs) {
				criticalUntilMs = end;
			}
		},

		isCriticalSpotlightActive(nowMs?: number): boolean {
			return currentTime(nowMs) < criticalUntilMs;
		},

		getAmbientDuckFactor(nowMs?: number): number {
			return currentTime(nowMs) < criticalUntilMs
				? config.criticalAmbientDuckMultiplier
				: 1.0;
		},

		shouldAllowSecondary(nowMs?: number): boolean {
			return currentTime(nowMs) >= criticalUntilMs;
		},

		reset(): void {
			nextPrimarySlotMs = 0;
			criticalUntilMs = 0;
		},
	};
}

export const vfxOrchestrationDirector = createVfxOrchestrationDirector();
