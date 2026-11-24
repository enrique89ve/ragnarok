import { describe, expect, it, vi } from 'vitest';
import {
	createAppUpdateManager,
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

	it('detects newer build hashes and ignores dev builds', () => {
		expect(isNewerBuildHash('abc1234', 'def5678')).toBe(true);
		expect(isNewerBuildHash('abc1234', 'abc1234')).toBe(false);
		expect(isNewerBuildHash('dev', 'def5678')).toBe(false);
		expect(isNewerBuildHash('abc1234', 'dev')).toBe(false);
		expect(isNewerBuildHash('abc1234', '')).toBe(false);
	});

	it('detects a newer build from version.json and notifies subscribers', async () => {
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
			createFakeResponse({ buildHash: 'new9999', builtAt: '2026-11-19T22:00:00Z' }),
		);
		const manager = createAppUpdateManager({
			currentBuildHash: 'old1111',
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
		expect(listener).toHaveBeenCalledTimes(1);

		const snapshot = manager.getSnapshot();
		expect(snapshot.updateAvailable).toBe(true);
		expect(snapshot.latestBuildHash).toBe('new9999');
		expect(snapshot.reason).toBe('version-manifest');
		expect(isAppUpdateToastVisible(snapshot)).toBe(true);
	});

	it('skips network checks when offline', async () => {
		const fetchImpl = vi.fn<typeof fetch>();
		const manager = createAppUpdateManager({
			currentBuildHash: 'old1111',
			fetchImpl,
			isOnline: () => false,
		});

		const found = await manager.checkForUpdate();
		expect(found).toBe(false);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('hides toast after dismissal for the same build and re-shows when a newer build arrives', async () => {
		let remoteHash = 'rev2222';
		const manager = createAppUpdateManager({
			currentBuildHash: 'rev1111',
			fetchImpl: vi.fn<typeof fetch>().mockImplementation(async () =>
				createFakeResponse({ buildHash: remoteHash }),
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
});
