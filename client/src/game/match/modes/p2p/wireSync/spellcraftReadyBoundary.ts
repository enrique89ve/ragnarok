import type {
	SpellcraftActorSide,
	SpellcraftReadyMessage,
} from '@shared/p2p-wire/spellcraft';
import { buildSpellcraftWindowKey } from '@shared/p2p-wire/spellcraft';
import { CombatPhase, type PokerCombatState } from '../../../../types/PokerCombatTypes';
import type { P2PSpellcraftReadyApplyResult } from './pokerP2PCombatAdapter';
import {
	commitRemotePokerDecision,
	hasRemotePokerDecision,
	type RemotePokerDecisionLedger,
} from './remotePokerDecisionLedger';

export type SpellcraftReadyLedger = RemotePokerDecisionLedger & {
	lastIncomingSeq: number;
};

export type RemoteSpellcraftReadyResult =
	| { readonly status: 'applied' }
	| { readonly status: 'duplicate' }
	| { readonly status: 'rejected'; readonly reason: RemoteSpellcraftReadyRejectionReason };

export type RemoteSpellcraftReadyRejectionReason =
	| 'disconnected'
	| 'match_mismatch'
	| 'combat_mismatch'
	| 'hand_mismatch'
	| 'wrong_phase'
	| 'actor_side_mismatch'
	| 'actor_identity_mismatch'
	| 'stale_sequence'
	| 'sequence_gap'
	| 'engine_rejected';

export function createSpellcraftReadyLedger(): SpellcraftReadyLedger {
	return { seen: new Set<string>(), order: [], lastIncomingSeq: -1 };
}

export function resetSpellcraftReadyLedger(ledger: SpellcraftReadyLedger): void {
	ledger.seen.clear();
	ledger.order.length = 0;
	ledger.lastIncomingSeq = -1;
}

export function settleRemoteSpellcraftReady(input: {
	readonly message: SpellcraftReadyMessage;
	readonly connectionState: string;
	readonly expectedMatchId: string | null;
	readonly expectedRemoteSide: SpellcraftActorSide;
	readonly pokerState: PokerCombatState | null;
	readonly ledger: SpellcraftReadyLedger;
	readonly maxLedgerEntries: number;
}, deps: {
	readonly applyRemoteReady: () => P2PSpellcraftReadyApplyResult;
	readonly onApplied: () => void;
}): RemoteSpellcraftReadyResult {
	const { message, ledger, pokerState } = input;
	if (input.connectionState !== 'connected') {
		return { status: 'rejected', reason: 'disconnected' };
	}
	if (!input.expectedMatchId || message.matchId !== input.expectedMatchId) {
		return { status: 'rejected', reason: 'match_mismatch' };
	}
	if (hasRemotePokerDecision(ledger, message.decisionId)) {
		return { status: 'duplicate' };
	}
	if (!pokerState || message.combatId !== pokerState.combatId) {
		return { status: 'rejected', reason: 'combat_mismatch' };
	}
	// One Ready exists per deterministic hand ordinal. Comparing the wire seq
	// to canonical state (not an in-memory counter) survives one-sided reloads.
	if (message.seq < pokerState.handNumber) {
		return { status: 'rejected', reason: 'stale_sequence' };
	}
	if (message.seq > pokerState.handNumber) {
		return { status: 'rejected', reason: 'sequence_gap' };
	}
	if (message.handNumber !== pokerState.handNumber) {
		return { status: 'rejected', reason: 'hand_mismatch' };
	}
	if (message.actorSide !== input.expectedRemoteSide) {
		return { status: 'rejected', reason: 'actor_side_mismatch' };
	}
	if (message.actorPlayerId !== pokerState.opponent.playerId) {
		return { status: 'rejected', reason: 'actor_identity_mismatch' };
	}
	// The canonical engine snapshot survives hook/session reload. If this exact
	// actor is already Ready for the bound hand, ACK the replay even after the
	// phase advanced; no ledger/sequence is consumed a second time.
	if (pokerState.opponent.isReady) {
		return { status: 'duplicate' };
	}
	if (pokerState.phase !== CombatPhase.SPELL_PET) {
		return { status: 'rejected', reason: 'wrong_phase' };
	}
	if (message.windowKey !== buildSpellcraftWindowKey({
		matchId: input.expectedMatchId,
		combatId: pokerState.combatId,
		handNumber: pokerState.handNumber,
	})) {
		return { status: 'rejected', reason: 'hand_mismatch' };
	}

	const applied = deps.applyRemoteReady();
	// A reconstructed/replayed Ready after reload is still acknowledged. The
	// engine's already-ready state is canonical evidence that this exact actor
	// intent was applied previously; it must not consume sequence/dedup again.
	if (applied.status === 'rejected' && applied.reason === 'already_ready') {
		return { status: 'duplicate' };
	}
	if (applied.status !== 'applied') {
		return { status: 'rejected', reason: 'engine_rejected' };
	}

	commitRemotePokerDecision(ledger, message.decisionId, input.maxLedgerEntries);
	ledger.lastIncomingSeq = message.seq;
	deps.onApplied();
	return { status: 'applied' };
}
