import { describe, expect, it } from 'vitest';
import { resolveSingle } from './resolver';

const TEST_IDENTITY = {
	matchId: 'test-match-single',
	matchSeed: 'test-seed-single',
} as const;

describe('resolveSingle', () => {
	it('returns an AI opponent with the requested difficulty and deck source', () => {
		const ctx = resolveSingle({ identity: TEST_IDENTITY, difficulty: 'normal', deckSource: 'warband' });
		expect(ctx.opponent).toEqual({
			kind: 'ai',
			difficulty: 'normal',
			deckSource: 'warband',
		});
	});

	it('passes through ai style when provided', () => {
		const ctx = resolveSingle({ identity: TEST_IDENTITY, difficulty: 'normal', style: 'human', deckSource: 'warband' });
		if (ctx.opponent.kind !== 'ai') throw new Error('expected ai opponent');
		expect(ctx.opponent.style).toBe('human');
	});

	it('passes through every difficulty tier', () => {
		const tiers = ['normal', 'heroic', 'mythic'] as const;
		for (const difficulty of tiers) {
			const ctx = resolveSingle({ identity: TEST_IDENTITY, difficulty, deckSource: 'default' });
			if (ctx.opponent.kind !== 'ai') throw new Error('expected ai opponent');
			expect(ctx.opponent.difficulty).toBe(difficulty);
		}
	});

	it('produces a practice reward channel (none/none)', () => {
		const ctx = resolveSingle({ identity: TEST_IDENTITY, difficulty: 'normal', deckSource: 'warband' });
		expect(ctx.reward).toEqual({
			matchXp: { kind: 'none' },
			rune: { kind: 'none' },
			ranking: { kind: 'none' },
		});
	});

	it('passes through the supplied identity', () => {
		const ctx = resolveSingle({ identity: TEST_IDENTITY, difficulty: 'normal', deckSource: 'warband' });
		expect(ctx.matchId).toBe(TEST_IDENTITY.matchId);
		expect(ctx.matchSeed).toBe(TEST_IDENTITY.matchSeed);
	});
});
