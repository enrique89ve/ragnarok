import { describe, expect, it } from 'vitest';
import { CombatPhase, type PokerCombatState } from '../../types/PokerCombatTypes';
import { getPokerP2PTurnStatusView } from './PokerP2PTurnStatus';

function makeState(overrides: Partial<PokerCombatState> = {}): PokerCombatState {
	return {
		phase: CombatPhase.FAITH,
		turnId: 'combat:faith:abcdef',
		turnTimer: 12,
		maxTurnTime: 60,
		activePlayerId: 'player-1',
		player: { playerId: 'player-1' },
		opponent: { playerId: 'opponent-1' },
		foldWinner: undefined,
		isAllInShowdown: false,
		...overrides,
	} as unknown as PokerCombatState;
}

describe('getPokerP2PTurnStatusView', () => {
	it('shows an actionable local decision window', () => {
		const view = getPokerP2PTurnStatusView({
			combatState: makeState(),
			connectionState: 'connected',
		});

		expect(view.variant).toBe('player');
		expect(view.label).toBe('Your Decision');
		expect(view.turnLabel).toBe('#abcdef');
		expect(view.clockLabel).toBe('12s');
	});

	it('shows opponent acting when activePlayerId belongs to the peer', () => {
		const view = getPokerP2PTurnStatusView({
			combatState: makeState({ activePlayerId: 'opponent-1' }),
			connectionState: 'connected',
		});

		expect(view.variant).toBe('opponent');
		expect(view.title).toBe('Waiting on opponent');
	});

	it('lets reconnect state override the wager window', () => {
		const view = getPokerP2PTurnStatusView({
			combatState: makeState(),
			connectionState: 'reconnecting',
		});

		expect(view.variant).toBe('reconnecting');
		expect(view.title).toBe('Poker input paused');
	});

	it('shows showdown when wager actions are no longer valid', () => {
		const view = getPokerP2PTurnStatusView({
			combatState: makeState({ isAllInShowdown: true }),
			connectionState: 'connected',
		});

		expect(view.variant).toBe('showdown');
		expect(view.detail).toBe('No wager actions available');
	});
});
