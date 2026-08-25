/**
 * Account-scoped localStorage for zustand persist.
 *
 * Hive Keychain supports multiple accounts on the same browser profile.
 * A globally-keyed `localStorage['ragnarok-daily-quests']` bleeds state
 * across accounts: account A's completed quests show up for account B,
 * campaign first-clears get mixed, the broadcast queue points at the
 * wrong signer, etc.
 *
 * This module wraps `localStorage` so every key is suffixed with the
 * currently-logged Hive username (or `guest` when nobody is logged in).
 * It also runs a one-shot migration: the first time a scoped key is read
 * with no scoped value present, any pre-existing unscoped value is moved
 * into the current account's bucket and the unscoped key is removed.
 *
 * Stores register themselves with `registerAccountScopedStore` so the
 * module-level subscription to `useHiveDataStore` can rehydrate every
 * registered store when the user switches account at runtime.
 */

import type { StateStorage } from 'zustand/middleware';
import { useHiveDataStore } from '../../data/HiveDataLayer';
import {
	getRagnarokRuntimeStorageNamespace,
	createRuntimeStorageKey,
	getRagnarokNetworkConfig,
} from '../../game/config/networkConfig';

export const GUEST_ACCOUNT_ID = 'guest';
const GUEST_BUCKET = GUEST_ACCOUNT_ID;
const LEGACY_HIVE_STORE_KEY = 'ragnarok-hive-data';
const HIVE_STORE_KEY = createRuntimeStorageKey(LEGACY_HIVE_STORE_KEY);

interface PersistedHiveBlob {
	state?: { user?: { hiveUsername?: string } };
}

function getLocalStorage(): Storage | null {
	return typeof localStorage === 'undefined' ? null : localStorage;
}

/**
 * Reads the current Hive account directly from the persisted hive
 * blob (sync, no zustand-init dependency). Falls back to `guest`.
 */
function readHiveAccount(): string {
	try {
		const storage = getLocalStorage();
		if (!storage) return GUEST_BUCKET;
		const raw = storage.getItem(HIVE_STORE_KEY);
		const legacyRaw = raw ?? (shouldMigrateLegacyStorage() ? storage.getItem(LEGACY_HIVE_STORE_KEY) : null);
		if (!legacyRaw) return GUEST_BUCKET;
		const parsed = JSON.parse(legacyRaw) as PersistedHiveBlob;
		const username = parsed.state?.user?.hiveUsername;
		return typeof username === 'string' && username.length > 0 ? username : GUEST_BUCKET;
	} catch {
		return GUEST_BUCKET;
	}
}

function shouldMigrateLegacyStorage(): boolean {
	return getRagnarokNetworkConfig().stage === 'local';
}

function storageKey(name: string, account: string): string {
	return `${createRuntimeStorageKey(name)}:${account}`;
}

function migrateLegacyHiveStore(): void {
	if (!shouldMigrateLegacyStorage()) return;
	const storage = getLocalStorage();
	if (!storage) return;
	if (storage.getItem(HIVE_STORE_KEY) !== null) return;
	const legacy = storage.getItem(LEGACY_HIVE_STORE_KEY);
	if (legacy !== null) storage.setItem(HIVE_STORE_KEY, legacy);
}

/**
 * One-shot migration for local dev only. Shared-network reset epochs must not
 * inherit unscoped or pre-epoch browser state.
 */
function migrateUnscopedKey(name: string, account: string): void {
	if (!shouldMigrateLegacyStorage()) return;
	const storage = getLocalStorage();
	if (!storage) return;
	const targetKey = storageKey(name, account);
	const oldScoped = storage.getItem(`${name}:${account}`);
	if (oldScoped !== null && storage.getItem(targetKey) === null) {
		storage.setItem(targetKey, oldScoped);
	}
	if (oldScoped !== null) storage.removeItem(`${name}:${account}`);

	const unscoped = storage.getItem(name);
	if (unscoped === null) return;
	if (storage.getItem(targetKey) === null) {
		storage.setItem(targetKey, unscoped);
	}
	storage.removeItem(name);
}

export const accountScopedStorage: StateStorage = {
	getItem: (name) => {
		const storage = getLocalStorage();
		if (!storage) return null;
		const account = readHiveAccount();
		migrateUnscopedKey(name, account);
		return storage.getItem(storageKey(name, account));
	},
	setItem: (name, value) => {
		const storage = getLocalStorage();
		if (!storage) return;
		storage.setItem(storageKey(name, readHiveAccount()), value);
	},
	removeItem: (name) => {
		const storage = getLocalStorage();
		if (!storage) return;
		storage.removeItem(storageKey(name, readHiveAccount()));
	},
};

interface PersistableStore {
	persist: { rehydrate: () => Promise<void> | void };
}

const registeredStores = new Set<PersistableStore>();

/**
 * Stores using `accountScopedStorage` call this once at module init so
 * they get rehydrated when the Hive username changes without a reload.
 */
export function registerAccountScopedStore(store: PersistableStore): void {
	registeredStores.add(store);
}

/**
 * When the player transitions from `guest` to a real Hive account
 * (typical first-login flow), move every `:guest` bucket into the new
 * account's bucket so progress from the pre-login session is retained.
 * If the target bucket already has data, the guest copy is discarded
 * (no merge — chain truth is the source of record for anything that
 * matters across devices, and unmerged guest blobs are rare).
 */
function migrateGuestBucketTo(account: string): void {
	if (account === GUEST_BUCKET) return;
	const storage = getLocalStorage();
	if (!storage) return;
	const suffix = `:${GUEST_BUCKET}`;
	const keys: string[] = [];
	const prefix = `${getRagnarokRuntimeStorageNamespace()}:`;
	for (let i = 0; i < storage.length; i += 1) {
		const key = storage.key(i);
		if (key !== null && key.startsWith(prefix) && key.endsWith(suffix)) keys.push(key);
	}
	for (const key of keys) {
		const targetKey = `${key.slice(0, -suffix.length)}:${account}`;
		const value = storage.getItem(key);
		if (value === null) continue;
		if (storage.getItem(targetKey) === null) {
			storage.setItem(targetKey, value);
		}
		storage.removeItem(key);
	}
}

migrateLegacyHiveStore();

let lastAccount = readHiveAccount();
// Boot-time migration: if a real account is already logged in (e.g. the
// user reloaded the page after authing earlier), any `:guest` buckets
// left over from a pre-login session should fold into the user's bucket
// BEFORE any store hydrates — otherwise the stores generate fresh state
// under the user bucket and the guest progress is orphaned forever.
if (lastAccount !== GUEST_BUCKET) {
	migrateGuestBucketTo(lastAccount);
}

useHiveDataStore.subscribe((state) => {
	const next = state.user?.hiveUsername ?? GUEST_BUCKET;
	if (next === lastAccount) return;
	if (lastAccount === GUEST_BUCKET) migrateGuestBucketTo(next);
	lastAccount = next;
	for (const store of registeredStores) {
		void store.persist.rehydrate();
	}
});
