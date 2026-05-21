import { useCallback, useEffect } from 'react';
import { useNFTUsername } from '../../nft/hooks';
import { useFriendStore, type Friend, type FriendPresence } from '../../stores/friendStore';
import { usePeerStore } from '../../stores/peerStore';

const PRESENCE_HEARTBEAT_INTERVAL_MS = 120_000;

type PresenceHeartbeatBody = {
	readonly username: string;
	readonly friends: readonly string[];
	readonly peerId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFriendPresence(value: unknown): value is FriendPresence {
	if (!isRecord(value)) return false;
	if (typeof value.online !== 'boolean') return false;
	if ('peerId' in value && typeof value.peerId !== 'string') return false;
	if ('lastSeen' in value && typeof value.lastSeen !== 'number') return false;
	return true;
}

export function buildPresenceHeartbeatBody(params: {
	readonly username: string;
	readonly friends: ReadonlyArray<Pick<Friend, 'hiveUsername'>>;
	readonly peerId?: string | null;
}): PresenceHeartbeatBody {
	const body: PresenceHeartbeatBody = {
		username: params.username.toLowerCase(),
		friends: params.friends.map(friend => friend.hiveUsername.toLowerCase()),
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
		.map(friend => ({ hiveUsername: friend.hiveUsername }));
}

export function readFriendPresenceStatuses(payload: unknown): Record<string, FriendPresence> {
	if (!isRecord(payload) || !isRecord(payload.statuses)) return {};

	const statuses: Record<string, FriendPresence> = {};
	for (const [username, presence] of Object.entries(payload.statuses)) {
		if (!isFriendPresence(presence)) continue;
		statuses[username.toLowerCase()] = presence;
	}

	return statuses;
}

export default function SocialPresenceHeartbeat() {
	const hiveUsername = useNFTUsername();
	const friends = useFriendStore(state => state.friends);
	const updatePresence = useFriendStore(state => state.updatePresence);
	const peerId = usePeerStore(state => state.myPeerId);

	const sendHeartbeat = useCallback(async (signal?: AbortSignal) => {
		if (!hiveUsername) return;

		try {
			const response = await fetch('/api/friends/heartbeat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildPresenceHeartbeatBody({
					username: hiveUsername,
					friends: getPresenceEligibleFriends(friends),
					peerId,
				})),
				signal,
			});

			if (!response.ok) return;

			const payload: unknown = await response.json();
			updatePresence(readFriendPresenceStatuses(payload));
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') return;
		}
	}, [hiveUsername, friends, peerId, updatePresence]);

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
