import type { P2PIceServerConfig } from '@shared/p2p-wire/transportConfig';

export type TransportCapabilities = Readonly<{
	webRtc: boolean;
	webSocket: boolean;
	iceServersConfigured: boolean;
}>;

export type TransportCapabilityInput = Readonly<{
	webRtc: boolean;
	webSocket: boolean;
	iceServers?: readonly P2PIceServerConfig[];
}>;

export function detectTransportCapabilities(input: TransportCapabilityInput): TransportCapabilities {
	return {
		webRtc: input.webRtc,
		webSocket: input.webSocket,
		iceServersConfigured: (input.iceServers?.length ?? 0) > 0,
	};
}

export function detectBrowserTransportCapabilities(
	iceServers: readonly P2PIceServerConfig[] = [],
): TransportCapabilities {
	return detectTransportCapabilities({
		webRtc: typeof RTCPeerConnection === 'function',
		webSocket: typeof WebSocket === 'function',
		iceServers,
	});
}
