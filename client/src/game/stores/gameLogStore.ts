import { create } from 'zustand';

export interface GameLogEntry {
	id: string;
	timestamp: number;
	turn: number;
	actor: 'player' | 'opponent';
	type: 'play_card' | 'attack' | 'hero_power' | 'spell' | 'draw' | 'death' | 'damage' | 'heal' | 'secret' | 'end_turn' | 'fatigue' | 'battlecry' | 'deathrattle';
	message: string;
	details?: {
		cardName?: string;
		targetName?: string;
		amount?: number;
	};
}

interface GameLogState {
	entries: GameLogEntry[];
	isOpen: boolean;
	addEntry: (entry: Omit<GameLogEntry, 'id' | 'timestamp'>) => void;
	toggleLog: () => void;
	clearLog: () => void;
}

export const useGameLogStore = create<GameLogState>((set) => ({
	entries: [],
	isOpen: false,
	addEntry: (entry) => set((state) => {
		const base = state.entries.length >= 100
			? state.entries.slice(1)
			: state.entries;
		const newEntry: GameLogEntry = {
			...entry,
			id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			timestamp: Date.now()
		};
		return { entries: [...base, newEntry] };
	}),
	toggleLog: () => set((state) => ({ isOpen: !state.isOpen })),
	clearLog: () => set({ entries: [] })
}));
