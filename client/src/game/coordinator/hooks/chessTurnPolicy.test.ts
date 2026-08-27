import { describe, expect, it } from 'vitest';
import { deriveChessTurnPolicy } from './chessTurnPolicy';

describe('deriveChessTurnPolicy', () => {
	it('schedules the chess AI on an opponent turn in local AI mode', () => {
		expect(deriveChessTurnPolicy({
			enabled: true,
			currentTurn: 'opponent',
			gameStatus: 'playing',
			isP2PMatch: false,
		})).toMatchObject({
			processMode: 'local_ai',
			actor: 'remote_ai',
			shouldScheduleAiTurn: true,
		});
	});

	it('keeps the remote peer as the actor in P2P instead of scheduling AI', () => {
		expect(deriveChessTurnPolicy({
			enabled: true,
			currentTurn: 'opponent',
			gameStatus: 'playing',
			isP2PMatch: true,
		})).toMatchObject({
			processMode: 'p2p',
			actor: 'remote_peer',
			shouldScheduleAiTurn: false,
		});
	});

	it('does not schedule AI during the local human turn', () => {
		expect(deriveChessTurnPolicy({
			enabled: true,
			currentTurn: 'player',
			gameStatus: 'playing',
			isP2PMatch: false,
		})).toMatchObject({
			actor: 'local_human',
			shouldScheduleAiTurn: false,
		});
	});

	it('disables AI when no match context enables a local opponent', () => {
		expect(deriveChessTurnPolicy({
			enabled: false,
			currentTurn: 'opponent',
			gameStatus: 'playing',
			isP2PMatch: false,
		})).toMatchObject({
			actor: 'none',
			shouldScheduleAiTurn: false,
		});
	});

	it('does not schedule AI when chess is not the active playable phase', () => {
		expect(deriveChessTurnPolicy({
			enabled: false,
			currentTurn: 'opponent',
			gameStatus: 'playing',
			isP2PMatch: false,
		}).shouldScheduleAiTurn).toBe(false);

		expect(deriveChessTurnPolicy({
			enabled: true,
			currentTurn: 'opponent',
			gameStatus: 'combat',
			isP2PMatch: false,
		}).shouldScheduleAiTurn).toBe(false);
	});
});
