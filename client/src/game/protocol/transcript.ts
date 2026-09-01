/**
 * transcript.ts — Per-action signed envelope chain + Merkle root tracker.
 *
 * Goal (ADR 0004 §Decision.4): wrap every player intent (playCard, attack,
 * chess move, bet, …) in a signed `ActionLeaf` and maintain an append-only
 * client-side transcript. The Merkle root over the leaves is committed in
 * the final `match_result.transcriptRoot` so a single disputed turn can be
 * re-derived without re-running the entire match.
 *
 * Layered responsibilities:
 *   - `canonicalJson.canonicalize` — deterministic byte form of the action
 *     payload (DECISIONS.md §D2).
 *   - `sessionKey.sign` — Ed25519 signature primitive (DECISIONS.md §D1).
 *   - this module — chains leaves with sha256, signs the chain element,
 *     verifies remote envelopes, and computes the Merkle root.
 *
 * Wire contract (mirrors `ActionEnvelopeSchema` in p2p/messageSchemas.ts):
 *   - `matchId`: opaque session id (truncated sha256 of seed+peers).
 *   - `seq`: monotonic, contiguous, starts at 0.
 *   - `prevHash`: 64-hex sha256 of the previous leaf's canonical form
 *     (`'0'.repeat(64)` for seq=0).
 *   - `action`: caller-provided opaque payload — kept `unknown` on the
 *     wire boundary so per-action validation stays with issue 03's caller.
 *   - `sig`: Ed25519 over `sha256(BE_u32(seq) || utf8(prevHash) ||
 *     utf8(canonicalize(action)))`. Base64url, 86 chars (per sessionKey).
 *
 * Merkle root:
 *   - Empty transcript → `'0'.repeat(64)` (sentinel; never collides with a
 *     real leaf hash because real leaves include a non-empty seq prefix).
 *   - Otherwise binary tree over `sha256(canonicalLeafForm)`, duplicating
 *     the last leaf if the level has an odd count. Recomputed on append
 *     (memoised inside the returned `Transcript`).
 *
 * Determinism notes:
 *   - All hashing through `@noble/hashes/sha256` for one canonical impl
 *     across the WebCrypto and noble session-key paths.
 *   - No `as` casts on the wire boundary: the `envelope` argument to
 *     `verifyAndAppendRemote` keeps `action: unknown`.
 *
 * Confidence: HIGH for Merkle determinism (snapshot-tested). MEDIUM for
 * the sig-chain rule: prevHash uses canonical-leaf-form rather than the
 * sig-only short form, so a tampered prior leaf invalidates every later
 * `prevHash` and the verifier rejects on the first mismatch.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { canonicalize } from './canonicalJson';
import { verifyEnvelope, type SessionKey } from './sessionKey';

// ─── Public surface ────────────────────────────────────────────────────────

export type Broadcaster = 'A' | 'B';

export type ActionLeaf = Readonly<{
	seq: number;
	prevHash: string;
	action: unknown;
	sig: string;
	broadcaster: Broadcaster;
}>;

export type Transcript = Readonly<{
	matchId: string;
	leaves: readonly ActionLeaf[];
	merkleRoot: string;
}>;

export type ActionEnvelopeWire = Readonly<{
	type: 'action_envelope';
	matchId: string;
	seq: number;
	prevHash: string;
	action: unknown;
	sig: string;
}>;

// ─── Constants ─────────────────────────────────────────────────────────────

const ZERO_HASH = '0'.repeat(64);
const ENCODER = new TextEncoder();

// ─── Internal helpers ──────────────────────────────────────────────────────

function sha256Hex(bytes: Uint8Array): string {
	return bytesToHex(sha256(bytes));
}

function hexToBytes(hex: string): Uint8Array {
	if (hex.length % 2 !== 0) {
		throw new Error(`[transcript] hex length must be even: ${hex.length}`);
	}
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
		if (Number.isNaN(byte)) {
			throw new Error(`[transcript] invalid hex at offset ${i * 2}`);
		}
		out[i] = byte;
	}
	return out;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
}

/**
 * Big-endian encoding of `seq` over 4 bytes. The signed payload includes
 * this raw 4-byte prefix (rather than the decimal text) so the chain
 * primitive cannot be impersonated by an `action` whose canonical form
 * happens to start with the same digits.
 */
function beU32(seq: number): Uint8Array {
	if (!Number.isInteger(seq) || seq < 0 || seq > 0xffff_ffff) {
		throw new Error(`[transcript] seq out of u32 range: ${seq}`);
	}
	const out = new Uint8Array(4);
	out[0] = (seq >>> 24) & 0xff;
	out[1] = (seq >>> 16) & 0xff;
	out[2] = (seq >>> 8) & 0xff;
	out[3] = seq & 0xff;
	return out;
}

/**
 * Build the byte sequence signed by the broadcaster and hashed for the
 * next leaf's `prevHash`. Concatenation, not canonical JSON, because the
 * three fields are framed by fixed widths (BE_u32 for seq, exactly 64
 * chars for prevHash) and the canonical-JSON of the action payload.
 */
function leafSignPayload(seq: number, prevHash: string, action: unknown): Uint8Array {
	if (prevHash.length !== 64) {
		throw new Error(`[transcript] prevHash must be 64 hex chars, got ${prevHash.length}`);
	}
	const seqBytes = beU32(seq);
	const prevHashBytes = ENCODER.encode(prevHash);
	const actionBytes = ENCODER.encode(canonicalize(action));
	return concatBytes(concatBytes(seqBytes, prevHashBytes), actionBytes);
}

/**
 * Canonical bytes representing the entire leaf — input to `sha256` for
 * Merkle leaves and the source of the next leaf's `prevHash`. Distinct
 * from `leafSignPayload` because the canonical-leaf form includes the
 * signature + broadcaster too, pinning every observable field.
 */
function canonicalLeafForm(leaf: ActionLeaf): string {
	return canonicalize({
		seq: leaf.seq,
		prevHash: leaf.prevHash,
		action: leaf.action,
		sig: leaf.sig,
		broadcaster: leaf.broadcaster,
	});
}

function leafHashHex(leaf: ActionLeaf): string {
	return sha256Hex(ENCODER.encode(canonicalLeafForm(leaf)));
}

/**
 * Binary Merkle over the leaf hashes. Odd levels duplicate the last
 * node — the standard "balanced" rule used by Bitcoin et al. Output is
 * the 64-hex root.
 */
export function computeMerkleRoot(tr: Transcript): string {
	if (tr.leaves.length === 0) return ZERO_HASH;
	let level: string[] = tr.leaves.map(leafHashHex);
	while (level.length > 1) {
		const next: string[] = [];
		for (let i = 0; i < level.length; i += 2) {
			const leftHex = level[i];
			const rightHex = i + 1 < level.length ? level[i + 1] : level[i];
			const combined = concatBytes(hexToBytes(leftHex), hexToBytes(rightHex));
			next.push(sha256Hex(combined));
		}
		level = next;
	}
	return level[0];
}

function isValidBroadcaster(value: unknown): value is Broadcaster {
	return value === 'A' || value === 'B';
}

// ─── Public factories / mutators ───────────────────────────────────────────

export function emptyTranscript(matchId: string): Transcript {
	if (!matchId) throw new Error('[transcript] matchId is required');
	return Object.freeze({
		matchId,
		leaves: Object.freeze([] as readonly ActionLeaf[]),
		merkleRoot: ZERO_HASH,
	});
}

function nextPrevHash(tr: Transcript): string {
	const last = tr.leaves.length === 0 ? null : tr.leaves[tr.leaves.length - 1];
	return last ? leafHashHex(last) : ZERO_HASH;
}

/**
 * Sign + append a locally-originated action. Returns the new transcript
 * and the envelope to put on the wire. Pure-ish: the input transcript is
 * unmodified (frozen); the new one is a fresh object so React state
 * containers can rely on reference equality for change detection.
 */
export async function appendSelfAction(
	tr: Transcript,
	action: unknown,
	sessionKey: SessionKey,
	broadcaster: Broadcaster,
): Promise<{ next: Transcript; envelope: ActionEnvelopeWire }> {
	if (sessionKey.matchId !== tr.matchId) {
		throw new Error(
			`[transcript] sessionKey/transcript matchId mismatch — ${sessionKey.matchId} vs ${tr.matchId}`,
		);
	}
	const seq = tr.leaves.length;
	const prevHash = nextPrevHash(tr);
	const payload = leafSignPayload(seq, prevHash, action);
	const signPayloadHash = sha256(payload); // sign the digest, not the raw bytes
	const sig = await sessionKey.sign(signPayloadHash);

	const leaf: ActionLeaf = Object.freeze({
		seq,
		prevHash,
		action,
		sig,
		broadcaster,
	});
	const nextLeaves = Object.freeze([...tr.leaves, leaf]);
	const next: Transcript = Object.freeze({
		matchId: tr.matchId,
		leaves: nextLeaves,
		merkleRoot: computeMerkleRoot({ matchId: tr.matchId, leaves: nextLeaves, merkleRoot: ZERO_HASH }),
	});
	const envelope: ActionEnvelopeWire = Object.freeze({
		type: 'action_envelope',
		matchId: tr.matchId,
		seq,
		prevHash,
		action,
		sig,
	});
	return { next, envelope };
}

/**
 * Verify + append a remote-originated envelope. Exact retransmissions of an
 * already verified leaf are idempotent no-ops; every other failure throws.
 * Failure reasons are encoded into the message so the wire handler can
 * attribute slash evidence (`bad_sig`, `seq_skipped`, `prev_hash_mismatch`, …).
 */
export async function verifyAndAppendRemote(
	tr: Transcript,
	envelope: ActionEnvelopeWire,
	opponentPubkey: string,
	broadcaster: Broadcaster,
): Promise<Transcript> {
	if (!isValidBroadcaster(broadcaster)) {
		throw new Error(`[transcript] unknown broadcaster: ${String(broadcaster)}`);
	}
	if (envelope.matchId !== tr.matchId) {
		throw new Error(
			`[transcript] envelope.matchId mismatch — got ${envelope.matchId} expected ${tr.matchId}`,
		);
	}
	const expectedSeq = tr.leaves.length;
	if (envelope.seq !== expectedSeq) {
		// Retransmission after a reconnect is allowed to repeat an already
		// verified leaf. Idempotency is strict: every observable field must
		// match the stored leaf, otherwise this is a fork and remains rejected.
		if (envelope.seq >= 0 && envelope.seq < expectedSeq) {
			const existing = tr.leaves[envelope.seq];
			if (existing
				&& existing.prevHash === envelope.prevHash
				&& existing.sig === envelope.sig
				&& existing.broadcaster === broadcaster
				&& canonicalize(existing.action) === canonicalize(envelope.action)) {
				return tr;
			}
		}
		throw new Error(
			`[transcript] non-monotonic seq — got ${envelope.seq} expected ${expectedSeq}`,
		);
	}
	const expectedPrev = nextPrevHash(tr);
	if (envelope.prevHash !== expectedPrev) {
		throw new Error(
			`[transcript] prevHash mismatch — got ${envelope.prevHash.slice(0, 12)}… expected ${expectedPrev.slice(0, 12)}…`,
		);
	}

	const payload = leafSignPayload(envelope.seq, envelope.prevHash, envelope.action);
	const signPayloadHash = sha256(payload);
	const sigOk = await verifyEnvelope(signPayloadHash, envelope.sig, opponentPubkey);
	if (!sigOk) {
		throw new Error('[transcript] envelope signature did not verify');
	}

	const leaf: ActionLeaf = Object.freeze({
		seq: envelope.seq,
		prevHash: envelope.prevHash,
		action: envelope.action,
		sig: envelope.sig,
		broadcaster,
	});
	const nextLeaves = Object.freeze([...tr.leaves, leaf]);
	return Object.freeze({
		matchId: tr.matchId,
		leaves: nextLeaves,
		merkleRoot: computeMerkleRoot({ matchId: tr.matchId, leaves: nextLeaves, merkleRoot: ZERO_HASH }),
	});
}

// ─── Test-only helpers ─────────────────────────────────────────────────────

/**
 * Exposed for the colocated test file: lets it assert leaf-form bytes
 * without re-implementing the canonicalisation. Not exported from any
 * barrel — production code computes hashes via the public surface only.
 */
export const _internalsForTests = {
	leafSignPayload,
	canonicalLeafForm,
	leafHashHex,
	ZERO_HASH,
};
