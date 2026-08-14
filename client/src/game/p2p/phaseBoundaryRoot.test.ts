import { describe, expect, it } from 'vitest';

import { canonicalStringify } from '@shared/protocol-core/hash';
import {
	CombatAction,
	CombatPhase,
	type PlayerCombatState,
	type PokerCard,
	type PokerCombatState,
} from '../types/PokerCombatTypes';
import { canonicalizePokerCombatState } from './phaseBoundaryProjection';

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
});
