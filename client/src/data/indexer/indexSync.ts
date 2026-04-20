/**
 * Index Sync Service — Fetches index from IPFS, caches in IndexedDB
 *
 * Resolution priority:
 * 1. @ragnarok-index on-chain CID (freshest)
 * 2. IPFS gateway fetch (content-addressed)
 * 3. Hive account fallback (index_update ops as mini-index)
 * 4. Bundled snapshot (shipped with game)
 * 5. P2P peer exchange (WebRTC relay)
 *
 * See docs/DECENTRALIZED_INDEXER_DESIGN.md
 */

import { debug } from '../../game/config/debugConfig';
import { gunzipSync } from 'fflate';
import { HIVE_NODES } from '../blockchain/hiveConfig';
import type {
	IndexManifest, IndexEntry, LeaderboardSnapshot,
	SupplySnapshot, IndexHealthStatus,
} from '../../../../shared/indexer-types';
import {
	IPFS_GATEWAYS, MIN_OPERATORS_FOR_CONSENSUS,
	STATE_CONFIRMATION_QUORUM, RAGNAROK_INDEX_ACCOUNT,
} from '../../../../shared/indexer-types';
import {
	putIndexEntries, putLeaderboard, putSupplyCounters,
	getSyncMeta, putSyncMeta,
} from './indexDB';

// ============================================================
// State
// ============================================================

let syncInProgress = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let healthStatus: IndexHealthStatus = 'offline';

export function getIndexHealthStatus(): IndexHealthStatus {
	return healthStatus;
}

// ============================================================
// Hive RPC (lightweight, reuses node list)
// ============================================================

async function callHive<T>(method: string, params: unknown[]): Promise<T> {
	for (const node of HIVE_NODES) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		try {
			const resp = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
				signal: controller.signal,
			});
			clearTimeout(timeout);
			const data = await resp.json() as { result?: T };
			if (data.result == null) {
				throw new Error(`Hive RPC returned null result for ${method}`);
			}
			return data.result;
		} catch (err) {
			clearTimeout(timeout);
			if (node === HIVE_NODES[HIVE_NODES.length - 1]) throw err;
			continue;
		}
	}
	throw new Error('All Hive nodes failed');
}

// ============================================================
// Step 1: Resolve Latest CID from @ragnarok-index
// ============================================================

interface HiveHistoryEntry {
	op: [string, Record<string, unknown>];
}

async function resolveLatestCID(): Promise<string | null> {
	try {
		const history = await callHive<Array<[number, HiveHistoryEntry]>>(
			'condenser_api.get_account_history',
			[RAGNAROK_INDEX_ACCOUNT, -1, 50],
		);

		if (!Array.isArray(history)) return null;

		for (let i = history.length - 1; i >= 0; i--) {
			const [, entry] = history[i];
			if (entry.op[0] !== 'custom_json') continue;
			const opData = entry.op[1];
			if (opData.id !== 'ragnarok-cards') continue;
			try {
				const payload = JSON.parse(opData.json as string) as Record<string, unknown>;
				if (payload.action === 'index_update' && typeof payload.cid === 'string') {
					return payload.cid;
				}
			} catch { continue; }
		}
	} catch (err) {
		debug.warn('[IndexSync] Failed to resolve CID from chain:', err);
	}
	return null;
}

// ============================================================
// Step 2: Fetch from IPFS
// ============================================================

async function fetchFromIPFS<T>(cid: string, filePath: string): Promise<T | null> {
	for (const gateway of IPFS_GATEWAYS) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15000);
		try {
			const url = `${gateway}${cid}/${filePath}`;
			const resp = await fetch(url, { signal: controller.signal });
			clearTimeout(timeout);
			if (!resp.ok) continue;
			return await resp.json() as T;
		} catch {
			clearTimeout(timeout);
			continue;
		}
	}
	return null;
}

async function fetchChunkFromIPFS(cid: string, chunkPath: string): Promise<IndexEntry[]> {
	// Try gzipped version first (75% smaller), fall back to raw NDJSON
	const paths = chunkPath.endsWith('.gz') ? [chunkPath] : [`${chunkPath}.gz`, chunkPath];

	for (const tryPath of paths) {
		const isGz = tryPath.endsWith('.gz');
		for (const gateway of IPFS_GATEWAYS) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 30000);
			try {
				const url = `${gateway}${cid}/${tryPath}`;
				const resp = await fetch(url, { signal: controller.signal });
				clearTimeout(timeout);
				if (!resp.ok) continue;

				let text: string;
				if (isGz) {
					const buf = await resp.arrayBuffer();
					text = new TextDecoder().decode(gunzipSync(new Uint8Array(buf)));
				} else {
					text = await resp.text();
				}

				const entries: IndexEntry[] = [];
				for (const line of text.split('\n')) {
					if (!line.trim()) continue;
					try {
						entries.push(JSON.parse(line) as IndexEntry);
					} catch { /* skip malformed lines */ }
				}
				return entries;
			} catch {
				clearTimeout(timeout);
				continue;
			}
		}
	}
	return [];
}

// ============================================================
// Step 2b: HafSQL Fallback (zero-infrastructure public indexer)
// When IPFS is unreachable, query HafSQL for raw ops directly.
// See: https://hafsql-api.mahdiyari.info
// ============================================================

const HAFSQL_ENDPOINTS = [
	'https://hafsql-api.mahdiyari.info',
];

interface HafSQLOp {
	block_num: number;
	trx_id: string;
	timestamp: string;
	body: {
		id: string;
		json: string;
		required_auths: string[];
		required_posting_auths: string[];
	};
}

async function fetchFromHafSQL(fromBlock: number, limit: number = 1000): Promise<IndexEntry[]> {
	for (const endpoint of HAFSQL_ENDPOINTS) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15000);
		try {
			const url = `${endpoint}/operations/custom_json/ragnarok-cards?from_block=${fromBlock}&limit=${limit}`;
			const resp = await fetch(url, { signal: controller.signal });
			clearTimeout(timeout);
			if (!resp.ok) continue;

			const ops = await resp.json() as HafSQLOp[];
			if (!Array.isArray(ops)) continue;

			return ops.map((op, idx) => {
				let parsed: Record<string, unknown> = {};
				try { parsed = JSON.parse(op.body.json); } catch { /* skip */ }
				const broadcaster = op.body.required_auths[0] || op.body.required_posting_auths[0] || '';
				return {
					trxId: op.trx_id,
					blockNum: op.block_num,
					timestamp: new Date(op.timestamp).getTime(),
					action: (parsed.action as string) || 'unknown',
					player: broadcaster,
					opIndexInBlock: idx,
				} as IndexEntry;
			});
		} catch {
			clearTimeout(timeout);
			continue;
		}
	}
	return [];
}

// ============================================================
// Step 3: Validate Manifest Attestations
// ============================================================

function validateManifest(manifest: IndexManifest): IndexHealthStatus {
	if (!Array.isArray(manifest.attestations) || manifest.attestations.length === 0) {
		return 'snapshot-only';
	}

	const activeAttestations = manifest.attestations.filter(a => {
		const ageMs = Date.now() - a.timestamp;
		return ageMs < 24 * 60 * 60 * 1000;
	});

	const uniqueOperators = new Set(activeAttestations.map(a => a.operator));

	if (uniqueOperators.size >= MIN_OPERATORS_FOR_CONSENSUS) {
		const hashCounts = new Map<string, number>();
		for (const a of activeAttestations) {
			hashCounts.set(a.stateHash, (hashCounts.get(a.stateHash) || 0) + 1);
		}

		if (hashCounts.size === 0) return 'degraded';

		const maxCount = Math.max(...hashCounts.values());
		const quorum = maxCount / uniqueOperators.size;

		if (quorum >= STATE_CONFIRMATION_QUORUM) {
			return 'healthy';
		}
		return 'degraded';
	}

	if (uniqueOperators.size > 0) {
		return 'degraded';
	}

	return 'snapshot-only';
}

// ============================================================
// Main Sync Flow
// ============================================================

export async function syncIndex(): Promise<void> {
	if (syncInProgress) return;
	syncInProgress = true;

	try {
		const localLastBlock = await getSyncMeta('lastBlock') as number | undefined;
		const localCid = await getSyncMeta('lastCid') as string | undefined;

		const latestCid = await resolveLatestCID();

		if (!latestCid) {
			debug.warn('[IndexSync] No CID found. Trying HafSQL fallback...');
			const hafEntries = await fetchFromHafSQL(localLastBlock || 0, 5000);
			if (hafEntries.length > 0) {
				await putIndexEntries(hafEntries);
				const maxBlock = Math.max(...hafEntries.map(e => e.blockNum));
				await putSyncMeta('lastBlock', maxBlock);
				await putSyncMeta('lastSyncAt', Date.now());
				healthStatus = 'degraded';
				debug.log(`[IndexSync] HafSQL fallback: loaded ${hafEntries.length} ops up to block ${maxBlock}`);
				return;
			}
			healthStatus = localLastBlock ? 'snapshot-only' : 'offline';
			return;
		}

		if (latestCid === localCid) {
			debug.log('[IndexSync] Already at latest CID.');
			return;
		}

		const manifest = await fetchFromIPFS<IndexManifest>(latestCid, 'manifest.json');
		if (!manifest || !Array.isArray(manifest.chunks)) {
			debug.warn('[IndexSync] Failed to fetch manifest from IPFS or invalid shape.');
			healthStatus = 'degraded';
			return;
		}

		healthStatus = validateManifest(manifest);
		debug.log(`[IndexSync] Health: ${healthStatus}, Block: ${manifest.lastBlock}, Ops: ${manifest.totalOps}`);

		const [leaderboard, supply] = await Promise.all([
			fetchFromIPFS<LeaderboardSnapshot>(latestCid, manifest.snapshots.leaderboard),
			fetchFromIPFS<SupplySnapshot>(latestCid, manifest.snapshots.supply),
		]);

		if (leaderboard?.entries) {
			await putLeaderboard(leaderboard.entries);
			debug.log(`[IndexSync] Leaderboard loaded: ${leaderboard.entries.length} entries`);
		}

		if (supply?.counters) {
			await putSupplyCounters(supply.counters);
			debug.log(`[IndexSync] Supply counters loaded`);
		}

		const chunksToFetch = manifest.chunks.filter(c =>
			!localLastBlock || c.blockRange[0] > localLastBlock
		);

		const compactedToFetch = !localLastBlock && manifest.compacted
			? manifest.compacted
			: [];

		const allChunks = [...compactedToFetch, ...chunksToFetch];
		debug.log(`[IndexSync] Fetching ${compactedToFetch.length} compacted + ${chunksToFetch.length} chunks (parallel)`);

		// Fetch all chunks in parallel (was sequential — 10 chunks × 30s = 5 min worst case)
		const MAX_CONCURRENT = 5;
		for (let i = 0; i < allChunks.length; i += MAX_CONCURRENT) {
			const batch = allChunks.slice(i, i + MAX_CONCURRENT);
			const results = await Promise.all(
				batch.map(chunk => fetchChunkFromIPFS(latestCid, chunk.file)
					.then(entries => ({ chunk, entries }))
					.catch(() => ({ chunk, entries: [] as IndexEntry[] }))
				)
			);
			for (const { chunk, entries } of results) {
				if (entries.length > 0) {
					await putIndexEntries(entries);
					debug.log(`[IndexSync] Loaded ${chunk.file}: ${entries.length} entries`);
				}
			}
		}

		await putSyncMeta('lastBlock', manifest.lastBlock);
		await putSyncMeta('lastCid', latestCid);
		await putSyncMeta('lastSyncAt', Date.now());
		await putSyncMeta('totalOps', manifest.totalOps);
		await putSyncMeta('healthStatus', healthStatus);

		debug.log(`[IndexSync] Sync complete. Block: ${manifest.lastBlock}, Total ops: ${manifest.totalOps}`);
	} catch (err) {
		debug.warn('[IndexSync] Sync failed:', err);
		healthStatus = 'degraded';
	} finally {
		syncInProgress = false;
	}
}

// ============================================================
// Auto Sync (poll every 60 seconds)
// ============================================================

export function startIndexSync(intervalMs = 60_000): void {
	stopIndexSync();

	syncIndex().catch(err => debug.warn('[IndexSync] Initial sync failed:', err));

	syncTimer = setInterval(() => {
		syncIndex().catch(err => debug.warn('[IndexSync] Periodic sync failed:', err));
	}, intervalMs);

	debug.log(`[IndexSync] Started auto-sync every ${intervalMs / 1000}s`);
}

export function stopIndexSync(): void {
	if (syncTimer) {
		clearInterval(syncTimer);
		syncTimer = null;
		debug.log('[IndexSync] Stopped auto-sync');
	}
}
