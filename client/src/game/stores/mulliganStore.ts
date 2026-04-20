import { create } from 'zustand';
import { toggleCardSelection, confirmMulligan, skipMulligan } from '../utils/mulliganUtils';
import { useAudio } from '../../lib/stores/useAudio';
import { debug } from '../config/debugConfig';
import type { GameState } from '../types';

interface MulliganStore {
	toggleMulliganCard: (gameState: GameState, cardId: string) => GameState | null;
	confirmMulligan: (gameState: GameState) => GameState | null;
	skipMulligan: (gameState: GameState) => GameState | null;
}

export const useMulliganStore = create<MulliganStore>()(() => ({
	toggleMulliganCard: (gameState: GameState, cardId: string): GameState | null => {
		try {
			if (gameState.gamePhase !== 'mulligan' || !gameState.mulligan?.active) {
				throw new Error('Not in mulligan phase');
			}
			const newState = toggleCardSelection(gameState, cardId);
			debug.log(`Toggled mulligan selection for card ${cardId}`);
			return newState;
		} catch (error) {
			debug.error('Error during mulligan selection:', error);
			return null;
		}
	},

	confirmMulligan: (gameState: GameState): GameState | null => {
		const audioStore = useAudio.getState();
		try {
			if (gameState.gamePhase !== 'mulligan' || !gameState.mulligan?.active) {
				throw new Error('Not in mulligan phase');
			}
			const newState = confirmMulligan(gameState);
			if (audioStore && typeof audioStore.playSoundEffect === 'function') {
				audioStore.playSoundEffect('battlecry');
			}
			debug.log('Mulligan confirmed, replacing selected cards');
			return newState;
		} catch (error) {
			debug.error('Error confirming mulligan:', error);
			return null;
		}
	},

	skipMulligan: (gameState: GameState): GameState | null => {
		const audioStore = useAudio.getState();
		try {
			if (gameState.gamePhase !== 'mulligan' || !gameState.mulligan?.active) {
				throw new Error('Not in mulligan phase');
			}
			const newState = skipMulligan(gameState);
			if (audioStore && typeof audioStore.playSoundEffect === 'function') {
				audioStore.playSoundEffect('battlecry');
			}
			debug.log('Mulligan skipped, keeping all cards');
			return newState;
		} catch (error) {
			debug.error('Error skipping mulligan:', error);
			return null;
		}
	},
}));
