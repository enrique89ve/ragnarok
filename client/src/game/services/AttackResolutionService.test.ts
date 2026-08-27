import { describe, expect, it } from 'vitest';
import type { CardData, CardInstance, GameState, Player } from '../types';
import {
	createCombatStep,
	resolveDamageToState,
} from './AttackResolutionService';

const card: CardData = {
	id: 1,
	name: 'Test Minion',
	type: 'minion',
	manaCost: 1,
	attack: 7,
	health: 5,
	rarity: 'common',
	description: '',
	class: 'neutral',
};

function minion(instanceId: string, overrides: Partial<CardInstance> = {}): CardInstance {
	return {
		instanceId,
		card,
		currentAttack: card.attack,
		currentHealth: card.health,
		canAttack: true,
		isPlayed: true,
		isSummoningSick: false,
		attacksPerformed: 0,
		...overrides,
	};
}

function player(id: 'player' | 'opponent', battlefield: CardInstance[]): Player {
	return {
		id,
		name: id,
		hand: [],
		battlefield,
		deck: [],
		graveyard: [],
		secrets: [],
		mana: { current: 10, max: 10, overloaded: 0, pendingOverload: 0 },
		health: 30,
		maxHealth: 30,
		heroHealth: 30,
		heroArmor: 0,
		armor: 0,
		heroClass: 'mage',
		heroPower: { name: 'Fireblast', description: 'Deal 1 damage.', cost: 2, used: false, class: 'mage' },
		cardsPlayedThisTurn: 0,
		attacksPerformedThisTurn: 0,
	};
}

function state(attacker: CardInstance, target: CardInstance): GameState {
	return {
		players: {
			player: player('player', [attacker]),
			opponent: player('opponent', [target]),
		},
		currentTurn: 'player',
		turnNumber: 1,
		gamePhase: 'playing',
		winner: null,
		gameLog: [],
	};
}

function step(target: CardInstance): ReturnType<typeof createCombatStep> {
	return createCombatStep(
		'attacker',
		'Attacker',
		7,
		target.instanceId,
		'Target',
		'minion',
		3,
		false,
		target.hasDivineShield === true,
		'player',
	);
}

describe('resolved combat result', () => {
	it('reports shield consumption without reporting HP damage or lethality', () => {
		const attacker = minion('attacker');
		const target = minion('target', { hasDivineShield: true });
		const resolution = resolveDamageToState(state(attacker, target), step(target));

		expect(resolution.resolvedAttack).toMatchObject({
			damageToTarget: 7,
			healthDamageToTarget: 0,
			targetHealthBefore: 5,
			targetHealthAfter: 5,
			targetShieldConsumed: true,
			targetLethal: false,
			counterAttackOccurred: true,
			healthDamageToAttacker: 3,
		});
		expect(resolution.state.players.opponent.battlefield[0]?.hasDivineShield).toBe(false);
	});

	it('reports lethal target removal while preserving the pre-impact target snapshot', () => {
		const attacker = minion('attacker');
		const target = minion('target', { currentHealth: 4 });
		const resolution = resolveDamageToState(state(attacker, target), step(target));

		expect(resolution.resolvedAttack).toMatchObject({
			targetHealthBefore: 4,
			targetHealthAfter: 0,
			healthDamageToTarget: 4,
			targetLethal: true,
			zoneChanges: [{ entityId: 'target', from: 'battlefield', to: 'graveyard' }],
		});
		expect(resolution.state.players.opponent.battlefield).toHaveLength(0);
	});
});
