import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useGameLogStore, type GameLogEntry } from '../stores/gameLogStore';
import { useMatchStore } from '../match/store';
import { usePeerStore, type P2PConnectionState } from '../stores/peerStore';
import { useUnifiedCombatStore, type CombatLogEntry } from '../stores/unifiedCombatStore';
import { usePokerCombatAdapter } from './usePokerCombatAdapter';
import { CombatPhase } from '../types/PokerCombatTypes';

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

function isPokerCombatLogEntry(entry: CombatLogEntry): boolean {
	if (entry.type === 'poker') return true;
	return entry.type === 'phase' && /poker/i.test(entry.message);
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
}

function getHeroHealth(player: LoggedPlayerState): number {
	return player.heroHealth ?? player.health ?? 100;
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
	const prevPokerTurnIdRef = useRef<string | null>(null);
	const prevConnectionStateRef = useRef<P2PConnectionState>(connectionState);
	const forwardedCombatLogIdsRef = useRef<Set<string>>(new Set());
	const pokerTurnId = combatState?.turnId ?? null;
	const pokerActivePlayerId = combatState?.activePlayerId ?? null;
	const pokerPlayerId = combatState?.player.playerId ?? null;
	const pokerPhase = combatState?.phase;

	useEffect(() => {
		if (!gameState) return;

		const turn = gameState.turnNumber || 0;
		const currentTurn = gameState.currentTurn;
		const player: LoggedPlayerState | undefined = gameState.players?.player;
		const opponent: LoggedPlayerState | undefined = gameState.players?.opponent;
		if (!player || !opponent) return;

		const playerHand = player.hand?.length || 0;
		const opponentHand = opponent.hand?.length || 0;
		const playerBf = player.battlefield?.length || 0;
		const opponentBf = opponent.battlefield?.length || 0;
		const playerHealth = getHeroHealth(player);
		const opponentHealth = getHeroHealth(opponent);

		logTurnShift({ turn, previousTurn: prevTurnRef.current, currentTurn, addEntry });
		logDraws({
			turn,
			playerHand,
			opponentHand,
			previousPlayerHand: prevPlayerHandRef.current,
			previousOpponentHand: prevOpponentHandRef.current,
			addEntry,
		});
		logPlayedCards({
			turn,
			player,
			opponent,
			playerBattlefield: playerBf,
			opponentBattlefield: opponentBf,
			playerHand,
			opponentHand,
			previousPlayerBattlefield: prevPlayerBfRef.current,
			previousOpponentBattlefield: prevOpponentBfRef.current,
			previousPlayerHand: prevPlayerHandRef.current,
			previousOpponentHand: prevOpponentHandRef.current,
			addEntry,
		});
		logHeroHealthChanges({
			turn,
			playerHealth,
			opponentHealth,
			previousPlayerHealth: prevPlayerHealthRef.current,
			previousOpponentHealth: prevOpponentHealthRef.current,
			addEntry,
		});
		logMinionDeaths({
			turn,
			playerBattlefield: playerBf,
			opponentBattlefield: opponentBf,
			previousPlayerBattlefield: prevPlayerBfRef.current,
			previousOpponentBattlefield: prevOpponentBfRef.current,
			addEntry,
		});

		prevTurnRef.current = turn;
		prevPlayerHandRef.current = playerHand;
		prevOpponentHandRef.current = opponentHand;
		prevPlayerBfRef.current = playerBf;
		prevOpponentBfRef.current = opponentBf;
		prevPlayerHealthRef.current = playerHealth;
		prevOpponentHealthRef.current = opponentHealth;
	}, [gameState, addEntry]);

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
		if (combatLog.length === 0) {
			forwardedCombatLogIdsRef.current.clear();
			return;
		}
		if (!isP2PMatch) return;

		for (const entry of combatLog) {
			if (forwardedCombatLogIdsRef.current.has(entry.id)) continue;
			forwardedCombatLogIdsRef.current.add(entry.id);
			if (!isPokerCombatLogEntry(entry)) continue;

			addEntry({
				turn: gameState?.turnNumber ?? 0,
				actor: 'system',
				type: 'poker_phase',
				message: entry.message,
				details: {
					phaseLabel: formatPokerPhase(pokerPhase),
				},
			});
		}
	}, [addEntry, combatLog, gameState?.turnNumber, isP2PMatch, pokerPhase]);
}
