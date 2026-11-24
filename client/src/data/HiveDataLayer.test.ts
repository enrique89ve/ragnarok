import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
	const mem = new Map<string, string>();
	(globalThis as { localStorage?: unknown }).localStorage = {
		getItem: (key: string) => mem.get(key) ?? null,
		setItem: (key: string, value: string) => {
			mem.set(key, value);
		},
		removeItem: (key: string) => {
			mem.delete(key);
		},
		clear: () => {
			mem.clear();
		},
		key: () => null,
		length: 0,
	};
});

import { createRuntimeStorageKey } from '../game/config/networkConfig';
import { StorageKeys } from '../game/config/storageKeys';
import type { HiveCardAsset } from './schemas/HiveTypes';
import { DEFAULT_PLAYER_STATS, DEFAULT_TOKEN_BALANCE } from './schemas/HiveTypes';
import { signHiveMessage } from './HiveAuth';
import {
	buildSessionAuthorizeMessage,
	buildSessionRenewalMessage,
	signSessionAuthorize,
	signSessionRenewal,
	HIVE_DATA_PERSIST_VERSION,
	migrateHiveDataPersistState,
	partializeHiveDataPersistState,
	useHiveDataStore,
} from './HiveDataLayer';

vi.mock('./HiveAuth', () => ({
	signHiveMessage: vi.fn(),
}));

const signHiveMessageMock = vi.mocked(signHiveMessage);

describe('HiveDataLayer battle authority signatures', () => {
	const matchChallenge = {
		from: 'alice',
		to: 'bob',
		peerId: 'peer-123',
		timestamp: 1_700_000_000_000,
		expiresAt: 1_700_000_000_090,
		nonce: 'abcdef_0123456789abcd',
		sigAlg: 'hmac-sha256:canonical-json:v1',
		serverSig: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
	};

	beforeEach(() => {
		signHiveMessageMock.mockReset();
		signHiveMessageMock.mockResolvedValue({ success: true, signature: 'SIG_POSTING' });
	});

	it('authorizes the match session key with Posting authority', async () => {
		await expect(signSessionAuthorize('match-1', 'pubkey-1', {
			username: 'alice',
		})).resolves.toBe('SIG_POSTING');

		expect(signHiveMessageMock).toHaveBeenCalledWith(
			buildSessionAuthorizeMessage('match-1', 'pubkey-1'),
			{
				keyType: 'Posting',
				title: 'Authorize session key',
				username: 'alice',
				providerId: 'hive_keychain',
			},
		);
	});

	it('renews match sessions with Posting authority', async () => {
		await expect(signSessionRenewal('match-1', 'pubkey-2', {
			username: 'alice',
		})).resolves.toBe('SIG_POSTING');

		expect(signHiveMessageMock).toHaveBeenCalledWith(
			buildSessionRenewalMessage('match-1', 'pubkey-2'),
			{
				keyType: 'Posting',
				title: 'Renew session key',
				username: 'alice',
				providerId: 'hive_keychain',
			},
		);
	});

	it('keeps the global HiveAuth session fallback when no username is supplied', async () => {
		await expect(signSessionAuthorize('match-1', 'pubkey-1')).resolves.toBe('SIG_POSTING');

		expect(signHiveMessageMock).toHaveBeenCalledWith(
			buildSessionAuthorizeMessage('match-1', 'pubkey-1'),
			{
				keyType: 'Posting',
				title: 'Authorize session key',
			},
		);
	});

	it('includes server challenge context when provided', async () => {
		await expect(signSessionAuthorize('match-1', 'pubkey-1', {
			username: 'alice',
			matchChallenge,
		})).resolves.toBe('SIG_POSTING');

		expect(signHiveMessageMock).toHaveBeenCalledWith(
			buildSessionAuthorizeMessage('match-1', 'pubkey-1', matchChallenge),
			{
				keyType: 'Posting',
				title: 'Authorize session key',
				username: 'alice',
				providerId: 'hive_keychain',
			},
		);
	});
});

const HIVE_DATA_STORAGE_KEY = createRuntimeStorageKey(StorageKeys.HIVE_DATA);

function sampleCard(uid: string, ownerId: string): HiveCardAsset {
	return {
		uid,
		cardId: 1,
		ownerId,
		edition: 'alpha',
		foil: 'standard',
		rarity: 'common',
		level: 1,
		xp: 0,
		name: 'Test Card',
		type: 'minion',
		source: 'nft',
	} as HiveCardAsset;
}

function sampleHiveUser(hiveUsername: string) {
	return {
		hiveUsername,
		displayName: hiveUsername,
		createdAt: 1,
		lastLogin: 1,
		accountTier: 'free' as const,
	};
}

function resetHiveDataStore(): void {
	useHiveDataStore.setState({
		user: null,
		stats: null,
		cardCollection: [],
		packCollection: [],
		tokenBalance: null,
		recentMatches: [],
		pendingTransactions: [],
		isHydrated: false,
		hydratedAccount: null,
	});
}

describe('HiveDataLayer session persistence', () => {
	beforeEach(() => {
		localStorage.clear();
		resetHiveDataStore();
	});

	afterEach(() => {
		localStorage.clear();
		resetHiveDataStore();
	});

	it('partialize persists only session user identity (never projections)', () => {
		const fullState = useHiveDataStore.getState();
		useHiveDataStore.setState({
			user: sampleHiveUser('alice'),
			stats: { ...DEFAULT_PLAYER_STATS, wins: 42 },
			cardCollection: [sampleCard('C-1', 'alice')],
			tokenBalance: { ...DEFAULT_TOKEN_BALANCE, hiveUsername: 'alice', RUNE: 99 },
		});
		const slice = partializeHiveDataPersistState(useHiveDataStore.getState());
		useHiveDataStore.setState(fullState);

		expect(slice).toEqual({ user: sampleHiveUser('alice') });
		expect('stats' in slice).toBe(false);
		expect('cardCollection' in slice).toBe(false);
		expect('tokenBalance' in slice).toBe(false);

		localStorage.setItem(HIVE_DATA_STORAGE_KEY, JSON.stringify({
			state: slice,
			version: HIVE_DATA_PERSIST_VERSION,
		}));
		const parsed = JSON.parse(localStorage.getItem(HIVE_DATA_STORAGE_KEY)!) as { state: Record<string, unknown> };
		expect(parsed.state).toEqual({ user: sampleHiveUser('alice') });
	});

	it('migrates pre-v2 localStorage blobs by stripping stale projections', () => {
		const legacyState = {
			user: sampleHiveUser('bob'),
			stats: { ...DEFAULT_PLAYER_STATS, wins: 10 },
			cardCollection: [sampleCard('C-ghost', 'bob')],
			tokenBalance: { ...DEFAULT_TOKEN_BALANCE, hiveUsername: 'bob', RUNE: 50 },
		};
		const migrated = migrateHiveDataPersistState(legacyState, 0) as { user: typeof legacyState.user };
		expect(migrated).toEqual({ user: sampleHiveUser('bob') });
		expect('stats' in migrated).toBe(false);
		expect('cardCollection' in migrated).toBe(false);
	});

	it('clears prior account projections when setUser switches hiveUsername', () => {
		useHiveDataStore.setState({
			user: sampleHiveUser('alice'),
			stats: { ...DEFAULT_PLAYER_STATS, wins: 7 },
			cardCollection: [sampleCard('C-1', 'alice')],
			tokenBalance: { ...DEFAULT_TOKEN_BALANCE, hiveUsername: 'alice', RUNE: 12 },
			isHydrated: true,
			hydratedAccount: 'alice',
		});

		useHiveDataStore.getState().setUser(sampleHiveUser('carol'));

		const state = useHiveDataStore.getState();
		expect(state.user?.hiveUsername).toBe('carol');
		expect(state.cardCollection).toEqual([]);
		expect(state.stats).toEqual({ ...DEFAULT_PLAYER_STATS });
		expect(state.tokenBalance).toEqual({ ...DEFAULT_TOKEN_BALANCE, hiveUsername: 'carol' });
		expect(state.isHydrated).toBe(false);
		expect(state.hydratedAccount).toBeNull();
	});

	it('marks hydration flags when loadFromHive runs', () => {
		useHiveDataStore.setState({ user: sampleHiveUser('alice'), isHydrated: false, hydratedAccount: null });

		useHiveDataStore.getState().loadFromHive({
			stats: { ...DEFAULT_PLAYER_STATS, wins: 3 },
			cardCollection: [sampleCard('C-2', 'alice')],
			user: sampleHiveUser('alice'),
		});

		const state = useHiveDataStore.getState();
		expect(state.isHydrated).toBe(true);
		expect(state.hydratedAccount).toBe('alice');
		expect(state.cardCollection).toHaveLength(1);
	});
});
