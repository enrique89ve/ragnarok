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
	}) => void;
	readonly maybeCloseBettingRound: () => void;
	readonly syncRemotePokerTurnClock: (input: P2PPokerTurnClockInput) => void;
};

export function getP2PPokerCombatAdapter(): P2PPokerCombatAdapter {
	return {
		getPokerState: () => getPokerCombatAdapterState().combatState,
		applyRemotePokerAction: (input) => {
			getPokerCombatAdapterState().performAction(input.playerId, input.action, input.hpCommitment);
		},
		maybeCloseBettingRound: () => {
			getPokerCombatAdapterState().maybeCloseBettingRound();
		},
		syncRemotePokerTurnClock: (input) => {
			getPokerCombatAdapterState().syncTurnClock(input);
		},
	};
}
