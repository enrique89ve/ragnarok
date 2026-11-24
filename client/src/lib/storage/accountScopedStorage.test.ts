import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMap = vi.hoisted(() => {
	const data = new Map<string, string>();
	const mockStorage: Storage = {
		get length() {
			return data.size;
		},
		clear() {
			data.clear();
		},
		getItem(key: string) {
			return data.get(key) ?? null;
		},
		key(index: number) {
			return [...data.keys()][index] ?? null;
		},
		removeItem(key: string) {
			data.delete(key);
		},
		setItem(key: string, value: string) {
			data.set(key, String(value));
		},
	};
	vi.stubGlobal('localStorage', mockStorage);
	vi.stubGlobal('window', { localStorage: mockStorage });
	return data;
});

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { accountScopedStorage, registerAccountScopedStore } from './accountScopedStorage';
import { useHiveDataStore } from '../../data/HiveDataLayer';

interface CounterState {
	count: number;
	tag: string;
	setCounter: (count: number, tag: string) => void;
}

const useTestScopedStore = create<CounterState>()(
	persist(
		(set) => ({
			count: 0,
			tag: 'initial',
			setCounter: (count, tag) => set({ count, tag }),
		}),
		{
			name: 'ragnarok-test-account-scoped',
			storage: createJSONStorage(() => accountScopedStorage),
		},
	),
);

registerAccountScopedStore(useTestScopedStore);

function makeUser(hiveUsername: string) {
	return {
		hiveUsername,
		displayName: hiveUsername,
		createdAt: 1,
		lastLoginAt: 1,
	};
}

describe('accountScopedStorage hot account switching', () => {
	beforeEach(() => {
		storageMap.clear();
		useHiveDataStore.getState().logout();
		useTestScopedStore.setState(useTestScopedStore.getInitialState(), true);
	});

	it('resets in-memory state when switching to a fresh account without a saved bucket', async () => {
		useHiveDataStore.getState().setUser(makeUser('alice'));
		useTestScopedStore.getState().setCounter(42, 'alice-data');
		expect(useTestScopedStore.getState().count).toBe(42);

		useHiveDataStore.getState().setUser(makeUser('bob'));
		await Promise.resolve();

		expect(useTestScopedStore.getState().count).toBe(0);
		expect(useTestScopedStore.getState().tag).toBe('initial');

		// Switching back to alice restores alice's persisted bucket untouched.
		useHiveDataStore.getState().setUser(makeUser('alice'));
		await Promise.resolve();

		expect(useTestScopedStore.getState().count).toBe(42);
		expect(useTestScopedStore.getState().tag).toBe('alice-data');
	});

	it('hydrates an existing bucket for the target account without clobbering it during reset', async () => {
		useHiveDataStore.getState().setUser(makeUser('alice'));
		useTestScopedStore.getState().setCounter(7, 'alice-only');

		useHiveDataStore.getState().setUser(makeUser('carol'));
		await Promise.resolve();
		useTestScopedStore.getState().setCounter(99, 'carol-only');

		useHiveDataStore.getState().setUser(makeUser('alice'));
		await Promise.resolve();
		expect(useTestScopedStore.getState().count).toBe(7);

		useHiveDataStore.getState().setUser(makeUser('CAROL'));
		await Promise.resolve();
		expect(useTestScopedStore.getState().count).toBe(99);
		expect(useTestScopedStore.getState().tag).toBe('carol-only');
	});

	it('does not reset registered stores when HiveDataStore fires with the same account', async () => {
		useHiveDataStore.getState().setUser(makeUser('alice'));
		await Promise.resolve();
		useTestScopedStore.getState().setCounter(55, 'live-state');

		// Re-emitting the same account (e.g. cold boot hydration or stats update)
		// must not clear or re-reset the registered store.
		useHiveDataStore.getState().setUser(makeUser('alice'));
		await Promise.resolve();

		expect(useTestScopedStore.getState().count).toBe(55);
		expect(useTestScopedStore.getState().tag).toBe('live-state');
	});
});
