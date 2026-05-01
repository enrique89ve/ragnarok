import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { dispatchGameCommand } from '../actions/gameCommandDispatcher';
import type { GameCommand, HeroPowerTargetType } from '../core/commands';
import { useP2PSync } from '../hooks/useP2PSync';
import { useGameStore } from '../stores/gameStore';
import { GameState } from '../types';

interface P2PActions {
	playCard: (cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number) => void;
	attackWithCard: (attackerId: string, defenderId?: string) => void;
	endTurn: () => void;
	performHeroPower: (targetId?: string) => void;
	dispatchGameCommand: (command: GameCommand) => void;
	gameState: GameState | null;
	isConnected: boolean;
	isHost: boolean;
}

const P2PContext = createContext<P2PActions | null>(null);

export const P2PProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const p2pSync = useP2PSync();
	const gsPlayCard = useGameStore(s => s.playCard);
	const gsAttackWithCard = useGameStore(s => s.attackWithCard);
	const gsEndTurn = useGameStore(s => s.endTurn);
	const gsPerformHeroPower = useGameStore(s => s.performHeroPower);
	const gameState = useGameStore(s => s.gameState);

	// Single ref object — mutated in place so the context value never changes identity
	const ref = useRef<P2PActions>({
		playCard: gsPlayCard,
		attackWithCard: gsAttackWithCard,
		endTurn: gsEndTurn,
		performHeroPower: gsPerformHeroPower,
		dispatchGameCommand: () => undefined,
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
			toggleMulliganCard: useGameStore.getState().toggleMulliganCard,
			confirmMulligan: useGameStore.getState().confirmMulligan,
			skipMulligan: useGameStore.getState().skipMulligan,
			selectDiscoveryOption: useGameStore.getState().selectDiscoveryOption,
		});
	};
	ref.current.gameState = gameState;
	ref.current.isConnected = p2pSync.isConnected;
	ref.current.isHost = p2pSync.isHost;

	return <P2PContext.Provider value={ref.current}>{children}</P2PContext.Provider>;
};

export const useP2PActions = () => {
	const context = useContext(P2PContext);
	const gsPlayCard = useGameStore(s => s.playCard);
	const gsAttackWithCard = useGameStore(s => s.attackWithCard);
	const gsEndTurn = useGameStore(s => s.endTurn);
	const gsPerformHeroPower = useGameStore(s => s.performHeroPower);
	const gsGameState = useGameStore(s => s.gameState);
	if (!context) {
		return {
			playCard: gsPlayCard,
			attackWithCard: gsAttackWithCard,
			endTurn: gsEndTurn,
			performHeroPower: gsPerformHeroPower,
			dispatchGameCommand: (command: GameCommand) => {
				dispatchGameCommand(command, {
					playCard: gsPlayCard,
					attackWithCard: gsAttackWithCard,
					endTurn: gsEndTurn,
					performHeroPower: gsPerformHeroPower,
					toggleMulliganCard: useGameStore.getState().toggleMulliganCard,
					confirmMulligan: useGameStore.getState().confirmMulligan,
					skipMulligan: useGameStore.getState().skipMulligan,
					selectDiscoveryOption: useGameStore.getState().selectDiscoveryOption,
				});
			},
			gameState: gsGameState,
			isConnected: false,
			isHost: false,
		};
	}
	return context;
};
