import { describe, expect, it } from 'vitest';
import { CombatPhase } from '../../types/PokerCombatTypes';
import { getPokerDecisionView, type PokerDecisionStateInput } from './pokerDecisionView';

function makeDecisionState(overrides: Partial<PokerDecisionStateInput> = {}): PokerDecisionStateInput {
	return {
		combatId: 'combat-test',
		phase: CombatPhase.FAITH,
		player: { playerId: 'local-piece' },
		opponent: { playerId: 'remote-piece' },
		activePlayerId: 'local-piece',
		turnId: 'combat-test:faith:local-piece:3',
		turnStartedAtMs: 1_000,
		turnDeadlineAtMs: 61_000,
		maxTurnTime: 60,
		actionsThisRound: 3,
		foldWinner: null,
		isAllInShowdown: false,
		...overrides,
	};
}

describe('getPokerDecisionView', () => {
	it('derives an actionable local decision from activePlayerId and deadline', () => {
		const view = getPokerDecisionView({
			combatState: makeDecisionState(),
			connectionState: 'connected',
			nowMs: 1_001,
		});

		expect(view.status).toBe('local_decision');
		expect(view.decisionSide).toBe('local');
		expect(view.canAct).toBe(true);
		expect(view.remainingSeconds).toBe(60);
		expect(view.clockLabel).toBe('60s');
		expect(view.label).toBe('Your Decision');
		expect(view.protocol).toMatchObject({
			combatId: 'combat-test',
			activePlayerId: 'local-piece',
			localPlayerId: 'local-piece',
			remotePlayerId: 'remote-piece',
			turnId: 'combat-test:faith:local-piece:3',
			turnDeadlineAtMs: 61_000,
			actionsThisRound: 3,
		});
	});

	it('locks controls for a remote decision while preserving protocol metadata', () => {
		const view = getPokerDecisionView({
			combatState: makeDecisionState({
				activePlayerId: 'remote-piece',
				turnId: 'combat-test:faith:remote-piece:4',
				actionsThisRound: 4,
			}),
			connectionState: 'connected',
			nowMs: 30_001,
		});

		expect(view.status).toBe('remote_decision');
		expect(view.decisionSide).toBe('remote');
		expect(view.canAct).toBe(false);
		expect(view.remainingSeconds).toBe(31);
		expect(view.title).toBe('Waiting on opponent');
		expect(view.protocol.activePlayerId).toBe('remote-piece');
		expect(view.protocol.turnId).toBe('combat-test:faith:remote-piece:4');
	});

	it('derives zero remaining seconds from an expired deadline and disables action', () => {
		const view = getPokerDecisionView({
			combatState: makeDecisionState({ turnDeadlineAtMs: 61_000 }),
			connectionState: 'connected',
			nowMs: 61_000,
		});

		expect(view.status).toBe('expired');
		expect(view.decisionSide).toBe('local');
		expect(view.canAct).toBe(false);
		expect(view.remainingSeconds).toBe(0);
		expect(view.clockLabel).toBe('0s');
	});

	it('lets connection state pause any open decision window', () => {
		const view = getPokerDecisionView({
			combatState: makeDecisionState(),
			connectionState: 'reconnecting',
			nowMs: 10_000,
		});

		expect(view.status).toBe('connection_paused');
		expect(view.decisionSide).toBe('none');
		expect(view.canAct).toBe(false);
		expect(view.label).toBe('Reconnecting');
		expect(view.protocol.connectionState).toBe('reconnecting');
	});

	it('treats resolved poker phases as non-actionable showdown', () => {
		const view = getPokerDecisionView({
			combatState: makeDecisionState({
				phase: CombatPhase.RESOLUTION,
				activePlayerId: 'local-piece',
				isAllInShowdown: true,
			}),
			connectionState: 'connected',
			nowMs: 10_000,
		});

		expect(view.status).toBe('showdown');
		expect(view.decisionSide).toBe('none');
		expect(view.canAct).toBe(false);
		expect(view.phaseLabel).toBe('Showdown');
		expect(view.detail).toBe('No wager actions available');
	});

	it('reports syncing when the protocol has no active decision clock', () => {
		const view = getPokerDecisionView({
			combatState: makeDecisionState({
				activePlayerId: null,
				turnId: null,
				turnStartedAtMs: null,
				turnDeadlineAtMs: null,
			}),
			connectionState: 'connected',
			nowMs: 10_000,
		});

		expect(view.status).toBe('syncing');
		expect(view.remainingSeconds).toBeNull();
		expect(view.clockLabel).toBe('No clock');
		expect(view.turnLabel).toBe('No clock');
	});
});
