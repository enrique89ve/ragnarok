/**
 * Seeded PRNG (mulberry32) + deterministic Fisher-Yates shuffle +
 * deterministic id generator backed by sha256.
 *
 * Used by the commit-reveal seed exchange so neither P2P player controls
 * RNG. The `Seeded*` brands from `@shared/p2p-wire/rng` are minted only
 * here; the unbranded `cryptoRng` / `cryptoIdGen` adapters cover local-play
 * and AI paths without re-introducing `Math.random`.
 */

import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { brandSeededIdGen, brandSeededRng, type SeededIdGen, type SeededRng } from '@shared/p2p-wire/rng';

function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Mint a `SeededRng` from a hex-encoded `matchSeed`. Only the first 8 hex
 * chars (32 bits) are used as the mulberry32 seed — sufficient entropy to
 * cover a single match without collision risk in practice.
 */
export function createSeededRng(seedHex: string): SeededRng {
	const numericSeed = parseInt(seedHex.slice(0, 8), 16) || 1;
	return brandSeededRng(mulberry32(numericSeed));
}

/**
 * Mint a `SeededRng` from an arbitrary string key. Use this when the
 * seed is identity-bearing (e.g. `daily:enrique89:2026-05-14`) so the
 * same key produces the same stream on every device — required for
 * features like daily quest pick where two browsers logged into the
 * same account must see the same quest set on the same UTC day.
 */
export function seededRngFromString(seedKey: string): SeededRng {
	return createSeededRng(sha256Hex(seedKey));
}

export function seededShuffle<T>(arr: T[], rng: () => number): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

const HEX = '0123456789abcdef';

function bytesToHex(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i];
		out += HEX[(b >>> 4) & 0xf] + HEX[b & 0xf];
	}
	return out;
}

const TEXT_ENCODER = new TextEncoder();

// Canonical card commands may call legacy effect handlers that still import
// `cryptoIdGen` directly.  Keep one synchronous, nestable scope so those
// handlers inherit the command's deterministic id stream without requiring a
// risky catalog-wide import rewrite.  The scope is intentionally synchronous:
// command reducers must finish before the generator is restored.
let activeDeterministicIdGen: (() => string) | null = null;
let activeDeterministicRng: (() => number) | null = null;

export function withDeterministicRng<T>(rng: () => number, run: () => T): T {
	const previous = activeDeterministicRng;
	activeDeterministicRng = rng;
	try {
		return run();
	} finally {
		activeDeterministicRng = previous;
	}
}

export function withDeterministicIdGen<T>(idGen: () => string, run: () => T): T {
	const previous = activeDeterministicIdGen;
	activeDeterministicIdGen = idGen;
	try {
		return run();
	} finally {
		activeDeterministicIdGen = previous;
	}
}

/** Read the current command-scoped generator without exposing mutable state. */
export function getActiveDeterministicIdGen(): (() => string) | null {
	return activeDeterministicIdGen;
}

function sha256Hex(input: string): string {
	return bytesToHex(nobleSha256(TEXT_ENCODER.encode(input)));
}

/**
 * Format a 32-char hex string as a UUID-shape (8-4-4-4-12). The result is
 * NOT a real UUID v4 — the version/variant nibbles are not set — but it is
 * shape-compatible with the `instanceId: string` field elsewhere and
 * derives deterministically from the input.
 */
function asUuidShape(hex32: string): string {
	return `${hex32.slice(0, 8)}-${hex32.slice(8, 12)}-${hex32.slice(12, 16)}-${hex32.slice(16, 20)}-${hex32.slice(20, 32)}`;
}

/**
 * Mint a `SeededIdGen` for one logical id stream. Each call to the returned
 * function advances an internal counter and returns
 * `sha256(seedHex + ":" + namespace + ":" + counter)` reshaped as a UUID.
 *
 * Use one generator per stream — `'p1-deck'`, `'p2-deck'`, `'p1-init-hand'`,
 * `'p2-init-hand'`, etc. Sharing a generator across two unrelated streams
 * would couple their orderings; each peer would still agree, but ids would
 * be order-dependent in non-obvious ways. Mid-match (future Plan B) gets a
 * generator scoped to a single command id: `'mid-match-' + commandId`.
 */
export function createSeededIdGen(seedHex: string, namespace: string): SeededIdGen {
	let counter = 0;
	return brandSeededIdGen(() => {
		const hex = sha256Hex(seedHex + ':' + namespace + ':' + counter);
		counter += 1;
		return asUuidShape(hex.slice(0, 32));
	});
}

/**
 * Crypto-grade RNG for non-P2P paths. Returns a number in `[0, 1)` from
 * `crypto.getRandomValues`. Use this anywhere the old code used
 * `Math.random()` for game-mechanical randomness — same shape, no `Math`
 * dependency, CSPRNG-grade source.
 */
export function cryptoRng(): number {
	const scoped = activeDeterministicRng;
	if (scoped) return scoped();
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return buf[0] / 0x100000000;
}

/**
 * Crypto-grade id generator for non-P2P paths. Wraps `crypto.randomUUID`.
 * Falls back to a `randomUUID`-shape string built from `getRandomValues` on
 * platforms where `randomUUID` is missing (very old browsers; not expected
 * but kept for parity with `peerStore.ts:121-124`).
 */
export function cryptoIdGen(): string {
	const scoped = activeDeterministicIdGen;
	if (scoped) return scoped();
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	const buf = new Uint8Array(16);
	crypto.getRandomValues(buf);
	buf[6] = (buf[6] & 0x0f) | 0x40;
	buf[8] = (buf[8] & 0x3f) | 0x80;
	const hex = bytesToHex(buf);
	return asUuidShape(hex);
}

/** Proper Fisher-Yates shuffle. Defaults to `cryptoRng`; pass cardsRng on the command path. */
export function shuffleArray<T>(arr: T[], rng: () => number = cryptoRng): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/** In-place Fisher-Yates shuffle. Mutates the array. */
export function shuffleInPlace<T>(arr: T[], rng: () => number = cryptoRng): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}
