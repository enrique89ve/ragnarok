import { describe, expect, it } from 'vitest';
import { type P2PHandshake, resolveP2P } from './resolver';

const baseHandshake: P2PHandshake = {
	matchId: 'match-abc-123',
	matchSeed: 'seed-deadbeef',
	remotePeerId: 'peer-xyz',
	myRole: 'first-mover',
	opponentUsername: 'thor',
};

describe('resolveP2P', () => {
	it('returns a peer opponent carrying the handshake fields', () => {
		const ctx = resolveP2P(baseHandshake);
		expect(ctx.opponent).toEqual({
			kind: 'peer',
			peerId: 'peer-xyz',
			myRole: 'first-mover',
			opponentUsername: 'thor',
		});
	});

	it('passes through matchId and matchSeed unchanged (no minting)', () => {
		const ctx = resolveP2P(baseHandshake);
		expect(ctx.matchId).toBe('match-abc-123');
		expect(ctx.matchSeed).toBe('seed-deadbeef');
	});

	it('produces ranked rewards (Match XP, ranked RUNE, ELO)', () => {
		const ctx = resolveP2P(baseHandshake);
		expect(ctx.reward).toEqual({
			matchXp: { kind: 'percentage', multiplier: 1 },
			rune: { kind: 'projected', source: 'p2p_ranked' },
			ranking: { kind: 'elo' },
		});
	});

	it('preserves the myRole field for both first-mover and second-mover', () => {
		const first = resolveP2P({ ...baseHandshake, myRole: 'first-mover' });
		const second = resolveP2P({ ...baseHandshake, myRole: 'second-mover' });
		if (first.opponent.kind !== 'peer' || second.opponent.kind !== 'peer') {
			throw new Error('expected peer opponent');
		}
		expect(first.opponent.myRole).toBe('first-mover');
		expect(second.opponent.myRole).toBe('second-mover');
	});

	it('preserves a null opponentUsername (guest peer with no Hive identity)', () => {
		const ctx = resolveP2P({ ...baseHandshake, opponentUsername: null });
		if (ctx.opponent.kind !== 'peer') throw new Error('expected peer');
		expect(ctx.opponent.opponentUsername).toBeNull();
	});

	it('is byte-equal across calls with the same handshake (determinism gate)', () => {
		const a = resolveP2P(baseHandshake);
		const b = resolveP2P(baseHandshake);
		expect(a).toEqual(b);
	});
});
