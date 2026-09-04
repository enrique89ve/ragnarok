import { describe, expect, it } from 'vitest';

import {
	advanceP2PLogicalClock,
	createP2PCompetitionState,
	reduceP2PCompetitionLifecycle,
} from './p2pCompetitionLifecycle';

const createState = () => createP2PCompetitionState({
	matchId: 'match-1',
	playerA: 'peer-b',
	playerB: 'peer-a',
});

const acceptFirstAction = (state = createState()) => reduceP2PCompetitionLifecycle(state, {
	type: 'action_accepted',
	actionId: 'move-1',
	actorId: 'peer-a',
	canonicalOrder: 1,
});

const startBattle = (state = acceptFirstAction()) => reduceP2PCompetitionLifecycle(state, {
	type: 'battle_started',
	moveId: 'move-1',
	actorId: 'peer-a',
	canonicalOrder: 1,
});

describe('P2P competition lifecycle', () => {
	it('tracks one canonical order with independent chess, cards, and poker revisions', () => {
		const state = createState();
		const chess = reduceP2PCompetitionLifecycle(state, {
			type: 'action_accepted', actionId: 'chess-1', actorId: 'peer-a', canonicalOrder: 1, domain: 'chess',
		});
		const cards = reduceP2PCompetitionLifecycle(chess, {
			type: 'action_accepted', actionId: 'cards-1', actorId: 'peer-b', canonicalOrder: 2, domain: 'cards',
		});
		const poker = reduceP2PCompetitionLifecycle(cards, {
			type: 'action_accepted', actionId: 'poker-1', actorId: 'peer-a', canonicalOrder: 3, domain: 'poker',
		});

		expect(poker.logicalClock).toEqual({ canonicalOrder: 3, chessRevision: 1, cardsRevision: 1, pokerRevision: 1 });
		expect(advanceP2PLogicalClock(poker.logicalClock, 'cards', 4)).toEqual({
			canonicalOrder: 4, chessRevision: 1, cardsRevision: 2, pokerRevision: 1,
		});
	});
	it('starts in pre_battle and canonicalizes participant identity order', () => {
		const state = createState();

		expect(state.phase).toBe('pre_battle');
		expect([state.playerA, state.playerB]).toEqual(['peer-a', 'peer-b']);
		expect(state.result).toBeNull();
	});

	it('cancels before the first legal chess move without a competitive result', () => {
		const mulligan = reduceP2PCompetitionLifecycle(createState(), {
			type: 'action_accepted',
			actionId: 'mulligan-confirm-1',
			actorId: 'peer-a',
			canonicalOrder: 1,
		});
		const disconnected = reduceP2PCompetitionLifecycle(mulligan, {
			type: 'disconnect_detected',
			participantId: 'peer-b',
		});
		const cancelled = reduceP2PCompetitionLifecycle(disconnected, {
			type: 'reconnect_expired',
			participantId: 'peer-b',
			eventId: 'expiry-1',
		});

		expect(cancelled.phase).toBe('cancelled');
		expect(cancelled.result).toBeNull();
		expect(cancelled.terminalEventId).toBe('expiry-1');
	});

	it('records canonical setup actions without starting battle and ignores duplicates', () => {
		const active = acceptFirstAction();
		const duplicate = reduceP2PCompetitionLifecycle(active, {
			type: 'action_accepted',
			actionId: 'move-duplicate',
			actorId: 'peer-b',
			canonicalOrder: 1,
		});
		const replayWithNewOrder = reduceP2PCompetitionLifecycle(active, {
			type: 'action_accepted',
			actionId: 'move-1',
			actorId: 'peer-a',
			canonicalOrder: 2,
		});

		expect(active.phase).toBe('pre_battle');
		expect(active.firstAcceptedAction).toEqual({
			actionId: 'move-1',
			actorId: 'peer-a',
			canonicalOrder: 1,
		});
		expect(duplicate).toEqual(active);
		expect(replayWithNewOrder).toEqual(active);
	});

	it('enters battle only from the latest accepted legal chess move', () => {
		const setupAction = reduceP2PCompetitionLifecycle(createState(), {
			type: 'action_accepted',
			actionId: 'mulligan-1',
			actorId: 'peer-a',
			canonicalOrder: 1,
		});
		const chessAction = reduceP2PCompetitionLifecycle(setupAction, {
			type: 'action_accepted',
			actionId: 'move-2',
			actorId: 'peer-b',
			canonicalOrder: 2,
		});
		const staleStart = reduceP2PCompetitionLifecycle(chessAction, {
			type: 'battle_started',
			moveId: 'mulligan-1',
			actorId: 'peer-a',
			canonicalOrder: 1,
		});
		const wrongActor = reduceP2PCompetitionLifecycle(chessAction, {
			type: 'battle_started',
			moveId: 'move-2',
			actorId: 'peer-a',
			canonicalOrder: 2,
		});
		const started = reduceP2PCompetitionLifecycle(chessAction, {
			type: 'battle_started',
			moveId: 'move-2',
			actorId: 'peer-b',
			canonicalOrder: 2,
		});

		expect(staleStart.phase).toBe('pre_battle');
		expect(wrongActor.phase).toBe('pre_battle');
		expect(started.phase).toBe('battle');
	});

	it('restores battle commitment from a validated resume snapshot without inventing an actor', () => {
		const restored = reduceP2PCompetitionLifecycle(createState(), {
			type: 'commitment_restored',
			canonicalOrder: 3,
		});

		expect(restored.phase).toBe('battle');
		expect(restored.lastCanonicalOrder).toBe(3);
		expect(restored.logicalClock).toEqual({
			canonicalOrder: 3,
			chessRevision: 0,
			cardsRevision: 0,
			pokerRevision: 0,
		});
		expect(restored.firstAcceptedAction).toBeNull();
	});

	it('resolves an opponent reconnect expiry using absolute IDs', () => {
		const disconnected = reduceP2PCompetitionLifecycle(startBattle(), {
			type: 'disconnect_detected',
			participantId: 'peer-b',
		});
		const resolved = reduceP2PCompetitionLifecycle(disconnected, {
			type: 'reconnect_expired',
			participantId: 'peer-b',
			eventId: 'expiry-2',
		});

		expect(resolved.result).toMatchObject({
			kind: 'technical_abandonment',
			winnerId: 'peer-a',
			loserId: 'peer-b',
			reason: 'reconnect_expired',
		});
	});

	it('makes explicit leave consequential only after battle commitment', () => {
		const resolved = reduceP2PCompetitionLifecycle(startBattle(), {
			type: 'leave_requested',
			participantId: 'peer-a',
			eventId: 'leave-1',
		});

		expect(resolved.result).toMatchObject({
			kind: 'technical_abandonment',
			winnerId: 'peer-b',
			loserId: 'peer-a',
			reason: 'explicit_leave',
		});
	});

	it('resolves a missed Poker approval without inventing a winner', () => {
		const oneReady = reduceP2PCompetitionLifecycle(startBattle(), {
			type: 'poker_entry_approval_expired',
			readyParticipantIds: ['peer-a'],
			eventId: 'poker-ready-expiry-1',
		});
		const noneReady = reduceP2PCompetitionLifecycle(startBattle(), {
			type: 'poker_entry_approval_expired',
			readyParticipantIds: [],
			eventId: 'poker-ready-expiry-2',
		});

		expect(oneReady.result).toMatchObject({
			kind: 'technical_abandonment',
			winnerId: 'peer-a',
			loserId: 'peer-b',
			reason: 'poker_entry_approval_expired',
		});
		expect(noneReady.result).toMatchObject({
			kind: 'technical_no_contest',
			reason: 'poker_entry_approval_expired',
		});
	});

	it('is irreversible and idempotent after normal or technical resolution', () => {
		const technical = reduceP2PCompetitionLifecycle(startBattle(), {
			type: 'leave_requested',
			participantId: 'peer-a',
			eventId: 'leave-2',
		});
		const lateNormal = reduceP2PCompetitionLifecycle(technical, {
			type: 'normal_result',
			winnerId: 'peer-a',
			loserId: 'peer-b',
			eventId: 'normal-late',
			canonicalOrder: 2,
		});
		const duplicateTechnical = reduceP2PCompetitionLifecycle(lateNormal, {
			type: 'reconnect_expired',
			participantId: 'peer-a',
			eventId: 'expiry-late',
		});

		expect(lateNormal).toEqual(technical);
		expect(duplicateTechnical).toEqual(technical);
	});

	it('accepts a deterministic normal result only from battle phase', () => {
		const resolved = reduceP2PCompetitionLifecycle(startBattle(), {
			type: 'normal_result',
			winnerId: 'peer-a',
			loserId: 'peer-b',
			eventId: 'normal-1',
			canonicalOrder: 1,
		});

		expect(resolved).toMatchObject({ phase: 'resolved' });
		expect(resolved.result).toMatchObject({ kind: 'normal', winnerId: 'peer-a', loserId: 'peer-b' });
	});

	it('rejects duplicate participant identities', () => {
		expect(() => createP2PCompetitionState({ matchId: 'match-1', playerA: 'same', playerB: 'same' })).toThrow();
	});
});
