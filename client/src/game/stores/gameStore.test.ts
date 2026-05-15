import { describe, it, expect, beforeEach, vi } from 'vitest';

// `gameStore` transitively imports `useGame` which touches `localStorage`
// at module-load time. The default vitest env is `node`, so we install a
// synchronous stub via `vi.hoisted` (runs before any `import`).
vi.hoisted(() => {
	const mem = new Map<string, string>();
	(globalThis as { localStorage?: unknown }).localStorage = {
		getItem: (key: string) => mem.get(key) ?? null,
		setItem: (key: string, value: string) => {
			mem.set(key, value);
		},
		removeItem: (key: string) => {
			mem.delete(key);
		},
		clear: () => {
			mem.clear();
		},
		key: () => null,
		length: 0,
	};
});

import { useGameStore, selectPlayerHand, EMPTY_HAND } from './gameStore';
import { initializeGame, processAITurn } from '../utils/gameUtils';
import type { CardData, CardInstance, GameState, HeroClass, Player } from '../types';

const createAiMinionCard = (overrides: Partial<CardData> = {}): CardData => ({
	id: 'free-minion',
	name: 'Free Minion',
	type: 'minion',
	manaCost: 0,
	attack: 1,
	health: 1,
	rarity: 'common',
	description: '',
	class: 'neutral',
	...overrides,
});

const createAiCardInstance = (overrides: Partial<CardInstance> = {}): CardInstance => {
	const card = createAiMinionCard();
	return {
		instanceId: 'free-minion-instance',
		card,
		currentAttack: card.attack,
		currentHealth: card.health,
		canAttack: false,
		isSummoningSick: true,
		isPlayed: false,
		attacksPerformed: 0,
		...overrides,
	};
};

const createAiPlayer = (
	id: 'player' | 'opponent',
	overrides: Partial<Player> = {},
): Player => ({
	id,
	name: id === 'player' ? 'Player' : 'Opponent',
	hand: [],
	battlefield: [],
	deck: [],
	graveyard: [],
	secrets: [],
	mana: { current: 0, max: 0, overloaded: 0, pendingOverload: 0 },
	health: 30,
	maxHealth: 30,
	heroHealth: 30,
	heroArmor: 0,
	armor: 0,
	heroClass: 'hunter' as HeroClass,
	heroPower: {
		name: 'Unavailable Power',
		description: '',
		cost: 99,
		used: false,
		class: 'hunter' as HeroClass,
	},
	cardsPlayedThisTurn: 0,
	attacksPerformedThisTurn: 0,
	...overrides,
});

const createOpponentTurnState = (opponentHand: CardInstance[]): GameState => ({
	players: {
		player: createAiPlayer('player'),
		opponent: createAiPlayer('opponent', { hand: opponentHand }),
	},
	currentTurn: 'opponent',
	turnNumber: 1,
	gamePhase: 'playing',
	winner: null,
	gameLog: [],
});

const createPlayerTurnSetupState = (opponentHand: CardInstance[]): GameState => ({
	...createOpponentTurnState(opponentHand),
	currentTurn: 'player',
});

describe('selectPlayerHand', () => {
	beforeEach(() => {
		useGameStore.setState({ gameState: initializeGame() });
	});

	// Regression: zustand subscribers re-render whenever a selector returns
	// a new reference, even if the underlying state did not change. Returning
	// a fresh `[]` literal each call drives an infinite render loop in
	// `useSyncExternalStore` (Maximum update depth exceeded). Both the empty
	// and ready branches of every array/object-returning selector must hand
	// back the same reference across calls when the state has not changed.
	// Same fix shape as `useWarbandStore.selectDeckCardIds` (commit f829952).
	it('returns referentially stable empty fallback across calls when gameState is missing', () => {
		useGameStore.setState({ gameState: undefined as unknown as GameState });
		const a = selectPlayerHand(useGameStore.getState());
		const b = selectPlayerHand(useGameStore.getState());
		expect(a).toBe(b);
		expect(a).toBe(EMPTY_HAND);
	});

	it('returns referentially stable hand reference across calls when gameState is ready', () => {
		const a = selectPlayerHand(useGameStore.getState());
		const b = selectPlayerHand(useGameStore.getState());
		expect(a).toBe(b);
	});

	it('returns the actual hand array (not the empty fallback) when gameState is ready', () => {
		const hand = selectPlayerHand(useGameStore.getState());
		expect(hand).not.toBe(EMPTY_HAND);
		expect(Array.isArray(hand)).toBe(true);
	});
});

describe('processAITurn', () => {
	it('plays zero-cost minions instead of ignoring an all-free mana combo', () => {
		const freeMinion = createAiCardInstance();
		const result = processAITurn(createOpponentTurnState([freeMinion]));

		expect(result.players.opponent.hand).toHaveLength(0);
		expect(result.players.opponent.battlefield).toHaveLength(1);
		expect(result.players.opponent.battlefield[0].instanceId).toBe(freeMinion.instanceId);
	});
});

describe('setupOpponentSpellPetCards', () => {
	it('plays opponent setup cards during the player-facing poker setup window', () => {
		const freeMinion = createAiCardInstance();
		useGameStore.setState({ gameState: createPlayerTurnSetupState([freeMinion]) });

		useGameStore.getState().setupOpponentSpellPetCards();

		const nextState = useGameStore.getState().gameState;
		expect(nextState.currentTurn).toBe('player');
		expect(nextState.players.opponent.hand).toHaveLength(0);
		expect(nextState.players.opponent.battlefield).toHaveLength(1);
		expect(nextState.players.opponent.battlefield[0].instanceId).toBe(freeMinion.instanceId);
	});
});
