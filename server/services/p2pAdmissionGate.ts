export type ControlAdmissionFacts = Readonly<{
	readonly protocolPresent: boolean;
	readonly ticketOk: boolean;
	readonly ticketUnconfigured?: boolean;
	readonly ticketHasRole: boolean;
	readonly ticketAccount: string | null;
	readonly ticketScope: 'matchmaking' | 'direct-challenge' | null;
	readonly requireActiveMatch: boolean;
	readonly activeMatchOk: boolean;
	readonly requireSession: boolean;
	readonly sessionUsername: string | null;
}>;

export type ControlAdmission =
	| { readonly ok: true }
	| { readonly ok: false; readonly status: number; readonly reason: string; readonly gate: string };

export function decideControlAdmission(facts: ControlAdmissionFacts): ControlAdmission {
	if (!facts.protocolPresent) {
		return { ok: false, status: 400, reason: 'Missing control protocol', gate: 'protocol' };
	}
	if (!facts.ticketOk) {
		return {
			ok: false,
			status: facts.ticketUnconfigured ? 503 : 403,
			reason: 'Forbidden',
			gate: 'ticket',
		};
	}
	if (facts.requireActiveMatch && facts.ticketScope === 'matchmaking' && !facts.activeMatchOk) {
		return { ok: false, status: 403, reason: 'Match is not active', gate: 'match_membership' };
	}
	if (!facts.ticketHasRole) {
		return { ok: false, status: 403, reason: 'Control role missing', gate: 'protocol' };
	}
	if (facts.requireSession && !facts.sessionUsername) {
		return { ok: false, status: 401, reason: 'Hive session required', gate: 'hive_identity' };
	}
	if (facts.requireSession && facts.ticketAccount && facts.sessionUsername !== facts.ticketAccount) {
		return { ok: false, status: 403, reason: 'Forbidden', gate: 'hive_identity' };
	}
	if (facts.requireSession && !facts.ticketAccount) {
		return { ok: false, status: 403, reason: 'Ticket account missing', gate: 'hive_identity' };
	}
	return { ok: true };
}

export function decideEpochFence(input: Readonly<{
	readonly currentEpoch: number;
	readonly incomingEpoch: number | undefined;
}>): 'ok' | 'stale' | 'future' | 'missing' {
	if (typeof input.incomingEpoch !== 'number') return 'missing';
	if (input.incomingEpoch < input.currentEpoch) return 'stale';
	if (input.incomingEpoch > input.currentEpoch) return 'future';
	return 'ok';
}
