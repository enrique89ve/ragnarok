import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { GAME_COMMAND_TYPES } from '../core/commands';
import { useMatchStore } from '../match/store';
import type { MatchContext } from '../match/types';
import { usePeerStore, type P2PConnectionState } from './peerStore';
import { initializeGame, processAITurn } from '../utils/gameUtils';
import type { CardData, CardInstance, GameState, HeroClass, Player } from '../types';
import {
	shouldBootstrapCampaignBoard,
	syncCampaignActiveRealm,
} from '../coordinator/hooks/useCampaignGameBootstrap';
import type { ArmySelection } from '../types/ChessTypes';

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

const peerMatchContext = (): MatchContext => ({
	matchId: 'peer-match',
	matchSeed: 'peer-seed',
	opponent: {
		kind: 'peer',
		peerId: 'remote-peer',
		myRole: 'first-mover',
		opponentUsername: null,
	},
	reward: { matchXp: { kind: 'none' }, rune: { kind: 'none' }, ranking: { kind: 'none' } },
});

const aiMatchContext = (): MatchContext => ({
	matchId: 'ai-match',
	matchSeed: 'ai-seed',
	opponent: { kind: 'ai', difficulty: 'normal', deckSource: 'default' },
	reward: { matchXp: { kind: 'none' }, rune: { kind: 'none' }, ranking: { kind: 'none' } },
});

describe('match authority at local opponent automation boundaries', () => {
	beforeEach(() => {
		useMatchStore.setState({ activeMatch: null });
		usePeerStore.setState({ connectionState: 'disconnected', connection: null, isHost: false });
	});

	afterEach(() => {
		vi.useRealTimers();
		useMatchStore.setState({ activeMatch: null });
		usePeerStore.setState({ connectionState: 'disconnected', connection: null, isHost: false });
	});

	it.each(['disconnected', 'reconnecting'] satisfies readonly P2PConnectionState[])(
		'does not set up opponent spell-pet cards for a peer match while %s',
		(connectionState) => {
			useMatchStore.setState({ activeMatch: peerMatchContext() });
			usePeerStore.setState({ connectionState, connection: null });
			useGameStore.setState({ gameState: createPlayerTurnSetupState([createAiCardInstance()]) });

			useGameStore.getState().setupOpponentSpellPetCards();

			const nextState = useGameStore.getState().gameState;
			expect(nextState.players.opponent.hand).toHaveLength(1);
			expect(nextState.players.opponent.battlefield).toHaveLength(0);
		},
	);

	it('keeps local AI behavior independent from a stale connected transport', () => {
		useMatchStore.setState({ activeMatch: aiMatchContext() });
		usePeerStore.setState({ connectionState: 'connected', connection: null });
		useGameStore.setState({ gameState: createPlayerTurnSetupState([createAiCardInstance()]) });

		useGameStore.getState().setupOpponentSpellPetCards();

		const nextState = useGameStore.getState().gameState;
		expect(nextState.players.opponent.hand).toHaveLength(0);
		expect(nextState.players.opponent.battlefield).toHaveLength(1);
	});

	it('never arms peer AI even if the match context clears before a timer could fire', () => {
		vi.useFakeTimers();
		useMatchStore.setState({ activeMatch: peerMatchContext() });
		usePeerStore.setState({ connectionState: 'disconnected', connection: null });
		useGameStore.setState({ gameState: createPlayerTurnSetupState([createAiCardInstance()]) });

		useGameStore.getState().endTurn();
		useMatchStore.getState().clearMatch();
		vi.advanceTimersByTime(4_000);

		const finalState = useGameStore.getState().gameState;
		expect(finalState.players.opponent.hand).toHaveLength(1);
		expect(finalState.players.opponent.battlefield).toHaveLength(0);
		expect(finalState.currentTurn).toBe('opponent');
	});

	it('still runs opponent AI for a local AI match', () => {
		vi.useFakeTimers();
		useMatchStore.setState({ activeMatch: aiMatchContext() });
		usePeerStore.setState({ connectionState: 'connected', connection: null });
		useGameStore.setState({ gameState: createPlayerTurnSetupState([createAiCardInstance()]) });

		useGameStore.getState().endTurn();
		vi.advanceTimersByTime(4_000);

		const finalState = useGameStore.getState().gameState;
		expect(finalState.players.opponent.hand).toHaveLength(0);
		expect(finalState.players.opponent.battlefield).toHaveLength(1);
		expect(finalState.currentTurn).toBe('player');
	});
});

describe('applyOpponentCommand status contract', () => {
	it('returns applied for a legal remote end turn', () => {
		useGameStore.setState({ gameState: createOpponentTurnState([]) });

		const result = useGameStore.getState().applyOpponentCommand({ type: GAME_COMMAND_TYPES.endTurn });

		expect(result.status).toBe('applied');
		expect(useGameStore.getState().gameState.currentTurn).toBe('player');
	});

	it('returns rejected or ignored without a semantic state mutation', () => {
		const rejectedState = createPlayerTurnSetupState([createAiCardInstance()]);
		useGameStore.setState({ gameState: rejectedState });
		const rejected = useGameStore.getState().applyOpponentCommand({
			type: GAME_COMMAND_TYPES.playCard,
			cardId: 'free-minion-instance',
		});
		expect(rejected.status).toBe('rejected');
		expect(useGameStore.getState().gameState).toEqual(rejectedState);

		const ignoredState = createOpponentTurnState([]);
		useGameStore.setState({ gameState: ignoredState });
		const ignored = useGameStore.getState().applyOpponentCommand({
			type: GAME_COMMAND_TYPES.playCard,
			cardId: 'ghost-instance',
		});
		expect(ignored.status).toBe('ignored');
		expect(useGameStore.getState().gameState).toEqual(ignoredState);
	});
});

describe('local match identity reset', () => {
	it('clears stale P2P transport identity when starting a local game', () => {
		useGameStore.setState({
			matchSeed: 'stale-p2p-seed',
			matchId: 'stale-p2p-match',
			myCanonicalSide: 'opponent',
		});

		useGameStore.getState().initGame();

		const state = useGameStore.getState();
		expect(state.matchSeed).toBeNull();
		expect(state.matchId).toBeNull();
		expect(state.myCanonicalSide).toBe('player');
	});

	it('clears stale P2P seed on full game reset', () => {
		useGameStore.setState({
			matchSeed: 'stale-p2p-seed',
			matchId: 'stale-p2p-match',
			myCanonicalSide: 'opponent',
		});

		useGameStore.getState().resetGameState();

		const state = useGameStore.getState();
		expect(state.matchSeed).toBeNull();
		expect(state.matchId).toBeNull();
		expect(state.myCanonicalSide).toBeNull();
	});
});

describe('campaign active realm bootstrap', () => {
	beforeEach(() => {
		useGameStore.setState({ gameState: initializeGame() });
	});

	it('does not emit another gameState update for the same campaign realm', () => {
		let gameStateUpdates = 0;
		const unsubscribe = useGameStore.subscribe(
			(state) => state.gameState,
			() => {
				gameStateUpdates += 1;
			},
		);

		try {
			const input = {
				missionRealm: 'olympus',
				visualRealm: 'asgard' as const,
				realmDisplayName: 'Asgard',
			};

			expect(syncCampaignActiveRealm(input)).toBe(true);
			expect(useGameStore.getState().gameState.activeRealm?.id).toBe('asgard');
			expect(gameStateUpdates).toBe(1);

			expect(syncCampaignActiveRealm(input)).toBe(false);
			expect(gameStateUpdates).toBe(1);
		} finally {
			unsubscribe();
		}
	});

	it('does not sync a realm when there is no campaign mission realm', () => {
		expect(syncCampaignActiveRealm({
			missionRealm: undefined,
			visualRealm: 'asgard',
			realmDisplayName: 'Asgard',
		})).toBe(false);
	});
});

describe('campaign board bootstrap guard', () => {
	const army = {} as ArmySelection;

	it('allows exactly the first campaign board bootstrap without local armies', () => {
		expect(shouldBootstrapCampaignBoard({
			playerArmy: null,
			initialArmy: null,
			alreadyBootstrapped: false,
		})).toBe(true);

		expect(shouldBootstrapCampaignBoard({
			playerArmy: null,
			initialArmy: null,
			alreadyBootstrapped: true,
		})).toBe(false);
	});

	it('does not bootstrap campaign board over an existing army source', () => {
		expect(shouldBootstrapCampaignBoard({
			playerArmy: army,
			initialArmy: null,
			alreadyBootstrapped: false,
		})).toBe(false);

		expect(shouldBootstrapCampaignBoard({
			playerArmy: null,
			initialArmy: army,
			alreadyBootstrapped: false,
		})).toBe(false);
	});
});
