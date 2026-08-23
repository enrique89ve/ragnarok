import { describe, expect, it } from 'vitest';

import { applyOp, type ProtocolCoreDeps } from './apply';
import { canonicalStringify, sha256Hash } from './hash';
import { normalizeRawOp } from './normalize';
import { RAGNAROK_RUNTIME_CONFIGS } from '../runtimeConfig';
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

const CAMPAIGN_ID = 'war-of-pantheons';
const RULESET_HASH = 'ruleset-hash-v1';
const TESTNET_SEASON_ID = deriveRuneSeasonId(RAGNAROK_RUNTIME_CONFIGS.testnet);

function createStateAdapter(): StateAdapter & {
	readonly campaignProgress: Map<string, CampaignProgressRecord>;
	readonly campaignSubmissions: Map<string, CampaignSubmissionRecord>;
	readonly rewardClaims: Set<string>;
	readonly runeLedger: Map<string, RuneLedgerEntry>;
} {
	const campaignNonces = new Map<string, number>();
	const campaignSubmissions = new Map<string, CampaignSubmissionRecord>();
	const campaignProgress = new Map<string, CampaignProgressRecord>();
	const rewardClaims = new Set<string>();
	const runeLedger = new Map<string, RuneLedgerEntry>();
	let genesis: GenesisRecord | null = {
		version: '1',
		sealed: false,
		sealBlock: 0,
		packSupply: {},
		rewardSupply: {},
	};

	return {
		campaignProgress,
		campaignSubmissions,
		rewardClaims,
		runeLedger,

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
		async isSlashed(): Promise<boolean> { return false; },
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

function createDeps(state: StateAdapter, campaignId = CAMPAIGN_ID): ProtocolCoreDeps {
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
			getRegistryHash: () => RULESET_HASH,
			getCampaignId: () => campaignId,
			getMission: missionId => ({
				id: missionId,
				campaignId,
				chapterId: 'norse',
				prerequisiteIds: [],
				allowedDifficulties: ['normal', 'heroic', 'mythic'],
				starThresholds: { threeStar: 12, twoStar: 20 },
			}),
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

interface CampaignResultOpInput {
	readonly account?: string;
	readonly missionId: string;
	readonly nonce: number;
	readonly turnCount?: number;
	readonly difficulty?: 'normal' | 'heroic' | 'mythic';
	readonly localRunId?: string;
	readonly trxId?: string;
	readonly blockNum?: number;
	readonly timestamp?: number;
}

function makeCampaignResultRawOp(input: CampaignResultOpInput) {
	const account = input.account ?? 'alice';
	const blockNum = input.blockNum ?? 20;
	const timestamp = input.timestamp ?? 123_000;
	return {
		customJsonId: 'rp_campaign_result',
		json: JSON.stringify({
			v: 1,
			cid: CAMPAIGN_ID,
			m: input.missionId,
			d: input.difficulty ?? 'normal',
			n: input.nonce,
			rid: input.localRunId ?? `run-${input.missionId}-${input.nonce}`,
			lst: 1736200000000,
			rh: RULESET_HASH,
			tr: 'transcript-root',
			tc: 'ipfs://campaign-transcript',
			fh: 'final-state-hash',
			t: input.turnCount ?? 9,
		}),
		broadcaster: account,
		trxId: input.trxId ?? `trx-${input.missionId}-${input.nonce}`,
		blockNum,
		timestamp,
		requiredPostingAuths: [account],
		requiredAuths: [],
	};
}

async function applyCampaignResult(
	deps: ProtocolCoreDeps,
	input: CampaignResultOpInput,
) {
	const normalized = normalizeRawOp(makeCampaignResultRawOp(input));
	if (normalized.status !== 'ok') {
		throw new Error(`normalizeRawOp failed: ${JSON.stringify(normalized)}`);
	}
	return applyOp(normalized.op, {
		lastIrreversibleBlock: input.blockNum ?? 20,
		getBlockId: async () => null,
	}, deps);
}

describe('campaign_result protocol op', () => {
	it('marks the submission consumed, writes verified progress, and credits first-clear RUNE inline', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyCampaignResult(deps, { missionId: 'norse-1', nonce: 1 });

		expect(result.status).toBe('applied');

		const submission = state.campaignSubmissions.get('alice:war-of-pantheons:norse-1:normal:1');
		expect(submission?.status).toBe('consumed');
		expect(submission?.stars).toBe(3);
		expect(submission?.account).toBe('alice');

		const expectedSeed = await sha256Hash(canonicalStringify({
			account: 'alice',
			campaignId: CAMPAIGN_ID,
			difficulty: 'normal',
			domain: 'ragnarok:campaign:v1',
			localRunId: 'run-norse-1-1',
			localStartedAt: 1736200000000,
			missionId: 'norse-1',
			nonce: 1,
			rulesetHash: RULESET_HASH,
		}));
		expect(submission?.seed).toBe(expectedSeed);

		const progress = state.campaignProgress.get('alice:war-of-pantheons:norse-1');
		expect(progress).toMatchObject({
			account: 'alice',
			campaignId: CAMPAIGN_ID,
			missionId: 'norse-1',
			bestDifficulty: 'normal',
			bestTurns: 9,
			bestStars: 3,
			status: 'verified',
		});

		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(2);
		expect(state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:campaign_first_clear:campaign:${TESTNET_SEASON_ID}:alice:war-of-pantheons:norse-1`)).toMatchObject({
			account: 'alice',
			amount: 2,
			balanceBefore: 0,
			balanceAfter: 2,
			sourceKey: `campaign:${TESTNET_SEASON_ID}:alice:war-of-pantheons:norse-1`,
		});
	});

	it('does not double-credit RUNE on a replay (same mission, higher nonce)', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const first = await applyCampaignResult(deps, { missionId: 'norse-2', nonce: 1, turnCount: 14 });
		expect(first.status).toBe('applied');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(2);

		const replay = await applyCampaignResult(deps, {
			missionId: 'norse-2',
			nonce: 2,
			turnCount: 8,
			trxId: 'trx-norse-2-replay',
		});
		expect(replay.status).toBe('applied');

		// Personal-best stats improved, but RUNE balance is unchanged.
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(2);
		const progress = state.campaignProgress.get('alice:war-of-pantheons:norse-2');
		expect(progress?.bestTurns).toBe(8);
		expect(progress?.bestStars).toBe(3);
		expect(state.runeLedger.size).toBe(1);
	});

	it('ignores a duplicate submission with the same nonce', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const first = await applyCampaignResult(deps, { missionId: 'norse-3', nonce: 1 });
		expect(first.status).toBe('applied');

		const duplicate = await applyCampaignResult(deps, {
			missionId: 'norse-3',
			nonce: 1,
			trxId: 'trx-duplicate',
		});
		expect(duplicate.status).toBe('ignored');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(2);
		expect(state.runeLedger.size).toBe(1);
	});

	it('clamps inline RUNE credit to the per-account season cap', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		await state.putRuneLedgerEntry({
			entryId: `${TESTNET_SEASON_ID}:credit:campaign_first_clear:prefill-account-cap`,
			seasonId: TESTNET_SEASON_ID,
			account: 'alice',
			direction: 'credit',
			sourceType: 'campaign_first_clear',
			sourceKey: 'prefill-account-cap',
			amount: 9,
			balanceBefore: 0,
			balanceAfter: 9,
			trxId: 'prefill',
			blockNum: 1,
			timestamp: 1,
		});
		const result = await applyCampaignResult(deps, { missionId: 'norse-3', nonce: 1 });

		expect(result.status).toBe('applied');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(10);
		expect(state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:campaign_first_clear:campaign:${TESTNET_SEASON_ID}:alice:war-of-pantheons:norse-3`)).toMatchObject({
			amount: 1,
			balanceBefore: 9,
			balanceAfter: 10,
		});
	});

	it('clamps inline RUNE credit to the global campaign cap', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		await state.putRuneLedgerEntry({
			entryId: 'S01:credit:campaign_first_clear:prefill-global-cap',
			seasonId: TESTNET_SEASON_ID,
			account: 'mallory',
			direction: 'credit',
			sourceType: 'campaign_first_clear',
			sourceKey: 'prefill-global-cap',
			amount: 199_999,
			balanceBefore: 0,
			balanceAfter: 199_999,
			trxId: 'prefill',
			blockNum: 1,
			timestamp: 1,
		});

		const result = await applyCampaignResult(deps, { missionId: 'norse-4', nonce: 1 });

		expect(result.status).toBe('applied');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(1);
		expect(await state.getRuneLedgerTotal({
			seasonId: TESTNET_SEASON_ID,
			direction: 'credit',
			sourceType: 'campaign_first_clear',
		})).toBe(200_000);
	});

	it('credits 0 RUNE for narrative-only missions past ordinal 6', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		const result = await applyCampaignResult(deps, { missionId: 'norse-7', nonce: 1 });

		expect(result.status).toBe('applied');
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(0);
		expect(state.runeLedger.size).toBe(0);

		// Progress IS written even when reward is zero — narrative completion still
		// unlocks prerequisite gating downstream.
		expect(state.campaignProgress.get('alice:war-of-pantheons:norse-7')?.status).toBe('verified');
	});

	it('rejects a campaign result when prerequisites are not replay-visible', async () => {
		const state = createStateAdapter();
		const baseDeps = createDeps(state);
		const deps: ProtocolCoreDeps = {
			...baseDeps,
			campaigns: {
				...baseDeps.campaigns,
				getMission: missionId => ({
					id: missionId,
					campaignId: CAMPAIGN_ID,
					chapterId: 'norse',
					prerequisiteIds: ['norse-1'],
					allowedDifficulties: ['normal', 'heroic', 'mythic'],
					starThresholds: { threeStar: 12, twoStar: 20 },
				}),
			},
		};

		const result = await applyCampaignResult(deps, { missionId: 'norse-2', nonce: 1 });

		expect(result).toEqual({
			status: 'rejected',
			reason: 'campaign prerequisite not met: norse-1',
		});
		expect(state.campaignSubmissions.size).toBe(0);
		expect(state.campaignProgress.size).toBe(0);
		expect(state.runeLedger.size).toBe(0);
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(0);
	});

	it('never credits more than 10 RUNE per account across all paying missions and chapters', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		// Six paying ordinals split across norse + celtic chapters, then a tail of
		// narrative-only ordinals. The per-account cap (10 RUNE) is account-wide,
		// independent of chapter — table [2,2,2,2,1,1] applies per ordinal regardless
		// of which chapter the player chose first.
		const plan = [
			{ missionId: 'norse-1', nonce: 1 },
			{ missionId: 'norse-2', nonce: 2 },
			{ missionId: 'norse-3', nonce: 3 },
			{ missionId: 'norse-4', nonce: 4 },
			{ missionId: 'norse-5', nonce: 5 },
			{ missionId: 'norse-6', nonce: 6 },
			{ missionId: 'celtic-1', nonce: 7 },
			{ missionId: 'celtic-2', nonce: 8 },
			{ missionId: 'celtic-3', nonce: 9 },
			{ missionId: 'norse-7', nonce: 10 },
			{ missionId: 'norse-8', nonce: 11 },
		];

		for (const step of plan) {
			const r = await applyCampaignResult(deps, step);
			expect(r.status).toBe('applied');
			expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBeLessThanOrEqual(10);
		}

		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(10);
		expect(await state.getRuneLedgerTotal({
			seasonId: TESTNET_SEASON_ID,
			direction: 'credit',
			sourceType: 'campaign_first_clear',
			account: 'alice',
		})).toBe(10);
	});

	it('binds the credit to op.broadcaster — different accounts get independent ledger entries', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		await applyCampaignResult(deps, { account: 'alice', missionId: 'norse-1', nonce: 1 });
		await applyCampaignResult(deps, { account: 'bob', missionId: 'norse-1', nonce: 1 });

		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(2);
		expect((await state.getTokenBalance('bob', TESTNET_SEASON_ID)).RUNE).toBe(2);

		const aliceEntry = state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:campaign_first_clear:campaign:${TESTNET_SEASON_ID}:alice:war-of-pantheons:norse-1`);
		const bobEntry = state.runeLedger.get(`${TESTNET_SEASON_ID}:credit:campaign_first_clear:campaign:${TESTNET_SEASON_ID}:bob:war-of-pantheons:norse-1`);
		expect(aliceEntry?.account).toBe('alice');
		expect(bobEntry?.account).toBe('bob');
		expect(aliceEntry?.amount).toBe(2);
		expect(bobEntry?.amount).toBe(2);
	});

	it('campaign credit pool is isolated from the P2P ranked pool (independent caps + sources)', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);

		// Pre-seed alice at the P2P account cap (100 RUNE from p2p_ranked).
		// Campaign credit must NOT see the P2P balance as filling its own cap.
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
		const result = await applyCampaignResult(deps, { missionId: 'norse-1', nonce: 1 });

		expect(result.status).toBe('applied');
		// P2P pool already maxed; campaign pool fresh → +2 RUNE on top.
		expect((await state.getTokenBalance('alice', TESTNET_SEASON_ID)).RUNE).toBe(102);
		expect(await state.getRuneLedgerTotal({
			seasonId: TESTNET_SEASON_ID,
			direction: 'credit',
			sourceType: 'campaign_first_clear',
			account: 'alice',
		})).toBe(2);
		expect(await state.getRuneLedgerTotal({
			seasonId: TESTNET_SEASON_ID,
			direction: 'credit',
			sourceType: 'p2p_ranked',
			account: 'alice',
		})).toBe(100);
	});
});
