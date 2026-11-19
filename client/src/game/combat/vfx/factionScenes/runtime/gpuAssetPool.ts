/**
 * gpuAssetPool.ts
 *
 * Centralized GPU texture, FillGradient, and spritesheet cache for all faction VFX.
 *
 * Resource discipline:
 * - Lazy-initializes each tribe's textures on first use (0 VRAM spent on unused tribes).
 * - Reuses cached GPU FillGradients across casts (0 per-cast texture allocations/uploads).
 * - Automatically invalidates if the Pixi Application remounts.
 * - Single `disposeAllFactionGpuAssets()` releases every cached texture & gradient cleanly.
 */

import { Assets, FillGradient, Rectangle, Texture, type Application } from 'pixi.js';
import {
	buildDragonFlameTextures,
	destroyDragonFlameTextureSet,
	type DragonFlameTextures,
} from '../scenes/dragonFlameTextures';
import {
	buildTitanVfxTextures,
	destroyTitanTextureSet,
	type TitanVfxTextures,
} from '../scenes/titanTextures';
import { rgbToRgbaString } from './geometryPrimitives';

export interface UnifiedFlameGradients {
	readonly outer: FillGradient;
	readonly mid: FillGradient;
	readonly inner: FillGradient;
	readonly core: FillGradient;
}

export interface FlameGradientColorSpec {
	readonly key: string;
	readonly coreTint: number;
	readonly coneCore: number;
	readonly coneMid: number;
	readonly coneOuter: number;
}

export const DRAGON_FLIGHT_SPRITESHEET = {
	url: '/assets/vfx/dragon-flight/dragon-shadow-spritesheet.webp',
	cols: 4,
	rows: 2,
	frameWidth: 256,
	frameHeight: 172,
	frameCount: 8,
	fps: 13,
} as const;

let boundApp: Application | null = null;
let dragonFlameCache: DragonFlameTextures | null = null;
let titanCache: TitanVfxTextures | null = null;
const flameGradientCache = new Map<string, UnifiedFlameGradients>();

let dragonFramesPromise: Promise<readonly Texture[] | null> | null = null;
let dragonFramesCache: readonly Texture[] | null = null;

function ensureBoundApp(app: Application): void {
	if (boundApp !== null && boundApp !== app) {
		disposeAllFactionGpuAssets();
	}
	boundApp = app;
}

function makeVerticalGradient(stops: Array<{ offset: number; color: string }>): FillGradient {
	return new FillGradient({
		type: 'linear',
		start: { x: 0.5, y: 1 },
		end: { x: 0.5, y: 0 },
		textureSpace: 'local',
		colorStops: stops,
	});
}

export function acquireDragonFlameTextures(app: Application): DragonFlameTextures | null {
	if (typeof document === 'undefined') return null;
	ensureBoundApp(app);
	if (!dragonFlameCache) {
		dragonFlameCache = buildDragonFlameTextures();
	}
	return dragonFlameCache;
}

export function acquireTitanTextures(app: Application): TitanVfxTextures | null {
	if (typeof document === 'undefined') return null;
	ensureBoundApp(app);
	if (!titanCache) {
		titanCache = buildTitanVfxTextures();
	}
	return titanCache;
}

/**
 * Returns cached GPU vertical thermal FillGradients for the unified dragon flame,
 * eliminating per-cast FillGradient canvas creation and VRAM churn.
 */
export function acquireUnifiedFlameGradients(
	app: Application,
	spec: FlameGradientColorSpec,
): UnifiedFlameGradients {
	ensureBoundApp(app);
	const existing = flameGradientCache.get(spec.key);
	if (existing) return existing;

	const created: UnifiedFlameGradients = {
		outer: makeVerticalGradient([
			{ offset: 0, color: rgbToRgbaString(spec.coneMid, 0.46) },
			{ offset: 0.36, color: rgbToRgbaString(spec.coneOuter, 0.36) },
			{ offset: 0.74, color: rgbToRgbaString(spec.coneOuter, 0.16) },
			{ offset: 1, color: rgbToRgbaString(spec.coneOuter, 0) },
		]),
		mid: makeVerticalGradient([
			{ offset: 0, color: rgbToRgbaString(spec.coneCore, 0.58) },
			{ offset: 0.42, color: rgbToRgbaString(spec.coneMid, 0.44) },
			{ offset: 0.78, color: rgbToRgbaString(spec.coneOuter, 0.16) },
			{ offset: 1, color: rgbToRgbaString(spec.coneOuter, 0) },
		]),
		inner: makeVerticalGradient([
			{ offset: 0, color: rgbToRgbaString(spec.coreTint, 0.74) },
			{ offset: 0.45, color: rgbToRgbaString(spec.coneCore, 0.52) },
			{ offset: 0.82, color: rgbToRgbaString(spec.coneMid, 0.14) },
			{ offset: 1, color: rgbToRgbaString(spec.coneMid, 0) },
		]),
		core: makeVerticalGradient([
			{ offset: 0, color: rgbToRgbaString(spec.coreTint, 0.76) },
			{ offset: 0.55, color: rgbToRgbaString(spec.coneCore, 0.42) },
			{ offset: 1, color: rgbToRgbaString(spec.coneCore, 0) },
		]),
	};
	flameGradientCache.set(spec.key, created);
	return created;
}

function sliceDragonSpritesheet(sheet: Texture): readonly Texture[] {
	const frames: Texture[] = [];
	const { cols, rows, frameWidth, frameHeight } = DRAGON_FLIGHT_SPRITESHEET;
	for (let row = 0; row < rows; row += 1) {
		for (let col = 0; col < cols; col += 1) {
			const rect = new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight);
			frames.push(new Texture({ source: sheet.source, frame: rect }));
		}
	}
	return frames;
}

export function preloadDragonShadowFrames(): Promise<readonly Texture[] | null> {
	if (dragonFramesCache) return Promise.resolve(dragonFramesCache);
	if (!dragonFramesPromise) {
		dragonFramesPromise = Assets.load<Texture>(DRAGON_FLIGHT_SPRITESHEET.url)
			.then((sheet) => {
				const frames = sliceDragonSpritesheet(sheet);
				dragonFramesCache = frames;
				return frames;
			})
			.catch(() => {
				dragonFramesPromise = null;
				return null;
			});
	}
	return dragonFramesPromise;
}

export function disposeAllFactionGpuAssets(): void {
	if (dragonFlameCache) {
		destroyDragonFlameTextureSet(dragonFlameCache);
		dragonFlameCache = null;
	}
	if (titanCache) {
		destroyTitanTextureSet(titanCache);
		titanCache = null;
	}
	for (const gradients of flameGradientCache.values()) {
		gradients.outer.destroy();
		gradients.mid.destroy();
		gradients.inner.destroy();
		gradients.core.destroy();
	}
	flameGradientCache.clear();

	if (dragonFramesCache) {
		for (const frame of dragonFramesCache) {
			frame.destroy(false);
		}
		dragonFramesCache = null;
	}
	dragonFramesPromise = null;
	boundApp = null;
}

export function getGpuPoolDiagnostics(): {
	readonly hasDragonFlameTextures: boolean;
	readonly hasTitanTextures: boolean;
	readonly cachedFlameGradientThemes: number;
	readonly hasDragonFlightFrames: boolean;
} {
	return {
		hasDragonFlameTextures: dragonFlameCache !== null,
		hasTitanTextures: titanCache !== null,
		cachedFlameGradientThemes: flameGradientCache.size,
		hasDragonFlightFrames: dragonFramesCache !== null,
	};
}
