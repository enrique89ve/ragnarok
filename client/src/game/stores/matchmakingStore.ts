import { create } from 'zustand';

export type MatchmakingStatus = 'idle' | 'queued' | 'matched' | 'error';

interface MatchmakingStore {
	status: MatchmakingStatus;
	queuePosition: number | null;
	opponentPeerId: string | null;
	isHost: boolean | null;
	error: string | null;

	setStatus: (status: MatchmakingStatus) => void;
	setQueuePosition: (position: number | null) => void;
	setOpponent: (peerId: string | null, isHost: boolean) => void;
	setError: (error: string | null) => void;
	reset: () => void;
}

export const useMatchmakingStore = create<MatchmakingStore>((set) => ({
	status: 'idle',
	queuePosition: null,
	opponentPeerId: null,
	isHost: null,
	error: null,

	setStatus: (status) => set({ status }),
	setQueuePosition: (position) => set({ queuePosition: position }),
	setOpponent: (peerId, isHost) => set({ opponentPeerId: peerId, isHost }),
	setError: (error) => set({ error }),
	reset: () =>
		set({
			status: 'idle',
			queuePosition: null,
			opponentPeerId: null,
			isHost: null,
			error: null,
		}),
}));
