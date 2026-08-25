import { describe, expect, it } from 'vitest';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { getRagnarokNetworkConfig } from '../config/networkConfig';
import type { GameState } from '../types';
import type { MatchContext } from '../match/types';
import type { EloRating, LocalCardProgressionRecord } from '@/data/blockchain/replayDB';
import type { LocalSettlementRecord, LocalSettlementStore } from '@shared/protocol-core/localSettlement';
import { settleLocalP2PGameOver } from './localP2PSettlement';

const config = getRagnarokNetworkConfig();
const evidence = buildRagnarokRuntimeEvidence(config);

function state(): GameState {
	const card = {
		instanceId: 'starter-instance',
		nft_id: undefined,
		card: { id: 100, name: 'Starter', rarity: 'common', category: 'starter' },
	};
	return {
		players: {
			player: { battlefield: [card], graveyard: [], hand: [], heroId: 'hero-a' },
			opponent: { battlefield: [], graveyard: [], hand: [], heroId: 'hero-b' },
		},
		currentTurn: 'player',
		turnNumber: 7,
		gamePhase: 'game_over',
		winner: 'player',
		gameLog: [],
	} as unknown as GameState;
}

function context(): MatchContext {
	return {
		matchId: 'canonical-match-7',
		matchSeed: 'canonical-seed-7',
		opponent: { kind: 'peer', peerId: 'peer-7', myRole: 'first-mover', opponentUsername: 'bob' },
		reward: {
			matchXp: { kind: 'percentage', multiplier: 1 },
			rune: { kind: 'projected', source: 'p2p_ranked' },
			ranking: { kind: 'elo' },
		},
	};
}

function memoryStore(): LocalSettlementStore & { records: Map<string, LocalSettlementRecord> } {
	const records = new Map<string, LocalSettlementRecord>();
	return {
		records,
		commit: async record => {
			if (records.has(record.eventId)) return 'already_applied';
			records.set(record.eventId, record);
			return 'applied';
		},
	};
}

describe('local P2P game-over settlement', () => {
	it('uses canonical match identity and applies local progression once', async () => {
		expect(evidence.phasePolicy.localSettlement).toBe(true);
		const store = memoryStore();
		const elo = (account: string): EloRating => ({ account, elo: 1000, wins: 0, losses: 0, lastMatchBlock: 0 });
		const progression: LocalCardProgressionRecord[] = [];
		const deps = {
			runtimeConfig: config,
			runtimeEvidence: evidence,
			getLocalAccount: () => 'alice',
			getEloRating: async (account: string) => elo(account),
			getTokenBalance: async () => ({ RUNE: 0 }),
			getLatestCardProgressionByOwner: async () => progression,
			getTranscriptRoot: async () => 'root-7',
			clearTranscript: () => undefined,
			settlementStore: store,
			now: () => 123,
		};

		const first = await settleLocalP2PGameOver(context(), state(), deps);
		const second = await settleLocalP2PGameOver(context(), state(), deps);
		expect(first.status).toBe('applied');
		expect(second.status).toBe('already_applied');
		if (first.status !== 'applied' || second.status !== 'already_applied') return;
		expect(first.envelope.matchId).toBe('canonical-match-7');
		expect(first.envelope.result.resultHash).toBe(second.envelope.result.resultHash);
		expect(first.envelope.runeEntries).toHaveLength(1);
		expect(first.envelope.elo).toHaveLength(2);
		expect(first.envelope.cardXp[0]).toMatchObject({ ownerAccount: 'alice', xpAfter: 10 });
		expect(first.envelope.levelUps).toHaveLength(0);
		expect(JSON.stringify(first.envelope)).not.toMatch(/custom_json|action|match_result/);

		const firstCard = first.envelope.cardXp[0];
		const nextProgression: LocalCardProgressionRecord[] = [{
			updateId: firstCard.updateId, uid: firstCard.uid, ownerAccount: firstCard.ownerAccount,
			cardId: firstCard.cardId, xp: firstCard.xpAfter, level: firstCard.levelAfter,
			eventId: first.envelope.eventId, timestamp: first.envelope.timestamp, sequence: `123:${first.envelope.eventId}`,
		}];
		const next = await settleLocalP2PGameOver({ ...context(), matchId: 'canonical-match-8' }, state(), {
			...deps,
			getLatestCardProgressionByOwner: async () => nextProgression,
			now: () => 124,
		});
		expect(next.status).toBe('applied');
		if (next.status === 'applied') expect(next.envelope.cardXp[0]).toMatchObject({ xpBefore: 10, xpAfter: 20 });
	});

	it('does not create local settlement for AI context', async () => {
		const store = memoryStore();
		const result = await settleLocalP2PGameOver({
			...context(),
			opponent: { kind: 'ai', difficulty: 'easy', deckSource: 'default' },
		}, state(), {
			runtimeConfig: config,
			runtimeEvidence: evidence,
			getLocalAccount: () => 'alice',
			getEloRating: async account => ({ account, elo: 1000, wins: 0, losses: 0, lastMatchBlock: 0 }),
			getTokenBalance: async () => ({ RUNE: 0 }),
			getLatestCardProgressionByOwner: async () => [],
			getTranscriptRoot: async () => undefined,
			clearTranscript: () => undefined,
			settlementStore: store,
			now: () => 123,
		});
		expect(result).toEqual({ status: 'skipped', reason: 'not_peer' });
		expect(store.records.size).toBe(0);
	});
});
