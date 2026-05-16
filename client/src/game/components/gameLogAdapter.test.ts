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
});
