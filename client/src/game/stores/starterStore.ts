import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StarterState {
	claimed: boolean;
	markClaimed: () => void;
}

export const useStarterStore = create<StarterState>()(
	persist(
		(set) => ({
			claimed: false,
			markClaimed: () => set({ claimed: true }),
		}),
		{ name: 'ragnarok-starter-claimed' }
	)
);
