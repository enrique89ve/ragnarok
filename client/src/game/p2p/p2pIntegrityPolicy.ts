import type { P2PCompetitionPhase } from '@shared/p2p-wire/p2pCompetitionLifecycle';
import type { P2PLogicalClock, P2PLogicalDomain } from '@shared/p2p-wire/p2pCompetitionLifecycle';

export const SETUP_STATE_MISMATCH_REASON = 'setup_state_mismatch' as const;

export function shouldEmitHashBeacon(input: Readonly<{
	readonly connectionState: string;
	readonly sendsHashBeacon: boolean;
	readonly competitionPhase: P2PCompetitionPhase | null | undefined;
	readonly chessTransitionPending?: boolean;
}>): boolean {
	return input.connectionState === 'connected'
		&& input.sendsHashBeacon
		&& input.competitionPhase === 'battle'
		&& input.chessTransitionPending !== true;
}

export function shouldCompareHashBeacon(
	competitionPhase: P2PCompetitionPhase | null | undefined,
	chessTransitionPending = false,
): boolean {
	return competitionPhase === 'battle' && !chessTransitionPending;
}

/**
 * A beacon is comparable only within the same domain revision. Missing clocks
 * are treated as legacy compatibility, while a known revision mismatch is a
 * normal in-flight condition and must not quarantine the session.
 */
export function shouldCompareDomainRevision(
	local: P2PLogicalClock | undefined,
	remote: P2PLogicalClock | undefined,
	domain: P2PLogicalDomain,
): boolean {
	if (!local || !remote) return true;
	const revisionKey = `${domain}Revision` as const;
	return local[revisionKey] === remote[revisionKey];
}
