/**
 * sessionKey.ts — Ephemeral Ed25519 session keys (ADR 0004 §Decision.3).
 *
 * Per-match keypair used to sign every action envelope mid-match without
 * triggering Hive Keychain prompts. The public half is authorized once at
 * match start (`session_authorize`) and anchored on chain via
 * `match_anchor.pubkey_a` / `pubkey_b`.
 *
 * Two implementations, runtime-selected per DECISIONS.md §D1:
 *   - `webcrypto`: non-extractable `CryptoKey` via `crypto.subtle`. Primary
 *     path. XSS-safe — the private key never appears in JS memory.
 *   - `noble`: pure-JS `@noble/curves/ed25519`. Fallback for browsers that
 *     lack `crypto.subtle` Ed25519 (notably Firefox tail). Emits a one-time
 *     compat-mode toast so we can measure the tail empirically.
 *
 * Both paths produce / accept RFC 8032 Ed25519 signatures, so envelopes are
 * cross-verifiable regardless of which peer is on which path.
 *
 * Confidence:
 *   - Non-extractable guarantee on WebCrypto: HIGH (spec-mandated; tested).
 *   - Cross-path interop: HIGH (RFC 8032 is the wire shape; tested).
 *   - Firefox detection at `exportKey('raw', publicKey)`: MEDIUM — relies
 *     on the upstream behaviour documented in `@noble/curves/webcrypto.js`.
 *     Re-validate when Firefox ships full WebCrypto-curves support.
 *
 * Reference: WebCrypto Secure Curves draft
 *   https://wicg.github.io/webcrypto-secure-curves/
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { toast } from 'sonner';

// ─── Public surface ────────────────────────────────────────────────────────

export type SessionKeyMode = 'webcrypto' | 'noble';

export type SessionKey = Readonly<{
	matchId: string;
	pubkey: string;        // base64url, 43 chars (32 bytes, unpadded)
	mode: SessionKeyMode;
	sign: (bytes: Uint8Array) => Promise<string>; // base64url, 86 chars
}>;

// ─── Constants ─────────────────────────────────────────────────────────────

const ED25519_PUBKEY_BYTES = 32;
const ED25519_SIG_BYTES = 64;
const ED25519_PUBKEY_B64URL_LEN = 43;
const ED25519_SIG_B64URL_LEN = 86;
const COMPAT_MODE_MESSAGE =
	'Your browser is running cryptography in compatibility mode.';

// ─── base64url codec (URL-safe, no padding) ────────────────────────────────

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	const b64 = (typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64'));
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(input: string): Uint8Array | null {
	// Strict: reject anything outside the url-safe alphabet so wire-data
	// can't smuggle padding/whitespace past the verifier.
	if (!/^[A-Za-z0-9_-]+$/.test(input)) return null;
	const padded = input.replace(/-/g, '+').replace(/_/g, '/')
		+ '='.repeat((4 - (input.length % 4)) % 4);
	try {
		const binary = (typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary'));
		const out = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
		return out;
	} catch {
		return null;
	}
}

// ─── WebCrypto Ed25519 detection (memoised per session) ────────────────────

let webcryptoSupportProbe: Promise<boolean> | null = null;

export function webcryptoEd25519Supported(): Promise<boolean> {
	if (webcryptoSupportProbe) return webcryptoSupportProbe;
	webcryptoSupportProbe = probeWebcryptoEd25519();
	return webcryptoSupportProbe;
}

async function probeWebcryptoEd25519(): Promise<boolean> {
	if (typeof crypto === 'undefined' || !crypto.subtle) return false;
	try {
		const generated = await crypto.subtle.generateKey(
			{ name: 'Ed25519' },
			false,
			['sign', 'verify'],
		);
		const kp = narrowKeyPair(generated);
		if (!kp) return false;
		// Firefox / Safari (as of 2026-01 cutoff) can generate but cannot
		// `exportKey('raw', publicKey)` for Ed25519 — see `@noble/curves`
		// webcrypto.js header. Probing the export here treats partial
		// implementations as unsupported so we don't ship an unusable key.
		await crypto.subtle.exportKey('raw', kp.publicKey);
		return true;
	} catch {
		return false;
	}
}

/**
 * Runtime narrow for `crypto.subtle.generateKey`'s return type. For
 * asymmetric algorithms the spec returns a key pair shape; for symmetric
 * ones a single CryptoKey. We always pass an asymmetric algo so the pair
 * branch is expected — narrowed defensively rather than `as`-cast.
 */
function narrowKeyPair(
	value: unknown,
): Readonly<{ publicKey: CryptoKey; privateKey: CryptoKey }> | null {
	if (!value || typeof value !== 'object') return null;
	const maybe = value as { publicKey?: unknown; privateKey?: unknown };
	if (!maybe.publicKey || !maybe.privateKey) return null;
	return Object.freeze({
		publicKey: maybe.publicKey as CryptoKey,
		privateKey: maybe.privateKey as CryptoKey,
	});
}

// ─── Compat-mode warning (one-shot per tab) ────────────────────────────────

let compatWarningEmitted = false;

function emitCompatModeWarning(): void {
	if (compatWarningEmitted) return;
	compatWarningEmitted = true;
	try {
		toast.warning(COMPAT_MODE_MESSAGE, {
			description: 'Game cryptography falls back to a slower JS implementation.',
			duration: 8000,
		});
	} catch {
		// `toast` is best-effort here (e.g. unit-test environment with no
		// React tree). Always emit a console line as a telemetry hook so
		// the Firefox tail is measurable from logs even if the toast UI
		// isn't mounted.
	}
	// eslint-disable-next-line no-console
	console.warn('[sessionKey] WebCrypto Ed25519 unsupported — using @noble/curves fallback');
}

/**
 * Test-only escape hatch to reset the module-scoped probe + warning flag.
 * Not exported from the package barrel; only the colocated test imports it.
 */
export function _resetForTests(): void {
	webcryptoSupportProbe = null;
	compatWarningEmitted = false;
}

/**
 * Test-only: force a specific mode regardless of runtime probe. Used to
 * exercise the noble fallback on environments (Node, modern browsers) where
 * WebCrypto Ed25519 is available, and to assert cross-mode interop.
 */
export async function _generateForTests(matchId: string, mode: SessionKeyMode): Promise<SessionKey> {
	if (mode === 'webcrypto') {
		if (!(await webcryptoEd25519Supported())) {
			throw new Error('[sessionKey] WebCrypto Ed25519 unavailable in this environment');
		}
		return generateWebCryptoSessionKey(matchId);
	}
	return generateNobleSessionKey(matchId);
}

/**
 * Test-only: verify forcing a specific path so cross-mode interop is
 * actually exercised end-to-end (otherwise both sign+verify would resolve
 * to the same primary path on a WebCrypto-capable runtime).
 */
export async function _verifyForTests(
	bytes: Uint8Array,
	sigB64: string,
	pubkeyB64: string,
	mode: SessionKeyMode,
): Promise<boolean> {
	if (sigB64.length !== ED25519_SIG_B64URL_LEN) return false;
	if (pubkeyB64.length !== ED25519_PUBKEY_B64URL_LEN) return false;
	const sigBytes = base64UrlToBytes(sigB64);
	const pubBytes = base64UrlToBytes(pubkeyB64);
	if (!sigBytes || sigBytes.length !== ED25519_SIG_BYTES) return false;
	if (!pubBytes || pubBytes.length !== ED25519_PUBKEY_BYTES) return false;
	if (mode === 'webcrypto') {
		if (!(await webcryptoEd25519Supported())) {
			throw new Error('[sessionKey] WebCrypto Ed25519 unavailable in this environment');
		}
		return verifyWithWebCrypto(bytes, sigBytes, pubBytes);
	}
	return verifyWithNoble(bytes, sigBytes, pubBytes);
}

// ─── Generation ────────────────────────────────────────────────────────────

export async function generateSessionKey(matchId: string): Promise<SessionKey> {
	if (!matchId || matchId.length === 0) {
		throw new Error('[sessionKey] matchId is required');
	}
	if (await webcryptoEd25519Supported()) {
		return generateWebCryptoSessionKey(matchId);
	}
	emitCompatModeWarning();
	return generateNobleSessionKey(matchId);
}

async function generateWebCryptoSessionKey(matchId: string): Promise<SessionKey> {
	const generated = await crypto.subtle.generateKey(
		{ name: 'Ed25519' },
		false, // non-extractable — XSS cannot exfil
		['sign', 'verify'],
	);
	const kp = narrowKeyPair(generated);
	if (!kp) throw new Error('[sessionKey] generateKey did not return a key pair');

	const rawPub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
	if (rawPub.length !== ED25519_PUBKEY_BYTES) {
		throw new Error(`[sessionKey] unexpected pubkey length: ${rawPub.length}`);
	}
	const pubkey = bytesToBase64Url(rawPub);

	const sign = async (bytes: Uint8Array): Promise<string> => {
		const sigBuf = await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, bytes);
		return bytesToBase64Url(new Uint8Array(sigBuf));
	};

	return Object.freeze({ matchId, pubkey, mode: 'webcrypto', sign });
}

function generateNobleSessionKey(matchId: string): SessionKey {
	const secretKey = ed25519.utils.randomSecretKey();
	const publicKey = ed25519.getPublicKey(secretKey);
	if (publicKey.length !== ED25519_PUBKEY_BYTES) {
		throw new Error(`[sessionKey] unexpected pubkey length: ${publicKey.length}`);
	}
	const pubkey = bytesToBase64Url(publicKey);

	const sign = async (bytes: Uint8Array): Promise<string> => {
		const sig = ed25519.sign(bytes, secretKey);
		return bytesToBase64Url(sig);
	};

	return Object.freeze({ matchId, pubkey, mode: 'noble', sign });
}

// ─── Verification (cross-mode) ─────────────────────────────────────────────

/**
 * Verify an Ed25519 signature over `bytes`. Inputs come from the wire —
 * validate shape (base64url alphabet + decoded byte length) before
 * surrendering to `crypto.subtle.verify`, which would otherwise throw on
 * any malformed payload and surface as a generic error.
 */
export async function verifyEnvelope(
	bytes: Uint8Array,
	sigB64: string,
	pubkeyB64: string,
): Promise<boolean> {
	// Length pre-check: cheaper than base64-decoding garbage. base64url of
	// 32 / 64 bytes is exactly 43 / 86 chars (no padding).
	if (sigB64.length !== ED25519_SIG_B64URL_LEN) return false;
	if (pubkeyB64.length !== ED25519_PUBKEY_B64URL_LEN) return false;

	const sigBytes = base64UrlToBytes(sigB64);
	const pubBytes = base64UrlToBytes(pubkeyB64);
	if (!sigBytes || sigBytes.length !== ED25519_SIG_BYTES) return false;
	if (!pubBytes || pubBytes.length !== ED25519_PUBKEY_BYTES) return false;

	if (await webcryptoEd25519Supported()) {
		return verifyWithWebCrypto(bytes, sigBytes, pubBytes);
	}
	return verifyWithNoble(bytes, sigBytes, pubBytes);
}

async function verifyWithWebCrypto(
	bytes: Uint8Array,
	sigBytes: Uint8Array,
	pubBytes: Uint8Array,
): Promise<boolean> {
	try {
		const pubKey = await crypto.subtle.importKey(
			'raw',
			pubBytes,
			{ name: 'Ed25519' },
			false,
			['verify'],
		);
		return await crypto.subtle.verify({ name: 'Ed25519' }, pubKey, sigBytes, bytes);
	} catch {
		return false;
	}
}

function verifyWithNoble(
	bytes: Uint8Array,
	sigBytes: Uint8Array,
	pubBytes: Uint8Array,
): boolean {
	try {
		return ed25519.verify(sigBytes, bytes, pubBytes);
	} catch {
		return false;
	}
}
