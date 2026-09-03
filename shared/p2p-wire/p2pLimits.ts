export const P2P_LIMITS = {
	activeConnectionsPerMatchPeer: 1,
	pendingReplacementPerPeer: 1,
	maxReconnectAttempts: 3,
	controlHelloTimeoutMs: 5_000,
	transportCommitTimeoutMs: 8_000,
	battleReadyTimeoutMs: 10_000,
	maxReplacementAttemptsPer30s: 4,
	maxBufferedCanonicalActions: 64,
} as const;

export type P2PLimits = typeof P2P_LIMITS;
