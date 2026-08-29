import { afterEach, describe, expect, it, vi } from 'vitest';

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

import { canonicalStringify } from '@shared/protocol-core/hash';
import { Hash256Schema } from '@shared/p2p-wire/integrity';
import {
	CombatAction,
	CombatPhase,
	type PlayerCombatState,
	type PokerCard,
	type PokerCombatState,
} from '../types/PokerCombatTypes';
import { getDefaultArmySelection } from '../data/ChessPieceConfig';
import { useUnifiedCombatStore } from '../stores/unifiedCombatStore';
import { canonicalizePokerCombatState } from './phaseBoundaryProjection';
import { computeInitialMatchRoot } from './phaseBoundaryRoot';
import { computePokerCombatStateHash } from './pokerStateHash';

const ACE_SPADES: PokerCard = { suit: 'spades', value: 'A', numericValue: 14 };
const KING_HEARTS: PokerCard = { suit: 'hearts', value: 'K', numericValue: 13 };

function participant(id: string, card: PokerCard, health: number): PlayerCombatState {
	return {
		playerId: id,
		playerName: `visual-${id}`,
		pet: {
			id: `pet-${id}`,
			name: `art-name-${id}`,
			imageUrl: `/art/${id}.png`,
			rarity: 'rare',
			petClass: 'standard',
			stats: {
				maxHealth: 100,
				currentHealth: health,
				maxStamina: 10,
				currentStamina: 8,
				speed: 0,
				attack: 12,
				rage: 0,
				maxRage: 0,
				level: 3,
				element: 'fire',
			},
			abilities: [],
			spellSlots: 1,
			equippedSpells: [],
		},
		holeCards: [card],
		hpCommitted: 5,
		preBlindHealth: health + 5,
		heroArmor: 0,
		statusEffects: [],
		mana: 2,
		maxMana: 3,
		isReady: true,
	};
}

function attackerView(): PokerCombatState {
	return {
		combatId: 'combat-1',
		handNumber: 0,
		phase: CombatPhase.PRE_FLOP,
		player: participant('attacker-id', ACE_SPADES, 90),
		opponent: participant('defender-id', KING_HEARTS, 80),
		communityCards: { faith: [] },
		currentBet: 10,
		pot: 15,
		turnTimer: 25,
		maxTurnTime: 30,
		turnId: 'turn-1',
		turnStartedAtMs: 1_000,
		turnDeadlineAtMs: 31_000,
		actionHistory: [{ action: CombatAction.ATTACK, hpCommitment: 10, timestamp: 1_500 }],
		winner: 'player',
		minBet: 5,
		openerIsPlayer: true,
		preflopBetMade: true,
		foldWinner: 'player',
		activePlayerId: 'attacker-id',
		actionsThisRound: 1,
		blindConfig: { bigBlind: 10, smallBlind: 5, ante: 0.5 },
		playerPosition: 'small_blind',
		opponentPosition: 'big_blind',
		blindsPosted: true,
		isAllInShowdown: false,
		firstStrike: { damage: 15, target: 'opponent', completed: true },
		deterministicDeckSeed: 'deck-seed',
		deterministicPlayerRole: 'attacker',
	};
}

function defenderView(): PokerCombatState {
	const state = attackerView();
	return {
		...state,
		player: state.opponent,
		opponent: state.player,
		turnTimer: 17,
		turnStartedAtMs: 9_000,
		turnDeadlineAtMs: 39_000,
		actionHistory: state.actionHistory.map((action) => ({ ...action, timestamp: 9_500 })),
		winner: 'opponent',
		openerIsPlayer: false,
		foldWinner: 'opponent',
		playerPosition: state.opponentPosition,
		opponentPosition: state.playerPosition,
		firstStrike: { damage: 15, target: 'player', completed: true },
		deterministicPlayerRole: 'defender',
	};
}

describe('phase boundary poker projection', () => {
	it('is identical from attacker and defender viewer slots', () => {
		expect(canonicalStringify(canonicalizePokerCombatState(attackerView())))
			.toBe(canonicalStringify(canonicalizePokerCombatState(defenderView())));
	});

	it('excludes wall clocks and art but binds gameplay health', () => {
		const first = attackerView();
		const cosmeticOnly = attackerView();
		cosmeticOnly.player.playerName = 'another label';
		cosmeticOnly.player.pet.imageUrl = '/other-art.png';
		cosmeticOnly.turnDeadlineAtMs = 999_999;
		expect(canonicalStringify(canonicalizePokerCombatState(cosmeticOnly)))
			.toBe(canonicalStringify(canonicalizePokerCombatState(first)));

		const changedHealth = attackerView();
		changedHealth.player.pet.stats.currentHealth -= 1;
		expect(canonicalStringify(canonicalizePokerCombatState(changedHealth)))
			.not.toBe(canonicalStringify(canonicalizePokerCombatState(first)));
	});

	it('hashes the canonical Poker projection and binds timeout origin', () => {
		const first = attackerView();
		expect(computePokerCombatStateHash(null)).toBeNull();
		expect(computePokerCombatStateHash(first)).toMatch(/^[0-9a-f]{64}$/);

		const timeoutState = {
			...first,
			actionHistory: [{
				...first.actionHistory[0],
				origin: 'timeout' as const,
			}],
		};
		expect(computePokerCombatStateHash(timeoutState))
			.not.toBe(computePokerCombatStateHash(first));
	});
});

const cardsHash = Hash256Schema.parse('a'.repeat(64));

afterEach(() => useUnifiedCombatStore.getState().reset());

describe('computeInitialMatchRoot', () => {
	it('binds the canonical chess board, match context, cards root, and both loadouts', () => {
		const army = getDefaultArmySelection();
		useUnifiedCombatStore.getState().initializeBoard(army, army, () => 'piece-id');

		const store = useUnifiedCombatStore.getState();
		const root = computeInitialMatchRoot({
			matchId: 'match-1',
			matchSeed: 'seed-1',
			engineHash: 'engine-v1',
			rulesetHash: 'rules-v1',
			cardsHash,
			localLoadoutHash: 'loadout-a',
			remoteLoadoutHash: 'loadout-b',
			combatStore: store,
		});
		const reversedLoadoutRoot = computeInitialMatchRoot({
			matchId: 'match-1',
			matchSeed: 'seed-1',
			engineHash: 'engine-v1',
			rulesetHash: 'rules-v1',
			cardsHash,
			localLoadoutHash: 'loadout-b',
			remoteLoadoutHash: 'loadout-a',
			combatStore: store,
		});

		expect(root).toBeTruthy();
		expect(root).toBe(reversedLoadoutRoot);
	});

	it('changes when a canonical initial chess fact changes', () => {
		const army = getDefaultArmySelection();
		useUnifiedCombatStore.getState().initializeBoard(army, army, () => 'piece-id');
		const base = {
			matchId: 'match-1',
			matchSeed: 'seed-1',
			engineHash: 'engine-v1',
			rulesetHash: 'rules-v1',
			cardsHash,
			localLoadoutHash: 'loadout-a',
			remoteLoadoutHash: 'loadout-b',
		};
		const before = computeInitialMatchRoot({ ...base, combatStore: useUnifiedCombatStore.getState() });
		const firstPiece = useUnifiedCombatStore.getState().boardState.pieces[0];
		if (!firstPiece) throw new Error('Expected initialized chess piece');
		useUnifiedCombatStore.setState({
			boardState: {
				...useUnifiedCombatStore.getState().boardState,
				pieces: [{ ...firstPiece, health: firstPiece.health - 1 }, ...useUnifiedCombatStore.getState().boardState.pieces.slice(1)],
			},
		});
		const after = computeInitialMatchRoot({ ...base, combatStore: useUnifiedCombatStore.getState() });

		expect(after).not.toBe(before);
	});
});
