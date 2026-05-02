import { create } from 'zustand';

export type MatchmakingStatus = 'idle' | 'queued' | 'matched' | 'error';

interface MatchmakingStore {
	status: MatchmakingStatus;
	queuePosition: number | null;
	opponentPeerId: string | null;
	isHost: boolean | null;
	/**
	 * Server-emitted match identifier. Both peers receive the same value when
	 * matchmaking pairs them and use it as the WS relay room name. The legacy
	 * isHost flag from matchmaking is now advisory — the WS server resolves
	 * host vs client by order of arrival in the room.
	 */
	roomId: string | null;
	error: string | null;

	setStatus: (status: MatchmakingStatus) => void;
	setQueuePosition: (position: number | null) => void;
	setOpponent: (peerId: string | null, isHost: boolean) => void;
	setRoomId: (roomId: string | null) => void;
	setError: (error: string | null) => void;
	reset: () => void;
}

export const useMatchmakingStore = create<MatchmakingStore>((set) => ({
	status: 'idle',
	queuePosition: null,
	opponentPeerId: null,
	isHost: null,
	roomId: null,
	error: null,

	setStatus: (status) => set({ status }),
	setQueuePosition: (position) => set({ queuePosition: position }),
	setOpponent: (peerId, isHost) => set({ opponentPeerId: peerId, isHost }),
	setRoomId: (roomId) => set({ roomId }),
	setError: (error) => set({ error }),
	reset: () =>
		set({
			status: 'idle',
			queuePosition: null,
			opponentPeerId: null,
			isHost: null,
			roomId: null,
			error: null,
		}),
}));
