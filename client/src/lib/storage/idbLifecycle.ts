/**
 * Shared IndexedDB open lifecycle: deduped opens, versionchange/blocked handling,
 * and transaction helpers that resolve writes on tx.oncomplete.
 */

export const IDB_VERSIONCHANGE_EVENT = 'ragnarok:idb-versionchange';
export const IDB_BLOCKED_EVENT = 'ragnarok:idb-blocked';

export class IdbBlockedError extends Error {
	readonly name = 'IdbBlockedError';

	constructor(
		readonly databaseName: string,
		message = `IndexedDB open blocked for "${databaseName}"`,
	) {
		super(message);
	}
}

export type ManagedIndexedDBOptions = {
	readonly name: string;
	readonly version: number;
	readonly onUpgrade: (db: IDBDatabase, event: IDBVersionChangeEvent) => void;
	readonly onBlocked?: (dbName: string) => void;
	readonly onVersionChange?: (dbName: string) => void;
	/** Ms to wait on blocked before rejecting; 0 = never time out. Default 30_000. */
	readonly blockedTimeoutMs?: number;
};

export type ManagedIndexedDB = {
	open(): Promise<IDBDatabase>;
	close(): void;
	runReadTransaction<T>(
		storeNames: string | string[],
		mode: 'readonly',
		fn: (tx: IDBTransaction) => Promise<T> | T,
	): Promise<T>;
	runWriteTransaction<T>(
		storeNames: string | string[],
		fn: (tx: IDBTransaction) => Promise<T> | T,
	): Promise<T>;
};

export function openVersionedDB(
	name: string,
	version: number,
	handlers: {
		onUpgrade?: (db: IDBDatabase, event: IDBVersionChangeEvent) => void;
		onBlocked?: (event: IDBVersionChangeEvent) => void;
	},
): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(name, version);
		req.onupgradeneeded = (event) => {
			if (handlers.onUpgrade) {
				handlers.onUpgrade(req.result, event);
			}
		};
		req.onblocked = (event) => {
			handlers.onBlocked?.(event);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error(`IndexedDB open failed: ${name}`));
	});
}

export function awaitTransaction(tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction error'));
		tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
	});
}

function dispatchBrowserEvent(name: string, detail: { databaseName: string }): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function createManagedIndexedDB(options: ManagedIndexedDBOptions): ManagedIndexedDB {
	const blockedTimeoutMs = options.blockedTimeoutMs ?? 30_000;
	let cached: IDBDatabase | null = null;
	let inFlightOpen: Promise<IDBDatabase> | null = null;
	let blockedTimer: ReturnType<typeof setTimeout> | null = null;

	function clearBlockedTimer(): void {
		if (blockedTimer !== null) {
			clearTimeout(blockedTimer);
			blockedTimer = null;
		}
	}

	function attachConnectionHandlers(db: IDBDatabase): void {
		db.onversionchange = () => {
			db.close();
			cached = null;
			inFlightOpen = null;
			options.onVersionChange?.(options.name);
			dispatchBrowserEvent(IDB_VERSIONCHANGE_EVENT, { databaseName: options.name });
		};
		db.onclose = () => {
			cached = null;
			inFlightOpen = null;
		};
	}

	function close(): void {
		clearBlockedTimer();
		cached?.close();
		cached = null;
		inFlightOpen = null;
	}

	function open(): Promise<IDBDatabase> {
		if (cached) return Promise.resolve(cached);
		if (inFlightOpen) return inFlightOpen;

		inFlightOpen = new Promise<IDBDatabase>((resolve, reject) => {
			let settled = false;
			const req = indexedDB.open(options.name, options.version);

			req.onupgradeneeded = (event) => {
				options.onUpgrade(req.result, event);
			};

			req.onblocked = () => {
				options.onBlocked?.(options.name);
				dispatchBrowserEvent(IDB_BLOCKED_EVENT, { databaseName: options.name });
				if (blockedTimeoutMs > 0) {
					clearBlockedTimer();
					blockedTimer = setTimeout(() => {
						inFlightOpen = null;
						settled = true;
						reject(new IdbBlockedError(options.name));
					}, blockedTimeoutMs);
				}
			};

			req.onsuccess = () => {
				clearBlockedTimer();
				if (settled) {
					req.result.close();
					return;
				}
				const db = req.result;
				attachConnectionHandlers(db);
				cached = db;
				inFlightOpen = null;
				resolve(db);
			};

			req.onerror = () => {
				clearBlockedTimer();
				inFlightOpen = null;
				reject(req.error ?? new Error(`IndexedDB open failed: ${options.name}`));
			};
		});

		return inFlightOpen.catch((err) => {
			inFlightOpen = null;
			throw err;
		});
	}

	async function runReadTransaction<T>(
		storeNames: string | string[],
		_mode: 'readonly',
		fn: (tx: IDBTransaction) => Promise<T> | T,
	): Promise<T> {
		const db = await open();
		const tx = db.transaction(storeNames, 'readonly');
		const txDone = awaitTransaction(tx);
		void txDone.catch(() => undefined);
		try {
			const result = await fn(tx);
			await txDone;
			return result;
		} catch (err) {
			try {
				tx.abort();
			} catch {
				// ignore
			}
			throw err;
		}
	}

	async function runWriteTransaction<T>(
		storeNames: string | string[],
		fn: (tx: IDBTransaction) => Promise<T> | T,
	): Promise<T> {
		const db = await open();
		const tx = db.transaction(storeNames, 'readwrite');
		const txDone = awaitTransaction(tx);
		void txDone.catch(() => undefined);
		try {
			const result = await fn(tx);
			await txDone;
			return result;
		} catch (err) {
			try {
				tx.abort();
			} catch {
				// ignore
			}
			throw err;
		}
	}

	return {
		open,
		close,
		runReadTransaction,
		runWriteTransaction,
	};
}