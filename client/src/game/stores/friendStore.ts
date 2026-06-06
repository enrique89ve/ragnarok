import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { accountScopedStorage, registerAccountScopedStore } from '../../lib/storage/accountScopedStorage';
import type { WarbandRelationStatus } from '@shared/warbandRelations';
import type { FriendPresenceSnapshot, ServerSignedChallenge } from '@shared/p2pAvailability';

export interface Friend {
	hiveUsername: string;
	addedAt: number;
	nickname?: string;
	relationStatus?: WarbandRelationStatus;
}

export type FriendPresence = FriendPresenceSnapshot;

export type OutgoingFriendChallenge = {
	readonly to: string;
	readonly peerId: string;
	readonly sentAt: number;
	readonly expiresAt: number;
	readonly matchChallenge?: ServerSignedChallenge;
	readonly opponentMatchChallenge?: ServerSignedChallenge;
};

export type ChallengeCooldown = {
	readonly until: number;
	readonly retryAfterMs: number;
};

interface FriendState {
	friends: Friend[];
	onlineStatus: Record<string, FriendPresence>;
	pendingChallenges: ServerSignedChallenge[];
	outgoingChallenge: OutgoingFriendChallenge | null;
	challengeCooldowns: Record<string, ChallengeCooldown>;
	presenceCooldownUntil: number | null;
}

interface FriendActions {
	addFriend: (hiveUsername: string) => void;
	removeFriend: (hiveUsername: string) => void;
	setNickname: (hiveUsername: string, nickname: string) => void;
	updatePresence: (statuses: Record<string, FriendPresence>) => void;
	addChallenge: (challenge: ServerSignedChallenge) => void;
	addChallenges: (challenges: readonly ServerSignedChallenge[]) => void;
	setOutgoingChallenge: (challenge: OutgoingFriendChallenge) => void;
	clearOutgoingChallenge: () => void;
	setChallengeCooldown: (hiveUsername: string, retryAfterMs: number, now?: number) => void;
	clearChallengeCooldown: (hiveUsername: string) => void;
	setPresenceCooldown: (retryAfterMs: number, now?: number) => void;
	pruneExpiredChallenges: (now?: number) => void;
	dismissChallenge: (from: string) => void;
	clearChallenges: () => void;
	isFriend: (hiveUsername: string) => boolean;
}

function normalizeFriendUsername(hiveUsername: string): string {
	return hiveUsername.toLowerCase().replace(/^@/, '');
}

export const useFriendStore = create<FriendState & FriendActions>()(
	persist(
		(set, get) => ({
			friends: [],
			onlineStatus: {},
			pendingChallenges: [],
			outgoingChallenge: null,
			challengeCooldowns: {},
			presenceCooldownUntil: null,

			addFriend: (hiveUsername) => {
				const normalized = normalizeFriendUsername(hiveUsername);
				if (get().friends.some(f => f.hiveUsername === normalized)) return;
				set(state => ({
					friends: [...state.friends, { hiveUsername: normalized, addedAt: Date.now(), relationStatus: 'local' }],
				}));
			},

			removeFriend: (hiveUsername) => {
				set(state => ({
					friends: state.friends.filter(f => f.hiveUsername !== hiveUsername),
				}));
			},

			setNickname: (hiveUsername, nickname) => {
				set(state => ({
					friends: state.friends.map(f =>
						f.hiveUsername === hiveUsername ? { ...f, nickname } : f
					),
				}));
			},

			updatePresence: (statuses) => {
				set(state => ({ onlineStatus: { ...state.onlineStatus, ...statuses } }));
			},

			addChallenge: (challenge) => {
				set(state => ({
					pendingChallenges: [
						...state.pendingChallenges.filter(c => c.from !== challenge.from && c.expiresAt > Date.now()),
						challenge,
					],
				}));
			},

			addChallenges: (challenges) => {
				if (challenges.length === 0) return;
				set(state => {
					const now = Date.now();
					const incoming = new Map(challenges
						.filter(challenge => challenge.expiresAt > now)
						.map(challenge => [challenge.from, challenge]));
					const retained = state.pendingChallenges.filter(challenge => challenge.expiresAt > now && !incoming.has(challenge.from));
					return { pendingChallenges: [...retained, ...incoming.values()] };
				});
			},

			setOutgoingChallenge: (challenge) => set({ outgoingChallenge: challenge }),

			clearOutgoingChallenge: () => set({ outgoingChallenge: null }),

			setChallengeCooldown: (hiveUsername, retryAfterMs, now = Date.now()) => {
				const normalized = normalizeFriendUsername(hiveUsername);
				set(state => ({
					challengeCooldowns: {
						...state.challengeCooldowns,
						[normalized]: {
							until: now + retryAfterMs,
							retryAfterMs,
						},
					},
				}));
			},

			clearChallengeCooldown: (hiveUsername) => {
				const normalized = normalizeFriendUsername(hiveUsername);
				set(state => {
					const { [normalized]: _removed, ...rest } = state.challengeCooldowns;
					return { challengeCooldowns: rest };
				});
			},

			setPresenceCooldown: (retryAfterMs, now = Date.now()) => {
				set({ presenceCooldownUntil: now + retryAfterMs });
			},

			pruneExpiredChallenges: (now = Date.now()) => {
				set(state => ({
					pendingChallenges: state.pendingChallenges.filter(challenge => challenge.expiresAt > now),
					outgoingChallenge: state.outgoingChallenge && state.outgoingChallenge.expiresAt > now
						? state.outgoingChallenge
						: null,
					challengeCooldowns: Object.fromEntries(
						Object.entries(state.challengeCooldowns).filter(([, cooldown]) => cooldown.until > now),
					),
					presenceCooldownUntil: state.presenceCooldownUntil && state.presenceCooldownUntil > now
						? state.presenceCooldownUntil
						: null,
				}));
			},

			dismissChallenge: (from) => {
				set(state => ({
					pendingChallenges: state.pendingChallenges.filter(c => c.from !== normalizeFriendUsername(from)),
				}));
			},

			clearChallenges: () => set({ pendingChallenges: [] }),

			isFriend: (hiveUsername) => {
				return get().friends.some(f => f.hiveUsername === hiveUsername.toLowerCase());
			},
		}),
		{
			name: 'ragnarok-friends',
			storage: createJSONStorage(() => accountScopedStorage),
			partialize: (state) => ({
				friends: state.friends,
			}),
		}
	)
);

registerAccountScopedStore(useFriendStore);
