/**
 * vfxPerfProfiler.ts
 *
 * Riot-style ("Waffles" / "The Case of the Missing Milliseconds") zero-allocation
 * ring-buffer frame-budget profiler for the Poker VFX pipeline.
 *
 * Measures active-frame deltaMS and `stepSimulation` CPU time in fixed Float32Arrays
 * so developers and CI QA gates can inspect p50 / p95 / p99 frame times, hitches,
 * and pool reuse ratios without perturbing runtime GC.
 */

import {
	getVfxTelemetrySnapshot,
	type VfxTelemetrySnapshot,
} from './vfxQualityProfile';
import {
	vfxOrchestrationDirector,
	type VfxCascadeTelemetry,
} from './vfxOrchestrationDirector';

export interface VfxPoolCounters {
	readonly spriteActive: number;
	readonly spritePooled: number;
	readonly spriteCreated: number;
	readonly spriteReused: number;
	readonly spriteReuseRatio: number;
	readonly ribbonStrandsPooled: number;
	readonly ribbonStrandsCreated: number;
	readonly ribbonStrandsReused: number;
}

export interface VfxPerfReport {
	readonly sampleCount: number;
	readonly frameMsP50: number;
	readonly frameMsP95: number;
	readonly frameMsP99: number;
	readonly simCpuMsP50: number;
	readonly simCpuMsP95: number;
	readonly simCpuMsP99: number;
	readonly hitchCount: number;
	readonly telemetry: VfxTelemetrySnapshot;
	readonly pools: VfxPoolCounters;
	readonly cascade: VfxCascadeTelemetry;
}

export interface VfxPerfProfiler {
	recordSample(frameDeltaMs: number, simCpuMs: number): void;
	setPoolCountersProvider(provider: () => VfxPoolCounters): void;
	snapshot(): VfxPerfReport;
	reset(): void;
}

const DEFAULT_RING_SIZE = 240;
/** Locked 30 FPS cadence (33.33ms/frame): >= 45ms indicates a genuine frame hitch. */
const HITCH_THRESHOLD_MS = 45;
const TAB_SWITCH_CLAMP_MS = 120;

const EMPTY_POOLS: VfxPoolCounters = {
	spriteActive: 0,
	spritePooled: 0,
	spriteCreated: 0,
	spriteReused: 0,
	spriteReuseRatio: 0,
	ribbonStrandsPooled: 0,
	ribbonStrandsCreated: 0,
	ribbonStrandsReused: 0,
};

function computePercentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0;
	const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
	return Math.round(sorted[idx] * 100) / 100;
}

export function createVfxPerfProfiler(ringSize = DEFAULT_RING_SIZE): VfxPerfProfiler {
	const frameRing = new Float32Array(ringSize);
	const simRing = new Float32Array(ringSize);
	let writeIdx = 0;
	let count = 0;
	let hitchCount = 0;
	let poolProvider: () => VfxPoolCounters = () => EMPTY_POOLS;

	return {
		recordSample(frameDeltaMs: number, simCpuMs: number): void {
			if (!Number.isFinite(frameDeltaMs) || frameDeltaMs <= 0 || frameDeltaMs > TAB_SWITCH_CLAMP_MS) {
				return;
			}
			const safeCpu = Number.isFinite(simCpuMs) && simCpuMs >= 0 ? simCpuMs : 0;
			frameRing[writeIdx] = frameDeltaMs;
			simRing[writeIdx] = safeCpu;
			writeIdx = (writeIdx + 1) % ringSize;
			if (count < ringSize) count += 1;
			if (frameDeltaMs >= HITCH_THRESHOLD_MS) {
				hitchCount += 1;
			}
		},

		setPoolCountersProvider(provider: () => VfxPoolCounters): void {
			poolProvider = provider;
		},

		snapshot(): VfxPerfReport {
			const frames: number[] = [];
			const sims: number[] = [];
			for (let i = 0; i < count; i += 1) {
				frames.push(frameRing[i]);
				sims.push(simRing[i]);
			}
			frames.sort((a, b) => a - b);
			sims.sort((a, b) => a - b);

			return {
				sampleCount: count,
				frameMsP50: computePercentile(frames, 0.5),
				frameMsP95: computePercentile(frames, 0.95),
				frameMsP99: computePercentile(frames, 0.99),
				simCpuMsP50: computePercentile(sims, 0.5),
				simCpuMsP95: computePercentile(sims, 0.95),
				simCpuMsP99: computePercentile(sims, 0.99),
				hitchCount,
				telemetry: getVfxTelemetrySnapshot(),
				pools: poolProvider(),
				cascade: vfxOrchestrationDirector.getCascadeTelemetry(),
			};
		},

		reset(): void {
			frameRing.fill(0);
			simRing.fill(0);
			writeIdx = 0;
			count = 0;
			hitchCount = 0;
		},
	};
}

export const vfxPerfProfiler = createVfxPerfProfiler();

export function installVfxPerfWindowHandle(): void {
	if (typeof window === 'undefined') return;
	const win = window as Window & {
		__VFX_PERF__?: {
			snapshot: () => VfxPerfReport;
			reset: () => void;
		};
	};
	win.__VFX_PERF__ = {
		snapshot: () => vfxPerfProfiler.snapshot(),
		reset: () => vfxPerfProfiler.reset(),
	};
}
