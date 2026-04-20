/**
 * transcriptIPFS.ts — Upload and retrieve match transcripts to/from IPFS
 *
 * Lifecycle:
 *   1. Match ends → TranscriptBuilder.toTranscriptBundle() serializes moves
 *   2. pinTranscript() uploads to IPFS via gateway/operator → returns CID
 *   3. CID is embedded in match_result on-chain (transcriptCID field)
 *   4. fetchTranscript() retrieves by CID for replay/dispute
 *   5. WoT operators pin CID for 30 days, then unpin (pruning)
 *
 * Pinning strategy:
 *   - Primary: WoT operator relay (POST /api/transcript with Hive auth)
 *   - Fallback: Public IPFS gateway via web3.storage/nft.storage (if available)
 *   - Last resort: Store in IndexedDB locally (transcript still verifiable via merkleRoot on-chain)
 */

import type { TranscriptBundle } from './transcriptBuilder';
import { debug } from '../../game/config/debugConfig';

const IPFS_GATEWAYS = [
	'https://ipfs.io/ipfs/',
	'https://cloudflare-ipfs.com/ipfs/',
	'https://gateway.pinata.cloud/ipfs/',
	'https://dweb.link/ipfs/',
];

const OPERATOR_RELAY_ENDPOINT = '/api/transcript';
const TRANSCRIPT_DB_NAME = 'ragnarok-transcripts';
const TRANSCRIPT_STORE = 'transcripts';

/**
 * Pin a transcript bundle to IPFS.
 * Returns the CID string, or null if all methods fail.
 * Falls back to local IndexedDB storage if IPFS is unreachable.
 */
export async function pinTranscript(bundle: TranscriptBundle): Promise<string | null> {
	const json = JSON.stringify(bundle);
	const bytes = new TextEncoder().encode(json);

	// Compute a local hash as a pseudo-CID for fallback
	const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
	const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
	const localCID = `bafk${hashHex.slice(0, 52)}`;

	// Attempt 1: WoT operator relay
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

	// Attempt 2: Store locally in IndexedDB (transcript is still verifiable via merkleRoot)
	try {
		await storeTranscriptLocally(localCID, bundle);
		debug.log('[TranscriptIPFS] Stored locally with pseudo-CID:', localCID);
		return localCID;
	} catch (err) {
		debug.warn('[TranscriptIPFS] Failed to store transcript locally:', err);
	}

	return null;
}

/**
 * Fetch a transcript bundle by CID.
 * Tries IPFS gateways first, then local IndexedDB.
 */
export async function fetchTranscript(cid: string): Promise<TranscriptBundle | null> {
	// Try local first (fast)
	try {
		const local = await getTranscriptLocally(cid);
		if (local) return local;
	} catch { /* continue to IPFS */ }

	// Try IPFS gateways
	for (const gateway of IPFS_GATEWAYS) {
		try {
			const resp = await fetch(`${gateway}${cid}`, {
				signal: AbortSignal.timeout(10_000),
			});
			if (resp.ok) {
				const bundle = await resp.json() as TranscriptBundle;
				if (bundle.merkleRoot && bundle.moves) {
					// Cache locally for future lookups
					await storeTranscriptLocally(cid, bundle).catch(() => {});
					debug.log('[TranscriptIPFS] Fetched from IPFS gateway:', gateway);
					return bundle;
				}
			}
		} catch {
			continue;
		}
	}

	// Try operator relay
	try {
		const resp = await fetch(`${OPERATOR_RELAY_ENDPOINT}/${cid}`, {
			signal: AbortSignal.timeout(10_000),
		});
		if (resp.ok) {
			const bundle = await resp.json() as TranscriptBundle;
			if (bundle.merkleRoot && bundle.moves) {
				await storeTranscriptLocally(cid, bundle).catch(() => {});
				return bundle;
			}
		}
	} catch { /* all methods exhausted */ }

	debug.warn('[TranscriptIPFS] Could not retrieve transcript:', cid);
	return null;
}

/**
 * Parse NDJSON moves from a transcript bundle back into MoveRecords.
 */
export function parseTranscriptMoves(ndjson: string): Array<Record<string, unknown>> {
	return ndjson.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

// ─── Local IndexedDB storage (fallback) ────────────────────────────

function openTranscriptDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(TRANSCRIPT_DB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(TRANSCRIPT_STORE)) {
				db.createObjectStore(TRANSCRIPT_STORE, { keyPath: 'cid' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function storeTranscriptLocally(cid: string, bundle: TranscriptBundle): Promise<void> {
	const db = await openTranscriptDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(TRANSCRIPT_STORE, 'readwrite');
		tx.objectStore(TRANSCRIPT_STORE).put({ cid, bundle, storedAt: Date.now() });
		tx.oncomplete = () => { db.close(); resolve(); };
		tx.onerror = () => { db.close(); reject(tx.error); };
	});
}

async function getTranscriptLocally(cid: string): Promise<TranscriptBundle | null> {
	const db = await openTranscriptDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(TRANSCRIPT_STORE, 'readonly');
		const req = tx.objectStore(TRANSCRIPT_STORE).get(cid);
		req.onsuccess = () => {
			db.close();
			resolve(req.result?.bundle ?? null);
		};
		req.onerror = () => { db.close(); reject(req.error); };
	});
}
