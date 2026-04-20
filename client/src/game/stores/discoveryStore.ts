import { create } from 'zustand';
import { debug } from '../config/debugConfig';
import type { CardData, GameState } from '../types';

interface DiscoveryStore {
	selectDiscoveryOption: (gameState: GameState, card: CardData | null) => GameState | null;
}

export const useDiscoveryStore = create<DiscoveryStore>()(() => ({
	selectDiscoveryOption: (gameState: GameState, card: CardData | null): GameState | null => {
		if (!gameState.discovery || !gameState.discovery.active) return null;

		debug.log(`[DiscoveryStore] Selecting discovery option: ${card?.name || 'Skip'}`);

		if (!gameState.discovery.callback) return null;
		const newState = gameState.discovery.callback(card);

		if (newState) {
			newState.discovery = {
				...newState.discovery,
				active: false,
				options: []
			};
			return newState;
		}
		return null;
	},
}));
