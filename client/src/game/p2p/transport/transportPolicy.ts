import type { P2PTransportRole } from '@shared/p2pAvailability';
import type { P2PTransportTimeouts } from '@shared/p2p-wire/transportConfig';
import type { P2PNetworkType, TransportCapabilities } from './transportCapabilities';

export type TransportPolicyInput = Readonly<{
	webrtcEnabled: boolean;
	relayEnabled: boolean;
	capabilities: TransportCapabilities;
	timeouts: P2PTransportTimeouts;
	sharedNetwork: boolean;
	matchRole: P2PTransportRole | null;
	relayLocked: boolean;
}>;

export type TransportPlan =
	| {
		readonly mode: 'webrtc-first';
		readonly relayFallback: boolean;
		readonly webrtcConnectMs: number;
		readonly relayConnectMs: number;
	}
	| {
		readonly mode: 'relay-only';
		readonly reason: 'session-relay-locked' | 'webrtc-disabled' | 'webrtc-unavailable' | 'role-missing' | 'no-ice';
		readonly relayConnectMs: number;
	}
	| {
		readonly mode: 'unavailable';
		readonly reason: 'relay-disabled' | 'no-websocket' | 'no-compatible-transport';
};

function isAggressiveNetwork(networkType: P2PNetworkType): boolean {
	return networkType === 'cellular';
}

export function resolveTransportPlan(input: TransportPolicyInput): TransportPlan {
	const relayAvailable = input.relayEnabled && input.capabilities.webSocket;
	const icePolicyAllowsWebRtc = !input.sharedNetwork || input.capabilities.iceServersConfigured;
	const webRtcAvailable = input.webrtcEnabled
		&& input.capabilities.webRtc
		&& input.capabilities.webSocket
		&& input.matchRole !== null
		&& icePolicyAllowsWebRtc;

	if (input.relayLocked) {
		return relayAvailable
			? { mode: 'relay-only', reason: 'session-relay-locked', relayConnectMs: input.timeouts.relayConnectMs }
			: { mode: 'unavailable', reason: 'relay-disabled' };
	}

	if (webRtcAvailable) {
		return {
			mode: 'webrtc-first',
			relayFallback: relayAvailable,
			webrtcConnectMs: isAggressiveNetwork(input.capabilities.networkType)
				? input.timeouts.webrtcAggressiveMs
				: input.timeouts.webrtcNormalMs,
			relayConnectMs: input.timeouts.relayConnectMs,
		};
	}

	if (relayAvailable) {
		const reason = !icePolicyAllowsWebRtc
			? 'no-ice'
			: !input.webrtcEnabled
			? 'webrtc-disabled'
			: input.matchRole === null
				? 'role-missing'
				: 'webrtc-unavailable';
		return { mode: 'relay-only', reason, relayConnectMs: input.timeouts.relayConnectMs };
	}

	if (!input.capabilities.webSocket) return { mode: 'unavailable', reason: 'no-websocket' };
	if (!input.relayEnabled) return { mode: 'unavailable', reason: 'relay-disabled' };
	return { mode: 'unavailable', reason: 'no-compatible-transport' };
}
