import { CHUNK_CACHE_BUST_QUERY } from './chunkLoadRecovery';

declare const __BUILD_HASH__: string;

export interface VersionManifest {
	readonly buildHash: string;
	readonly builtAt?: string;
}

export type AppUpdateReason = 'version-manifest' | 'service-worker' | null;

export interface AppUpdateState {
	readonly updateAvailable: boolean;
	readonly isApplying: boolean;
	readonly currentBuildHash: string;
	readonly latestBuildHash: string | null;
	readonly reason: AppUpdateReason;
	readonly dismissedForKey: string | null;
}

export interface AppUpdateManagerDeps {
	readonly currentBuildHash?: string;
	readonly baseUrl?: string;
	readonly fetchImpl?: typeof fetch;
	readonly isOnline?: () => boolean;
	readonly getServiceWorkerContainer?: () => ServiceWorkerContainer | undefined;
	readonly clearRagnarokCaches?: () => Promise<void>;
	readonly reloadPage?: () => void;
	readonly now?: () => number;
}

export interface AppUpdateManager {
	getSnapshot(): AppUpdateState;
	subscribe(listener: () => void): () => void;
	attachServiceWorkerRegistration(registration: ServiceWorkerRegistration): void;
	checkForUpdate(): Promise<boolean>;
	applyUpdate(): Promise<void>;
	dismissUpdate(): void;
	startPolling(options?: {
		readonly initialDelayMs?: number;
		readonly intervalMs?: number;
		readonly visibilityThrottleMs?: number;
	}): () => void;
}

const DEFAULT_INITIAL_DELAY_MS = 5_000;
const DEFAULT_POLL_INTERVAL_MS = 3 * 60 * 1000;
const DEFAULT_VISIBILITY_THROTTLE_MS = 30_000;
const CONTROLLER_CHANGE_TIMEOUT_MS = 1_500;

export function getCurrentBuildHash(): string {
	return typeof __BUILD_HASH__ !== 'undefined' && __BUILD_HASH__
		? String(__BUILD_HASH__).trim()
		: 'dev';
}

export function parseVersionManifest(payload: unknown): VersionManifest | null {
	if (!payload || typeof payload !== 'object') return null;
	const record = payload as Record<string, unknown>;
	if (typeof record.buildHash !== 'string') return null;
	const buildHash = record.buildHash.trim();
	if (!buildHash) return null;

	return {
		buildHash,
		builtAt: typeof record.builtAt === 'string' ? record.builtAt : undefined,
	};
}

export function isNewerBuildHash(
	currentHash: string,
	remoteHash: string | null | undefined,
): boolean {
	const current = currentHash.trim();
	const remote = typeof remoteHash === 'string' ? remoteHash.trim() : '';
	if (!current || !remote) return false;
	if (current === 'dev' || remote === 'dev') return false;
	return current !== remote;
}

export function getUpdateDismissKey(state: Pick<AppUpdateState, 'latestBuildHash' | 'reason'>): string | null {
	if (state.latestBuildHash) return state.latestBuildHash;
	if (state.reason === 'service-worker') return 'service-worker';
	return null;
}

export function isAppUpdateToastVisible(state: AppUpdateState): boolean {
	if (!state.updateAvailable) return false;
	const key = getUpdateDismissKey(state);
	return key === null || state.dismissedForKey !== key;
}

async function defaultClearRagnarokCaches(): Promise<void> {
	if (typeof window === 'undefined' || !('caches' in window)) return;
	const cacheNames = await window.caches.keys();
	await Promise.all(
		cacheNames
			.filter((cacheName) => cacheName.startsWith('ragnarok-'))
			.map((cacheName) => window.caches.delete(cacheName)),
	);
}

function defaultReloadWithCacheBust(): void {
	if (typeof window === 'undefined') return;
	const nextUrl = new URL(window.location.href);
	nextUrl.searchParams.set(CHUNK_CACHE_BUST_QUERY, String(Date.now()));
	window.location.replace(nextUrl.toString());
}

function resolveVersionManifestUrl(baseUrl: string, timestamp: number): string {
	const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
	return `${normalizedBase}version.json?t=${timestamp}`;
}

export function createAppUpdateManager(deps: AppUpdateManagerDeps = {}): AppUpdateManager {
	const currentBuildHash = deps.currentBuildHash ?? getCurrentBuildHash();
	const baseUrl = deps.baseUrl ?? (import.meta.env?.BASE_URL || '/');
	const fetchImpl = deps.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
	const isOnline = deps.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
	const getSwContainer = deps.getServiceWorkerContainer
		?? (() => (typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker : undefined));
	const clearCaches = deps.clearRagnarokCaches ?? defaultClearRagnarokCaches;
	const reloadPage = deps.reloadPage ?? defaultReloadWithCacheBust;
	const now = deps.now ?? (() => Date.now());

	const listeners = new Set<() => void>();
	let registration: ServiceWorkerRegistration | null = null;
	let inFlightCheck: Promise<boolean> | null = null;
	let lastCheckAt = 0;

	let state: AppUpdateState = {
		updateAvailable: false,
		isApplying: false,
		currentBuildHash,
		latestBuildHash: null,
		reason: null,
		dismissedForKey: null,
	};

	function emit(): void {
		for (const listener of listeners) {
			listener();
		}
	}

	function setState(patch: Partial<AppUpdateState>): void {
		const next: AppUpdateState = { ...state, ...patch };
		const changed = next.updateAvailable !== state.updateAvailable
			|| next.isApplying !== state.isApplying
			|| next.latestBuildHash !== state.latestBuildHash
			|| next.reason !== state.reason
			|| next.dismissedForKey !== state.dismissedForKey;
		if (!changed) return;
		state = next;
		emit();
	}

	function markServiceWorkerUpdateAvailable(): void {
		setState({
			updateAvailable: true,
			reason: state.latestBuildHash ? state.reason : 'service-worker',
		});
	}

	function attachServiceWorkerRegistration(reg: ServiceWorkerRegistration): void {
		registration = reg;
		const swContainer = getSwContainer();
		const hasController = Boolean(swContainer?.controller);

		if (reg.waiting && hasController) {
			markServiceWorkerUpdateAvailable();
		}

		reg.addEventListener('updatefound', () => {
			const installing = reg.installing;
			if (!installing) return;
			installing.addEventListener('statechange', () => {
				if (installing.state === 'installed' && Boolean(getSwContainer()?.controller)) {
					markServiceWorkerUpdateAvailable();
				}
			});
		});
	}

	async function checkForUpdate(): Promise<boolean> {
		if (!isOnline()) return state.updateAvailable;
		if (inFlightCheck) return inFlightCheck;

		inFlightCheck = (async () => {
			lastCheckAt = now();

			if (registration) {
				try {
					await registration.update();
				} catch {
					// Non-fatal: continue with version.json check.
				}
				if (registration.waiting && Boolean(getSwContainer()?.controller)) {
					markServiceWorkerUpdateAvailable();
				}
			}

			try {
				const response = await fetchImpl(resolveVersionManifestUrl(baseUrl, now()), {
					cache: 'no-store',
					headers: { Accept: 'application/json' },
				});
				if (response.ok) {
					const manifest = parseVersionManifest(await response.json());
					if (manifest && isNewerBuildHash(currentBuildHash, manifest.buildHash)) {
						setState({
							updateAvailable: true,
							latestBuildHash: manifest.buildHash,
							reason: 'version-manifest',
						});
						return true;
					}
				}
			} catch {
				// Network hiccup or offline — ignore until next check.
			}

			return state.updateAvailable;
		})().finally(() => {
			inFlightCheck = null;
		});

		return inFlightCheck;
	}

	async function activateWaitingServiceWorker(): Promise<void> {
		const swContainer = getSwContainer();
		if (!swContainer) return;

		let waiting = registration?.waiting ?? null;
		if (!waiting && typeof swContainer.getRegistration === 'function') {
			try {
				const reg = await swContainer.getRegistration();
				if (reg) {
					registration = reg;
					await reg.update().catch(() => {});
					waiting = reg.waiting;
				}
			} catch {
				// Proceed with reload even if SW lookup fails.
			}
		}

		if (!waiting) return;

		await new Promise<void>((resolve) => {
			let settled = false;
			const finish = () => {
				if (settled) return;
				settled = true;
				swContainer.removeEventListener?.('controllerchange', finish);
				resolve();
			};

			swContainer.addEventListener?.('controllerchange', finish);
			try {
				waiting.postMessage({ type: 'SKIP_WAITING' });
			} catch {
				finish();
				return;
			}
			globalThis.setTimeout(finish, CONTROLLER_CHANGE_TIMEOUT_MS);
		});
	}

	async function applyUpdate(): Promise<void> {
		if (state.isApplying) return;
		setState({ isApplying: true });

		try {
			await clearCaches();
			await activateWaitingServiceWorker();
		} catch {
			// Still reload so the browser pulls fresh index.html and hashed bundles.
		}

		reloadPage();
	}

	function dismissUpdate(): void {
		const key = getUpdateDismissKey(state);
		if (!key) return;
		setState({ dismissedForKey: key });
	}

	function startPolling(options?: {
		readonly initialDelayMs?: number;
		readonly intervalMs?: number;
		readonly visibilityThrottleMs?: number;
	}): () => void {
		const initialDelayMs = options?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
		const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
		const visibilityThrottleMs = options?.visibilityThrottleMs ?? DEFAULT_VISIBILITY_THROTTLE_MS;

		const initialTimer = globalThis.setTimeout(() => {
			void checkForUpdate();
		}, initialDelayMs);

		const pollTimer = globalThis.setInterval(() => {
			void checkForUpdate();
		}, intervalMs);

		const handleVisibilityChange = () => {
			if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
			if (now() - lastCheckAt < visibilityThrottleMs) return;
			void checkForUpdate();
		};

		const handleOnline = () => {
			void checkForUpdate();
		};

		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', handleVisibilityChange);
		}
		if (typeof window !== 'undefined') {
			window.addEventListener('online', handleOnline);
		}

		return () => {
			globalThis.clearTimeout(initialTimer);
			globalThis.clearInterval(pollTimer);
			if (typeof document !== 'undefined') {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
			}
			if (typeof window !== 'undefined') {
				window.removeEventListener('online', handleOnline);
			}
		};
	}

	return {
		getSnapshot: () => state,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		attachServiceWorkerRegistration,
		checkForUpdate,
		applyUpdate,
		dismissUpdate,
		startPolling,
	};
}

export const appUpdateManager = createAppUpdateManager();
