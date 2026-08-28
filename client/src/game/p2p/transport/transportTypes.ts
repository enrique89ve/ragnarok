import type { P2PMessage } from '../messages';

export type TransportKind = 'webrtc' | 'websocket-relay';

export type TransportState =
	| 'idle'
	| 'connecting'
	| 'connected'
	| 'switching'
	| 'reconnecting'
	| 'failed'
	| 'closed';

export type TransportMessageListener = (message: P2PMessage) => void;
export type TransportStateListener = (state: TransportState) => void;

/**
 * Canonical gameplay transport contract.
 *
 * The relay and WebRTC implementations own delivery only. Matchmaking,
 * gameplay rules, transcript application, and BattleReady remain outside
 * this boundary.
 */
export type GameTransport = {
	readonly kind: TransportKind;
	readonly state: TransportState;
	connect: () => Promise<void>;
	send: (message: P2PMessage) => void;
	onMessage: (callback: TransportMessageListener) => () => void;
	onStateChange: (callback: TransportStateListener) => () => void;
	close: () => void;
};

export function isTransportConnected(state: TransportState): boolean {
	return state === 'connected';
}
