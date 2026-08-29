import {
	P2PIceServerConfigSchema,
	P2P_TRANSPORT_DEFAULT_TIMEOUTS,
	parseP2PTransportConfig,
	type P2PTransportConfig,
	type P2PTransportTimeouts,
} from '../../shared/p2p-wire/transportConfig';

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

function resolveTimeout(value: string | undefined, fallback: number): number {
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) return fallback;
	return Math.min(30_000, Math.max(1_000, parsed));
}

function resolveTransportTimeouts(env: NodeJS.ProcessEnv): P2PTransportTimeouts {
	return {
		webrtcNormalMs: resolveTimeout(
			readFirst(env, ['P2P_WEBRTC_NORMAL_MS']),
			P2P_TRANSPORT_DEFAULT_TIMEOUTS.webrtcNormalMs,
		),
		webrtcAggressiveMs: resolveTimeout(
			readFirst(env, ['P2P_WEBRTC_AGGRESSIVE_MS']),
			P2P_TRANSPORT_DEFAULT_TIMEOUTS.webrtcAggressiveMs,
		),
		relayConnectMs: resolveTimeout(
			readFirst(env, ['P2P_RELAY_CONNECT_MS']),
			P2P_TRANSPORT_DEFAULT_TIMEOUTS.relayConnectMs,
		),
	};
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
		timeouts: resolveTransportTimeouts(env),
		iceServers: resolvePublicIceServers(env),
	});
	if (!parsed) throw new Error('Failed to build the validated P2P transport config');
	return parsed;
}

export function getP2PTransportConfig(): P2PTransportConfig {
	return resolveP2PTransportConfig(process.env);
}
