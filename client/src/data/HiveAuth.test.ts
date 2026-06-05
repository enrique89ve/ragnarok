import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearActiveHiveSession,
	getAuthenticatedHiveUsername,
	setActiveHiveSession,
	signHiveMessage,
} from './HiveAuth';
import type { HiveKeychainApi, HiveKeychainResponse } from './HiveKeychain';

function stubKeychainResponse(response: HiveKeychainResponse): {
	readonly requestSignBuffer: ReturnType<typeof vi.fn>;
} {
	const requestSignBuffer = vi.fn((
		_username: string | null,
		_message: string,
		_keyType: 'Active' | 'Posting' | 'Memo',
		callback: (response: HiveKeychainResponse) => void,
	) => {
		callback(response);
	});

	vi.stubGlobal('window', {
		hive_keychain: {
			requestSignBuffer,
			requestCustomJson: vi.fn(),
		} satisfies Partial<HiveKeychainApi>,
	});

	return { requestSignBuffer };
}

describe('HiveAuth signHiveMessage', () => {
	beforeEach(() => {
		clearActiveHiveSession();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		clearActiveHiveSession();
	});

	it('uses the requestSignBuffer string result as the Hive signature', async () => {
		const { requestSignBuffer } = stubKeychainResponse({
			success: true,
			result: 'SIG_HEX',
		});

		await expect(signHiveMessage('message', {
			username: 'alice',
			providerId: 'hive_keychain',
			keyType: 'Posting',
			title: 'Authorize session key',
		})).resolves.toEqual({
			success: true,
			signature: 'SIG_HEX',
		});

		expect(requestSignBuffer).toHaveBeenCalledWith(
			'alice',
			'message',
			'Posting',
			expect.any(Function),
			undefined,
			'Authorize session key',
		);
	});

	it('fails clearly when Keychain reports success without a signature', async () => {
		stubKeychainResponse({
			success: true,
			result: null,
		});

		await expect(signHiveMessage('message', {
			username: 'alice',
			providerId: 'hive_keychain',
			keyType: 'Posting',
		})).resolves.toEqual({
			success: false,
			error: 'Hive Keychain returned no signature',
		});
	});

	it('does not treat a stored identity session as authenticated', () => {
		setActiveHiveSession('alice', 'hive_keychain', 'stored_identity');

		expect(getAuthenticatedHiveUsername()).toBeNull();
	});

	it('promotes the active session after a successful Keychain signature', async () => {
		stubKeychainResponse({
			success: true,
			result: 'SIG_HEX',
		});
		setActiveHiveSession('alice', 'hive_keychain', 'stored_identity');

		await expect(signHiveMessage('message')).resolves.toEqual({
			success: true,
			signature: 'SIG_HEX',
		});

		expect(getAuthenticatedHiveUsername()).toBe('alice');
	});
});
