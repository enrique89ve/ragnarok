import type { P2PTransportFallbackReason } from '@shared/p2p-wire/control';

export type TransportTelemetrySnapshot = Readonly<{
	webrtcAttemptTotal: number;
	webrtcConnectedTotal: number;
	webrtcFailedTotal: number;
	relayFallbackTotal: number;
	transportSwitchTotal: number;
	transportReconnectTotal: number;
	webrtcFailedByReason: Readonly<Partial<Record<P2PTransportFallbackReason, number>>>;
	relayFallbackByReason: Readonly<Partial<Record<P2PTransportFallbackReason, number>>>;
}>;

const counters = {
	webrtcAttemptTotal: 0,
	webrtcConnectedTotal: 0,
	webrtcFailedTotal: 0,
	relayFallbackTotal: 0,
	transportSwitchTotal: 0,
	transportReconnectTotal: 0,
	webrtcFailedByReason: {} as Partial<Record<P2PTransportFallbackReason, number>>,
	relayFallbackByReason: {} as Partial<Record<P2PTransportFallbackReason, number>>,
};

function incrementReasonCounter(
	counter: Partial<Record<P2PTransportFallbackReason, number>>,
	reason: P2PTransportFallbackReason,
): void {
	counter[reason] = (counter[reason] ?? 0) + 1;
}

export function recordWebRTCAttempt(): void { counters.webrtcAttemptTotal += 1; }
export function recordWebRTCConnected(): void { counters.webrtcConnectedTotal += 1; }
export function recordWebRTCFailed(reason: P2PTransportFallbackReason = 'manual'): void {
	counters.webrtcFailedTotal += 1;
	incrementReasonCounter(counters.webrtcFailedByReason, reason);
}
export function recordRelayFallback(reason: P2PTransportFallbackReason = 'manual'): void {
	counters.relayFallbackTotal += 1;
	incrementReasonCounter(counters.relayFallbackByReason, reason);
}
export function recordTransportSwitch(): void { counters.transportSwitchTotal += 1; }
export function recordTransportReconnect(): void { counters.transportReconnectTotal += 1; }

export function getTransportTelemetrySnapshot(): TransportTelemetrySnapshot {
	return {
		...counters,
		webrtcFailedByReason: { ...counters.webrtcFailedByReason },
		relayFallbackByReason: { ...counters.relayFallbackByReason },
	};
}

export function resetTransportTelemetryForTests(): void {
	for (const key of Object.keys(counters) as Array<keyof typeof counters>) counters[key] = 0;
	counters.webrtcFailedByReason = {};
	counters.relayFallbackByReason = {};
}
