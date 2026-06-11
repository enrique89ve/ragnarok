import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureFriendSession, invalidateFriendSession } from './friendSession';

vi.mock('@/data/HiveAuth', () => ({
	signHiveMessage: vi.fn(),
}));

const signHiveMessage = vi.mocked(await import('@/data/HiveAuth')).signHiveMessage;

function mockResponse(options: {
	status?: number;
	ok?: boolean;
	body?: unknown;
	jsonError?: boolean;
}): Response {
	const status = options.status ?? (options.ok === false ? 500 : 200);
	const ok = options.ok ?? (status >= 200 && status < 300);
	const body = options.body ?? null;
	return {
		ok,
		status,
		json: options.jsonError
			? () => Promise.reject(new Error('bad json'))
			: () => Promise.resolve(body),
	} as unknown as Response;
}

describe('ensureFriendSession', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		signHiveMessage.mockReset();
		invalidateFriendSession();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns false for an empty username without calling the network', async () => {
		const result = await ensureFriendSession('   @  ');
		expect(result).toBe(false);
		expect(fetch).not.toHaveBeenCalled();
		expect(signHiveMessage).not.toHaveBeenCalled();
	});

	it('returns true on the second call when the session is already ready for the same owner', async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ status: 401, ok: false }),
		);
		signHiveMessage.mockResolvedValueOnce({
			success: true,
			signature: 'a'.repeat(64),
		});
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ ok: true }),
		);

		expect(await ensureFriendSession('Enrique89')).toBe(true);
		expect(await ensureFriendSession('enrique89')).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(signHiveMessage).toHaveBeenCalledTimes(1);
	});

	it('short-circuits when the server status reports the same signed-in user', async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ body: { username: 'enrique89' } }),
		);

		expect(await ensureFriendSession('enrique89')).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith('/api/friends/session/status', { method: 'GET' });
		expect(signHiveMessage).not.toHaveBeenCalled();
	});

	it('invalidates and re-signs when the status reports a different user', async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ body: { username: 'someone_else' } }),
		);
		signHiveMessage.mockResolvedValue({
			success: true,
			signature: 'b'.repeat(64),
		});
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ ok: true }),
		);

		expect(await ensureFriendSession('enrique89')).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(signHiveMessage).toHaveBeenCalledTimes(1);
	});

	it('falls through to signing when the status endpoint is not ok', async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ status: 401, ok: false }),
		);
		signHiveMessage.mockResolvedValue({
			success: true,
			signature: 'c'.repeat(64),
		});
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ ok: true }),
		);

		expect(await ensureFriendSession('enrique89')).toBe(true);
		expect(signHiveMessage).toHaveBeenCalledTimes(1);
	});

	it('recovers from a malformed status JSON and still signs in', async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ jsonError: true }),
		);
		signHiveMessage.mockResolvedValue({
			success: true,
			signature: 'd'.repeat(64),
		});
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ ok: true }),
		);

		expect(await ensureFriendSession('enrique89')).toBe(true);
		expect(signHiveMessage).toHaveBeenCalledTimes(1);
	});

	it('returns false when signHiveMessage reports failure', async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ status: 401, ok: false }),
		);
		signHiveMessage.mockResolvedValue({ success: false, error: 'user_rejected' });

		expect(await ensureFriendSession('enrique89')).toBe(false);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('returns false when the login endpoint responds with a non-ok status', async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ status: 401, ok: false }),
		);
		signHiveMessage.mockResolvedValue({
			success: true,
			signature: 'e'.repeat(64),
		});
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ status: 500, ok: false }),
		);

		expect(await ensureFriendSession('enrique89')).toBe(false);
		expect(signHiveMessage).toHaveBeenCalledTimes(1);
	});

	it('coalesces concurrent calls into a single network handshake', async () => {
		let resolveStatus: ((value: Response) => void) | null = null;
		(fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
			new Promise<Response>(resolve => { resolveStatus = resolve; }),
		);
		signHiveMessage.mockResolvedValueOnce({
			success: true,
			signature: 'f'.repeat(64),
		});
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ ok: true }),
		);

		const first = ensureFriendSession('enrique89');
		const second = ensureFriendSession('enrique89');
		const third = ensureFriendSession('enrique89');

		resolveStatus!(mockResponse({ status: 401, ok: false }));
		const [a, b, c] = await Promise.all([first, second, third]);

		expect([a, b, c]).toEqual([true, true, true]);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(signHiveMessage).toHaveBeenCalledTimes(1);
	});

	it('clears the in-flight promise on failure so the next call retries', async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ status: 401, ok: false }),
		);
		signHiveMessage.mockResolvedValueOnce({ success: false, error: 'user_rejected' });

		expect(await ensureFriendSession('enrique89')).toBe(false);

		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ status: 401, ok: false }),
		);
		signHiveMessage.mockResolvedValueOnce({
			success: true,
			signature: 'g'.repeat(64),
		});
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ ok: true }),
		);

		expect(await ensureFriendSession('enrique89')).toBe(true);
		expect(signHiveMessage).toHaveBeenCalledTimes(2);
	});

	it('lets a later invalidateFriendSession force a fresh handshake', async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ body: { username: 'enrique89' } }),
		);
		signHiveMessage.mockResolvedValueOnce({
			success: true,
			signature: 'h'.repeat(64),
		});
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ ok: true }),
		);

		expect(await ensureFriendSession('enrique89')).toBe(true);
		invalidateFriendSession();

		(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			mockResponse({ body: { username: 'enrique89' } }),
		);

		expect(await ensureFriendSession('enrique89')).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(3);
	});
});
