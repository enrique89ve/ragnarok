import { describe, expect, it, vi } from 'vitest';
import { createSpellcraftReadyMessage } from '@shared/p2p-wire/spellcraft';
import { CombatPhase, type PokerCombatState } from '../../../../types/PokerCombatTypes';
import {
	createSpellcraftReadyLedger,
	settleRemoteSpellcraftReady,
} from './spellcraftReadyBoundary';

function state(input: {
	readonly localId: string;
	readonly remoteId: string;
	readonly localReady?: boolean;
	readonly remoteReady?: boolean;
}): PokerCombatState {
	return {
		combatId: 'combat-a',
		handNumber: 0,
		phase: CombatPhase.SPELL_PET,
		player: { playerId: input.localId, isReady: input.localReady ?? false },
		opponent: { playerId: input.remoteId, isReady: input.remoteReady ?? false },
	} as PokerCombatState;
}

const remoteReady = createSpellcraftReadyMessage({
	matchId: 'match-a',
	combatId: 'combat-a',
	handNumber: 0,
	actorSide: 'second-mover',
	actorPlayerId: 'bob-piece',
	seq: 0,
});

function receive(overrides: Partial<Parameters<typeof settleRemoteSpellcraftReady>[0]> = {}) {
	const ledger = overrides.ledger ?? createSpellcraftReadyLedger();
	const onApplied = vi.fn();
	const applyRemoteReady = vi.fn(() => ({ status: 'applied' as const }));
	const result = settleRemoteSpellcraftReady({
		message: remoteReady,
		connectionState: 'connected',
		expectedMatchId: 'match-a',
		expectedRemoteSide: 'second-mover',
		pokerState: state({ localId: 'alice-piece', remoteId: 'bob-piece' }),
		ledger,
		maxLedgerEntries: 8,
		...overrides,
	}, { applyRemoteReady, onApplied });
	return { result, ledger, onApplied, applyRemoteReady };
}

describe('remote Spellcraft Ready boundary', () => {
	it('commits dedup, sequence and post-apply effects only after engine applied', () => {
		const first = receive();
		expect(first.result).toEqual({ status: 'applied' });
		expect(first.ledger.lastIncomingSeq).toBe(0);
		expect(first.ledger.seen.has(remoteReady.decisionId)).toBe(true);
		expect(first.onApplied).toHaveBeenCalledTimes(1);

		const duplicate = receive({ ledger: first.ledger });
		expect(duplicate.result).toEqual({ status: 'duplicate' });
		expect(duplicate.applyRemoteReady).not.toHaveBeenCalled();
		expect(duplicate.onApplied).not.toHaveBeenCalled();
		expect(first.ledger.lastIncomingSeq).toBe(0);
	});

	it.each([
		['disconnected', { connectionState: 'reconnecting' }, 'disconnected'],
		['match spoof', { expectedMatchId: 'match-b' }, 'match_mismatch'],
		['combat mismatch', { pokerState: { ...state({ localId: 'alice-piece', remoteId: 'bob-piece' }), combatId: 'combat-b' } }, 'combat_mismatch'],
		['hand mismatch', { message: createSpellcraftReadyMessage({
			matchId: 'match-a', combatId: 'combat-a', handNumber: 1,
			actorSide: 'second-mover', actorPlayerId: 'bob-piece', seq: 0,
		}) }, 'hand_mismatch'],
		['wrong phase', { pokerState: { ...state({ localId: 'alice-piece', remoteId: 'bob-piece' }), phase: CombatPhase.FAITH } }, 'wrong_phase'],
		['actor side spoof', { expectedRemoteSide: 'first-mover' }, 'actor_side_mismatch'],
		['actor identity spoof', { pokerState: state({ localId: 'alice-piece', remoteId: 'mallory-piece' }) }, 'actor_identity_mismatch'],
	] as const)('rejects %s without committing', (_label, override, reason) => {
		const settled = receive(override);
		expect(settled.result).toEqual({ status: 'rejected', reason });
		expect(settled.applyRemoteReady).not.toHaveBeenCalled();
		expect(settled.onApplied).not.toHaveBeenCalled();
		expect(settled.ledger.lastIncomingSeq).toBe(-1);
		expect(settled.ledger.seen.size).toBe(0);
	});

	it('rejects stale and gap sequences without consuming them', () => {
		expect(receive({
			pokerState: { ...state({ localId: 'alice-piece', remoteId: 'bob-piece' }), handNumber: 1 },
		}).result).toEqual({ status: 'rejected', reason: 'stale_sequence' });

		const gapMessage = createSpellcraftReadyMessage({
			matchId: 'match-a', combatId: 'combat-a', handNumber: 1,
			actorSide: 'second-mover', actorPlayerId: 'bob-piece', seq: 1,
		});
		expect(receive({ message: gapMessage }).result).toEqual({ status: 'rejected', reason: 'sequence_gap' });
	});

	it('accepts the current hand after a ledger reload without creating a sequence gap', () => {
		const currentHand = { ...state({ localId: 'alice-piece', remoteId: 'bob-piece' }), handNumber: 3 };
		const message = createSpellcraftReadyMessage({
			matchId: 'match-a', combatId: 'combat-a', handNumber: 3,
			actorSide: 'second-mover', actorPlayerId: 'bob-piece', seq: 3,
		});
		const settled = receive({
			message,
			pokerState: currentHand,
			ledger: createSpellcraftReadyLedger(),
		});

		expect(settled.result).toEqual({ status: 'applied' });
		expect(settled.ledger.lastIncomingSeq).toBe(3);
	});

	it('leaves sequence and dedup untouched when the engine rejects', () => {
		const ledger = createSpellcraftReadyLedger();
		const onApplied = vi.fn();
		const result = settleRemoteSpellcraftReady({
			message: remoteReady,
			connectionState: 'connected',
			expectedMatchId: 'match-a',
			expectedRemoteSide: 'second-mover',
			pokerState: state({ localId: 'alice-piece', remoteId: 'bob-piece' }),
			ledger,
			maxLedgerEntries: 8,
		}, {
			applyRemoteReady: () => ({ status: 'rejected', reason: 'engine_rejected' }),
			onApplied,
		});
		expect(result).toEqual({ status: 'rejected', reason: 'engine_rejected' });
		expect(ledger).toMatchObject({ lastIncomingSeq: -1, order: [] });
		expect(ledger.seen.size).toBe(0);
		expect(onApplied).not.toHaveBeenCalled();
	});

	it('treats an engine already-ready replay as an ACK-able duplicate after reload', () => {
		const ledger = createSpellcraftReadyLedger();
		const onApplied = vi.fn();
		const result = settleRemoteSpellcraftReady({
			message: remoteReady,
			connectionState: 'connected',
			expectedMatchId: 'match-a',
			expectedRemoteSide: 'second-mover',
			pokerState: state({ localId: 'alice-piece', remoteId: 'bob-piece', remoteReady: true }),
			ledger,
			maxLedgerEntries: 8,
		}, {
			applyRemoteReady: () => ({ status: 'rejected', reason: 'already_ready' }),
			onApplied,
		});

		expect(result).toEqual({ status: 'duplicate' });
		expect(ledger.lastIncomingSeq).toBe(-1);
		expect(ledger.seen.size).toBe(0);
		expect(onApplied).not.toHaveBeenCalled();
	});

	it('ACKs the exact already-ready replay after the phase advanced', () => {
		const settled = receive({
			pokerState: {
				...state({ localId: 'alice-piece', remoteId: 'bob-piece', remoteReady: true }),
				phase: CombatPhase.FAITH,
			},
		});
		expect(settled.result).toEqual({ status: 'duplicate' });
		expect(settled.ledger.seen.size).toBe(0);
		expect(settled.onApplied).not.toHaveBeenCalled();
	});

	it('converges two independent peer views after each receives only the remote Ready', () => {
		const alice = state({ localId: 'alice-piece', remoteId: 'bob-piece', localReady: true });
		const bob = state({ localId: 'bob-piece', remoteId: 'alice-piece', localReady: true });
		const aliceReady = createSpellcraftReadyMessage({
			matchId: 'match-a', combatId: 'combat-a', handNumber: 0,
			actorSide: 'first-mover', actorPlayerId: 'alice-piece', seq: 0,
		});

		const receiveInto = (
			view: PokerCombatState,
			message: typeof remoteReady,
			expectedRemoteSide: 'first-mover' | 'second-mover',
		) => settleRemoteSpellcraftReady({
			message,
			connectionState: 'connected',
			expectedMatchId: 'match-a',
			expectedRemoteSide,
			pokerState: view,
			ledger: createSpellcraftReadyLedger(),
			maxLedgerEntries: 8,
		}, {
			applyRemoteReady: () => {
				view.opponent.isReady = true;
				return { status: 'applied' };
			},
			onApplied: () => undefined,
		});

		expect(receiveInto(alice, remoteReady, 'second-mover')).toEqual({ status: 'applied' });
		expect(receiveInto(bob, aliceReady, 'first-mover')).toEqual({ status: 'applied' });
		expect([alice.player.isReady, alice.opponent.isReady]).toEqual([true, true]);
		expect([bob.player.isReady, bob.opponent.isReady]).toEqual([true, true]);
	});
});
