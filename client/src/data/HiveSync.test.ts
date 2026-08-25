import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearActiveHiveSession, setActiveHiveSession } from './HiveAuth';
import { HiveSync } from './HiveSync';
import { RAGNAROK_APP_ID } from './schemas/HiveTypes';
import type { HiveKeychainApi } from './HiveKeychain';

describe('HiveSync broadcastCustomJson', () => {
	let requestCustomJson: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		requestCustomJson = vi.fn((_username, _id, _keyType, _json, _displayName, callback) => {
			callback({ success: true, result: { id: 'trx123', block_num: 42 } });
		});

		(globalThis as typeof globalThis & { window?: { hive_keychain?: HiveKeychainApi } }).window = {
			hive_keychain: {
				requestCustomJson,
				requestSignBuffer: vi.fn(),
			},
		};
		setActiveHiveSession('enrique89');
	});

	afterEach(() => {
		clearActiveHiveSession();
		delete (globalThis as typeof globalThis & { window?: unknown }).window;
	});

	it('rejects non-protocol save_state before Keychain', async () => {
		const sync = new HiveSync();

		const result = await sync.broadcastCustomJson('rp_save_state', {
			action: 'save_state',
			state: '{"version":3}',
		});

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/Unsupported Ragnarok custom_json id: rp_save_state/);
		expect(requestCustomJson).not.toHaveBeenCalled();
	});

	it('emits canonical protocol payloads without HTML-encoding string fields', async () => {
		const sync = new HiveSync();

		const result = await sync.broadcastCustomJson(RAGNAROK_APP_ID, {
			action: 'duat_airdrop_claim',
			memo: 'claim "DUAT" & test',
		});

		// Local gameplay validation blocks all external broadcasts, including DUAT.
		expect(result.success).toBe(false);
		expect(result.error).toContain('capability_disabled');
		expect(requestCustomJson).not.toHaveBeenCalled();
	});

	it('rejects market and NFTLox writes before username or Keychain access in local phase', async () => {
		clearActiveHiveSession();
		const sync = new HiveSync();
		await expect(sync.broadcastCustomJson(RAGNAROK_APP_ID, { action: 'market_list', nft_uid: 'nft-1' })).resolves.toMatchObject({
			success: false, error: expect.stringContaining('capability_disabled'),
		});
		await expect(sync.broadcastNFTLoxJson('mint', { nftId: 'nft-1' })).resolves.toMatchObject({
			success: false, error: expect.stringContaining('capability_disabled'),
		});
		expect(requestCustomJson).not.toHaveBeenCalled();
	});
});
