import React, { useRef, ReactNode } from 'react';
import { dispatchGameCommand } from '../actions/gameCommandDispatcher';
import type { GameCommand, HeroPowerTargetType } from '../core/commands';
import { useWireSync } from '../match/modes/p2p/wireSync/useWireSync';
import { useMatchStore } from '../match/store';
import { useGameStore } from '../stores/gameStore';
import { P2PContext, type P2PActions } from './p2pContextValue';

export const P2PProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const p2pSync = useWireSync();
	const gsPlayCard = useGameStore(s => s.playCard);
	const gsAttackWithCard = useGameStore(s => s.attackWithCard);
	const gsEndTurn = useGameStore(s => s.endTurn);
	const gsPerformHeroPower = useGameStore(s => s.performHeroPower);
	const gsFrontlineAttack = useGameStore(s => s.frontlineAttack);
	const gsPerformNorseHeroPower = useGameStore(s => s.performNorseHeroPower);
	const gsWeaponUpgrade = useGameStore(s => s.weaponUpgrade);
	const gsToggleMulliganCard = useGameStore(s => s.toggleMulliganCard);
	const gsConfirmMulligan = useGameStore(s => s.confirmMulligan);
	const gsSkipMulligan = useGameStore(s => s.skipMulligan);
	const gsSelectDiscoveryOption = useGameStore(s => s.selectDiscoveryOption);
	const gsGrantPokerHandRewards = useGameStore(s => s.grantPokerHandRewards);
	const gameState = useGameStore(s => s.gameState);
	const isP2PMatch = useMatchStore(s => s.activeMatch?.opponent.kind === 'peer');

	// Single ref object — mutated in place so the context value never changes identity
	const ref = useRef<P2PActions>({
		playCard: gsPlayCard,
		attackWithCard: gsAttackWithCard,
		endTurn: gsEndTurn,
		performHeroPower: gsPerformHeroPower,
		frontlineAttack: gsFrontlineAttack,
		performNorseHeroPower: gsPerformNorseHeroPower,
		weaponUpgrade: gsWeaponUpgrade,
		selectDiscoveryOption: () => undefined,
		grantPokerHandRewards: () => undefined,
		dispatchGameCommand: () => undefined,
		sendPokerAction: async () => false,
		sendPokerTurnStarted: () => false,
		requestPhaseCheckpoint: async () => ({ status: 'unavailable', reason: 'not_connected' }),
		downloadSessionLog: () => undefined,
		gameState: null,
		isConnected: false,
		isHost: false,
	});

	// Keep the P2P wrappers active for the whole match lifetime, including a
	// reconnect/grace window. Falling back to raw Zustand actions while the
	// socket is down would mutate cards locally without a signed envelope and
	// make the two browsers irreconcilable after a VPN/IP change.
	const useP2PHandlers = isP2PMatch;
	const activePlayCard = useP2PHandlers
		? p2pSync.playCard
		: (cardId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number, payWithBlood?: boolean, onCommitted?: () => void) => {
			gsPlayCard(cardId, targetId, targetType, insertionIndex, payWithBlood);
			onCommitted?.();
		};
	const activeAttackWithCard = useP2PHandlers
		? (attackerId: string, defenderId?: string, onCommitted?: () => void) => p2pSync.attackWithCard(attackerId, defenderId ?? 'opponent-hero', onCommitted)
		: (attackerId: string, defenderId?: string, onCommitted?: () => void) => {
			gsAttackWithCard(attackerId, defenderId);
			onCommitted?.();
		};
	const activeEndTurn = useP2PHandlers
		? p2pSync.endTurn
		: (onCommitted?: () => void) => {
			gsEndTurn();
			onCommitted?.();
		};
	const activePerformHeroPower = useP2PHandlers
		? (targetId?: string, targetType?: HeroPowerTargetType, onCommitted?: () => void) => p2pSync.performHeroPower(targetId, targetType, onCommitted)
		: (targetId?: string, targetType?: HeroPowerTargetType, onCommitted?: () => void) => {
			gsPerformHeroPower(targetId, targetType);
			onCommitted?.();
		};
	const activeFrontlineAttack = useP2PHandlers
		? (mode: 'minion' | 'hero', actionId?: string, onCommitted?: () => void) => p2pSync.frontlineAttack(mode, actionId, onCommitted)
		: (mode: 'minion' | 'hero', actionId?: string, onCommitted?: () => void) => {
			gsFrontlineAttack(mode, actionId);
			onCommitted?.();
		};
	const activePerformNorseHeroPower = useP2PHandlers
		? (norseHeroId: string, targetId?: string, targetType?: 'minion' | 'hero', actionId?: string, onCommitted?: () => void) => p2pSync.performNorseHeroPower(norseHeroId, targetId, targetType, actionId, onCommitted)
		: (norseHeroId: string, targetId?: string, targetType?: 'minion' | 'hero', actionId?: string, onCommitted?: () => void) => {
			gsPerformNorseHeroPower(norseHeroId, targetId, targetType, actionId);
			onCommitted?.();
		};
	const activeWeaponUpgrade = useP2PHandlers
		? (norseHeroId: string, actionId?: string, onCommitted?: () => void) => p2pSync.weaponUpgrade(norseHeroId, actionId, onCommitted)
		: (norseHeroId: string, actionId?: string, onCommitted?: () => void) => {
			gsWeaponUpgrade(norseHeroId, actionId);
			onCommitted?.();
		};
	const activeToggleMulliganCard = useP2PHandlers
		? p2pSync.toggleMulliganCard
		: (cardId: string, onCommitted?: () => void) => {
			gsToggleMulliganCard(cardId);
			onCommitted?.();
		};
	const activeConfirmMulligan = useP2PHandlers
		? p2pSync.confirmMulligan
		: (onCommitted?: () => void) => {
			gsConfirmMulligan();
			onCommitted?.();
		};
	const activeSkipMulligan = useP2PHandlers
		? p2pSync.skipMulligan
		: (onCommitted?: () => void) => {
			gsSkipMulligan();
			onCommitted?.();
		};
	const activeSelectDiscoveryOption = useP2PHandlers
		? p2pSync.selectDiscoveryOption
		: (card: Parameters<typeof gsSelectDiscoveryOption>[0], onCommitted?: () => void) => {
			const result = gsSelectDiscoveryOption(card);
			if (result.status === 'applied') onCommitted?.();
		};
	const activeGrantPokerHandRewards = useP2PHandlers
		? p2pSync.grantPokerHandRewards
		: (command: Parameters<typeof gsGrantPokerHandRewards>[0], onCommitted?: () => void) => {
			const result = gsGrantPokerHandRewards(command);
			if (result.status === 'applied') onCommitted?.();
		};

	// Mutate ref fields — zero allocations, zero new object identity
	ref.current.playCard = activePlayCard;
	ref.current.attackWithCard = activeAttackWithCard;
	ref.current.endTurn = activeEndTurn;
	ref.current.performHeroPower = (targetId?: string, targetType?: HeroPowerTargetType, onCommitted?: () => void) => activePerformHeroPower(targetId, targetType, onCommitted);
	ref.current.frontlineAttack = activeFrontlineAttack;
	ref.current.performNorseHeroPower = activePerformNorseHeroPower;
	ref.current.weaponUpgrade = activeWeaponUpgrade;
	ref.current.selectDiscoveryOption = activeSelectDiscoveryOption;
	ref.current.grantPokerHandRewards = activeGrantPokerHandRewards;
	ref.current.dispatchGameCommand = (command: GameCommand, onCommitted?: () => void) => {
		dispatchGameCommand(command, {
			playCard: activePlayCard,
			attackWithCard: activeAttackWithCard,
			endTurn: activeEndTurn,
			performHeroPower: activePerformHeroPower,
			frontlineAttack: activeFrontlineAttack,
			performNorseHeroPower: activePerformNorseHeroPower,
			weaponUpgrade: activeWeaponUpgrade,
			toggleMulliganCard: activeToggleMulliganCard,
			confirmMulligan: activeConfirmMulligan,
			skipMulligan: activeSkipMulligan,
			selectDiscoveryOption: activeSelectDiscoveryOption,
			grantPokerHandRewards: activeGrantPokerHandRewards,
		}, onCommitted);
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
