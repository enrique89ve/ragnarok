import { beforeEach, describe, expect, it } from 'vitest';
import { useStarterStore } from './starterStore';

describe('useStarterStore starter reputation', () => {
	beforeEach(() => {
		useStarterStore.setState({
			claimed: false,
			starterReputationByAccount: {},
		});
	});

	it('records account-bound starter reputation without XP or levels', () => {
		useStarterStore.getState().recordStarterReputation({
			accountId: 'alice',
			matchId: 'match-1',
			cardIds: [140, 140, 141],
			won: true,
			timestamp: 123,
		});

		expect(useStarterStore.getState().getStarterReputation('alice', 140)).toEqual({
			cardId: 140,
			reputation: 2,
			gamesPlayed: 1,
			wins: 1,
			lastMatchId: 'match-1',
			updatedAt: 123,
		});
		expect(useStarterStore.getState().getStarterReputation('alice', 141)?.reputation).toBe(2);
	});

	it('does not double count the same match for the same card', () => {
		const params = {
			accountId: 'alice',
			matchId: 'match-1',
			cardIds: [140],
			won: false,
			timestamp: 123,
		};

		useStarterStore.getState().recordStarterReputation(params);
		useStarterStore.getState().recordStarterReputation({ ...params, timestamp: 456 });

		expect(useStarterStore.getState().getStarterReputation('alice', 140)).toEqual({
			cardId: 140,
			reputation: 1,
			gamesPlayed: 1,
			wins: 0,
			lastMatchId: 'match-1',
			updatedAt: 123,
		});
	});
});
