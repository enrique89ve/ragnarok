import { z } from 'zod';

export const P2P_TRANSPORT_CONFIG_VERSION = 1 as const;
export const P2P_TRANSPORT_CONFIG_PATH = '/api/p2p/transport-config';

export const P2P_TRANSPORT_DEFAULT_TIMEOUTS = {
	webrtcNormalMs: 8_000,
	webrtcAggressiveMs: 5_000,
	relayConnectMs: 8_000,
} as const;

const P2PTransportTimeoutsSchema = z.object({
	webrtcNormalMs: z.number().int().min(1_000).max(30_000),
	webrtcAggressiveMs: z.number().int().min(1_000).max(30_000),
	relayConnectMs: z.number().int().min(1_000).max(30_000),
}).strict();

const PublicIceUrlSchema = z.string()
	.min(1)
	.max(2048)
	.regex(/^(stun|stuns|turn|turns):[^\s@]+$/i);

export const P2PIceServerConfigSchema = z.object({
	urls: z.union([
		PublicIceUrlSchema,
		z.array(PublicIceUrlSchema).min(1).max(8),
	]),
}).strict();

export const P2PTransportConfigSchema = z.object({
	version: z.literal(P2P_TRANSPORT_CONFIG_VERSION),
	webrtcEnabled: z.boolean(),
	relayEnabled: z.boolean(),
	timeouts: P2PTransportTimeoutsSchema,
	iceServers: z.array(P2PIceServerConfigSchema).max(8),
}).strict();

export type P2PIceServerConfig = z.infer<typeof P2PIceServerConfigSchema>;
export type P2PTransportTimeouts = z.infer<typeof P2PTransportTimeoutsSchema>;
export type P2PTransportConfig = z.infer<typeof P2PTransportConfigSchema>;

export function parseP2PTransportConfig(input: unknown): P2PTransportConfig | null {
	const parsed = P2PTransportConfigSchema.safeParse(input);
	return parsed.success ? parsed.data : null;
}
