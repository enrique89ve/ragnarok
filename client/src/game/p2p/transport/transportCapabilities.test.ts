import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	detectBrowserTransportCapabilities,
	detectTransportCapabilities,
} from './transportCapabilities';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('transport capabilities', () => {
	it('normalizes an explicit capability profile', () => {
		expect(detectTransportCapabilities({
			webRtc: true,
			webSocket: true,
			networkType: 'cellular',
			iceServers: [{ urls: 'stun:stun.example.test:3478' }],
		})).toEqual({
			webRtc: true,
			webSocket: true,
			iceServersConfigured: true,
			networkType: 'cellular',
		});
	});

	it('reads navigator.connection.type when the browser exposes it', () => {
		vi.stubGlobal('RTCPeerConnection', vi.fn());
		vi.stubGlobal('WebSocket', vi.fn());
		vi.stubGlobal('navigator', { connection: { type: 'cellular' } });

		expect(detectBrowserTransportCapabilities()).toMatchObject({
			webRtc: true,
			webSocket: true,
			networkType: 'cellular',
		});
	});

	it('uses unknown when navigator.connection is absent or unrecognized', () => {
		vi.stubGlobal('RTCPeerConnection', vi.fn());
		vi.stubGlobal('WebSocket', vi.fn());
		vi.stubGlobal('navigator', { connection: { type: '5g' } });

		expect(detectBrowserTransportCapabilities()).toMatchObject({ networkType: 'unknown' });
	});
});
