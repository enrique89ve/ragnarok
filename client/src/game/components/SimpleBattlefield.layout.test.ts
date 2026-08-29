import { describe, expect, it } from 'vitest';
import {
	buildBattlefieldLayoutItems,
	hasBattlefieldWagerEffect,
	hasUniqueBattlefieldInstanceIds,
	isBattlefieldTarget,
} from './SimpleBattlefield';

interface TestCard {
	readonly instanceId: string;
}

const cards = (...instanceIds: string[]): TestCard[] =>
	instanceIds.map(instanceId => ({ instanceId }));

const keys = (items: ReadonlyArray<{ readonly key: string }>): string[] =>
	items.map(item => item.key);

describe('SimpleBattlefield layout identity', () => {
	it('compacts the row after a middle card dies without re-identifying survivors', () => {
		const before = cards('A', 'B', 'C');
		const after = buildBattlefieldLayoutItems([before[0], before[2]]);

		expect(keys(after)).toEqual(['A', 'C']);
		expect(after[0]?.card).toBe(before[0]);
		expect(after[1]?.card).toBe(before[2]);
	});

	it('moves the remaining cards when the first card dies', () => {
		const before = cards('A', 'B', 'C', 'D', 'E');

		expect(keys(buildBattlefieldLayoutItems(before.slice(1)))).toEqual(['B', 'C', 'D', 'E']);
	});

	it('does not move the surviving prefix when the last card dies', () => {
		const before = cards('A', 'B', 'C', 'D', 'E');
		const after = buildBattlefieldLayoutItems(before.slice(0, -1));

		expect(keys(after)).toEqual(['A', 'B', 'C', 'D']);
		expect(after.map(item => item.card)).toEqual(before.slice(0, -1));
	});

	it('handles multiple deaths as one compacted identity-preserving row', () => {
		const before = cards('A', 'B', 'C', 'D');
		const after = buildBattlefieldLayoutItems([before[0], before[2]]);

		expect(keys(after)).toEqual(['A', 'C']);
		expect(after.map(item => item.card)).toEqual([before[0], before[2]]);
	});

	it('detects duplicate instance ids as invalid battlefield identity state', () => {
		expect(hasUniqueBattlefieldInstanceIds(cards('A', 'B'))).toBe(true);
		expect(hasUniqueBattlefieldInstanceIds(cards('A', 'A'))).toBe(false);
	});

	it('uses canonical valid target ids for either battlefield side', () => {
		const playerCard = cards('friendly-target')[0];
		const opponentCard = cards('enemy-target')[0];

		expect(isBattlefieldTarget(playerCard, ['friendly-target'])).toBe(true);
		expect(isBattlefieldTarget(opponentCard, ['friendly-target'])).toBe(false);
	});

	it('treats null and undefined wager effects as inactive', () => {
		expect(hasBattlefieldWagerEffect({ card: { wagerEffect: null } })).toBe(false);
		expect(hasBattlefieldWagerEffect({ card: { wagerEffect: undefined } })).toBe(false);
		expect(hasBattlefieldWagerEffect({ card: { wagerEffect: { type: 'wager' } } })).toBe(true);
	});
});
