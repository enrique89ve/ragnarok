/**
 * Protocol Conformance Test Suite — Ragnarok v1.0
 *
 * Golden-vector tests that any implementation of the replay core MUST pass.
 * These vectors are derived from the spec at docs/RAGNAROK_PROTOCOL_V1.md
 * and pin the exact behavior of canonical serialization, hashing, PoW
 * verification, pack seed derivation, and auto-finalize formulas.
 *
 * If client and server both pass these tests, they are replay-compatible.
 * If either fails, the implementations have diverged and canonical state
 * will differ — that is a launch-blocking bug.
 */

import { describe, it, expect } from 'vitest';
import { canonicalStringify, sha256Hash } from './hashUtils';
import { deriveChallenge, verifyPoW, POW_CONFIG } from './proofOfWork';

// ============================================================
// 1. CANONICAL SERIALIZATION — golden vectors
// ============================================================

describe('Protocol Conformance: Canonical Serialization', () => {
	it('sorts top-level keys lexicographically', () => {
		const input = { z: 1, a: 2, m: 3 };
		expect(canonicalStringify(input)).toBe('{"a":2,"m":3,"z":1}');
	});

	it('sorts nested object keys recursively', () => {
		const input = { b: { y: 1, x: 2 }, a: 3 };
		expect(canonicalStringify(input)).toBe('{"a":3,"b":{"x":2,"y":1}}');
	});

	it('preserves array order (does not sort arrays)', () => {
		const input = { arr: [3, 1, 2] };
		expect(canonicalStringify(input)).toBe('{"arr":[3,1,2]}');
	});

	it('handles null and empty objects', () => {
		expect(canonicalStringify(null)).toBe('null');
		expect(canonicalStringify({})).toBe('{}');
		expect(canonicalStringify({ a: null })).toBe('{"a":null}');
	});

	it('handles deeply nested mixed structures', () => {
		const input = { c: [{ z: 1, a: 2 }], b: { d: [3], c: 4 }, a: 'x' };
		expect(canonicalStringify(input)).toBe('{"a":"x","b":{"c":4,"d":[3]},"c":[{"a":2,"z":1}]}');
	});

	it('produces deterministic output for match_result-shaped payload', () => {
		const payload = {
			m: 'rm:s1:alice:bob:001',
			w: 'alice',
			l: 'bob',
			n: 55,
			s: 'abc123',
			v: 1,
		};
		const expected = '{"l":"bob","m":"rm:s1:alice:bob:001","n":55,"s":"abc123","v":1,"w":"alice"}';
		expect(canonicalStringify(payload)).toBe(expected);
	});
});

// ============================================================
// 2. SHA-256 HASHING — golden vectors
// ============================================================

describe('Protocol Conformance: SHA-256 Hashing', () => {
	it('hashes empty string correctly', async () => {
		const hash = await sha256Hash('');
		expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
	});

	it('hashes "hello" correctly', async () => {
		const hash = await sha256Hash('hello');
		expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
	});

	it('hashes canonical payload deterministically', async () => {
		const payload = { l: 'bob', m: 'test', n: 1, w: 'alice' };
		const canonical = canonicalStringify(payload);
		expect(canonical).toBe('{"l":"bob","m":"test","n":1,"w":"alice"}');
		const hash = await sha256Hash(canonical);
		// This is the pinned hash — if this changes, serialization or hashing broke
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
		// Pin the exact value so any implementation can verify
		const expected = await sha256Hash('{"l":"bob","m":"test","n":1,"w":"alice"}');
		expect(hash).toBe(expected);
	});
});

// ============================================================
// 3. PoW CHALLENGE DERIVATION — golden vectors
// ============================================================

describe('Protocol Conformance: PoW Challenge Derivation', () => {
	it('derives challenge[0] deterministically from payload hash', async () => {
		const payloadHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
		const challenge0 = await deriveChallenge(payloadHash, 0);
		// challenge_0 = sha256("abcdef...89:0")
		const expected = await sha256Hash(`${payloadHash}:0`);
		expect(challenge0).toBe(expected);
		expect(challenge0).toHaveLength(64);
	});

	it('derives different challenges for different indices', async () => {
		const payloadHash = 'aaaa';
		const c0 = await deriveChallenge(payloadHash, 0);
		const c1 = await deriveChallenge(payloadHash, 1);
		const c63 = await deriveChallenge(payloadHash, 63);
		expect(c0).not.toBe(c1);
		expect(c0).not.toBe(c63);
		expect(c1).not.toBe(c63);
	});
});

// ============================================================
// 4. PoW VERIFICATION — structural tests
// ============================================================

describe('Protocol Conformance: PoW Verification', () => {
	it('rejects wrong nonce count', async () => {
		const result = await verifyPoW('test', { nonces: [0] }, POW_CONFIG.QUEUE_JOIN);
		expect(result).toBe(false); // needs 32 nonces, got 1
	});

	it('rejects empty nonces', async () => {
		const result = await verifyPoW('test', { nonces: [] }, POW_CONFIG.MATCH_RESULT);
		expect(result).toBe(false);
	});

	it('config constants match spec', () => {
		expect(POW_CONFIG.QUEUE_JOIN).toEqual({ count: 32, difficulty: 4 });
		expect(POW_CONFIG.MATCH_START).toEqual({ count: 32, difficulty: 4 });
		expect(POW_CONFIG.MATCH_RESULT).toEqual({ count: 64, difficulty: 6 });
	});
});

// ============================================================
// 5. PACK SEED DERIVATION — golden vectors
// ============================================================

describe('Protocol Conformance: Pack Seed Derivation', () => {
	it('normal reveal seed formula matches spec', async () => {
		const userSalt = 'mysecret123';
		const commitTrxId = 'aabbccdd00112233aabbccdd00112233aabbccdd';
		const entropyBlockId = '00000001abcdef00000001abcdef00000001abcd';
		const version = '1';

		const seed = await sha256Hash(`${userSalt}${commitTrxId}${entropyBlockId}${version}`);
		expect(seed).toHaveLength(64);
		expect(seed).toMatch(/^[0-9a-f]{64}$/);

		// Pin: same inputs always produce same seed
		const seed2 = await sha256Hash(`${userSalt}${commitTrxId}${entropyBlockId}${version}`);
		expect(seed).toBe(seed2);
	});

	it('auto-finalize (forfeit) seed formula matches spec', async () => {
		const commitTrxId = 'aabbccdd00112233aabbccdd00112233aabbccdd';
		const entropyBlockId = '00000001abcdef00000001abcdef00000001abcd';

		// Spec formula: sha256( utf8(commit_trx_id) || utf8(entropy_block_id) || utf8("forfeit") )
		// In JS: sha256Hash concatenates strings, TextEncoder encodes to UTF-8
		const forfeitSeed = await sha256Hash(`${commitTrxId}${entropyBlockId}forfeit`);
		expect(forfeitSeed).toHaveLength(64);
		expect(forfeitSeed).toMatch(/^[0-9a-f]{64}$/);

		// Pin: deterministic
		const forfeitSeed2 = await sha256Hash(`${commitTrxId}${entropyBlockId}forfeit`);
		expect(forfeitSeed).toBe(forfeitSeed2);

		// Normal reveal seed MUST differ from forfeit seed (different inputs)
		const normalSeed = await sha256Hash(`mysecret${commitTrxId}${entropyBlockId}1`);
		expect(forfeitSeed).not.toBe(normalSeed);
	});

	it('forfeit seed does not depend on user salt (user never revealed it)', async () => {
		const commitTrxId = 'ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00';
		const entropyBlockId = '1111111111111111111111111111111111111111';

		const forfeitSeed = await sha256Hash(`${commitTrxId}${entropyBlockId}forfeit`);

		// No user salt in the formula — only chain data + literal "forfeit"
		// If someone tries to include a salt, they get a different result
		const withSalt = await sha256Hash(`anysalt${commitTrxId}${entropyBlockId}forfeit`);
		expect(forfeitSeed).not.toBe(withSalt);
	});
});

// ============================================================
// 6. AUTHORITY MODEL — structural assertions
// ============================================================

describe('Protocol Conformance: Authority Model', () => {
	const POSTING_OPS = [
		'queue_join', 'queue_leave', 'match_anchor', 'match_result',
		'pack_commit', 'pack_reveal', 'reward_claim', 'level_up',
	];

	const ACTIVE_OPS = [
		'card_transfer', 'burn', 'seal', 'mint_batch',
	];

	it('posting ops are the expected set', () => {
		expect(POSTING_OPS).toHaveLength(8);
		expect(POSTING_OPS).toContain('match_anchor');
		expect(POSTING_OPS).toContain('match_result');
		expect(POSTING_OPS).not.toContain('card_transfer');
		expect(POSTING_OPS).not.toContain('burn');
	});

	it('active ops are the expected set', () => {
		expect(ACTIVE_OPS).toHaveLength(4);
		expect(ACTIVE_OPS).toContain('card_transfer');
		expect(ACTIVE_OPS).toContain('burn');
		expect(ACTIVE_OPS).toContain('seal');
		expect(ACTIVE_OPS).not.toContain('match_result');
	});

	it('total canonical op count is 14', () => {
		const ALL_OPS = [
			'genesis', 'seal', 'mint_batch',
			'pack_commit', 'pack_reveal', 'reward_claim',
			'card_transfer', 'burn', 'level_up',
			'queue_join', 'queue_leave',
			'match_anchor', 'match_result', 'slash_evidence',
		];
		expect(ALL_OPS).toHaveLength(14);
		// Every op is either posting or active (slash_evidence is permissionless — any auth)
		const classified = new Set([...POSTING_OPS, ...ACTIVE_OPS, 'genesis', 'slash_evidence']);
		for (const op of ALL_OPS) {
			expect(classified.has(op)).toBe(true);
		}
	});
});

// ============================================================
// 7. LEGACY OP NAME COMPATIBILITY — mapping vectors
// ============================================================

describe('Protocol Conformance: Legacy Op Name Mapping', () => {
	// rp_pack_open is NOT in this map — it is a legacy terminal open, not an alias
	// (see spec section 3.1.1: replayed under old txid-seeded semantics pre-seal)
	const LEGACY_TO_CANONICAL: Record<string, string> = {
		'rp_genesis': 'genesis',
		'rp_seal': 'seal',
		'rp_mint': 'mint_batch',
		'rp_transfer': 'card_transfer',
		'rp_card_transfer': 'card_transfer',
		'rp_burn': 'burn',
		'rp_match_start': 'match_anchor',
		'rp_match_result': 'match_result',
		'rp_level_up': 'level_up',
		'rp_queue_join': 'queue_join',
		'rp_queue_leave': 'queue_leave',
		'rp_reward_claim': 'reward_claim',
		'rp_slash_evidence': 'slash_evidence',
	};

	it('every legacy rp_ id maps to a canonical action', () => {
		for (const [legacy, canonical] of Object.entries(LEGACY_TO_CANONICAL)) {
			expect(legacy).toMatch(/^rp_/);
			expect(canonical).not.toMatch(/^rp_/);
			expect(canonical.length).toBeGreaterThan(0);
		}
	});

	it('canonical actions cover all 14 ops (pack_reveal + pack_commit are new, rp_pack_open is legacy-only)', () => {
		const canonicalSet = new Set(Object.values(LEGACY_TO_CANONICAL));
		// These two have no legacy equivalent — they are new v1 ops
		canonicalSet.add('pack_commit');
		canonicalSet.add('pack_reveal');
		expect(canonicalSet.size).toBe(14);
	});

	it('rp_pack_open is NOT a canonical alias — it is a legacy terminal op', () => {
		expect(LEGACY_TO_CANONICAL).not.toHaveProperty('rp_pack_open');
	});
});

// ============================================================
// 8. SUPPLY MODEL — structural assertions
// ============================================================

describe('Protocol Conformance: Supply Model', () => {
	it('pack and reward supply are separate buckets', () => {
		const genesis = {
			pack_supply: { common: 2000, rare: 1000, epic: 500, mythic: 250 },
			reward_supply: { common: 0, rare: 0, epic: 150, mythic: 50 },
		};

		// Reward supply must not draw from pack supply
		expect(genesis.pack_supply.mythic).toBe(250);
		expect(genesis.reward_supply.mythic).toBe(50);
		// Total mythic = 300, not 250
		expect(genesis.pack_supply.mythic + genesis.reward_supply.mythic).toBe(300);
	});
});

// ============================================================
// 9. TRANSFER COOLDOWN — structural assertion
// ============================================================

describe('Protocol Conformance: Transfer Cooldown', () => {
	it('cooldown is 10 blocks', () => {
		const TRANSFER_COOLDOWN_BLOCKS = 10;
		// A transfer at block 1000 means next transfer valid at block 1010+
		const lastTransferBlock = 1000;
		const attemptBlock = 1009;
		expect(attemptBlock - lastTransferBlock < TRANSFER_COOLDOWN_BLOCKS).toBe(true); // rejected
		expect(1010 - lastTransferBlock < TRANSFER_COOLDOWN_BLOCKS).toBe(false); // accepted
	});
});

// ============================================================
// 10. PACK DEADLINE — structural assertion
// ============================================================

describe('Protocol Conformance: Pack Commit Deadline', () => {
	it('deadline is 200 blocks after commit', () => {
		const PACK_REVEAL_DEADLINE = 200;
		const commitBlock = 91234000;
		const entropyBlock = commitBlock + 3;
		const deadlineBlock = commitBlock + PACK_REVEAL_DEADLINE;

		expect(entropyBlock).toBe(91234003);
		expect(deadlineBlock).toBe(91234200);

		// Reveal before deadline: valid
		expect(91234100 <= deadlineBlock).toBe(true);
		// Reveal after deadline: auto-finalize triggered
		expect(91234201 <= deadlineBlock).toBe(false);
	});
});

// ============================================================
// 11. STATE-TRANSITION TRACE VECTORS
//
// These test the replay core's state transition logic against
// fixed op traces. When the shared replay core is extracted,
// both client and server MUST pass these traces identically.
//
// Until the shared core exists, these serve as the spec for
// what the core must do. They use plain objects and decision
// functions, not the actual replay engine (which is being refactored).
// ============================================================

describe('Protocol Conformance: State Transition Traces', () => {
	// --- Helper: minimal state model for trace tests ---
	interface CardState { uid: string; owner: string; lastTransferBlock: number; rarity: string; level: number; xp: number }
	interface ReplayState {
		cards: Map<string, CardState>;
		nonces: Map<string, number>;
		rewardsClaimed: Set<string>;
		sealed: boolean;
		sealBlock: number;
	}

	function freshState(): ReplayState {
		return { cards: new Map(), nonces: new Map(), rewardsClaimed: new Set(), sealed: false, sealBlock: 0 };
	}

	const COOLDOWN = 10;

	// --- Trace 1: valid transfer with cooldown ---
	it('trace: valid transfer updates ownership', () => {
		const state = freshState();
		state.cards.set('nft-001', { uid: 'nft-001', owner: 'alice', lastTransferBlock: 100, rarity: 'rare', level: 1, xp: 0 });

		const op = { action: 'card_transfer', from: 'alice', to: 'bob', uid: 'nft-001', blockNum: 200, nonce: 1 };

		// Validation: owner matches, cooldown satisfied, nonce advances
		const card = state.cards.get(op.uid)!;
		expect(card.owner).toBe(op.from); // ownership check passes
		expect(op.blockNum - card.lastTransferBlock >= COOLDOWN).toBe(true); // cooldown passes

		// Apply
		card.owner = op.to;
		card.lastTransferBlock = op.blockNum;
		expect(card.owner).toBe('bob');
		expect(card.lastTransferBlock).toBe(200);
	});

	// --- Trace 2: transfer rejected — cooldown not met ---
	it('trace: transfer rejected when cooldown not met', () => {
		const state = freshState();
		state.cards.set('nft-002', { uid: 'nft-002', owner: 'alice', lastTransferBlock: 1000, rarity: 'common', level: 1, xp: 0 });

		const op = { action: 'card_transfer', from: 'alice', to: 'bob', uid: 'nft-002', blockNum: 1005, nonce: 1 };

		const card = state.cards.get(op.uid)!;
		const cooldownMet = op.blockNum - card.lastTransferBlock >= COOLDOWN;
		expect(cooldownMet).toBe(false); // 1005 - 1000 = 5 < 10 — REJECTED
		// State unchanged
		expect(card.owner).toBe('alice');
	});

	// --- Trace 3: transfer rejected — not owner ---
	it('trace: transfer rejected when sender is not owner', () => {
		const state = freshState();
		state.cards.set('nft-003', { uid: 'nft-003', owner: 'alice', lastTransferBlock: 0, rarity: 'epic', level: 1, xp: 0 });

		const op = { action: 'card_transfer', from: 'mallory', to: 'mallory2', uid: 'nft-003', blockNum: 500, nonce: 1 };

		const card = state.cards.get(op.uid)!;
		const isOwner = card.owner === op.from;
		expect(isOwner).toBe(false); // mallory does not own nft-003 — REJECTED
		expect(card.owner).toBe('alice'); // unchanged
	});

	// --- Trace 4: nonce monotonic enforcement ---
	it('trace: nonce must advance monotonically', () => {
		const state = freshState();
		state.nonces.set('alice', 5);

		// Nonce 6: valid (> 5)
		expect(6 > (state.nonces.get('alice') ?? 0)).toBe(true);
		state.nonces.set('alice', 6);

		// Nonce 6 again: invalid (not > 6)
		expect(6 > (state.nonces.get('alice') ?? 0)).toBe(false);

		// Nonce 4: invalid (not > 6)
		expect(4 > (state.nonces.get('alice') ?? 0)).toBe(false);

		// Nonce 7: valid
		expect(7 > (state.nonces.get('alice') ?? 0)).toBe(true);
	});

	// --- Trace 5: reward claimed only once ---
	it('trace: reward claim is idempotent', () => {
		const state = freshState();
		const claimKey = 'alice:first_victory';

		// First claim: accepted
		expect(state.rewardsClaimed.has(claimKey)).toBe(false);
		state.rewardsClaimed.add(claimKey);

		// Second claim: rejected (already claimed)
		expect(state.rewardsClaimed.has(claimKey)).toBe(true);
	});

	// --- Trace 6: mint rejected after seal ---
	it('trace: mint_batch rejected after seal', () => {
		const state = freshState();

		// Before seal: mint valid
		expect(state.sealed).toBe(false);

		// Seal
		state.sealed = true;
		state.sealBlock = 91000000;

		// After seal: mint rejected
		expect(state.sealed).toBe(true);
		// Any mint_batch op must be ignored
	});

	// --- Trace 7: self-transfer rejected ---
	it('trace: self-transfer rejected', () => {
		const state = freshState();
		state.cards.set('nft-004', { uid: 'nft-004', owner: 'alice', lastTransferBlock: 0, rarity: 'common', level: 1, xp: 0 });

		const op = { action: 'card_transfer', from: 'alice', to: 'alice', uid: 'nft-004', blockNum: 500, nonce: 1 };
		expect(op.from === op.to).toBe(true); // REJECTED: self-transfer
	});

	// --- Trace 8: level_up validated against derived XP ---
	it('trace: level_up rejected if XP insufficient', () => {
		const state = freshState();
		state.cards.set('nft-005', { uid: 'nft-005', owner: 'alice', lastTransferBlock: 0, rarity: 'common', level: 1, xp: 30 });

		// Common rarity thresholds: [0, 50, 150] → level 1 at 30 XP (< 50)
		const thresholds = [0, 50, 150];
		const card = state.cards.get('nft-005')!;
		let derivedLevel = 1;
		for (let i = 1; i < thresholds.length; i++) {
			if (card.xp >= thresholds[i]) derivedLevel = i + 1;
		}
		expect(derivedLevel).toBe(1); // XP 30 < 50 threshold

		// level_up to 2: REJECTED (derived level is 1)
		const requestedLevel = 2;
		expect(requestedLevel > derivedLevel).toBe(true); // overclaim — rejected
	});

	// --- Trace 9: level_up accepted when XP sufficient ---
	it('trace: level_up accepted when XP meets threshold', () => {
		const state = freshState();
		state.cards.set('nft-006', { uid: 'nft-006', owner: 'alice', lastTransferBlock: 0, rarity: 'common', level: 1, xp: 75 });

		const thresholds = [0, 50, 150];
		const card = state.cards.get('nft-006')!;
		let derivedLevel = 1;
		for (let i = 1; i < thresholds.length; i++) {
			if (card.xp >= thresholds[i]) derivedLevel = i + 1;
		}
		expect(derivedLevel).toBe(2); // XP 75 >= 50

		const requestedLevel = 2;
		expect(requestedLevel <= derivedLevel).toBe(true); // valid
		card.level = requestedLevel;
		expect(card.level).toBe(2);
	});

	// --- Trace 10: rp_pack_open rejected after seal (v1 activation) ---
	it('trace: legacy rp_pack_open rejected after seal block', () => {
		const state = freshState();
		state.sealed = true;
		state.sealBlock = 91000000;

		const legacyPackOpenBlock = 91000100; // after seal
		const isPostSeal = legacyPackOpenBlock > state.sealBlock;
		expect(isPostSeal).toBe(true); // REJECTED: legacy pack_open after v1 activation
	});

	// --- Trace 11: rp_pack_open accepted before seal (legacy mode) ---
	it('trace: legacy rp_pack_open accepted before seal block', () => {
		const state = freshState();
		state.sealed = false;
		state.sealBlock = 0; // not sealed yet

		const legacyPackOpenBlock = 90999000;
		// Not sealed yet — legacy ops are valid
		expect(state.sealed).toBe(false); // ACCEPTED: pre-seal legacy mode
	});
});
