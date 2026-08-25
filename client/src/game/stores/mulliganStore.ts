import { create } from 'zustand';
import { toggleCardSelection, confirmMulligan, confirmAiMulligan, skipMulligan } from '../utils/mulliganUtils';
import { audioEventBus } from '../audio/audioEventBus';
import { debug } from '../config/debugConfig';
import type { GameState } from '../types';

interface MulliganStore {
	toggleMulliganCard: (gameState: GameState, cardId: string) => GameState | null;
	confirmMulligan: (gameState: GameState) => GameState | null;
	confirmAiMulligan: (gameState: GameState) => GameState | null;
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
		try {
			if (gameState.gamePhase !== 'mulligan' || !gameState.mulligan?.active) {
				throw new Error('Not in mulligan phase');
			}
			const newState = confirmMulligan(gameState);
			audioEventBus.emit('battlecry');
			debug.log('Mulligan confirmed, replacing selected cards');
			return newState;
		} catch (error) {
			debug.error('Error confirming mulligan:', error);
			return null;
		}
	},

	confirmAiMulligan: (gameState: GameState): GameState | null => {
		try {
			if (gameState.gamePhase !== 'mulligan' || !gameState.mulligan?.active) {
				throw new Error('Not in mulligan phase');
			}
			return confirmAiMulligan(gameState);
		} catch (error) {
			debug.error('Error confirming AI mulligan:', error);
			return null;
		}
	},

	skipMulligan: (gameState: GameState): GameState | null => {
		try {
			if (gameState.gamePhase !== 'mulligan' || !gameState.mulligan?.active) {
				throw new Error('Not in mulligan phase');
			}
			const newState = skipMulligan(gameState);
			audioEventBus.emit('battlecry');
			debug.log('Mulligan skipped, keeping all cards');
			return newState;
		} catch (error) {
			debug.error('Error skipping mulligan:', error);
			return null;
		}
	},
}));
