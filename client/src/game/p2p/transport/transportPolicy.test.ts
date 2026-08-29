import { describe, expect, it } from 'vitest';

import { resolveTransportPlan } from './transportPolicy';
import type { TransportCapabilities } from './transportCapabilities';

const browserCapabilities: TransportCapabilities = {
	webRtc: true,
	webSocket: true,
	iceServersConfigured: false,
	networkType: 'unknown',
};

function policy(overrides: Partial<Parameters<typeof resolveTransportPlan>[0]> = {}): Parameters<typeof resolveTransportPlan>[0] {
	return {
		webrtcEnabled: true,
		relayEnabled: true,
		capabilities: browserCapabilities,
		timeouts: { webrtcNormalMs: 8_000, webrtcAggressiveMs: 5_000, relayConnectMs: 8_000 },
		sharedNetwork: false,
		matchRole: 'offerer',
		relayLocked: false,
		...overrides,
	};
}

describe('resolveTransportPlan', () => {
	it('keeps WebRTC as the first attempt even without configured ICE servers', () => {
		expect(resolveTransportPlan(policy())).toEqual({
			mode: 'webrtc-first',
			relayFallback: true,
			webrtcConnectMs: 8_000,
			relayConnectMs: 8_000,
		});
	});

	it('selects the aggressive WebRTC budget for cellular connections', () => {
		expect(resolveTransportPlan(policy({
			capabilities: { ...browserCapabilities, networkType: 'cellular' },
		}))).toMatchObject({
			mode: 'webrtc-first',
			webrtcConnectMs: 5_000,
		});
	});

	it('uses relay on shared networks without configured ICE servers', () => {
		expect(resolveTransportPlan(policy({ sharedNetwork: true }))).toEqual({
			mode: 'relay-only',
			reason: 'no-ice',
			relayConnectMs: 8_000,
		});
	});

	it('uses relay-only when the browser cannot provide WebRTC', () => {
		expect(resolveTransportPlan(policy({ capabilities: { ...browserCapabilities, webRtc: false } }))).toEqual({
		mode: 'relay-only',
		reason: 'webrtc-unavailable',
		relayConnectMs: 8_000,
	});
	});

	it('keeps a successful relay fallback sticky for the match session', () => {
		expect(resolveTransportPlan(policy({ relayLocked: true }))).toEqual({
			mode: 'relay-only',
			reason: 'session-relay-locked',
			relayConnectMs: 8_000,
		});
	});

	it('fails closed when neither enabled transport is available', () => {
		expect(resolveTransportPlan(policy({ relayEnabled: false, capabilities: { ...browserCapabilities, webRtc: false } }))).toEqual({
		mode: 'unavailable',
		reason: 'relay-disabled',
	});
	});
});
