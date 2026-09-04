import { describe, expect, it } from 'vitest';

import { applyChessAction, canonicalChessSnapshot } from '@shared/protocol-core/chess';
import type { ChessAction } from '@shared/protocol-core/chess';
import type { ChessBoardSnapshot } from '@shared/protocol-core/chess';
import type { ChessProtocolPiece } from '@shared/protocol-core/chess';
import type { CardData, CardInstance, GameState, HeroClass, Player } from '../types';
import { applyGameCommand, applyOpponentCommand } from '../core/commands';
import { GAME_COMMAND_TYPES } from '../core/commands/gameCommandTypes';
import { flipGameState } from '../engine/wireHash';
import { serializeGameState } from '../engine/stateSerializer';
import { createSeededIdGen } from '../utils/seededRng';

const card: CardData = {
	id: 'chaos-card',
	name: 'Chaos Card',
	type: 'minion',
	rarity: 'common',
	manaCost: 1,
	attack: 2,
	health: 2,
};

function cardInstance(instanceId: string, overrides: Partial<CardInstance> = {}): CardInstance {
	return {
		instanceId,
		card,
		currentAttack: card.attack,
		currentHealth: card.health,
		canAttack: false,
		isSummoningSick: true,
		attacksPerformed: 0,
		...overrides,
	};
}

function player(id: string, overrides: Partial<Player> = {}): Player {
	return {
		id,
		name: id,
		hand: id === 'player' ? [cardInstance('local-hand')] : [],
		battlefield: id === 'opponent' ? [cardInstance('remote-attacker', {
			canAttack: true,
			isSummoningSick: false,
		})] : [],
		deck: [card, card, card, card],
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
	};
}

function state(): GameState {
	return {
		players: { player: player('player'), opponent: player('opponent') },
		currentTurn: 'player',
		turnNumber: 1,
		gamePhase: 'playing',
		gameLog: [],
	};
}

function command(handIndex: number) {
	return {
		type: 'grant_poker_hand_rewards' as const,
		combatId: `chaos-combat-${handIndex}`,
		handIndex,
		rewardId: `chaos-reward-${handIndex}`,
		wagerDrawPlayer: 0,
		wagerDrawOpponent: 0,
		wagerAoeDamagePlayer: 0,
		wagerAoeDamageOpponent: 0,
		allInShowdown: false,
	};
}

function appliedState(result: ReturnType<typeof applyGameCommand>): GameState {
	expect(result.status).toBe('applied');
	if (result.status !== 'applied') throw new Error(`expected applied command, got ${result.status}`);
	return result.state;
}

function deterministicDeps(match: number, namespace: string) {
	return {
		rng: () => 0.5,
		idGen: createSeededIdGen(`chaos-${match}`, namespace),
	};
}

function expectPeersConverged(left: GameState, right: GameState): void {
	expect(serializeGameState(left)).toBe(serializeGameState(flipGameState(right)));
}

function chessState(): ChessBoardSnapshot {
	const pieces: ChessProtocolPiece[] = [
		{ id: 'player-king', type: 'king', owner: 'player', position: { row: 0, col: 0 }, hasMoved: false },
		{ id: 'player-pawn', type: 'pawn', owner: 'player', position: { row: 1, col: 2 }, hasMoved: false },
		{ id: 'player-rook', type: 'rook', owner: 'player', position: { row: 0, col: 1 }, hasMoved: false },
		{ id: 'opponent-king', type: 'king', owner: 'opponent', position: { row: 6, col: 4 }, hasMoved: false },
		{ id: 'opponent-pawn', type: 'pawn', owner: 'opponent', position: { row: 5, col: 2 }, hasMoved: false },
		{ id: 'opponent-rook', type: 'rook', owner: 'opponent', position: { row: 0, col: 4 }, hasMoved: false },
	];
	return { pieces, currentTurn: 'player', gameStatus: 'playing', moveCount: 0, inCheck: null };
}

type ChessTransport = 'webrtc' | 'relay';

type ScheduledChessEnvelope = {
	readonly id: string;
	readonly canonicalOrder: number;
	readonly action: ChessAction;
	readonly deliveryAt: number;
	readonly transport: ChessTransport;
	readonly reconnectReplay?: boolean;
};

const chessActions: readonly ChessAction[] = [
	{ kind: 'move', pieceId: 'player-pawn', to: { row: 2, col: 2 } },
	{ kind: 'endTurn' },
	{ kind: 'move', pieceId: 'opponent-pawn', to: { row: 4, col: 2 } },
	{ kind: 'endTurn' },
	{ kind: 'capture', attackerId: 'player-rook', victimId: 'opponent-rook', to: { row: 0, col: 4 } },
	{ kind: 'endTurn' },
	{ kind: 'move', pieceId: 'opponent-king', to: { row: 6, col: 3 } },
	{ kind: 'endTurn' },
	{ kind: 'move', pieceId: 'player-pawn', to: { row: 3, col: 2 } },
];

/**
 * Pure transport fixture: delivery timing and transport kind vary, while the
 * receiver still applies only the canonical action order. This models the
 * ordering contract around WebRTC, relay fallback and reconnect replay; it
 * deliberately does not claim to exercise browser/network infrastructure.
 */
function scheduleChessEnvelopes(match: number, profile: 'alice' | 'bob'): ScheduledChessEnvelope[] {
	const envelopes = chessActions.map((action, canonicalOrder) => ({
		id: `chess-${match}-${canonicalOrder}`,
		canonicalOrder,
		action,
		deliveryAt: (match * 29 + canonicalOrder * (profile === 'alice' ? 17 : 31) + (profile === 'bob' ? 7 : 3)) % 23,
		transport: profile === 'alice'
			? (canonicalOrder % 3 === 0 ? 'relay' : 'webrtc')
			: (canonicalOrder % 2 === 0 ? 'relay' : 'webrtc'),
	} satisfies ScheduledChessEnvelope));
	const replay = envelopes[2];
	if (!replay) throw new Error('chess fixture replay envelope missing');
	return [...envelopes, { ...replay, deliveryAt: replay.deliveryAt + 29, transport: 'relay', reconnectReplay: true }];
}

function replayChessDelivery(
	initial: ChessBoardSnapshot,
	envelopes: readonly ScheduledChessEnvelope[],
): { readonly state: ChessBoardSnapshot; readonly transports: ReadonlySet<ChessTransport>; readonly replayCount: number } {
	let state = initial;
	let nextOrder = 0;
	let replayCount = 0;
	const pending = new Map<number, ScheduledChessEnvelope>();
	const appliedIds = new Set<string>();
	const transports = new Set<ChessTransport>();

	for (const envelope of [...envelopes].sort((left, right) => left.deliveryAt - right.deliveryAt || left.canonicalOrder - right.canonicalOrder)) {
		if (envelope.reconnectReplay) replayCount += 1;
		if (appliedIds.has(envelope.id)) continue;
		pending.set(envelope.canonicalOrder, envelope);
		while (pending.has(nextOrder)) {
			const ready = pending.get(nextOrder);
			if (!ready) throw new Error(`missing chess order ${nextOrder}`);
			const result = applyChessAction(state, ready.action);
			if (!result.ok) throw new Error(`chess fixture rejected order ${nextOrder}: ${result.reason}`);
			state = result.state;
			appliedIds.add(ready.id);
			transports.add(ready.transport);
			pending.delete(nextOrder);
			nextOrder += 1;
		}
	}

	if (pending.size !== 0 || nextOrder !== chessActions.length) {
		throw new Error(`chess fixture did not drain: nextOrder=${nextOrder}, pending=${pending.size}`);
	}
	return { state, transports, replayCount };
}

describe('P2P determinism chaos fixture', () => {
	it('converges across 100 cross-perspective Cards and Poker traces', () => {
		for (let match = 0; match < 100; match += 1) {
			const first = {
				type: GAME_COMMAND_TYPES.playCard,
				cardId: 'local-hand',
			} as const;
			const endTurn = { type: GAME_COMMAND_TYPES.endTurn } as const;
			const remoteAttack = {
				type: GAME_COMMAND_TYPES.attack,
				attackerId: 'remote-attacker',
			} as const;
			const reward = command(0);
			let left = state();
			let right = flipGameState(left);

			// The left peer owns the canonical player role. The right peer receives
			// the same signed commands through the opponent path, which exercises the
			// perspective swap used by the actual P2P receiver.
			left = appliedState(applyGameCommand(left, first, deterministicDeps(match, 'play')));
			right = appliedState(applyOpponentCommand(right, first, deterministicDeps(match, 'play')));
			expectPeersConverged(left, right);

			left = appliedState(applyGameCommand(left, endTurn, deterministicDeps(match, 'turn')));
			right = appliedState(applyOpponentCommand(right, endTurn, deterministicDeps(match, 'turn')));
			expectPeersConverged(left, right);

			// This command is delivered from the remote player after the turn
			// transition, like a delayed packet that crossed a reconnect boundary.
			left = appliedState(applyOpponentCommand(left, remoteAttack, deterministicDeps(match, 'attack')));
			right = appliedState(applyGameCommand(right, remoteAttack, deterministicDeps(match, 'attack')));
			expectPeersConverged(left, right);

			left = appliedState(applyGameCommand(left, reward, deterministicDeps(match, 'reward')));
			right = appliedState(applyOpponentCommand(right, reward, deterministicDeps(match, 'reward')));
			expectPeersConverged(left, right);

			// A reconnect can redeliver the same reward envelope. The reducer must
			// make that delivery a no-op on both perspectives.
			const leftDuplicate = applyGameCommand(left, reward, deterministicDeps(match, 'reconnect'));
			const rightDuplicate = applyOpponentCommand(right, reward, deterministicDeps(match, 'reconnect'));
			expect(leftDuplicate.status).toBe('ignored');
			expect(rightDuplicate.status).toBe('ignored');
			expectPeersConverged(leftDuplicate.state, rightDuplicate.state);

			const aliceChess = replayChessDelivery(chessState(), scheduleChessEnvelopes(match, 'alice'));
			const bobChess = replayChessDelivery(chessState(), scheduleChessEnvelopes(match, 'bob'));
			expect(canonicalChessSnapshot(aliceChess.state)).toBe(canonicalChessSnapshot(bobChess.state));
			expect(aliceChess.state.moveCount).toBe(chessActions.length - 4);
			expect(aliceChess.transports).toEqual(new Set(['webrtc', 'relay']));
			expect(bobChess.transports).toEqual(new Set(['webrtc', 'relay']));
			expect(aliceChess.replayCount).toBe(1);
			expect(bobChess.replayCount).toBe(1);
		}
	});
});
