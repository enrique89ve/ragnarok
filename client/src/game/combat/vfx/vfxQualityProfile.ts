/**
 * vfxQualityProfile.ts
 *
 * Adaptive VFX Quality Tiering & Runtime FPS Governor (Riot-style Low-Spec / Frame Budget).
 *
 * Scales poker VFX GPU fill-rate, VRAM, particle budgets, and CSS effects
 * proportionally to device hardware capabilities and live frame-time telemetry:
 *
 * - Static hardware detection (`detectHardwareVfxTier`):
 *   Inspects CPU cores, RAM, WebGL renderer string (catching software/integrated GPUs),
 *   mobile viewport, `prefers-reduced-motion`, and user settings.
 * - Dynamic FPS Governor (`createVfxPerformanceGovernor`):
 *   Monitors active-frame `deltaMS` with EMA + hysteresis to automatically step down
 *   under sustained frame drops (< 45 FPS) and recover smoothly when headroom returns.
 * - Live Telemetry (`getVfxTelemetrySnapshot`):
 *   Zero-allocation counters for profiling before/after optimizations.
 */

export type VfxQualityTier = 'ultra' | 'high' | 'medium' | 'low' | 'minimal';
export type VfxQualityPreference = 'auto' | VfxQualityTier;

export const VFX_TIER_ORDER: readonly VfxQualityTier[] = [
	'minimal',
	'low',
	'medium',
	'high',
	'ultra',
] as const;

export interface VfxQualityBudget {
	readonly tier: VfxQualityTier;
	/** Overall VFX intensity multiplier (0.0 .. 1.0). */
	readonly budgetScale: number;
	/** Max devicePixelRatio for the PixiJS VFX canvas. */
	readonly maxDpr: number;
	/** WebGL MSAA antialias flag (disabled on <= high to save GPU resolve bandwidth). */
	readonly antialias: boolean;
	/** Maximum concurrent active particles in PixiParticleCanvas. */
	readonly maxParticles: number;
	/** Maximum concurrent active braided energy ribbons. */
	readonly maxRibbons: number;
	/** Maximum strands per braided ribbon (1..3). */
	readonly maxStrands: 1 | 2 | 3;
	/** Ambient realm mote count multiplier (0.0 .. 1.0). */
	readonly ambientScale: number;
	/** Whether ambient realm motes are spawned at all. */
	readonly enableAmbientMotes: boolean;
	/** Whether heavy CSS glows / drop-shadows stay enabled. */
	readonly enableCssGlow: boolean;
	/** Target PixiJS ticker FPS cap (0 = paused/disabled). */
	readonly targetFps: number;
}

export const VFX_QUALITY_BUDGETS: Readonly<Record<VfxQualityTier, VfxQualityBudget>> = {
	ultra: {
		tier: 'ultra',
		budgetScale: 1.0,
		maxDpr: 1.5,
		antialias: true,
		maxParticles: 420,
		maxRibbons: 24,
		maxStrands: 3,
		ambientScale: 1.0,
		enableAmbientMotes: true,
		enableCssGlow: true,
		targetFps: 30,
	},
	high: {
		tier: 'high',
		budgetScale: 0.75,
		maxDpr: 1.0,
		antialias: false,
		maxParticles: 260,
		maxRibbons: 16,
		maxStrands: 2,
		ambientScale: 0.6,
		enableAmbientMotes: true,
		enableCssGlow: true,
		targetFps: 30,
	},
	medium: {
		tier: 'medium',
		budgetScale: 0.45,
		maxDpr: 0.75,
		antialias: false,
		maxParticles: 140,
		maxRibbons: 10,
		maxStrands: 2,
		ambientScale: 0.3,
		enableAmbientMotes: true,
		enableCssGlow: false,
		targetFps: 30,
	},
	low: {
		tier: 'low',
		budgetScale: 0.2,
		maxDpr: 0.5,
		antialias: false,
		maxParticles: 60,
		maxRibbons: 6,
		maxStrands: 1,
		ambientScale: 0,
		enableAmbientMotes: false,
		enableCssGlow: false,
		targetFps: 30,
	},
	minimal: {
		tier: 'minimal',
		budgetScale: 0,
		maxDpr: 0.5,
		antialias: false,
		maxParticles: 0,
		maxRibbons: 0,
		maxStrands: 1,
		ambientScale: 0,
		enableAmbientMotes: false,
		enableCssGlow: false,
		targetFps: 0,
	},
};

export interface HardwareProbe {
	readonly hardwareConcurrency?: number;
	readonly deviceMemoryGb?: number;
	readonly prefersReducedMotion?: boolean;
	readonly webglRenderer?: string | null;
	readonly isMobileViewport?: boolean;
}

export interface VfxUserSettingsInput {
	readonly animationsEnabled?: boolean;
	readonly reduceMotion?: boolean;
	readonly enhancedVFX?: boolean;
	readonly cardQuality?: 'low' | 'medium' | 'high';
	readonly vfxQuality?: VfxQualityPreference;
}

const SOFTWARE_RENDERER_RE = /swiftshader|llvmpipe|software|basic render driver|mesa offscreen|angle.*warp/i;
const LOW_END_GPU_RE = /intel.*(hd graphics [2345]\d{2}|uhd 6\d{2}|gma)|mali-4|mali-t|adreno\s*[345]\d{2}|powervr|apple a[789]\b/i;
const INTEGRATED_GPU_RE = /intel.*(iris|uhd|hd graphics)|radeon\(tm\) graphics|vega [3678]\b|apple m[12]\b|adreno\s*6\d{2}/i;

let cachedWebglRenderer: string | null | undefined;

function probeWebglRenderer(): string | null {
	if (cachedWebglRenderer !== undefined) return cachedWebglRenderer;
	if (typeof document === 'undefined') {
		cachedWebglRenderer = null;
		return null;
	}
	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
		if (!gl) {
			cachedWebglRenderer = null;
			return null;
		}
		const ext = gl.getExtension('WEBGL_debug_renderer_info');
		const renderer = ext
			? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '')
			: String(gl.getParameter(gl.RENDERER) ?? '');
		cachedWebglRenderer = renderer || null;
		const loseCtx = gl.getExtension('WEBGL_lose_context');
		loseCtx?.loseContext();
		return cachedWebglRenderer;
	} catch {
		cachedWebglRenderer = null;
		return null;
	}
}

export function collectBrowserHardwareProbe(): HardwareProbe {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') {
		return {};
	}
	const nav = navigator as Navigator & { deviceMemory?: number };
	const prefersReducedMotion = typeof window.matchMedia === 'function'
		&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const isMobileViewport = (nav.maxTouchPoints ?? 0) > 0 && window.innerWidth <= 900;

	return {
		hardwareConcurrency: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined,
		deviceMemoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
		prefersReducedMotion,
		webglRenderer: probeWebglRenderer(),
		isMobileViewport,
	};
}

export function tierIndex(tier: VfxQualityTier): number {
	return VFX_TIER_ORDER.indexOf(tier);
}

export function minVfxTier(a: VfxQualityTier, b: VfxQualityTier): VfxQualityTier {
	return tierIndex(a) <= tierIndex(b) ? a : b;
}

export function stepDownVfxTier(tier: VfxQualityTier, floor: VfxQualityTier = 'low'): VfxQualityTier {
	const idx = tierIndex(tier);
	const floorIdx = tierIndex(floor);
	if (idx <= floorIdx) return tier;
	return VFX_TIER_ORDER[idx - 1];
}

export function stepUpVfxTier(tier: VfxQualityTier, ceiling: VfxQualityTier): VfxQualityTier {
	const idx = tierIndex(tier);
	const ceilIdx = tierIndex(ceiling);
	if (idx >= ceilIdx) return tier;
	return VFX_TIER_ORDER[idx + 1];
}

/**
 * Computes the recommended VFX tier from hardware capabilities + user settings.
 * In non-browser environments (Node/Vitest without probe overrides), defaults to `'ultra'`
 * so deterministic unit tests observe full baseline matrices unless explicitly scaled.
 */
export function detectHardwareVfxTier(
	probe: HardwareProbe = {},
	settings: VfxUserSettingsInput = {},
): VfxQualityTier {
	if (settings.animationsEnabled === false) return 'minimal';
	if (settings.vfxQuality && settings.vfxQuality !== 'auto') {
		return settings.vfxQuality;
	}
	if (settings.reduceMotion || probe.prefersReducedMotion) {
		return 'low';
	}

	let tier: VfxQualityTier = 'ultra';
	const cores = probe.hardwareConcurrency;
	const mem = probe.deviceMemoryGb;
	const renderer = probe.webglRenderer ?? '';

	if (renderer && SOFTWARE_RENDERER_RE.test(renderer)) {
		tier = minVfxTier(tier, 'low');
	} else if (renderer && LOW_END_GPU_RE.test(renderer)) {
		tier = minVfxTier(tier, 'medium');
	} else if (renderer && INTEGRATED_GPU_RE.test(renderer)) {
		tier = minVfxTier(tier, 'high');
	}

	if (typeof cores === 'number') {
		if (cores <= 2) tier = minVfxTier(tier, 'low');
		else if (cores <= 4) tier = minVfxTier(tier, 'medium');
		else if (cores <= 6) tier = minVfxTier(tier, 'high');
	}

	if (typeof mem === 'number') {
		if (mem <= 2) tier = minVfxTier(tier, 'low');
		else if (mem <= 4) tier = minVfxTier(tier, 'medium');
		else if (mem <= 6) tier = minVfxTier(tier, 'high');
	}

	if (probe.isMobileViewport) {
		tier = minVfxTier(tier, 'medium');
	}

	if (settings.enhancedVFX === false) {
		tier = minVfxTier(tier, 'medium');
	}

	if (settings.cardQuality === 'low') {
		tier = minVfxTier(tier, 'low');
	} else if (settings.cardQuality === 'medium') {
		tier = minVfxTier(tier, 'medium');
	}

	return tier;
}

export function scaleParticleCountByBudget(count: number, budgetScale: number): number {
	if (count <= 0 || budgetScale <= 0) return 0;
	if (budgetScale >= 1) return count;
	return Math.max(1, Math.round(count * budgetScale));
}

export interface VfxGovernorConfig {
	/** Frame duration (ms) above which a frame counts as slow (default: 22ms ≈ 45 FPS). */
	readonly slowFrameMs: number;
	/** Frame duration (ms) below which a frame counts as healthy (default: 17.5ms ≈ 57 FPS). */
	readonly fastFrameMs: number;
	/** Consecutive slow active frames before stepping down one tier. */
	readonly slowFramesToDowngrade: number;
	/** Consecutive fast active frames before recovering one tier toward ceiling. */
	readonly fastFramesToUpgrade: number;
	/** Minimum ms between automatic tier transitions to prevent oscillation. */
	readonly cooldownMs: number;
	/** Lowest tier the automatic governor will drop to (never disables VFX completely). */
	readonly autoFloorTier: VfxQualityTier;
}

const DEFAULT_GOVERNOR_CONFIG: VfxGovernorConfig = {
	/** Locked 30 FPS cadence (33.33ms/frame): > 42ms (< ~24 FPS) counts as a slow frame. */
	slowFrameMs: 42,
	/** <= 36ms (>= ~28 FPS) counts as a rock-solid locked 30 FPS frame. */
	fastFrameMs: 36,
	slowFramesToDowngrade: 15,
	fastFramesToUpgrade: 120,
	cooldownMs: 5000,
	autoFloorTier: 'low',
};

export interface VfxTelemetrySnapshot {
	readonly tier: VfxQualityTier;
	readonly ceilingTier: VfxQualityTier;
	readonly budgetScale: number;
	readonly avgFrameMs: number;
	readonly estimatedFps: number;
	readonly activeParticles: number;
	readonly activeRibbons: number;
	readonly activeRings: number;
	readonly activeAmbientMotes: number;
	readonly tickerPaused: boolean;
	readonly downgrades: number;
	readonly upgrades: number;
}

export interface VfxRuntimeCounters {
	readonly activeParticles: number;
	readonly activeRibbons: number;
	readonly activeRings: number;
	readonly activeAmbientMotes: number;
	readonly tickerPaused: boolean;
}

export type VfxQualityListener = (budget: VfxQualityBudget) => void;

export interface VfxPerformanceGovernor {
	getTier(): VfxQualityTier;
	getCeilingTier(): VfxQualityTier;
	getBudget(): VfxQualityBudget;
	setCeilingTier(tier: VfxQualityTier, resetCurrent?: boolean): void;
	/** Records an active (non-idle) frame's deltaMS and adjusts tier if needed. */
	recordActiveFrame(deltaMs: number, nowMs?: number): VfxQualityTier;
	updateRuntimeCounters(counters: Partial<VfxRuntimeCounters>): void;
	getTelemetrySnapshot(): VfxTelemetrySnapshot;
	subscribe(listener: VfxQualityListener): () => void;
	reset(ceilingTier?: VfxQualityTier): void;
}

export function createVfxPerformanceGovernor(
	initialCeiling: VfxQualityTier = 'ultra',
	overrides: Partial<VfxGovernorConfig> = {},
): VfxPerformanceGovernor {
	const config: VfxGovernorConfig = { ...DEFAULT_GOVERNOR_CONFIG, ...overrides };
	let ceilingTier: VfxQualityTier = initialCeiling;
	let currentTier: VfxQualityTier = initialCeiling;
	let avgFrameMs = 33.33;
	let slowStreak = 0;
	let fastStreak = 0;
	let lastTransitionMs = -Infinity;
	let downgrades = 0;
	let upgrades = 0;
	let counters: VfxRuntimeCounters = {
		activeParticles: 0,
		activeRibbons: 0,
		activeRings: 0,
		activeAmbientMotes: 0,
		tickerPaused: false,
	};
	const listeners = new Set<VfxQualityListener>();

	const notify = () => {
		const budget = VFX_QUALITY_BUDGETS[currentTier];
		for (const listener of listeners) {
			listener(budget);
		}
	};

	return {
		getTier(): VfxQualityTier {
			return currentTier;
		},

		getCeilingTier(): VfxQualityTier {
			return ceilingTier;
		},

		getBudget(): VfxQualityBudget {
			return VFX_QUALITY_BUDGETS[currentTier];
		},

		setCeilingTier(tier: VfxQualityTier, resetCurrent = true): void {
			ceilingTier = tier;
			const nextTier = resetCurrent ? tier : minVfxTier(currentTier, tier);
			slowStreak = 0;
			fastStreak = 0;
			if (nextTier !== currentTier) {
				currentTier = nextTier;
				notify();
			}
		},

		recordActiveFrame(deltaMs: number, nowMs: number = Date.now()): VfxQualityTier {
			if (!Number.isFinite(deltaMs) || deltaMs <= 0) return currentTier;
			// Clamp huge tab-switch spikes so switching tabs does not trigger false downgrades
			if (deltaMs > 120) return currentTier;

			avgFrameMs = avgFrameMs * 0.9 + deltaMs * 0.1;

			if (currentTier === 'minimal') return currentTier;

			if (deltaMs >= config.slowFrameMs) {
				slowStreak += 1;
				fastStreak = 0;
				if (
					slowStreak >= config.slowFramesToDowngrade
					&& nowMs - lastTransitionMs >= config.cooldownMs
				) {
					const next = stepDownVfxTier(currentTier, config.autoFloorTier);
					slowStreak = 0;
					if (next !== currentTier) {
						currentTier = next;
						lastTransitionMs = nowMs;
						downgrades += 1;
						notify();
					}
				}
			} else if (deltaMs <= config.fastFrameMs) {
				fastStreak += 1;
				slowStreak = Math.max(0, slowStreak - 1);
				if (
					fastStreak >= config.fastFramesToUpgrade
					&& nowMs - lastTransitionMs >= config.cooldownMs
					&& tierIndex(currentTier) < tierIndex(ceilingTier)
				) {
					const next = stepUpVfxTier(currentTier, ceilingTier);
					fastStreak = 0;
					if (next !== currentTier) {
						currentTier = next;
						lastTransitionMs = nowMs;
						upgrades += 1;
						notify();
					}
				}
			} else {
				slowStreak = Math.max(0, slowStreak - 1);
			}

			return currentTier;
		},

		updateRuntimeCounters(partial: Partial<VfxRuntimeCounters>): void {
			counters = { ...counters, ...partial };
		},

		getTelemetrySnapshot(): VfxTelemetrySnapshot {
			const safeAvg = Math.max(1, avgFrameMs);
			return {
				tier: currentTier,
				ceilingTier,
				budgetScale: VFX_QUALITY_BUDGETS[currentTier].budgetScale,
				avgFrameMs: Math.round(avgFrameMs * 100) / 100,
				estimatedFps: Math.min(240, Math.round(1000 / safeAvg)),
				activeParticles: counters.activeParticles,
				activeRibbons: counters.activeRibbons,
				activeRings: counters.activeRings,
				activeAmbientMotes: counters.activeAmbientMotes,
				tickerPaused: counters.tickerPaused,
				downgrades,
				upgrades,
			};
		},

		subscribe(listener: VfxQualityListener): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		reset(nextCeiling?: VfxQualityTier): void {
			if (nextCeiling !== undefined) {
				ceilingTier = nextCeiling;
			}
			const changed = currentTier !== ceilingTier;
			currentTier = ceilingTier;
			avgFrameMs = 33.33;
			slowStreak = 0;
			fastStreak = 0;
			lastTransitionMs = -Infinity;
			downgrades = 0;
			upgrades = 0;
			counters = {
				activeParticles: 0,
				activeRibbons: 0,
				activeRings: 0,
				activeAmbientMotes: 0,
				tickerPaused: false,
			};
			if (changed) notify();
		},
	};
}

export const vfxQualityController = createVfxPerformanceGovernor('ultra');

/**
 * Syncs the global VFX quality controller with browser hardware + user settings.
 * Safe to call on mount and whenever `useSettingsStore` changes.
 */
export function syncVfxQualityFromEnvironment(settings: VfxUserSettingsInput = {}): VfxQualityBudget {
	const probe = collectBrowserHardwareProbe();
	const detected = detectHardwareVfxTier(probe, settings);
	vfxQualityController.setCeilingTier(detected, true);
	return vfxQualityController.getBudget();
}

export function getVfxTelemetrySnapshot(): VfxTelemetrySnapshot {
	return vfxQualityController.getTelemetrySnapshot();
}
