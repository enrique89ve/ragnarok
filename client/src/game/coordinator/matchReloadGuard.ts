/**
 * Browser reload guard for a live match.
 *
 * Single and campaign keep the board in RAM — a reload discards the battle.
 * P2P tries a local snapshot rejoin (see docs/P2P_MATCH_RESUME.md).
 * Browsers own the dialog copy; returnValue only opts into the prompt.
 */

import { recordSessionEvent } from '../../data/blockchain/transcriptBuilder';
import type { RoundFlowState } from '../flow/round/types';
import type { PlayableMatchMode } from '../match/derived';

export type MatchReloadGuardInput = {
	readonly hasActiveMatch: boolean;
	readonly flowTag: RoundFlowState['tag'] | null;
	readonly cardsGamePhase?: string | null;
};

export type AttachMatchReloadGuardInput = {
	readonly mode: PlayableMatchMode | null;
	readonly connectionState?: string;
};

export type MatchReloadGuardTarget = {
	readonly addEventListener: (
		type: 'beforeunload',
		listener: (event: BeforeUnloadEvent) => void,
	) => void;
	readonly removeEventListener: (
		type: 'beforeunload',
		listener: (event: BeforeUnloadEvent) => void,
	) => void;
};

const P2P_RELOAD_WARNING =
	'A live P2P match is in progress. Reloading tries to rejoin from this device (2 attempts).';

const LOCAL_RELOAD_WARNING =
	'A match is in progress. Reloading discards this battle; no result will be recorded.';

export function shouldWarnOnMatchReload(input: MatchReloadGuardInput): boolean {
	if (!input.hasActiveMatch) return false;
	if (input.flowTag === 'game_over') return false;
	if (input.cardsGamePhase === 'game_over' || input.cardsGamePhase === 'ended') {
		return false;
	}
	return true;
}

export function isLiveP2PReloadGuardTransport(connectionState: string): boolean {
	return connectionState === 'connected'
		|| connectionState === 'reconnecting'
		|| connectionState === 'grace_period';
}

export function matchReloadWarningMessage(mode: PlayableMatchMode | null): string {
	return mode === 'p2p' ? P2P_RELOAD_WARNING : LOCAL_RELOAD_WARNING;
}

export function attachMatchReloadGuard(
	input: AttachMatchReloadGuardInput,
	target: MatchReloadGuardTarget = window,
): () => void {
	let prompted = false;
	const handleBeforeUnload = (event: BeforeUnloadEvent): string => {
		if (!prompted) {
			prompted = true;
			recordReloadGuardPrompt(input);
		}
		const warning = matchReloadWarningMessage(input.mode);
		event.preventDefault();
		Reflect.set(event, 'returnValue', warning);
		return warning;
	};
	target.addEventListener('beforeunload', handleBeforeUnload);
	return () => target.removeEventListener('beforeunload', handleBeforeUnload);
}

function recordReloadGuardPrompt(input: AttachMatchReloadGuardInput): void {
	if (input.mode === 'p2p') {
		recordSessionEvent('p2p_reload_guard_prompted', {
			connectionState: input.connectionState ?? null,
			policy: 'hard_reload_loses_in_memory_game_state',
			evidence: 'download_session_log_if_reload_is_cancelled',
		});
		return;
	}
	recordSessionEvent('match_reload_guard_prompted', {
		mode: input.mode,
		policy: 'hard_reload_discards_in_memory_match',
	});
}
