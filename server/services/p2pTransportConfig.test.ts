import { describe, expect, it } from 'vitest';

import { resolveP2PTransportConfig } from './p2pTransportConfig';

describe('P2P transport runtime config', () => {
	it('prefers server-only values over legacy VITE values', () => {
		const config = resolveP2PTransportConfig({
			P2P_WEBRTC_ENABLED: 'true',
			VITE_P2P_WEBRTC_ENABLED: 'false',
			P2P_WS_FALLBACK_ENABLED: 'false',
			VITE_P2P_WS_FALLBACK_ENABLED: 'true',
			P2P_CONNECT_TIMEOUT_MS: '12000',
			P2P_STUN_URL: 'stuns:server.example.test:443',
			VITE_P2P_STUN_URL: 'stun:legacy.example.test:3478',
		});

		expect(config).toEqual({
			version: 1,
			webrtcEnabled: true,
			relayEnabled: false,
			connectTimeoutMs: 12_000,
			iceServers: [{ urls: 'stuns:server.example.test:443' }],
		});
	});

	it('falls back safely for malformed values and strips invalid ICE entries', () => {
		const config = resolveP2PTransportConfig({
			P2P_CONNECT_TIMEOUT_MS: 'not-a-number',
			P2P_ICE_SERVERS: 'stun:valid.example.test,turn:user:secret@private.example.test,not-an-ice-url',
		});

		expect(config.connectTimeoutMs).toBe(20_000);
		expect(config.iceServers).toEqual([{ urls: 'stun:valid.example.test' }]);
	});
});
