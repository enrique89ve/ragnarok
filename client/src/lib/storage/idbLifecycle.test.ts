import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { awaitTransaction, createManagedIndexedDB, IdbBlockedError } from './idbLifecycle';

let dbCounter = 0;

function nextDbName(): string {
	dbCounter += 1;
	return `idb-lifecycle-test-${dbCounter}`;
}

afterEach(async () => {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
});

describe('idbLifecycle', () => {
	it('dedupes concurrent open() calls', async () => {
		const name = nextDbName();
		const managed = createManagedIndexedDB({
			name,
			version: 1,
			onUpgrade: (db) => {
				if (!db.objectStoreNames.contains('items')) {
					db.createObjectStore('items', { keyPath: 'id' });
				}
			},
		});
		const [a, b] = await Promise.all([managed.open(), managed.open()]);
		expect(a).toBe(b);
		managed.close();
	});

	it('runWriteTransaction resolves only after tx.oncomplete', async () => {
		const name = nextDbName();
		const managed = createManagedIndexedDB({
			name,
			version: 1,
			onUpgrade: (db) => {
				if (!db.objectStoreNames.contains('items')) {
					db.createObjectStore('items', { keyPath: 'id' });
				}
			},
		});
		await managed.runWriteTransaction('items', (tx) => {
			tx.objectStore('items').put({ id: 'x', value: 1 });
		});
		const db = await managed.open();
		const row = await new Promise<unknown>((resolve, reject) => {
			const tx = db.transaction('items', 'readonly');
			const req = tx.objectStore('items').get('x');
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		expect(row).toEqual({ id: 'x', value: 1 });
		managed.close();
	});

	it('invokes onVersionChange and reopens after external upgrade', async () => {
		const name = nextDbName();
		let sawVersionChange = false;
		const managed = createManagedIndexedDB({
			name,
			version: 1,
			onVersionChange: () => {
				sawVersionChange = true;
			},
			onUpgrade: (db) => db.createObjectStore('items', { keyPath: 'id' }),
		});
		const v1 = await managed.open();
		v1.close();
		managed.close();
		const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(name, 2);
			req.onupgradeneeded = () => {
				if (!req.result.objectStoreNames.contains('meta')) {
					req.result.createObjectStore('meta', { keyPath: 'k' });
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		upgraded.close();
		const reopened = createManagedIndexedDB({
			name,
			version: 2,
			onVersionChange: () => {
				sawVersionChange = true;
			},
			onUpgrade: () => undefined,
		});
		const v2 = await reopened.open();
		expect(v2.version).toBe(2);
		expect(sawVersionChange).toBe(false);
		reopened.close();
	});

	it('awaitTransaction waits for transaction completion', async () => {
		const name = nextDbName();
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(name, 1);
			req.onupgradeneeded = () => req.result.createObjectStore('items', { keyPath: 'id' });
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const tx = db.transaction('items', 'readwrite');
		tx.objectStore('items').put({ id: 'y' });
		await awaitTransaction(tx);
		db.close();
	});

	it('exposes recoverable IdbBlockedError', () => {
		const err = new IdbBlockedError('demo-db');
		expect(err).toBeInstanceOf(Error);
		expect(err.databaseName).toBe('demo-db');
	});

	it('runWriteTransaction completes when fn returns a promise on IDBRequest', async () => {
		const name = nextDbName();
		const managed = createManagedIndexedDB({
			name,
			version: 1,
			onUpgrade: (db) => {
				if (!db.objectStoreNames.contains('items')) {
					db.createObjectStore('items', { keyPath: 'id' });
				}
			},
		});
		await managed.runWriteTransaction('items', (tx) =>
			new Promise<void>((resolve, reject) => {
				const req = tx.objectStore('items').put({ id: 'async-write', value: 2 });
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			}),
		);
		const db = await managed.open();
		const row = await new Promise<unknown>((resolve, reject) => {
			const tx = db.transaction('items', 'readonly');
			const req = tx.objectStore('items').get('async-write');
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		expect(row).toEqual({ id: 'async-write', value: 2 });
		managed.close();
	});

	it('runReadTransaction completes when fn returns a promise on IDBRequest', async () => {
		const name = nextDbName();
		const managed = createManagedIndexedDB({
			name,
			version: 1,
			onUpgrade: (db) => {
				if (!db.objectStoreNames.contains('items')) {
					db.createObjectStore('items', { keyPath: 'id' });
				}
			},
		});
		await managed.runWriteTransaction('items', (tx) => {
			tx.objectStore('items').put({ id: 'read-target', value: 7 });
		});
		const value = await managed.runReadTransaction('items', 'readonly', (tx) =>
			new Promise<number>((resolve, reject) => {
				const req = tx.objectStore('items').get('read-target');
				req.onsuccess = () => resolve((req.result as { value: number }).value);
				req.onerror = () => reject(req.error);
			}),
		);
		expect(value).toBe(7);
		managed.close();
	});

	it('closes connection when onsuccess fires after blocked timeout', async () => {
		const name = nextDbName();
		const holder = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(name, 1);
			req.onupgradeneeded = () => req.result.createObjectStore('items', { keyPath: 'id' });
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});

		const managed = createManagedIndexedDB({
			name,
			version: 2,
			blockedTimeoutMs: 40,
			onUpgrade: (db) => {
				if (!db.objectStoreNames.contains('meta')) {
					db.createObjectStore('meta', { keyPath: 'k' });
				}
			},
		});

		const openPromise = managed.open();
		await expect(openPromise).rejects.toBeInstanceOf(IdbBlockedError);
		holder.close();

		await new Promise((r) => setTimeout(r, 0));
		const reopened = await managed.open();
		expect(reopened.version).toBe(2);
		managed.close();
	});
});