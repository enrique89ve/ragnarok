import {
	P2PIceServerConfigSchema,
	parseP2PTransportConfig,
	type P2PTransportConfig,
} from '../../shared/p2p-wire/transportConfig';

const DEFAULT_CONNECT_TIMEOUT_MS = 20_000;

function readFirst(env: NodeJS.ProcessEnv, keys: readonly string[]): string | undefined {
	for (const key of keys) {
		const value = env[key]?.trim();
		if (value) return value;
	}
	return undefined;
}

function resolveBoolean(value: string | undefined, fallback: boolean): boolean {
	if (value === 'true' || value === '1') return true;
	if (value === 'false' || value === '0') return false;
	return fallback;
}

function resolveConnectTimeout(value: string | undefined): number {
	if (!value) return DEFAULT_CONNECT_TIMEOUT_MS;
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) return DEFAULT_CONNECT_TIMEOUT_MS;
	return Math.min(30_000, Math.max(1_000, parsed));
}

function resolvePublicIceServers(env: NodeJS.ProcessEnv): P2PTransportConfig['iceServers'] {
	const raw = readFirst(env, ['P2P_ICE_SERVERS', 'P2P_STUN_URL', 'VITE_P2P_STUN_URL']);
	if (!raw) return [];

	return raw.split(',')
		.map(value => value.trim())
		.filter(Boolean)
		.map(url => P2PIceServerConfigSchema.safeParse({ urls: url }))
		.filter((result): result is { success: true; data: P2PTransportConfig['iceServers'][number] } => result.success)
		.map(result => result.data);
}

export function resolveP2PTransportConfig(env: NodeJS.ProcessEnv): P2PTransportConfig {
	const parsed = parseP2PTransportConfig({
		version: 1,
		webrtcEnabled: resolveBoolean(readFirst(env, ['P2P_WEBRTC_ENABLED', 'VITE_P2P_WEBRTC_ENABLED']), false),
		relayEnabled: resolveBoolean(readFirst(env, ['P2P_WS_FALLBACK_ENABLED', 'VITE_P2P_WS_FALLBACK_ENABLED']), true),
		connectTimeoutMs: resolveConnectTimeout(readFirst(env, ['P2P_CONNECT_TIMEOUT_MS', 'VITE_P2P_CONNECT_TIMEOUT_MS'])),
		iceServers: resolvePublicIceServers(env),
	});
	if (!parsed) throw new Error('Failed to build the validated P2P transport config');
	return parsed;
}

export function getP2PTransportConfig(): P2PTransportConfig {
	return resolveP2PTransportConfig(process.env);
}
