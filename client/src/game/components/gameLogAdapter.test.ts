import { describe, expect, it } from 'vitest';
import { adaptGameLogEntry } from './gameLogAdapter';

describe('adaptGameLogEntry', () => {
	it('renders poker decision entries with phase and turn metadata', () => {
		const item = adaptGameLogEntry({
			id: 'poker-turn-1',
			timestamp: 1,
			turn: 7,
			actor: 'player',
			type: 'poker_turn',
			message: 'Your poker decision window opened',
			details: {
				phaseLabel: 'Faith',
				turnId: 'combat:faith:abcdef',
			},
		});

		expect(item.title).toBe('Poker decision');
		expect(item.tone).toBe('player');
		expect(item.actorLabel).toBe('You');
		expect(item.meta).toEqual(['You', 'Faith', '#abcdef']);
	});

	it('renders P2P status entries as neutral system log rows', () => {
		const item = adaptGameLogEntry({
			id: 'p2p-status-1',
			timestamp: 1,
			turn: 7,
			actor: 'system',
			type: 'p2p_status',
			message: 'P2P reconnecting - poker input paused',
			details: {
				statusLabel: 'reconnecting',
			},
		});

		expect(item.title).toBe('P2P status');
		expect(item.tone).toBe('neutral');
		expect(item.actorLabel).toBe('System');
		expect(item.meta).toEqual(['System', 'reconnecting']);
	});

	it('renders poker bets and stamina as distinct log rows', () => {
		const bet = adaptGameLogEntry({
			id: 'bet-1',
			timestamp: 1,
			turn: 3,
			actor: 'player',
			type: 'poker_bet',
			message: 'You bet 12 HP (-2 STA)',
			details: { amount: 12, phaseLabel: 'Faith' },
		});
		expect(bet.title).toBe('Poker action');
		expect(bet.amountLabel).toBe('-12');

		const stamina = adaptGameLogEntry({
			id: 'sta-1',
			timestamp: 1,
			turn: 3,
			actor: 'player',
			type: 'stamina',
			message: 'You check (+1 STA)',
			details: { amount: 1 },
		});
		expect(stamina.title).toBe('Stamina');
		expect(stamina.tone).toBe('neutral');
	});
});
