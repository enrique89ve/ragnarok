import { useContext } from 'react';
import { dispatchGameCommand } from '../actions/gameCommandDispatcher';
import type { GameCommand } from '../core/commands';
import { useGameStore } from '../stores/gameStore';
import { P2PContext, type P2PActions } from './p2pContextValue';

export function useP2PActions(): P2PActions {
	const context = useContext(P2PContext);
	const gsPlayCard = useGameStore(s => s.playCard);
	const gsAttackWithCard = useGameStore(s => s.attackWithCard);
	const gsEndTurn = useGameStore(s => s.endTurn);
	const gsPerformHeroPower = useGameStore(s => s.performHeroPower);
	const gsFrontlineAttack = useGameStore(s => s.frontlineAttack);
	const gsPerformNorseHeroPower = useGameStore(s => s.performNorseHeroPower);
	const gsWeaponUpgrade = useGameStore(s => s.weaponUpgrade);
	const gsGameState = useGameStore(s => s.gameState);

	if (context) return context;

	return {
		playCard: gsPlayCard,
		attackWithCard: gsAttackWithCard,
		endTurn: gsEndTurn,
		performHeroPower: gsPerformHeroPower,
		frontlineAttack: gsFrontlineAttack,
		performNorseHeroPower: gsPerformNorseHeroPower,
		weaponUpgrade: gsWeaponUpgrade,
		dispatchGameCommand: (command: GameCommand) => {
			dispatchGameCommand(command, {
				playCard: gsPlayCard,
				attackWithCard: gsAttackWithCard,
				endTurn: gsEndTurn,
				performHeroPower: gsPerformHeroPower,
				frontlineAttack: gsFrontlineAttack,
				performNorseHeroPower: gsPerformNorseHeroPower,
				weaponUpgrade: gsWeaponUpgrade,
				toggleMulliganCard: useGameStore.getState().toggleMulliganCard,
				confirmMulligan: useGameStore.getState().confirmMulligan,
				skipMulligan: useGameStore.getState().skipMulligan,
				selectDiscoveryOption: useGameStore.getState().selectDiscoveryOption,
			});
		},
		sendPokerAction: () => undefined,
		sendPokerTurnStarted: () => false,
		requestPhaseCheckpoint: async () => ({ status: 'unavailable', reason: 'not_connected' }),
		downloadSessionLog: () => undefined,
		gameState: gsGameState,
		isConnected: false,
		isHost: false,
	};
}
