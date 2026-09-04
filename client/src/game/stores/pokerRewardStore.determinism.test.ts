import { describe, expect, it, vi } from 'vitest';
import type { CardData, CardInstance, GameState, HeroClass, Player } from '../types';
import { applyGameCommand, applyOpponentCommand, registerPokerRewardCommit } from '../core/commands';
import { createSeededIdGen } from '../utils/seededRng';

const rewardCard: CardData = {
	id: 'reward-card',
	name: 'Reward Card',
	type: 'minion',
	rarity: 'common',
	manaCost: 1,
	attack: 1,
	health: 1,
};

const makePlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
	id,
	name: id,
	hand: [],
	battlefield: [],
	deck: [],
	graveyard: [],
	secrets: [],
	mana: { current: 1, max: 1, overloaded: 0, pendingOverload: 0 },
	health: 30,
	maxHealth: 30,
	heroHealth: 30,
	heroArmor: 0,
	armor: 0,
	heroClass: 'mage' as HeroClass,
	heroPower: { name: 'Fireblast', cost: 2, used: false },
	cardsPlayedThisTurn: 0,
	attacksPerformedThisTurn: 0,
	...overrides,
});

const makeState = (): GameState => ({
	players: {
		player: makePlayer('player', {
			deck: [rewardCard],
			battlefield: [{
				instanceId: 'player-wager',
				card: {
					...rewardCard,
					wagerEffect: { type: 'showdown_aoe_damage', value: 2 },
				},
				currentHealth: 4,
				currentAttack: 1,
			}],
		}),
		opponent: makePlayer('opponent', {
			deck: [rewardCard],
			battlefield: [{
				instanceId: 'opponent-minion',
				card: rewardCard,
				currentHealth: 4,
				currentAttack: 1,
			}],
		}),
	},
	currentTurn: 'player',
	turnNumber: 1,
	gamePhase: 'playing',
	gameLog: [],
});

const command = {
	type: 'grant_poker_hand_rewards',
	combatId: 'combat-1',
	handIndex: 0,
	rewardId: 'reward-1',
	wagerDrawPlayer: 0,
	wagerDrawOpponent: 0,
	wagerAoeDamagePlayer: 2,
	wagerAoeDamageOpponent: 0,
	allInShowdown: false,
} as const;

describe('Poker reward determinism', () => {
	it('settles a late callback when the reward was already applied locally', () => {
		const pending = new Map<string, () => void>();
		const onCommitted = vi.fn();

		const registration = registerPokerRewardCommit({
			rewardId: command.rewardId,
			gameState: { pokerRewardIds: [command.rewardId] },
			pending,
			onCommitted,
		});

		expect(registration).toBe('already_applied');
		expect(onCommitted).toHaveBeenCalledOnce();
		expect(pending).toHaveLength(0);
	});

	it('keeps the callback pending while the canonical reward is absent', () => {
		const pending = new Map<string, () => void>();
		const onCommitted = vi.fn();

		const registration = registerPokerRewardCommit({
			rewardId: command.rewardId,
			gameState: { pokerRewardIds: [] },
			pending,
			onCommitted,
		});

		expect(registration).toBe('pending');
		expect(pending.get(command.rewardId)).toBe(onCommitted);
		expect(onCommitted).not.toHaveBeenCalled();
	});

	it('does not mutate the input state while applying the reward', () => {
		const state = makeState();
		const before = structuredClone(state);

		applyGameCommand(state, command, { idGen: createSeededIdGen('test-seed', 'reward') });

		expect(state).toEqual(before);
	});

	it('produces the same result for the same input state', () => {
		const first = applyGameCommand(makeState(), command, { idGen: createSeededIdGen('test-seed', 'reward') });
		const second = applyGameCommand(makeState(), command, { idGen: createSeededIdGen('test-seed', 'reward') });

		expect(first).toEqual(second);
	});

	it('applies a reward only once when the command is retried', () => {
		const first = applyGameCommand(makeState(), command, { idGen: createSeededIdGen('test-seed', 'reward') });
		const retry = first.status === 'applied'
			? applyGameCommand(first.state, command, { idGen: createSeededIdGen('test-seed', 'reward') })
			: first;

		expect(first.status).toBe('applied');
		expect(retry.status).toBe('ignored');
		expect(retry.state).toEqual(first.state);
	});

	it('preserves canonical player and opponent rewards across viewer perspective swap', () => {
		const canonicalState = makeState();
		const viewerState: GameState = {
			...canonicalState,
			players: {
				player: canonicalState.players.opponent,
				opponent: canonicalState.players.player,
			},
			currentTurn: 'opponent',
		};
		const perspectiveCommand = {
			...command,
			wagerDrawPlayer: 1,
			wagerDrawOpponent: 1,
		};

		const canonicalResult = applyGameCommand(canonicalState, perspectiveCommand, {
			idGen: createSeededIdGen('perspective-seed', 'reward'),
		});
		const viewerResult = applyOpponentCommand(viewerState, perspectiveCommand, {
			idGen: createSeededIdGen('perspective-seed', 'reward'),
		});

		expect(canonicalResult.status).toBe('applied');
		expect(viewerResult.status).toBe('applied');
		if (canonicalResult.status !== 'applied' || viewerResult.status !== 'applied') return;
		expect(viewerResult.state.players.opponent).toEqual(canonicalResult.state.players.player);
		expect(viewerResult.state.players.player).toEqual(canonicalResult.state.players.opponent);
	});
});
