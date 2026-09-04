import { getPokerCombatAdapterState } from '../../../../hooks/usePokerCombatAdapter';
import { CombatAction, type PokerCombatState } from '../../../../types/PokerCombatTypes';
import type { PokerActionOrigin } from '@shared/p2p-wire/combat';

export type P2PPokerTurnClockInput = {
	readonly turnId: string;
	readonly combatId: string;
	readonly phase: string;
	readonly activePlayerId: string;
	readonly actionsThisRound: number;
	readonly durationMs: number;
	readonly sentAtMs?: number;
	readonly remainingMs?: number;
	readonly receivedAtMs: number;
};

export type P2PPokerCombatAdapter = {
	readonly getPokerState: () => PokerCombatState | null;
	readonly lastResolvedHand: ReturnType<typeof getPokerCombatAdapterState>['lastResolvedHand'];
	readonly applyRemotePokerAction: (input: {
		readonly playerId: string;
		readonly action: CombatAction;
		readonly origin: PokerActionOrigin;
		readonly hpCommitment?: number;
		readonly nowMs?: number;
	}) => P2PPokerActionResult;
	readonly maybeCloseBettingRound: () => void;
	readonly syncRemotePokerTurnClock: (input: P2PPokerTurnClockInput) => void;
	readonly applyNotarizedPokerTurnClock: (input: P2PNotarizedPokerTurnClockInput) => void;
};

export type P2PNotarizedPokerTurnClockInput = {
	readonly turnId: string;
	readonly combatId: string;
	readonly phase: string;
	readonly activePlayerId: string;
	readonly actionsThisRound: number;
	readonly remainingMsAtCommit: number;
	readonly receivedAtMs: number;
};

export type P2PPokerActionResult =
	| { readonly status: 'applied' }
	| { readonly status: 'rejected'; readonly reason: P2PPokerActionRejectionReason };

export type P2PPokerActionRejectionReason = 'no_combat_state' | 'engine_rejected';

export function getP2PPokerCombatAdapter(): P2PPokerCombatAdapter {
	return {
		getPokerState: () => getPokerCombatAdapterState().combatState,
		get lastResolvedHand() {
			return getPokerCombatAdapterState().lastResolvedHand;
		},
		applyRemotePokerAction: (input) => {
			const engine = getPokerCombatAdapterState();
			const before = engine.combatState;
			if (!before) return { status: 'rejected', reason: 'no_combat_state' };
			if (input.nowMs === undefined) {
				engine.performAction(input.playerId, input.action, input.hpCommitment, input.origin);
			} else {
				engine.performAction(input.playerId, input.action, input.hpCommitment, input.origin, input.nowMs);
			}
			const after = getPokerCombatAdapterState().combatState;
			// The engine commits a new immutable combat snapshot on accepted actions.
			// Only this post-engine transition authorizes transcript/dedup side effects.
			return after && after !== before
				? { status: 'applied' }
				: { status: 'rejected', reason: 'engine_rejected' };
		},
		maybeCloseBettingRound: () => {
			getPokerCombatAdapterState().maybeCloseBettingRound();
		},
		syncRemotePokerTurnClock: (input) => {
			getPokerCombatAdapterState().syncTurnClock(input);
		},
		applyNotarizedPokerTurnClock: (input) => {
			getPokerCombatAdapterState().applyNotarizedTurnClock(input);
		},
	};
}
