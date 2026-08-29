import { describe, expect, it } from 'vitest';

import { resolveP2PTransportConfig } from './p2pTransportConfig';

describe('P2P transport runtime config', () => {
	it('prefers server-only values over legacy VITE values', () => {
		const config = resolveP2PTransportConfig({
			P2P_WEBRTC_ENABLED: 'true',
			VITE_P2P_WEBRTC_ENABLED: 'false',
			P2P_WS_FALLBACK_ENABLED: 'false',
			VITE_P2P_WS_FALLBACK_ENABLED: 'true',
			P2P_WEBRTC_NORMAL_MS: '12000',
			VITE_P2P_WEBRTC_NORMAL_MS: '11000',
			P2P_WEBRTC_AGGRESSIVE_MS: '6000',
			P2P_RELAY_CONNECT_MS: '9000',
			P2P_STUN_URL: 'stuns:server.example.test:443',
			VITE_P2P_STUN_URL: 'stun:legacy.example.test:3478',
		});

		expect(config).toEqual({
			version: 1,
			webrtcEnabled: true,
			relayEnabled: false,
			timeouts: { webrtcNormalMs: 12_000, webrtcAggressiveMs: 6_000, relayConnectMs: 9_000 },
			iceServers: [{ urls: 'stuns:server.example.test:443' }],
		});
	});

	it('falls back safely for malformed values and strips invalid ICE entries', () => {
		const config = resolveP2PTransportConfig({
			P2P_WEBRTC_NORMAL_MS: 'not-a-number',
			P2P_WEBRTC_AGGRESSIVE_MS: '500',
			P2P_RELAY_CONNECT_MS: '90000',
			P2P_ICE_SERVERS: 'stun:valid.example.test,turn:user:secret@private.example.test,not-an-ice-url',
		});

		expect(config.timeouts).toEqual({ webrtcNormalMs: 8_000, webrtcAggressiveMs: 1_000, relayConnectMs: 30_000 });
		expect(config.iceServers).toEqual([{ urls: 'stun:valid.example.test' }]);
	});
});
