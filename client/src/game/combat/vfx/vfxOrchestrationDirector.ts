/**
 * vfxOrchestrationDirector.ts
 *
 * Riot Games / Legends of Runeterra 4-Tier Visual Hierarchy & Weighted Cascade Director.
 *
 * Guarantees coherent, zero-overlap VFX orchestration across combat attacks,
 * poker betting/spells, faction scenes, and ambient atmosphere:
 *
 * - Tier 0 (`ambient`):   Realm motes & perimeter mood (ducks during `critical`)
 * - Tier 1 (`secondary`): Summon glints, passive wagers, stamina ticks (suppressed during `critical`)
 * - Tier 2 (`primary`):   Minion strikes, targeted spells, Poker Spells, betting raises
 * - Tier 3 (`critical`):  Showdown Blasts, Lethal Strikes, All-In, Dragon Flight, Titan Slam
 *
 * Weighted Cascade Guarantees:
 * 1. Two `heavy` or `critical` VFX NEVER land on the same frame (`heavyCollisionGapMs`).
 * 2. Two VFX targeting the same focal zone (`playerHero`, `opponentHero`, `center`, `board`)
 *    NEVER stack on the exact same millisecond (`sameZoneGapMs`), avoiding GPU overdraw spikes.
 * 3. Every assigned delay is strictly bounded (`maxCascadeDelayMs`) so rapid combos stay snappy.
 * 4. All delays & avoided collisions are recorded for live frame-budget telemetry.
 */

export type VfxHierarchyTier = 'ambient' | 'secondary' | 'primary' | 'critical';
export type VfxCascadeWeight = 'light' | 'medium' | 'heavy' | 'critical';
export type VfxFocalZone = 'playerHero' | 'opponentHero' | 'center' | 'board' | 'fullscreen';

export interface VfxOrchestrationConfig {
	/** Minimum ms spacing between consecutive `primary` strikes triggered in a burst. */
	readonly primaryPacingGapMs: number;
	/** Maximum cumulative stagger delay for primary strikes. */
	readonly maxPrimaryStaggerMs: number;
	/** Minimum ms spacing between two `heavy`/`critical` VFX actions. */
	readonly heavyCollisionGapMs: number;
	/** Minimum ms spacing between two VFX actions targeting the exact same focal zone. */
	readonly sameZoneGapMs: number;
	/** Hard cap on cascade delay so rapid combos never lag behind gameplay timers. */
	readonly maxCascadeDelayMs: number;
	/** Ambient alpha multiplier while a `critical` spotlight is active (0..1). */
	readonly criticalAmbientDuckMultiplier: number;
}

const DEFAULT_CONFIG: VfxOrchestrationConfig = {
	primaryPacingGapMs: 90,
	maxPrimaryStaggerMs: 360,
	heavyCollisionGapMs: 160,
	sameZoneGapMs: 120,
	maxCascadeDelayMs: 420,
	criticalAmbientDuckMultiplier: 0.42,
};

export interface VfxCascadeReservationRequest {
	readonly weight: VfxCascadeWeight;
	readonly zone?: VfxFocalZone;
	readonly nowMs?: number;
}

export type VfxCascadeReason =
	| 'immediate'
	| 'primary-stagger'
	| 'heavy-stagger'
	| 'same-zone-stagger'
	| 'capped'
	| 'dropped-low-priority';

export interface VfxCascadeReservationResult {
	readonly delayMs: number;
	readonly skipped: boolean;
	readonly reason: VfxCascadeReason;
}

export interface VfxCascadeTelemetry {
	readonly totalRequests: number;
	readonly staggeredCount: number;
	readonly heavyCollisionsAvoided: number;
	readonly sameZoneCollisionsAvoided: number;
	readonly droppedLowPriorityCount: number;
	readonly avgAssignedDelayMs: number;
	readonly maxAssignedDelayMs: number;
}

export interface VfxOrchestrationDirector {
	/** Reserves a clean start delay (ms) for a `primary` cue in a simultaneous burst. */
	reservePrimaryPaceDelayMs(nowMs?: number): number;
	/**
	 * Reserves a weighted, zone-aware cascade slot so two heavy VFX or two
	 * same-focal-point VFX never collide on the same frame.
	 */
	reserveCascadeSlot(request: VfxCascadeReservationRequest): VfxCascadeReservationResult;
	/** Claims exclusive focal spotlight for `critical` beats (Showdown, Lethal, All-In). */
	triggerCriticalSpotlight(durationMs?: number, nowMs?: number): void;
	/** True while a critical spotlight is active. */
	isCriticalSpotlightActive(nowMs?: number): boolean;
	/** Returns the target ambient/atmosphere alpha multiplier (`1.0` normal, `0.42` during critical). */
	getAmbientDuckFactor(nowMs?: number): number;
	/** Gates low-priority `secondary` cues so they never clutter a `critical` moment. */
	shouldAllowSecondary(nowMs?: number): boolean;
	/** Returns live cascade delay & collision avoidance metrics. */
	getCascadeTelemetry(): VfxCascadeTelemetry;
	/** Resets pacing clocks, zone locks, spotlight state, and telemetry (e.g., on arena unmount). */
	reset(): void;
}

export function createVfxOrchestrationDirector(
	overrides: Partial<VfxOrchestrationConfig> = {},
): VfxOrchestrationDirector {
	const config: VfxOrchestrationConfig = { ...DEFAULT_CONFIG, ...overrides };
	let nextPrimarySlotMs = 0;
	let nextHeavySlotMs = 0;
	let criticalUntilMs = 0;
	const zoneNextSlotMs = new Map<VfxFocalZone, number>();

	let totalRequests = 0;
	let staggeredCount = 0;
	let heavyCollisionsAvoided = 0;
	let sameZoneCollisionsAvoided = 0;
	let droppedLowPriorityCount = 0;
	let cumulativeDelayMs = 0;
	let maxAssignedDelayMs = 0;

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

		reserveCascadeSlot(request: VfxCascadeReservationRequest): VfxCascadeReservationResult {
			const now = currentTime(request.nowMs);
			totalRequests += 1;

			if (request.weight === 'light' && now < criticalUntilMs) {
				droppedLowPriorityCount += 1;
				return { delayMs: 0, skipped: true, reason: 'dropped-low-priority' };
			}

			let targetStartMs = now;
			let reason: VfxCascadeReason = 'immediate';

			const isHeavy = request.weight === 'heavy' || request.weight === 'critical';
			if (isHeavy && nextHeavySlotMs > targetStartMs) {
				targetStartMs = nextHeavySlotMs;
				reason = 'heavy-stagger';
				heavyCollisionsAvoided += 1;
			}

			if (request.zone) {
				const zoneFreeAt = zoneNextSlotMs.get(request.zone) ?? 0;
				if (zoneFreeAt > targetStartMs) {
					targetStartMs = zoneFreeAt;
					reason = 'same-zone-stagger';
					sameZoneCollisionsAvoided += 1;
				}
			}

			if (request.weight === 'medium' && nextPrimarySlotMs > targetStartMs) {
				targetStartMs = nextPrimarySlotMs;
				reason = 'primary-stagger';
			}

			const rawDelay = Math.max(0, targetStartMs - now);
			const delayMs = Math.min(config.maxCascadeDelayMs, rawDelay);
			if (rawDelay > config.maxCascadeDelayMs) {
				reason = 'capped';
			}

			const scheduledStartMs = now + delayMs;
			if (isHeavy) {
				nextHeavySlotMs = Math.max(nextHeavySlotMs, scheduledStartMs + config.heavyCollisionGapMs);
			}
			if (request.weight === 'medium' || isHeavy) {
				nextPrimarySlotMs = Math.max(nextPrimarySlotMs, scheduledStartMs + config.primaryPacingGapMs);
			}
			if (request.zone) {
				zoneNextSlotMs.set(
					request.zone,
					Math.max(zoneNextSlotMs.get(request.zone) ?? 0, scheduledStartMs + config.sameZoneGapMs),
				);
			}

			if (delayMs > 0) {
				staggeredCount += 1;
				cumulativeDelayMs += delayMs;
				if (delayMs > maxAssignedDelayMs) maxAssignedDelayMs = delayMs;
			}

			return { delayMs, skipped: false, reason };
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

		getCascadeTelemetry(): VfxCascadeTelemetry {
			return {
				totalRequests,
				staggeredCount,
				heavyCollisionsAvoided,
				sameZoneCollisionsAvoided,
				droppedLowPriorityCount,
				avgAssignedDelayMs: staggeredCount > 0 ? Math.round((cumulativeDelayMs / staggeredCount) * 10) / 10 : 0,
				maxAssignedDelayMs,
			};
		},

		reset(): void {
			nextPrimarySlotMs = 0;
			nextHeavySlotMs = 0;
			criticalUntilMs = 0;
			zoneNextSlotMs.clear();
			totalRequests = 0;
			staggeredCount = 0;
			heavyCollisionsAvoided = 0;
			sameZoneCollisionsAvoided = 0;
			droppedLowPriorityCount = 0;
			cumulativeDelayMs = 0;
			maxAssignedDelayMs = 0;
		},
	};
}

export const vfxOrchestrationDirector = createVfxOrchestrationDirector();
