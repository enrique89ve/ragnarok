/**
 * actionLog.ts — Encrypted IndexedDB persistence for the signed action
 * transcript (ADR 0004 §Decision.6, DECISIONS.md §D3).
 *
 * Purpose:
 *   - Every signed `ActionLeaf` produced by the transcript layer (issue 03)
 *     is mirrored into IndexedDB so a tab reload / crash / OOM can replay
 *     the in-progress match from local state, without depending on the
 *     opponent to dump their log.
 *   - The store is encrypted with an AES-GCM key derived (HKDF) from the
 *     match-scoped Hive Posting signature already used for session_authorize,
 *     so local IndexedDB rows do not contain their own decryption material.
 *
 * Crypto choice (per D3):
 *   - WebCrypto `crypto.subtle` for both HKDF and AES-GCM. No `@noble/ciphers`
 *     fallback in this issue — the action log is browser-only and modern
 *     browsers (including Firefox) ship WebCrypto AES-GCM + HKDF.
 *
 * Quota fallback:
 *   - Private browsing / quota-exceeded environments fail `indexedDB.open`.
 *     In that case the module silently flips to an in-memory `Map` log
 *     with a one-time `sonner` warning toast. The public surface stays the
 *     same so callers don't branch.
 *
 * Confidence:
 *   - HKDF + AES-GCM via WebCrypto: HIGH (well-supported, spec-mandated).
 *   - IndexedDB keyPath compound key: HIGH (round-tripped in tests).
 *   - Sonner availability: MEDIUM — toast import is guarded by try/catch
 *     because unit-test environments may have no React tree.
 */

import { canonicalize } from './canonicalJson';
import type { ActionLeaf } from './transcript';

// ─── Public surface ────────────────────────────────────────────────────────

export type StoredLeaf = ActionLeaf & { readonly matchId: string };

const DB_NAME = 'ragnarok-action-log';
const DB_VERSION = 1;
const STORE_NAME = 'leaves';
const INDEX_BY_MATCH = 'byMatch';
const HKDF_INFO = new TextEncoder().encode('ragnarok-action-log-v1');
const QUOTA_WARNING_MESSAGE = 'Storage unavailable — using in-memory action log.';

// ─── In-memory fallback ────────────────────────────────────────────────────

let inMemoryFallback = false;
const inMemoryStore = new Map<string, StoredLeaf[]>();
let quotaWarningEmitted = false;

async function emitQuotaWarning(): Promise<void> {
	if (quotaWarningEmitted) return;
	quotaWarningEmitted = true;
	try {
		const { toast } = await import('sonner');
		toast.warning(QUOTA_WARNING_MESSAGE, {
			description: 'Action log will not survive a reload in this browser.',
			duration: 8000,
		});
	} catch {
		// No-op in environments without sonner (unit tests).
	}
	// eslint-disable-next-line no-console
	console.warn('[actionLog] IndexedDB unavailable — falling back to in-memory log');
}

// ─── Marker type for the fake/in-memory DB so callers can pass it back ────

const IN_MEMORY_MARKER = Symbol('actionLog.inMemoryDb');
type InMemoryDb = { readonly [IN_MEMORY_MARKER]: true };
type DbHandle = IDBDatabase | InMemoryDb;

function isInMemoryDb(db: DbHandle): db is InMemoryDb {
	return (db as InMemoryDb)[IN_MEMORY_MARKER] === true;
}

function newInMemoryDb(): InMemoryDb {
	return Object.freeze({ [IN_MEMORY_MARKER]: true });
}

// ─── open ──────────────────────────────────────────────────────────────────

export async function open(): Promise<DbHandle> {
	if (inMemoryFallback) return newInMemoryDb();
	if (typeof indexedDB === 'undefined') {
		inMemoryFallback = true;
		await emitQuotaWarning();
		return newInMemoryDb();
	}
	try {
		return await openRealDb();
	} catch {
		inMemoryFallback = true;
		await emitQuotaWarning();
		return newInMemoryDb();
	}
}

function openRealDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		let req: IDBOpenDBRequest;
		try {
			req = indexedDB.open(DB_NAME, DB_VERSION);
		} catch (err) {
			reject(err);
			return;
		}
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: ['matchId', 'seq'] });
				store.createIndex(INDEX_BY_MATCH, 'matchId', { unique: false });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

// ─── deriveEncKey ──────────────────────────────────────────────────────────

/**
 * Derive an AES-GCM-256 non-extractable key from a Hive signature.
 *
 * @param hiveSigHex — opaque hex signature string from Hive Keychain. We
 *   treat it as opaque IKM bytes via UTF-8. Must be ≥ 16 chars so HKDF gets
 *   enough entropy.
 * @param matchId — used as HKDF salt, ensures different matches under the
 *   same Hive account yield distinct keys (no cross-match decryption).
 */
export async function deriveEncKey(
	hiveSigHex: string,
	matchId: string,
): Promise<CryptoKey> {
	if (!hiveSigHex || hiveSigHex.length < 16) {
		throw new Error('deriveEncKey: hiveSig too short (need >= 16 chars)');
	}
	if (!matchId) {
		throw new Error('deriveEncKey: matchId required');
	}
	const enc = new TextEncoder();
	const ikm = enc.encode(hiveSigHex);
	const salt = enc.encode(matchId);
	const ikmKey = await crypto.subtle.importKey(
		'raw',
		ikm,
		'HKDF',
		false,
		['deriveKey'],
	);
	return crypto.subtle.deriveKey(
		{ name: 'HKDF', hash: 'SHA-256', salt, info: HKDF_INFO },
		ikmKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt'],
	);
}

// ─── appendLeaf ────────────────────────────────────────────────────────────

interface CipherRow {
	readonly matchId: string;
	readonly seq: number;
	readonly iv: Uint8Array;
	readonly ciphertext: Uint8Array;
}

export async function appendLeaf(
	db: DbHandle,
	leaf: StoredLeaf,
	encKey: CryptoKey,
): Promise<void> {
	const canonical = canonicalize(leaf);
	const plaintext = new TextEncoder().encode(canonical);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const cipherBuf = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		encKey,
		plaintext,
	);
	const row: CipherRow = {
		matchId: leaf.matchId,
		seq: leaf.seq,
		iv,
		ciphertext: new Uint8Array(cipherBuf),
	};
	if (isInMemoryDb(db)) {
		const bucket = inMemoryStore.get(leaf.matchId) ?? [];
		const filtered = bucket.filter((r) => (r as unknown as CipherRow).seq !== leaf.seq);
		filtered.push(row as unknown as StoredLeaf);
		inMemoryStore.set(leaf.matchId, filtered);
		return;
	}
	await txPut(db, row);
}

function txPut(db: IDBDatabase, row: CipherRow): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const req = store.put(row);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

// ─── loadLog ───────────────────────────────────────────────────────────────

export async function loadLog(
	db: DbHandle,
	matchId: string,
	encKey: CryptoKey,
): Promise<StoredLeaf[]> {
	const rows = isInMemoryDb(db)
		? (inMemoryStore.get(matchId) ?? []) as unknown as CipherRow[]
		: await txGetByMatch(db, matchId);
	const sorted = [...rows].sort((a, b) => a.seq - b.seq);
	const out: StoredLeaf[] = [];
	for (const row of sorted) {
		const plain = await decryptRow(row, encKey);
		out.push(plain);
	}
	return out;
}

function txGetByMatch(db: IDBDatabase, matchId: string): Promise<CipherRow[]> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const index = store.index(INDEX_BY_MATCH);
		const req = index.getAll(matchId);
		req.onsuccess = () => resolve(req.result as CipherRow[]);
		req.onerror = () => reject(req.error);
	});
}

async function decryptRow(row: CipherRow, encKey: CryptoKey): Promise<StoredLeaf> {
	const plainBuf = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: row.iv },
		encKey,
		row.ciphertext,
	);
	const text = new TextDecoder().decode(plainBuf);
	const parsed: unknown = JSON.parse(text);
	if (!isStoredLeaf(parsed)) {
		throw new Error(`[actionLog] decrypted payload is not a StoredLeaf at seq=${row.seq}`);
	}
	return parsed;
}

function isStoredLeaf(value: unknown): value is StoredLeaf {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	return typeof v.matchId === 'string'
		&& typeof v.seq === 'number'
		&& typeof v.prevHash === 'string'
		&& typeof v.sig === 'string'
		&& (v.broadcaster === 'A' || v.broadcaster === 'B')
		&& 'action' in v;
}

// ─── pruneFinalized ────────────────────────────────────────────────────────

export async function pruneFinalized(
	db: DbHandle,
	matchId: string,
): Promise<void> {
	if (isInMemoryDb(db)) {
		inMemoryStore.delete(matchId);
		return;
	}
	await txDeleteByMatch(db, matchId);
}

function txDeleteByMatch(db: IDBDatabase, matchId: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const index = store.index(INDEX_BY_MATCH);
		const req = index.openKeyCursor(IDBKeyRange.only(matchId));
		req.onsuccess = () => {
			const cursor = req.result;
			if (cursor) {
				store.delete(cursor.primaryKey);
				cursor.continue();
			}
		};
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

// ─── Test-only escape hatch ────────────────────────────────────────────────

export function _resetForTests(): void {
	inMemoryFallback = false;
	inMemoryStore.clear();
	quotaWarningEmitted = false;
}
