export type TransportTelemetrySnapshot = Readonly<{
	webrtcAttemptTotal: number;
	webrtcConnectedTotal: number;
	webrtcFailedTotal: number;
	relayFallbackTotal: number;
	transportSwitchTotal: number;
	transportReconnectTotal: number;
}>;

const counters = {
	webrtcAttemptTotal: 0,
	webrtcConnectedTotal: 0,
	webrtcFailedTotal: 0,
	relayFallbackTotal: 0,
	transportSwitchTotal: 0,
	transportReconnectTotal: 0,
};

export function recordWebRTCAttempt(): void { counters.webrtcAttemptTotal += 1; }
export function recordWebRTCConnected(): void { counters.webrtcConnectedTotal += 1; }
export function recordWebRTCFailed(): void { counters.webrtcFailedTotal += 1; }
export function recordRelayFallback(): void { counters.relayFallbackTotal += 1; }
export function recordTransportSwitch(): void { counters.transportSwitchTotal += 1; }
export function recordTransportReconnect(): void { counters.transportReconnectTotal += 1; }

export function getTransportTelemetrySnapshot(): TransportTelemetrySnapshot {
	return { ...counters };
}

export function resetTransportTelemetryForTests(): void {
	for (const key of Object.keys(counters) as Array<keyof typeof counters>) counters[key] = 0;
}

