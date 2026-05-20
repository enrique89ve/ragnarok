/**
 * matchPendingQueue.ts — Server pending queue for offline-opponent match
 * envelopes (ADR 0004 §Decision.3, issue 05).
 *
 * Purpose:
 *   - When a peer finalizes a match while the opponent is offline, they
 *     POST the signed `match_result_proposal` envelope here. The server
 *     timestamps the deposit with a witness signature (Hive Posting key
 *     from `WITNESS_HIVE_POSTING_KEY` env var per DECISIONS.md §D4), holds
 *     for ≤100 blocks (~5 min), then delivers on opponent reconnect.
 *   - The server NEVER opens the inner `action` field of the envelope —
 *     it is opaque JSONB. Server role here is arbiter (timestamp witness),
 *     not mediator (it does not re-run the match).
 *
 * Storage:
 *   - Default: in-memory `Map<matchId, MatchPendingEnvelopeRecord>`. Fine
 *     for Phase 0 closed beta and tests.
 *   - Production: swap via `useDrizzleStore(db)` at boot for persistence
 *     across restarts.
 *   - Either backing exposes the same surface.
 *
 * Witness sig contract:
 *   - Message = `sha256(matchId || canonicalEnvelope || queuedAt-as-BE-u64)`.
 *   - Sign with `PrivateKey.fromString(WITNESS_HIVE_POSTING_KEY).sign(...)`.
 *   - Returned as hex of the 65-byte recoverable signature, matching the
 *     format `hiveSignatureVerifier.verifyAnchored` expects.
 *
 * Boot validation (caller's responsibility, see `validateWitnessConfig`):
 *   - Both env vars present.
 *   - WIF parses.
 *   - Derived pubkey matches the account's Hive Posting authority via RPC.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { canonicalStringify } from '../../shared/protocol-core/hash';
import { fetchAccountKeys } from './hiveSignatureVerifier';
import { loadHiveTx } from './hiveTx';

// ─── Public types ──────────────────────────────────────────────────────────

export interface MatchPendingEnvelopeRecord {
	readonly matchId: string;
	readonly envelope: Record<string, unknown>;
	readonly queuedAt: number;
	readonly witnessSig: string;
	readonly expiresAt: number;
}

export interface MatchPendingQueueStore {
	upsert(record: MatchPendingEnvelopeRecord): Promise<void>;
	fetch(matchId: string): Promise<MatchPendingEnvelopeRecord | null>;
	delete(matchId: string): Promise<boolean>;
	deleteExpired(currentBlock: number): Promise<number>;
}

export const QUEUE_TTL_BLOCKS = 100;

// ─── Default in-memory store (process-local; resets on restart) ────────────

class InMemoryStore implements MatchPendingQueueStore {
	private readonly rows = new Map<string, MatchPendingEnvelopeRecord>();

	upsert(record: MatchPendingEnvelopeRecord): Promise<void> {
		this.rows.set(record.matchId, record);
		return Promise.resolve();
	}

	fetch(matchId: string): Promise<MatchPendingEnvelopeRecord | null> {
		return Promise.resolve(this.rows.get(matchId) ?? null);
	}

	delete(matchId: string): Promise<boolean> {
		return Promise.resolve(this.rows.delete(matchId));
	}

	deleteExpired(currentBlock: number): Promise<number> {
		let count = 0;
		for (const [k, row] of this.rows) {
			if (row.expiresAt < currentBlock) {
				this.rows.delete(k);
				count++;
			}
		}
		return Promise.resolve(count);
	}
}

let activeStore: MatchPendingQueueStore = new InMemoryStore();

export function setStoreForTests(store: MatchPendingQueueStore): void {
	activeStore = store;
}

export function resetStoreForTests(): void {
	activeStore = new InMemoryStore();
}

// ─── Witness signing — lazy hive-tx import (ESM) ───────────────────────────

interface WitnessSigner {
	account: string;
	pubkey: string;
	sign(message: Uint8Array): string;
}

let cachedSigner: WitnessSigner | null = null;
let cachedSignerError: Error | null = null;

async function getWitnessSigner(): Promise<WitnessSigner> {
	if (cachedSigner) return cachedSigner;
	if (cachedSignerError) throw cachedSignerError;
	try {
		const account = process.env.WITNESS_HIVE_ACCOUNT;
		const wif = process.env.WITNESS_HIVE_POSTING_KEY;
		if (!account || !wif) {
			throw new Error('Witness signing unavailable: WITNESS_HIVE_ACCOUNT and WITNESS_HIVE_POSTING_KEY required');
		}
		const { PrivateKey } = await loadHiveTx();
		const pk = PrivateKey.fromString(wif);
		const pubkey = pk.createPublic().toString();
		cachedSigner = {
			account,
			pubkey,
			sign: (msg: Uint8Array) => bytesToHex(pk.sign(msg).toBuffer()),
		};
		return cachedSigner;
	} catch (err) {
		cachedSignerError = err instanceof Error ? err : new Error(String(err));
		throw cachedSignerError;
	}
}

export function resetWitnessSignerForTests(): void {
	cachedSigner = null;
	cachedSignerError = null;
}

/**
 * Boot-time validation: confirm env is set, WIF parses, and the derived
 * pubkey matches the account's on-chain Posting authority. Call this
 * from server bootstrap; throw on mismatch so the server fails fast
 * rather than silently signing with the wrong key.
 */
export async function validateWitnessConfig(): Promise<{ account: string; pubkey: string }> {
	const signer = await getWitnessSigner();
	const keys = await fetchAccountKeys(signer.account);
	const matches = keys.posting.includes(signer.pubkey);
	if (!matches) {
		const err = new Error(
			`Witness pubkey ${signer.pubkey} is not a Posting authority for ${signer.account}. ` +
			`Authorities on chain: ${keys.posting.join(', ')}`,
		);
		cachedSigner = null;
		cachedSignerError = err;
		throw err;
	}
	return { account: signer.account, pubkey: signer.pubkey };
}

export async function getWitnessPubkey(): Promise<{ account: string; pubkey: string }> {
	const signer = await getWitnessSigner();
	return { account: signer.account, pubkey: signer.pubkey };
}

// ─── Message digest (witness-signed) ───────────────────────────────────────

/**
 * Hash the witness-signed message: `sha256(matchId || canonical(envelope) ||
 * BE-u64(queuedAt))`. Inputs all UTF-8 encoded for stability across runtimes.
 * Returns the 32-byte digest ready for `PrivateKey.sign`.
 */
export function witnessMessageHash(
	matchId: string,
	envelope: Record<string, unknown>,
	queuedAt: number,
): Uint8Array {
	const canonical = canonicalStringify(envelope);
	const enc = new TextEncoder();
	const idBytes = enc.encode(matchId);
	const canonBytes = enc.encode(canonical);
	const tsBytes = new Uint8Array(8);
	const view = new DataView(tsBytes.buffer);
	view.setBigUint64(0, BigInt(queuedAt), false); // big-endian
	const buf = new Uint8Array(idBytes.length + canonBytes.length + tsBytes.length);
	buf.set(idBytes, 0);
	buf.set(canonBytes, idBytes.length);
	buf.set(tsBytes, idBytes.length + canonBytes.length);
	return sha256(buf);
}

// ─── Public surface ────────────────────────────────────────────────────────

/**
 * Enqueue a final envelope on behalf of the broadcaster. Server computes
 * the timestamp (block height passed in by the route handler reading
 * chain state — never trusted from the request body). Witness-signs the
 * deposit. Last-writer-wins on `matchId`.
 */
export async function enqueue(
	matchId: string,
	envelope: Record<string, unknown>,
	currentBlock: number,
): Promise<MatchPendingEnvelopeRecord> {
	const signer = await getWitnessSigner();
	const queuedAt = currentBlock;
	const digest = witnessMessageHash(matchId, envelope, queuedAt);
	const witnessSig = signer.sign(digest);
	const record: MatchPendingEnvelopeRecord = {
		matchId,
		envelope,
		queuedAt,
		witnessSig,
		expiresAt: queuedAt + QUEUE_TTL_BLOCKS,
	};
	await activeStore.upsert(record);
	return record;
}

export async function fetchByMatchId(matchId: string): Promise<MatchPendingEnvelopeRecord | null> {
	return activeStore.fetch(matchId);
}

export async function deleteByMatchId(matchId: string): Promise<{ cleared: boolean }> {
	const cleared = await activeStore.delete(matchId);
	return { cleared };
}

/**
 * Sweep expired rows. Idempotent. Returns count swept. Caller is expected
 * to invoke periodically (Phase 0: once per block from the chain indexer
 * loop, or on each route call as a cheap pre-emptive prune).
 */
export async function sweepExpired(currentBlock: number): Promise<number> {
	return activeStore.deleteExpired(currentBlock);
}
