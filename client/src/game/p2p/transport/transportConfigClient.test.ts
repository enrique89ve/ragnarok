import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	loadP2PTransportConfig,
	resetP2PTransportConfigCacheForTests,
} from './transportConfigClient';

afterEach(() => {
	resetP2PTransportConfigCacheForTests();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('P2P transport config client', () => {
	it('validates and caches the server configuration', async () => {
		const fetchMock = vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({
				version: 1,
				webrtcEnabled: true,
				relayEnabled: true,
				timeouts: { webrtcNormalMs: 12_000, webrtcAggressiveMs: 6_000, relayConnectMs: 9_000 },
				iceServers: [{ urls: 'stun:stun.example.test:3478' }],
			}),
		}));
		vi.stubGlobal('window', { origin: 'https://game.example.test' });
		vi.stubGlobal('fetch', fetchMock);

		expect(await loadP2PTransportConfig()).toMatchObject({ webrtcEnabled: true, timeouts: { webrtcNormalMs: 12_000 } });
		expect(await loadP2PTransportConfig()).toMatchObject({ webrtcEnabled: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('uses the safe relay-only fallback when the response is invalid', async () => {
		vi.stubGlobal('window', { origin: 'https://game.example.test' });
		vi.stubGlobal('fetch', vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({ version: 999 }),
		})));

		expect(await loadP2PTransportConfig()).toMatchObject({
			webrtcEnabled: false,
			relayEnabled: true,
			timeouts: { webrtcNormalMs: 8_000, webrtcAggressiveMs: 5_000, relayConnectMs: 8_000 },
			iceServers: [],
		});
	});

	it('retains the last-known-good config when a later refresh fails', async () => {
		vi.useFakeTimers();
		let calls = 0;
		const fetchMock = vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => calls++ === 0
				? {
					version: 1,
					webrtcEnabled: true,
					relayEnabled: true,
					timeouts: { webrtcNormalMs: 8_000, webrtcAggressiveMs: 5_000, relayConnectMs: 8_000 },
					iceServers: [{ urls: 'stun:stun.example.test:3478' }],
				}
				: { version: 999 },
		}));
		vi.stubGlobal('window', { origin: 'https://game.example.test' });
		vi.stubGlobal('fetch', fetchMock);

		const first = await loadP2PTransportConfig();
		await vi.advanceTimersByTimeAsync(30_001);
		const refreshed = await loadP2PTransportConfig();

		expect(first.webrtcEnabled).toBe(true);
		expect(refreshed).toEqual(first);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
