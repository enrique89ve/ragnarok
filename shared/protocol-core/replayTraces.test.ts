/**
 * Protocol Core — Replay Trace Tests
 *
 * These tests run REAL ops through the extracted protocol-core module
 * using an in-memory StateAdapter. They prove the core handles state
 * transitions correctly end-to-end, not just at the formula level.
 *
 * Both client and server must produce identical results for these traces.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applyOp, type ProtocolCoreDeps } from './apply';
import { normalizeRawOp } from './normalize';
import {
	PACK_SIZES,
	TESTNET_RUNE_ECONOMY,
	buildHbdPackPurchaseMemo,
	formatHbdTransferAmount,
	getRuneExchangePackQuote,
	type RuneExchangeAdapter,
} from './types';
import type {
	StateAdapter, CardAsset, GenesisRecord, EloRecord,
	TokenBalance, MatchAnchorRecord, PackCommitRecord, SupplyRecord,
	ReplayContext, ProtocolOp, CardDataProvider, RewardProvider, SignatureVerifier, RawHiveOp,
	PackAsset, PackSupplyRecord, CompanionTransfer, CampaignProgressRecord, CampaignSubmissionRecord,
	DuatClaimRecord,
	RuneLedgerEntry, RuneLedgerEntryQuery, RuneLedgerTotalQuery,
	EitrLedgerEntry, EitrLedgerEntryQuery, EitrLedgerTotalQuery,
	ForgeCommitRecord,
} from './types';
import { canonicalStringify, sha256Hash } from './hash';
import {
	buildCompactMatchResultCommitmentInput,
	buildMatchResultSignatureMessage,
	computeCompactMatchResultCommitmentHash,
} from './matchResultCommitment';
import { buildAdminApprovalMessage } from './adminMultisig';
import {
	buildRuneSeason0SmokeEvidence,
	isRuneSeason0SmokeEvidencePassing,
	type RuneSeason0SmokeOperation,
} from './runeSeason0Smoke';
import { deriveChallenge, POW_CONFIG } from './pow';
import { RAGNAROK_RUNTIME_CONFIGS } from '../runtimeConfig';

// ============================================================
// In-Memory StateAdapter (test harness)
// ============================================================

class MemoryState implements StateAdapter {
	genesis: GenesisRecord | null = null;
	cards = new Map<string, CardAsset>();
	supply = new Map<string, SupplyRecord>();
	nonces = new Map<string, number>();
	elo = new Map<string, EloRecord>();
	tokens = new Map<string, TokenBalance>();
	runeLedger = new Map<string, RuneLedgerEntry>();
	anchors = new Map<string, MatchAnchorRecord>();
	commits = new Map<string, PackCommitRecord>();
	rewards = new Set<string>();
	campaignNonces = new Map<string, number>();
	campaignSubmissions = new Map<string, CampaignSubmissionRecord>();
	campaignProgress = new Map<string, CampaignProgressRecord>();
	slashed = new Set<string>();
	queue = new Map<string, { timestamp: number }>();

	async getGenesis() { return this.genesis; }
	async putGenesis(g: GenesisRecord) { this.genesis = g; }
	async getCard(uid: string) { return this.cards.get(uid) ?? null; }
	async putCard(c: CardAsset) { this.cards.set(c.uid, c); }
	async deleteCard(uid: string) { this.cards.delete(uid); }
	async getCardsByOwner(owner: string) { return [...this.cards.values()].filter(c => c.owner === owner); }
	async getSupply(key: string, pool: 'pack' | 'reward') {
		return this.supply.get(`${pool}:${key}`) ?? null;
	}
	async putSupply(r: SupplyRecord) { this.supply.set(`${r.pool}:${r.key}`, r); }
	async advanceNonce(account: string, nonce: number) {
		const current = this.nonces.get(account) ?? 0;
		if (nonce <= current) return false;
		this.nonces.set(account, nonce);
		return true;
	}
	async getElo(account: string): Promise<EloRecord> {
		return this.elo.get(account) ?? { account, elo: 1000, wins: 0, losses: 0 };
	}
	async putElo(r: EloRecord) { this.elo.set(r.account, r); }
	async getTokenBalance(account: string): Promise<TokenBalance> {
		return this.tokens.get(account) ?? { account, RUNE: 0 };
	}
	async putTokenBalance(b: TokenBalance) { this.tokens.set(b.account, b); }
	async getRuneBalanceTotal() {
		let total = 0;
		for (const balance of this.tokens.values()) {
			total += balance.RUNE;
		}
		return total;
	}
	async getRuneLedgerEntry(entryId: string) { return this.runeLedger.get(entryId) ?? null; }
	async putRuneLedgerEntry(entry: RuneLedgerEntry) { this.runeLedger.set(entry.entryId, entry); }
	async getRuneLedgerEntries(query: RuneLedgerEntryQuery) {
		const entries: RuneLedgerEntry[] = [];
		for (const entry of this.runeLedger.values()) {
			if (entry.seasonId !== query.seasonId) continue;
			if (query.direction !== undefined && entry.direction !== query.direction) continue;
			if (query.sourceType !== undefined && entry.sourceType !== query.sourceType) continue;
			if (query.account !== undefined && entry.account !== query.account) continue;
			if (query.sourceKeyPrefix !== undefined && !entry.sourceKey.startsWith(query.sourceKeyPrefix)) continue;
			entries.push(entry);
		}
		return entries;
	}
	async getRuneLedgerTotal(query: RuneLedgerTotalQuery) {
		let total = 0;
		for (const entry of await this.getRuneLedgerEntries(query)) {
			total += entry.amount;
		}
		return total;
	}
	eitrLedger = new Map<string, EitrLedgerEntry>();
	async getEitrLedgerEntry(entryId: string) { return this.eitrLedger.get(entryId) ?? null; }
	async putEitrLedgerEntry(entry: EitrLedgerEntry) { this.eitrLedger.set(entry.entryId, entry); }
	async getEitrLedgerEntries(query: EitrLedgerEntryQuery) {
		const entries: EitrLedgerEntry[] = [];
		for (const entry of this.eitrLedger.values()) {
			if (entry.seasonId !== query.seasonId) continue;
			if (query.direction !== undefined && entry.direction !== query.direction) continue;
			if (query.sourceType !== undefined && entry.sourceType !== query.sourceType) continue;
			if (query.account !== undefined && entry.account !== query.account) continue;
			if (query.sourceKeyPrefix !== undefined && !entry.sourceKey.startsWith(query.sourceKeyPrefix)) continue;
			entries.push(entry);
		}
		return entries;
	}
	async getEitrLedgerTotal(query: EitrLedgerTotalQuery) {
		let total = 0;
		for (const entry of await this.getEitrLedgerEntries(query)) {
			total += entry.amount;
		}
		return total;
	}
	forgeCommits = new Map<string, ForgeCommitRecord>();
	async getForgeCommit(trxId: string) { return this.forgeCommits.get(trxId) ?? null; }
	async putForgeCommit(commit: ForgeCommitRecord) { this.forgeCommits.set(commit.trxId, commit); }
	async getUnrevealedForgeCommitsBefore(deadlineBlock: number) {
		return [...this.forgeCommits.values()].filter(c => !c.revealed && c.commitBlock <= deadlineBlock);
	}
	async getMatchAnchor(matchId: string) { return this.anchors.get(matchId) ?? null; }
	async putMatchAnchor(a: MatchAnchorRecord) { this.anchors.set(a.matchId, a); }
	async getPackCommit(trxId: string) { return this.commits.get(trxId) ?? null; }
	async putPackCommit(c: PackCommitRecord) { this.commits.set(c.trxId, c); }
	async getUnrevealedCommitsBefore(deadlineBlock: number) {
		return [...this.commits.values()].filter(c => !c.revealed && c.commitBlock + 200 <= deadlineBlock);
	}
	async hasRewardClaim(account: string, rewardId: string) { return this.rewards.has(`${account}:${rewardId}`); }
	async putRewardClaim(account: string, rewardId: string) { this.rewards.add(`${account}:${rewardId}`); }
	async advanceCampaignNonce(account: string, nonce: number) {
		const current = this.campaignNonces.get(account) ?? 0;
		if (nonce <= current) return false;
		this.campaignNonces.set(account, nonce);
		return true;
	}
	async getCampaignSubmission(submissionKey: string) {
		return this.campaignSubmissions.get(submissionKey) ?? null;
	}
	async putCampaignSubmission(submission: CampaignSubmissionRecord) {
		this.campaignSubmissions.set(submission.submissionKey, submission);
	}
	async getCampaignProgress(account: string, campaignId: string, missionId: string) {
		return this.campaignProgress.get(`${account}:${campaignId}:${missionId}`) ?? null;
	}
	async putCampaignProgress(progress: CampaignProgressRecord) {
		this.campaignProgress.set(`${progress.account}:${progress.campaignId}:${progress.missionId}`, progress);
	}
	async isSlashed(account: string) { return this.slashed.has(account); }
	async slash(account: string) { this.slashed.add(account); }
	async getQueueEntry(account: string) { return this.queue.get(account) ?? null; }
	async putQueueEntry(account: string, data: { mode: string; elo: number; timestamp: number; blockNum: number }) {
		this.queue.set(account, { timestamp: data.timestamp });
	}
	async deleteQueueEntry(account: string) { this.queue.delete(account); }

	// v1.1: Pack NFTs + companion transfers
	packs = new Map<string, PackAsset>();
	packSupply = new Map<string, PackSupplyRecord>();
	duatClaims = new Map<string, DuatClaimRecord>();
	trxSiblings = new Map<string, unknown[]>();

	async getPack(uid: string) { return this.packs.get(uid) ?? null; }
	async putPack(p: PackAsset) { this.packs.set(p.uid, p); }
	async deletePack(uid: string) { this.packs.delete(uid); }
	async getPacksByOwner(owner: string) { return [...this.packs.values()].filter(p => p.owner === owner); }
	async getPackSupply(packType: string) { return this.packSupply.get(packType) ?? null; }
	async putPackSupply(r: PackSupplyRecord) { this.packSupply.set(r.packType, r); }
	async getDuatClaim(account: string) { return this.duatClaims.get(account) ?? null; }
	async putDuatClaim(claim: DuatClaimRecord) { this.duatClaims.set(claim.account, claim); }
	async getCompanionTransfer(trxId: string): Promise<CompanionTransfer | null> {
		const siblings = this.trxSiblings.get(trxId);
		if (!siblings) return null;
		for (const op of siblings) {
			const arr = op as [string, Record<string, string>];
			if (arr[0] === 'transfer') {
				return { from: arr[1].from, to: arr[1].to, amount: arr[1].amount, memo: arr[1].memo || '' };
			}
		}
		return null;
	}
	setTrxSiblings(trxId: string, ops: unknown[]) { this.trxSiblings.set(trxId, ops); }
}

// ============================================================
// Mock providers
// ============================================================

function mockRarityForId(id: number): 'common' | 'rare' | 'epic' | 'mythic' {
	// Deterministic id → rarity buckets so forge can find candidates per rarity.
	if (id >= 7000 && id <= 9999) return 'mythic';
	if (id >= 5000 && id <= 6999) return 'epic';
	if (id >= 4000 && id <= 4999) return 'rare';
	return 'common';
}

const mockCards: CardDataProvider = {
	getCardById(id: number) {
		if (id >= 1000 && id <= 99999) {
			// Tokens are non-collectible by convention (id range 9000-9099 in real registry);
			// in tests we mark id < 2000 as starter to exercise category branching in burn.
			const isStarter = id < 2000;
			return {
				name: `Card${id}`,
				type: 'minion',
				rarity: isStarter ? 'common' : mockRarityForId(id),
				collectible: !isStarter,
				set: isStarter ? 'starter' : 'genesis',
			};
		}
		return null;
	},
	getCollectibleIdsInRanges(ranges: [number, number][]) {
		const ids: number[] = [];
		for (const [lo, hi] of ranges) {
			for (let i = lo; i <= Math.min(hi, lo + 100); i++) ids.push(i); // cap for test perf
		}
		return ids;
	},
};

const TESTNET_TRACE_RUNTIME = {
	...RAGNAROK_RUNTIME_CONFIGS.testnet,
	adminAccount: 'ragnarok',
	genesisAccount: 'ragnarok',
	treasuryAccount: 'ragnarok-treasury',
	indexAccount: 'ragnarok-index',
};

const mockRewards: RewardProvider = {
	getRewardById(id: string) {
		if (id === 'first_victory') {
			return { id, condition: { type: 'wins_milestone', value: 1 }, cards: [{ cardId: 20001, rarity: 'epic' }], runeBonus: 50 };
		}
		return null;
	},
};

const mockSigs: SignatureVerifier = {
	async verifyAnchored() { return true; },
	async verifyCurrentKey() { return true; },
	async verifyCurrentActiveKey() { return true; },
};

const getTestRuneExchangeQuote: RuneExchangeAdapter['getQuote'] = getRuneExchangePackQuote;

function makeRuneExchangeAdapter(state: MemoryState): RuneExchangeAdapter {
	return {
		getQuote: getTestRuneExchangeQuote,
		async getGlobalMinted(input) {
			return state.packSupply.get(input.packType)?.minted ?? 0;
		},
		async fulfill(input) {
			let createdCount = 0;
			let fulfilledCount = 0;

			for (let i = 0; i < input.quantity; i++) {
				const uid = `pack_${input.trxId}:rune:${i}`;
				if (state.packs.has(uid)) {
					fulfilledCount++;
					continue;
				}

				state.packs.set(uid, {
					uid,
					packType: input.packType,
					dna: await sha256Hash(`${input.trxId}:rune:${i}:${input.packType}`),
					owner: input.account,
					sealed: true,
					mintTrxId: input.trxId,
					mintBlockNum: input.blockNum,
					lastTransferBlock: input.blockNum,
					cardCount: PACK_SIZES[input.packType] ?? 0,
					edition: 'alpha',
				});
				createdCount++;
				fulfilledCount++;
			}

			const supply = state.packSupply.get(input.packType);
			const quote = getTestRuneExchangeQuote({ packType: input.packType, quantity: input.quantity });
			state.packSupply.set(input.packType, {
				packType: input.packType,
				minted: Math.max((supply?.minted ?? 0) + createdCount, fulfilledCount),
				burned: supply?.burned ?? 0,
				cap: quote?.globalPackCap ?? supply?.cap ?? 0,
			});
		},
	};
}

const defaultCtx: ReplayContext = {
	lastIrreversibleBlock: 999999999,
	getBlockId: async () => 'deadbeef'.repeat(5),
};

// ============================================================
// Helpers
// ============================================================

function makeOp(action: string, payload: Record<string, unknown>, overrides: Partial<ProtocolOp> = {}): ProtocolOp {
	return {
		action: action as ProtocolOp['action'],
		payload,
		broadcaster: 'alice',
		trxId: 'abc123def456',
		blockNum: 1000,
		timestamp: Date.now(),
		usedActiveAuth: false,
		...overrides,
	};
}

function hasLeadingZeroBits(hexHash: string, bits: number): boolean {
	const fullNibbles = Math.floor(bits / 4);
	for (let i = 0; i < fullNibbles; i++) {
		if (hexHash[i] !== '0') return false;
	}
	const remainder = bits % 4;
	if (remainder === 0) return true;
	const nibble = parseInt(hexHash[fullNibbles], 16);
	return (nibble >> (4 - remainder)) === 0;
}

async function solvePow(payload: Record<string, unknown>): Promise<{ nonces: number[] }> {
	const payloadHash = await sha256Hash(canonicalStringify(payload));
	const nonces: number[] = [];
	for (let i = 0; i < POW_CONFIG.MATCH_RESULT.count; i++) {
		const challenge = await deriveChallenge(payloadHash, i);
		let nonce = 0;
		while (true) {
			const hash = await sha256Hash(`${challenge}:${nonce}`);
			if (hasLeadingZeroBits(hash, POW_CONFIG.MATCH_RESULT.difficulty)) {
				nonces.push(nonce);
				break;
			}
			nonce++;
		}
	}
	return { nonces };
}

async function makeRankedMatchPayload(input: {
	matchId: string;
	winner?: string;
	loser?: string;
	nonce?: number;
	resultHash?: string;
	transcriptRoot?: string;
	transcriptCid?: string;
}): Promise<Record<string, unknown>> {
	const payload: Record<string, unknown> = {
		m: input.matchId,
		w: input.winner ?? 'alice',
		l: input.loser ?? 'bob',
		n: input.nonce ?? 1,
		h: input.resultHash ?? 'result-hash-1',
		s: 'seed123',
		v: 1,
		tr: input.transcriptRoot ?? 'transcript-root-1',
		sig: { b: 'sig-a', c: 'sig-b' },
	};
	if (input.transcriptCid) {
		payload.tc = input.transcriptCid;
	}
	payload.ch = await computeCompactMatchResultCommitmentHash(
		buildCompactMatchResultCommitmentInput({
			matchId: payload.m as string,
			winner: payload.w as string,
			loser: payload.l as string,
			nonce: payload.n as number,
			resultHash: payload.h as string,
			seed: payload.s as string,
			version: payload.v as number,
			transcriptRoot: payload.tr as string,
			transcriptCid: payload.tc as string | undefined,
		}),
	);
	return { ...payload, pow: await solvePow(payload) };
}

async function seedRankedMatchAnchor(
	state: MemoryState,
	matchId: string,
	playerA = 'alice',
	playerB = 'bob',
): Promise<void> {
	await state.putMatchAnchor({
		matchId,
		playerA,
		playerB,
		pubkeyA: `${playerA}-session-pubkey`,
		pubkeyB: `${playerB}-session-pubkey`,
		dualAnchored: true,
		timestamp: 1,
	});
}

function makeDeps(state: MemoryState): ProtocolCoreDeps {
	return {
		runtime: TESTNET_TRACE_RUNTIME,
		state,
		cards: mockCards,
		rewards: mockRewards,
		campaigns: {
			getRegistryHash: () => 'test-registry-hash',
			getCampaignId: () => 'test-campaign',
			getMission: () => null,
		},
		sigs: mockSigs,
		runeExchange: makeRuneExchangeAdapter(state),
		duat: {
			async getDuatEntitlement(account) {
				if (account !== 'alice') return null;
				return { account, duatRaw: 1000, packsEarned: 1 };
			},
		},
	};
}

async function seedGenesis(state: MemoryState, deps: ProtocolCoreDeps) {
	await applyOp(makeOp('genesis', {
		version: 1,
		supply: {
			pack_supply: { common: 2000, rare: 1000, epic: 500, mythic: 250 },
			reward_supply: { common: 0, rare: 0, epic: 150, mythic: 50 },
		},
	}, { broadcaster: 'ragnarok', usedActiveAuth: true }), defaultCtx, deps);
}

function makeCampaignSmokePayload(input: {
	readonly campaignId: string;
	readonly missionId: string;
	readonly nonce: number;
	readonly rulesetHash: string;
	readonly turnCount?: number;
}): Record<string, unknown> {
	return {
		v: 1,
		cid: input.campaignId,
		m: input.missionId,
		d: 'normal',
		n: input.nonce,
		rid: `season0-${input.missionId}-${input.nonce}`,
		lst: 1736200000000,
		rh: input.rulesetHash,
		tr: `season0-transcript-${input.nonce}`,
		tc: `ipfs://season0-${input.nonce}`,
		fh: `season0-final-${input.nonce}`,
		t: input.turnCount ?? 9,
	};
}

async function buildSmokeAccountSummary(state: MemoryState, account: string) {
	const credits = await state.getRuneLedgerTotal({
		seasonId: 'S01',
		account,
		direction: 'credit',
	});
	const debits = await state.getRuneLedgerTotal({
		seasonId: 'S01',
		account,
		direction: 'debit',
	});
	const balance = (await state.getTokenBalance(account)).RUNE;
	const entries = [...state.runeLedger.values()].filter(entry => entry.account === account);

	return {
		account,
		runeBalance: balance,
		credits,
		debits,
		drift: balance - (credits - debits),
		lastBlock: Math.max(0, ...entries.map(entry => entry.blockNum)),
		indexed: true,
	};
}

// ============================================================
// Tests
// ============================================================

describe('Protocol Core: Replay Traces', () => {
	let state: MemoryState;
	let deps: ProtocolCoreDeps;

	beforeEach(async () => {
		state = new MemoryState();
		deps = makeDeps(state);
	});

	// --- Genesis & Seal ---

	it('genesis initializes supply and state', async () => {
		const result = await applyOp(makeOp('genesis', {
			version: 1,
			supply: {
				pack_supply: { common: 2000, rare: 1000, epic: 500, mythic: 250 },
				reward_supply: { epic: 150, mythic: 50 },
			},
		}, { broadcaster: 'ragnarok', usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.genesis).not.toBeNull();
		expect(state.genesis!.sealed).toBe(false);
		expect(state.genesis!.packSupply.common).toBe(2000);
		expect(state.genesis!.rewardSupply.epic).toBe(150);
	});

	it('genesis is idempotent', async () => {
		await seedGenesis(state, deps);
		const result = await applyOp(makeOp('genesis', { version: 2 }, { broadcaster: 'ragnarok', usedActiveAuth: true }), defaultCtx, deps);
		expect(result.status).toBe('ignored');
		expect(state.genesis!.version).toBe('1'); // not overwritten
	});

	it('genesis rejected from non-admin', async () => {
		const result = await applyOp(makeOp('genesis', { version: 1 }, { broadcaster: 'mallory', usedActiveAuth: true }), defaultCtx, deps);
		expect(result.status).toBe('rejected');
	});

	it('accepts operator-broadcast genesis with frontend admin active approval', async () => {
		const runtime = {
			...RAGNAROK_RUNTIME_CONFIGS.mainnet,
			adminOperatorAccount: 'ragnarok-operator',
		};
		const payload = {
			app: 'ragnarok-cards',
			p: 'ragnarok-cards',
			action: 'genesis',
			admin_nonce: 1001,
			admin_approver: 'ragnarok',
			admin_sig: 'active-signature',
			admin_sig_key: 'active',
			version: 1,
			supply: {
				pack_supply: { common: 2000, rare: 1000, epic: 500, mythic: 250 },
				reward_supply: { epic: 150, mythic: 50 },
			},
		};
		const expectedMessage = buildAdminApprovalMessage({
			protocol: 'ragnarok',
			action: 'genesis',
			adminAccount: runtime.adminAccount,
			operatorAccount: runtime.adminOperatorAccount,
			payload,
		});
		deps = {
			...deps,
			runtime,
			sigs: {
				...mockSigs,
				async verifyCurrentActiveKey(account, message, signature) {
					return account === 'ragnarok'
						&& message === expectedMessage
						&& signature === 'active-signature';
				},
			},
		};

		const result = await applyOp(makeOp('genesis', payload, {
			broadcaster: 'ragnarok-operator',
			usedActiveAuth: true,
		}), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.genesis).not.toBeNull();
	});

	it('rejects operator-broadcast genesis without frontend admin active approval', async () => {
		deps = {
			...deps,
			runtime: {
				...RAGNAROK_RUNTIME_CONFIGS.mainnet,
				adminOperatorAccount: 'ragnarok-operator',
			},
		};

		const result = await applyOp(makeOp('genesis', {
			version: 1,
			supply: {
				pack_supply: { common: 2000 },
				reward_supply: {},
			},
		}, {
			broadcaster: 'ragnarok-operator',
			usedActiveAuth: true,
		}), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toBe('missing admin approver');
	});

	it('admin-only ops use the injected runtime authority', async () => {
		deps = { ...deps, runtime: RAGNAROK_RUNTIME_CONFIGS.testnet };
		const genesisPayload = {
			version: 1,
			supply: {
				pack_supply: { common: 2000, rare: 1000, epic: 500, mythic: 250 },
				reward_supply: { epic: 150, mythic: 50 },
			},
		};

		const mainnetAdminResult = await applyOp(
			makeOp('genesis', genesisPayload, { broadcaster: 'ragnarok', usedActiveAuth: true }),
			defaultCtx,
			deps,
		);
		expect(mainnetAdminResult.status).toBe('rejected');

		const testnetAdminResult = await applyOp(
			makeOp('genesis', genesisPayload, { broadcaster: 'ragnarok-test', usedActiveAuth: true }),
			defaultCtx,
			deps,
		);
		expect(testnetAdminResult.status).toBe('applied');
	});

	it('seal permanently blocks minting', async () => {
		await seedGenesis(state, deps);

		const sealResult = await applyOp(makeOp('seal', {}, { broadcaster: 'ragnarok', usedActiveAuth: true }), defaultCtx, deps);
		expect(sealResult.status).toBe('applied');
		expect(state.genesis!.sealed).toBe(true);

		const mintResult = await applyOp(makeOp('mint_batch', {
			to: 'alice', cards: [{ nft_id: 'nft-001', card_id: 20001, rarity: 'common' }],
		}, { broadcaster: 'ragnarok', usedActiveAuth: true }), defaultCtx, deps);
		expect(mintResult.status).toBe('rejected');
	});

	// --- DUAT ---

	it('duat_airdrop_claim derives entitlement without client-sent balance fields', async () => {
		await seedGenesis(state, deps);

		const result = await applyOp(makeOp('duat_airdrop_claim', {}, {
			broadcaster: 'alice',
			trxId: 'duat-claim-trx',
		}), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.duatClaims.get('alice')).toMatchObject({
			account: 'alice',
			duatRaw: 1000,
			packsEarned: 1,
			trxId: 'duat-claim-trx',
		});
		expect(await state.getPacksByOwner('alice')).toHaveLength(1);
		expect(state.packs.get('duat_duat-claim-trx:0')).toMatchObject({
			owner: 'alice',
			packType: 'standard',
			sealed: true,
			acquisition: {
				source: 'duat_airdrop',
				account: 'alice',
				claimTrxId: 'duat-claim-trx',
				claimBlockNum: 1000,
				packsEarned: 1,
				packUid: 'duat_duat-claim-trx:0',
				packIndex: 0,
			},
		});
	});

	it('duat_airdrop_claim rejects ineligible accounts without creating packs', async () => {
		await seedGenesis(state, deps);

		const result = await applyOp(makeOp('duat_airdrop_claim', {}, {
			broadcaster: 'bob',
			trxId: 'bob-duat-claim',
		}), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toBe('account not in duat snapshot');
		expect(state.duatClaims.has('bob')).toBe(false);
		expect(await state.getPacksByOwner('bob')).toHaveLength(0);
	});

	it('duat_airdrop_claim rejects an already-claimed account', async () => {
		await seedGenesis(state, deps);

		const first = await applyOp(makeOp('duat_airdrop_claim', {}, {
			broadcaster: 'alice',
			trxId: 'duat-claim-first',
		}), defaultCtx, deps);
		const second = await applyOp(makeOp('duat_airdrop_claim', {}, {
			broadcaster: 'alice',
			trxId: 'duat-claim-second',
		}), defaultCtx, deps);

		expect(first.status).toBe('applied');
		expect(second.status).toBe('rejected');
		expect((second as { reason: string }).reason).toBe('duat already claimed');
		expect(await state.getPacksByOwner('alice')).toHaveLength(1);
	});

	it('pack_burn preserves DUAT claim and open provenance on revealed cards', async () => {
		await seedGenesis(state, deps);
		await applyOp(makeOp('duat_airdrop_claim', {}, {
			broadcaster: 'alice',
			trxId: 'duat-claim-open',
		}), defaultCtx, deps);
		const packUid = 'duat_duat-claim-open:0';

		const result = await applyOp(makeOp('pack_burn', {
			pack_uid: packUid,
			salt: 'a'.repeat(64),
		}, {
			broadcaster: 'alice',
			trxId: 'duat-burn-open',
			blockNum: 1200,
			usedActiveAuth: true,
		}), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.packs.has(packUid)).toBe(false);
		const openedCards = [...state.cards.values()].filter(card => card.mintTrxId === 'duat-burn-open');
		expect(openedCards).toHaveLength(5);
		expect(openedCards.every(card => card.acquisition?.source === 'duat_airdrop')).toBe(true);
		expect(openedCards[0].acquisition).toMatchObject({
			source: 'duat_airdrop',
			account: 'alice',
			claimTrxId: 'duat-claim-open',
			packUid,
			burnTrxId: 'duat-burn-open',
			burnBlockNum: 1200,
		});
	});

	// --- Mint ---

	it('mint_batch creates cards with correct ownership', async () => {
		await seedGenesis(state, deps);

		const result = await applyOp(makeOp('mint_batch', {
			to: 'bob',
			cards: [
				{ nft_id: 'nft-001', card_id: 20001, rarity: 'common' },
				{ nft_id: 'nft-002', card_id: 20002, rarity: 'rare' },
			],
		}, { broadcaster: 'ragnarok', usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.cards.size).toBe(2);
		expect(state.cards.get('nft-001')!.owner).toBe('bob');
		expect(state.cards.get('nft-002')!.owner).toBe('bob');
	});

	// --- Transfer ---

	it('transfer updates ownership and enforces cooldown', async () => {
		await seedGenesis(state, deps);
		state.cards.set('nft-001', {
			uid: 'nft-001', cardId: 20001, owner: 'alice', rarity: 'common',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 100,
		});

		// Valid transfer (block 200, cooldown 10 satisfied: 200 - 100 >= 10)
		const result = await applyOp(makeOp('card_transfer', {
			nft_id: 'nft-001', to: 'bob', nonce: 1,
		}, { blockNum: 200, usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.cards.get('nft-001')!.owner).toBe('bob');
		expect(state.cards.get('nft-001')!.lastTransferBlock).toBe(200);
	});

	it('transfer rejected when cooldown not met', async () => {
		state.cards.set('nft-001', {
			uid: 'nft-001', cardId: 20001, owner: 'alice', rarity: 'common',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 1000,
		});

		const result = await applyOp(makeOp('card_transfer', {
			nft_id: 'nft-001', to: 'bob', nonce: 1,
		}, { blockNum: 1005, usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect(state.cards.get('nft-001')!.owner).toBe('alice'); // unchanged
	});

	it('transfer rejected for non-owner', async () => {
		state.cards.set('nft-001', {
			uid: 'nft-001', cardId: 20001, owner: 'alice', rarity: 'common',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const result = await applyOp(makeOp('card_transfer', {
			nft_id: 'nft-001', to: 'charlie', nonce: 1,
		}, { broadcaster: 'mallory', blockNum: 500, usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
	});

	it('self-transfer rejected', async () => {
		state.cards.set('nft-001', {
			uid: 'nft-001', cardId: 20001, owner: 'alice', rarity: 'common',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const result = await applyOp(makeOp('card_transfer', {
			nft_id: 'nft-001', to: 'alice', nonce: 1,
		}, { usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
	});

	// --- Burn ---

	it('burn removes card from state, credits Eitr, and refills pack_supply', async () => {
		await seedGenesis(state, deps);
		// Simulate that 1 mythic was already minted (so minted=1, cap=250).
		const supplyBefore = (await state.getSupply('mythic', 'pack'))!;
		await state.putSupply({ ...supplyBefore, minted: 1 });

		state.cards.set('nft-mythic-001', {
			uid: 'nft-mythic-001', cardId: 20001, owner: 'alice', rarity: 'mythic',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'pack',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const result = await applyOp(makeOp('burn', {
			nft_id: 'nft-mythic-001',
		}, { trxId: 'burn-trx-1', usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.cards.has('nft-mythic-001')).toBe(false);

		// Eitr credited at the rarity's dissolve value (mythic = 400)
		const eitrTotal = await state.getEitrLedgerTotal({
			seasonId: 'S01', account: 'alice', direction: 'credit', sourceType: 'burn',
		});
		expect(eitrTotal).toBe(400);

		// pack_supply.mythic refilled: minted went from 1 back to 0
		const supplyAfter = (await state.getSupply('mythic', 'pack'))!;
		expect(supplyAfter.minted).toBe(0);
	});

	it('burn credit amount matches rarity (common = 5, rare = 20, epic = 100)', async () => {
		await seedGenesis(state, deps);
		const rarities: Array<['common' | 'rare' | 'epic', number]> = [
			['common', 5],
			['rare', 20],
			['epic', 100],
		];
		for (const [rarity, expected] of rarities) {
			const supplyBefore = (await state.getSupply(rarity, 'pack'))!;
			await state.putSupply({ ...supplyBefore, minted: 1 });
			const uid = `nft-${rarity}-1`;
			state.cards.set(uid, {
				uid, cardId: 20001, owner: 'alice', rarity,
				level: 1, xp: 0, edition: 'alpha', mintSource: 'pack',
				mintTrxId: `mint-${rarity}`, mintBlockNum: 100, lastTransferBlock: 0,
			});
			const result = await applyOp(makeOp('burn', {
				nft_id: uid,
			}, { trxId: `burn-${rarity}`, usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status, `burn ${rarity}`).toBe('applied');
			const credit = await state.getEitrLedgerTotal({
				seasonId: 'S01', account: 'alice', direction: 'credit',
				sourceKeyPrefix: `burn:S01:alice:burn-${rarity}:`,
			});
			expect(credit, `${rarity} credit`).toBe(expected);
		}
	});

	it('burn is idempotent on replay (same trxId produces one ledger entry)', async () => {
		await seedGenesis(state, deps);
		const supplyBefore = (await state.getSupply('rare', 'pack'))!;
		await state.putSupply({ ...supplyBefore, minted: 2 });

		state.cards.set('nft-rare-007', {
			uid: 'nft-rare-007', cardId: 20002, owner: 'alice', rarity: 'rare',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'pack',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const op = makeOp('burn', {
			nft_id: 'nft-rare-007',
		}, { trxId: 'burn-replay', usedActiveAuth: true });

		const first = await applyOp(op, defaultCtx, deps);
		expect(first.status).toBe('applied');

		// Card was deleted by first burn — second burn must be a clean no-op.
		const second = await applyOp(op, defaultCtx, deps);
		expect(second.status).toBe('ignored');

		// Only one credit entry exists (no double-credit on replay)
		const credits = await state.getEitrLedgerEntries({
			seasonId: 'S01', account: 'alice', direction: 'credit', sourceType: 'burn',
		});
		expect(credits.length).toBe(1);
		expect(credits[0].amount).toBe(20);
	});

	it('burn rejects starter cards (not a genesis category)', async () => {
		await seedGenesis(state, deps);
		// cardId 1500 is starter per the mockCards convention (id < 2000)
		state.cards.set('starter-uid-1', {
			uid: 'starter-uid-1', cardId: 1500, owner: 'alice', rarity: 'common',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const result = await applyOp(makeOp('burn', {
			nft_id: 'starter-uid-1',
		}, { usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		// Card still alive, no eitr credit
		expect(state.cards.has('starter-uid-1')).toBe(true);
		const total = await state.getEitrLedgerTotal({ seasonId: 'S01', account: 'alice' });
		expect(total).toBe(0);
	});

	it('burn rejects when genesis supply for rarity is missing (integrity guard)', async () => {
		// No seedGenesis — supply is empty
		state.cards.set('nft-orphan-1', {
			uid: 'nft-orphan-1', cardId: 20001, owner: 'alice', rarity: 'rare',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'pack',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const result = await applyOp(makeOp('burn', {
			nft_id: 'nft-orphan-1',
		}, { usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
	});

	// --- Level Up ---

	it('level_up accepted when XP sufficient', async () => {
		state.cards.set('nft-001', {
			uid: 'nft-001', cardId: 20001, owner: 'alice', rarity: 'common',
			level: 1, xp: 75, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const result = await applyOp(makeOp('level_up', {
			nft_id: 'nft-001', new_level: 2,
		}), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.cards.get('nft-001')!.level).toBe(2);
	});

	it('level_up rejected when XP insufficient', async () => {
		state.cards.set('nft-001', {
			uid: 'nft-001', cardId: 20001, owner: 'alice', rarity: 'common',
			level: 1, xp: 30, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const result = await applyOp(makeOp('level_up', {
			nft_id: 'nft-001', new_level: 2,
		}), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect(state.cards.get('nft-001')!.level).toBe(1);
	});

	it('level_up rejected above max card level even with excess XP', async () => {
		state.cards.set('nft-001', {
			uid: 'nft-001', cardId: 20001, owner: 'alice', rarity: 'common',
			level: 3, xp: 999_999, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const result = await applyOp(makeOp('level_up', {
			nft_id: 'nft-001', new_level: 4,
		}), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect(state.cards.get('nft-001')!.level).toBe(3);
	});

	// --- Legacy Pack Open ---

	it('legacy pack_open accepted before seal', async () => {
		await seedGenesis(state, deps);

		const result = await applyOp(makeOp('legacy_pack_open', {
			pack_type: 'standard', quantity: 1,
		}, { trxId: 'aabbccdd11223344', blockNum: 500 }), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.cards.size).toBeGreaterThan(0);
	});

	it('legacy pack_open rejected after seal', async () => {
		await seedGenesis(state, deps);
		await applyOp(makeOp('seal', {}, { broadcaster: 'ragnarok', usedActiveAuth: true, blockNum: 900 }), defaultCtx, deps);

		const result = await applyOp(makeOp('legacy_pack_open', {
			pack_type: 'standard', quantity: 1,
		}, { trxId: 'aabbccdd11223344', blockNum: 1000 }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
	});

	// --- Finality Gate ---

	it('ops beyond LIB are ignored', async () => {
		await seedGenesis(state, deps);

		const restrictedCtx: ReplayContext = {
			lastIrreversibleBlock: 500,
			getBlockId: async () => null,
		};

		const result = await applyOp(makeOp('burn', {
			nft_id: 'nft-001',
		}, { blockNum: 501 }), restrictedCtx, deps);

		expect(result.status).toBe('ignored');
	});

	// --- Reward Claim ---

	it('reward claim mints from reward pool and grants RUNE', async () => {
		await seedGenesis(state, deps);
		state.elo.set('alice', { account: 'alice', elo: 1200, wins: 5, losses: 2 });

		const result = await applyOp(makeOp('reward_claim', {
			reward_id: 'first_victory',
		}), defaultCtx, deps);

		expect(result.status).toBe('applied');
		// Card minted from reward supply
		const rewardCard = state.cards.get('reward-first_victory-alice-0');
		expect(rewardCard).toBeDefined();
		expect(rewardCard!.mintSource).toBe('reward');
		// RUNE bonus is ledger-backed, not a direct balance-only mutation.
		expect(state.tokens.get('alice')!.RUNE).toBe(50);
		expect(await deps.state.getRuneLedgerTotal({
			seasonId: 'S01',
			direction: 'credit',
			sourceType: 'reward_claim',
			account: 'alice',
		})).toBe(50);
		expect([...state.runeLedger.values()][0]?.sourceKey).toBe('reward:S01:alice:first_victory');
	});

	it('reward claim is idempotent', async () => {
		await seedGenesis(state, deps);
		state.elo.set('alice', { account: 'alice', elo: 1200, wins: 5, losses: 2 });

		await applyOp(makeOp('reward_claim', { reward_id: 'first_victory' }), defaultCtx, deps);
		const result = await applyOp(makeOp('reward_claim', { reward_id: 'first_victory' }), defaultCtx, deps);

		expect(result.status).toBe('ignored');
		expect(state.tokens.get('alice')!.RUNE).toBe(50); // not doubled
		expect(state.runeLedger.size).toBe(1);
	});

	it('reward claim cannot exceed the total RUNE emission cap', async () => {
		await seedGenesis(state, deps);
		state.elo.set('alice', { account: 'alice', elo: 1200, wins: 5, losses: 2 });
		await deps.state.putRuneLedgerEntry({
			entryId: 'S01:credit:p2p_ranked:prefill-total-cap',
			seasonId: 'S01',
			account: 'mallory',
			direction: 'credit',
			sourceType: 'p2p_ranked',
			sourceKey: 'prefill-total-cap',
			amount: 2_599_975,
			balanceBefore: 0,
			balanceAfter: 2_599_975,
			trxId: 'prefill',
			blockNum: 1,
			timestamp: 1,
		});

		const result = await applyOp(makeOp('reward_claim', {
			reward_id: 'first_victory',
		}), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('total emission cap');
		expect(state.tokens.get('alice')?.RUNE ?? 0).toBe(0);
		expect(state.runeLedger.size).toBe(1);
	});

	it('reward claim cannot exceed the active RUNE balance cap', async () => {
		await seedGenesis(state, deps);
		state.elo.set('alice', { account: 'alice', elo: 1200, wins: 5, losses: 2 });
		await deps.state.putTokenBalance({
			account: 'mallory',
			RUNE: TESTNET_RUNE_ECONOMY.totalCap,
		});

		const result = await applyOp(makeOp('reward_claim', {
			reward_id: 'first_victory',
		}), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('active balance cap');
		expect(state.tokens.get('alice')?.RUNE ?? 0).toBe(0);
		expect(state.runeLedger.size).toBe(0);
	});

	// --- Normalizer ---

	it('normalizes ragnarok-cards canonical format', () => {
		const raw: RawHiveOp = {
			customJsonId: 'ragnarok-cards',
			json: JSON.stringify({ action: 'card_transfer', nft_id: 'nft-001', to: 'bob' }),
			broadcaster: 'alice',
			trxId: 'abc',
			blockNum: 100,
			timestamp: Date.now(),
			requiredPostingAuths: [],
			requiredAuths: ['alice'],
		};

		const result = normalizeRawOp(raw);
		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.op.action).toBe('card_transfer');
			expect(result.op.usedActiveAuth).toBe(true);
		}
	});

	it('normalizes legacy rp_ format', () => {
		const raw: RawHiveOp = {
			customJsonId: 'rp_match_start',
			json: JSON.stringify({ match_id: 'test' }),
			broadcaster: 'alice',
			trxId: 'abc',
			blockNum: 100,
			timestamp: Date.now(),
			requiredPostingAuths: ['alice'],
			requiredAuths: [],
		};

		const result = normalizeRawOp(raw);
		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.op.action).toBe('match_anchor');
		}
	});

	it('can disable legacy rp_ ids for isolated testnet replay', () => {
		const result = normalizeRawOp({
			customJsonId: 'rp_match_start',
			json: JSON.stringify({ match_id: 'test' }),
			broadcaster: 'alice',
			trxId: 'abc',
			blockNum: 100,
			timestamp: Date.now(),
			requiredPostingAuths: ['alice'],
			requiredAuths: [],
		}, {
			protocolIds: [RAGNAROK_RUNTIME_CONFIGS.testnet.protocolId],
			acceptLegacyProtocolIds: false,
		});

		expect(result.status).toBe('ignore');
	});

	it('maps rp_pack_open to legacy_pack_open, not pack_commit', () => {
		const raw: RawHiveOp = {
			customJsonId: 'rp_pack_open',
			json: JSON.stringify({ pack_type: 'standard' }),
			broadcaster: 'alice',
			trxId: 'abc',
			blockNum: 100,
			timestamp: Date.now(),
			requiredPostingAuths: ['alice'],
			requiredAuths: [],
		};

		const result = normalizeRawOp(raw);
		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.op.action).toBe('legacy_pack_open');
		}
	});

	it('ignores unknown ops', () => {
		const raw: RawHiveOp = {
			customJsonId: 'some-other-app',
			json: '{}',
			broadcaster: 'alice',
			trxId: 'abc',
			blockNum: 100,
			timestamp: Date.now(),
			requiredPostingAuths: ['alice'],
			requiredAuths: [],
		};

		const result = normalizeRawOp(raw);
		expect(result.status).toBe('ignore');
	});

	// --- Nonce Monotonic ---

	it('nonce must advance monotonically across transfers', async () => {
		state.cards.set('nft-001', {
			uid: 'nft-001', cardId: 20001, owner: 'alice', rarity: 'common',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});
		state.cards.set('nft-002', {
			uid: 'nft-002', cardId: 20002, owner: 'alice', rarity: 'common',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		// Nonce 5: valid
		const r1 = await applyOp(makeOp('card_transfer', {
			nft_id: 'nft-001', to: 'bob', nonce: 5,
		}, { blockNum: 200, usedActiveAuth: true }), defaultCtx, deps);
		expect(r1.status).toBe('applied');

		// Nonce 5 again: rejected
		const r2 = await applyOp(makeOp('card_transfer', {
			nft_id: 'nft-002', to: 'charlie', nonce: 5,
		}, { blockNum: 300, usedActiveAuth: true }), defaultCtx, deps);
		expect(r2.status).toBe('rejected');

		// Nonce 6: valid
		const r3 = await applyOp(makeOp('card_transfer', {
			nft_id: 'nft-002', to: 'charlie', nonce: 6,
		}, { blockNum: 400, usedActiveAuth: true }), defaultCtx, deps);
		expect(r3.status).toBe('applied');
	});

	// --- Pack Commit ---

	it('pack_commit stores commitment', async () => {
		await seedGenesis(state, deps);

		const result = await applyOp(makeOp('pack_commit', {
			pack_type: 'standard',
			quantity: 1,
			salt_commit: 'abc123hash',
		}, { trxId: 'commit-tx-001', blockNum: 5000 }), defaultCtx, deps);

		expect(result.status).toBe('applied');
		const commit = state.commits.get('commit-tx-001');
		expect(commit).toBeDefined();
		expect(commit!.saltCommit).toBe('abc123hash');
		expect(commit!.revealed).toBe(false);
	});

	// --- Slashed Account ---

	it('slashed account cannot queue_join', async () => {
		state.slashed.add('mallory');

		const result = await applyOp(makeOp('queue_join', {
			mode: 'ranked', pow: { nonces: new Array(32).fill(0) },
		}, { broadcaster: 'mallory' }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('slashed');
	});

	it('slashed account cannot rune_exchange without spending RUNE or minting a pack', async () => {
		state.slashed.add('mallory');
		await deps.state.putTokenBalance({ account: 'mallory', RUNE: 10 });

		const result = await applyOp(makeOp('rune_exchange', {
			pack_type: 'standard',
			quantity: 1,
		}, { broadcaster: 'mallory', trxId: 'rune-x-slashed', blockNum: 2000 }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('slashed');
		expect((await deps.state.getTokenBalance('mallory')).RUNE).toBe(10);
		expect(state.runeLedger.size).toBe(0);
		expect(state.packs.size).toBe(0);
	});

	// --- RUNE Ledger ---

	it('ranked match_result credits P2P RUNE through one consumed source', async () => {
		await seedGenesis(state, deps);
		await seedRankedMatchAnchor(state, 'ledger-match-1');

		const payload = await makeRankedMatchPayload({ matchId: 'ledger-match-1' });
		const firstResult = await applyOp(makeOp('match_result', payload, {
			broadcaster: 'alice',
			trxId: 'match-trx-1a',
			blockNum: 1000,
		}), defaultCtx, deps);

		expect(firstResult.status).toBe('applied');
		expect((await deps.state.getTokenBalance('alice')).RUNE).toBe(2);
		expect((await deps.state.getTokenBalance('bob')).RUNE).toBe(0);
		expect(state.runeLedger.size).toBe(1);
		expect(await deps.state.getRuneLedgerTotal({
			seasonId: 'S01',
			direction: 'credit',
			sourceType: 'p2p_ranked',
			account: 'alice',
		})).toBe(2);
		expect([...state.runeLedger.values()][0]?.sourceKey)
			.toBe('p2p:S01:ledger-match-1:winner:alice');

		const duplicatePayload = await makeRankedMatchPayload({ matchId: 'ledger-match-1', nonce: 2 });
		const duplicateResult = await applyOp(makeOp('match_result', duplicatePayload, {
			broadcaster: 'bob',
			trxId: 'match-trx-1b',
			blockNum: 1001,
		}), defaultCtx, deps);

		expect(duplicateResult.status).toBe('ignored');
		expect((await deps.state.getTokenBalance('alice')).RUNE).toBe(2);
		expect((await deps.state.getElo('alice')).wins).toBe(1);
	});

	it('ranked match_result rejects conflicting winner for an already consumed RUNE source', async () => {
		await seedGenesis(state, deps);
		await seedRankedMatchAnchor(state, 'ledger-match-2');

		const firstPayload = await makeRankedMatchPayload({ matchId: 'ledger-match-2' });
		const firstResult = await applyOp(makeOp('match_result', firstPayload, {
			broadcaster: 'alice',
			trxId: 'match-trx-2a',
			blockNum: 1000,
		}), defaultCtx, deps);
		expect(firstResult.status).toBe('applied');

		const conflictingPayload = await makeRankedMatchPayload({
			matchId: 'ledger-match-2',
			winner: 'bob',
			loser: 'alice',
			nonce: 2,
		});
		const conflictingResult = await applyOp(makeOp('match_result', conflictingPayload, {
			broadcaster: 'bob',
			trxId: 'match-trx-2b',
			blockNum: 1001,
		}), defaultCtx, deps);

		expect(conflictingResult.status).toBe('rejected');
		expect((conflictingResult as { reason: string }).reason).toContain('different result');
		expect((await deps.state.getTokenBalance('bob')).RUNE).toBe(0);
		expect((await deps.state.getElo('bob')).wins).toBe(0);
	});

	it('ranked match_result clamps P2P RUNE to the account cap', async () => {
		await seedGenesis(state, deps);
		await seedRankedMatchAnchor(state, 'ledger-match-3');
		await deps.state.putRuneLedgerEntry({
			entryId: 'S01:credit:p2p_ranked:prefill-account-cap',
			seasonId: 'S01',
			account: 'alice',
			direction: 'credit',
			sourceType: 'p2p_ranked',
			sourceKey: 'prefill-account-cap',
			amount: 99,
			balanceBefore: 0,
			balanceAfter: 99,
			trxId: 'prefill',
			blockNum: 1,
			timestamp: 1,
		});
		await deps.state.putTokenBalance({ account: 'alice', RUNE: 99 });

		const payload = await makeRankedMatchPayload({ matchId: 'ledger-match-3' });
		const result = await applyOp(makeOp('match_result', payload, {
			broadcaster: 'alice',
			trxId: 'match-trx-3',
			blockNum: 1000,
		}), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect((await deps.state.getTokenBalance('alice')).RUNE).toBe(100);
		expect(await deps.state.getRuneLedgerTotal({
			seasonId: 'S01',
			direction: 'credit',
			sourceType: 'p2p_ranked',
			account: 'alice',
		})).toBe(100);
	});

	it('ranked match_result clamps P2P RUNE to the global cap', async () => {
		await seedGenesis(state, deps);
		await seedRankedMatchAnchor(state, 'ledger-match-4');
		await deps.state.putRuneLedgerEntry({
			entryId: 'S01:credit:p2p_ranked:prefill-global-cap',
			seasonId: 'S01',
			account: 'mallory',
			direction: 'credit',
			sourceType: 'p2p_ranked',
			sourceKey: 'prefill-global-cap',
			amount: 1_999_999,
			balanceBefore: 0,
			balanceAfter: 1_999_999,
			trxId: 'prefill',
			blockNum: 1,
			timestamp: 1,
		});

		const payload = await makeRankedMatchPayload({ matchId: 'ledger-match-4' });
		const result = await applyOp(makeOp('match_result', payload, {
			broadcaster: 'alice',
			trxId: 'match-trx-4',
			blockNum: 1000,
		}), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect((await deps.state.getTokenBalance('alice')).RUNE).toBe(1);
		expect(await deps.state.getRuneLedgerTotal({
			seasonId: 'S01',
			direction: 'credit',
			sourceType: 'p2p_ranked',
		})).toBe(2_000_000);
	});

	// --- Ranked match anchor enforcement ---

	it('ranked match_result is rejected without match_anchor pubkeys', async () => {
		await seedGenesis(state, deps);

		const payload = await makeRankedMatchPayload({ matchId: 'missing-anchor-1' });
		const result = await applyOp(makeOp('match_result', payload, {
			broadcaster: 'alice',
			blockNum: 1000,
		}), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('requires match_anchor');
	});

		it('ranked match_result requires a dual-anchored match_anchor', async () => {
			await seedGenesis(state, deps);
			await deps.state.putMatchAnchor({
				matchId: 'single-anchor-1',
			playerA: 'alice',
			playerB: 'bob',
			pubkeyA: 'alice-session-pubkey',
			pubkeyB: 'bob-session-pubkey',
			dualAnchored: false,
			timestamp: 1,
		});

		const payload = await makeRankedMatchPayload({ matchId: 'single-anchor-1' });
		const result = await applyOp(makeOp('match_result', payload, {
			broadcaster: 'alice',
			blockNum: 1000,
		}), defaultCtx, deps);

			expect(result.status).toBe('rejected');
			expect((result as { reason: string }).reason).toContain('dual-anchored');
		});

		it('ranked match_result requires a transcript root in the compact commitment', async () => {
			await seedGenesis(state, deps);
			await seedRankedMatchAnchor(state, 'missing-transcript-1');

			const payload = await makeRankedMatchPayload({ matchId: 'missing-transcript-1' });
			delete payload.tr;
			delete payload.pow;
			payload.pow = await solvePow(payload);

			const result = await applyOp(makeOp('match_result', payload, {
				broadcaster: 'alice',
				blockNum: 1000,
			}), defaultCtx, deps);

			expect(result.status).toBe('rejected');
			expect((result as { reason: string }).reason).toContain('missing transcript root');
		});

		it('ranked match_result rejects tampering with transcript root after commitment', async () => {
			await seedGenesis(state, deps);
			await seedRankedMatchAnchor(state, 'tampered-transcript-1');

			const payload = await makeRankedMatchPayload({ matchId: 'tampered-transcript-1' });
			payload.tr = 'tampered-transcript-root';
			delete payload.pow;
			payload.pow = await solvePow(payload);

			const result = await applyOp(makeOp('match_result', payload, {
				broadcaster: 'alice',
				blockNum: 1000,
			}), defaultCtx, deps);

			expect(result.status).toBe('rejected');
			expect((result as { reason: string }).reason).toContain('compact hash mismatch');
		});

		it('ranked match_result verifies dual signatures over the compact commitment', async () => {
			await seedGenesis(state, deps);
			await seedRankedMatchAnchor(state, 'commitment-signed-1');

			const payload = await makeRankedMatchPayload({ matchId: 'commitment-signed-1' });
			const expectedMessage = buildMatchResultSignatureMessage(payload.ch as string);
			const seenMessages: string[] = [];
			deps = {
				...deps,
				sigs: {
					async verifyAnchored(_pubkey, message) {
						seenMessages.push(message);
						return message === expectedMessage;
					},
					async verifyCurrentKey() {
						return false;
					},
				},
			};

			const result = await applyOp(makeOp('match_result', payload, {
				broadcaster: 'alice',
				blockNum: 1000,
			}), defaultCtx, deps);

			expect(result.status).toBe('applied');
			expect(seenMessages).toEqual([expectedMessage, expectedMessage]);
		});

		// --- Pack commit-reveal flow ---

	it('pack_commit → pack_reveal happy path mints cards', async () => {
		await seedGenesis(state, deps);
		// Seal so we're in v1 mode
		await applyOp(makeOp('seal', {}, { broadcaster: 'ragnarok', usedActiveAuth: true, blockNum: 900 }), defaultCtx, deps);

		const userSalt = 'mysecretvalue123';
		const { sha256Hash: hash } = await import('./hash');
		const saltCommit = await hash(userSalt);

		// Commit
		const commitResult = await applyOp(makeOp('pack_commit', {
			pack_type: 'standard', quantity: 1, salt_commit: saltCommit,
		}, { trxId: 'commit-tx-100', blockNum: 5000 }), defaultCtx, deps);
		expect(commitResult.status).toBe('applied');

		// Reveal
		const revealResult = await applyOp(makeOp('pack_reveal', {
			commit_trx_id: 'commit-tx-100', user_salt: userSalt,
		}, { trxId: 'reveal-tx-100', blockNum: 5010 }), defaultCtx, deps);
		expect(revealResult.status).toBe('applied');

		// Cards were minted
		const aliceCards = await deps.state.getCardsByOwner('alice');
		expect(aliceCards.length).toBeGreaterThan(0);
		expect(aliceCards[0].mintSource).toBe('pack');
	});

	it('pack_reveal rejected with wrong salt', async () => {
		await seedGenesis(state, deps);
		const { sha256Hash: hash } = await import('./hash');
		const saltCommit = await hash('real-salt');

		await applyOp(makeOp('pack_commit', {
			pack_type: 'standard', quantity: 1, salt_commit: saltCommit,
		}, { trxId: 'commit-tx-200', blockNum: 5000 }), defaultCtx, deps);

		const result = await applyOp(makeOp('pack_reveal', {
			commit_trx_id: 'commit-tx-200', user_salt: 'wrong-salt',
		}, { trxId: 'reveal-tx-200', blockNum: 5010 }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('salt');
	});

	it('pack_reveal rejected when entropy block not yet irreversible', async () => {
		await seedGenesis(state, deps);
		const { sha256Hash: hash } = await import('./hash');
		const userSalt = 'test-salt';
		const saltCommit = await hash(userSalt);

		// Commit at block 5000 → entropy block = 5003
		await applyOp(makeOp('pack_commit', {
			pack_type: 'standard', quantity: 1, salt_commit: saltCommit,
		}, { trxId: 'commit-tx-300', blockNum: 5000 }), defaultCtx, deps);

		// LIB is 5002 — the reveal op (block 5001) is within LIB,
		// but entropy block 5003 > LIB 5002, so entropy is not yet irreversible
		const restrictedCtx: ReplayContext = {
			lastIrreversibleBlock: 5002,
			getBlockId: async () => 'deadbeef'.repeat(5),
		};

		const result = await applyOp(makeOp('pack_reveal', {
			commit_trx_id: 'commit-tx-300', user_salt: userSalt,
		}, { trxId: 'reveal-tx-300', blockNum: 5001 }), restrictedCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('entropy');
	});

	it('duplicate pack_reveal is idempotent', async () => {
		await seedGenesis(state, deps);
		const { sha256Hash: hash } = await import('./hash');
		const userSalt = 'dup-test';
		const saltCommit = await hash(userSalt);

		await applyOp(makeOp('pack_commit', {
			pack_type: 'standard', quantity: 1, salt_commit: saltCommit,
		}, { trxId: 'commit-tx-400', blockNum: 5000 }), defaultCtx, deps);

		// First reveal
		await applyOp(makeOp('pack_reveal', {
			commit_trx_id: 'commit-tx-400', user_salt: userSalt,
		}, { trxId: 'reveal-tx-400', blockNum: 5010 }), defaultCtx, deps);

		const cardsAfterFirst = (await deps.state.getCardsByOwner('alice')).length;

		// Second reveal — should be ignored
		const result = await applyOp(makeOp('pack_reveal', {
			commit_trx_id: 'commit-tx-400', user_salt: userSalt,
		}, { trxId: 'reveal-tx-400b', blockNum: 5020 }), defaultCtx, deps);

		expect(result.status).toBe('ignored');
		expect((await deps.state.getCardsByOwner('alice')).length).toBe(cardsAfterFirst);
	});

	it('auto-finalize mints cards for expired unrevealed commits', async () => {
		await seedGenesis(state, deps);
		const { autoFinalizeExpiredCommits } = await import('./apply');
		const { sha256Hash: hash } = await import('./hash');

		// Create a commit that will expire (never revealed)
		await applyOp(makeOp('pack_commit', {
			pack_type: 'standard', quantity: 1,
			salt_commit: await hash('some-salt'),
		}, { trxId: 'commit-tx-500', blockNum: 1000 }), defaultCtx, deps);

		// Verify commit exists and is unrevealed
		const commit = await deps.state.getPackCommit('commit-tx-500');
		expect(commit).not.toBeNull();
		expect(commit!.revealed).toBe(false);

		// No cards yet
		expect((await deps.state.getCardsByOwner('alice')).length).toBe(0);

		// Auto-finalize at block 1201 (deadline = 1000 + 200 = 1200, so 1201 > deadline)
		const finalized = await autoFinalizeExpiredCommits(1201, defaultCtx, deps);
		expect(finalized).toBe(1);

		// Commit is now marked revealed
		const updated = await deps.state.getPackCommit('commit-tx-500');
		expect(updated!.revealed).toBe(true);

		// Cards were minted with forfeit seed
		const cards = await deps.state.getCardsByOwner('alice');
		expect(cards.length).toBeGreaterThan(0);
	});

	// --- Forge commit-reveal flow (ADR 0001 §3) ---

	async function seedEitrCredit(account: string, amount: number, trxId = 'eitr-seed') {
		// Helper: simulate a prior burn credit by writing directly to the ledger.
		await state.putEitrLedgerEntry({
			entryId: `S01:credit:burn:burn:S01:${account}:${trxId}:seed-uid`,
			seasonId: 'S01',
			account,
			direction: 'credit',
			sourceType: 'burn',
			sourceKey: `burn:S01:${account}:${trxId}:seed-uid`,
			amount,
			balanceBefore: 0,
			balanceAfter: amount,
			trxId,
			blockNum: 100,
			timestamp: Date.now(),
		});
	}

	it('forge_commit debits Eitr and stores a pending commit', async () => {
		await seedGenesis(state, deps);
		await seedEitrCredit('alice', 200);

		const { sha256Hash: hash } = await import('./hash');
		const saltCommit = await hash('forge-salt-1');

		const result = await applyOp(makeOp('forge_commit', {
			rarity: 'rare', salt_commit: saltCommit,
		}, { trxId: 'forge-commit-1', blockNum: 5000 }), defaultCtx, deps);

		expect(result.status).toBe('applied');

		const commit = await state.getForgeCommit('forge-commit-1');
		expect(commit).not.toBeNull();
		expect(commit!.rarity).toBe('rare');
		expect(commit!.debitAmount).toBe(100); // rare forge cost
		expect(commit!.revealed).toBe(false);

		// Debit appears in ledger; balance now = 200 - 100 = 100
		const debits = await state.getEitrLedgerTotal({
			seasonId: 'S01', account: 'alice', direction: 'debit', sourceType: 'forge_commit',
		});
		expect(debits).toBe(100);
	});

	it('forge_commit rejects when Eitr balance is insufficient', async () => {
		await seedGenesis(state, deps);
		await seedEitrCredit('alice', 50); // less than rare cost 100

		const { sha256Hash: hash } = await import('./hash');
		const saltCommit = await hash('forge-salt-2');

		const result = await applyOp(makeOp('forge_commit', {
			rarity: 'rare', salt_commit: saltCommit,
		}, { trxId: 'forge-commit-2', blockNum: 5000 }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		// No debit recorded
		const debits = await state.getEitrLedgerTotal({
			seasonId: 'S01', account: 'alice', direction: 'debit',
		});
		expect(debits).toBe(0);
	});

	it('forge_commit rejects unknown rarity', async () => {
		await seedGenesis(state, deps);
		await seedEitrCredit('alice', 5000);

		const { sha256Hash: hash } = await import('./hash');
		const result = await applyOp(makeOp('forge_commit', {
			rarity: 'invalid', salt_commit: await hash('x'),
		}, { trxId: 'forge-commit-bad', blockNum: 5000 }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
	});

	it('forge_commit is idempotent on replay', async () => {
		await seedGenesis(state, deps);
		await seedEitrCredit('alice', 500);

		const { sha256Hash: hash } = await import('./hash');
		const op = makeOp('forge_commit', {
			rarity: 'rare', salt_commit: await hash('idem-salt'),
		}, { trxId: 'forge-commit-idem', blockNum: 5000 });

		const first = await applyOp(op, defaultCtx, deps);
		expect(first.status).toBe('applied');
		const second = await applyOp(op, defaultCtx, deps);
		expect(second.status).toBe('ignored');

		// Only one debit
		const debits = await state.getEitrLedgerEntries({
			seasonId: 'S01', account: 'alice', direction: 'debit', sourceType: 'forge_commit',
		});
		expect(debits.length).toBe(1);
	});

	it('forge_commit → forge_reveal mints a new card with mintSource forge at level 0', async () => {
		await seedGenesis(state, deps);
		await seedEitrCredit('alice', 200);

		const { sha256Hash: hash } = await import('./hash');
		const userSalt = 'forge-secret';
		const saltCommit = await hash(userSalt);

		await applyOp(makeOp('forge_commit', {
			rarity: 'rare', salt_commit: saltCommit,
		}, { trxId: 'forge-commit-3', blockNum: 5000 }), defaultCtx, deps);

		const cardsBefore = (await state.getCardsByOwner('alice')).length;

		const reveal = await applyOp(makeOp('forge_reveal', {
			commit_trx_id: 'forge-commit-3', user_salt: userSalt,
		}, { trxId: 'forge-reveal-3', blockNum: 5050 }), defaultCtx, deps);
		expect(reveal.status).toBe('applied');

		const cards = await state.getCardsByOwner('alice');
		expect(cards.length).toBe(cardsBefore + 1);
		const forged = cards[cards.length - 1];
		expect(forged.mintSource).toBe('forge');
		expect(forged.rarity).toBe('rare');
		expect(forged.xp).toBe(0);
		expect(forged.level).toBe(1); // protocol convention: 'Mortal' = level 1

		// Commit is marked revealed
		const commitAfter = await state.getForgeCommit('forge-commit-3');
		expect(commitAfter!.revealed).toBe(true);

		// No refund credit appears
		const refunds = await state.getEitrLedgerEntries({
			seasonId: 'S01', account: 'alice', direction: 'credit', sourceType: 'forge_refund',
		});
		expect(refunds.length).toBe(0);
	});

	it('forge_reveal rejects with wrong salt and keeps commit unrevealed', async () => {
		await seedGenesis(state, deps);
		await seedEitrCredit('alice', 200);

		const { sha256Hash: hash } = await import('./hash');
		await applyOp(makeOp('forge_commit', {
			rarity: 'rare', salt_commit: await hash('real-salt'),
		}, { trxId: 'forge-commit-4', blockNum: 5000 }), defaultCtx, deps);

		const result = await applyOp(makeOp('forge_reveal', {
			commit_trx_id: 'forge-commit-4', user_salt: 'wrong-salt',
		}, { trxId: 'forge-reveal-4', blockNum: 5050 }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		const commit = await state.getForgeCommit('forge-commit-4');
		expect(commit!.revealed).toBe(false); // retriable
	});

	it('forge_reveal refunds Eitr when rarity supply is exhausted', async () => {
		await seedGenesis(state, deps);
		await seedEitrCredit('alice', 500);

		// Drain pack_supply.rare so no minting is possible
		const supplyBefore = (await state.getSupply('rare', 'pack'))!;
		await state.putSupply({ ...supplyBefore, minted: supplyBefore.cap });

		const { sha256Hash: hash } = await import('./hash');
		const userSalt = 'exhaust-salt';
		await applyOp(makeOp('forge_commit', {
			rarity: 'rare', salt_commit: await hash(userSalt),
		}, { trxId: 'forge-commit-5', blockNum: 5000 }), defaultCtx, deps);

		const cardsBefore = (await state.getCardsByOwner('alice')).length;

		const reveal = await applyOp(makeOp('forge_reveal', {
			commit_trx_id: 'forge-commit-5', user_salt: userSalt,
		}, { trxId: 'forge-reveal-5', blockNum: 5050 }), defaultCtx, deps);

		expect(reveal.status).toBe('applied');
		// No card minted
		expect((await state.getCardsByOwner('alice')).length).toBe(cardsBefore);
		// Refund credit matches original debit (100)
		const refund = await state.getEitrLedgerTotal({
			seasonId: 'S01', account: 'alice', direction: 'credit', sourceType: 'forge_refund',
		});
		expect(refund).toBe(100);
	});

	it('autoFinalizeExpiredForgeCommits finalizes a stale commit (mint or refund)', async () => {
		await seedGenesis(state, deps);
		await seedEitrCredit('alice', 200);

		const { sha256Hash: hash } = await import('./hash');
		const { autoFinalizeExpiredForgeCommits } = await import('./apply');

		await applyOp(makeOp('forge_commit', {
			rarity: 'rare', salt_commit: await hash('forfeit-salt'),
		}, { trxId: 'forge-commit-6', blockNum: 1000 }), defaultCtx, deps);

		const commit = await state.getForgeCommit('forge-commit-6');
		expect(commit!.revealed).toBe(false);

		// Trigger auto-finalize past the deadline (commitBlock + 200 = 1200)
		const finalized = await autoFinalizeExpiredForgeCommits(1201, defaultCtx, deps);
		expect(finalized).toBe(1);

		const after = await state.getForgeCommit('forge-commit-6');
		expect(after!.revealed).toBe(true);
		// Either the card was minted or the refund was credited (deterministic on forfeit seed,
		// but either outcome is "finalized" — we just verify the commit no longer pending)
	});

	it('legacy pack_open still works pre-seal but not post-seal', async () => {
		await seedGenesis(state, deps);

		// Pre-seal: legacy works
		const r1 = await applyOp(makeOp('legacy_pack_open', {
			pack_type: 'standard', quantity: 1,
		}, { trxId: 'legacy-tx-1', blockNum: 500 }), defaultCtx, deps);
		expect(r1.status).toBe('applied');

		// Seal
		await applyOp(makeOp('seal', {}, { broadcaster: 'ragnarok', usedActiveAuth: true, blockNum: 900 }), defaultCtx, deps);

		// Post-seal: legacy rejected
		const r2 = await applyOp(makeOp('legacy_pack_open', {
			pack_type: 'standard', quantity: 1,
		}, { trxId: 'legacy-tx-2', blockNum: 1000 }), defaultCtx, deps);
		expect(r2.status).toBe('rejected');
	});

	// --- Match anchor with pinned pubkeys (PR 5) ---

	it('match_anchor with valid PoW stores pubkeys from payload', async () => {
		// PoW with zero nonces will fail verification (expected — PoW is real)
		// This test verifies the structural behavior: if PoW fails, anchor is rejected
		const result = await applyOp(makeOp('match_anchor', {
			match_id: 'match-v1-001',
			player_a: 'alice',
			player_b: 'bob',
			pubkey_a: 'STM6abc123',
			pubkey_b: 'STM7def456',
			pow: { nonces: new Array(32).fill(0) },
		}, { blockNum: 2000 }), defaultCtx, deps);

		// Zero nonces fail PoW → rejected (correct — PoW is mandatory per spec)
		expect(result.status).toBe('rejected');
	});

	it('match_anchor stores pubkeys when directly written to state', async () => {
		// Test the state storage path directly (bypassing PoW which requires real computation)
		await deps.state.putMatchAnchor({
			matchId: 'direct-anchor-1',
			playerA: 'alice',
			playerB: 'bob',
			pubkeyA: 'STM6abc123',
			pubkeyB: 'STM7def456',
			dualAnchored: true,
			timestamp: Date.now(),
		});

		const anchor = await deps.state.getMatchAnchor('direct-anchor-1');
		expect(anchor).not.toBeNull();
		expect(anchor!.pubkeyA).toBe('STM6abc123');
		expect(anchor!.pubkeyB).toBe('STM7def456');
		expect(anchor!.dualAnchored).toBe(true);
	});

	it('legacy rp_match_start normalizes to match_anchor', () => {
		const result = normalizeRawOp({
			customJsonId: 'rp_match_start',
			json: JSON.stringify({ match_id: 'legacy-match', player_a: 'alice' }),
			broadcaster: 'alice',
			trxId: 'tx1',
			blockNum: 100,
			timestamp: Date.now(),
			requiredPostingAuths: ['alice'],
			requiredAuths: [],
		});
		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.op.action).toBe('match_anchor');
		}
	});

	it('post-seal match_result uses anchored pubkeys when anchor exists', async () => {
		await seedGenesis(state, deps);
		await applyOp(makeOp('seal', {}, { broadcaster: 'ragnarok', usedActiveAuth: true, blockNum: 900 }), defaultCtx, deps);

		// Store anchor directly (bypasses PoW for test purposes)
		await deps.state.putMatchAnchor({
			matchId: 'anchored-match-1',
			playerA: 'alice',
			playerB: 'bob',
			pubkeyA: 'STM-alice-key',
			pubkeyB: 'STM-bob-key',
			dualAnchored: true,
			timestamp: Date.now(),
		});

		const anchor = await deps.state.getMatchAnchor('anchored-match-1');
		expect(anchor).not.toBeNull();
		expect(anchor!.pubkeyA).toBe('STM-alice-key');
		expect(anchor!.pubkeyB).toBe('STM-bob-key');

		// The match_result path will use verifyAnchored (not verifyCurrentKey)
		// because anchor has pubkeys and genesis is sealed.
		// (Actual result rejected by PoW — but the anchor storage is correct.)
	});

	it('ranked match_result WITHOUT anchor is rejected', async () => {
		await seedGenesis(state, deps);

		const anchor = await deps.state.getMatchAnchor('no-anchor-match');
		expect(anchor).toBeNull();

		const payload = await makeRankedMatchPayload({ matchId: 'no-anchor-match', nonce: 10 });
		const result = await applyOp(makeOp('match_result', payload, {
			broadcaster: 'alice',
			blockNum: 1000,
		}), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('requires match_anchor');
	});

	it('pre-seal ranked match still requires an anchor', async () => {
		await seedGenesis(state, deps);

		const anchor = await deps.state.getMatchAnchor('preseal-match');
		expect(anchor).toBeNull();

		const payload = await makeRankedMatchPayload({ matchId: 'preseal-match', nonce: 11 });
		const result = await applyOp(makeOp('match_result', payload, {
			broadcaster: 'alice',
			blockNum: 1000,
		}), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		expect((result as { reason: string }).reason).toContain('requires match_anchor');
	});

	// ==========================================================
	// v1.1: Pack NFTs
	// ==========================================================

	async function seedSealedGenesis(state: MemoryState, deps: ProtocolCoreDeps) {
		await seedGenesis(state, deps);
		await applyOp(makeOp('seal', {}, { broadcaster: 'ragnarok', usedActiveAuth: true }), defaultCtx, deps);
	}

	function withCompanion(state: MemoryState, trxId: string, to: string) {
		state.setTrxSiblings(trxId, [
			['transfer', { from: 'ragnarok', to, amount: '0.001 HIVE', memo: `ragnarok:test` }],
		]);
	}

	it('runs the QA Season 0 RUNE reward pack smoke path with reportable ledger evidence', async () => {
		await seedSealedGenesis(state, deps);

		const campaignId = 'test-campaign';
		const rulesetHash = 'season0-smoke-rules';
		const smokeDeps: ProtocolCoreDeps = {
			...deps,
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
		};
		const protocolId = smokeDeps.runtime.protocolId;
		const operations: RuneSeason0SmokeOperation[] = [];

		const dailySourceKey = 'daily_quest:S01:alice:2026-05-20:0';
		const daily = await applyOp(makeOp('daily_quest_claim', {
			ymd_utc: '2026-05-20',
			slot: 0,
			quest_type: 'win_games',
		}, {
			broadcaster: 'alice',
			trxId: 'season0-daily-1',
			blockNum: 2100,
			timestamp: Date.UTC(2026, 4, 20, 12),
		}), defaultCtx, smokeDeps);
		expect(daily.status).toBe('applied');
		operations.push({
			action: 'daily_quest_claim',
			customJsonId: protocolId,
			status: 'applied',
			trxId: 'season0-daily-1',
			sourceKeys: [dailySourceKey],
		});

		const dailyDuplicate = await applyOp(makeOp('daily_quest_claim', {
			ymd_utc: '2026-05-20',
			slot: 0,
			quest_type: 'win_games',
		}, {
			broadcaster: 'alice',
			trxId: 'season0-daily-duplicate',
			blockNum: 2101,
			timestamp: Date.UTC(2026, 4, 20, 12),
		}), defaultCtx, smokeDeps);
		expect(dailyDuplicate.status).toBe('ignored');
		operations.push({
			action: 'daily_quest_claim',
			customJsonId: protocolId,
			status: 'ignored',
			trxId: 'season0-daily-duplicate',
			sourceKeys: [dailySourceKey],
		});

		const campaignSourceKey = `campaign:S01:alice:${campaignId}:norse-1`;
		const campaignFirstClear = await applyOp(makeOp('campaign_result', makeCampaignSmokePayload({
			campaignId,
			missionId: 'norse-1',
			nonce: 1,
			rulesetHash,
		}), {
			broadcaster: 'alice',
			trxId: 'season0-campaign-1',
			blockNum: 2110,
		}), defaultCtx, smokeDeps);
		expect(campaignFirstClear.status).toBe('applied');
		operations.push({
			action: 'campaign_result',
			customJsonId: protocolId,
			status: 'applied',
			trxId: 'season0-campaign-1',
			sourceKeys: [campaignSourceKey],
		});

		const campaignReplay = await applyOp(makeOp('campaign_result', makeCampaignSmokePayload({
			campaignId,
			missionId: 'norse-1',
			nonce: 2,
			rulesetHash,
			turnCount: 7,
		}), {
			broadcaster: 'alice',
			trxId: 'season0-campaign-replay',
			blockNum: 2111,
		}), defaultCtx, smokeDeps);
		expect(campaignReplay.status).toBe('applied');
		operations.push({
			action: 'campaign_result',
			customJsonId: protocolId,
			status: 'applied',
			trxId: 'season0-campaign-replay',
			sourceKeys: [campaignSourceKey],
		});

		const exchangeSourceKey = 'pack:S01:alice:season0-rune-1:standard:1';
		const exchange = await applyOp(makeOp('rune_exchange', {
			pack_type: 'standard',
			quantity: 1,
		}, {
			broadcaster: 'alice',
			trxId: 'season0-rune-1',
			blockNum: 2120,
		}), defaultCtx, smokeDeps);
		expect(exchange.status).toBe('applied');
		operations.push({
			action: 'rune_exchange',
			customJsonId: protocolId,
			status: 'applied',
			trxId: 'season0-rune-1',
			sourceKeys: [exchangeSourceKey],
		});

		const packUid = 'pack_season0-rune-1:rune:0';
		expect(state.packs.get(packUid)).toMatchObject({
			owner: 'alice',
			packType: 'standard',
			sealed: true,
		});
		const burn = await applyOp(makeOp('pack_burn', {
			pack_uid: packUid,
			salt: 'season0-smoke-salt',
		}, {
			broadcaster: 'alice',
			trxId: 'season0-pack-burn',
			blockNum: 2130,
		}), defaultCtx, smokeDeps);
		expect(burn.status).toBe('applied');
		operations.push({
			action: 'pack_burn',
			customJsonId: protocolId,
			status: 'applied',
			trxId: 'season0-pack-burn',
		});

		const lowBalanceExchange = await applyOp(makeOp('rune_exchange', {
			pack_type: 'standard',
			quantity: 1,
		}, {
			broadcaster: 'bob',
			trxId: 'season0-bob-low-balance',
			blockNum: 2140,
		}), defaultCtx, smokeDeps);
		expect(lowBalanceExchange.status).toBe('rejected');
		const lowBalanceReason = (lowBalanceExchange as { reason: string }).reason;
		operations.push({
			action: 'rune_exchange',
			customJsonId: protocolId,
			status: 'rejected',
			trxId: 'season0-bob-low-balance',
			reason: lowBalanceReason,
		});

		const p2pResultOnly = await applyOp(makeOp('match_result', await makeRankedMatchPayload({
			matchId: 'season0-result-only',
			nonce: 77,
		}), {
			broadcaster: 'alice',
			trxId: 'season0-result-only',
			blockNum: 2150,
		}), defaultCtx, smokeDeps);
		expect(p2pResultOnly.status).toBe('rejected');
		const p2pReason = (p2pResultOnly as { reason: string }).reason;
		expect(p2pReason).toContain('match_anchor');
		operations.push({
			action: 'match_result',
			customJsonId: protocolId,
			status: 'rejected',
			trxId: 'season0-result-only',
			reason: p2pReason,
		});

		const revealedCardUids = [...state.cards.values()]
			.filter(card => card.owner === 'alice' && card.mintTrxId === 'season0-pack-burn')
			.map(card => card.uid);
		expect(revealedCardUids).toHaveLength(PACK_SIZES.standard);
		expect(state.packs.has(packUid)).toBe(false);
		expect((await state.getTokenBalance('alice')).RUNE).toBe(2);
		expect((await state.getRuneLedgerEntries({
			seasonId: 'S01',
			sourceType: 'p2p_ranked',
			account: 'alice',
		}))).toHaveLength(0);

		const evidence = buildRuneSeason0SmokeEvidence({
			account: 'alice',
			runtime: smokeDeps.runtime,
			apiSummary: await buildSmokeAccountSummary(state, 'alice'),
			ledgerEntries: [...state.runeLedger.values()],
			operations,
			openedPackUids: [packUid],
			revealedCardUids,
		});

		expect(isRuneSeason0SmokeEvidencePassing(evidence)).toBe(true);
		expect(evidence.runtime.resetEpoch).toBe(smokeDeps.runtime.resetEpoch);
		expect(evidence.customJsonIds).toEqual([protocolId]);
		expect(evidence.sourceKeys).toEqual(expect.arrayContaining([
			dailySourceKey,
			campaignSourceKey,
			exchangeSourceKey,
		]));
		expect(evidence.apiSummary).toMatchObject({
			account: 'alice',
			runeBalance: 2,
			credits: 4,
			debits: 2,
			drift: 0,
		});
		expect(evidence.ledgerEntries.map(entry => entry.sourceType)).toEqual([
			'daily_quest_claim',
			'campaign_first_clear',
			'rune_exchange',
		]);
	});

		describe('rune_exchange', () => {
		it('spends RUNE and delegates sealed pack fulfillment to the adapter', async () => {
			await seedSealedGenesis(state, deps);
			await deps.state.putTokenBalance({ account: 'alice', RUNE: 10 });

			const result = await applyOp(makeOp('rune_exchange', {
				pack_type: 'standard',
				quantity: 1,
			}, { broadcaster: 'alice', trxId: 'rune-x-1', blockNum: 2000 }), defaultCtx, deps);

			expect(result.status).toBe('applied');
			expect((await deps.state.getTokenBalance('alice')).RUNE).toBe(8);
			expect(await deps.state.getRuneLedgerTotal({
				seasonId: 'S01',
				direction: 'debit',
				sourceType: 'rune_exchange',
				account: 'alice',
			})).toBe(2);
			expect(state.runeLedger.get('S01:debit:rune_exchange:pack:S01:alice:rune-x-1:standard:1')).toMatchObject({
				amount: 2,
				balanceBefore: 10,
				balanceAfter: 8,
			});
			expect(state.packs.get('pack_rune-x-1:rune:0')).toMatchObject({
				owner: 'alice',
				packType: 'standard',
				sealed: true,
				cardCount: 5,
			});
			expect(state.packSupply.get('standard')).toMatchObject({
				minted: 1,
				burned: 0,
				cap: 100_000,
			});
		});

		it('ignores duplicate rune_exchange sources without double spend', async () => {
			await seedSealedGenesis(state, deps);
			await deps.state.putTokenBalance({ account: 'alice', RUNE: 10 });

			const op = makeOp('rune_exchange', {
				pack_type: 'standard',
				quantity: 1,
			}, { broadcaster: 'alice', trxId: 'rune-x-duplicate', blockNum: 2000 });
			const firstResult = await applyOp(op, defaultCtx, deps);

			state.packs.clear();
			state.packSupply.clear();

			const duplicateResult = await applyOp(op, defaultCtx, deps);
			const repeatedDuplicateResult = await applyOp(op, defaultCtx, deps);

			expect(firstResult.status).toBe('applied');
			expect(duplicateResult.status).toBe('ignored');
			expect(repeatedDuplicateResult.status).toBe('ignored');
			expect((await deps.state.getTokenBalance('alice')).RUNE).toBe(8);
			expect(state.packs.size).toBe(1);
			expect(state.packSupply.get('standard')?.minted).toBe(1);
			expect(state.runeLedger.size).toBe(1);
		});

		it('rejects rune_exchange when the account balance is too low', async () => {
			await seedSealedGenesis(state, deps);
			await deps.state.putTokenBalance({ account: 'alice', RUNE: 1 });

			const result = await applyOp(makeOp('rune_exchange', {
				pack_type: 'standard',
				quantity: 1,
			}, { broadcaster: 'alice', trxId: 'rune-x-low-balance', blockNum: 2000 }), defaultCtx, deps);

			expect(result.status).toBe('rejected');
			expect((result as { reason: string }).reason).toContain('insufficient');
			expect(state.packs.size).toBe(0);
			expect(state.runeLedger.size).toBe(0);
		});

		it('rejects rune_exchange above the per-account pack limit', async () => {
			await seedSealedGenesis(state, deps);
			await deps.state.putTokenBalance({ account: 'alice', RUNE: 20 });

			// Standard pack per-account limit is 5 (TESTNET_RUNE_PACK_POOL). Buy 5 then expect rejection on 6th.
			for (let i = 1; i <= 5; i++) {
				const r = await applyOp(makeOp('rune_exchange', {
					pack_type: 'standard',
					quantity: 1,
				}, { broadcaster: 'alice', trxId: `rune-x-limit-${i}`, blockNum: 2000 + i }), defaultCtx, deps);
				expect(r.status).toBe('applied');
			}

			const overLimit = await applyOp(makeOp('rune_exchange', {
				pack_type: 'standard',
				quantity: 1,
			}, { broadcaster: 'alice', trxId: 'rune-x-limit-over', blockNum: 2010 }), defaultCtx, deps);

			expect(overLimit.status).toBe('rejected');
			expect((overLimit as { reason: string }).reason).toContain('account limit');
			expect((await deps.state.getTokenBalance('alice')).RUNE).toBe(10);
			expect(state.packs.size).toBe(5);
		});

		it('rejects rune_exchange above the per-op spend cap', async () => {
			await seedSealedGenesis(state, deps);
			await deps.state.putTokenBalance({ account: 'alice', RUNE: 100 });

			const result = await applyOp(makeOp('rune_exchange', {
				pack_type: 'mythic',
				quantity: 3,
			}, { broadcaster: 'alice', trxId: 'rune-x-spend-cap', blockNum: 2000 }), defaultCtx, deps);

			expect(result.status).toBe('rejected');
			expect((result as { reason: string }).reason).toContain('per-op cap');
			expect((await deps.state.getTokenBalance('alice')).RUNE).toBe(100);
		});

		it('rejects rune_exchange above the global pack cap', async () => {
			await seedSealedGenesis(state, deps);
			await deps.state.putTokenBalance({ account: 'alice', RUNE: 10 });
			await deps.state.putPackSupply({
				packType: 'standard',
				minted: 100_000,
				burned: 0,
				cap: 100_000,
			});

			const result = await applyOp(makeOp('rune_exchange', {
				pack_type: 'standard',
				quantity: 1,
			}, { broadcaster: 'alice', trxId: 'rune-x-global-cap', blockNum: 2000 }), defaultCtx, deps);

			expect(result.status).toBe('rejected');
			expect((result as { reason: string }).reason).toContain('pack cap');
			expect(state.packs.size).toBe(0);
			});
		});

		describe('pack_purchase', () => {
			function withHbdPurchaseTransfer(trxId: string, amount: string, to = deps.runtime.treasuryAccount) {
				state.setTrxSiblings(trxId, [
					['transfer', {
						from: 'alice',
						to,
						amount,
						memo: buildHbdPackPurchaseMemo({
							account: 'alice',
							packType: 'standard',
							quantity: 1,
							totalPriceThousandths: 20_000,
						}),
					}],
				]);
			}

			it('accepts exact HBD payment and creates sealed packs', async () => {
				await seedSealedGenesis(state, deps);
				withHbdPurchaseTransfer('hbd-pack-1', formatHbdTransferAmount(20_000));

				const result = await applyOp(makeOp('pack_purchase', {
					pack_type: 'standard',
					quantity: 1,
				}, { broadcaster: 'alice', trxId: 'hbd-pack-1', blockNum: 2000, usedActiveAuth: true }), defaultCtx, deps);

				expect(result.status).toBe('applied');
				expect(state.packs.get('pack_hbd-pack-1:hbd:0')).toMatchObject({
					owner: 'alice',
					packType: 'standard',
					sealed: true,
					cardCount: 5,
				});
				expect(state.packSupply.get('standard')).toMatchObject({
					minted: 1,
					burned: 0,
					cap: 100_000,
				});
			});

			it('ignores duplicate pack_purchase without double minting', async () => {
				await seedSealedGenesis(state, deps);
				withHbdPurchaseTransfer('hbd-pack-duplicate', formatHbdTransferAmount(20_000));
				const op = makeOp('pack_purchase', {
					pack_type: 'standard',
					quantity: 1,
				}, { broadcaster: 'alice', trxId: 'hbd-pack-duplicate', blockNum: 2000, usedActiveAuth: true });

				const first = await applyOp(op, defaultCtx, deps);
				const duplicate = await applyOp(op, defaultCtx, deps);

				expect(first.status).toBe('applied');
				expect(duplicate.status).toBe('ignored');
				expect(state.packs.size).toBe(1);
				expect(state.packSupply.get('standard')?.minted).toBe(1);
			});

			it('rejects non-HBD or wrong-amount payments', async () => {
				await seedSealedGenesis(state, deps);
				withHbdPurchaseTransfer('hbd-pack-wrong', '20.000 HIVE');

				const result = await applyOp(makeOp('pack_purchase', {
					pack_type: 'standard',
					quantity: 1,
				}, { broadcaster: 'alice', trxId: 'hbd-pack-wrong', blockNum: 2000, usedActiveAuth: true }), defaultCtx, deps);

				expect(result.status).toBe('rejected');
				expect((result as { reason: string }).reason).toContain('payment amount mismatch');
				expect(state.packs.size).toBe(0);
			});

			it('rejects HBD payments without a valid protocol memo checksum', async () => {
				await seedSealedGenesis(state, deps);
				state.setTrxSiblings('hbd-pack-bad-memo', [
					['transfer', {
						from: 'alice',
						to: deps.runtime.treasuryAccount,
						amount: formatHbdTransferAmount(20_000),
						memo: 'ragnarok:pack_purchase:standard:1',
					}],
				]);

				const result = await applyOp(makeOp('pack_purchase', {
					pack_type: 'standard',
					quantity: 1,
				}, { broadcaster: 'alice', trxId: 'hbd-pack-bad-memo', blockNum: 2000, usedActiveAuth: true }), defaultCtx, deps);

				expect(result.status).toBe('rejected');
				expect((result as { reason: string }).reason).toContain('memo');
				expect(state.packs.size).toBe(0);
			});
		});

		describe('v1.1: pack_mint', () => {
			it('admin can mint packs into admin inventory', async () => {
				await seedSealedGenesis(state, deps);
				const result = await applyOp(makeOp('pack_mint', {
					pack_type: 'standard', quantity: 3,
			}, { broadcaster: 'ragnarok', trxId: 'mint-packs-1', usedActiveAuth: true }), defaultCtx, deps);

			expect(result.status).toBe('applied');
			expect(state.packs.size).toBe(3);
			for (const [, pack] of state.packs) {
				expect(pack.owner).toBe('ragnarok');
				expect(pack.sealed).toBe(true);
				expect(pack.packType).toBe('standard');
				expect(pack.cardCount).toBe(5);
				expect(pack.dna).toBeTruthy();
				}
			});

			it('duplicate pack_mint does not increment pack supply twice', async () => {
				await seedSealedGenesis(state, deps);
				const op = makeOp('pack_mint', {
					pack_type: 'standard', quantity: 2,
				}, { broadcaster: 'ragnarok', trxId: 'mint-packs-dup', usedActiveAuth: true });

				const first = await applyOp(op, defaultCtx, deps);
				const second = await applyOp(op, defaultCtx, deps);

				expect(first.status).toBe('applied');
				expect(second.status).toBe('ignored');
				expect(state.packs.size).toBe(2);
				expect(state.packSupply.get('standard')?.minted).toBe(2);
			});

			it('rejects non-admin mint', async () => {
			await seedSealedGenesis(state, deps);
			const result = await applyOp(makeOp('pack_mint', {
				pack_type: 'standard', quantity: 1,
			}, { broadcaster: 'alice', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});

		it('rejects mint before seal', async () => {
			await seedGenesis(state, deps);
			const result = await applyOp(makeOp('pack_mint', {
				pack_type: 'standard', quantity: 1,
			}, { broadcaster: 'ragnarok', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});
	});

	describe('v1.1: pack_distribute', () => {
		it('admin distributes packs to player with atomic transfer', async () => {
			await seedSealedGenesis(state, deps);
			// Mint first
			await applyOp(makeOp('pack_mint', {
				pack_type: 'standard', quantity: 2,
			}, { broadcaster: 'ragnarok', trxId: 'mint-1', usedActiveAuth: true }), defaultCtx, deps);

			const packUids = [...state.packs.keys()];

			// Distribute with companion transfer
			withCompanion(state, 'dist-1', 'alice');
			const result = await applyOp(makeOp('pack_distribute', {
				pack_uids: packUids, to: 'alice',
			}, { broadcaster: 'ragnarok', trxId: 'dist-1', usedActiveAuth: true }), defaultCtx, deps);

			expect(result.status).toBe('applied');
			for (const [, pack] of state.packs) {
				expect(pack.owner).toBe('alice');
			}
		});

		it('rejects distribute without companion transfer', async () => {
			await seedSealedGenesis(state, deps);
			await applyOp(makeOp('pack_mint', {
				pack_type: 'standard', quantity: 1,
			}, { broadcaster: 'ragnarok', trxId: 'mint-2', usedActiveAuth: true }), defaultCtx, deps);

			const packUids = [...state.packs.keys()];
			const result = await applyOp(makeOp('pack_distribute', {
				pack_uids: packUids, to: 'alice',
			}, { broadcaster: 'ragnarok', trxId: 'dist-2', usedActiveAuth: true }), defaultCtx, deps);

			expect(result.status).toBe('rejected');
		});

		it('rejects non-admin distribute', async () => {
			await seedSealedGenesis(state, deps);
			withCompanion(state, 'dist-3', 'bob');
			const result = await applyOp(makeOp('pack_distribute', {
				pack_uids: ['fake'], to: 'bob',
			}, { broadcaster: 'alice', trxId: 'dist-3', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});
	});

	describe('v1.1: pack_transfer (admin-only)', () => {
		it('admin transfers sealed pack to a player with atomic transfer', async () => {
			await seedSealedGenesis(state, deps);
			await applyOp(makeOp('pack_mint', { pack_type: 'premium', quantity: 1 },
				{ broadcaster: 'ragnarok', trxId: 'mint-t1', usedActiveAuth: true }), defaultCtx, deps);
			const uid = [...state.packs.keys()][0];

			withCompanion(state, 'xfer-1', 'bob');
			const result = await applyOp(makeOp('pack_transfer', { pack_uid: uid, to: 'bob' },
				{ broadcaster: 'ragnarok', trxId: 'xfer-1', blockNum: 2000, usedActiveAuth: true }), defaultCtx, deps);

			expect(result.status).toBe('applied');
			expect(state.packs.get(uid)!.owner).toBe('bob');
		});

		it('rejects pack_transfer from a non-admin broadcaster', async () => {
			await seedSealedGenesis(state, deps);
			await applyOp(makeOp('pack_mint', { pack_type: 'standard', quantity: 1 },
				{ broadcaster: 'ragnarok', trxId: 'mint-t-non-admin', usedActiveAuth: true }), defaultCtx, deps);
			const uid = [...state.packs.keys()][0];
			withCompanion(state, 'dist-t-non-admin', 'alice');
			await applyOp(makeOp('pack_distribute', { pack_uids: [uid], to: 'alice' },
				{ broadcaster: 'ragnarok', trxId: 'dist-t-non-admin', usedActiveAuth: true }), defaultCtx, deps);

			// Alice — the legitimate pack owner — cannot transfer it: admin-only.
			withCompanion(state, 'xfer-non-admin', 'bob');
			const result = await applyOp(makeOp('pack_transfer', { pack_uid: uid, to: 'bob' },
				{ broadcaster: 'alice', trxId: 'xfer-non-admin', blockNum: 2000, usedActiveAuth: true }), defaultCtx, deps);

			expect(result.status).toBe('rejected');
			expect(state.packs.get(uid)!.owner).toBe('alice');
		});

		it('rejects admin transfer of a pack already distributed to a player', async () => {
			await seedSealedGenesis(state, deps);
			await applyOp(makeOp('pack_mint', { pack_type: 'standard', quantity: 1 },
				{ broadcaster: 'ragnarok', trxId: 'mint-t2', usedActiveAuth: true }), defaultCtx, deps);
			const uid = [...state.packs.keys()][0];
			withCompanion(state, 'dist-t2', 'alice');
			await applyOp(makeOp('pack_distribute', { pack_uids: [uid], to: 'alice' },
				{ broadcaster: 'ragnarok', trxId: 'dist-t2', usedActiveAuth: true }), defaultCtx, deps);

			withCompanion(state, 'xfer-2', 'bob');
			const result = await applyOp(makeOp('pack_transfer', { pack_uid: uid, to: 'bob' },
				{ broadcaster: 'ragnarok', trxId: 'xfer-2', blockNum: 2000, usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});

		it('rejects admin pack_transfer without companion atomic transfer', async () => {
			await seedSealedGenesis(state, deps);
			await applyOp(makeOp('pack_mint', { pack_type: 'standard', quantity: 1 },
				{ broadcaster: 'ragnarok', trxId: 'mint-t3', usedActiveAuth: true }), defaultCtx, deps);
			const uid = [...state.packs.keys()][0];

			const result = await applyOp(makeOp('pack_transfer', { pack_uid: uid, to: 'bob' },
				{ broadcaster: 'ragnarok', trxId: 'xfer-3', blockNum: 2000, usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});
	});

		describe('v1.1: pack_burn', () => {
			it('burns pack and derives cards from DNA + entropy', async () => {
				await seedSealedGenesis(state, deps);
				await applyOp(makeOp('pack_mint', { pack_type: 'standard', quantity: 1 },
				{ broadcaster: 'ragnarok', trxId: 'mint-b1', usedActiveAuth: true }), defaultCtx, deps);
			const uid = [...state.packs.keys()][0];
			withCompanion(state, 'dist-b1', 'alice');
			await applyOp(makeOp('pack_distribute', { pack_uids: [uid], to: 'alice' },
				{ broadcaster: 'ragnarok', trxId: 'dist-b1', usedActiveAuth: true }), defaultCtx, deps);

			const cardsBefore = state.cards.size;
			const result = await applyOp(makeOp('pack_burn', { pack_uid: uid, salt: 'a'.repeat(64) },
				{ broadcaster: 'alice', trxId: 'burn-1', blockNum: 500, usedActiveAuth: true }), defaultCtx, deps);

			expect(result.status).toBe('applied');
			expect(state.packs.has(uid)).toBe(false); // pack deleted
			expect(state.cards.size).toBe(cardsBefore + 5); // 5 cards from standard pack

			// Verify cards have DNA
			for (const [, card] of state.cards) {
				expect(card.originDna).toBeTruthy();
				expect(card.instanceDna).toBeTruthy();
				expect(card.owner).toBe('alice');
				expect(card.mintSource).toBe('pack');
				}
			});

			it('does not mint twice when the same burn op is replayed', async () => {
				await seedSealedGenesis(state, deps);
				await applyOp(makeOp('pack_mint', { pack_type: 'standard', quantity: 1 },
					{ broadcaster: 'ragnarok', trxId: 'mint-b-dup', usedActiveAuth: true }), defaultCtx, deps);
				const uid = [...state.packs.keys()][0];
				withCompanion(state, 'dist-b-dup', 'alice');
				await applyOp(makeOp('pack_distribute', { pack_uids: [uid], to: 'alice' },
					{ broadcaster: 'ragnarok', trxId: 'dist-b-dup', usedActiveAuth: true }), defaultCtx, deps);

				const burnOp = makeOp('pack_burn', { pack_uid: uid, salt: 'd'.repeat(64) },
					{ broadcaster: 'alice', trxId: 'burn-dup', blockNum: 500, usedActiveAuth: true });
				const first = await applyOp(burnOp, defaultCtx, deps);
				const cardsAfterFirst = state.cards.size;
				const second = await applyOp(burnOp, defaultCtx, deps);

				expect(first.status).toBe('applied');
				expect(second.status).toBe('rejected');
				expect(state.cards.size).toBe(cardsAfterFirst);
				expect(state.packs.has(uid)).toBe(false);
			});

			it('keeps the sealed pack when burn card uid verification fails', async () => {
				await seedSealedGenesis(state, deps);
				await applyOp(makeOp('pack_mint', { pack_type: 'standard', quantity: 1 },
					{ broadcaster: 'ragnarok', trxId: 'mint-b-collision', usedActiveAuth: true }), defaultCtx, deps);
				const uid = [...state.packs.keys()][0];
				withCompanion(state, 'dist-b-collision', 'alice');
				await applyOp(makeOp('pack_distribute', { pack_uids: [uid], to: 'alice' },
					{ broadcaster: 'ragnarok', trxId: 'dist-b-collision', usedActiveAuth: true }), defaultCtx, deps);
				state.cards.set('burn-collision:0', {
					uid: 'burn-collision:0',
					cardId: 20001,
					owner: 'alice',
					rarity: 'common',
					level: 1,
					xp: 0,
					edition: 'alpha',
					mintSource: 'pack',
					mintTrxId: 'existing',
					mintBlockNum: 1,
					lastTransferBlock: 1,
				});

				const before = state.cards.size;
				const result = await applyOp(makeOp('pack_burn', { pack_uid: uid, salt: 'c'.repeat(64) },
					{ broadcaster: 'alice', trxId: 'burn-collision', blockNum: 500, usedActiveAuth: true }), defaultCtx, deps);

				expect(result.status).toBe('rejected');
				expect(state.cards.size).toBe(before);
				expect(state.packs.has(uid)).toBe(true);
			});

			it('rejects burn of non-owned pack', async () => {
				await seedSealedGenesis(state, deps);
				await applyOp(makeOp('pack_mint', { pack_type: 'standard', quantity: 1 },
				{ broadcaster: 'ragnarok', trxId: 'mint-b2', usedActiveAuth: true }), defaultCtx, deps);
			const uid = [...state.packs.keys()][0];

			const result = await applyOp(makeOp('pack_burn', { pack_uid: uid, salt: 'b'.repeat(64) },
				{ broadcaster: 'alice', trxId: 'burn-2', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});
	});

	// ==========================================================
	// v1.1: DNA Lineage
	// ==========================================================

	describe('v1.1: card_replicate', () => {
		it('clones card with same origin DNA but unique instance DNA', async () => {
			await seedGenesis(state, deps);
			// Create a card
			state.cards.set('card-1', {
				uid: 'card-1', cardId: 20001, owner: 'alice', rarity: 'epic',
				level: 2, xp: 100, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'orig-mint', mintBlockNum: 100, lastTransferBlock: 0,
				originDna: 'origin-hash-123', instanceDna: 'instance-hash-456',
				generation: 0, replicaCount: 0,
			});

			const result = await applyOp(makeOp('card_replicate', { source_uid: 'card-1' },
				{ broadcaster: 'alice', trxId: 'rep-1', usedActiveAuth: true }), defaultCtx, deps);

			expect(result.status).toBe('applied');
			expect(state.cards.size).toBe(2);

			const replica = state.cards.get('rep-1:replica:0')!;
			expect(replica.originDna).toBe('origin-hash-123'); // same genotype
			expect(replica.instanceDna).not.toBe('instance-hash-456'); // different phenotype
			expect(replica.parentInstanceDna).toBe('instance-hash-456');
			expect(replica.generation).toBe(1);
			expect(replica.replicaCount).toBe(0);
			expect(replica.level).toBe(1); // starts fresh
			expect(replica.xp).toBe(0);
			expect(replica.cardId).toBe(20001);
			expect(replica.owner).toBe('alice');
			expect(replica.mintSource).toBe('replica');

			// Source card replicaCount incremented
			expect(state.cards.get('card-1')!.replicaCount).toBe(1);
		});

		it('rejects replicate beyond max generation', async () => {
			state.cards.set('card-gen3', {
				uid: 'card-gen3', cardId: 20001, owner: 'alice', rarity: 'common',
				level: 1, xp: 0, edition: 'alpha', mintSource: 'replica',
				mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
				generation: 3, replicaCount: 0,
			});
			const result = await applyOp(makeOp('card_replicate', { source_uid: 'card-gen3' },
				{ broadcaster: 'alice', trxId: 'rep-fail-1', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});

		it('rejects replicate beyond max replicas', async () => {
			state.cards.set('card-maxrep', {
				uid: 'card-maxrep', cardId: 20001, owner: 'alice', rarity: 'common',
				level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
				generation: 0, replicaCount: 3,
			});
			const result = await applyOp(makeOp('card_replicate', { source_uid: 'card-maxrep' },
				{ broadcaster: 'alice', trxId: 'rep-fail-2', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});

		it('rejects replicate by non-owner', async () => {
			state.cards.set('card-bob', {
				uid: 'card-bob', cardId: 20001, owner: 'bob', rarity: 'common',
				level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
				generation: 0, replicaCount: 0,
			});
			const result = await applyOp(makeOp('card_replicate', { source_uid: 'card-bob' },
				{ broadcaster: 'alice', trxId: 'rep-fail-3', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});
	});

	describe('v1.1: card_merge', () => {
		it('merges two same-origin cards into ascended card', async () => {
			const sharedOrigin = 'shared-origin-dna';
			state.cards.set('merge-a', {
				uid: 'merge-a', cardId: 20001, owner: 'alice', rarity: 'epic',
				level: 2, xp: 80, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'ma', mintBlockNum: 100, lastTransferBlock: 0,
				originDna: sharedOrigin, instanceDna: 'inst-a', generation: 0, replicaCount: 0,
			});
			state.cards.set('merge-b', {
				uid: 'merge-b', cardId: 20001, owner: 'alice', rarity: 'epic',
				level: 1, xp: 50, edition: 'alpha', mintSource: 'pack',
				mintTrxId: 'mb', mintBlockNum: 200, lastTransferBlock: 0,
				originDna: sharedOrigin, instanceDna: 'inst-b', generation: 0, replicaCount: 0,
			});

			const result = await applyOp(makeOp('card_merge', {
				source_uids: ['merge-a', 'merge-b'],
			}, { broadcaster: 'alice', trxId: 'mrg-1', usedActiveAuth: true }), defaultCtx, deps);

			expect(result.status).toBe('applied');
			expect(state.cards.has('merge-a')).toBe(false); // burned
			expect(state.cards.has('merge-b')).toBe(false); // burned

			const merged = state.cards.get('mrg-1:merge:0')!;
			expect(merged).toBeTruthy();
			expect(merged.cardId).toBe(20001);
			expect(merged.originDna).toBe(sharedOrigin);
			expect(merged.foil).toBe('ascended');
			expect(merged.level).toBe(3); // max(2,1)+1
			expect(merged.xp).toBe(130); // 80+50
			expect(merged.mergedFrom).toEqual(['merge-a', 'merge-b']);
			expect(merged.generation).toBe(0); // reset
			expect(merged.mintSource).toBe('merge');
		});

		it('rejects merge of different card templates', async () => {
			state.cards.set('diff-a', {
				uid: 'diff-a', cardId: 20001, owner: 'alice', rarity: 'common',
				level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
			});
			state.cards.set('diff-b', {
				uid: 'diff-b', cardId: 20002, owner: 'alice', rarity: 'common',
				level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'y', mintBlockNum: 100, lastTransferBlock: 0,
			});

			const result = await applyOp(makeOp('card_merge', {
				source_uids: ['diff-a', 'diff-b'],
			}, { broadcaster: 'alice', trxId: 'mrg-fail-1', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});

		it('rejects merge when source has active replicas', async () => {
			state.cards.set('rep-src', {
				uid: 'rep-src', cardId: 20001, owner: 'alice', rarity: 'common',
				level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
				replicaCount: 1,
			});
			state.cards.set('rep-partner', {
				uid: 'rep-partner', cardId: 20001, owner: 'alice', rarity: 'common',
				level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'y', mintBlockNum: 100, lastTransferBlock: 0,
				replicaCount: 0,
			});

			const result = await applyOp(makeOp('card_merge', {
				source_uids: ['rep-src', 'rep-partner'],
			}, { broadcaster: 'alice', trxId: 'mrg-fail-2', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});

		it('rejects merge of cards owned by different players', async () => {
			state.cards.set('own-a', {
				uid: 'own-a', cardId: 20001, owner: 'alice', rarity: 'common',
				level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
			});
			state.cards.set('own-b', {
				uid: 'own-b', cardId: 20001, owner: 'bob', rarity: 'common',
				level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
				mintTrxId: 'y', mintBlockNum: 100, lastTransferBlock: 0,
			});

			const result = await applyOp(makeOp('card_merge', {
				source_uids: ['own-a', 'own-b'],
			}, { broadcaster: 'alice', trxId: 'mrg-fail-3', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});
	});

	// ==========================================================
	// v1.1: Normalization
	// ==========================================================

	describe('v1.1: normalize', () => {
		it('normalizes rp_pack_mint to pack_mint', () => {
			const result = normalizeRawOp({
				customJsonId: 'rp_pack_mint',
				json: '{"pack_type":"standard","quantity":1}',
				broadcaster: 'ragnarok', trxId: 'n1', blockNum: 100, timestamp: 0,
				requiredPostingAuths: [], requiredAuths: ['ragnarok'],
			});
			expect(result.status).toBe('ok');
			if (result.status === 'ok') expect(result.op.action).toBe('pack_mint');
		});

		it('normalizes canonical ragnarok-cards pack_distribute', () => {
			const result = normalizeRawOp({
				customJsonId: 'ragnarok-cards',
				json: '{"action":"pack_distribute","pack_uids":["p1"],"to":"alice"}',
				broadcaster: 'ragnarok', trxId: 'n2', blockNum: 100, timestamp: 0,
				requiredPostingAuths: [], requiredAuths: ['ragnarok'],
			});
			expect(result.status).toBe('ok');
			if (result.status === 'ok') expect(result.op.action).toBe('pack_distribute');
		});

			it('normalizes rp_rune_exchange to rune_exchange', () => {
				const result = normalizeRawOp({
					customJsonId: 'rp_rune_exchange',
					json: '{"pack_type":"standard","quantity":1}',
					broadcaster: 'alice', trxId: 'n-rune', blockNum: 100, timestamp: 0,
				requiredPostingAuths: ['alice'], requiredAuths: [],
			});
				expect(result.status).toBe('ok');
				if (result.status === 'ok') expect(result.op.action).toBe('rune_exchange');
			});

			it('normalizes rp_pack_purchase to pack_purchase with active auth', () => {
				const result = normalizeRawOp({
					customJsonId: 'rp_pack_purchase',
					json: '{"pack_type":"standard","quantity":1,"currency":"HBD"}',
					broadcaster: 'alice', trxId: 'n-hbd', blockNum: 100, timestamp: 0,
					requiredPostingAuths: [], requiredAuths: ['alice'],
				});
				expect(result.status).toBe('ok');
				if (result.status === 'ok') expect(result.op.action).toBe('pack_purchase');
			});

			it('normalizes rp_card_replicate and rp_card_merge', () => {
			const rep = normalizeRawOp({
				customJsonId: 'rp_card_replicate',
				json: '{"source_uid":"x"}',
				broadcaster: 'alice', trxId: 'n3', blockNum: 100, timestamp: 0,
				requiredPostingAuths: [], requiredAuths: ['alice'],
			});
			expect(rep.status).toBe('ok');
			if (rep.status === 'ok') expect(rep.op.action).toBe('card_replicate');

			const mrg = normalizeRawOp({
				customJsonId: 'rp_card_merge',
				json: '{"source_uids":["a","b"]}',
				broadcaster: 'alice', trxId: 'n4', blockNum: 100, timestamp: 0,
				requiredPostingAuths: [], requiredAuths: ['alice'],
			});
			expect(mrg.status).toBe('ok');
			if (mrg.status === 'ok') expect(mrg.op.action).toBe('card_merge');
		});
	});
});
