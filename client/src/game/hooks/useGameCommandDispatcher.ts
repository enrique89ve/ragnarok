import { useCallback } from 'react';
import { dispatchGameCommand } from '../actions/gameCommandDispatcher';
import type { GameCommand } from '../core/commands';
import { useGameStore } from '../stores/gameStore';

export type GameCommandDispatch = (command: GameCommand) => void;

export function useGameCommandDispatcher(): GameCommandDispatch {
	const playCard = useGameStore(state => state.playCard);
	const attackWithCard = useGameStore(state => state.attackWithCard);
	const endTurn = useGameStore(state => state.endTurn);
	const performHeroPower = useGameStore(state => state.performHeroPower);
	const toggleMulliganCard = useGameStore(state => state.toggleMulliganCard);
	const confirmMulligan = useGameStore(state => state.confirmMulligan);
	const skipMulligan = useGameStore(state => state.skipMulligan);
	const selectDiscoveryOption = useGameStore(state => state.selectDiscoveryOption);

	return useCallback((command: GameCommand) => {
		dispatchGameCommand(command, {
			playCard,
			attackWithCard,
			endTurn,
			performHeroPower,
			toggleMulliganCard,
			confirmMulligan,
			skipMulligan,
			selectDiscoveryOption,
		});
	}, [
		playCard,
		attackWithCard,
		endTurn,
		performHeroPower,
		toggleMulliganCard,
		confirmMulligan,
		skipMulligan,
		selectDiscoveryOption,
	]);
}
