import { useCallback, useEffect, useRef } from 'react';
import { useNFTUsername } from '../../nft/hooks';
import { useFriendStore, type Friend } from '../../stores/friendStore';
import { usePeerStore } from '../../stores/peerStore';
import { useMatchmakingStore } from '../../stores/matchmakingStore';
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
const presenceHeartbeatNextAllowedAt = new Map<string, number>();

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
	return now >= (presenceHeartbeatNextAllowedAt.get(username.toLowerCase()) ?? 0);
}

export function markPresenceHeartbeatSent(username: string, now = Date.now()): void {
	presenceHeartbeatNextAllowedAt.set(username.toLowerCase(), now + PRESENCE_HEARTBEAT_MIN_GAP_MS);
}

function markPresenceHeartbeatCooldown(username: string, retryAfterMs: number, now = Date.now()): void {
	presenceHeartbeatNextAllowedAt.set(username.toLowerCase(), now + Math.max(retryAfterMs, PRESENCE_HEARTBEAT_MIN_GAP_MS));
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
			const response = await fetch('/api/friends/heartbeat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildPresenceHeartbeatBody({
					username: hiveUsername,
					friends: getPresenceEligibleFriends(friends),
					peerId,
					availability: availabilityRef.current,
				})),
				signal,
			});

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
