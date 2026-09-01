/**
 * transcript.test.ts — ADR 0004 §Decision.4 conformance.
 *
 * Covers:
 *   - Empty transcript: merkleRoot = zero sentinel.
 *   - 1-leaf root = sha256(canonical(leaf)).
 *   - 2-leaf root = sha256(h(L0) || h(L1)) over raw bytes.
 *   - Odd-count level duplicates the last leaf (3-leaf shape).
 *   - Verifier rejects: tampered action, non-monotonic seq, wrong prevHash,
 *     unknown broadcaster, foreign matchId.
 *   - Two peers running 60 mock turns converge to the same merkleRoot.
 */

import { describe, it, expect } from 'vitest';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { canonicalize } from './canonicalJson';
import { generateSessionKey } from './sessionKey';
import {
	appendSelfAction,
	computeMerkleRoot,
	emptyTranscript,
	verifyAndAppendRemote,
	_internalsForTests,
	type ActionEnvelopeWire,
	type Transcript,
} from './transcript';

const MATCH_ID = 'match_transcript_0001';
const ENCODER = new TextEncoder();

function sha256Hex(s: string): string {
	return bytesToHex(sha256(ENCODER.encode(s)));
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
}

function hexToBytes(hex: string): Uint8Array {
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}

describe('emptyTranscript', () => {
	it('starts with zero leaves and a zero merkleRoot', () => {
		const tr = emptyTranscript(MATCH_ID);
		expect(tr.matchId).toBe(MATCH_ID);
		expect(tr.leaves.length).toBe(0);
		expect(tr.merkleRoot).toBe('0'.repeat(64));
	});

	it('rejects empty matchId', () => {
		expect(() => emptyTranscript('')).toThrow(/matchId/);
	});
});

describe('appendSelfAction → wire envelope', () => {
	it('produces an envelope whose sig verifies against the broadcaster pubkey', async () => {
		const key = await generateSessionKey(MATCH_ID);
		const tr0 = emptyTranscript(MATCH_ID);
		const action = { type: 'playCard', cardId: 'c-1' };

		const { next, envelope } = await appendSelfAction(tr0, action, key, 'A');
		expect(envelope.type).toBe('action_envelope');
		expect(envelope.matchId).toBe(MATCH_ID);
		expect(envelope.seq).toBe(0);
		expect(envelope.prevHash).toBe('0'.repeat(64));
		expect(envelope.action).toEqual(action);
		expect(envelope.sig).toMatch(/^[A-Za-z0-9_-]{86}$/);

		expect(next.leaves.length).toBe(1);
		expect(next.leaves[0].sig).toBe(envelope.sig);
		expect(next.merkleRoot).not.toBe('0'.repeat(64));
	});

	it('chains prevHash from each appended leaf to the next envelope', async () => {
		const key = await generateSessionKey(MATCH_ID);
		const tr0 = emptyTranscript(MATCH_ID);
		const { next: tr1 } = await appendSelfAction(tr0, { type: 'a' }, key, 'A');
		const { envelope: env2 } = await appendSelfAction(tr1, { type: 'b' }, key, 'A');
		const expectedPrev = _internalsForTests.leafHashHex(tr1.leaves[0]);
		expect(env2.seq).toBe(1);
		expect(env2.prevHash).toBe(expectedPrev);
	});

	it('rejects when sessionKey.matchId disagrees with the transcript', async () => {
		const key = await generateSessionKey('other-match');
		const tr = emptyTranscript(MATCH_ID);
		await expect(appendSelfAction(tr, {}, key, 'A')).rejects.toThrow(/matchId mismatch/);
	});
});

describe('computeMerkleRoot — pinned shapes', () => {
	it('returns zero hash for an empty transcript', () => {
		expect(computeMerkleRoot(emptyTranscript(MATCH_ID))).toBe('0'.repeat(64));
	});

	it('1-leaf root equals sha256(canonical(leaf))', async () => {
		const key = await generateSessionKey(MATCH_ID);
		const { next } = await appendSelfAction(emptyTranscript(MATCH_ID), { x: 1 }, key, 'A');
		const expected = sha256Hex(canonicalize({
			seq: next.leaves[0].seq,
			prevHash: next.leaves[0].prevHash,
			action: next.leaves[0].action,
			sig: next.leaves[0].sig,
			broadcaster: next.leaves[0].broadcaster,
		}));
		expect(next.merkleRoot).toBe(expected);
	});

	it('2-leaf root equals sha256(h(L0) || h(L1)) over raw bytes', async () => {
		const key = await generateSessionKey(MATCH_ID);
		let tr: Transcript = emptyTranscript(MATCH_ID);
		({ next: tr } = await appendSelfAction(tr, { x: 1 }, key, 'A'));
		({ next: tr } = await appendSelfAction(tr, { x: 2 }, key, 'A'));
		const h0 = _internalsForTests.leafHashHex(tr.leaves[0]);
		const h1 = _internalsForTests.leafHashHex(tr.leaves[1]);
		const expected = bytesToHex(sha256(concatBytes(hexToBytes(h0), hexToBytes(h1))));
		expect(tr.merkleRoot).toBe(expected);
	});

	it('3-leaf root duplicates the trailing leaf on the odd level', async () => {
		const key = await generateSessionKey(MATCH_ID);
		let tr: Transcript = emptyTranscript(MATCH_ID);
		({ next: tr } = await appendSelfAction(tr, { x: 1 }, key, 'A'));
		({ next: tr } = await appendSelfAction(tr, { x: 2 }, key, 'A'));
		({ next: tr } = await appendSelfAction(tr, { x: 3 }, key, 'A'));
		const h0 = _internalsForTests.leafHashHex(tr.leaves[0]);
		const h1 = _internalsForTests.leafHashHex(tr.leaves[1]);
		const h2 = _internalsForTests.leafHashHex(tr.leaves[2]);
		// level 1: [sha(h0||h1), sha(h2||h2)] → level 2: sha(left||right)
		const left = bytesToHex(sha256(concatBytes(hexToBytes(h0), hexToBytes(h1))));
		const right = bytesToHex(sha256(concatBytes(hexToBytes(h2), hexToBytes(h2))));
		const expected = bytesToHex(sha256(concatBytes(hexToBytes(left), hexToBytes(right))));
		expect(tr.merkleRoot).toBe(expected);
	});
});

describe('verifyAndAppendRemote — rejection paths', () => {
	it('accepts a well-formed remote envelope', async () => {
		const aKey = await generateSessionKey(MATCH_ID);
		const tr0 = emptyTranscript(MATCH_ID);
		const { envelope } = await appendSelfAction(tr0, { type: 'playCard' }, aKey, 'A');
		const bView = await verifyAndAppendRemote(emptyTranscript(MATCH_ID), envelope, aKey.pubkey, 'A');
		expect(bView.leaves.length).toBe(1);
		expect(bView.merkleRoot).not.toBe('0'.repeat(64));
	});

	it('accepts an exact retransmission as an idempotent no-op', async () => {
		const aKey = await generateSessionKey(MATCH_ID);
		const { envelope } = await appendSelfAction(emptyTranscript(MATCH_ID), { type: 'playCard' }, aKey, 'A');
		const bView = await verifyAndAppendRemote(emptyTranscript(MATCH_ID), envelope, aKey.pubkey, 'A');

		expect(await verifyAndAppendRemote(bView, envelope, aKey.pubkey, 'A')).toBe(bView);
	});

	it('rejects a retransmission that forks an existing sequence', async () => {
		const aKey = await generateSessionKey(MATCH_ID);
		const { envelope } = await appendSelfAction(emptyTranscript(MATCH_ID), { type: 'playCard' }, aKey, 'A');
		const bView = await verifyAndAppendRemote(emptyTranscript(MATCH_ID), envelope, aKey.pubkey, 'A');
		const forked: ActionEnvelopeWire = { ...envelope, action: { type: 'different' } };

		await expect(verifyAndAppendRemote(bView, forked, aKey.pubkey, 'A')).rejects.toThrow(/seq/);
	});

	it('rejects a tampered action', async () => {
		const aKey = await generateSessionKey(MATCH_ID);
		const { envelope } = await appendSelfAction(emptyTranscript(MATCH_ID), { ok: true }, aKey, 'A');
		const tampered: ActionEnvelopeWire = { ...envelope, action: { ok: false } };
		await expect(
			verifyAndAppendRemote(emptyTranscript(MATCH_ID), tampered, aKey.pubkey, 'A'),
		).rejects.toThrow(/signature/);
	});

	it('rejects a non-monotonic seq', async () => {
		const aKey = await generateSessionKey(MATCH_ID);
		const { envelope } = await appendSelfAction(emptyTranscript(MATCH_ID), { x: 1 }, aKey, 'A');
		const skipped: ActionEnvelopeWire = { ...envelope, seq: 5 };
		await expect(
			verifyAndAppendRemote(emptyTranscript(MATCH_ID), skipped, aKey.pubkey, 'A'),
		).rejects.toThrow(/seq/);
	});

	it('rejects a wrong prevHash (fork attempt)', async () => {
		const aKey = await generateSessionKey(MATCH_ID);
		const { envelope } = await appendSelfAction(emptyTranscript(MATCH_ID), { x: 1 }, aKey, 'A');
		const forked: ActionEnvelopeWire = { ...envelope, prevHash: 'f'.repeat(64) };
		await expect(
			verifyAndAppendRemote(emptyTranscript(MATCH_ID), forked, aKey.pubkey, 'A'),
		).rejects.toThrow(/prevHash/);
	});

	it('rejects a foreign matchId', async () => {
		const aKey = await generateSessionKey(MATCH_ID);
		const { envelope } = await appendSelfAction(emptyTranscript(MATCH_ID), { x: 1 }, aKey, 'A');
		const wrong: ActionEnvelopeWire = { ...envelope, matchId: 'other' };
		await expect(
			verifyAndAppendRemote(emptyTranscript(MATCH_ID), wrong, aKey.pubkey, 'A'),
		).rejects.toThrow(/matchId/);
	});

	it('rejects an unknown broadcaster', async () => {
		const aKey = await generateSessionKey(MATCH_ID);
		const { envelope } = await appendSelfAction(emptyTranscript(MATCH_ID), { x: 1 }, aKey, 'A');
		await expect(
			verifyAndAppendRemote(
				emptyTranscript(MATCH_ID),
				envelope,
				aKey.pubkey,
				// Intentional cast: simulate a buggy/hostile caller that
				// hands the verifier something outside the wire enum.
				'Z' as unknown as 'A',
			),
		).rejects.toThrow(/broadcaster/);
	});
});

describe('cross-peer convergence — 60 mock turns', () => {
	it('two peers building parallel transcripts agree on merkleRoot', async () => {
		const aKey = await generateSessionKey(MATCH_ID);
		const bKey = await generateSessionKey(MATCH_ID);

		// Peer A's local transcript (its own view, A appends own + verifies B's).
		// Peer B's local transcript symmetrically.
		let aTr: Transcript = emptyTranscript(MATCH_ID);
		let bTr: Transcript = emptyTranscript(MATCH_ID);

		for (let i = 0; i < 60; i++) {
			const isAturn = i % 2 === 0;
			const action = { type: 'mockMove', seq: i, payload: `turn-${i}` };
			if (isAturn) {
				const { next, envelope } = await appendSelfAction(aTr, action, aKey, 'A');
				aTr = next;
				bTr = await verifyAndAppendRemote(bTr, envelope, aKey.pubkey, 'A');
			} else {
				const { next, envelope } = await appendSelfAction(bTr, action, bKey, 'B');
				bTr = next;
				aTr = await verifyAndAppendRemote(aTr, envelope, bKey.pubkey, 'B');
			}
		}
		expect(aTr.leaves.length).toBe(60);
		expect(bTr.leaves.length).toBe(60);
		expect(aTr.merkleRoot).toBe(bTr.merkleRoot);
		expect(aTr.merkleRoot).not.toBe('0'.repeat(64));
	}, 20_000);
});
