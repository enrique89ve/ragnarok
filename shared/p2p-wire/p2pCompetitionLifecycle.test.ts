import { describe, expect, it } from 'vitest';

import {
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

describe('P2P competition lifecycle', () => {
	it('starts in pre_battle and canonicalizes participant identity order', () => {
		const state = createState();

		expect(state.phase).toBe('pre_battle');
		expect([state.playerA, state.playerB]).toEqual(['peer-a', 'peer-b']);
		expect(state.result).toBeNull();
	});

	it('cancels before the first accepted action without a competitive result', () => {
		const disconnected = reduceP2PCompetitionLifecycle(createState(), {
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

	it('enters battle only after a valid action and ignores non-canonical duplicates', () => {
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

		expect(active.phase).toBe('battle');
		expect(active.firstAcceptedAction).toEqual({
			actionId: 'move-1',
			actorId: 'peer-a',
			canonicalOrder: 1,
		});
		expect(duplicate).toEqual(active);
		expect(replayWithNewOrder).toEqual(active);
	});

	it('restores battle commitment from a validated resume snapshot without inventing an actor', () => {
		const restored = reduceP2PCompetitionLifecycle(createState(), {
			type: 'commitment_restored',
			canonicalOrder: 3,
		});

		expect(restored.phase).toBe('battle');
		expect(restored.lastCanonicalOrder).toBe(3);
		expect(restored.firstAcceptedAction).toBeNull();
	});

	it('resolves an opponent reconnect expiry using absolute IDs', () => {
		const disconnected = reduceP2PCompetitionLifecycle(acceptFirstAction(), {
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
		const resolved = reduceP2PCompetitionLifecycle(acceptFirstAction(), {
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

	it('is irreversible and idempotent after normal or technical resolution', () => {
		const technical = reduceP2PCompetitionLifecycle(acceptFirstAction(), {
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
		const resolved = reduceP2PCompetitionLifecycle(acceptFirstAction(), {
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
