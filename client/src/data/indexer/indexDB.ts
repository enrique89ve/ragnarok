/**
 * Global Index — IndexedDB Extension
 *
 * Adds 4 global stores to the existing replayDB for decentralized index data.
 * These stores cache the IPFS-hosted op log index locally for instant queries.
 *
 * See docs/DECENTRALIZED_INDEXER_DESIGN.md
 */

import type {
	IndexEntry, LeaderboardEntry, IndexSyncMeta,
} from '../../../../shared/indexer-types';
import { createRuntimeDatabaseName } from '../../game/config/networkConfig';
import { createManagedIndexedDB } from '../../lib/storage/idbLifecycle';

const DB_NAME = createRuntimeDatabaseName('index-v1');
const DB_VERSION = 1;

const indexIdb = createManagedIndexedDB({
	name: DB_NAME,
	version: DB_VERSION,
	onUpgrade: (db) => {
		if (!db.objectStoreNames.contains('global_ops')) {
			const opsStore = db.createObjectStore('global_ops', {
				keyPath: ['trxId', 'opIndexInBlock'],
			});
			opsStore.createIndex('by_player', 'player', { unique: false });
			opsStore.createIndex('by_action', 'action', { unique: false });
			opsStore.createIndex('by_block', 'blockNum', { unique: false });
			opsStore.createIndex('by_player_action', ['player', 'action'], { unique: false });
			opsStore.createIndex('by_counterparty', 'counterparty', { unique: false });
		}

		if (!db.objectStoreNames.contains('global_leaderboard')) {
			db.createObjectStore('global_leaderboard', { keyPath: 'username' });
		}

		if (!db.objectStoreNames.contains('global_supply')) {
			db.createObjectStore('global_supply', { keyPath: 'key' });
		}

		if (!db.objectStoreNames.contains('index_sync')) {
			db.createObjectStore('index_sync', { keyPath: 'key' });
		}
	},
});

export function getIndexDB(): Promise<IDBDatabase> {
	return indexIdb.open();
}

export function closeIndexDBForTests(): void {
	indexIdb.close();
}

// ============================================================
// Runtime validation
// ============================================================

function parseLeaderboardEntry(raw: unknown): LeaderboardEntry | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (typeof row.username !== 'string' || row.username.length === 0) return undefined;
	if (typeof row.elo !== 'number' || !Number.isFinite(row.elo)) return undefined;
	if (typeof row.wins !== 'number' || !Number.isSafeInteger(row.wins) || row.wins < 0) return undefined;
	if (typeof row.losses !== 'number' || !Number.isSafeInteger(row.losses) || row.losses < 0) return undefined;
	if (typeof row.rank !== 'number' || !Number.isSafeInteger(row.rank)) return undefined;
	return raw as LeaderboardEntry;
}

function parseSupplyRow(raw: unknown): { key: string; pool: string; cap: number; minted: number } | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (typeof row.key !== 'string') return undefined;
	if (typeof row.pool !== 'string') return undefined;
	if (typeof row.cap !== 'number' || !Number.isFinite(row.cap)) return undefined;
	if (typeof row.minted !== 'number' || !Number.isFinite(row.minted)) return undefined;
	return { key: row.key, pool: row.pool, cap: row.cap, minted: row.minted };
}

function parseIndexSyncMeta(raw: unknown): IndexSyncMeta | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const row = raw as Record<string, unknown>;
	if (typeof row.key !== 'string') return undefined;
	if (typeof row.value !== 'string' && typeof row.value !== 'number') return undefined;
	return { key: row.key, value: row.value };
}

// ============================================================
// Generic Helpers
// ============================================================

async function idbPut<T>(storeName: string, value: T): Promise<void> {
	await indexIdb.runWriteTransaction(storeName, (tx) => {
		tx.objectStore(storeName).put(value);
	});
}

async function idbGet<T>(storeName: string, key: string | number | string[]): Promise<T | undefined> {
	return indexIdb.runReadTransaction(storeName, 'readonly', (tx) =>
		new Promise((resolve, reject) => {
			const req = tx.objectStore(storeName).get(key);
			req.onsuccess = () => resolve(req.result as T | undefined);
			req.onerror = () => reject(req.error);
		}),
	);
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
	return indexIdb.runReadTransaction(storeName, 'readonly', (tx) =>
		new Promise((resolve, reject) => {
			const req = tx.objectStore(storeName).getAll();
			req.onsuccess = () => resolve(req.result as T[]);
			req.onerror = () => reject(req.error);
		}),
	);
}

async function idbGetByIndex<T>(
	storeName: string,
	indexName: string,
	key: string | number | string[],
): Promise<T[]> {
	return indexIdb.runReadTransaction(storeName, 'readonly', (tx) =>
		new Promise((resolve, reject) => {
			const req = tx.objectStore(storeName).index(indexName).getAll(key);
			req.onsuccess = () => resolve(req.result as T[]);
			req.onerror = () => reject(req.error);
		}),
	);
}

// ============================================================
// Index Ops Store
// ============================================================

export async function putIndexEntries(entries: IndexEntry[]): Promise<void> {
	if (entries.length === 0) return;
	await indexIdb.runWriteTransaction('global_ops', (tx) => {
		const store = tx.objectStore('global_ops');
		for (const entry of entries) {
			store.put(entry);
		}
	});
}

export async function getOpsByPlayer(player: string): Promise<IndexEntry[]> {
	return idbGetByIndex<IndexEntry>('global_ops', 'by_player', player);
}

export async function getOpsByPlayerAction(player: string, action: string): Promise<IndexEntry[]> {
	return idbGetByIndex<IndexEntry>('global_ops', 'by_player_action', [player, action]);
}

export async function getOpsByBlock(blockNum: number): Promise<IndexEntry[]> {
	return idbGetByIndex<IndexEntry>('global_ops', 'by_block', blockNum);
}

// ============================================================
// Leaderboard Store
// ============================================================

export async function putLeaderboard(entries: LeaderboardEntry[]): Promise<void> {
	await indexIdb.runWriteTransaction('global_leaderboard', (tx) => {
		const store = tx.objectStore('global_leaderboard');
		store.clear();
		for (const entry of entries) {
			store.put(entry);
		}
	});
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
	const rows = await idbGetAll<unknown>('global_leaderboard');
	const entries = rows
		.map(parseLeaderboardEntry)
		.filter((entry): entry is LeaderboardEntry => entry !== undefined);
	return entries.sort((a, b) => a.rank - b.rank);
}

export async function updateLeaderboardEntry(entry: LeaderboardEntry): Promise<void> {
	await idbPut('global_leaderboard', entry);
}

// ============================================================
// Supply Store
// ============================================================

export async function putSupplyCounters(counters: Record<string, { pool: string; cap: number; minted: number }>): Promise<void> {
	await indexIdb.runWriteTransaction('global_supply', (tx) => {
		const store = tx.objectStore('global_supply');
		store.clear();
		for (const [key, value] of Object.entries(counters)) {
			store.put({ key, ...value });
		}
	});
}

export async function getSupplyCounter(key: string): Promise<{ pool: string; cap: number; minted: number } | undefined> {
	const raw = await idbGet<unknown>('global_supply', key);
	return raw === undefined ? undefined : parseSupplyRow(raw);
}

// ============================================================
// Sync Metadata
// ============================================================

export async function getSyncMeta(key: string): Promise<string | number | undefined> {
	const raw = await idbGet<unknown>('index_sync', key);
	const record = raw === undefined ? undefined : parseIndexSyncMeta(raw);
	return record?.value;
}

export async function putSyncMeta(key: string, value: string | number): Promise<void> {
	await idbPut('index_sync', { key, value });
}

// ============================================================
// Optimistic Local Updates
// ============================================================

export async function applyOptimisticElo(
	username: string,
	eloAfter: number,
	wins: number,
	losses: number,
): Promise<void> {
	await indexIdb.runWriteTransaction('global_leaderboard', (tx) => {
		const store = tx.objectStore('global_leaderboard');
		const request = store.get(username);
		request.onsuccess = () => {
			const existing = parseLeaderboardEntry(request.result);
			const entry: LeaderboardEntry = {
				username,
				elo: eloAfter,
				wins: existing ? existing.wins + wins : wins,
				losses: existing ? existing.losses + losses : losses,
				rank: existing?.rank ?? 9999,
			};
			store.put(entry);
		};
	});
}

// ============================================================
// Cleanup
// ============================================================

export async function clearAllIndexData(): Promise<void> {
	await indexIdb.runWriteTransaction(
		['global_ops', 'global_leaderboard', 'global_supply', 'index_sync'],
		(tx) => {
			for (const name of ['global_ops', 'global_leaderboard', 'global_supply', 'index_sync'] as const) {
				tx.objectStore(name).clear();
			}
		},
	);
}