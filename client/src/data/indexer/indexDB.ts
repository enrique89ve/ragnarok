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

const DB_NAME = 'ragnarok-index-v1';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
let dbPending: Promise<IDBDatabase> | null = null;

export function getIndexDB(): Promise<IDBDatabase> {
	if (dbInstance) return Promise.resolve(dbInstance);
	if (dbPending) return dbPending;

	dbPending = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;

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
		};

		request.onsuccess = () => {
			dbInstance = request.result;
			resolve(dbInstance);
		};

		request.onerror = () => {
			dbPending = null;
			reject(request.error);
		};
	});

	return dbPending;
}

// ============================================================
// Generic Helpers
// ============================================================

async function idbPut<T>(storeName: string, value: T): Promise<void> {
	const db = await getIndexDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(storeName, 'readwrite');
		tx.objectStore(storeName).put(value);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

async function idbGet<T>(storeName: string, key: string | number | string[]): Promise<T | undefined> {
	const db = await getIndexDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(storeName, 'readonly');
		const req = tx.objectStore(storeName).get(key);
		req.onsuccess = () => resolve(req.result as T | undefined);
		req.onerror = () => reject(req.error);
	});
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
	const db = await getIndexDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(storeName, 'readonly');
		const req = tx.objectStore(storeName).getAll();
		req.onsuccess = () => resolve(req.result as T[]);
		req.onerror = () => reject(req.error);
	});
}

async function idbGetByIndex<T>(
	storeName: string,
	indexName: string,
	key: string | number | string[],
): Promise<T[]> {
	const db = await getIndexDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(storeName, 'readonly');
		const req = tx.objectStore(storeName).index(indexName).getAll(key);
		req.onsuccess = () => resolve(req.result as T[]);
		req.onerror = () => reject(req.error);
	});
}

async function idbClear(storeName: string): Promise<void> {
	const db = await getIndexDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(storeName, 'readwrite');
		tx.objectStore(storeName).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

// ============================================================
// Index Ops Store
// ============================================================

export async function putIndexEntries(entries: IndexEntry[]): Promise<void> {
	if (entries.length === 0) return;
	const db = await getIndexDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('global_ops', 'readwrite');
		const store = tx.objectStore('global_ops');
		for (const entry of entries) {
			store.put(entry);
		}
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
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
	await idbClear('global_leaderboard');
	const db = await getIndexDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('global_leaderboard', 'readwrite');
		const store = tx.objectStore('global_leaderboard');
		for (const entry of entries) {
			store.put(entry);
		}
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
	const entries = await idbGetAll<LeaderboardEntry>('global_leaderboard');
	return entries.sort((a, b) => a.rank - b.rank);
}

export async function updateLeaderboardEntry(entry: LeaderboardEntry): Promise<void> {
	await idbPut('global_leaderboard', entry);
}

// ============================================================
// Supply Store
// ============================================================

export async function putSupplyCounters(counters: Record<string, { pool: string; cap: number; minted: number }>): Promise<void> {
	await idbClear('global_supply');
	const db = await getIndexDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('global_supply', 'readwrite');
		const store = tx.objectStore('global_supply');
		for (const [key, value] of Object.entries(counters)) {
			store.put({ key, ...value });
		}
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getSupplyCounter(key: string): Promise<{ pool: string; cap: number; minted: number } | undefined> {
	return idbGet('global_supply', key);
}

// ============================================================
// Sync Metadata
// ============================================================

export async function getSyncMeta(key: string): Promise<string | number | undefined> {
	const record = await idbGet<IndexSyncMeta>('index_sync', key);
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
	const existing = await idbGet<LeaderboardEntry>('global_leaderboard', username);
	const entry: LeaderboardEntry = {
		username,
		elo: eloAfter,
		wins: existing ? existing.wins + wins : wins,
		losses: existing ? existing.losses + losses : losses,
		rank: existing?.rank ?? 9999,
	};
	await idbPut('global_leaderboard', entry);
}

// ============================================================
// Cleanup
// ============================================================

export async function clearAllIndexData(): Promise<void> {
	await idbClear('global_ops');
	await idbClear('global_leaderboard');
	await idbClear('global_supply');
	await idbClear('index_sync');
}
