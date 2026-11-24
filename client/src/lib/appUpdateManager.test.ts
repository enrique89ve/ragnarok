import { describe, expect, it, vi } from 'vitest';
import {
	createAppUpdateManager,
	formatVersionLabel,
	hasManifestUpdate,
	isAppUpdateToastVisible,
	isNewerBuildHash,
	parseVersionManifest,
} from './appUpdateManager';

function createFakeResponse(body: unknown, ok = true): Response {
	return {
		ok,
		json: async () => body,
	} as unknown as Response;
}

const WASM = 'a'.repeat(64);

describe('appUpdateManager', () => {
	it('parses valid version manifests and rejects malformed payloads', () => {
		expect(parseVersionManifest({ buildHash: 'e69af106', builtAt: '2026-11-19T00:00:00Z' })).toEqual({
			buildHash: 'e69af106',
			builtAt: '2026-11-19T00:00:00Z',
		});
		expect(parseVersionManifest({ buildHash: '   ' })).toBeNull();
		expect(parseVersionManifest(null)).toBeNull();
		expect(parseVersionManifest({})).toBeNull();
	});

	it('parses appVersion only when non-empty', () => {
		expect(parseVersionManifest({
			buildHash: 'abc123',
			appVersion: '1.2.0',
		})).toEqual({
			buildHash: 'abc123',
			builtAt: undefined,
			appVersion: '1.2.0',
		});
		expect(parseVersionManifest({
			buildHash: 'abc123',
			appVersion: '  ',
		})).toEqual({
			buildHash: 'abc123',
			builtAt: undefined,
		});
	});

	it('parses optional wasm, campaign registry, and reset epoch fields only when non-empty', () => {
		const wasmHash = 'f'.repeat(64);
		expect(parseVersionManifest({
			buildHash: 'abc123',
			wasmHash,
			campaignRegistryHash: 'reg789',
			resetEpoch: 'alfa-testnet',
		})).toEqual({
			buildHash: 'abc123',
			builtAt: undefined,
			wasmHash,
			campaignRegistryHash: 'reg789',
			resetEpoch: 'alfa-testnet',
		});
		expect(parseVersionManifest({
			buildHash: 'abc123',
			wasmHash: '   ',
			campaignRegistryHash: '',
			resetEpoch: '  ',
		})).toEqual({
			buildHash: 'abc123',
			builtAt: undefined,
		});
	});

	it('formatVersionLabel combines semver and hash', () => {
		expect(formatVersionLabel('1.2.0', '10d8c042')).toBe('v1.2.0 · 10d8c042');
		expect(formatVersionLabel('1.2.0', '')).toBe('v1.2.0');
		expect(formatVersionLabel(null, '10d8c042')).toBe('Build 10d8c042');
		expect(formatVersionLabel(null, null)).toBe('Unknown');
	});

	it('hasManifestUpdate detects build, app, wasm, registry, and reset epoch drift', () => {
		const base = parseVersionManifest({
			buildHash: 'samehash',
			appVersion: '1.0.0',
			wasmHash: WASM,
			campaignRegistryHash: 'reg-a',
			resetEpoch: 'epoch-a',
		})!;

		expect(hasManifestUpdate(base, 'samehash', '1.0.0', WASM, 'reg-a', 'epoch-a')).toBe(false);

		expect(hasManifestUpdate(
			{ ...base, buildHash: 'otherhash' },
			'samehash',
			'1.0.0',
			WASM,
			'reg-a',
			'epoch-a',
		)).toBe(true);

		expect(hasManifestUpdate(
			{ ...base, appVersion: '1.0.1' },
			'samehash',
			'1.0.0',
			WASM,
			'reg-a',
			'epoch-a',
		)).toBe(true);

		expect(hasManifestUpdate(
			{ ...base, wasmHash: 'b'.repeat(64) },
			'samehash',
			'1.0.0',
			WASM,
			'reg-a',
			'epoch-a',
		)).toBe(true);

		expect(hasManifestUpdate(
			{ ...base, campaignRegistryHash: 'reg-b' },
			'samehash',
			'1.0.0',
			WASM,
			'reg-a',
			'epoch-a',
		)).toBe(true);

		expect(hasManifestUpdate(
			{ ...base, resetEpoch: 'epoch-b' },
			'samehash',
			'1.0.0',
			WASM,
			'reg-a',
			'epoch-a',
		)).toBe(true);

		expect(hasManifestUpdate(base, 'dev', '1.0.0', WASM, 'reg-a', 'epoch-a')).toBe(false);
	});

	it('detects newer build hashes and ignores dev builds', () => {
		expect(isNewerBuildHash('abc1234', 'def5678')).toBe(true);
		expect(isNewerBuildHash('abc1234', 'abc1234')).toBe(false);
		expect(isNewerBuildHash('dev', 'def5678')).toBe(false);
		expect(isNewerBuildHash('abc1234', 'dev')).toBe(false);
		expect(isNewerBuildHash('abc1234', '')).toBe(false);
	});

	it('detects a newer build from version.json and notifies subscribers', async () => {
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
			createFakeResponse({
				buildHash: 'new9999',
				appVersion: '1.3.0',
				builtAt: '2026-11-19T22:00:00Z',
			}),
		);
		const manager = createAppUpdateManager({
			currentBuildHash: 'old1111',
			currentAppVersion: '1.2.0',
			baseUrl: '/',
			fetchImpl,
			isOnline: () => true,
			now: () => 123456,
		});

		const listener = vi.fn();
		manager.subscribe(listener);

		const found = await manager.checkForUpdate();
		expect(found).toBe(true);
		expect(fetchImpl).toHaveBeenCalledWith('/version.json?t=123456', {
			cache: 'no-store',
			headers: { Accept: 'application/json' },
		});
		expect(listener).toHaveBeenCalled();

		const snapshot = manager.getSnapshot();
		expect(snapshot.updateAvailable).toBe(true);
		expect(snapshot.latestBuildHash).toBe('new9999');
		expect(snapshot.latestAppVersion).toBe('1.3.0');
		expect(snapshot.latestBuiltAt).toBe('2026-11-19T22:00:00Z');
		expect(snapshot.reason).toBe('version-manifest');
		expect(snapshot.lastCheckedAt).toBe(123456);
		expect(isAppUpdateToastVisible(snapshot)).toBe(true);
	});

	it('detects wasm-only manifest drift when build hash matches', async () => {
		const manager = createAppUpdateManager({
			currentBuildHash: 'same111',
			currentAppVersion: '1.2.0',
			currentWasmHash: WASM,
			fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
				createFakeResponse({
					buildHash: 'same111',
					appVersion: '1.2.0',
					wasmHash: 'b'.repeat(64),
				}),
			),
			isOnline: () => true,
		});

		await manager.checkForUpdate();
		expect(manager.getSnapshot().updateAvailable).toBe(true);
	});

	it('tracks isChecking during checkForUpdate', async () => {
		let resolveFetch: ((value: Response) => void) | undefined;
		const fetchPromise = new Promise<Response>((resolve) => {
			resolveFetch = resolve;
		});
		const fetchImpl = vi.fn<typeof fetch>().mockReturnValue(fetchPromise);

		const manager = createAppUpdateManager({
			currentBuildHash: 'old1111',
			fetchImpl,
			isOnline: () => true,
			now: () => 999,
		});

		const checkPromise = manager.checkForUpdate();
		expect(manager.getSnapshot().isChecking).toBe(true);

		resolveFetch?.(createFakeResponse({ buildHash: 'old1111' }));
		await checkPromise;

		expect(manager.getSnapshot().isChecking).toBe(false);
		expect(manager.getSnapshot().lastCheckedAt).toBe(999);
	});

	it('skips network checks when offline but still records lastCheckedAt', async () => {
		const fetchImpl = vi.fn<typeof fetch>();
		const manager = createAppUpdateManager({
			currentBuildHash: 'old1111',
			fetchImpl,
			isOnline: () => false,
			now: () => 555,
		});

		const found = await manager.checkForUpdate();
		expect(found).toBe(false);
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(manager.getSnapshot().lastCheckedAt).toBe(555);
	});

	it('hides toast after dismissal for the same build and re-shows when a newer build arrives', async () => {
		let remoteHash = 'rev2222';
		const manager = createAppUpdateManager({
			currentBuildHash: 'rev1111',
			currentAppVersion: '1.0.0',
			fetchImpl: vi.fn<typeof fetch>().mockImplementation(async () =>
				createFakeResponse({ buildHash: remoteHash, appVersion: '1.1.0' }),
			),
			isOnline: () => true,
		});

		await manager.checkForUpdate();
		expect(isAppUpdateToastVisible(manager.getSnapshot())).toBe(true);

		manager.dismissUpdate();
		expect(isAppUpdateToastVisible(manager.getSnapshot())).toBe(false);

		await manager.checkForUpdate();
		expect(isAppUpdateToastVisible(manager.getSnapshot())).toBe(false);

		remoteHash = 'rev3333';
		await manager.checkForUpdate();
		expect(manager.getSnapshot().latestBuildHash).toBe('rev3333');
		expect(isAppUpdateToastVisible(manager.getSnapshot())).toBe(true);
	});

	it('detects waiting and newly installed service workers without forcing an immediate reload', () => {
		const reloadPage = vi.fn();
		let updateFoundHandler: (() => void) | null = null;
		let stateChangeHandler: (() => void) | null = null;

		const installingWorker = {
			state: 'installing',
			addEventListener: (_type: string, handler: () => void) => {
				stateChangeHandler = handler;
			},
		};

		const registration = {
			waiting: null,
			installing: installingWorker,
			addEventListener: (type: string, handler: () => void) => {
				if (type === 'updatefound') updateFoundHandler = handler;
			},
			update: vi.fn().mockResolvedValue(undefined),
		} as unknown as ServiceWorkerRegistration;

		const manager = createAppUpdateManager({
			currentBuildHash: 'rev1111',
			getServiceWorkerContainer: () => ({ controller: {} } as unknown as ServiceWorkerContainer),
			reloadPage,
		});

		manager.attachServiceWorkerRegistration(registration);
		expect(manager.getSnapshot().updateAvailable).toBe(false);

		updateFoundHandler?.();
		installingWorker.state = 'installed';
		stateChangeHandler?.();

		expect(manager.getSnapshot().updateAvailable).toBe(true);
		expect(manager.getSnapshot().reason).toBe('service-worker');
		expect(reloadPage).not.toHaveBeenCalled();
	});

	it('clears caches, posts SKIP_WAITING to waiting worker, and reloads on applyUpdate', async () => {
		const clearRagnarokCaches = vi.fn().mockResolvedValue(undefined);
		const reloadPage = vi.fn();
		const postMessage = vi.fn();
		let controllerChangeListener: (() => void) | null = null;

		const swContainer = {
			controller: {},
			addEventListener: (type: string, cb: () => void) => {
				if (type === 'controllerchange') controllerChangeListener = cb;
			},
			removeEventListener: vi.fn(),
		} as unknown as ServiceWorkerContainer;

		const waitingWorker = {
			postMessage: (msg: unknown) => {
				postMessage(msg);
				controllerChangeListener?.();
			},
		};

		const registration = {
			waiting: waitingWorker,
			installing: null,
			addEventListener: vi.fn(),
			update: vi.fn().mockResolvedValue(undefined),
		} as unknown as ServiceWorkerRegistration;

		const manager = createAppUpdateManager({
			currentBuildHash: 'rev1111',
			getServiceWorkerContainer: () => swContainer,
			clearRagnarokCaches,
			reloadPage,
		});

		manager.attachServiceWorkerRegistration(registration);
		await manager.applyUpdate();

		expect(clearRagnarokCaches).toHaveBeenCalledTimes(1);
		expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
		expect(reloadPage).toHaveBeenCalledTimes(1);
	});

	it('forceReloadFresh delegates to applyUpdate', async () => {
		const reloadPage = vi.fn();
		const manager = createAppUpdateManager({
			currentBuildHash: 'rev1111',
			clearRagnarokCaches: vi.fn().mockResolvedValue(undefined),
			reloadPage,
		});

		await manager.forceReloadFresh();
		expect(reloadPage).toHaveBeenCalledTimes(1);
	});
});