import { debug } from '../../config/debugConfig';
import {
	P2P_TRANSPORT_CONFIG_PATH,
	parseP2PTransportConfig,
	type P2PTransportConfig,
} from '@shared/p2p-wire/transportConfig';
import {
	getP2PIceServers,
	isP2PWebRTCEnabled,
	isP2PWebSocketFallbackEnabled,
} from '../../config/featureFlags';

const CONFIG_CACHE_TTL_MS = 30_000;
const CONFIG_REQUEST_TIMEOUT_MS = 1_500;

let cachedConfig: P2PTransportConfig | null = null;
let cachedAt = 0;
let requestPromise: Promise<P2PTransportConfig> | null = null;

function fallbackConfig(): P2PTransportConfig {
	return {
		version: 1,
		webrtcEnabled: isP2PWebRTCEnabled(),
		relayEnabled: isP2PWebSocketFallbackEnabled(),
		connectTimeoutMs: 20_000,
		iceServers: getP2PIceServers(),
	};
}

function getConfigUrl(): string | null {
	const browserWindow = globalThis.window;
	if (!browserWindow) return null;
	const apiBase = import.meta.env.VITE_API_URL?.trim();
	try {
		return new URL(P2P_TRANSPORT_CONFIG_PATH, apiBase || browserWindow.origin).toString();
	} catch {
		return null;
	}
}

async function fetchConfig(): Promise<P2PTransportConfig> {
	const fallback = fallbackConfig();
	const url = getConfigUrl();
	if (!url || typeof fetch !== 'function' || typeof AbortController !== 'function') return fallback;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), CONFIG_REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(url, { credentials: 'same-origin', signal: controller.signal });
		if (!response.ok) throw new Error(`P2P transport config request failed (${response.status})`);
		const parsed = parseP2PTransportConfig(await response.json() as unknown);
		if (!parsed) throw new Error('P2P transport config response is invalid');
		cachedConfig = parsed;
		cachedAt = Date.now();
		return parsed;
	} catch (error) {
		debug.warn('[P2P transport] using local fallback config:', error);
		return fallback;
	} finally {
		clearTimeout(timeoutId);
	}
}

export function loadP2PTransportConfig(): Promise<P2PTransportConfig> {
	if (cachedConfig && Date.now() - cachedAt < CONFIG_CACHE_TTL_MS) return Promise.resolve(cachedConfig);
	if (requestPromise) return requestPromise;
	requestPromise = fetchConfig().finally(() => { requestPromise = null; });
	return requestPromise;
}

export function resetP2PTransportConfigCacheForTests(): void {
	cachedConfig = null;
	cachedAt = 0;
	requestPromise = null;
}
