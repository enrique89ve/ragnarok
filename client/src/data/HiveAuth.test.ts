import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearActiveHiveSession,
	getAuthenticatedHiveUsername,
	hydrateHiveWebSession,
	loginWithHiveWallet,
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
		location: { origin: 'http://localhost' },
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

	it('hydrates a valid HttpOnly web session without opening Keychain', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(
			JSON.stringify({ success: true, authenticated: true, username: 'alice' }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		));
		vi.stubGlobal('fetch', fetchMock);

		await expect(hydrateHiveWebSession()).resolves.toBe('alice');
		expect(getAuthenticatedHiveUsername()).toBe('alice');
		expect(fetchMock).toHaveBeenCalledWith(
			'http://localhost/api/session/status',
			expect.objectContaining({ method: 'GET', credentials: 'include' }),
		);
	});

	it('returns the login proof and establishes the reusable HTTP session', async () => {
		const { requestSignBuffer } = stubKeychainResponse({
			success: true,
			result: 'LOGIN_SIG',
		});
		const fetchMock = vi.fn().mockResolvedValue(new Response(
			JSON.stringify({ success: true, username: 'alice' }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		));
		vi.stubGlobal('fetch', fetchMock);

		const result = await loginWithHiveWallet(' Alice ');

		expect(result).toMatchObject({
			success: true,
			authProof: {
				username: 'alice',
				message: expect.stringMatching(/^ragnarok-login:alice:\d+$/),
				signature: 'LOGIN_SIG',
			},
		});
		expect(requestSignBuffer).toHaveBeenCalledWith(
			'alice',
			expect.stringMatching(/^ragnarok-login:alice:\d+$/),
			'Posting',
			expect.any(Function),
			undefined,
			'Log in to Ragnarok Cards',
		);
		expect(fetchMock).toHaveBeenCalledWith(
			'http://localhost/api/session/login',
			expect.objectContaining({
				method: 'POST',
				credentials: 'include',
			}),
		);
	});
});
