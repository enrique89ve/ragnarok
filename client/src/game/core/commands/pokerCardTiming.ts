import type { CardInstance } from '../../types';
import { isTimedPokerDecisionPhase } from '../../../../../shared/p2p-wire/pokerTurnClock';

export type PokerCardTimingContext = Readonly<{
	combatId: string;
	phase: string;
	playerId: string;
	opponentId: string;
	activePlayerId: string | null;
	turnId: string | null;
	turnDeadlineAtMs: number | null;
}>;

export type PokerCardTimingRejectReason =
	| 'poker_combat_inactive'
	| 'poker_actor_not_active'
	| 'poker_phase_not_actionable'
	| 'poker_turn_clock_missing'
	| 'poker_turn_expired'
	| 'poker_card_timing_not_allowed';

export type PokerCardTimingResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: PokerCardTimingRejectReason };

type RestrictedPokerTiming = 'pre_deal' | 'on_river';

const TIMING_PHASES: Readonly<Record<RestrictedPokerTiming, string>> = {
	pre_deal: 'pre_flop',
	on_river: 'destiny',
};

/**
 * Authoritative card-window gate. A null context means this is a normal cards
 * match, not an active Poker combat, so the ordinary card command rules apply.
 */
export function canPlayCardInPokerWindow(input: {
	readonly combatState: PokerCardTimingContext | null;
	readonly card: CardInstance;
	readonly actor: string;
	readonly nowMs?: number;
}): PokerCardTimingResult {
	const combatState = input.combatState;
	if (combatState === null || combatState.combatId.length === 0) {
		return { ok: false, reason: 'poker_combat_inactive' };
	}
	if (combatState.activePlayerId !== input.actor) {
		return { ok: false, reason: 'poker_actor_not_active' };
	}
	if (!isTimedPokerDecisionPhase(combatState.phase)) {
		return { ok: false, reason: 'poker_phase_not_actionable' };
	}
	if (combatState.turnId === null || combatState.turnDeadlineAtMs === null) {
		return { ok: false, reason: 'poker_turn_clock_missing' };
	}

	const nowMs = input.nowMs ?? Date.now();
	if (!Number.isFinite(nowMs) || nowMs >= combatState.turnDeadlineAtMs) {
		return { ok: false, reason: 'poker_turn_expired' };
	}

	const timing = getPokerCardTiming(input.card);
	if (!isPokerCardTimingAllowed(timing, combatState.phase)) {
		return { ok: false, reason: 'poker_card_timing_not_allowed' };
	}

	return { ok: true };
}

/** Shared by the UI spell helper and the command boundary. */
export function isPokerCardTimingAllowed(timing: string | undefined, phase: string): boolean {
	if (timing === undefined) return true;
	const requiredPhase = isRestrictedPokerTiming(timing) ? TIMING_PHASES[timing] : undefined;
	return requiredPhase === undefined || normalizePhase(phase) === requiredPhase;
}

function isRestrictedPokerTiming(value: string): value is RestrictedPokerTiming {
	return value === 'pre_deal' || value === 'on_river';
}

function getPokerCardTiming(card: CardInstance): string | undefined {
	if (!('pokerSpellEffect' in card.card) || card.card.pokerSpellEffect === undefined) return undefined;
	return card.card.pokerSpellEffect.timing;
}

function normalizePhase(phase: string): string {
	return phase.trim().toLowerCase();
}
