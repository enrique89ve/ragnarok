import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { createRuntimeStorageKey } from '../config/networkConfig';
import { StorageKeys } from '../config/storageKeys';
import { useCampaignStore } from '../campaign/campaignStore';
import { useStarterStore } from './starterStore';
import {
	collectSaveState,
	importFromFile,
	restoreFromHive,
	restoreSaveState,
	saveToHive,
	type PortableSaveState,
} from './saveStateManager';

vi.mock('../nft', () => ({
	getNFTBridge: () => ({
		getUsername: () => 'testuser',
	}),
}));

const STARTER_DECKS_STORAGE_KEY = createRuntimeStorageKey(StorageKeys.STARTER_DECKS);

describe('saveStateManager Hive save boundary', () => {
	it('does not broadcast portable save snapshots to Hive', async () => {
		await expect(saveToHive()).resolves.toMatchObject({
			success: false,
			error: expect.stringContaining('canonical protocol ops'),
		});
	});

	it('does not restore legacy save_state snapshots from the protocol namespace', async () => {
		await expect(restoreFromHive()).resolves.toMatchObject({
			success: false,
			error: expect.stringContaining('canonical protocol ops'),
		});
	});
});

describe('saveStateManager portable round-trip', () => {
	beforeEach(() => {
		localStorage.clear();
		useCampaignStore.setState({ completedMissions: {} });
		useStarterStore.setState({ claimed: false, claimedByAccount: {}, legacyClaimAccountId: null, starterReputationByAccount: {} });
	});

	it('round-trips collectSaveState -> restoreSaveState with campaign Record and decks', async () => {
		useCampaignStore.setState({
			currentDifficulty: 'heroic',
			completedMissions: {
				'mission-alpha': {
					difficulty: 'heroic',
					completedAt: 1,
					bestTurns: 12,
					bestDifficulty: 'heroic',
				},
			},
		});
		useStarterStore.setState({ claimed: true, claimedByAccount: { testuser: true }, legacyClaimAccountId: null, starterReputationByAccount: {} });
		localStorage.setItem(STARTER_DECKS_STORAGE_KEY, JSON.stringify([{ name: 'War', heroId: 'odin', cardIds: [10, 11] }]));

		const snapshot = await collectSaveState();
		useCampaignStore.setState({ completedMissions: {} });
		useStarterStore.setState({ claimed: false, claimedByAccount: {}, legacyClaimAccountId: null, starterReputationByAccount: {} });
		localStorage.removeItem(STARTER_DECKS_STORAGE_KEY);

		const result = await restoreSaveState(snapshot);
		expect(result).toEqual({ success: true });

		const campaign = useCampaignStore.getState().completedMissions;
		expect(campaign['mission-alpha']).toMatchObject({
			difficulty: 'heroic',
			bestDifficulty: 'heroic',
		});
		expect(useStarterStore.getState().claimed).toBe(true);
		expect(JSON.parse(localStorage.getItem(STARTER_DECKS_STORAGE_KEY) ?? '[]')).toEqual([
			{ name: 'War', heroId: 'odin', cardIds: [10, 11] },
		]);
	});

	it('rejects tampered checksum without mutating stores', async () => {
		useCampaignStore.setState({
			completedMissions: {
				'm-1': { difficulty: 'normal', completedAt: 1, bestTurns: 9, bestDifficulty: 'normal' },
			},
		});
		const save = await collectSaveState();
		save.starterClaimed = !save.starterClaimed;

		const beforeCampaign = { ...useCampaignStore.getState().completedMissions };
		const result = await restoreSaveState(save);
		expect(result).toEqual({ success: false, error: 'Save file checksum mismatch' });
		expect(useCampaignStore.getState().completedMissions).toEqual(beforeCampaign);
	});

	it('rejects malformed restore payloads cleanly', async () => {
		const result = await restoreSaveState({ version: 3 } as PortableSaveState);
		expect(result.success).toBe(false);
		expect(result.error).toBe('Invalid save file format');
	});

	it('rejects malformed importFromFile payloads cleanly', async () => {
		const file = new File(['{"version":3}'], 'bad.json', { type: 'application/json' });
		const result = await importFromFile(file);
		expect(result.success).toBe(false);
		expect(result.error).toBe('Invalid save file format');
	});

	it('does not mutate completedMissions order when computing checksum', async () => {
		const missions = ['z-mission', 'a-mission', 'm-mission'];
		useCampaignStore.setState({
			completedMissions: Object.fromEntries(missions.map((id) => [id, {
				difficulty: 'normal' as const,
				completedAt: 1,
				bestTurns: 9,
				bestDifficulty: 'normal' as const,
			}])),
		});

		const beforeKeys = Object.keys(useCampaignStore.getState().completedMissions);
		await collectSaveState();
		const afterKeys = Object.keys(useCampaignStore.getState().completedMissions);
		expect(afterKeys).toEqual(beforeKeys);
	});
});