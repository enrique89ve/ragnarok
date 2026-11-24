import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint } from '@shared/protocolPhase';
import { createLocalSettlement, applyLocalSettlement, LOCAL_SETTLEMENT_PHASE_ID } from '@shared/protocol-core/localSettlement';
import { createRuntimeDatabaseName } from '../../game/config/networkConfig';
import {
	closeReplayDBForTests,
	commitLocalSettlement,
	getCard,
	getCorruptRecords,
	getEloRating,
	getLocalCampaignSettlementsByAccount,
	getLocalSettlementsByAccount,
	getRuneLedgerEntries,
	getRuneLedgerTotal,
	getSyncCursor,
	putCard,
	putEloRating,
	putSyncCursor,
	resetReplayDatabaseForTests,
} from './replayDB';

const CHAIN_DB = createRuntimeDatabaseName('chain-v1');

beforeEach(async () => {
	closeReplayDBForTests();
	await resetReplayDatabaseForTests();
});

describe('replayDB hardening', () => {
	it('upgrades legacy DB and adds corrupt_records store', async () => {
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.open(CHAIN_DB, 20);
			req.onupgradeneeded = () => {
				const db = req.result;
				db.createObjectStore('cards', { keyPath: 'uid' });
				db.createObjectStore('sync_cursors', { keyPath: 'account' });
				db.createObjectStore('rune_ledger', { keyPath: 'entryId' });
				db.createObjectStore('elo_ratings', { keyPath: 'account' });
			};
			req.onsuccess = () => {
				const db = req.result;
				const tx = db.transaction(['cards', 'sync_cursors', 'rune_ledger', 'elo_ratings'], 'readwrite');
				tx.objectStore('cards').put({ uid: 'legacy-card', cardId: 1, ownerId: 'alice', rarity: 'common' });
				tx.objectStore('sync_cursors').put({ account: 'alice', lastHistoryIndex: 10, lastSyncedAt: 100 });
				tx.objectStore('rune_ledger').put({
					entryId: 'legacy-rune', seasonId: 's', account: 'alice', direction: 'credit',
					amount: 1, sourceType: 'p2p_ranked', sourceKey: 'k', balanceBefore: 0, balanceAfter: 1,
				});
				tx.objectStore('elo_ratings').put({ account: 'alice', elo: 1000, wins: 1, losses: 0, lastMatchBlock: 0 });
				tx.oncomplete = () => { db.close(); resolve(); };
				tx.onerror = () => reject(tx.error);
			};
			req.onerror = () => reject(req.error);
		});

		closeReplayDBForTests();
		expect(await getCard('legacy-card')).toMatchObject({ uid: 'legacy-card' });
		expect(await getSyncCursor('alice')).toEqual({ account: 'alice', lastHistoryIndex: 10, lastSyncedAt: 100 });

		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(CHAIN_DB);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		expect(db.objectStoreNames.contains('corrupt_records')).toBe(true);
		db.close();
	});

	it('quarantines corrupt ledger rows and never returns NaN totals', async () => {
		await putSyncCursor({ account: 'seed', lastHistoryIndex: 0, lastSyncedAt: 0 });
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(CHAIN_DB);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const tx = db.transaction(['rune_ledger', 'sync_cursors'], 'readwrite');
		tx.objectStore('rune_ledger').put({
			entryId: 'bad-amount', seasonId: 's', account: 'alice', direction: 'credit',
			amount: NaN, sourceType: 'p2p_ranked', sourceKey: 'k',
		});
		tx.objectStore('rune_ledger').put({
			entryId: 'bad-string', seasonId: 's', account: 'alice', direction: 'credit',
			amount: '999', sourceType: 'p2p_ranked', sourceKey: 'k2',
		});
		tx.objectStore('sync_cursors').put({ account: 'alice', lastHistoryIndex: NaN, lastSyncedAt: 1 });
		await new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		db.close();
		closeReplayDBForTests();
		expect(await getSyncCursor('alice')).toBeUndefined();
		const entries = await getRuneLedgerEntries({ seasonId: 's', account: 'alice' });
		expect(entries).toHaveLength(0);
		const total = await getRuneLedgerTotal({ seasonId: 's', account: 'alice', direction: 'credit' });
		expect(Number.isNaN(total)).toBe(false);
		await new Promise((r) => setTimeout(r, 25));
		const corrupt = await getCorruptRecords();
		expect(corrupt.length).toBeGreaterThan(0);
	});

	it('commits concurrent settlements without losing wins or ELO progression', async () => {
		await putEloRating({ account: 'alice', elo: 1000, wins: 0, losses: 0, lastMatchBlock: 0 });
		await putEloRating({ account: 'bob', elo: 1000, wins: 0, losses: 0, lastMatchBlock: 0 });
		const fingerprint = createProtocolRuntimeFingerprint({
			stage: 'testnet', phaseId: LOCAL_SETTLEMENT_PHASE_ID, protocolId: 'idb-concurrent',
			resetEpoch: 'idb-concurrent', seasonStart: '2026-01-01T00:00:00Z', indexStartBlock: 1,
		});
		const first = createLocalSettlement({
			runtimeFingerprint: fingerprint, matchId: 'concurrent-a', timestamp: 1,
			seed: 'seed', resultHash: 'hash-a', winnerAccount: 'alice', loserAccount: 'bob',
			winnerEloBefore: 1000, loserEloBefore: 1000, seasonId: 's', winnerRuneAmount: 1,
		});
		const second = createLocalSettlement({
			runtimeFingerprint: fingerprint, matchId: 'concurrent-b', timestamp: 2,
			seed: 'seed', resultHash: 'hash-b', winnerAccount: 'bob', loserAccount: 'alice',
			winnerEloBefore: 1000, loserEloBefore: 1000, seasonId: 's', winnerRuneAmount: 1,
		});
		expect(await applyLocalSettlement(first, { commit: commitLocalSettlement }, fingerprint.representation)).toMatchObject({ status: 'applied' });
		expect(await applyLocalSettlement(second, { commit: commitLocalSettlement }, fingerprint.representation)).toMatchObject({ status: 'applied' });
		const alice = await getEloRating('alice');
		const bob = await getEloRating('bob');
		expect(alice).toMatchObject({ wins: 1, losses: 1 });
		expect(bob).toMatchObject({ wins: 1, losses: 1 });
		expect(alice.elo).not.toBe(1000);
		expect(bob.elo).not.toBe(1000);
	});

	it('quarantines malformed local settlement rows on read', async () => {
		await putSyncCursor({ account: 'seed', lastHistoryIndex: 0, lastSyncedAt: 0 });
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(CHAIN_DB);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const tx = db.transaction(['local_settlements', 'local_campaign_settlements'], 'readwrite');
		tx.objectStore('local_settlements').put({
			eventId: 'bad-pvp-ts',
			matchId: 'm1',
			timestamp: 'bad',
			runtimeFingerprint: 'fp',
			participants: ['alice', 'bob'],
		});
		tx.objectStore('local_settlements').put({
			eventId: 'bad-pvp-fp',
			matchId: 'm2',
			timestamp: 1,
			runtimeFingerprint: '',
			participants: ['alice', 'carol'],
		});
		tx.objectStore('local_campaign_settlements').put({
			eventId: 'bad-campaign-ts',
			missionId: 'norse-1',
			timestamp: 'nope',
			runtimeFingerprint: 'fp',
			account: 'alice',
		});
		tx.objectStore('local_campaign_settlements').put({
			eventId: 'bad-campaign-mission',
			missionId: '',
			timestamp: 2,
			runtimeFingerprint: 'fp',
			account: 'alice',
		});
		await new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		db.close();
		closeReplayDBForTests();

		expect(await getLocalSettlementsByAccount('alice')).toHaveLength(0);
		expect(await getLocalCampaignSettlementsByAccount('alice')).toHaveLength(0);
		await new Promise((r) => setTimeout(r, 25));
		const corrupt = await getCorruptRecords();
		const stores = new Set(corrupt.map((row) => row.storeName));
		expect(stores.has('local_settlements')).toBe(true);
		expect(stores.has('local_campaign_settlements')).toBe(true);
	});

	it('skips malformed cards on read', async () => {
		await putCard({ uid: 'good', cardId: 1, ownerId: 'alice', rarity: 'common' } as never);
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.open(CHAIN_DB);
			req.onsuccess = () => {
				const db = req.result;
				const tx = db.transaction('cards', 'readwrite');
				tx.objectStore('cards').put({ uid: 'bad', cardId: 'x', ownerId: 'alice', rarity: 'common' });
				tx.oncomplete = () => { db.close(); resolve(); };
				tx.onerror = () => reject(tx.error);
			};
			req.onerror = () => reject(req.error);
		});
		closeReplayDBForTests();
		expect(await getCard('good')).toBeDefined();
		expect(await getCard('bad')).toBeUndefined();
		await putSyncCursor({ account: 'ok', lastHistoryIndex: 1, lastSyncedAt: 10 });
		expect(await getSyncCursor('ok')).toBeDefined();
	});
});