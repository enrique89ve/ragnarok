import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
	const mem = new Map<string, string>();
	(globalThis as { localStorage?: unknown }).localStorage = {
		getItem: (key: string) => mem.get(key) ?? null,
		setItem: (key: string, value: string) => { mem.set(key, value); },
		removeItem: (key: string) => { mem.delete(key); },
		clear: () => { mem.clear(); },
		key: () => null,
		length: 0,
	};
});

import { applyEndTurnPokerFold, useGameStore } from './gameStore';
import { useUnifiedCombatStore } from './unifiedCombatStore';
import { CombatPhase } from '../types/PokerCombatTypes';
import type { PetData } from '../types/PokerCombatTypes';
import { initializeGame } from '../utils/gameUtils';

const createPet = (id: string): PetData => ({
	id,
	name: id,
	rarity: 'common',
	petClass: 'standard',
	stats: {
		maxHealth: 100,
		currentHealth: 100,
		maxStamina: 10,
		currentStamina: 10,
		speed: 1,
		attack: 1,
		rage: 0,
		maxRage: 0,
		level: 1,
		element: 'neutral',
	},
	abilities: [],
	spellSlots: 0,
	equippedSpells: [],
});

describe('P2P End Turn Poker bridge', () => {
	beforeEach(() => {
		useUnifiedCombatStore.getState().reset();
		useUnifiedCombatStore.getState().initializePokerCombat(
			'local-piece',
			'Local',
			createPet('local-pet'),
			'remote-piece',
			'Remote',
			createPet('remote-pet'),
			true,
			undefined,
			undefined,
			undefined,
			{ combatId: 'p2p-end-turn', deckSeed: 'p2p-end-turn-deck', playerRole: 'attacker' },
		);
	});

	it('folds the remote actor through the same engine used by local End Turn', () => {
		const before = useUnifiedCombatStore.getState().pokerCombatState;
		expect(before?.phase).toBe(CombatPhase.PRE_FLOP);
		expect(before?.opponent.playerId).toBe('remote-piece');

		useUnifiedCombatStore.setState({
			pokerCombatState: {
				...before!,
				activePlayerId: 'remote-piece',
				currentBet: 10,
				blindsPosted: true,
			},
		});

		expect(applyEndTurnPokerFold('opponent')).toEqual({ status: 'applied' });
		expect(useUnifiedCombatStore.getState().pokerCombatState).toMatchObject({
			phase: CombatPhase.RESOLUTION,
			foldWinner: 'player',
			activePlayerId: null,
		});
	});

	it('does not pre-fold Poker when the canonical cards End Turn is rejected', () => {
		const before = useUnifiedCombatStore.getState().pokerCombatState;
		useUnifiedCombatStore.setState({
			pokerCombatState: {
				...before!,
				activePlayerId: 'local-piece',
				currentBet: 10,
				blindsPosted: true,
			},
		});
		const pokerBeforeEndTurn = useUnifiedCombatStore.getState().pokerCombatState;

		// The cards command is invalid on the opponent's turn. The Poker fold
		// must remain untouched when that canonical command does not commit.
		const invalidCardsState = initializeGame();
		invalidCardsState.players.player.mana = {
			...invalidCardsState.players.player.mana,
			current: invalidCardsState.players.player.mana.max + 1,
		};
		useGameStore.setState({ gameState: invalidCardsState });
		useGameStore.getState().endTurn();

		expect(useUnifiedCombatStore.getState().pokerCombatState).toBe(pokerBeforeEndTurn);
	});
});
