import { describe, expect, it } from 'vitest';
import { resolveRagnarokRuntimeConfig } from '@shared/runtimeConfig';
import { TESTNET_RUNE_ECONOMY } from '@shared/protocol-core/runeEconomy';
import type { MatchContext } from '../../types';
import {
	calculateP2PQaLocalMatchXp,
	createP2PQaLocalRewardPreview,
} from './qaLocalRewardPreview';

const qaRuntime = resolveRagnarokRuntimeConfig({
	VITE_NETWORK_STAGE: 'testnet',
	VITE_RAGNAROK_RESET_EPOCH: 'qa-s0-unit',
});

const closedBetaRuntime = resolveRagnarokRuntimeConfig({
	VITE_NETWORK_STAGE: 'testnet',
	VITE_RAGNAROK_RESET_EPOCH: 'closed-beta-unit',
});

const peerMatch: MatchContext = {
	matchId: 'match-qa-preview',
	matchSeed: 'seed-qa-preview',
	opponent: {
		kind: 'peer',
		peerId: 'peer-b',
		myRole: 'first-mover',
		opponentUsername: 'bob',
	},
	reward: {
		xpRunes: { kind: 'percentage', multiplier: 1 },
		ranking: { kind: 'elo' },
	},
};

describe('createP2PQaLocalRewardPreview', () => {
	it('shows local winner rewards in QA full-catalog without CardXP', () => {
		const preview = createP2PQaLocalRewardPreview({
			match: peerMatch,
			result: 'victory',
			runtime: qaRuntime,
			account: 'Alice',
		});

		expect(preview).toMatchObject({
			scope: 'qa_local',
			label: 'QA local reward preview',
			runeShown: TESTNET_RUNE_ECONOMY.p2pWinRune,
			matchXpShown: 25,
			cardXpShown: 0,
		});
		expect(preview?.cacheKey).toContain('qa-s0-unit');
		expect(preview?.cacheKey).toContain('rk-game-testnet');
		expect(preview?.cacheKey).toContain('alice');
		expect(preview?.settlementNote).toContain('dual-signed match evidence');
	});

	it('stays disabled outside the QA full-catalog reset epoch', () => {
		expect(createP2PQaLocalRewardPreview({
			match: peerMatch,
			result: 'victory',
			runtime: closedBetaRuntime,
			account: 'alice',
		})).toBeNull();
	});

	it('does not show QA P2P rewards for non-peer matches', () => {
		const singleMatch: MatchContext = {
			...peerMatch,
			opponent: { kind: 'ai', difficulty: 'normal', deckSource: 'default' },
			reward: { xpRunes: { kind: 'none' }, ranking: { kind: 'none' } },
		};

		expect(createP2PQaLocalRewardPreview({
			match: singleMatch,
			result: 'victory',
			runtime: qaRuntime,
			account: 'alice',
		})).toBeNull();
	});

	it('shows draw as a local result preview with no RUNE or XP gain', () => {
		const preview = createP2PQaLocalRewardPreview({
			match: peerMatch,
			result: 'draw',
			runtime: qaRuntime,
			account: 'alice',
		});

		expect(preview).toMatchObject({
			scope: 'qa_local',
			label: 'QA local result preview',
			runeShown: TESTNET_RUNE_ECONOMY.p2pLossRune,
			matchXpShown: 0,
			cardXpShown: 0,
		});
	});
});

describe('calculateP2PQaLocalMatchXp', () => {
	it('uses the match reward channel multiplier for wins only', () => {
		expect(calculateP2PQaLocalMatchXp({ xpRunes: { kind: 'percentage', multiplier: 2 }, ranking: { kind: 'elo' } }, 'victory')).toBe(50);
		expect(calculateP2PQaLocalMatchXp({ xpRunes: { kind: 'percentage', multiplier: 2 }, ranking: { kind: 'elo' } }, 'defeat')).toBe(0);
		expect(calculateP2PQaLocalMatchXp({ xpRunes: { kind: 'none' }, ranking: { kind: 'none' } }, 'victory')).toBe(0);
	});
});
