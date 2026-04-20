import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Friend {
	hiveUsername: string;
	addedAt: number;
	nickname?: string;
}

export interface FriendPresence {
	online: boolean;
	peerId?: string;
	lastSeen?: number;
}

interface FriendState {
	friends: Friend[];
	onlineStatus: Record<string, FriendPresence>;
	pendingChallenges: Array<{ from: string; peerId: string; timestamp: number }>;
}

interface FriendActions {
	addFriend: (hiveUsername: string) => void;
	removeFriend: (hiveUsername: string) => void;
	setNickname: (hiveUsername: string, nickname: string) => void;
	updatePresence: (statuses: Record<string, FriendPresence>) => void;
	addChallenge: (from: string, peerId: string) => void;
	dismissChallenge: (from: string) => void;
	clearChallenges: () => void;
	isFriend: (hiveUsername: string) => boolean;
}

export const useFriendStore = create<FriendState & FriendActions>()(
	persist(
		(set, get) => ({
			friends: [],
			onlineStatus: {},
			pendingChallenges: [],

			addFriend: (hiveUsername) => {
				const normalized = hiveUsername.toLowerCase().replace(/^@/, '');
				if (get().friends.some(f => f.hiveUsername === normalized)) return;
				set(state => ({
					friends: [...state.friends, { hiveUsername: normalized, addedAt: Date.now() }],
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

			addChallenge: (from, peerId) => {
				set(state => ({
					pendingChallenges: [
						...state.pendingChallenges.filter(c => c.from !== from),
						{ from, peerId, timestamp: Date.now() },
					],
				}));
			},

			dismissChallenge: (from) => {
				set(state => ({
					pendingChallenges: state.pendingChallenges.filter(c => c.from !== from),
				}));
			},

			clearChallenges: () => set({ pendingChallenges: [] }),

			isFriend: (hiveUsername) => {
				return get().friends.some(f => f.hiveUsername === hiveUsername.toLowerCase());
			},
		}),
		{
			name: 'ragnarok-friends',
			partialize: (state) => ({
				friends: state.friends,
			}),
		}
	)
);
