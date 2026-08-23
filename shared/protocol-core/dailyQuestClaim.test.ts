import { describe, expect, it } from 'vitest';

import { applyOp, type ProtocolCoreDeps } from './apply';
import { RAGNAROK_RUNTIME_CONFIGS } from '../runtimeConfig';
import { normalizeRawOp } from './normalize';
import { TESTNET_RUNE_ECONOMY } from './runeEconomy';
import { deriveRuneSeasonId } from './runeSeasonHash';
import type {
	CampaignProgressRecord,
	CampaignSubmissionRecord,
	CardAsset,
	CompanionTransfer,
	DuatClaimRecord,
	EloRecord,
	ForgeCommitRecord,
	GenesisRecord,
	MarketListing,
	MarketOffer,
	MatchAnchorRecord,
	PackAsset,
	PackCommitRecord,
	PackSupplyRecord,
	RuneLedgerEntry,
	RuneLedgerEntryQuery,
	RuneLedgerTotalQuery,
	StateAdapter,
	SupplyRecord,
	TokenBalance,
} from './types';
import type { EitrLedgerEntry } from './eitrEconomy';

// ============================================================
// Test helpers
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;
const TEST_YMD_MS = Date.UTC(2026, 4, 14);
const TESTNET_SEASON_ID = deriveRuneSeasonId(RAGNAROK_RUNTIME_CONFIGS.testnet);

function createStateAdapter(): StateAdapter & {
	readonly runeLedger: Map<string, RuneLedgerEntry>;
	readonly slashed: Set<string>;
} {
	const campaignNonces = new Map<string, number>();
	const campaignSubmissions = new Map<string, CampaignSubmissionRecord>();
	const campaignProgress = new Map<string, CampaignProgressRecord>();
	const rewardClaims = new Set<string>();
	const runeLedger = new Map<string, RuneLedgerEntry>();
	const slashed = new Set<string>();
	let genesis: GenesisRecord | null = {
		version: '1',
		sealed: false,
		sealBlock: 0,
		packSupply: {},
		rewardSupply: {},
	};

	return {
		runeLedger,
		slashed,

		async getGenesis(): Promise<GenesisRecord | null> { return genesis; },
		async putGenesis(nextGenesis: GenesisRecord): Promise<void> { genesis = nextGenesis; },
		async getCard(): Promise<CardAsset | null> { return null; },
		async putCard(): Promise<void> { /* noop */ },
		async deleteCard(): Promise<void> { /* noop */ },
		async getCardsByOwner(): Promise<CardAsset[]> { return []; },
		async getSupply(): Promise<SupplyRecord | null> { return null; },
		async putSupply(): Promise<void> { /* noop */ },
		async advanceNonce(): Promise<boolean> { return true; },
		async getElo(account: string): Promise<EloRecord> {
			return { account, elo: 1000, wins: 0, losses: 0 };
		},
		async putElo(): Promise<void> { /* noop */ },
		async getTokenBalance(account: string, seasonId: string): Promise<TokenBalance> {
			const credits = await this.getRuneLedgerTotal({ seasonId, account, direction: 'credit' });
			const debits = await this.getRuneLedgerTotal({ seasonId, account, direction: 'debit' });
			return { account, RUNE: credits - debits };
		},
		async getRuneLedgerEntry(entryId: string): Promise<RuneLedgerEntry | null> {
			return runeLedger.get(entryId) ?? null;
		},
		async putRuneLedgerEntry(entry: RuneLedgerEntry): Promise<void> {
			runeLedger.set(entry.entryId, entry);
		},
		async getRuneLedgerEntries(query: RuneLedgerEntryQuery): Promise<RuneLedgerEntry[]> {
			const entries: RuneLedgerEntry[] = [];
			for (const entry of runeLedger.values()) {
				if (entry.seasonId !== query.seasonId) continue;
				if (query.direction !== undefined && entry.direction !== query.direction) continue;
				if (query.sourceType !== undefined && entry.sourceType !== query.sourceType) continue;
				if (query.account !== undefined && entry.account !== query.account) continue;
				if (query.sourceKeyPrefix !== undefined && !entry.sourceKey.startsWith(query.sourceKeyPrefix)) continue;
				entries.push(entry);
			}
			return entries;
		},
		async getRuneLedgerTotal(query: RuneLedgerTotalQuery): Promise<number> {
			let total = 0;
			for (const entry of runeLedger.values()) {
				if (entry.seasonId !== query.seasonId) continue;
				if (query.direction !== undefined && entry.direction !== query.direction) continue;
				if (query.sourceType !== undefined && entry.sourceType !== query.sourceType) continue;
				if (query.account !== undefined && entry.account !== query.account) continue;
				if (query.sourceKeyPrefix !== undefined && !entry.sourceKey.startsWith(query.sourceKeyPrefix)) continue;
				total += entry.amount;
			}
			return total;
		},
		async getMatchAnchor(): Promise<MatchAnchorRecord | null> { return null; },
		async putMatchAnchor(): Promise<void> { /* noop */ },
		async getPackCommit(): Promise<PackCommitRecord | null> { return null; },
		async putPackCommit(): Promise<void> { /* noop */ },
		async getUnrevealedCommitsBefore(): Promise<PackCommitRecord[]> { return []; },
		async hasRewardClaim(account: string, rewardId: string): Promise<boolean> {
			return rewardClaims.has(`${account}:${rewardId}`);
		},
		async putRewardClaim(account: string, rewardId: string): Promise<void> {
			rewardClaims.add(`${account}:${rewardId}`);
		},
		async advanceCampaignNonce(account: string, nonce: number): Promise<boolean> {
			const current = campaignNonces.get(account) ?? 0;
			if (nonce <= current) return false;
			campaignNonces.set(account, nonce);
			return true;
		},
		async getCampaignSubmission(submissionKey: string): Promise<CampaignSubmissionRecord | null> {
			return campaignSubmissions.get(submissionKey) ?? null;
		},
		async putCampaignSubmission(submission: CampaignSubmissionRecord): Promise<void> {
			campaignSubmissions.set(submission.submissionKey, submission);
		},
		async getCampaignProgress(
			account: string,
			campaignId: string,
			missionId: string,
		): Promise<CampaignProgressRecord | null> {
			return campaignProgress.get(`${account}:${campaignId}:${missionId}`) ?? null;
		},
		async putCampaignProgress(progress: CampaignProgressRecord): Promise<void> {
			campaignProgress.set(`${progress.account}:${progress.campaignId}:${progress.missionId}`, progress);
		},
		async isSlashed(account: string): Promise<boolean> { return slashed.has(account); },
		async slash(): Promise<void> { /* noop */ },
		async getQueueEntry(): Promise<{ timestamp: number } | null> { return null; },
		async putQueueEntry(): Promise<void> { /* noop */ },
		async deleteQueueEntry(): Promise<void> { /* noop */ },
		async getPack(): Promise<PackAsset | null> { return null; },
		async putPack(): Promise<void> { /* noop */ },
		async deletePack(): Promise<void> { /* noop */ },
		async getPacksByOwner(): Promise<PackAsset[]> { return []; },
		async getPackSupply(): Promise<PackSupplyRecord | null> { return null; },
		async putPackSupply(): Promise<void> { /* noop */ },
		async getCompanionTransfer(): Promise<CompanionTransfer | null> { return null; },
		setTrxSiblings(): void { /* noop */ },
		async getEitrLedgerEntry(): Promise<EitrLedgerEntry | null> { return null; },
		async putEitrLedgerEntry(): Promise<void> { /* noop */ },
		async getEitrLedgerEntries(): Promise<EitrLedgerEntry[]> { return []; },
		async getEitrLedgerTotal(): Promise<number> { return 0; },
		async getForgeCommit(): Promise<ForgeCommitRecord | null> { return null; },
		async putForgeCommit(): Promise<void> { /* noop */ },
		async getUnrevealedForgeCommitsBefore(): Promise<ForgeCommitRecord[]> { return []; },
		async getDuatClaim(): Promise<DuatClaimRecord | null> { return null; },
		async putDuatClaim(): Promise<void> { /* noop */ },
		async getListing(): Promise<MarketListing | null> { return null; },
		async getListingByNft(): Promise<MarketListing | null> { return null; },
		async putListing(): Promise<void> { /* noop */ },
		async deleteListing(): Promise<void> { /* noop */ },
		async getOffer(): Promise<MarketOffer | null> { return null; },
		async getOffersByNft(): Promise<MarketOffer[]> { return []; },
		async putOffer(): Promise<void> { /* noop */ },
	};
}

function createDeps(state: StateAdapter): ProtocolCoreDeps {
	return {
		runtime: RAGNAROK_RUNTIME_CONFIGS.testnet,
		state,
		cards: {
			getCardById: () => null,
			getCollectibleIdsInRanges: () => [],
		},
		rewards: {
			getRewardById: () => null,
		},
		campaigns: {
			getRegistryHash: () => 'ruleset-hash-v1',
			getCampaignId: () => 'war-of-pantheons',
			getMission: () => null,
		},
		sigs: {
			verifyAnchored: async () => false,
			verifyCurrentKey: async () => false,
		},
		runeExchange: {
			getQuote: () => null,
			getGlobalMinted: async () => 0,
			fulfill: async () => { /* noop */ },
		},
		duat: {
			getDuatEntitlement: async () => null,
		},
	};
}

interface DailyQuestClaimOpInput {
	readonly account?: string;
	readonly slot?: number;
	readonly questType?: string;
	readonly timestamp?: number;
	readonly blockNum?: number;
	readonly trxId?: string;
	readonly extraFields?: Record<string, unknown>;
}

function makeDailyQuestRawOp(input: DailyQuestClaimOpInput = {}) {
	const account = input.account ?? 'alice';
	const slot = input.slot ?? 0;
	const blockNum = input.blockNum ?? 20;
	const timestamp = input.timestamp ?? TEST_YMD_MS + 12 * 60 * 60 * 1000; // midday UTC
	return {
		customJsonId: 'rp_daily_quest_claim',
		json: JSON.stringify({
			slot,
			quest_type: input.questType ?? 'win_games',
			...(input.extraFields ?? {}),
		}),
		broadcaster: account,
		trxId: input.trxId ?? `trx-${account}-${slot}`,
		blockNum,
		timestamp,
		requiredPostingAuths: [account],
		requiredAuths: [],
	};
}

async function applyDailyQuestClaim(deps: ProtocolCoreDeps, input: DailyQuestClaimOpInput = {}) {
	const normalized = normalizeRawOp(makeDailyQuestRawOp(input));
	if (normalized.status !== 'ok') {
		throw new Error(`normalizeRawOp failed: ${JSON.stringify(normalized)}`);
	}
	return applyOp(normalized.op, {
		lastIrreversibleBlock: input.blockNum ?? 20,
		getBlockId: async () => null,
	}, deps);
}

describe('daily_quest_claim protocol op', () => {
	it('credits 2 RUNE for a fresh slot 0 claim', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyDailyQuestClaim(deps);

		expect(result.status).toBe('applied');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(2);
		expect(state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:daily_quest_claim:daily_quest:${TESTNET_SEASON_ID}:alice:2026-05-14:0`)).toMatchObject({
			account: 'alice',
			amount: 2,
			balanceBefore: 0,
			balanceAfter: 2,
			sourceKey: `daily_quest:${TESTNET_SEASON_ID}:alice:2026-05-14:0`,
		});
	});

	it('accumulates 6 RUNE when all 3 slots claimed on the same day', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		for (const slot of [0, 1, 2]) {
			const r = await applyDailyQuestClaim(deps, { slot });
			expect(r.status).toBe('applied');
		}

		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(6);
		expect(state.runeLedger.size).toBe(3);
	});

	it('rejects slot out of range (>= dailyQuestSlotsPerDay)', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyDailyQuestClaim(deps, { slot: TESTNET_RUNE_ECONOMY.dailyQuestSlotsPerDay });

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('slot out of range');
		expect(state.runeLedger.size).toBe(0);
	});

	it('rejects negative slot', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyDailyQuestClaim(deps, { slot: -1 });

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('slot out of range');
	});

	it('ignores a duplicate (account, day, slot)', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const first = await applyDailyQuestClaim(deps, { slot: 0, trxId: 'trx-first' });
		expect(first.status).toBe('applied');

		const duplicate = await applyDailyQuestClaim(deps, { slot: 0, trxId: 'trx-duplicate' });
		expect(duplicate.status).toBe('ignored');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(2);
		expect(state.runeLedger.size).toBe(1);
	});

	it('rejects daily quest claims from slashed accounts without mutation', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);
		state.slashed.add('alice');

		const result = await applyDailyQuestClaim(deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('slashed');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(0);
		expect(state.runeLedger.size).toBe(0);
	});

	it('accumulates across days (2 days × 3 slots = 12 RUNE)', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const day1Ms = TEST_YMD_MS + 12 * 60 * 60 * 1000;
		const day2Ms = day1Ms + DAY_MS;

		for (const slot of [0, 1, 2]) {
			await applyDailyQuestClaim(deps, { slot, timestamp: day1Ms });
		}
		for (const slot of [0, 1, 2]) {
			await applyDailyQuestClaim(deps, { slot, timestamp: day2Ms });
		}

		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(12);
		expect(state.runeLedger.size).toBe(6);
	});

	it('clamps RUNE credit to the per-account daily quest cap (20 RUNE)', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		// Pre-seed alice at 18 RUNE earned from daily quests this season.
		await state.putRuneLedgerEntry({
			entryId: `${TESTNET_SEASON_ID}:credit:daily_quest_claim:prefill-account-cap`,
			seasonId: TESTNET_SEASON_ID,
			account: 'alice',
			direction: 'credit',
			sourceType: 'daily_quest_claim',
			sourceKey: 'prefill-account-cap',
			amount: 18,
			balanceBefore: 0,
			balanceAfter: 18,
			trxId: 'prefill',
			blockNum: 1,
			timestamp: 1,
		});

		const result = await applyDailyQuestClaim(deps);

		expect(result.status).toBe('applied');
		// Only 2 RUNE remaining headroom → exactly the full slot reward fits.
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(20);

		// A second claim must clamp to 0 (no more headroom).
		const result2 = await applyDailyQuestClaim(deps, { slot: 1 });
		expect(result2.status).toBe('applied');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(20);
		expect(state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:daily_quest_claim:daily_quest:${TESTNET_SEASON_ID}:alice:2026-05-14:1`)?.amount).toBe(0);
	});

	it('clamps RUNE credit to the global daily quest pool cap', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		await state.putRuneLedgerEntry({
			entryId: `${TESTNET_SEASON_ID}:credit:daily_quest_claim:prefill-global-cap`,
			seasonId: TESTNET_SEASON_ID,
			account: 'mallory',
			direction: 'credit',
			sourceType: 'daily_quest_claim',
			sourceKey: 'prefill-global-cap',
			amount: TESTNET_RUNE_ECONOMY.dailyQuestCap - 1,
			balanceBefore: 0,
			balanceAfter: TESTNET_RUNE_ECONOMY.dailyQuestCap - 1,
			trxId: 'prefill',
			blockNum: 1,
			timestamp: 1,
		});

		const result = await applyDailyQuestClaim(deps);

		expect(result.status).toBe('applied');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(1);
		expect(await state.getRuneLedgerTotal({
			seasonId: TESTNET_SEASON_ID,
			direction: 'credit',
			sourceType: 'daily_quest_claim',
		})).toBe(TESTNET_RUNE_ECONOMY.dailyQuestCap);
	});

	it('rejects ymd_utc in the payload (no longer accepted)', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyDailyQuestClaim(deps, {
			extraFields: { ymd_utc: '2026-05-14' },
		});

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('ymd_utc');
		expect(state.runeLedger.size).toBe(0);
	});

	it('rejects a non-canonical quest_type', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyDailyQuestClaim(deps, { questType: 'free_runes' });

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('quest_type');
		expect(state.runeLedger.size).toBe(0);
	});

	it('rejects a non-integer slot', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyDailyQuestClaim(deps, {
			extraFields: { slot: 1.5 },
		});

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('slot');
		expect(state.runeLedger.size).toBe(0);
	});

	it('rejects an unexpected payload field', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyDailyQuestClaim(deps, {
			extraFields: { hack: 'injected' },
		});

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('unexpected field');
		expect(state.runeLedger.size).toBe(0);
	});

	it('rejects mismatched protocol metadata', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyDailyQuestClaim(deps, {
			extraFields: { app: 'ragnarok-cards', p: 'rk_game_testnet' },
		});

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('mismatch');
		expect(state.runeLedger.size).toBe(0);
	});

	it('rejects an invalid block timestamp without mutation', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyDailyQuestClaim(deps, { timestamp: Number.NaN });

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('timestamp');
		expect(state.runeLedger.size).toBe(0);
	});

	it('derives the UTC day from op.timestamp across the midnight boundary', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const beforeMidnight = await applyDailyQuestClaim(deps, {
			slot: 0,
			timestamp: Date.UTC(2026, 4, 14, 23, 59, 59, 999),
			trxId: 'trx-before-midnight',
		});
		expect(beforeMidnight.status).toBe('applied');
		expect(state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:daily_quest_claim:daily_quest:${TESTNET_SEASON_ID}:alice:2026-05-14:0`)).toBeDefined();

		const afterMidnight = await applyDailyQuestClaim(deps, {
			slot: 0,
			timestamp: Date.UTC(2026, 4, 15, 0, 0, 0, 0),
			trxId: 'trx-after-midnight',
		});
		expect(afterMidnight.status).toBe('applied');
		expect(state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:daily_quest_claim:daily_quest:${TESTNET_SEASON_ID}:alice:2026-05-15:0`)).toBeDefined();

		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(4);
	});

	it('daily quest pool is isolated from P2P and campaign pools', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		// Pre-seed alice at both other source caps to prove independence.
		await state.putRuneLedgerEntry({
			entryId: `${TESTNET_SEASON_ID}:credit:p2p_ranked:p2p:${TESTNET_SEASON_ID}:match-prefill`,
			seasonId: TESTNET_SEASON_ID,
			account: 'alice',
			direction: 'credit',
			sourceType: 'p2p_ranked',
			sourceKey: `p2p:${TESTNET_SEASON_ID}:match-prefill`,
			amount: 100,
			balanceBefore: 0,
			balanceAfter: 100,
			trxId: 'p2p-prefill',
			blockNum: 1,
			timestamp: 1,
		});
		await state.putRuneLedgerEntry({
			entryId: `${TESTNET_SEASON_ID}:credit:campaign_first_clear:campaign-prefill`,
			seasonId: TESTNET_SEASON_ID,
			account: 'alice',
			direction: 'credit',
			sourceType: 'campaign_first_clear',
			sourceKey: 'campaign-prefill',
			amount: 10,
			balanceBefore: 100,
			balanceAfter: 110,
			trxId: 'campaign-prefill',
			blockNum: 1,
			timestamp: 1,
		});

		const result = await applyDailyQuestClaim(deps);

		expect(result.status).toBe('applied');
		// P2P + campaign caps already maxed; daily quest pool fresh → +2 RUNE on top.
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(112);
		expect(await state.getRuneLedgerTotal({
			seasonId: TESTNET_SEASON_ID,
			direction: 'credit',
			sourceType: 'daily_quest_claim',
			account: 'alice',
		})).toBe(2);
	});

	it('binds the credit to op.broadcaster — different accounts get independent ledger entries', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		await applyDailyQuestClaim(deps, { account: 'alice' });
		await applyDailyQuestClaim(deps, { account: 'bob' });

		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(2);
		expect((await state.getTokenBalance('bob', TESTNET_SEASON_ID)).RUNE).toBe(2);

		const aliceEntry = state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:daily_quest_claim:daily_quest:${TESTNET_SEASON_ID}:alice:2026-05-14:0`);
		const bobEntry = state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:daily_quest_claim:daily_quest:${TESTNET_SEASON_ID}:bob:2026-05-14:0`);
		expect(aliceEntry?.account).toBe('alice');
		expect(bobEntry?.account).toBe('bob');
	});
});
