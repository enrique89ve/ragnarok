import type { P2PTransportFallbackReason } from '../../shared/p2p-wire/control';

export type P2PControlTelemetrySnapshot = Readonly<{
	activeRooms: number;
	activeConnections: number;
	totalConnections: number;
	totalMessagesRelayed: number;
	totalFramesDropped: number;
	totalErrors: number;
	errorsByReason: Readonly<Record<string, number>>;
	transportReadyByKind: Readonly<Record<'webrtc' | 'websocket-relay', number>>;
	transportFallbackByReason: Readonly<Partial<Record<P2PTransportFallbackReason, number>>>;
}>;

type MutableTelemetry = {
	totalConnections: number;
	totalMessagesRelayed: number;
	totalFramesDropped: number;
	totalErrors: number;
	errorsByReason: Record<string, number>;
	transportReadyByKind: Record<'webrtc' | 'websocket-relay', number>;
	transportFallbackByReason: Partial<Record<P2PTransportFallbackReason, number>>;
};

const telemetry: MutableTelemetry = {
	totalConnections: 0,
	totalMessagesRelayed: 0,
	totalFramesDropped: 0,
	totalErrors: 0,
	errorsByReason: {},
	transportReadyByKind: { webrtc: 0, 'websocket-relay': 0 },
	transportFallbackByReason: {},
};

export function recordP2PControlConnection(): void {
	telemetry.totalConnections += 1;
}

export function recordP2PControlMessage(): void {
	telemetry.totalMessagesRelayed += 1;
}

export function recordP2PControlDrop(reason: string): void {
	telemetry.totalFramesDropped += 1;
	recordP2PControlError(reason);
}

export function recordP2PControlError(reason: string): void {
	telemetry.totalErrors += 1;
	telemetry.errorsByReason[reason] = (telemetry.errorsByReason[reason] ?? 0) + 1;
}

export function recordP2PTransportReady(kind: 'webrtc' | 'websocket-relay'): void {
	telemetry.transportReadyByKind[kind] += 1;
}

export function recordP2PTransportFallback(reason: P2PTransportFallbackReason): void {
	telemetry.transportFallbackByReason[reason] = (telemetry.transportFallbackByReason[reason] ?? 0) + 1;
}

export function getP2PControlTelemetrySnapshot(input: {
	readonly activeRooms: number;
	readonly activeConnections: number;
}): P2PControlTelemetrySnapshot {
	return {
		...input,
		totalConnections: telemetry.totalConnections,
		totalMessagesRelayed: telemetry.totalMessagesRelayed,
		totalFramesDropped: telemetry.totalFramesDropped,
		totalErrors: telemetry.totalErrors,
		errorsByReason: { ...telemetry.errorsByReason },
		transportReadyByKind: { ...telemetry.transportReadyByKind },
		transportFallbackByReason: { ...telemetry.transportFallbackByReason },
	};
}

export function resetP2PControlTelemetryForTests(): void {
	telemetry.totalConnections = 0;
	telemetry.totalMessagesRelayed = 0;
	telemetry.totalFramesDropped = 0;
	telemetry.totalErrors = 0;
	telemetry.errorsByReason = {};
	telemetry.transportReadyByKind = { webrtc: 0, 'websocket-relay': 0 };
	telemetry.transportFallbackByReason = {};
}
