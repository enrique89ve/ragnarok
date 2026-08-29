import type { P2PIceServerConfig } from '@shared/p2p-wire/transportConfig';

export type P2PNetworkType = 'cellular' | 'wifi' | 'ethernet' | 'unknown';

export type TransportCapabilities = Readonly<{
	webRtc: boolean;
	webSocket: boolean;
	iceServersConfigured: boolean;
	networkType: P2PNetworkType;
}>;

export type TransportCapabilityInput = Readonly<{
	webRtc: boolean;
	webSocket: boolean;
	iceServers?: readonly P2PIceServerConfig[];
	networkType?: P2PNetworkType;
}>;

function isP2PNetworkType(value: unknown): value is P2PNetworkType {
	return value === 'cellular' || value === 'wifi' || value === 'ethernet' || value === 'unknown';
}

function readBrowserNetworkType(): P2PNetworkType {
	if (typeof navigator === 'undefined') return 'unknown';
	const connection = Reflect.get(navigator, 'connection');
	if (typeof connection !== 'object' || connection === null) return 'unknown';
	const networkType = Reflect.get(connection, 'type');
	return isP2PNetworkType(networkType) ? networkType : 'unknown';
}

export function detectTransportCapabilities(input: TransportCapabilityInput): TransportCapabilities {
	return {
		webRtc: input.webRtc,
		webSocket: input.webSocket,
		iceServersConfigured: (input.iceServers?.length ?? 0) > 0,
		networkType: input.networkType ?? 'unknown',
	};
}

export function detectBrowserTransportCapabilities(
	iceServers: readonly P2PIceServerConfig[] = [],
): TransportCapabilities {
	return detectTransportCapabilities({
		webRtc: typeof RTCPeerConnection === 'function',
		webSocket: typeof WebSocket === 'function',
		iceServers,
		networkType: readBrowserNetworkType(),
	});
}
