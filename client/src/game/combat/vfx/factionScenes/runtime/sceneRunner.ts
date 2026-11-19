/**
 * sceneRunner.ts
 *
 * Single shared PixiJS v8 ticker scheduler for all faction VFX scenes.
 *
 * CPU & RAM benefits:
 * - Drives all concurrent scenes in ONE ticker pass instead of N separate listeners.
 * - Automatically detaches from `app.ticker` when idle (0 active scenes = 0 CPU cost).
 * - Guarantees deterministic `dt` clamping (<= 50ms) and exception-safe container cleanup.
 */

import { Container, type Application, type Ticker } from 'pixi.js';
import { debug } from '../../../../config/debugConfig';
import {
	getFactionSceneContainer,
	getPixiApp,
} from '../../../../animations/PixiParticleCanvas';
import type { FactionSceneHandle, FactionVfxSceneId } from '../types';

export interface SceneStepState {
	readonly age: number;
	readonly dt: number;
	readonly progress: number;
	readonly durationSec: number;
}

export interface TimedSceneDescriptor {
	readonly sceneId: FactionVfxSceneId;
	readonly durationSec: number;
	/** Called once with the newly mounted scene container; return update & optional dispose hooks. */
	readonly mount: (effect: Container, app: Application) => {
		readonly onUpdate: (state: SceneStepState) => void;
		readonly onDispose?: () => void;
	};
}

interface RunningScene {
	readonly sceneId: FactionVfxSceneId;
	readonly app: Application;
	readonly root: Container;
	readonly effect: Container;
	readonly durationSec: number;
	readonly onUpdate: (state: SceneStepState) => void;
	readonly onDispose?: () => void;
	age: number;
	disposed: boolean;
}

const runningScenes: RunningScene[] = [];
let attachedApp: Application | null = null;

function disposeRunningScene(scene: RunningScene): void {
	const entry = scene;
	if (entry.disposed) return;
	entry.disposed = true;
	try {
		entry.onDispose?.();
	} catch (error) {
		debug.warn(`[FactionSceneRunner] Dispose error in "${entry.sceneId}":`, error);
	}
	if (!entry.effect.destroyed) {
		if (entry.effect.parent === entry.root) {
			entry.root.removeChild(entry.effect);
		}
		entry.effect.destroy({ children: true });
	}
}

function detachTickerIfIdle(): void {
	if (runningScenes.length > 0 || !attachedApp) return;
	try {
		attachedApp.ticker.remove(tickAllScenes);
	} catch {
		// Ticker already torn down on context loss
	}
	attachedApp = null;
}

function tickAllScenes(ticker: Ticker): void {
	const dt = Math.min(ticker.deltaMS, 50) / 1000;
	const currentRoot = getFactionSceneContainer();

	for (let i = runningScenes.length - 1; i >= 0; i -= 1) {
		const scene = runningScenes[i];
		if (scene.disposed || scene.effect.destroyed || scene.root !== currentRoot) {
			disposeRunningScene(scene);
			runningScenes.splice(i, 1);
			continue;
		}

		scene.age += dt;
		if (scene.age >= scene.durationSec) {
			disposeRunningScene(scene);
			runningScenes.splice(i, 1);
			continue;
		}

		try {
			scene.onUpdate({
				age: scene.age,
				dt,
				progress: scene.age / scene.durationSec,
				durationSec: scene.durationSec,
			});
		} catch (error) {
			debug.error(`[FactionSceneRunner] Update error in "${scene.sceneId}":`, error);
			disposeRunningScene(scene);
			runningScenes.splice(i, 1);
		}
	}

	detachTickerIfIdle();
}

function ensureTickerAttached(app: Application): void {
	if (attachedApp === app) return;
	if (attachedApp) {
		try {
			attachedApp.ticker.remove(tickAllScenes);
		} catch {
			// Previous app already torn down
		}
	}
	attachedApp = app;
	app.ticker.add(tickAllScenes);
}

/**
 * Mounts a timed 2D PixiJS scene onto the shared faction scene container and
 * registers it with the unified ticker loop.
 */
export function runTimedPixiScene(descriptor: TimedSceneDescriptor): FactionSceneHandle | null {
	const app = getPixiApp();
	const root = getFactionSceneContainer();
	if (typeof window === 'undefined' || !app || !root) return null;

	const effect = new Container();
	root.addChild(effect);

	let hooks: ReturnType<TimedSceneDescriptor['mount']>;
	try {
		hooks = descriptor.mount(effect, app);
	} catch (error) {
		if (effect.parent === root) root.removeChild(effect);
		effect.destroy({ children: true });
		debug.error(`[FactionSceneRunner] Mount failed for "${descriptor.sceneId}":`, error);
		return null;
	}

	const entry: RunningScene = {
		sceneId: descriptor.sceneId,
		app,
		root,
		effect,
		durationSec: Math.max(0.05, descriptor.durationSec),
		onUpdate: hooks.onUpdate,
		onDispose: hooks.onDispose,
		age: 0,
		disposed: false,
	};

	runningScenes.push(entry);
	ensureTickerAttached(app);

	return {
		sceneId: descriptor.sceneId,
		cancel() {
			const idx = runningScenes.indexOf(entry);
			if (idx >= 0) runningScenes.splice(idx, 1);
			disposeRunningScene(entry);
			detachTickerIfIdle();
		},
	};
}

export function stopAllRunningPixiScenes(): void {
	const snapshot = runningScenes.splice(0, runningScenes.length);
	for (const scene of snapshot) {
		disposeRunningScene(scene);
	}
	detachTickerIfIdle();
}

export function getRunningPixiSceneCount(): number {
	return runningScenes.length;
}
