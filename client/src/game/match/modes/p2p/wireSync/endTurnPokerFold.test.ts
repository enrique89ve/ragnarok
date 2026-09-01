import { describe, expect, it } from 'vitest';
import { CombatPhase, type PokerCombatState } from '../../../../types/PokerCombatTypes';
import { planEndTurnPokerFold } from './endTurnPokerFold';

const combatState = (overrides: Partial<PokerCombatState> = {}): PokerCombatState => ({
	combatId: 'combat-1',
	handNumber: 0,
	phase: CombatPhase.PRE_FLOP,
	player: { playerId: 'local-player', hpCommitted: 0, isReady: false } as PokerCombatState['player'],
	opponent: { playerId: 'remote-player', hpCommitted: 0, isReady: false } as PokerCombatState['opponent'],
	communityCards: {},
	currentBet: 10,
	pot: 0,
	turnTimer: 60,
	maxTurnTime: 60,
	turnId: 'turn-1',
	turnStartedAtMs: Date.now(),
	turnDeadlineAtMs: Date.now() + 60_000,
	actionHistory: [],
	minBet: 5,
	openerIsPlayer: true,
	preflopBetMade: false,
	activePlayerId: 'remote-player',
	actionsThisRound: 0,
	blindConfig: { smallBlind: 5, bigBlind: 10, ante: 0.5 },
	playerPosition: 'small_blind',
	opponentPosition: 'big_blind',
	blindsPosted: true,
	isAllInShowdown: false,
	...overrides,
});

describe('planEndTurnPokerFold', () => {
	it('selects the viewer-relative remote actor for an incoming End Turn', () => {
		expect(planEndTurnPokerFold({
			isActive: true,
			combatState: combatState(),
			isTransitioningHand: false,
			side: 'opponent',
		})).toEqual({ status: 'required', playerId: 'remote-player' });
	});

	it('selects the local actor for the local End Turn path', () => {
		expect(planEndTurnPokerFold({
			isActive: true,
			combatState: combatState({ activePlayerId: 'local-player' }),
			isTransitioningHand: false,
			side: 'player',
		})).toEqual({ status: 'required', playerId: 'local-player' });
	});

	it.each([
		['inactive', { isActive: false }],
		['missing combat', { combatState: null }],
		['mulligan', { combatState: combatState({ phase: CombatPhase.MULLIGAN }) }],
		['resolution', { combatState: combatState({ phase: CombatPhase.RESOLUTION }) }],
		['transitioning', { isTransitioningHand: true }],
		['already folded', { combatState: combatState({ foldWinner: 'player' }) }],
		['checkable window without a wager', { combatState: combatState({ currentBet: 0 }) }],
	] as const)('does not fold during %s', (_label, overrides) => {
		expect(planEndTurnPokerFold({
			isActive: true,
			combatState: combatState(),
			isTransitioningHand: false,
			side: 'opponent',
			...overrides,
		})).toEqual({ status: 'not_required' });
	});
});
