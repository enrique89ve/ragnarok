import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	loadP2PTransportConfig,
	resetP2PTransportConfigCacheForTests,
} from './transportConfigClient';

afterEach(() => {
	resetP2PTransportConfigCacheForTests();
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
				connectTimeoutMs: 12_000,
				iceServers: [{ urls: 'stun:stun.example.test:3478' }],
			}),
		}));
		vi.stubGlobal('window', { origin: 'https://game.example.test' });
		vi.stubGlobal('fetch', fetchMock);

		expect(await loadP2PTransportConfig()).toMatchObject({ webrtcEnabled: true, connectTimeoutMs: 12_000 });
		expect(await loadP2PTransportConfig()).toMatchObject({ webrtcEnabled: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('uses the safe baked fallback when the response is invalid', async () => {
		vi.stubGlobal('window', { origin: 'https://game.example.test' });
		vi.stubGlobal('fetch', vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({ version: 999 }),
		})));

		expect(await loadP2PTransportConfig()).toMatchObject({
			webrtcEnabled: false,
			relayEnabled: true,
			connectTimeoutMs: 20_000,
		});
	});
});
