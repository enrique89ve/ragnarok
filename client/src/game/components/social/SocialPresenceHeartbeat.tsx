import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNFTUsername } from '../../nft/hooks';
import { useFriendStore, type Friend } from '../../stores/friendStore';
import { usePeerStore } from '../../stores/peerStore';
import { useMatchmakingStore } from '../../stores/matchmakingStore';
import { ensureFriendSession, invalidateFriendSession } from './friendSession';
import {
	availabilityFromConnectionState,
	isValidAvailabilityHiveUsername,
	readChallengeSendResponse,
	readPresenceHeartbeatResponse,
	type FriendPresenceSnapshot,
	type P2PAvailabilityState,
	type ServerSignedChallenge,
} from '@shared/p2pAvailability';

const PRESENCE_HEARTBEAT_INTERVAL_MS = 120_000;
const PRESENCE_HEARTBEAT_MIN_GAP_MS = 120_000;
const STORAGE_KEY = 'ragnarok-presence-next-allowed';

function getStoredNextAllowed(): Map<string, number> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return new Map();
		const parsed = JSON.parse(raw);
		const map = new Map<string, number>();
		if (typeof parsed === 'object' && parsed !== null) {
			for (const [k, v] of Object.entries(parsed)) {
				if (typeof v === 'number') map.set(k, v);
			}
		}
		return map;
	} catch {
		return new Map();
	}
}

function setStoredNextAllowed(username: string, timestamp: number): void {
	const current = getStoredNextAllowed();
	current.set(username.toLowerCase(), timestamp);
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(current.entries())));
	} catch {
		// Ignore storage errors
	}
}

type PresenceHeartbeatBody = {
	readonly username: string;
	readonly friends: readonly string[];
	readonly peerId?: string;
	readonly availability?: P2PAvailabilityState;
};

export function buildPresenceHeartbeatBody(params: {
	readonly username: string;
	readonly friends: ReadonlyArray<Pick<Friend, 'hiveUsername'>>;
	readonly peerId?: string | null;
	readonly availability?: P2PAvailabilityState;
}): PresenceHeartbeatBody {
	const body: PresenceHeartbeatBody = {
		username: params.username.toLowerCase(),
		friends: params.friends.map(friend => friend.hiveUsername.toLowerCase()),
		...(params.availability ? { availability: params.availability } : {}),
	};

	if (typeof params.peerId === 'string' && params.peerId.length > 0) {
		return { ...body, peerId: params.peerId };
	}

	return body;
}

export function getPresenceEligibleFriends(
	friends: ReadonlyArray<Pick<Friend, 'hiveUsername' | 'relationStatus'>>,
): ReadonlyArray<Pick<Friend, 'hiveUsername'>> {
	return friends
		.filter(friend => friend.relationStatus === 'accepted')
		.map(friend => ({ hiveUsername: friend.hiveUsername.toLowerCase().replace(/^@/, '') }))
		.filter(friend => isValidAvailabilityHiveUsername(friend.hiveUsername));
}

export function readFriendPresenceStatuses(payload: unknown): Record<string, FriendPresenceSnapshot> {
	return readPresenceHeartbeatResponse(payload).statuses;
}

export function readFriendPresenceChallenges(payload: unknown): readonly ServerSignedChallenge[] {
	return readPresenceHeartbeatResponse(payload).challenges;
}

export function canSendPresenceHeartbeat(username: string, now = Date.now()): boolean {
	return now >= (getStoredNextAllowed().get(username.toLowerCase()) ?? 0);
}

export function markPresenceHeartbeatSent(username: string, now = Date.now()): void {
	setStoredNextAllowed(username, now + PRESENCE_HEARTBEAT_MIN_GAP_MS);
}

function markPresenceHeartbeatCooldown(username: string, retryAfterMs: number, now = Date.now()): void {
	setStoredNextAllowed(username, now + Math.max(retryAfterMs, PRESENCE_HEARTBEAT_MIN_GAP_MS));
}

export default function SocialPresenceHeartbeat() {
	const hiveUsername = useNFTUsername();
	const friends = useFriendStore(state => state.friends);
	const updatePresence = useFriendStore(state => state.updatePresence);
	const addChallenges = useFriendStore(state => state.addChallenges);
	const setPresenceCooldown = useFriendStore(state => state.setPresenceCooldown);
	const pruneExpiredChallenges = useFriendStore(state => state.pruneExpiredChallenges);
	const peerId = usePeerStore(state => state.myPeerId);
	const connectionState = usePeerStore(state => state.connectionState);
	const matchmakingStatus = useMatchmakingStore(state => state.status);
	const availabilityRef = useRef<P2PAvailabilityState>('available');

	useEffect(() => {
		availabilityRef.current = availabilityFromConnectionState(connectionState, matchmakingStatus);
	}, [connectionState, matchmakingStatus]);

	const sendHeartbeat = useCallback(async (signal?: AbortSignal) => {
		if (!hiveUsername) return;
		const normalizedUsername = hiveUsername.toLowerCase();
		if (!canSendPresenceHeartbeat(normalizedUsername)) return;
		markPresenceHeartbeatSent(normalizedUsername);

		try {
			if (!await ensureFriendSession(normalizedUsername)) return;

			let response = await fetch('/api/friends/heartbeat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(buildPresenceHeartbeatBody({
					username: hiveUsername,
					friends: getPresenceEligibleFriends(friends),
					peerId,
					availability: availabilityRef.current,
				})),
				signal,
			});

			if (response.status === 401) {
				invalidateFriendSession();
				if (!await ensureFriendSession(normalizedUsername)) {
					console.warn('[presence-heartbeat] reauth failed: session not established', { username: normalizedUsername });
					toast.error('Friends session expired. Reconnect to refresh presence.');
					return;
				}
				response = await fetch('/api/friends/heartbeat', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(buildPresenceHeartbeatBody({
						username: hiveUsername,
						friends: getPresenceEligibleFriends(friends),
						peerId,
						availability: availabilityRef.current,
					})),
					signal,
				});
				if (response.status === 401) {
					console.warn('[presence-heartbeat] reauth failed: 2nd 401', { username: normalizedUsername, status: response.status });
					toast.error('Friends session rejected. Reconnect to refresh presence.');
					return;
				}
			}

			const payload: unknown = await response.json();
			if (!response.ok) {
				const parsed = readChallengeSendResponse(payload);
				if (!parsed.ok && parsed.reason === 'rate_limited' && typeof parsed.retryAfterMs === 'number') {
					markPresenceHeartbeatCooldown(normalizedUsername, parsed.retryAfterMs);
					setPresenceCooldown(parsed.retryAfterMs);
				}
				return;
			}

			const parsed = readPresenceHeartbeatResponse(payload);
			updatePresence(parsed.statuses);
			addChallenges(parsed.challenges);
			pruneExpiredChallenges();
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') return;
			console.warn('[presence-heartbeat] sync failed', { username: normalizedUsername, error: error instanceof Error ? error.message : String(error) });
			toast.error('Presence sync paused. Will retry automatically.');
		}
	}, [hiveUsername, friends, peerId, updatePresence, addChallenges, setPresenceCooldown, pruneExpiredChallenges]);

	useEffect(() => {
		if (!hiveUsername) return undefined;

		const controller = new AbortController();
		void sendHeartbeat(controller.signal);

		const interval = window.setInterval(() => {
			void sendHeartbeat(controller.signal);
		}, PRESENCE_HEARTBEAT_INTERVAL_MS);

		return () => {
			controller.abort();
			window.clearInterval(interval);
		};
	}, [hiveUsername, sendHeartbeat]);

	return null;
}
