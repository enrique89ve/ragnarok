/**
 * transcriptIPFS.ts — Upload and retrieve match transcripts to/from IPFS
 */

import type { TranscriptBundle } from './transcriptBuilder';
import { debug } from '../../game/config/debugConfig';
import { createRuntimeDatabaseName } from '../../game/config/networkConfig';
import { createManagedIndexedDB } from '../../lib/storage/idbLifecycle';

const IPFS_GATEWAYS = [
	'https://ipfs.io/ipfs/',
	'https://cloudflare-ipfs.com/ipfs/',
	'https://gateway.pinata.cloud/ipfs/',
	'https://dweb.link/ipfs/',
];

const OPERATOR_RELAY_ENDPOINT = '/api/transcript';
const TRANSCRIPT_DB_NAME = createRuntimeDatabaseName('transcripts');
const TRANSCRIPT_STORE = 'transcripts';
const TRANSCRIPT_DB_VERSION = 1;
const MAX_LOCAL_TRANSCRIPTS = 100;
const LOCAL_TRANSCRIPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredTranscriptRow = {
	readonly cid: string;
	readonly bundle: TranscriptBundle;
	readonly storedAt: number;
	readonly contentHash?: string;
};

const transcriptIdb = createManagedIndexedDB({
	name: TRANSCRIPT_DB_NAME,
	version: TRANSCRIPT_DB_VERSION,
	onUpgrade: (db) => {
		if (!db.objectStoreNames.contains(TRANSCRIPT_STORE)) {
			db.createObjectStore(TRANSCRIPT_STORE, { keyPath: 'cid' });
		}
	},
});

export function closeTranscriptDBForTests(): void {
	transcriptIdb.close();
}

function parseTranscriptBundle(raw: unknown): TranscriptBundle | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (typeof row.merkleRoot !== 'string' || row.merkleRoot.length === 0) return undefined;
	if (typeof row.moves !== 'string') return undefined;
	return raw as TranscriptBundle;
}

function isLocalPseudoCid(cid: string): boolean {
	return cid.startsWith('bafk');
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
	const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function bundleContentHash(bundle: TranscriptBundle): Promise<string> {
	const json = JSON.stringify(bundle);
	return sha256Hex(new TextEncoder().encode(json));
}

async function expectedPseudoCid(bundle: TranscriptBundle): Promise<string> {
	const hashHex = await bundleContentHash(bundle);
	return `bafk${hashHex.slice(0, 52)}`;
}

async function listStoredTranscriptRows(): Promise<StoredTranscriptRow[]> {
	return transcriptIdb.runReadTransaction(TRANSCRIPT_STORE, 'readonly', (tx) =>
		new Promise((resolve, reject) => {
			const req = tx.objectStore(TRANSCRIPT_STORE).getAll();
			req.onsuccess = () => resolve((req.result ?? []) as StoredTranscriptRow[]);
			req.onerror = () => reject(req.error);
		}),
	);
}

async function pruneTranscriptStore(now = Date.now()): Promise<void> {
	const rows = await listStoredTranscriptRows();
	const alive = rows.filter((row) => now - row.storedAt <= LOCAL_TRANSCRIPT_TTL_MS);
	alive.sort((a, b) => b.storedAt - a.storedAt);
	const keep = alive.slice(0, MAX_LOCAL_TRANSCRIPTS);
	const keepIds = new Set(keep.map((row) => row.cid));
	const drop = rows.filter((row) => !keepIds.has(row.cid) || now - row.storedAt > LOCAL_TRANSCRIPT_TTL_MS);
	if (drop.length === 0) return;
	await transcriptIdb.runWriteTransaction(TRANSCRIPT_STORE, (tx) => {
		const store = tx.objectStore(TRANSCRIPT_STORE);
		for (const row of drop) {
			store.delete(row.cid);
		}
	});
}

/**
 * Pin a transcript bundle to IPFS.
 */
export async function pinTranscript(bundle: TranscriptBundle): Promise<string | null> {
	const json = JSON.stringify(bundle);
	const bytes = new TextEncoder().encode(json);
	const hashHex = await sha256Hex(bytes);
	const localCID = `bafk${hashHex.slice(0, 52)}`;

	try {
		const resp = await fetch(OPERATOR_RELAY_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: json,
		});
		if (resp.ok) {
			const data = await resp.json();
			if (data.cid) {
				debug.log('[TranscriptIPFS] Pinned via operator relay:', data.cid);
				return data.cid;
			}
		}
	} catch {
		debug.log('[TranscriptIPFS] Operator relay unavailable, trying local storage');
	}

	try {
		await storeTranscriptLocally(localCID, bundle);
		debug.log('[TranscriptIPFS] Stored locally with pseudo-CID:', localCID);
		return localCID;
	} catch (err) {
		debug.warn('[TranscriptIPFS] Failed to store transcript locally:', err);
	}

	return null;
}

export async function fetchTranscript(cid: string): Promise<TranscriptBundle | null> {
	try {
		const local = await getTranscriptLocally(cid);
		if (local) return local;
	} catch { /* continue to IPFS */ }

	for (const gateway of IPFS_GATEWAYS) {
		try {
			const resp = await fetch(`${gateway}${cid}`, {
				signal: AbortSignal.timeout(10_000),
			});
			if (resp.ok) {
				const bundle = parseTranscriptBundle(await resp.json());
				if (bundle) {
					await storeTranscriptLocally(cid, bundle).catch(() => {});
					debug.log('[TranscriptIPFS] Fetched from IPFS gateway:', gateway);
					return bundle;
				}
			}
		} catch {
			continue;
		}
	}

	try {
		const resp = await fetch(`${OPERATOR_RELAY_ENDPOINT}/${cid}`, {
			signal: AbortSignal.timeout(10_000),
		});
		if (resp.ok) {
			const bundle = parseTranscriptBundle(await resp.json());
			if (bundle) {
				await storeTranscriptLocally(cid, bundle).catch(() => {});
				return bundle;
			}
		}
	} catch { /* all methods exhausted */ }

	debug.warn('[TranscriptIPFS] Could not retrieve transcript:', cid);
	return null;
}

export function parseTranscriptMoves(ndjson: string): Array<Record<string, unknown>> {
	return ndjson.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

async function storeTranscriptLocally(cid: string, bundle: TranscriptBundle): Promise<void> {
	const parsed = parseTranscriptBundle(bundle);
	if (!parsed) throw new Error('invalid transcript bundle');
	const contentHash = await bundleContentHash(parsed);
	const storedAt = Date.now();
	await transcriptIdb.runWriteTransaction(TRANSCRIPT_STORE, (tx) => {
		tx.objectStore(TRANSCRIPT_STORE).put({ cid, bundle: parsed, storedAt, contentHash } satisfies StoredTranscriptRow);
	});
	await pruneTranscriptStore(storedAt);
}

async function getTranscriptLocally(cid: string): Promise<TranscriptBundle | null> {
	const row = await transcriptIdb.runReadTransaction(TRANSCRIPT_STORE, 'readonly', (tx) =>
		new Promise<StoredTranscriptRow | undefined>((resolve, reject) => {
			const req = tx.objectStore(TRANSCRIPT_STORE).get(cid);
			req.onsuccess = () => resolve(req.result as StoredTranscriptRow | undefined);
			req.onerror = () => reject(req.error);
		}),
	);
	if (!row) return null;
	if (Date.now() - row.storedAt > LOCAL_TRANSCRIPT_TTL_MS) {
		await transcriptIdb.runWriteTransaction(TRANSCRIPT_STORE, (tx) => {
			tx.objectStore(TRANSCRIPT_STORE).delete(cid);
		});
		return null;
	}
	const bundle = parseTranscriptBundle(row.bundle);
	if (!bundle) {
		await transcriptIdb.runWriteTransaction(TRANSCRIPT_STORE, (tx) => {
			tx.objectStore(TRANSCRIPT_STORE).delete(cid);
		});
		return null;
	}
	if (isLocalPseudoCid(cid)) {
		const expectedCid = await expectedPseudoCid(bundle);
		if (expectedCid !== cid) {
			await transcriptIdb.runWriteTransaction(TRANSCRIPT_STORE, (tx) => {
				tx.objectStore(TRANSCRIPT_STORE).delete(cid);
			});
			return null;
		}
		const recomputed = await bundleContentHash(bundle);
		if (row.contentHash && row.contentHash !== recomputed) {
			await transcriptIdb.runWriteTransaction(TRANSCRIPT_STORE, (tx) => {
				tx.objectStore(TRANSCRIPT_STORE).delete(cid);
			});
			return null;
		}
	}
	return bundle;
}

export { MAX_LOCAL_TRANSCRIPTS, LOCAL_TRANSCRIPT_TTL_MS };