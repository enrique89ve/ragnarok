export type P2PRelayErrorReason =
	| 'missing_room_or_peer'
	| 'invalid_room_or_peer'
	| 'room_full'
	| 'duplicate_peer'
	| 'oversize'
	| 'invalid_json'
	| 'malformed_envelope'
	| 'reserved_type'
	| 'unknown_type'
	| 'opponent_unavailable'
	| 'send_failed'
	| 'socket_error'
	| 'keepalive_timeout'
	| 'origin_forbidden'
	| 'missing_ticket'
	| 'missing_protocol'
	| 'malformed_ticket'
	| 'expired_ticket'
	| 'ticket_mismatch'
	| 'bad_ticket_signature'
	| 'ticket_server_unconfigured'
	| 'starter_claim_required'
	| 'hive_session_required';

export type P2PRelayTelemetrySnapshot = Readonly<{
	activeRooms: number;
	activeConnections: number;
	activeFullRooms: number;
	activePlayersInMatches: number;
	totalConnections: number;
	totalMessagesRelayed: number;
	totalFramesDropped: number;
	totalErrors: number;
	errorsByReason: Readonly<Record<string, number>>;
	lastErrorAt: number | null;
	lastErrorReason: string | null;
}>;

type P2PRelayTelemetryMutable = {
	totalConnections: number;
	totalMessagesRelayed: number;
	totalFramesDropped: number;
	totalErrors: number;
	errorsByReason: Record<string, number>;
	lastErrorAt: number | null;
	lastErrorReason: string | null;
};

const relayTelemetry: P2PRelayTelemetryMutable = {
	totalConnections: 0,
	totalMessagesRelayed: 0,
	totalFramesDropped: 0,
	totalErrors: 0,
	errorsByReason: {},
	lastErrorAt: null,
	lastErrorReason: null,
};

export function recordP2PRelayConnection(): void {
	relayTelemetry.totalConnections += 1;
}

export function recordP2PRelayMessage(): void {
	relayTelemetry.totalMessagesRelayed += 1;
}

export function recordP2PRelayDrop(reason: string): void {
	relayTelemetry.totalFramesDropped += 1;
	recordP2PRelayError(normalizeP2PRelayReason(reason));
}

export function recordP2PRelayError(reason: string): void {
	const normalized = normalizeP2PRelayReason(reason);
	relayTelemetry.totalErrors += 1;
	relayTelemetry.errorsByReason[normalized] = (relayTelemetry.errorsByReason[normalized] ?? 0) + 1;
	relayTelemetry.lastErrorAt = Date.now();
	relayTelemetry.lastErrorReason = normalized;
}

export function getP2PRelayTelemetrySnapshot(input: {
	readonly activeRooms: number;
	readonly activeConnections: number;
	readonly activeFullRooms: number;
}): P2PRelayTelemetrySnapshot {
	return {
		...input,
		activePlayersInMatches: input.activeFullRooms * 2,
		totalConnections: relayTelemetry.totalConnections,
		totalMessagesRelayed: relayTelemetry.totalMessagesRelayed,
		totalFramesDropped: relayTelemetry.totalFramesDropped,
		totalErrors: relayTelemetry.totalErrors,
		errorsByReason: { ...relayTelemetry.errorsByReason },
		lastErrorAt: relayTelemetry.lastErrorAt,
		lastErrorReason: relayTelemetry.lastErrorReason,
	};
}

export function resetP2PRelayTelemetryForTests(): void {
	relayTelemetry.totalConnections = 0;
	relayTelemetry.totalMessagesRelayed = 0;
	relayTelemetry.totalFramesDropped = 0;
	relayTelemetry.totalErrors = 0;
	relayTelemetry.errorsByReason = {};
	relayTelemetry.lastErrorAt = null;
	relayTelemetry.lastErrorReason = null;
}

function normalizeP2PRelayReason(reason: string): string {
	if (reason.startsWith('unknown_type:')) return 'unknown_type';
	return reason;
}
