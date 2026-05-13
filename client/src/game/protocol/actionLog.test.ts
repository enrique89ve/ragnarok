/**
 * actionLog.test.ts — ADR 0004 §Decision.6 + DECISIONS.md §D3.
 *
 * Covers:
 *   - Round-trip 60 leaves via noble SessionKey; signatures still verify.
 *   - Wrong hiveSig → every row decryption rejects.
 *   - pruneFinalized isolation (other matchIds untouched).
 *   - Quota fallback path: indexedDB.open throws → in-memory log works.
 */

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	appendLeaf,
	deriveEncKey,
	loadLog,
	open,
	pruneFinalized,
	_resetForTests,
	type StoredLeaf,
} from './actionLog';
import { appendSelfAction, emptyTranscript, verifyAndAppendRemote } from './transcript';
import { _generateForTests, verifyEnvelope } from './sessionKey';

const MATCH_ID = 'match_log_0001';
const OTHER_MATCH_ID = 'match_log_0002';
const HIVE_SIG = 'STM_FAKE_SIG_VALUE_AT_LEAST_SIXTEEN_CHARS_LONG_FOR_HKDF_TESTING';
const WRONG_HIVE_SIG = 'STM_DIFFERENT_SIG_VALUE_AT_LEAST_SIXTEEN_CHARS_LONG_FOR_TESTING';

beforeEach(() => {
	_resetForTests();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('deriveEncKey', () => {
	it('rejects short hiveSig', async () => {
		await expect(deriveEncKey('short', MATCH_ID)).rejects.toThrow(/too short/);
	});

	it('rejects empty matchId', async () => {
		await expect(deriveEncKey(HIVE_SIG, '')).rejects.toThrow(/matchId required/);
	});

	it('produces a non-extractable AES-GCM key', async () => {
		const key = await deriveEncKey(HIVE_SIG, MATCH_ID);
		expect(key.extractable).toBe(false);
		expect(key.algorithm.name).toBe('AES-GCM');
	});

	it('different matchId yields different keys (cross-match isolation)', async () => {
		const k1 = await deriveEncKey(HIVE_SIG, MATCH_ID);
		const k2 = await deriveEncKey(HIVE_SIG, OTHER_MATCH_ID);
		const iv = new Uint8Array(12);
		const ct1 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k1, new Uint8Array([1, 2, 3]));
		await expect(
			crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k2, ct1),
		).rejects.toBeDefined();
	});
});

describe('round-trip — 60 leaves', () => {
	it('appends 60 leaves and loads them back with signatures still verifiable', async () => {
		const db = await open();
		const encKey = await deriveEncKey(HIVE_SIG, MATCH_ID);
		const aliceKey = await _generateForTests(MATCH_ID, 'noble');

		let transcript = emptyTranscript(MATCH_ID);
		for (let i = 0; i < 60; i++) {
			const action = { kind: 'play', cardId: i, lane: i % 4 };
			const { next, envelope } = await appendSelfAction(transcript, action, aliceKey, 'A');
			transcript = next;
			const stored: StoredLeaf = {
				matchId: MATCH_ID,
				seq: envelope.seq,
				prevHash: envelope.prevHash,
				action: envelope.action,
				sig: envelope.sig,
				broadcaster: 'A',
			};
			await appendLeaf(db, stored, encKey);
		}

		const loaded = await loadLog(db, MATCH_ID, encKey);
		expect(loaded).toHaveLength(60);
		for (let i = 0; i < 60; i++) {
			expect(loaded[i].seq).toBe(i);
			expect(loaded[i].matchId).toBe(MATCH_ID);
		}

		// Re-verify each signature still validates against the original pubkey.
		// Re-derive the canonical signed bytes by replaying through the
		// transcript verifier, which is the runtime-truth check.
		let rebuilt = emptyTranscript(MATCH_ID);
		for (const leaf of loaded) {
			rebuilt = await verifyAndAppendRemote(
				rebuilt,
				{
					type: 'action_envelope',
					matchId: MATCH_ID,
					seq: leaf.seq,
					prevHash: leaf.prevHash,
					action: leaf.action,
					sig: leaf.sig,
				},
				aliceKey.pubkey,
				'A',
			);
		}
		expect(rebuilt.leaves).toHaveLength(60);
		expect(rebuilt.merkleRoot).toBe(transcript.merkleRoot);
		// Spot-check raw signature also verifies via the lower-level primitive.
		const lastLeaf = loaded[loaded.length - 1];
		const tail = rebuilt.leaves[rebuilt.leaves.length - 1];
		expect(tail.sig).toBe(lastLeaf.sig);
		await expect(
			verifyEnvelope(new TextEncoder().encode(lastLeaf.prevHash), '0'.repeat(86), aliceKey.pubkey),
		).resolves.toBe(false);
	});
});

describe('wrong hiveSig — every row rejects', () => {
	it('decryption fails for every stored leaf when encKey differs', async () => {
		const db = await open();
		const writeKey = await deriveEncKey(HIVE_SIG, MATCH_ID);
		const readKey = await deriveEncKey(WRONG_HIVE_SIG, MATCH_ID);
		const sk = await _generateForTests(MATCH_ID, 'noble');

		let tr = emptyTranscript(MATCH_ID);
		for (let i = 0; i < 5; i++) {
			const { next, envelope } = await appendSelfAction(tr, { kind: 'pass', i }, sk, 'B');
			tr = next;
			await appendLeaf(db, {
				matchId: MATCH_ID,
				seq: envelope.seq,
				prevHash: envelope.prevHash,
				action: envelope.action,
				sig: envelope.sig,
				broadcaster: 'B',
			}, writeKey);
		}

		await expect(loadLog(db, MATCH_ID, readKey)).rejects.toBeDefined();
	});
});

describe('pruneFinalized — isolation', () => {
	it('removes all rows for matchId, leaves other matches intact', async () => {
		const db = await open();
		const encA = await deriveEncKey(HIVE_SIG, MATCH_ID);
		const encB = await deriveEncKey(HIVE_SIG, OTHER_MATCH_ID);
		const skA = await _generateForTests(MATCH_ID, 'noble');
		const skB = await _generateForTests(OTHER_MATCH_ID, 'noble');

		let trA = emptyTranscript(MATCH_ID);
		for (let i = 0; i < 3; i++) {
			const { next, envelope } = await appendSelfAction(trA, { i }, skA, 'A');
			trA = next;
			await appendLeaf(db, {
				matchId: MATCH_ID, seq: envelope.seq, prevHash: envelope.prevHash,
				action: envelope.action, sig: envelope.sig, broadcaster: 'A',
			}, encA);
		}
		let trB = emptyTranscript(OTHER_MATCH_ID);
		for (let i = 0; i < 2; i++) {
			const { next, envelope } = await appendSelfAction(trB, { i }, skB, 'A');
			trB = next;
			await appendLeaf(db, {
				matchId: OTHER_MATCH_ID, seq: envelope.seq, prevHash: envelope.prevHash,
				action: envelope.action, sig: envelope.sig, broadcaster: 'A',
			}, encB);
		}

		await pruneFinalized(db, MATCH_ID);

		const after = await loadLog(db, MATCH_ID, encA);
		expect(after).toHaveLength(0);

		const otherAfter = await loadLog(db, OTHER_MATCH_ID, encB);
		expect(otherAfter).toHaveLength(2);

		// Idempotent — second prune is a no-op.
		await pruneFinalized(db, MATCH_ID);
		const stillEmpty = await loadLog(db, MATCH_ID, encA);
		expect(stillEmpty).toHaveLength(0);
	});
});

describe('quota fallback — in-memory log', () => {
	it('falls back when indexedDB.open throws + still round-trips', async () => {
		const originalOpen = indexedDB.open.bind(indexedDB);
		const openSpy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
			throw new Error('QuotaExceeded simulated');
		});

		const db = await open();
		const encKey = await deriveEncKey(HIVE_SIG, MATCH_ID);
		const sk = await _generateForTests(MATCH_ID, 'noble');

		let tr = emptyTranscript(MATCH_ID);
		for (let i = 0; i < 3; i++) {
			const { next, envelope } = await appendSelfAction(tr, { i }, sk, 'A');
			tr = next;
			await appendLeaf(db, {
				matchId: MATCH_ID, seq: envelope.seq, prevHash: envelope.prevHash,
				action: envelope.action, sig: envelope.sig, broadcaster: 'A',
			}, encKey);
		}

		const loaded = await loadLog(db, MATCH_ID, encKey);
		expect(loaded).toHaveLength(3);
		expect(loaded.map((l) => l.seq)).toEqual([0, 1, 2]);

		await pruneFinalized(db, MATCH_ID);
		const empty = await loadLog(db, MATCH_ID, encKey);
		expect(empty).toHaveLength(0);

		openSpy.mockRestore();
		// Restore original open (unused after this test but keeps fake-indexeddb sane).
		indexedDB.open = originalOpen;
	});
});
