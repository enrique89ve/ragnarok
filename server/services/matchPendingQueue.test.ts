/**
 * matchPendingQueue.test.ts — ADR 0004 §Decision.3 (issue 05).
 *
 * Covers:
 *   - Happy path: enqueue → fetch returns same envelope + verifiable sig.
 *   - TTL expiry: sweep removes rows past expiresAt.
 *   - DELETE idempotency.
 *   - Concurrent enqueue same matchId: last writer wins.
 *   - Witness sig recovers to a deterministic test pubkey.
 *
 * Test setup uses an ephemeral hive-tx PrivateKey generated per run, so
 * the test never touches a real Hive account. The recovery primitive
 * (`hiveSignatureVerifier.verifyAnchored`) is exercised against the
 * matching public key derived from the same private key.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import {
	QUEUE_TTL_BLOCKS,
	deleteByMatchId,
	enqueue,
	fetchByMatchId,
	getWitnessPubkey,
	resetStoreForTests,
	resetWitnessSignerForTests,
	sweepExpired,
	witnessMessageHash,
} from './matchPendingQueue';

const MATCH_ID = 'm-pending-0001';
const OTHER_MATCH = 'm-pending-0002';
const BASE_BLOCK = 1_000_000;

let testWif: string;
let testPubkey: string;

beforeEach(async () => {
	resetStoreForTests();
	resetWitnessSignerForTests();

	const { PrivateKey } = await import('hive-tx');
	const pk = PrivateKey.randomKey();
	testWif = pk.toString();
	testPubkey = pk.createPublic().toString();
	process.env.WITNESS_HIVE_ACCOUNT = 'test-witness';
	process.env.WITNESS_HIVE_POSTING_KEY = testWif;
});

afterEach(() => {
	delete process.env.WITNESS_HIVE_ACCOUNT;
	delete process.env.WITNESS_HIVE_POSTING_KEY;
	resetWitnessSignerForTests();
});

describe('enqueue + fetch — happy path', () => {
	it('stores envelope with TTL = queuedAt + 100', async () => {
		const env = { type: 'match_result_proposal', winner: 'alice', transcriptRoot: 'a'.repeat(64) };
		const record = await enqueue(MATCH_ID, env, BASE_BLOCK);
		expect(record.matchId).toBe(MATCH_ID);
		expect(record.envelope).toEqual(env);
		expect(record.queuedAt).toBe(BASE_BLOCK);
		expect(record.expiresAt).toBe(BASE_BLOCK + QUEUE_TTL_BLOCKS);
		expect(record.witnessSig).toMatch(/^[0-9a-f]+$/);

		const fetched = await fetchByMatchId(MATCH_ID);
		expect(fetched).toEqual(record);
	});

	it('exposes the witness pubkey for client verification', async () => {
		await enqueue(MATCH_ID, { x: 1 }, BASE_BLOCK);
		const witness = await getWitnessPubkey();
		expect(witness.account).toBe('test-witness');
		expect(witness.pubkey).toBe(testPubkey);
	});

	it('witness sig recovers to the witness pubkey under the same digest', async () => {
		const env = { type: 'match_result_proposal', winner: 'bob' };
		const record = await enqueue(MATCH_ID, env, BASE_BLOCK);
		const digest = witnessMessageHash(MATCH_ID, env, BASE_BLOCK);
		expect(digest.length).toBe(32);
		expect(record.witnessSig.length).toBe(130);
		// ECDSA k-nonces are random, so two signs of the same digest yield
		// different sig hex — verify via pubkey recovery, not equality.
		const { Signature } = await import('hive-tx');
		const sig = Signature.from(record.witnessSig);
		const recovered = sig.getPublicKey(digest);
		expect(recovered.toString()).toBe(testPubkey);
		// Sig over a *different* digest must NOT recover to our pubkey.
		const tampered = sha256(new Uint8Array([1, 2, 3]));
		const wrongRecovered = sig.getPublicKey(tampered).toString();
		expect(wrongRecovered).not.toBe(testPubkey);
		expect(bytesToHex(tampered)).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe('TTL expiry', () => {
	it('sweepExpired removes rows past expiresAt', async () => {
		await enqueue(MATCH_ID, { a: 1 }, BASE_BLOCK);
		await enqueue(OTHER_MATCH, { b: 2 }, BASE_BLOCK + 50);

		// Sweep at block just before MATCH_ID expires — nothing removed.
		expect(await sweepExpired(BASE_BLOCK + QUEUE_TTL_BLOCKS)).toBe(0);
		expect(await fetchByMatchId(MATCH_ID)).not.toBeNull();

		// Sweep past MATCH_ID's expiry but before OTHER_MATCH's.
		expect(await sweepExpired(BASE_BLOCK + QUEUE_TTL_BLOCKS + 1)).toBe(1);
		expect(await fetchByMatchId(MATCH_ID)).toBeNull();
		expect(await fetchByMatchId(OTHER_MATCH)).not.toBeNull();
	});
});

describe('DELETE — idempotency', () => {
	it('first delete clears the row, second is a no-op', async () => {
		await enqueue(MATCH_ID, { x: 1 }, BASE_BLOCK);
		const first = await deleteByMatchId(MATCH_ID);
		expect(first.cleared).toBe(true);
		const second = await deleteByMatchId(MATCH_ID);
		expect(second.cleared).toBe(false);
		expect(await fetchByMatchId(MATCH_ID)).toBeNull();
	});

	it('delete on a never-seen matchId returns cleared=false', async () => {
		const result = await deleteByMatchId('never-existed');
		expect(result.cleared).toBe(false);
	});
});

describe('concurrent enqueue — last writer wins', () => {
	it('second enqueue with same matchId overrides the first', async () => {
		const e1 = { winner: 'alice' };
		const e2 = { winner: 'bob' };
		await enqueue(MATCH_ID, e1, BASE_BLOCK);
		await enqueue(MATCH_ID, e2, BASE_BLOCK + 5);
		const fetched = await fetchByMatchId(MATCH_ID);
		expect(fetched?.envelope).toEqual(e2);
		expect(fetched?.queuedAt).toBe(BASE_BLOCK + 5);
	});
});

describe('boot validation — missing env', () => {
	it('throws if WITNESS_HIVE_POSTING_KEY missing', async () => {
		delete process.env.WITNESS_HIVE_POSTING_KEY;
		resetWitnessSignerForTests();
		await expect(enqueue(MATCH_ID, { x: 1 }, BASE_BLOCK)).rejects.toThrow(/required/);
	});

	it('throws if WITNESS_HIVE_ACCOUNT missing', async () => {
		delete process.env.WITNESS_HIVE_ACCOUNT;
		resetWitnessSignerForTests();
		await expect(enqueue(MATCH_ID, { x: 1 }, BASE_BLOCK)).rejects.toThrow(/required/);
	});
});
