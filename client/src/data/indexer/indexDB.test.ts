import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRuntimeDatabaseName } from '../../game/config/networkConfig';
import {
	applyOptimisticElo,
	closeIndexDBForTests,
	getLeaderboard,
	getSyncMeta,
	putLeaderboard,
	putSupplyCounters,
	putSyncMeta,
} from './indexDB';

const INDEX_DB = createRuntimeDatabaseName('index-v1');

beforeEach(async () => {
	closeIndexDBForTests();
	await new Promise<void>((resolve, reject) => {
		const req = indexedDB.deleteDatabase(INDEX_DB);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
});

describe('indexDB atomic writes', () => {
	it('putLeaderboard clears and inserts in one transaction', async () => {
		await putLeaderboard([
			{ username: 'alice', elo: 1200, wins: 1, losses: 0, rank: 1 },
			{ username: 'bob', elo: 1100, wins: 0, losses: 1, rank: 2 },
		]);
		const after = await getLeaderboard();
		expect(after).toHaveLength(2);
		expect(after.map((row) => row.username).sort()).toEqual(['alice', 'bob']);
	});

	it('putSupplyCounters replaces all counters atomically', async () => {
		await putSupplyCounters({
			common: { pool: 'genesis', cap: 100, minted: 1 },
			rare: { pool: 'genesis', cap: 50, minted: 2 },
		});
		const first = await putSupplyCounters({ mythic: { pool: 'genesis', cap: 5, minted: 1 } });
		expect(first).toBeUndefined();
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(INDEX_DB);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const tx = db.transaction('global_supply', 'readonly');
		const all = await new Promise<unknown[]>((resolve, reject) => {
			const req = tx.objectStore('global_supply').getAll();
			req.onsuccess = () => resolve(req.result as unknown[]);
			req.onerror = () => reject(req.error);
		});
		db.close();
		expect(all).toHaveLength(1);
		expect((all[0] as { key: string }).key).toBe('mythic');
	});

	it('applyOptimisticElo is read-modify-write in one transaction', async () => {
		await putLeaderboard([{ username: 'alice', elo: 1000, wins: 2, losses: 1, rank: 1 }]);
		await applyOptimisticElo('alice', 1016, 1, 0);
		const board = await getLeaderboard();
		expect(board[0]).toMatchObject({ username: 'alice', elo: 1016, wins: 3, losses: 1 });
	});

	it('ignores corrupt leaderboard and sync rows on read', async () => {
		await putSyncMeta('checkpoint', 42);
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(INDEX_DB);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const tx = db.transaction(['global_leaderboard', 'index_sync'], 'readwrite');
		tx.objectStore('global_leaderboard').put({ username: 'bad', elo: NaN, wins: 0, losses: 0, rank: 1 });
		tx.objectStore('index_sync').put({ key: 'broken', value: undefined });
		await new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		db.close();
		closeIndexDBForTests();
		expect(await getLeaderboard()).toHaveLength(0);
		expect(await getSyncMeta('checkpoint')).toBe(42);
		expect(await getSyncMeta('broken')).toBeUndefined();
	});
});