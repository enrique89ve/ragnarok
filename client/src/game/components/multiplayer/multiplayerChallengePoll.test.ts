import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHALLENGE_SIGNATURE_ALGORITHM, type ServerSignedChallenge } from '@shared/p2pAvailability';

let poll: typeof import('./multiplayerChallengePoll');

beforeEach(async () => {
	poll = await import('./multiplayerChallengePoll');
});

function challenge(overrides: Partial<ServerSignedChallenge> = {}): ServerSignedChallenge {
	return {
		from: 'alice',
		to: 'bob',
		peerId: 'peer-room-1',
		timestamp: 1_000,
		expiresAt: 91_000,
		nonce: 'nonce_1234567890ab',
		sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
		serverSig: 'a'.repeat(64),
		...overrides,
	};
}

describe('pollIncomingChallenges', () => {
	it('skips when username is empty', async () => {
		const onChallenges = vi.fn();
		const result = await poll.pollIncomingChallenges({
			username: '   ',
			callbacks: { onChallenges, onStarterGateBlocked: vi.fn() },
			deps: {
				ensureSession: vi.fn(async () => true),
				invalidateSession: vi.fn(),
			},
		});
		expect(result).toBe('skipped');
		expect(onChallenges).not.toHaveBeenCalled();
	});

	it('adds challenges from a successful poll response', async () => {
		const onChallenges = vi.fn();
		const incoming = [challenge()];
		const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, challenges: incoming }), { status: 200 }));
		const result = await poll.pollIncomingChallenges({
			username: 'Alice',
			callbacks: { onChallenges, onStarterGateBlocked: vi.fn() },
			deps: {
				ensureSession: vi.fn(async () => true),
				invalidateSession: vi.fn(),
				fetchImpl,
			},
		});
		expect(result).toBe('ok');
		expect(onChallenges).toHaveBeenCalledWith(incoming);
		expect(fetchImpl).toHaveBeenCalledWith('/api/friends/challenges/alice', expect.objectContaining({ method: 'GET' }));
	});

	it('clears local challenge state when starter gate blocks polling', async () => {
		const onStarterGateBlocked = vi.fn();
		const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: false, reason: 'starter_claim_required' }), { status: 403 }));
		const result = await poll.pollIncomingChallenges({
			username: 'alice',
			callbacks: { onChallenges: vi.fn(), onStarterGateBlocked },
			deps: {
				ensureSession: vi.fn(async () => true),
				invalidateSession: vi.fn(),
				fetchImpl,
			},
		});
		expect(result).toBe('blocked');
		expect(onStarterGateBlocked).toHaveBeenCalledOnce();
	});

	it('retries once after invalidating the friend session on 401', async () => {
		const invalidateSession = vi.fn();
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 401 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, challenges: [] }), { status: 200 }));
		const result = await poll.pollIncomingChallenges({
			username: 'alice',
			callbacks: { onChallenges: vi.fn(), onStarterGateBlocked: vi.fn() },
			deps: {
				ensureSession: vi.fn(async () => true),
				invalidateSession,
				fetchImpl,
			},
		});
		expect(result).toBe('ok');
		expect(invalidateSession).toHaveBeenCalledOnce();
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});
});
