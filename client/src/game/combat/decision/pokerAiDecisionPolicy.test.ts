import { describe, expect, it } from 'vitest';
import {
	CombatAction,
	CombatPhase,
	DEFAULT_BLIND_CONFIG,
	type PetData,
	type PokerCombatState,
} from '../../types/PokerCombatTypes';
import { validatePokerActionIntent } from '../rules/pokerActionRules';
import { deriveLegalPokerAiAction } from './pokerAiDecisionPolicy';

function createPet(id: string): PetData {
	return {
		id,
		name: id,
		rarity: 'common',
		petClass: 'standard',
		stats: {
			maxHealth: 100,
			currentHealth: 90,
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
	};
}

function createPreFlopAiState(overrides: Partial<PokerCombatState> = {}): PokerCombatState {
	const state: PokerCombatState = {
		combatId: 'combat-ai-policy',
		phase: CombatPhase.PRE_FLOP,
		player: {
			playerId: 'player-piece',
			playerName: 'Player',
			pet: createPet('player-pet'),
			holeCards: [],
			hpCommitted: 10,
			preBlindHealth: 100,
			heroArmor: 0,
			statusEffects: [],
			mana: 1,
			maxMana: 9,
			isReady: true,
		},
		opponent: {
			playerId: 'opponent-piece',
			playerName: 'Opponent',
			pet: createPet('opponent-pet'),
			holeCards: [],
			hpCommitted: 10,
			preBlindHealth: 100,
			heroArmor: 0,
			statusEffects: [],
			mana: 1,
			maxMana: 9,
			isReady: false,
		},
		communityCards: { faith: [] },
		currentBet: 10,
		pot: 20,
		turnTimer: 60,
		maxTurnTime: 60,
		turnId: 'combat-ai-policy:pre_flop:opponent-piece:0',
		turnStartedAtMs: Date.now(),
		turnDeadlineAtMs: Date.now() + 60_000,
		actionHistory: [],
		minBet: 10,
		openerIsPlayer: true,
		preflopBetMade: true,
		blindConfig: DEFAULT_BLIND_CONFIG,
		playerPosition: 'small_blind',
		opponentPosition: 'big_blind',
		blindsPosted: true,
		isAllInShowdown: false,
		activePlayerId: 'opponent-piece',
		actionsThisRound: 1,
	};

	return {
		...state,
		...overrides,
	};
}

describe('deriveLegalPokerAiAction', () => {
	it('removes hpCommitment from AI call/check/fold actions before store validation', () => {
		const state = createPreFlopAiState({
			currentBet: 20,
			player: {
				...createPreFlopAiState().player,
				hpCommitted: 20,
			},
			opponent: {
				...createPreFlopAiState().opponent,
				hpCommitted: 10,
			},
		});

		const intent = deriveLegalPokerAiAction({
			combatState: state,
			aiPlayerId: 'opponent-piece',
			proposed: { action: CombatAction.ENGAGE, betAmount: 0 },
		});

		expect(intent).toMatchObject({
			action: CombatAction.ENGAGE,
			hpCommitment: undefined,
			wasAdjusted: false,
		});
		expect(validatePokerActionIntent({
			combatState: state,
			playerId: 'opponent-piece',
			action: intent.action,
			hpCommitment: intent.hpCommitment,
		}).ok).toBe(true);
	});

	it('turns an invalid no-pressure AI fold into a legal check', () => {
		const state = createPreFlopAiState();
		const rawFold = validatePokerActionIntent({
			combatState: state,
			playerId: 'opponent-piece',
			action: CombatAction.BRACE,
			hpCommitment: 0,
		});
		expect(rawFold).toMatchObject({ ok: false });

		const intent = deriveLegalPokerAiAction({
			combatState: state,
			aiPlayerId: 'opponent-piece',
			proposed: { action: CombatAction.BRACE, betAmount: 0 },
		});

		expect(intent).toMatchObject({
			action: CombatAction.DEFEND,
			wasAdjusted: true,
			proposedAction: CombatAction.BRACE,
		});
		expect(intent.hpCommitment).toBeUndefined();
		expect(validatePokerActionIntent({
			combatState: state,
			playerId: 'opponent-piece',
			action: intent.action,
			hpCommitment: intent.hpCommitment,
		}).ok).toBe(true);
	});

	it('raises an undersized AI bet to the minimum legal stake', () => {
		const state = createPreFlopAiState();

		const intent = deriveLegalPokerAiAction({
			combatState: state,
			aiPlayerId: 'opponent-piece',
			proposed: { action: CombatAction.ATTACK, betAmount: 0 },
		});

		expect(intent).toMatchObject({
			action: CombatAction.ATTACK,
			hpCommitment: 10,
			wasAdjusted: true,
		});
		expect(validatePokerActionIntent({
			combatState: state,
			playerId: 'opponent-piece',
			action: intent.action,
			hpCommitment: intent.hpCommitment,
		}).ok).toBe(true);
	});
});
