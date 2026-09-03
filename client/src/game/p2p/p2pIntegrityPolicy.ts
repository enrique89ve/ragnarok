import type { P2PCompetitionPhase } from '@shared/p2p-wire/p2pCompetitionLifecycle';

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

export function shouldDeferSlashForHashMismatch(
	competitionPhase: P2PCompetitionPhase | null | undefined,
): boolean {
	return competitionPhase === 'battle';
}
