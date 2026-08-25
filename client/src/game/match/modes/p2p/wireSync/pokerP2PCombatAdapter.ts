import { getPokerCombatAdapterState } from '../../../../hooks/usePokerCombatAdapter';
import { CombatAction, CombatPhase, type PokerCombatState } from '../../../../types/PokerCombatTypes';

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
	readonly applyRemoteSpellcraftReady: (input: {
		readonly combatId: string;
		readonly handNumber: number;
		readonly actorPlayerId: string;
	}) => P2PSpellcraftReadyApplyResult;
	readonly applyLocalSpellcraftReady: (input: {
		readonly combatId: string;
		readonly handNumber: number;
		readonly actorPlayerId: string;
	}) => P2PSpellcraftReadyApplyResult;
	readonly maybeCloseBettingRound: () => void;
	readonly syncRemotePokerTurnClock: (input: P2PPokerTurnClockInput) => void;
};

export type P2PPokerActionResult =
	| { readonly status: 'applied' }
	| { readonly status: 'rejected'; readonly reason: P2PPokerActionRejectionReason };

export type P2PPokerActionRejectionReason = 'no_combat_state' | 'engine_rejected';

export type P2PSpellcraftReadyApplyResult =
	| { readonly status: 'applied' }
	| { readonly status: 'rejected'; readonly reason: P2PSpellcraftReadyApplyRejectionReason };

export type P2PSpellcraftReadyApplyRejectionReason =
	| 'no_combat_state'
	| 'combat_mismatch'
	| 'hand_mismatch'
	| 'wrong_phase'
	| 'actor_mismatch'
	| 'already_ready'
	| 'engine_rejected';

export function getP2PPokerCombatAdapter(): P2PPokerCombatAdapter {
	const applySpellcraftReady = (
		actorSlot: 'player' | 'opponent',
		input: { readonly combatId: string; readonly handNumber: number; readonly actorPlayerId: string },
	): P2PSpellcraftReadyApplyResult => {
		const engine = getPokerCombatAdapterState();
		const before = engine.combatState;
		if (!before) return { status: 'rejected', reason: 'no_combat_state' };
		if (before.combatId !== input.combatId) return { status: 'rejected', reason: 'combat_mismatch' };
		if (before.handNumber !== input.handNumber) return { status: 'rejected', reason: 'hand_mismatch' };
		if (before.phase !== CombatPhase.SPELL_PET) return { status: 'rejected', reason: 'wrong_phase' };
		if (before[actorSlot].playerId !== input.actorPlayerId) return { status: 'rejected', reason: 'actor_mismatch' };
		if (before[actorSlot].isReady) return { status: 'rejected', reason: 'already_ready' };

		engine.setPlayerReady(input.actorPlayerId);
		const after = getPokerCombatAdapterState().combatState;
		return after
			&& after !== before
			&& after[actorSlot].playerId === input.actorPlayerId
			&& after[actorSlot].isReady
			? { status: 'applied' }
			: { status: 'rejected', reason: 'engine_rejected' };
	};

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
		applyRemoteSpellcraftReady: (input) => applySpellcraftReady('opponent', input),
		applyLocalSpellcraftReady: (input) => applySpellcraftReady('player', input),
		maybeCloseBettingRound: () => {
			getPokerCombatAdapterState().maybeCloseBettingRound();
		},
		syncRemotePokerTurnClock: (input) => {
			getPokerCombatAdapterState().syncTurnClock(input);
		},
	};
}
