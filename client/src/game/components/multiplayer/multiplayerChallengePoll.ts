import { readPresenceHeartbeatResponse, type ServerSignedChallenge } from '@shared/p2pAvailability';
import { shouldClearDirectChallengeStateAfterPoll } from './MultiplayerLobby.logic';

export type IncomingChallengePollCallbacks = {
	readonly onChallenges: (challenges: readonly ServerSignedChallenge[]) => void;
	readonly onStarterGateBlocked: () => void;
};

export type IncomingChallengePollDeps = {
	readonly ensureSession: (normalizedUsername: string) => Promise<boolean>;
	readonly invalidateSession: () => void;
	readonly fetchImpl?: typeof fetch;
};

export type IncomingChallengePollResult =
	| 'ok'
	| 'skipped'
	| 'auth_failed'
	| 'blocked'
	| 'http_error';

export async function pollIncomingChallenges(input: {
	readonly username: string;
	readonly signal?: AbortSignal;
	readonly callbacks: IncomingChallengePollCallbacks;
	readonly deps: IncomingChallengePollDeps;
}): Promise<IncomingChallengePollResult> {
	const normalizedUsername = input.username.trim().toLowerCase();
	if (!normalizedUsername) return 'skipped';

	const fetchImpl = input.deps.fetchImpl ?? fetch;
	if (!await input.deps.ensureSession(normalizedUsername)) return 'auth_failed';

	let response = await fetchImpl(`/api/friends/challenges/${encodeURIComponent(normalizedUsername)}`, {
		method: 'GET',
		signal: input.signal,
	});

	if (response.status === 401) {
		input.deps.invalidateSession();
		if (!await input.deps.ensureSession(normalizedUsername)) return 'auth_failed';
		response = await fetchImpl(`/api/friends/challenges/${encodeURIComponent(normalizedUsername)}`, {
			method: 'GET',
			signal: input.signal,
		});
	}

	if (!response.ok) {
		const payload: unknown = await response.json().catch(() => null);
		if (shouldClearDirectChallengeStateAfterPoll(response.status, payload)) {
			input.callbacks.onStarterGateBlocked();
			return 'blocked';
		}
		return 'http_error';
	}

	const payload: unknown = await response.json();
	const parsed = readPresenceHeartbeatResponse(payload);
	input.callbacks.onChallenges(parsed.challenges);
	return 'ok';
}
