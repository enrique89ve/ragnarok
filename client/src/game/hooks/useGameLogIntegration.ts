import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useGameLogStore, type GameLogEntry } from '../stores/gameLogStore';
import { useMatchStore } from '../match/store';
import { usePeerStore, type P2PConnectionState } from '../stores/peerStore';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { usePokerCombatAdapter } from './usePokerCombatAdapter';
import { CombatPhase } from '../types/PokerCombatTypes';
import { recordCombatFeedback } from '../combat/feedback/combatFeedbackStore';
import {
	logsFromPokerResourceDiff,
	manaLogEntry,
	routeCombatLogEntry,
	shouldForwardCombatLog,
	type PokerResourceSnapshot,
} from '../combat/feedback/combatFeedback';

const POKER_PHASE_LABELS: Partial<Record<CombatPhase, string>> = {
	[CombatPhase.PRE_FLOP]: 'First Blood',
	[CombatPhase.FAITH]: 'Faith',
	[CombatPhase.FORESIGHT]: 'Foresight',
	[CombatPhase.DESTINY]: 'Destiny',
	[CombatPhase.RESOLUTION]: 'Showdown',
};

function formatPokerPhase(phase: CombatPhase | string | undefined): string {
	if (!phase) return 'Poker';
	if (phase in POKER_PHASE_LABELS) return POKER_PHASE_LABELS[phase as CombatPhase] ?? String(phase);
	return String(phase).replace(/_/g, ' ');
}

function getP2PStatusMessage(state: P2PConnectionState): string {
	if (state === 'connected') return 'P2P connection recovered - poker input resumed';
	if (state === 'grace_period') return 'P2P grace period started - poker input paused';
	if (state === 'reconnecting') return 'P2P reconnecting - poker input paused';
	if (state === 'error') return 'P2P connection error - poker input paused';
	return 'P2P connection interrupted - poker input paused';
}

type AddGameLogEntry = (entry: Omit<GameLogEntry, 'id' | 'timestamp'>) => void;

interface LoggedBattlefieldCard {
	readonly card?: {
		readonly name?: string;
	};
}

interface LoggedPlayerState {
	readonly hand?: readonly unknown[];
	readonly battlefield?: readonly LoggedBattlefieldCard[];
	readonly heroHealth?: number;
	readonly health?: number;
	readonly currentMana?: number;
	readonly mana?: {
		readonly current?: number;
	};
}

function getHeroHealth(player: LoggedPlayerState): number {
	return player.heroHealth ?? player.health ?? 100;
}

function getMana(player: LoggedPlayerState): number {
	return player.mana?.current ?? player.currentMana ?? 0;
}

function logTurnShift(input: {
	readonly turn: number;
	readonly previousTurn: number;
	readonly currentTurn: string | undefined;
	readonly addEntry: AddGameLogEntry;
}): void {
	if (input.turn <= input.previousTurn || input.previousTurn <= 0) return;
	const actor = input.currentTurn === 'player' ? 'player' : 'opponent';
	input.addEntry({
		turn: input.turn,
		actor,
		type: 'end_turn',
		message: `${actor === 'player' ? 'Your' : "Opponent's"} turn begins`,
	});
}

function logDraws(input: {
	readonly turn: number;
	readonly playerHand: number;
	readonly opponentHand: number;
	readonly previousPlayerHand: number;
	readonly previousOpponentHand: number;
	readonly addEntry: AddGameLogEntry;
}): void {
	if (input.playerHand > input.previousPlayerHand && input.previousPlayerHand > 0) {
		input.addEntry({ turn: input.turn, actor: 'player', type: 'draw', message: 'You drew a card' });
	}
	if (input.opponentHand > input.previousOpponentHand && input.previousOpponentHand > 0) {
		input.addEntry({ turn: input.turn, actor: 'opponent', type: 'draw', message: 'Opponent drew a card' });
	}
}

function logPlayedCards(input: {
	readonly turn: number;
	readonly player: LoggedPlayerState;
	readonly opponent: LoggedPlayerState;
	readonly playerBattlefield: number;
	readonly opponentBattlefield: number;
	readonly playerHand: number;
	readonly opponentHand: number;
	readonly previousPlayerBattlefield: number;
	readonly previousOpponentBattlefield: number;
	readonly previousPlayerHand: number;
	readonly previousOpponentHand: number;
	readonly addEntry: AddGameLogEntry;
}): void {
	if (input.playerBattlefield > input.previousPlayerBattlefield && input.playerHand < input.previousPlayerHand) {
		const name = input.player.battlefield?.[input.player.battlefield.length - 1]?.card?.name || 'a card';
		input.addEntry({ turn: input.turn, actor: 'player', type: 'play_card', message: `You played ${name}`, details: { cardName: name } });
	}
	if (input.opponentBattlefield > input.previousOpponentBattlefield && input.opponentHand < input.previousOpponentHand) {
		const name = input.opponent.battlefield?.[input.opponent.battlefield.length - 1]?.card?.name || 'a card';
		input.addEntry({ turn: input.turn, actor: 'opponent', type: 'play_card', message: `Opponent played ${name}`, details: { cardName: name } });
	}
}

function logHeroHealthChanges(input: {
	readonly turn: number;
	readonly playerHealth: number;
	readonly opponentHealth: number;
	readonly previousPlayerHealth: number;
	readonly previousOpponentHealth: number;
	readonly addEntry: AddGameLogEntry;
}): void {
	if (input.playerHealth < input.previousPlayerHealth && input.previousPlayerHealth > 0) {
		const amount = input.previousPlayerHealth - input.playerHealth;
		input.addEntry({ turn: input.turn, actor: 'opponent', type: 'damage', message: `Your hero took ${amount} damage`, details: { amount } });
	}
	if (input.opponentHealth < input.previousOpponentHealth && input.previousOpponentHealth > 0) {
		const amount = input.previousOpponentHealth - input.opponentHealth;
		input.addEntry({ turn: input.turn, actor: 'player', type: 'damage', message: `Enemy hero took ${amount} damage`, details: { amount } });
	}
	if (input.playerHealth > input.previousPlayerHealth) {
		const amount = input.playerHealth - input.previousPlayerHealth;
		input.addEntry({ turn: input.turn, actor: 'player', type: 'heal', message: `Your hero healed for ${amount}`, details: { amount } });
	}
	if (input.opponentHealth > input.previousOpponentHealth) {
		const amount = input.opponentHealth - input.previousOpponentHealth;
		input.addEntry({ turn: input.turn, actor: 'opponent', type: 'heal', message: `Enemy hero healed for ${amount}`, details: { amount } });
	}
}

function logManaChanges(input: {
	readonly turn: number;
	readonly playerMana: number;
	readonly opponentMana: number;
	readonly previousPlayerMana: number;
	readonly previousOpponentMana: number;
	readonly addEntry: AddGameLogEntry;
}): void {
	if (input.previousPlayerMana > 0) {
		const entry = manaLogEntry('player', input.playerMana - input.previousPlayerMana, input.turn);
		if (entry) input.addEntry(entry);
	}
	if (input.previousOpponentMana > 0) {
		const entry = manaLogEntry('opponent', input.opponentMana - input.previousOpponentMana, input.turn);
		if (entry) input.addEntry(entry);
	}
}

function syncCardLayerLogs(input: {
	readonly turn: number;
	readonly currentTurn: string | undefined;
	readonly player: LoggedPlayerState;
	readonly opponent: LoggedPlayerState;
	readonly pokerIsActive: boolean;
	readonly previous: {
		turn: number;
		playerHand: number;
		opponentHand: number;
		playerBf: number;
		opponentBf: number;
		playerHealth: number;
		opponentHealth: number;
		playerMana: number;
		opponentMana: number;
	};
	readonly addEntry: AddGameLogEntry;
}): {
	readonly playerHand: number;
	readonly opponentHand: number;
	readonly playerBf: number;
	readonly opponentBf: number;
	readonly playerHealth: number;
	readonly opponentHealth: number;
	readonly playerMana: number;
	readonly opponentMana: number;
} {
	const playerHand = input.player.hand?.length || 0;
	const opponentHand = input.opponent.hand?.length || 0;
	const playerBf = input.player.battlefield?.length || 0;
	const opponentBf = input.opponent.battlefield?.length || 0;
	const playerHealth = getHeroHealth(input.player);
	const opponentHealth = getHeroHealth(input.opponent);
	const playerMana = getMana(input.player);
	const opponentMana = getMana(input.opponent);
	logTurnShift({
		turn: input.turn,
		previousTurn: input.previous.turn,
		currentTurn: input.currentTurn,
		addEntry: input.addEntry,
	});
	logDraws({
		turn: input.turn,
		playerHand,
		opponentHand,
		previousPlayerHand: input.previous.playerHand,
		previousOpponentHand: input.previous.opponentHand,
		addEntry: input.addEntry,
	});
	logPlayedCards({
		turn: input.turn,
		player: input.player,
		opponent: input.opponent,
		playerBattlefield: playerBf,
		opponentBattlefield: opponentBf,
		playerHand,
		opponentHand,
		previousPlayerBattlefield: input.previous.playerBf,
		previousOpponentBattlefield: input.previous.opponentBf,
		previousPlayerHand: input.previous.playerHand,
		previousOpponentHand: input.previous.opponentHand,
		addEntry: input.addEntry,
	});
	if (!input.pokerIsActive) {
		logHeroHealthChanges({
			turn: input.turn,
			playerHealth,
			opponentHealth,
			previousPlayerHealth: input.previous.playerHealth,
			previousOpponentHealth: input.previous.opponentHealth,
			addEntry: input.addEntry,
		});
	}
	logManaChanges({
		turn: input.turn,
		playerMana,
		opponentMana,
		previousPlayerMana: input.previous.playerMana,
		previousOpponentMana: input.previous.opponentMana,
		addEntry: input.addEntry,
	});
	logMinionDeaths({
		turn: input.turn,
		playerBattlefield: playerBf,
		opponentBattlefield: opponentBf,
		previousPlayerBattlefield: input.previous.playerBf,
		previousOpponentBattlefield: input.previous.opponentBf,
		addEntry: input.addEntry,
	});
	return {
		playerHand,
		opponentHand,
		playerBf,
		opponentBf,
		playerHealth,
		opponentHealth,
		playerMana,
		opponentMana,
	};
}

function logMinionDeaths(input: {
	readonly turn: number;
	readonly playerBattlefield: number;
	readonly opponentBattlefield: number;
	readonly previousPlayerBattlefield: number;
	readonly previousOpponentBattlefield: number;
	readonly addEntry: AddGameLogEntry;
}): void {
	if (input.playerBattlefield < input.previousPlayerBattlefield && input.previousPlayerBattlefield > 0) {
		const lost = input.previousPlayerBattlefield - input.playerBattlefield;
		input.addEntry({ turn: input.turn, actor: 'player', type: 'death', message: `${lost} of your minion${lost > 1 ? 's' : ''} died` });
	}
	if (input.opponentBattlefield < input.previousOpponentBattlefield && input.previousOpponentBattlefield > 0) {
		const lost = input.previousOpponentBattlefield - input.opponentBattlefield;
		input.addEntry({ turn: input.turn, actor: 'opponent', type: 'death', message: `${lost} enemy minion${lost > 1 ? 's' : ''} died` });
	}
}

export function useGameLogIntegration() {
	const gameState = useGameStore(state => state.gameState);
	const activeMatch = useMatchStore(state => state.activeMatch);
	const connectionState = usePeerStore(state => state.connectionState);
	const combatLog = useUnifiedCombatStore(state => state.combatLog);
	const { combatState } = usePokerCombatAdapter();
	const addEntry = useGameLogStore(state => state.addEntry);
	const clearLog = useGameLogStore(state => state.clearLog);
	const isP2PMatch = activeMatch?.opponent.kind === 'peer';

	const prevTurnRef = useRef(0);
	const prevPlayerHandRef = useRef(0);
	const prevOpponentHandRef = useRef(0);
	const prevPlayerBfRef = useRef(0);
	const prevOpponentBfRef = useRef(0);
	const prevPlayerHealthRef = useRef(100);
	const prevOpponentHealthRef = useRef(100);
	const prevPlayerManaRef = useRef(0);
	const prevOpponentManaRef = useRef(0);
	const prevPokerResourcesRef = useRef<PokerResourceSnapshot | null>(null);
	const prevPokerTurnIdRef = useRef<string | null>(null);
	const prevConnectionStateRef = useRef<P2PConnectionState>(connectionState);
	const forwardedCombatLogIdsRef = useRef<Set<string>>(new Set());
	const pokerIsActive = Boolean(combatState);
	const pokerTurnId = combatState?.turnId ?? null;
	const pokerActivePlayerId = combatState?.activePlayerId ?? null;
	const pokerPlayerId = combatState?.player.playerId ?? null;
	const pokerPhase = combatState?.phase;

	useEffect(() => {
		if (!gameState) return;
		const player: LoggedPlayerState | undefined = gameState.players?.player;
		const opponent: LoggedPlayerState | undefined = gameState.players?.opponent;
		if (!player || !opponent) return;
		const turn = gameState.turnNumber || 0;
		const next = syncCardLayerLogs({
			turn,
			currentTurn: gameState.currentTurn,
			player,
			opponent,
			pokerIsActive,
			previous: {
				turn: prevTurnRef.current,
				playerHand: prevPlayerHandRef.current,
				opponentHand: prevOpponentHandRef.current,
				playerBf: prevPlayerBfRef.current,
				opponentBf: prevOpponentBfRef.current,
				playerHealth: prevPlayerHealthRef.current,
				opponentHealth: prevOpponentHealthRef.current,
				playerMana: prevPlayerManaRef.current,
				opponentMana: prevOpponentManaRef.current,
			},
			addEntry,
		});
		prevTurnRef.current = turn;
		prevPlayerHandRef.current = next.playerHand;
		prevOpponentHandRef.current = next.opponentHand;
		prevPlayerBfRef.current = next.playerBf;
		prevOpponentBfRef.current = next.opponentBf;
		prevPlayerHealthRef.current = next.playerHealth;
		prevOpponentHealthRef.current = next.opponentHealth;
		prevPlayerManaRef.current = next.playerMana;
		prevOpponentManaRef.current = next.opponentMana;
	}, [gameState, addEntry, pokerIsActive]);

	useEffect(() => {
		if (gameState?.gamePhase === 'playing' && prevTurnRef.current === 0) {
			clearLog();
		}
	}, [gameState?.gamePhase, clearLog]);

	useEffect(() => {
		if (!isP2PMatch || !pokerPlayerId) {
			prevPokerTurnIdRef.current = null;
			return;
		}
		if (!pokerTurnId || !pokerActivePlayerId) return;
		if (prevPokerTurnIdRef.current === pokerTurnId) return;

		prevPokerTurnIdRef.current = pokerTurnId;
		const isLocalDecision = pokerActivePlayerId === pokerPlayerId;
		const phaseLabel = formatPokerPhase(pokerPhase);
		addEntry({
			turn: gameState?.turnNumber ?? 0,
			actor: isLocalDecision ? 'player' : 'opponent',
			type: 'poker_turn',
			message: isLocalDecision
				? 'Your poker decision window opened'
				: 'Opponent poker decision window opened',
			details: {
				phaseLabel,
				turnId: pokerTurnId,
			},
		});
	}, [
		addEntry,
		gameState?.turnNumber,
		isP2PMatch,
		pokerActivePlayerId,
		pokerPhase,
		pokerPlayerId,
		pokerTurnId,
	]);

	useEffect(() => {
		if (!isP2PMatch) {
			prevConnectionStateRef.current = connectionState;
			return;
		}
		if (prevConnectionStateRef.current === connectionState) return;

		prevConnectionStateRef.current = connectionState;
		addEntry({
			turn: gameState?.turnNumber ?? 0,
			actor: 'system',
			type: 'p2p_status',
			message: getP2PStatusMessage(connectionState),
			details: {
				statusLabel: connectionState.replace(/_/g, ' '),
			},
		});
	}, [addEntry, connectionState, gameState?.turnNumber, isP2PMatch]);

	useEffect(() => {
		if (!combatState) {
			prevPokerResourcesRef.current = null;
			return;
		}
		const next: PokerResourceSnapshot = {
			playerHpCommitted: combatState.player.hpCommitted,
			opponentHpCommitted: combatState.opponent.hpCommitted,
			playerStamina: combatState.player.pet.stats.currentStamina,
			opponentStamina: combatState.opponent.pet.stats.currentStamina,
			playerAction: combatState.player.currentAction ?? null,
			opponentAction: combatState.opponent.currentAction ?? null,
		};
		const previous = prevPokerResourcesRef.current;
		prevPokerResourcesRef.current = next;
		if (!previous) return;
		const turn = gameState?.turnNumber ?? 0;
		const phaseLabel = formatPokerPhase(pokerPhase);
		for (const log of logsFromPokerResourceDiff(previous, next, turn, phaseLabel)) {
			addEntry(log);
		}
	}, [addEntry, combatState, gameState?.turnNumber, pokerPhase]);

	useEffect(() => {
		if (combatLog.length === 0) {
			forwardedCombatLogIdsRef.current.clear();
			return;
		}

		const turn = gameState?.turnNumber ?? 0;
		const phaseLabel = formatPokerPhase(pokerPhase);
		for (const entry of combatLog) {
			if (forwardedCombatLogIdsRef.current.has(entry.id)) continue;
			forwardedCombatLogIdsRef.current.add(entry.id);
			if (!shouldForwardCombatLog(entry)) continue;

			const routed = routeCombatLogEntry(entry, turn, phaseLabel);
			if (routed.presentation.kind === 'toast') {
				recordCombatFeedback({
					log: routed.log,
					overlay: {
						lane: routed.presentation.lane,
						title: routed.presentation.title,
						tone: routed.presentation.tone,
					},
				});
				continue;
			}
			addEntry(routed.log);
		}
	}, [addEntry, combatLog, gameState?.turnNumber, pokerPhase]);
}
