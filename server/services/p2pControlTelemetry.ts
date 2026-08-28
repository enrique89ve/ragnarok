export type P2PControlTelemetrySnapshot = Readonly<{
	activeRooms: number;
	activeConnections: number;
	totalConnections: number;
	totalMessagesRelayed: number;
	totalFramesDropped: number;
	totalErrors: number;
	errorsByReason: Readonly<Record<string, number>>;
}>;

type MutableTelemetry = {
	totalConnections: number;
	totalMessagesRelayed: number;
	totalFramesDropped: number;
	totalErrors: number;
	errorsByReason: Record<string, number>;
};

const telemetry: MutableTelemetry = {
	totalConnections: 0,
	totalMessagesRelayed: 0,
	totalFramesDropped: 0,
	totalErrors: 0,
	errorsByReason: {},
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
	};
}

export function resetP2PControlTelemetryForTests(): void {
	telemetry.totalConnections = 0;
	telemetry.totalMessagesRelayed = 0;
	telemetry.totalFramesDropped = 0;
	telemetry.totalErrors = 0;
	telemetry.errorsByReason = {};
}

