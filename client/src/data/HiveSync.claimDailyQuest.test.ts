import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./HiveSessionIdentity', () => ({
	ensureActiveHiveSessionForCurrentUser: () => 'alice',
	getCurrentHiveUsername: () => 'alice',
}));

import { HiveSync } from './HiveSync';

const requestCustomJson = vi.fn(
	(_username: string, _id: string, _keyType: string, json: string, _title: string, callback: (r: { success: boolean; result?: unknown }) => void) => {
		callback({ success: true, result: { id: 'trx-broadcast', block_num: 100 } });
		void json;
	},
);

describe('HiveSync.claimDailyQuest broadcast payload', () => {
	beforeEach(() => {
		requestCustomJson.mockClear();
		(globalThis as unknown as { window: unknown }).window = {
			hive_keychain: { requestCustomJson },
		};
	});

	afterEach(() => {
		delete (globalThis as unknown as { window?: unknown }).window;
	});

	it('blocks daily quest broadcast in F1 before Keychain', async () => {
		const hiveSync = new HiveSync();
		const result = await hiveSync.claimDailyQuest(0, 'win_games');

		expect(result.success).toBe(false);
		expect(result.error).toContain('capability_disabled');
		expect(requestCustomJson).not.toHaveBeenCalled();
	});
});
