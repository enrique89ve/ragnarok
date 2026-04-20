import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ReplayMove {
	type: string;
	data: Record<string, any>;
	timestamp: number;
	turn: number;
	player: 'player' | 'opponent';
}

export interface MatchRecord {
	id: string;
	player1: string;
	player2: string;
	winner: string | null;
	turns: number;
	moves: ReplayMove[];
	startedAt: number;
	endedAt: number;
	matchType: 'casual' | 'ranked' | 'campaign';
}

interface ReplayState {
	matchHistory: MatchRecord[];
	currentReplay: MatchRecord | null;
	playbackIndex: number;
	isPlaying: boolean;
	playbackSpeed: number;
}

interface ReplayActions {
	addMatch: (match: MatchRecord) => void;
	clearHistory: () => void;
	loadReplay: (matchId: string) => void;
	closeReplay: () => void;
	setPlaybackIndex: (index: number) => void;
	stepForward: () => void;
	stepBackward: () => void;
	togglePlayback: () => void;
	setPlaybackSpeed: (speed: number) => void;
}

const MAX_HISTORY = 50;

export const useReplayStore = create<ReplayState & ReplayActions>()(
	persist(
		(set, get) => ({
			matchHistory: [],
			currentReplay: null,
			playbackIndex: 0,
			isPlaying: false,
			playbackSpeed: 1,

			addMatch: (match) => {
				set(s => ({
					matchHistory: [match, ...s.matchHistory].slice(0, MAX_HISTORY),
				}));
			},

			clearHistory: () => set({ matchHistory: [] }),

			loadReplay: (matchId) => {
				const match = get().matchHistory.find(m => m.id === matchId);
				if (match) {
					set({ currentReplay: match, playbackIndex: 0, isPlaying: false });
				}
			},

			closeReplay: () => set({ currentReplay: null, playbackIndex: 0, isPlaying: false }),

			setPlaybackIndex: (index) => {
				const replay = get().currentReplay;
				if (!replay) return;
				set({ playbackIndex: Math.max(0, Math.min(index, replay.moves.length)) });
			},

			stepForward: () => {
				const { currentReplay, playbackIndex } = get();
				if (!currentReplay) return;
				if (playbackIndex < currentReplay.moves.length) {
					set({ playbackIndex: playbackIndex + 1 });
				}
			},

			stepBackward: () => {
				const { playbackIndex } = get();
				if (playbackIndex > 0) {
					set({ playbackIndex: playbackIndex - 1 });
				}
			},

			togglePlayback: () => set(s => ({ isPlaying: !s.isPlaying })),

			setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
		}),
		{
			name: 'ragnarok-replays',
			partialize: (state) => ({ matchHistory: state.matchHistory }),
		}
	)
);
