import { describe, expect, it } from 'vitest';

import { applyOp, type ProtocolCoreDeps } from './apply';
import { canonicalStringify, sha256Hash } from './hash';
import { normalizeRawOp } from './normalize';
import type {
	CampaignProgressRecord,
	CampaignSubmissionRecord,
	CardAsset,
	CompanionTransfer,
	DuatClaimRecord,
	EloRecord,
	GenesisRecord,
	MarketListing,
	MarketOffer,
	MatchAnchorRecord,
	PackAsset,
	PackCommitRecord,
	PackSupplyRecord,
	ProtocolOp,
	RuneLedgerEntry,
	RuneLedgerEntryQuery,
	RuneLedgerTotalQuery,
	StateAdapter,
	SupplyRecord,
	TokenBalance,
} from './types';

function createStateAdapter(): StateAdapter & {
	readonly campaignProgress: Map<string, CampaignProgressRecord>;
	readonly campaignSubmissions: Map<string, CampaignSubmissionRecord>;
	readonly rewardClaims: Set<string>;
	readonly runeLedger: Map<string, RuneLedgerEntry>;
	readonly tokens: Map<string, TokenBalance>;
} {
	const campaignNonces = new Map<string, number>();
	const campaignSubmissions = new Map<string, CampaignSubmissionRecord>();
	const campaignProgress = new Map<string, CampaignProgressRecord>();
	const rewardClaims = new Set<string>();
	const runeLedger = new Map<string, RuneLedgerEntry>();
	const tokens = new Map<string, TokenBalance>();
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
		tokens,

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
		async getTokenBalance(account: string): Promise<TokenBalance> {
			return tokens.get(account) ?? { account, RUNE: 0 };
		},
		async putTokenBalance(balance: TokenBalance): Promise<void> {
			tokens.set(balance.account, balance);
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

function createDeps(state: StateAdapter, campaignId = 'war-of-pantheons'): ProtocolCoreDeps {
	const rulesetHash = 'ruleset-hash-v1';
	return {
		state,
		cards: {
			getCardById: () => null,
			getCollectibleIdsInRanges: () => [],
		},
		rewards: {
			getRewardById: () => null,
		},
		campaigns: {
			getRegistryHash: () => rulesetHash,
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
	};
}

function makeRewardClaimOp(rewardId: string, overrides: Partial<ProtocolOp> = {}): ProtocolOp {
	return {
		action: 'reward_claim',
		payload: { reward_id: rewardId },
		broadcaster: 'alice',
		trxId: 'claim-trx-1',
		blockNum: 30,
		timestamp: 130_000,
		usedActiveAuth: false,
		...overrides,
	};
}

function putVerifiedProgress(
	state: StateAdapter,
	progress: CampaignProgressRecord,
): Promise<void> {
	return state.putCampaignProgress(progress);
}

describe('campaign_result protocol op', () => {
	it('stores a queued campaign submission derived from the broadcaster identity', async () => {
		const state = createStateAdapter();
		const campaignId = 'war-of-pantheons';
		const localRunId = 'run-local-1';
		const localStartedAt = 1736200000000;
		const rulesetHash = 'ruleset-hash-v1';
		const deps = createDeps(state, campaignId);

		const normalized = normalizeRawOp({
			customJsonId: 'rp_campaign_result',
			json: JSON.stringify({
				v: 1,
				cid: campaignId,
				m: 'norse-1',
				d: 'normal',
				n: 1,
				rid: localRunId,
				lst: localStartedAt,
				rh: rulesetHash,
				tr: 'transcript-root',
				tc: 'ipfs://campaign-transcript',
				fh: 'final-state-hash',
				t: 9,
			}),
			broadcaster: 'alice',
			trxId: 'trx-campaign-1',
			blockNum: 20,
			timestamp: 123_000,
			requiredPostingAuths: ['alice'],
			requiredAuths: [],
		});

		expect(normalized.status).toBe('ok');
		if (normalized.status !== 'ok') return;

		const result = await applyOp(normalized.op, {
			lastIrreversibleBlock: 20,
			getBlockId: async () => null,
		}, deps);

		expect(result.status).toBe('applied');
		const stored = state.campaignSubmissions.get('alice:war-of-pantheons:norse-1:normal:1');
		expect(stored?.status).toBe('queued');
		expect(stored?.stars).toBe(3);
		expect(stored?.account).toBe('alice');
		expect(stored?.campaignId).toBe(campaignId);
		expect(stored?.localRunId).toBe(localRunId);
		expect(stored?.localStartedAt).toBe(localStartedAt);

		const expectedSeed = await sha256Hash(canonicalStringify({
			account: 'alice',
			campaignId,
			difficulty: 'normal',
			domain: 'ragnarok:campaign:v1',
			localRunId,
			localStartedAt,
			missionId: 'norse-1',
			nonce: 1,
			rulesetHash,
		}));
		expect(stored?.seed).toBe(expectedSeed);
	});

	it('credits first-clear campaign RUNE through verified campaign reward claims', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);
		await putVerifiedProgress(state, {
			account: 'alice',
			campaignId: 'war-of-pantheons',
			missionId: 'norse-1',
			bestDifficulty: 'normal',
			bestTurns: 9,
			bestStars: 3,
			completedAtBlock: 20,
			completedTrxId: 'campaign-result-trx',
			status: 'verified',
		});

		const result = await applyOp(makeRewardClaimOp('campaign:war-of-pantheons:norse-1'), {
			lastIrreversibleBlock: 30,
			getBlockId: async () => null,
		}, deps);

		expect(result.status).toBe('applied');
		expect((await state.getTokenBalance('alice')).RUNE).toBe(2);
		expect(await state.getRuneLedgerTotal({
			seasonId: 'S01',
			direction: 'credit',
			sourceType: 'campaign_first_clear',
			account: 'alice',
		})).toBe(2);
		expect(state.runeLedger.get('S01:credit:campaign_first_clear:campaign:S01:alice:war-of-pantheons:norse-1')).toMatchObject({
			account: 'alice',
			amount: 2,
			sourceKey: 'campaign:S01:alice:war-of-pantheons:norse-1',
		});
	});

	it('ignores duplicate campaign reward claims without double-crediting RUNE', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);
		await putVerifiedProgress(state, {
			account: 'alice',
			campaignId: 'war-of-pantheons',
			missionId: 'norse-2',
			bestDifficulty: 'normal',
			bestTurns: 10,
			bestStars: 3,
			completedAtBlock: 20,
			completedTrxId: 'campaign-result-trx',
			status: 'verified',
		});

		const firstResult = await applyOp(makeRewardClaimOp('campaign:war-of-pantheons:norse-2'), {
			lastIrreversibleBlock: 30,
			getBlockId: async () => null,
		}, deps);
		const duplicateResult = await applyOp(makeRewardClaimOp('campaign:war-of-pantheons:norse-2', {
			trxId: 'claim-trx-duplicate',
			blockNum: 31,
		}), {
			lastIrreversibleBlock: 31,
			getBlockId: async () => null,
		}, deps);

		expect(firstResult.status).toBe('applied');
		expect(duplicateResult.status).toBe('ignored');
		expect((await state.getTokenBalance('alice')).RUNE).toBe(2);
		expect(state.runeLedger.size).toBe(1);
	});

	it('clamps campaign RUNE to the account cap', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);
		await state.putRuneLedgerEntry({
			entryId: 'S01:credit:campaign_first_clear:prefill-account-cap',
			seasonId: 'S01',
			account: 'alice',
			direction: 'credit',
			sourceType: 'campaign_first_clear',
			sourceKey: 'prefill-account-cap',
			amount: 9,
			trxId: 'prefill',
			blockNum: 1,
			timestamp: 1,
		});
		await state.putTokenBalance({ account: 'alice', RUNE: 9 });
		await putVerifiedProgress(state, {
			account: 'alice',
			campaignId: 'war-of-pantheons',
			missionId: 'norse-3',
			bestDifficulty: 'normal',
			bestTurns: 10,
			bestStars: 3,
			completedAtBlock: 20,
			completedTrxId: 'campaign-result-trx',
			status: 'verified',
		});

		const result = await applyOp(makeRewardClaimOp('campaign:war-of-pantheons:norse-3'), {
			lastIrreversibleBlock: 30,
			getBlockId: async () => null,
		}, deps);

		expect(result.status).toBe('applied');
		expect((await state.getTokenBalance('alice')).RUNE).toBe(10);
		expect(await state.getRuneLedgerTotal({
			seasonId: 'S01',
			direction: 'credit',
			sourceType: 'campaign_first_clear',
			account: 'alice',
		})).toBe(10);
	});

	it('clamps campaign RUNE to the global campaign cap', async () => {
		const state = createStateAdapter();
		const deps = createDeps(state);
		await state.putRuneLedgerEntry({
			entryId: 'S01:credit:campaign_first_clear:prefill-global-cap',
			seasonId: 'S01',
			account: 'mallory',
			direction: 'credit',
			sourceType: 'campaign_first_clear',
			sourceKey: 'prefill-global-cap',
			amount: 199_999,
			trxId: 'prefill',
			blockNum: 1,
			timestamp: 1,
		});
		await putVerifiedProgress(state, {
			account: 'alice',
			campaignId: 'war-of-pantheons',
			missionId: 'norse-4',
			bestDifficulty: 'normal',
			bestTurns: 10,
			bestStars: 3,
			completedAtBlock: 20,
			completedTrxId: 'campaign-result-trx',
			status: 'verified',
		});

		const result = await applyOp(makeRewardClaimOp('campaign:war-of-pantheons:norse-4'), {
			lastIrreversibleBlock: 30,
			getBlockId: async () => null,
		}, deps);

		expect(result.status).toBe('applied');
		expect((await state.getTokenBalance('alice')).RUNE).toBe(1);
		expect(await state.getRuneLedgerTotal({
			seasonId: 'S01',
			direction: 'credit',
			sourceType: 'campaign_first_clear',
		})).toBe(200_000);
	});
});
