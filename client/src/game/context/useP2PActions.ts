import { useContext } from 'react';
import { dispatchGameCommand } from '../actions/gameCommandDispatcher';
import type { GameCommand } from '../core/commands';
import { useGameStore } from '../stores/gameStore';
import { useMatchStore } from '../match/store';
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
	const gsSelectDiscoveryOption = useGameStore(s => s.selectDiscoveryOption);
	const gsGameState = useGameStore(s => s.gameState);
	const isP2PMatch = useMatchStore(s => s.activeMatch?.opponent.kind === 'peer');

	if (context) return context;

	// A missing provider must not turn a live P2P match into a local-only game.
	// This fallback is used by isolated routes/tests; fail closed if the match
	// store still identifies a peer opponent.
	if (isP2PMatch) {
		return {
			playCard: () => undefined,
			attackWithCard: () => undefined,
			endTurn: () => undefined,
			performHeroPower: () => undefined,
			frontlineAttack: () => undefined,
			performNorseHeroPower: () => undefined,
			weaponUpgrade: () => undefined,
			selectDiscoveryOption: () => undefined,
			dispatchGameCommand: () => undefined,
			sendPokerAction: async () => false,
			sendPokerTurnStarted: () => false,
			requestPhaseCheckpoint: async () => ({ status: 'unavailable', reason: 'not_connected' }),
			downloadSessionLog: () => undefined,
			gameState: gsGameState,
			isConnected: false,
			isHost: false,
		};
	}

	return {
		playCard: gsPlayCard,
		attackWithCard: gsAttackWithCard,
		endTurn: gsEndTurn,
		performHeroPower: gsPerformHeroPower,
		frontlineAttack: gsFrontlineAttack,
		performNorseHeroPower: gsPerformNorseHeroPower,
		weaponUpgrade: gsWeaponUpgrade,
		selectDiscoveryOption: (card, onCommitted) => {
			const result = gsSelectDiscoveryOption(card);
			if (result.status === 'applied') onCommitted?.();
		},
		dispatchGameCommand: (command: GameCommand, onCommitted?: () => void) => {
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
			onCommitted?.();
		},
		sendPokerAction: async () => false,
		sendPokerTurnStarted: () => false,
		requestPhaseCheckpoint: async () => ({ status: 'unavailable', reason: 'not_connected' }),
		downloadSessionLog: () => undefined,
		gameState: gsGameState,
		isConnected: false,
		isHost: false,
	};
}
