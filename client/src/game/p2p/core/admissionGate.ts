import {
	canSendGameplay,
	canSendMatchTraffic,
	deriveConnectionStage,
	type ConnectionStage,
	type ConnectionStageFacts,
} from '@shared/p2p-wire/connectionStages';

export type AdmissionDecision =
	| { readonly ok: true }
	| { readonly ok: false; readonly gate: AdmissionGateId; readonly reason: string };

export type AdmissionGateId =
	| 'ticket'
	| 'match_membership'
	| 'hive_identity'
	| 'protocol'
	| 'transport_epoch'
	| 'battle_ready';

export function canAdmitPeer(input: Readonly<{
	readonly ticketValid: boolean;
	readonly peerBelongsToMatch: boolean;
	readonly hiveIdentityMatches: boolean;
	readonly protocolCompatible: boolean;
}>): AdmissionDecision {
	if (!input.ticketValid) return fail('ticket', 'Invalid match ticket');
	if (!input.peerBelongsToMatch) return fail('match_membership', 'Peer is not a match member');
	if (!input.hiveIdentityMatches) return fail('hive_identity', 'Hive identity does not match the ticket');
	if (!input.protocolCompatible) return fail('protocol', 'Protocol is not compatible');
	return { ok: true };
}

export function canAcceptTransportEpoch(input: Readonly<{
	readonly currentEpoch: number;
	readonly incomingEpoch: number;
}>): AdmissionDecision {
	if (input.incomingEpoch < input.currentEpoch) {
		return fail('transport_epoch', 'Stale transport epoch');
	}
	if (input.incomingEpoch > input.currentEpoch) {
		return fail('transport_epoch', 'Future transport epoch');
	}
	return { ok: true };
}

export function canPromoteConnection(facts: ConnectionStageFacts): AdmissionDecision {
	const stage = deriveConnectionStage(facts);
	if (stage === 'closed' || stage === 'dialing' || stage === 'reconnecting') {
		return fail('protocol', `Connection stage ${stage} cannot be promoted`);
	}
	return { ok: true };
}

export function canEnterGameplay(input: Readonly<{
	readonly admitted: boolean;
	readonly transportCommitted: boolean;
	readonly matchReady: boolean;
}>): AdmissionDecision {
	if (!input.admitted) return fail('ticket', 'Peer is not admitted');
	if (!input.transportCommitted) return fail('transport_epoch', 'Transport is not committed');
	if (!input.matchReady) return fail('battle_ready', 'Battle-ready proofs do not agree');
	return { ok: true };
}

export function canResumeMatch(input: Readonly<{
	readonly sameMatch: boolean;
	readonly resumeAllowed: boolean;
}>): AdmissionDecision {
	if (!input.sameMatch) return fail('match_membership', 'Resume does not belong to this match');
	if (!input.resumeAllowed) return fail('protocol', 'Resume is not allowed in this phase');
	return { ok: true };
}

export function connectionStageAllowsGameplay(stage: ConnectionStage): boolean {
	return canSendGameplay(stage);
}

export function connectionStageAllowsMatchTraffic(stage: ConnectionStage): boolean {
	return canSendMatchTraffic(stage);
}

function fail(gate: AdmissionGateId, reason: string): AdmissionDecision {
	return { ok: false, gate, reason };
}
