import { getPokerCombatAdapterState } from '../../../../hooks/usePokerCombatAdapter';
import { CombatAction, type PokerCombatState } from '../../../../types/PokerCombatTypes';

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
	readonly applyRemotePokerAction: (input: {
		readonly playerId: string;
		readonly action: CombatAction;
		readonly hpCommitment?: number;
	}) => P2PPokerActionResult;
	readonly maybeCloseBettingRound: () => void;
	readonly syncRemotePokerTurnClock: (input: P2PPokerTurnClockInput) => void;
};

export type P2PPokerActionResult =
	| { readonly status: 'applied' }
	| { readonly status: 'rejected'; readonly reason: P2PPokerActionRejectionReason };

export type P2PPokerActionRejectionReason = 'no_combat_state' | 'engine_rejected';

export function getP2PPokerCombatAdapter(): P2PPokerCombatAdapter {
	return {
		getPokerState: () => getPokerCombatAdapterState().combatState,
		applyRemotePokerAction: (input) => {
			const engine = getPokerCombatAdapterState();
			const before = engine.combatState;
			if (!before) return { status: 'rejected', reason: 'no_combat_state' };
			engine.performAction(input.playerId, input.action, input.hpCommitment);
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
	};
}
