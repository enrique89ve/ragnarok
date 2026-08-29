import type { P2PTransportRole } from '@shared/p2pAvailability';
import type { TransportCapabilities } from './transportCapabilities';

export type TransportPolicyInput = Readonly<{
	webrtcEnabled: boolean;
	relayEnabled: boolean;
	capabilities: TransportCapabilities;
	matchRole: P2PTransportRole | null;
	relayLocked: boolean;
}>;

export type TransportPlan =
	| {
		readonly mode: 'webrtc-first';
		readonly relayFallback: boolean;
	}
	| {
		readonly mode: 'relay-only';
		readonly reason: 'session-relay-locked' | 'webrtc-disabled' | 'webrtc-unavailable' | 'role-missing';
	}
	| {
		readonly mode: 'unavailable';
		readonly reason: 'relay-disabled' | 'no-websocket' | 'no-compatible-transport';
	};

export function resolveTransportPlan(input: TransportPolicyInput): TransportPlan {
	const relayAvailable = input.relayEnabled && input.capabilities.webSocket;
	const webRtcAvailable = input.webrtcEnabled
		&& input.capabilities.webRtc
		&& input.capabilities.webSocket
		&& input.matchRole !== null;

	if (input.relayLocked) {
		return relayAvailable
			? { mode: 'relay-only', reason: 'session-relay-locked' }
			: { mode: 'unavailable', reason: 'relay-disabled' };
	}

	if (webRtcAvailable) {
		return { mode: 'webrtc-first', relayFallback: relayAvailable };
	}

	if (relayAvailable) {
		const reason = !input.webrtcEnabled
			? 'webrtc-disabled'
			: input.matchRole === null
				? 'role-missing'
				: 'webrtc-unavailable';
		return { mode: 'relay-only', reason };
	}

	if (!input.capabilities.webSocket) return { mode: 'unavailable', reason: 'no-websocket' };
	if (!input.relayEnabled) return { mode: 'unavailable', reason: 'relay-disabled' };
	return { mode: 'unavailable', reason: 'no-compatible-transport' };
}
