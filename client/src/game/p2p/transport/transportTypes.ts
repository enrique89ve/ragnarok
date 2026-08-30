import type { P2PMessage } from '../messages';
import {
	P2P_TRANSPORT_FALLBACK_REASONS,
	type P2PTransportFallbackReason,
} from '@shared/p2p-wire/control';

export type TransportKind = 'webrtc' | 'websocket-relay';

/** Absolute source of a close signal, when the adapter can attribute it. */
export type TransportCloseReason = 'local' | 'opponent' | 'unknown';

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

export type TransportStatsSnapshot = Readonly<{
	readonly collectedAtMs: number;
	readonly connectDurationMs: number | null;
	readonly connectionState: string | null;
	readonly iceConnectionState: string | null;
	readonly iceGatheringState: string | null;
	readonly signalingState: string | null;
	readonly candidatePair: Readonly<{
		readonly localCandidateType: string | null;
		readonly remoteCandidateType: string | null;
		readonly protocol: string | null;
		readonly currentRoundTripTimeMs: number | null;
		readonly bytesSent: number | null;
		readonly bytesReceived: number | null;
	}> | null;
}>;

export type TransportFailure = Error & {
	readonly transportReason?: P2PTransportFallbackReason;
};

export function createTransportFailure(
	message: string,
	reason?: P2PTransportFallbackReason,
): TransportFailure {
	const error: TransportFailure = new Error(message);
	if (reason) Object.defineProperty(error, 'transportReason', { value: reason, enumerable: true });
	return error;
}

function isTransportFallbackReason(value: unknown): value is P2PTransportFallbackReason {
	return P2P_TRANSPORT_FALLBACK_REASONS.some(reason => reason === value);
}

export function getTransportFailureReason(value: unknown): P2PTransportFallbackReason | undefined {
	if (!(value instanceof Error)) return undefined;
	const reason = Object.getOwnPropertyDescriptor(value, 'transportReason')?.value;
	return isTransportFallbackReason(reason) ? reason : undefined;
}

/**
 * Canonical gameplay transport contract.
 *
 * The relay and WebRTC implementations own gameplay delivery and transport
 * lifecycle only. WebRTC signaling stays inside its adapter; matchmaking,
 * gameplay rules, transcript application, and BattleReady remain outside
 * this boundary.
 */
export type GameTransport = {
	readonly kind: TransportKind;
	readonly state: TransportState;
	readonly closeReason?: TransportCloseReason;
	connect: () => Promise<void>;
	send: (message: P2PMessage) => void;
	onMessage: (callback: TransportMessageListener) => () => void;
	onStateChange: (callback: TransportStateListener) => () => void;
	close: () => void;
};

export function isTransportConnected(state: TransportState): boolean {
	return state === 'connected';
}
