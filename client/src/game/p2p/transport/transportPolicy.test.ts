import { describe, expect, it } from 'vitest';

import { resolveTransportPlan } from './transportPolicy';
import type { TransportCapabilities } from './transportCapabilities';

const browserCapabilities: TransportCapabilities = {
	webRtc: true,
	webSocket: true,
	iceServersConfigured: false,
};

function policy(overrides: Partial<Parameters<typeof resolveTransportPlan>[0]> = {}): Parameters<typeof resolveTransportPlan>[0] {
	return {
		webrtcEnabled: true,
		relayEnabled: true,
		capabilities: browserCapabilities,
		matchRole: 'offerer',
		relayLocked: false,
		...overrides,
	};
}

describe('resolveTransportPlan', () => {
	it('keeps WebRTC as the first attempt even without configured ICE servers', () => {
		expect(resolveTransportPlan(policy())).toEqual({ mode: 'webrtc-first', relayFallback: true });
	});

	it('uses relay-only when the browser cannot provide WebRTC', () => {
		expect(resolveTransportPlan(policy({ capabilities: { ...browserCapabilities, webRtc: false } }))).toEqual({
		mode: 'relay-only',
		reason: 'webrtc-unavailable',
	});
	});

	it('keeps a successful relay fallback sticky for the match session', () => {
		expect(resolveTransportPlan(policy({ relayLocked: true }))).toEqual({
		mode: 'relay-only',
		reason: 'session-relay-locked',
	});
	});

	it('fails closed when neither enabled transport is available', () => {
		expect(resolveTransportPlan(policy({ relayEnabled: false, capabilities: { ...browserCapabilities, webRtc: false } }))).toEqual({
		mode: 'unavailable',
		reason: 'relay-disabled',
	});
	});
});
