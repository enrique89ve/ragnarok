export type StunConfig = {
	readonly enabled: boolean;
	readonly host: string;
	readonly port: number;
	readonly limits: {
		readonly maxPacketBytes: number;
		readonly perIpBurst: number;
		readonly perIpPerSecond: number;
		readonly globalPacketCeiling: number;
		readonly globalWindowMs: number;
	};
};

const DEFAULT_CONFIG: StunConfig = {
	enabled: false,
	host: '0.0.0.0',
	port: 3478,
	limits: {
		maxPacketBytes: 2048,
		perIpBurst: 20,
		perIpPerSecond: 5,
		globalPacketCeiling: 2_000,
		globalWindowMs: 1_000,
	},
};

function readBoolean(value: string | undefined, fallback: boolean): boolean {
	if (value === undefined) return fallback;
	return value.trim().toLowerCase() === 'true';
}

function readBoundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
	if (value === undefined || value.trim() === '') return fallback;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function readHost(value: string | undefined): string {
	const host = value?.trim() || DEFAULT_CONFIG.host;
	if (host.length > 253 || /\s/.test(host)) return DEFAULT_CONFIG.host;
	return host;
}

export function readStunConfig(env: Record<string, string | undefined> = process.env): StunConfig {
	return {
		enabled: readBoolean(env.P2P_STUN_ENABLED, DEFAULT_CONFIG.enabled),
		host: readHost(env.P2P_STUN_HOST),
		port: readBoundedInteger(env.P2P_STUN_PORT, DEFAULT_CONFIG.port, 1, 65_535),
		limits: {
			maxPacketBytes: readBoundedInteger(env.P2P_STUN_MAX_PACKET_BYTES, DEFAULT_CONFIG.limits.maxPacketBytes, 256, 65_535),
			perIpBurst: readBoundedInteger(env.P2P_STUN_PER_IP_BURST, DEFAULT_CONFIG.limits.perIpBurst, 1, 100_000),
			perIpPerSecond: readBoundedInteger(env.P2P_STUN_PER_IP_RATE, DEFAULT_CONFIG.limits.perIpPerSecond, 1, 100_000),
			globalPacketCeiling: readBoundedInteger(env.P2P_STUN_GLOBAL_PACKET_CEILING, DEFAULT_CONFIG.limits.globalPacketCeiling, 1, 1_000_000),
			globalWindowMs: readBoundedInteger(env.P2P_STUN_GLOBAL_WINDOW_MS, DEFAULT_CONFIG.limits.globalWindowMs, 100, 60_000),
		},
	};
}
