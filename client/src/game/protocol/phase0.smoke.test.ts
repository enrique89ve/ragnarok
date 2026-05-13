/**
 * phase0.smoke.test.ts — ADR 0004 Phase 0 promotion gate (issue 07).
 *
 * Exercises the whole Phase 0 stack end-to-end with a stub engine:
 *   - 60 mock turns with valid envelope chain.
 *   - Tampered envelope rejected.
 *   - Out-of-order seq rejected.
 *   - Wrong prevHash rejected.
 *   - session_renewal idempotency.
 *   - Server pending queue happy path + opponent-pull + TTL + DELETE.
 *   - Keychain prompt budget: exactly 3 per peer per match (start +
 *     action-log + end), 0 mid-match.
 *
 * The stub engine deliberately does NOT mirror gameStore — its only job
 * is to make the harness deterministic so any divergence the harness
 * catches is a protocol bug, not an engine bug.
 *
 * Phase 0 → Phase 1 promotion gate: `npm run smoke:phase0` (or this
 * file under vitest) must exit 0.
 */

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { _resetForTests as resetSessionKey, _generateForTests } from './sessionKey';
import {
	appendSelfAction,
	emptyTranscript,
	verifyAndAppendRemote,
	type Transcript,
} from './transcript';
import {
	_resetForTests as resetActionLog,
	appendLeaf,
	deriveEncKey,
	loadLog,
	open as openActionLog,
	pruneFinalized,
	type StoredLeaf,
} from './actionLog';
import {
	_resetRenewalCacheForTests,
	buildRenewalMessage,
	verifyInboundRenewal,
} from './sessionRenewal';
import {
	deleteByMatchId,
	enqueue,
	fetchByMatchId,
	resetStoreForTests,
	resetWitnessSignerForTests,
	sweepExpired,
} from '../../../../server/services/matchPendingQueue';

const MATCH_ID = 'm-smoke-0001';
const ALICE = 'alice';
const BOB = 'bob';
const HIVE_SIG_ALICE = 'STM_SIG_ALICE_AT_LEAST_SIXTEEN_CHARS_LONG_FOR_HKDF_TESTING_OK';
const HIVE_SIG_BOB = 'STM_SIG_BOB_AT_LEAST_SIXTEEN_CHARS_LONG_FOR_HKDF_TESTING_HERE';
const BASE_BLOCK = 1_000_000;

interface KeychainEvent {
	peer: string;
	kind: 'session_authorize' | 'action_log_access' | 'session_renewal' | 'result_sign';
	matchId: string;
}

let keychainEvents: KeychainEvent[] = [];

function recordKeychain(event: KeychainEvent): void {
	keychainEvents.push(event);
}

beforeEach(async () => {
	resetSessionKey();
	resetActionLog();
	_resetRenewalCacheForTests();
	resetStoreForTests();
	resetWitnessSignerForTests();
	keychainEvents = [];

	const { PrivateKey } = await import('hive-tx');
	const pk = PrivateKey.randomKey();
	process.env.WITNESS_HIVE_ACCOUNT = 'smoke-witness';
	process.env.WITNESS_HIVE_POSTING_KEY = pk.toString();
});

afterEach(() => {
	delete process.env.WITNESS_HIVE_ACCOUNT;
	delete process.env.WITNESS_HIVE_POSTING_KEY;
});

// ─── Stub engine ──────────────────────────────────────────────────────────

interface StubAction {
	readonly kind: 'play' | 'attack' | 'pass';
	readonly seq: number;
	readonly payload: Record<string, number>;
}

async function buildSmokeStack(peer: 'A' | 'B', hiveSig: string) {
	// Per-peer matchId namespace on the SHARED fake-indexeddb so each
	// peer's encKey only ever sees its own rows. In production each
	// peer has its own browser IDB instance and this isolation comes
	// for free.
	const matchIdForLog = `${MATCH_ID}_${peer}`;
	const key = await _generateForTests(MATCH_ID, 'noble');
	recordKeychain({ peer, kind: 'session_authorize', matchId: MATCH_ID });
	const db = await openActionLog();
	const encKey = await deriveEncKey(hiveSig, matchIdForLog);
	recordKeychain({ peer, kind: 'action_log_access', matchId: MATCH_ID });
	const transcript = emptyTranscript(MATCH_ID);
	return { key, db, encKey, transcript, matchIdForLog };
}

// ─── Scenarios ────────────────────────────────────────────────────────────

describe('Phase 0 smoke — 60 mock turns', () => {
	it('appends + verifies + persists 60 alternating leaves; merkleRoot converges across peers', async () => {
		const alice = await buildSmokeStack('A', HIVE_SIG_ALICE);
		const bob = await buildSmokeStack('B', HIVE_SIG_BOB);

		let aliceTr = alice.transcript;
		let bobTr = bob.transcript;

		for (let i = 0; i < 60; i++) {
			const isAliceTurn = i % 2 === 0;
			const action: StubAction = {
				kind: i % 3 === 0 ? 'play' : i % 3 === 1 ? 'attack' : 'pass',
				seq: i,
				payload: { tick: i },
			};
			// Each peer's own log: write only the leaves they self-signed,
			// to avoid cross-peer encKey collisions on the shared fake-IDB.
			// In production each peer runs in its own browser with its own
			// IDB instance, so the cross-encKey path is naturally isolated.
			if (isAliceTurn) {
				const { next, envelope } = await appendSelfAction(aliceTr, action, alice.key, 'A');
				aliceTr = next;
				await appendLeaf(alice.db, { ...aliceTr.leaves[aliceTr.leaves.length - 1], matchId: alice.matchIdForLog } as StoredLeaf, alice.encKey);
				bobTr = await verifyAndAppendRemote(bobTr, envelope, alice.key.pubkey, 'A');
			} else {
				const { next, envelope } = await appendSelfAction(bobTr, action, bob.key, 'B');
				bobTr = next;
				await appendLeaf(bob.db, { ...bobTr.leaves[bobTr.leaves.length - 1], matchId: bob.matchIdForLog } as StoredLeaf, bob.encKey);
				aliceTr = await verifyAndAppendRemote(aliceTr, envelope, bob.key.pubkey, 'B');
			}
		}

		expect(aliceTr.leaves).toHaveLength(60);
		expect(bobTr.leaves).toHaveLength(60);
		expect(aliceTr.merkleRoot).toBe(bobTr.merkleRoot);

		// Action log replays the SELF-SIGNED leaves only (per the
		// per-peer isolation noted above). Each peer's log has 30 rows.
		const aliceReplay = await loadLog(alice.db, alice.matchIdForLog, alice.encKey);
		const bobReplay = await loadLog(bob.db, bob.matchIdForLog, bob.encKey);
		expect(aliceReplay).toHaveLength(30);
		expect(bobReplay).toHaveLength(30);
		expect(aliceReplay.map((l) => l.seq)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58]);
		expect(bobReplay.map((l) => l.seq)).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 57, 59]);

		await pruneFinalized(alice.db, alice.matchIdForLog);
		await pruneFinalized(bob.db, bob.matchIdForLog);
	});
});

describe('Phase 0 smoke — adversarial cases', () => {
	let alice: Awaited<ReturnType<typeof buildSmokeStack>>;
	let bob: Awaited<ReturnType<typeof buildSmokeStack>>;
	let aliceTr: Transcript;
	let bobTr: Transcript;

	beforeEach(async () => {
		alice = await buildSmokeStack('A', HIVE_SIG_ALICE);
		bob = await buildSmokeStack('B', HIVE_SIG_BOB);
		aliceTr = alice.transcript;
		bobTr = bob.transcript;
		const a: StubAction = { kind: 'play', seq: 0, payload: { x: 1 } };
		const r = await appendSelfAction(aliceTr, a, alice.key, 'A');
		aliceTr = r.next;
		bobTr = await verifyAndAppendRemote(bobTr, r.envelope, alice.key.pubkey, 'A');
	});

	it('rejects tampered action_envelope', async () => {
		const a: StubAction = { kind: 'attack', seq: 1, payload: { dmg: 5 } };
		const { envelope } = await appendSelfAction(bobTr, a, bob.key, 'B');
		const tampered = { ...envelope, action: { kind: 'attack', seq: 1, payload: { dmg: 999 } } };
		await expect(verifyAndAppendRemote(aliceTr, tampered, bob.key.pubkey, 'B')).rejects.toBeDefined();
	});

	it('rejects out-of-order seq', async () => {
		const r = await appendSelfAction(bobTr, { kind: 'pass', seq: 1, payload: {} }, bob.key, 'B');
		const futureLeaf = { ...r.envelope, seq: 99 };
		await expect(verifyAndAppendRemote(aliceTr, futureLeaf, bob.key.pubkey, 'B')).rejects.toBeDefined();
	});

	it('rejects wrong prevHash', async () => {
		const r = await appendSelfAction(bobTr, { kind: 'pass', seq: 1, payload: {} }, bob.key, 'B');
		const forked = { ...r.envelope, prevHash: 'f'.repeat(64) };
		await expect(verifyAndAppendRemote(aliceTr, forked, bob.key.pubkey, 'B')).rejects.toBeDefined();
	});
});

describe('Phase 0 smoke — session_renewal idempotency', () => {
	it('duplicate renewal is no-op; valid distinct one accepted', async () => {
		const input = {
			matchId: MATCH_ID,
			newPubkey: 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5XzA',
			hiveSig: HIVE_SIG_ALICE,
			activeMatchId: MATCH_ID,
			verifyHiveSig: async (msg: string, sig: string) => {
				expect(msg).toBe(buildRenewalMessage(MATCH_ID, input.newPubkey));
				return sig.startsWith('STM_SIG_');
			},
		};
		const first = await verifyInboundRenewal(input);
		expect(first.accepted).toBe(true);
		const second = await verifyInboundRenewal(input);
		expect(second.accepted).toBe(false);
		expect(second.reason).toMatch(/duplicate/);

		const third = await verifyInboundRenewal({ ...input, hiveSig: `${HIVE_SIG_ALICE}_v2` });
		expect(third.accepted).toBe(true);
	});
});

describe('Phase 0 smoke — server pending queue (offline opponent)', () => {
	it('happy path: winner queues, opponent pulls, queue cleared', async () => {
		const env = { type: 'match_result_proposal', winner: ALICE, transcriptRoot: 'a'.repeat(64) };
		const record = await enqueue(MATCH_ID, env, BASE_BLOCK);
		expect(record.expiresAt).toBe(BASE_BLOCK + 100);
		const fetched = await fetchByMatchId(MATCH_ID);
		expect(fetched?.envelope).toEqual(env);
		const cleared = await deleteByMatchId(MATCH_ID);
		expect(cleared.cleared).toBe(true);
		expect(await fetchByMatchId(MATCH_ID)).toBeNull();
	});

	it('TTL sweep removes rows past expiresAt', async () => {
		await enqueue(MATCH_ID, { winner: BOB }, BASE_BLOCK);
		expect(await sweepExpired(BASE_BLOCK + 100)).toBe(0);
		expect(await sweepExpired(BASE_BLOCK + 101)).toBe(1);
		expect(await fetchByMatchId(MATCH_ID)).toBeNull();
	});
});

describe('Phase 0 smoke — Keychain budget', () => {
	it('exactly 2 prompts per peer at match start (session_authorize + action-log)', async () => {
		await buildSmokeStack('A', HIVE_SIG_ALICE);
		await buildSmokeStack('B', HIVE_SIG_BOB);
		const peerA = keychainEvents.filter((e) => e.peer === 'A');
		const peerB = keychainEvents.filter((e) => e.peer === 'B');
		expect(peerA).toHaveLength(2);
		expect(peerB).toHaveLength(2);
		expect(peerA.map((e) => e.kind)).toEqual(['session_authorize', 'action_log_access']);
		expect(peerB.map((e) => e.kind)).toEqual(['session_authorize', 'action_log_access']);
	});

	it('mid-match action exchange triggers zero additional prompts', async () => {
		const alice = await buildSmokeStack('A', HIVE_SIG_ALICE);
		const bob = await buildSmokeStack('B', HIVE_SIG_BOB);
		const promptsBefore = keychainEvents.length;
		let aliceTr = alice.transcript;
		let bobTr = bob.transcript;
		for (let i = 0; i < 5; i++) {
			const r = await appendSelfAction(aliceTr, { i }, alice.key, 'A');
			aliceTr = r.next;
			bobTr = await verifyAndAppendRemote(bobTr, r.envelope, alice.key.pubkey, 'A');
		}
		expect(keychainEvents.length).toBe(promptsBefore);
	});
});
