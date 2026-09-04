import type { P2PLogicalDomain } from '@shared/p2p-wire/p2pCompetitionLifecycle';

export type DesyncRecoveryState = Readonly<{
	readonly status: 'clean' | 'replay_requested';
	readonly attempts: number;
}>;

export type DesyncRecoveryDecision = Readonly<{
	readonly state: DesyncRecoveryState;
	readonly action: 'none' | 'request_replay' | 'hard_pause';
}>;

export type DesyncRecoveryLedger = Readonly<Record<P2PLogicalDomain, DesyncRecoveryState>>;

export type DesyncRecoveryScope = Readonly<{
	readonly state: DesyncRecoveryState;
	readonly domain: P2PLogicalDomain | null;
}>;

export const CLEAN_DESYNC_RECOVERY: DesyncRecoveryState = Object.freeze({
	status: 'clean',
	attempts: 0,
});

export const CLEAN_DESYNC_RECOVERY_LEDGER: DesyncRecoveryLedger = Object.freeze({
	cards: CLEAN_DESYNC_RECOVERY,
	chess: CLEAN_DESYNC_RECOVERY,
	poker: CLEAN_DESYNC_RECOVERY,
});

/** One bounded transcript replay gets a chance before a root mismatch pauses. */
export function observeDesync(state: DesyncRecoveryState): DesyncRecoveryDecision {
	if (state.status === 'clean') {
		return {
			state: { status: 'replay_requested', attempts: 1 },
			action: 'request_replay',
		};
	}
	return { state, action: 'hard_pause' };
}

/**
 * Consume a replay attempt only for the domain that reported the mismatch.
 * Cards, Chess, and Poker can legitimately be at different in-flight
 * revisions, so one domain must not spend another domain's recovery budget.
 */
export function observeDomainDesync(
	ledger: DesyncRecoveryLedger,
	domain: P2PLogicalDomain,
): { readonly state: DesyncRecoveryLedger; readonly action: DesyncRecoveryDecision['action'] } {
	const decision = observeDesync(ledger[domain]);
	return {
		state: {
			...ledger,
			[domain]: decision.state,
		},
		action: decision.action,
	};
}

export function observeMatchingRoot(): DesyncRecoveryState {
	return CLEAN_DESYNC_RECOVERY;
}

/** A matching root clears only the mismatch scope that it actually verified. */
export function observeMatchingDomainRoot(
	scope: DesyncRecoveryScope,
	domain: P2PLogicalDomain,
): DesyncRecoveryScope {
	if (scope.domain !== domain) return scope;
	return { state: CLEAN_DESYNC_RECOVERY, domain: null };
}

/** Clear only the recovery attempt for the domain whose root matched. */
export function observeMatchingDomainInLedger(
	ledger: DesyncRecoveryLedger,
	domain: P2PLogicalDomain,
): DesyncRecoveryLedger {
	return {
		...ledger,
		[domain]: CLEAN_DESYNC_RECOVERY,
	};
}

export function classifyP2PIntegrityFailure(
	kind: 'root_mismatch' | 'invalid_signature' | 'sequence_gap' | 'malformed_payload',
): 'recoverable_mismatch' | 'protocol_fault' {
	return kind === 'root_mismatch' ? 'recoverable_mismatch' : 'protocol_fault';
}
