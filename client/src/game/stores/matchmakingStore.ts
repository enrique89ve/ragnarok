import { create } from 'zustand';
import type { MatchOffer } from '@shared/p2pMatchAcceptance';

export type MatchmakingStatus =
	| 'idle'
	| 'authorizing'
	| 'queued'
	| 'offered'
	| 'accepting'
	| 'waiting_opponent'
	| 'ready'
	| 'connecting'
	| 'error';

type MatchmakingStore = {
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
	offer: MatchOffer | null;
	matchCommitted: boolean;
	/**
	 * Process-local bearer token returned by the matchmaking server for the
	 * current queued peerId. Memory-only; never persist this value.
	 */
	queueToken: string | null;
	error: string | null;

	setStatus: (status: MatchmakingStatus) => void;
	setQueuePosition: (position: number | null) => void;
	setOpponent: (peerId: string | null, isHost: boolean | null) => void;
	setRoomId: (roomId: string | null) => void;
	setOffer: (offer: MatchOffer | null) => void;
	setMatchCommitted: (committed: boolean) => void;
	setQueueToken: (queueToken: string | null) => void;
	setError: (error: string | null) => void;
	reset: () => void;
};

export const useMatchmakingStore = create<MatchmakingStore>((set) => ({
	status: 'idle',
	queuePosition: null,
	opponentPeerId: null,
	isHost: null,
	roomId: null,
	offer: null,
	matchCommitted: false,
	queueToken: null,
	error: null,

	setStatus: (status) => set({ status }),
	setQueuePosition: (position) => set({ queuePosition: position }),
	setOpponent: (peerId, isHost) => set({ opponentPeerId: peerId, isHost }),
	setRoomId: (roomId) => set({ roomId }),
	setOffer: (offer) => set({ offer }),
	setMatchCommitted: (matchCommitted) => set({ matchCommitted }),
	setQueueToken: (queueToken) => set({ queueToken }),
	setError: (error) => set({ error }),
	reset: () =>
		set({
			status: 'idle',
			queuePosition: null,
			opponentPeerId: null,
			isHost: null,
			roomId: null,
			offer: null,
			matchCommitted: false,
			queueToken: null,
			error: null,
		}),
}));
