/**
 * Connection stage is not transport state.
 *
 * MATCH ≠ PEER ≠ CONNECTION ≠ TRANSPORT ≠ PROTOCOL
 * TRANSPORT_CONNECTED ≠ MATCH_READY ≠ GAMEPLAY
 */

export const CONNECTION_STAGES = [
	'dialing',
	'transport_connected',
	'authenticating',
	'control_ready',
	'transport_committed',
	'match_ready',
	'gameplay',
	'reconnecting',
	'closed',
] as const;

export type ConnectionStage = typeof CONNECTION_STAGES[number];

export type ConnectionStageFacts = Readonly<{
	readonly closed?: boolean;
	readonly reconnecting?: boolean;
	readonly dialing?: boolean;
	readonly transportConnected: boolean;
	readonly identityVerified: boolean;
	readonly controlReady: boolean;
	readonly transportCommitted: boolean;
	readonly matchReady: boolean;
	readonly battleCommitted: boolean;
}>;

export function deriveConnectionStage(facts: ConnectionStageFacts): ConnectionStage {
	if (facts.closed) return 'closed';
	if (facts.reconnecting && !facts.transportConnected) return 'reconnecting';
	if (!facts.transportConnected) return facts.dialing ? 'dialing' : 'closed';
	if (!facts.identityVerified) return 'transport_connected';
	if (!facts.controlReady) return 'authenticating';
	if (!facts.transportCommitted) return 'control_ready';
	if (!facts.matchReady) return 'transport_committed';
	if (!facts.battleCommitted) return 'match_ready';
	return 'gameplay';
}

export function canSendGameplay(stage: ConnectionStage): boolean {
	return stage === 'gameplay';
}

export function canSendMatchTraffic(stage: ConnectionStage): boolean {
	return stage === 'match_ready' || stage === 'gameplay';
}
