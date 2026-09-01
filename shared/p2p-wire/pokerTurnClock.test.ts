import { describe, expect, it } from 'vitest';
import { getCanonicalPokerActionNowMs } from './pokerTurnClock';

describe('canonical Poker action timestamp', () => {
	it('evaluates an accepted player action immediately before the deadline', () => {
		expect(getCanonicalPokerActionNowMs({
			origin: 'player',
			deadlineAtMs: 60_000,
		})).toBe(59_999);
	});

	it('evaluates a timeout at the deadline', () => {
		expect(getCanonicalPokerActionNowMs({
			origin: 'timeout',
			deadlineAtMs: 60_000,
		})).toBe(60_000);
	});

	it('keeps wall-clock behavior for untimed legacy states', () => {
		expect(getCanonicalPokerActionNowMs({
			origin: 'player',
			deadlineAtMs: null,
		})).toBeUndefined();
	});
});
