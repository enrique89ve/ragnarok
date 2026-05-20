import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearActiveHiveSession } from '@/data/HiveAuth';
import { useHiveDataStore } from '@/data/HiveDataLayer';
import { hiveSync } from '@/data/HiveSync';
import { LocalNFTBridge } from './LocalNFTBridge';

function resetHiveDataStore(): void {
	useHiveDataStore.setState({
		user: null,
		stats: null,
		cardCollection: [],
		packCollection: [],
		tokenBalance: null,
		recentMatches: [],
		pendingTransactions: [],
	});
}

function persistHiveUser(hiveUsername: string): void {
	useHiveDataStore.setState({
		user: {
			hiveUsername,
			displayName: hiveUsername,
			createdAt: 1,
			lastLogin: 1,
			accountTier: 'free',
		},
	});
}

describe('LocalNFTBridge acquisition operations', () => {
	beforeEach(() => {
		clearActiveHiveSession();
		resetHiveDataStore();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reads the persisted Hive user even when the data bridge is local', () => {
		persistHiveUser('alice');

		const bridge = new LocalNFTBridge();

		expect(bridge.getUsername()).toBe('alice');
		expect(bridge.isLoggedIn()).toBe(true);
	});

	it('rejects RUNE pack exchange without delegating to HiveSync from local mode', async () => {
		const runeExchange = vi.spyOn(hiveSync, 'runeExchange');

		const bridge = new LocalNFTBridge();

		await expect(bridge.runeExchange('standard', 2)).resolves.toEqual({
			success: false,
			error: 'RUNE exchange requires Hive mode.',
		});
		expect(runeExchange).not.toHaveBeenCalled();
	});

	it('rejects HBD pack purchase without delegating to HiveSync from local mode', async () => {
		const purchasePackHbd = vi.spyOn(hiveSync, 'purchasePackHbd');

		const bridge = new LocalNFTBridge();

		await expect(bridge.purchasePackHbd('premium', 1, 20_000)).resolves.toEqual({
			success: false,
			error: 'HBD pack purchase requires Hive mode.',
		});
		expect(purchasePackHbd).not.toHaveBeenCalled();
	});
});
