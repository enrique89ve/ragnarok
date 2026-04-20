import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StarterState {
	claimed: boolean;
	claimedAt: number | null;
	markClaimed: () => void;
}

export const useStarterStore = create<StarterState>()(
	persist(
		(set) => ({
			claimed: false,
			claimedAt: null,
			markClaimed: () => set({ claimed: true, claimedAt: Date.now() }),
		}),
		{ name: 'ragnarok-starter-claimed' }
	)
);
