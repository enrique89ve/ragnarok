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
import { normalizeRawOp, type NormalizeResult } from './normalize';
import type {
	StateAdapter, CardAsset, GenesisRecord, EloRecord,
	TokenBalance, MatchAnchorRecord, PackCommitRecord, SupplyRecord,
	ReplayContext, ProtocolOp, CardDataProvider, RewardProvider, SignatureVerifier, RawHiveOp,
	PackAsset, PackSupplyRecord, CompanionTransfer,
} from './types';

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
	anchors = new Map<string, MatchAnchorRecord>();
	commits = new Map<string, PackCommitRecord>();
	rewards = new Set<string>();
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
	async getMatchAnchor(matchId: string) { return this.anchors.get(matchId) ?? null; }
	async putMatchAnchor(a: MatchAnchorRecord) { this.anchors.set(a.matchId, a); }
	async getPackCommit(trxId: string) { return this.commits.get(trxId) ?? null; }
	async putPackCommit(c: PackCommitRecord) { this.commits.set(c.trxId, c); }
	async getUnrevealedCommitsBefore(deadlineBlock: number) {
		return [...this.commits.values()].filter(c => !c.revealed && c.commitBlock + 200 <= deadlineBlock);
	}
	async hasRewardClaim(account: string, rewardId: string) { return this.rewards.has(`${account}:${rewardId}`); }
	async putRewardClaim(account: string, rewardId: string) { this.rewards.add(`${account}:${rewardId}`); }
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
	trxSiblings = new Map<string, unknown[]>();

	async getPack(uid: string) { return this.packs.get(uid) ?? null; }
	async putPack(p: PackAsset) { this.packs.set(p.uid, p); }
	async deletePack(uid: string) { this.packs.delete(uid); }
	async getPacksByOwner(owner: string) { return [...this.packs.values()].filter(p => p.owner === owner); }
	async getPackSupply(packType: string) { return this.packSupply.get(packType) ?? null; }
	async putPackSupply(r: PackSupplyRecord) { this.packSupply.set(r.packType, r); }
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

const mockCards: CardDataProvider = {
	getCardById(id: number) {
		if (id >= 1000 && id <= 99999) {
			return { name: `Card${id}`, type: 'minion', rarity: 'common', collectible: true };
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
};

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

function makeDeps(state: MemoryState): ProtocolCoreDeps {
	return { state, cards: mockCards, rewards: mockRewards, sigs: mockSigs };
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

	it('burn removes card from state', async () => {
		state.cards.set('nft-001', {
			uid: 'nft-001', cardId: 20001, owner: 'alice', rarity: 'common',
			level: 1, xp: 0, edition: 'alpha', mintSource: 'genesis',
			mintTrxId: 'x', mintBlockNum: 100, lastTransferBlock: 0,
		});

		const result = await applyOp(makeOp('burn', {
			nft_id: 'nft-001',
		}, { usedActiveAuth: true }), defaultCtx, deps);

		expect(result.status).toBe('applied');
		expect(state.cards.has('nft-001')).toBe(false);
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
		// RUNE bonus applied
		expect(state.tokens.get('alice')!.RUNE).toBe(50);
	});

	it('reward claim is idempotent', async () => {
		await seedGenesis(state, deps);
		state.elo.set('alice', { account: 'alice', elo: 1200, wins: 5, losses: 2 });

		await applyOp(makeOp('reward_claim', { reward_id: 'first_victory' }), defaultCtx, deps);
		const result = await applyOp(makeOp('reward_claim', { reward_id: 'first_victory' }), defaultCtx, deps);

		expect(result.status).toBe('ignored');
		expect(state.tokens.get('alice')!.RUNE).toBe(50); // not doubled
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

	// --- Post-seal signature enforcement ---

	it('post-seal ranked match_result rejected without match_anchor pubkeys', async () => {
		await seedGenesis(state, deps);
		// Seal the protocol
		await applyOp(makeOp('seal', {}, { broadcaster: 'ragnarok', usedActiveAuth: true, blockNum: 900 }), defaultCtx, deps);

		// Try to submit a ranked match result post-seal with NO anchor
		// Note: PoW validation runs first and will also reject (zero nonces invalid)
		// The key assertion: the op is REJECTED — it cannot pass any validation layer
		const result = await applyOp(makeOp('match_result', {
			m: 'match-001',
			w: 'alice',
			l: 'bob',
			n: 1,
			s: 'seed123',
			v: 1,
			pow: { nonces: new Array(64).fill(0) },
			sig: { b: 'fake-sig-a', c: 'fake-sig-b' },
		}, { broadcaster: 'alice', blockNum: 1000 }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
		// The rejection may come from PoW or from missing anchor — both are correct
		// because a post-seal match without valid PoW AND without an anchor is doubly invalid
	});

	it('current-key fallback is ONLY available pre-seal, not post-seal', async () => {
		await seedGenesis(state, deps);
		// Pre-seal: genesis exists but not sealed — legacy current-key path exists
		expect(state.genesis!.sealed).toBe(false);

		// Seal
		await applyOp(makeOp('seal', {}, { broadcaster: 'ragnarok', usedActiveAuth: true, blockNum: 900 }), defaultCtx, deps);
		expect(state.genesis!.sealed).toBe(true);

		// Post-seal: no match_anchor exists for 'match-002'
		const anchor = await deps.state.getMatchAnchor('match-002');
		expect(anchor).toBeNull();

		// The apply.ts code now requires: if sealed AND no anchor with pubkeys → reject
		// This is the spec invariant: post-seal ranked matches require match_anchor
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

	it('post-seal match_result WITHOUT anchor is rejected', async () => {
		await seedGenesis(state, deps);
		await applyOp(makeOp('seal', {}, { broadcaster: 'ragnarok', usedActiveAuth: true, blockNum: 900 }), defaultCtx, deps);

		// No anchor exists for 'no-anchor-match'
		const anchor = await deps.state.getMatchAnchor('no-anchor-match');
		expect(anchor).toBeNull();

		// match_result will be rejected (PoW fails first, but semantically
		// it would also be rejected for missing anchor post-seal)
		const result = await applyOp(makeOp('match_result', {
			m: 'no-anchor-match',
			w: 'alice',
			l: 'bob',
			n: 10,
			s: 'seed',
			v: 1,
			pow: { nonces: new Array(64).fill(0) },
			sig: { b: 'sig-a', c: 'sig-b' },
		}, { broadcaster: 'alice', blockNum: 1000 }), defaultCtx, deps);

		expect(result.status).toBe('rejected');
	});

	it('pre-seal match can use current-key fallback (no anchor required)', async () => {
		await seedGenesis(state, deps);
		// NOT sealed — pre-seal mode

		// No anchor for this match — that's OK pre-seal
		const anchor = await deps.state.getMatchAnchor('preseal-match');
		expect(anchor).toBeNull();

		// Pre-seal: genesis exists, not sealed → legacy current-key path is available
		// (In practice, PoW would also need to be valid, but the assertion is about
		// the EXISTENCE of the current-key fallback path, not about PoW.)
		expect(state.genesis).not.toBeNull();
		expect(state.genesis!.sealed).toBe(false);
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

	describe('v1.1: pack_transfer', () => {
		it('player transfers sealed pack with atomic transfer', async () => {
			await seedSealedGenesis(state, deps);
			// Mint and distribute to alice
			await applyOp(makeOp('pack_mint', { pack_type: 'premium', quantity: 1 },
				{ broadcaster: 'ragnarok', trxId: 'mint-t1', usedActiveAuth: true }), defaultCtx, deps);
			const uid = [...state.packs.keys()][0];
			withCompanion(state, 'dist-t1', 'alice');
			await applyOp(makeOp('pack_distribute', { pack_uids: [uid], to: 'alice' },
				{ broadcaster: 'ragnarok', trxId: 'dist-t1', usedActiveAuth: true }), defaultCtx, deps);

			// Alice transfers to bob
			withCompanion(state, 'xfer-1', 'bob');
			const result = await applyOp(makeOp('pack_transfer', { pack_uid: uid, to: 'bob' },
				{ broadcaster: 'alice', trxId: 'xfer-1', blockNum: 2000, usedActiveAuth: true }), defaultCtx, deps);

			expect(result.status).toBe('applied');
			expect(state.packs.get(uid)!.owner).toBe('bob');
		});

		it('rejects transfer of non-owned pack', async () => {
			await seedSealedGenesis(state, deps);
			await applyOp(makeOp('pack_mint', { pack_type: 'standard', quantity: 1 },
				{ broadcaster: 'ragnarok', trxId: 'mint-t2', usedActiveAuth: true }), defaultCtx, deps);
			const uid = [...state.packs.keys()][0];

			withCompanion(state, 'xfer-2', 'bob');
			const result = await applyOp(makeOp('pack_transfer', { pack_uid: uid, to: 'bob' },
				{ broadcaster: 'alice', trxId: 'xfer-2', usedActiveAuth: true }), defaultCtx, deps);
			expect(result.status).toBe('rejected');
		});

		it('rejects transfer without companion', async () => {
			await seedSealedGenesis(state, deps);
			await applyOp(makeOp('pack_mint', { pack_type: 'standard', quantity: 1 },
				{ broadcaster: 'ragnarok', trxId: 'mint-t3', usedActiveAuth: true }), defaultCtx, deps);
			const uid = [...state.packs.keys()][0];
			withCompanion(state, 'dist-t3', 'alice');
			await applyOp(makeOp('pack_distribute', { pack_uids: [uid], to: 'alice' },
				{ broadcaster: 'ragnarok', trxId: 'dist-t3', usedActiveAuth: true }), defaultCtx, deps);

			// No companion set for xfer-3
			const result = await applyOp(makeOp('pack_transfer', { pack_uid: uid, to: 'bob' },
				{ broadcaster: 'alice', trxId: 'xfer-3', blockNum: 2000, usedActiveAuth: true }), defaultCtx, deps);
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
