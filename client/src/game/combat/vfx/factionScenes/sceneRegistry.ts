/**
 * sceneRegistry.ts
 *
 * Extensible registry for tribe/faction 2D PixiJS VFX scenes.
 * Manages scene lookup, concurrency caps, deduplication cooldowns, and clean
 * cancellation on combat teardown — completely isolated from gameplay state.
 */

import { debug } from '../../../config/debugConfig';
import { isVisualEventRendererEnabled } from '../emitter';
import { playDragonFireBreath, playDragonFlameIgnition } from './scenes/dragonFlameScene';
import { playDragonShadowFlight } from './scenes/dragonShadowFlightScene';
import {
	playTitanColossusQuake,
	playTitanEarthSlam,
	playTitanPantheonDescent,
} from './scenes/titanScene';
import { disposeAllFactionGpuAssets } from './runtime/gpuAssetPool';
import { stopAllRunningPixiScenes } from './runtime/sceneRunner';
import type {
	FactionSceneHandle,
	FactionSceneRenderer,
	FactionVfxSceneId,
	FactionVfxSceneRequest,
} from './types';

interface ActiveSceneEntry {
	readonly sceneId: FactionVfxSceneId;
	readonly handle: FactionSceneHandle;
	readonly expiresAtMs: number;
}

const SCENE_MAX_CONCURRENT: Record<FactionVfxSceneId, number> = {
	'dragon-shadow-flight': 1,
	'dragon-flame-ignition': 4,
	'dragon-fire-breath': 3,
	'titan-pantheon-descent': 1,
	'titan-earth-slam': 4,
	'titan-colossus-quake': 3,
};

const SCENE_ESTIMATED_TTL_MS: Record<FactionVfxSceneId, number> = {
	'dragon-shadow-flight': 2_800,
	'dragon-flame-ignition': 1_500,
	'dragon-fire-breath': 1_300,
	'titan-pantheon-descent': 2_600,
	'titan-earth-slam': 1_400,
	'titan-colossus-quake': 1_300,
};

const DEFAULT_RENDERERS: Readonly<Record<FactionVfxSceneId, FactionSceneRenderer>> = {
	'dragon-flame-ignition': playDragonFlameIgnition,
	'dragon-fire-breath': playDragonFireBreath,
	'dragon-shadow-flight': playDragonShadowFlight,
	'titan-earth-slam': playTitanEarthSlam,
	'titan-colossus-quake': playTitanColossusQuake,
	'titan-pantheon-descent': playTitanPantheonDescent,
};

const renderers = new Map<FactionVfxSceneId, FactionSceneRenderer>(
	Object.entries(DEFAULT_RENDERERS) as Array<[FactionVfxSceneId, FactionSceneRenderer]>,
);

let activeScenes: ActiveSceneEntry[] = [];

function pruneExpiredScenes(nowMs: number): void {
	activeScenes = activeScenes.filter(entry => entry.expiresAtMs > nowMs);
}

export function registerFactionVfxScene(
	sceneId: FactionVfxSceneId,
	renderer: FactionSceneRenderer,
): () => void {
	renderers.set(sceneId, renderer);
	return () => {
		if (renderers.get(sceneId) === renderer) {
			const fallback = DEFAULT_RENDERERS[sceneId];
			if (fallback) {
				renderers.set(sceneId, fallback);
			} else {
				renderers.delete(sceneId);
			}
		}
	};
}

export function playFactionVfxScene(request: FactionVfxSceneRequest): FactionSceneHandle | null {
	if (!isVisualEventRendererEnabled()) return null;

	const renderer = renderers.get(request.sceneId);
	if (!renderer) return null;

	const nowMs = Date.now();
	pruneExpiredScenes(nowMs);

	const maxConcurrent = SCENE_MAX_CONCURRENT[request.sceneId] ?? 3;
	const sameKind = activeScenes.filter(entry => entry.sceneId === request.sceneId);
	if (sameKind.length >= maxConcurrent) {
		const oldest = sameKind[0];
		if (oldest) {
			try {
				oldest.handle.cancel();
			} catch (error) {
				debug.warn(`[FactionVfxRegistry] Failed to cancel evicted scene ${oldest.sceneId}:`, error);
			}
			activeScenes = activeScenes.filter(entry => entry !== oldest);
		}
	}

	let handle: FactionSceneHandle | null = null;
	try {
		handle = renderer(request);
	} catch (error) {
		debug.error(`[FactionVfxRegistry] Scene "${request.sceneId}" failed:`, error);
		return null;
	}

	if (!handle) return null;

	const entry: ActiveSceneEntry = {
		sceneId: request.sceneId,
		handle,
		expiresAtMs: nowMs + (SCENE_ESTIMATED_TTL_MS[request.sceneId] ?? 2_000),
	};
	activeScenes.push(entry);

	return {
		sceneId: handle.sceneId,
		cancel() {
			activeScenes = activeScenes.filter(candidate => candidate !== entry);
			try {
				handle.cancel();
			} catch (error) {
				debug.warn(`[FactionVfxRegistry] Cancel error for "${request.sceneId}":`, error);
			}
		},
	};
}

export function cancelAllFactionVfxScenes(): void {
	const pending = activeScenes;
	activeScenes = [];
	for (const entry of pending) {
		try {
			entry.handle.cancel();
		} catch (error) {
			debug.warn(`[FactionVfxRegistry] Cancel failed for "${entry.sceneId}":`, error);
		}
	}
	stopAllRunningPixiScenes();
	disposeAllFactionGpuAssets();
}

export function getActiveFactionSceneCount(): number {
	pruneExpiredScenes(Date.now());
	return activeScenes.length;
}

export function resetFactionVfxRegistry(): void {
	cancelAllFactionVfxScenes();
	renderers.clear();
	for (const [sceneId, renderer] of Object.entries(DEFAULT_RENDERERS) as Array<[FactionVfxSceneId, FactionSceneRenderer]>) {
		renderers.set(sceneId, renderer);
	}
}
