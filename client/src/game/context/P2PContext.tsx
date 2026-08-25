import React, { useRef, ReactNode } from 'react';
import { dispatchGameCommand } from '../actions/gameCommandDispatcher';
import type { GameCommand, HeroPowerTargetType } from '../core/commands';
import { useWireSync } from '../match/modes/p2p/wireSync/useWireSync';
import { useGameStore } from '../stores/gameStore';
import { P2PContext, type P2PActions } from './p2pContextValue';

export const P2PProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const p2pSync = useWireSync();
	const gsPlayCard = useGameStore(s => s.playCard);
	const gsAttackWithCard = useGameStore(s => s.attackWithCard);
	const gsEndTurn = useGameStore(s => s.endTurn);
	const gsPerformHeroPower = useGameStore(s => s.performHeroPower);
	const gsToggleMulliganCard = useGameStore(s => s.toggleMulliganCard);
	const gsConfirmMulligan = useGameStore(s => s.confirmMulligan);
	const gsSkipMulligan = useGameStore(s => s.skipMulligan);
	const gameState = useGameStore(s => s.gameState);

	// Single ref object — mutated in place so the context value never changes identity
	const ref = useRef<P2PActions>({
		playCard: gsPlayCard,
		attackWithCard: gsAttackWithCard,
		endTurn: gsEndTurn,
		performHeroPower: gsPerformHeroPower,
		dispatchGameCommand: () => undefined,
		sendPokerAction: () => undefined,
		sendPokerTurnStarted: () => undefined,
		requestPhaseCheckpoint: async () => ({ status: 'unavailable', reason: 'not_connected' }),
		downloadSessionLog: () => undefined,
		gameState: null,
		isConnected: false,
		isHost: false,
	});

	const activePlayCard = p2pSync.isConnected ? p2pSync.playCard : gsPlayCard;
	const activeAttackWithCard = p2pSync.isConnected
		? (attackerId: string, defenderId?: string) => p2pSync.attackWithCard(attackerId, defenderId ?? 'opponent-hero')
		: gsAttackWithCard;
	const activeEndTurn = p2pSync.isConnected ? p2pSync.endTurn : gsEndTurn;
	const activePerformHeroPower = p2pSync.isConnected
		? (targetId?: string, _targetType?: HeroPowerTargetType) => p2pSync.performHeroPower(targetId)
		: gsPerformHeroPower;
	const activeToggleMulliganCard = p2pSync.isConnected ? p2pSync.toggleMulliganCard : gsToggleMulliganCard;
	const activeConfirmMulligan = p2pSync.isConnected ? p2pSync.confirmMulligan : gsConfirmMulligan;
	const activeSkipMulligan = p2pSync.isConnected ? p2pSync.skipMulligan : gsSkipMulligan;

	// Mutate ref fields — zero allocations, zero new object identity
	ref.current.playCard = activePlayCard;
	ref.current.attackWithCard = activeAttackWithCard;
	ref.current.endTurn = activeEndTurn;
	ref.current.performHeroPower = (targetId?: string) => activePerformHeroPower(targetId);
	ref.current.dispatchGameCommand = (command: GameCommand) => {
		dispatchGameCommand(command, {
			playCard: activePlayCard,
			attackWithCard: activeAttackWithCard,
			endTurn: activeEndTurn,
			performHeroPower: activePerformHeroPower,
			toggleMulliganCard: activeToggleMulliganCard,
			confirmMulligan: activeConfirmMulligan,
			skipMulligan: activeSkipMulligan,
			selectDiscoveryOption: useGameStore.getState().selectDiscoveryOption,
		});
	};
	ref.current.sendPokerAction = p2pSync.sendPokerAction;
	ref.current.sendPokerTurnStarted = p2pSync.sendPokerTurnStarted;
	ref.current.requestPhaseCheckpoint = p2pSync.requestPhaseCheckpoint;
	ref.current.downloadSessionLog = p2pSync.downloadSessionLog;
	ref.current.gameState = gameState;
	ref.current.isConnected = p2pSync.isConnected;
	ref.current.isHost = p2pSync.isHost;

	return <P2PContext.Provider value={ref.current}>{children}</P2PContext.Provider>;
};
