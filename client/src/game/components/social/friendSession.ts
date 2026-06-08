import { signHiveMessage } from '@/data/HiveAuth';

const SOCIAL_SESSION_ACTION = 'friend-session';
const SOCIAL_SESSION_ENDPOINT = '/api/friends/session/login';
const SOCIAL_SESSION_STATUS_ENDPOINT = '/api/friends/session/status';

let ensureSessionPromise: Promise<boolean> | null = null;
let sessionReady = false;
let sessionOwner: string | null = null;

function normalizeUsername(username: string): string {
	return username.trim().toLowerCase().replace(/^@/, '');
}

function buildMessageForFriendSession(username: string, timestamp: number): string {
	return `ragnarok-${SOCIAL_SESSION_ACTION}:${username}:${timestamp}`;
}

export async function ensureFriendSession(username: string): Promise<boolean> {
	const normalizedUsername = normalizeUsername(username);
	if (!normalizedUsername) return false;
	if (sessionReady && sessionOwner === normalizedUsername) return true;
	if (ensureSessionPromise) return ensureSessionPromise;

	ensureSessionPromise = (async () => {
		try {
			const statusResponse = await fetch(SOCIAL_SESSION_STATUS_ENDPOINT, {
				method: 'GET',
			});
			if (statusResponse.ok) {
				const payload = await statusResponse.json().catch(() => null);
				const sessionUser = typeof payload?.username === 'string' ? normalizeUsername(payload.username) : null;
				if (sessionUser === normalizedUsername) {
					sessionReady = true;
					sessionOwner = normalizedUsername;
					return true;
				}
				invalidateFriendSession();
			}

			const timestamp = Date.now();
			const message = buildMessageForFriendSession(normalizedUsername, timestamp);
			const result = await signHiveMessage(message, {
				username: normalizedUsername,
				title: `Ragnarok: ${SOCIAL_SESSION_ACTION.replace(/-/g, ' ')}`,
			});
			if (!result.success || !result.signature) return false;

			const response = await fetch(SOCIAL_SESSION_ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: normalizedUsername,
					timestamp,
					signature: result.signature,
				}),
			});
			if (!response.ok) return false;

			sessionReady = true;
			sessionOwner = normalizedUsername;
			return true;
		} finally {
			ensureSessionPromise = null;
		}
	})();

	return ensureSessionPromise;
}

export function invalidateFriendSession(): void {
	sessionReady = false;
	sessionOwner = null;
}
