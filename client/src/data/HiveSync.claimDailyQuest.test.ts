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

	it('broadcasts slot and quest_type without ymd_utc', async () => {
		const hiveSync = new HiveSync();
		const result = await hiveSync.claimDailyQuest(0, 'win_games');

		expect(result.success).toBe(true);
		expect(result.trxId).toBe('trx-broadcast');

		expect(requestCustomJson).toHaveBeenCalledTimes(1);
		const json = requestCustomJson.mock.calls[0][3] as string;
		const payload = JSON.parse(json);

		expect(payload.slot).toBe(0);
		expect(payload.quest_type).toBe('win_games');
		expect(payload.action).toBe('daily_quest_claim');
		expect(payload).not.toHaveProperty('ymd_utc');
	});
});
