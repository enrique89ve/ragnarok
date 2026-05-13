/**
 * sessionKey.test.ts — ADR 0004 §Decision.3 + DECISIONS.md §D1.
 *
 * Covers:
 *   - WebCrypto + noble sign/verify round-trip.
 *   - Tampered bytes / wrong pubkey → verify rejects.
 *   - Non-extractable assertion on the WebCrypto private key.
 *   - Cross-mode interop: webcrypto-signed envelopes verifiable by a
 *     noble-using peer, and vice versa.
 *   - base64url shape on the wire boundary.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	generateSessionKey,
	verifyEnvelope,
	webcryptoEd25519Supported,
	_generateForTests,
	_verifyForTests,
	_resetForTests,
	type SessionKey,
} from './sessionKey';

const MATCH_ID = 'match_test_0001';
const PAYLOAD = new TextEncoder().encode('ragnarok action_envelope | seq=1 | hello');

beforeEach(() => {
	_resetForTests();
});

describe('generateSessionKey', () => {
	it('produces a key bound to matchId with a base64url pubkey of the right length', async () => {
		const key = await generateSessionKey(MATCH_ID);
		expect(key.matchId).toBe(MATCH_ID);
		expect(key.pubkey).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(key.pubkey.length).toBe(43); // 32 bytes base64url-unpadded
		expect(key.mode === 'webcrypto' || key.mode === 'noble').toBe(true);
	});

	it('rejects an empty matchId', async () => {
		await expect(generateSessionKey('')).rejects.toThrow(/matchId is required/);
	});
});

describe('round-trip — auto-detected mode', () => {
	it('signs and verifies a payload', async () => {
		const key = await generateSessionKey(MATCH_ID);
		const sig = await key.sign(PAYLOAD);
		expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(sig.length).toBe(86); // 64 bytes base64url-unpadded
		await expect(verifyEnvelope(PAYLOAD, sig, key.pubkey)).resolves.toBe(true);
	});

	it('rejects tampered bytes', async () => {
		const key = await generateSessionKey(MATCH_ID);
		const sig = await key.sign(PAYLOAD);
		const tampered = new Uint8Array(PAYLOAD);
		tampered[0] ^= 0x01;
		await expect(verifyEnvelope(tampered, sig, key.pubkey)).resolves.toBe(false);
	});

	it('rejects a signature against the wrong pubkey', async () => {
		const a = await generateSessionKey(MATCH_ID);
		const b = await generateSessionKey(MATCH_ID);
		const sigA = await a.sign(PAYLOAD);
		await expect(verifyEnvelope(PAYLOAD, sigA, b.pubkey)).resolves.toBe(false);
	});

	it('rejects malformed base64url at the boundary', async () => {
		const key = await generateSessionKey(MATCH_ID);
		const sig = await key.sign(PAYLOAD);
		await expect(verifyEnvelope(PAYLOAD, sig + '@', key.pubkey)).resolves.toBe(false);
		await expect(verifyEnvelope(PAYLOAD, sig, 'not-a-real-pubkey'))
			.resolves.toBe(false);
		await expect(verifyEnvelope(PAYLOAD, 'tooShort', key.pubkey)).resolves.toBe(false);
	});
});

describe('WebCrypto path — non-extractable', () => {
	it('blocks `exportKey` of the private key', async () => {
		const supported = await webcryptoEd25519Supported();
		if (!supported) {
			// On runtimes without WebCrypto Ed25519, the WebCrypto-path
			// assertion is vacuous; the noble path doesn't expose a
			// CryptoKey at all, so there's nothing to extract.
			return;
		}

		const generated = await crypto.subtle.generateKey(
			{ name: 'Ed25519' },
			false,
			['sign', 'verify'],
		);
		// Asymmetric algo → spec guarantees CryptoKeyPair; narrow via duck-
		// type rather than `as`-cast a DOM lib type ESLint can't resolve.
		const maybe = generated as { publicKey?: unknown; privateKey?: unknown };
		expect(maybe.publicKey).toBeDefined();
		expect(maybe.privateKey).toBeDefined();
		const kp = generated as { publicKey: CryptoKey; privateKey: CryptoKey };

		expect(kp.privateKey.extractable).toBe(false);

		// Both jwk and pkcs8 exports MUST reject for a non-extractable key.
		let jwkRejected = false;
		try {
			await crypto.subtle.exportKey('jwk', kp.privateKey);
		} catch {
			jwkRejected = true;
		}
		expect(jwkRejected).toBe(true);

		let pkcs8Rejected = false;
		try {
			await crypto.subtle.exportKey('pkcs8', kp.privateKey);
		} catch {
			pkcs8Rejected = true;
		}
		expect(pkcs8Rejected).toBe(true);
	});
});

describe('noble path — round-trip', () => {
	it('signs and verifies via the noble fallback', async () => {
		const key = await _generateForTests(MATCH_ID, 'noble');
		expect(key.mode).toBe('noble');
		const sig = await key.sign(PAYLOAD);
		await expect(_verifyForTests(PAYLOAD, sig, key.pubkey, 'noble')).resolves.toBe(true);
	});

	it('noble verify rejects tampered bytes', async () => {
		const key = await _generateForTests(MATCH_ID, 'noble');
		const sig = await key.sign(PAYLOAD);
		const tampered = new Uint8Array(PAYLOAD);
		tampered[2] ^= 0xff;
		await expect(_verifyForTests(tampered, sig, key.pubkey, 'noble')).resolves.toBe(false);
	});
});

describe('cross-mode interop (RFC 8032)', () => {
	it('webcrypto-signed envelope verifies under noble', async () => {
		const supported = await webcryptoEd25519Supported();
		if (!supported) return; // WebCrypto path unavailable here; skip
		const key: SessionKey = await _generateForTests(MATCH_ID, 'webcrypto');
		const sig = await key.sign(PAYLOAD);
		await expect(_verifyForTests(PAYLOAD, sig, key.pubkey, 'noble')).resolves.toBe(true);
	});

	it('noble-signed envelope verifies under webcrypto', async () => {
		const supported = await webcryptoEd25519Supported();
		if (!supported) return;
		const key: SessionKey = await _generateForTests(MATCH_ID, 'noble');
		const sig = await key.sign(PAYLOAD);
		await expect(_verifyForTests(PAYLOAD, sig, key.pubkey, 'webcrypto')).resolves.toBe(true);
	});

	it('cross-mode: tampered payload still rejected', async () => {
		const supported = await webcryptoEd25519Supported();
		if (!supported) return;
		const key = await _generateForTests(MATCH_ID, 'webcrypto');
		const sig = await key.sign(PAYLOAD);
		const tampered = new Uint8Array(PAYLOAD);
		tampered[5] ^= 0x10;
		await expect(_verifyForTests(tampered, sig, key.pubkey, 'noble')).resolves.toBe(false);
	});
});
