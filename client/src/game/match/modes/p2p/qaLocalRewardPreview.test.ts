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
		matchXp: { kind: 'percentage', multiplier: 1 },
		rune: { kind: 'projected', source: 'p2p_ranked' },
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
			label: 'Victory rewards',
			runeShown: TESTNET_RUNE_ECONOMY.p2pWinRune,
			matchXpShown: 25,
			cardXpShown: 0,
		});
		expect(preview?.cacheKey).toContain('qa-s0-unit');
		expect(preview?.cacheKey).toContain('rk-game-testnet');
		expect(preview?.cacheKey).toContain('alice');
		expect(preview?.settlementNote).toContain('dual-signed evidence');
	});

	it('shows calculated RUNE and Match XP on Alfa/closed-beta victory without CardXP', () => {
		const alfaRuntime = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'alfa-testnet-unit',
		});
		const preview = createP2PQaLocalRewardPreview({
			match: peerMatch,
			result: 'victory',
			runtime: alfaRuntime,
			account: 'alice',
		});

		expect(preview).toMatchObject({
			scope: 'testnet_local',
			label: 'Victory rewards',
			runeShown: TESTNET_RUNE_ECONOMY.p2pWinRune,
			matchXpShown: 25,
			cardXpShown: 0,
		});
		expect(preview?.persistence).toContain('Not written to Hive');

		expect(createP2PQaLocalRewardPreview({
			match: peerMatch,
			result: 'victory',
			runtime: closedBetaRuntime,
			account: 'alice',
		})).toMatchObject({
			scope: 'testnet_local',
			runeShown: TESTNET_RUNE_ECONOMY.p2pWinRune,
			matchXpShown: 25,
			cardXpShown: 0,
		});
	});

	it('stays disabled on mainnet economic runtime', () => {
		const mainnetRuntime = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'mainnet',
		});
		expect(createP2PQaLocalRewardPreview({
			match: peerMatch,
			result: 'victory',
			runtime: mainnetRuntime,
			account: 'alice',
		})).toBeNull();
	});

	it('does not show QA P2P rewards for non-peer matches', () => {
		const singleMatch: MatchContext = {
			...peerMatch,
			opponent: { kind: 'ai', difficulty: 'normal', deckSource: 'default' },
			reward: { matchXp: { kind: 'none' }, rune: { kind: 'none' }, ranking: { kind: 'none' } },
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
			label: 'Match result',
			runeShown: TESTNET_RUNE_ECONOMY.p2pLossRune,
			matchXpShown: 0,
			cardXpShown: 0,
		});
	});
});

describe('calculateP2PQaLocalMatchXp', () => {
	it('uses the match reward channel multiplier for wins only', () => {
		expect(calculateP2PQaLocalMatchXp({
			matchXp: { kind: 'percentage', multiplier: 2 },
			rune: { kind: 'projected', source: 'p2p_ranked' },
			ranking: { kind: 'elo' },
		}, 'victory')).toBe(50);
		expect(calculateP2PQaLocalMatchXp({
			matchXp: { kind: 'percentage', multiplier: 2 },
			rune: { kind: 'projected', source: 'p2p_ranked' },
			ranking: { kind: 'elo' },
		}, 'defeat')).toBe(0);
		expect(calculateP2PQaLocalMatchXp({
			matchXp: { kind: 'none' },
			rune: { kind: 'none' },
			ranking: { kind: 'none' },
		}, 'victory')).toBe(0);
	});
});
