import { describe, expect, it } from 'vitest';

import {
	parseP2PTransportConfig,
	P2P_TRANSPORT_CONFIG_PATH,
} from './transportConfig';

describe('P2P transport config wire contract', () => {
	it('accepts public transport settings without credentials', () => {
		expect(parseP2PTransportConfig({
			version: 1,
			webrtcEnabled: true,
			relayEnabled: true,
			connectTimeoutMs: 20_000,
			iceServers: [{ urls: 'stun:stun.example.test:3478' }],
		})).toMatchObject({ version: 1, iceServers: [{ urls: 'stun:stun.example.test:3478' }] });
	});

	it('rejects embedded ICE credentials and invalid timeouts', () => {
		expect(parseP2PTransportConfig({
			version: 1,
			webrtcEnabled: true,
			relayEnabled: true,
			connectTimeoutMs: 100,
			iceServers: [{ urls: 'turn:user:password@turn.example.test' }],
		})).toBeNull();
	});

	it('exposes a stable API path for the runtime client', () => {
		expect(P2P_TRANSPORT_CONFIG_PATH).toBe('/api/p2p/transport-config');
	});
});
