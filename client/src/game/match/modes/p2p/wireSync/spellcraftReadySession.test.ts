import { describe, expect, it } from 'vitest';
import {
	createSpellcraftReadyAckMessage,
	createSpellcraftReadyMessage,
} from '@shared/p2p-wire/spellcraft';
import { CombatPhase, type PokerCombatState } from '../../../../types/PokerCombatTypes';
import {
	applySpellcraftReadyAck,
	claimSpellcraftClose,
	commitSpellcraftTranscriptPair,
	createSpellcraftReadySession,
	markSpellcraftTranscriptCommitted,
	shouldReemitSpellcraftReady,
	stageAppliedSpellcraftReady,
} from './spellcraftReadySession';
import {
	createSpellcraftReadyLedger,
	settleRemoteSpellcraftReady,
} from './spellcraftReadyBoundary';

const aliceReady = createSpellcraftReadyMessage({
	matchId: 'match-a', combatId: 'combat-a', handNumber: 0,
	actorSide: 'first-mover', actorPlayerId: 'alice', seq: 0,
});
const bobReady = createSpellcraftReadyMessage({
	matchId: 'match-a', combatId: 'combat-a', handNumber: 0,
	actorSide: 'second-mover', actorPlayerId: 'bob', seq: 0,
});

function state(localReady: boolean, remoteReady: boolean): PokerCombatState {
	return {
		combatId: 'combat-a', handNumber: 0, phase: CombatPhase.SPELL_PET,
		player: { playerId: 'alice', isReady: localReady },
		opponent: { playerId: 'bob', isReady: remoteReady },
	} as PokerCombatState;
}

describe('Spellcraft Ready ACK and transcript session', () => {
	it('materializes the same canonical transcript order regardless of arrival order', () => {
		const alice = createSpellcraftReadySession();
		const bob = createSpellcraftReadySession();
		expect(stageAppliedSpellcraftReady(alice, aliceReady)).toBeNull();
		const alicePair = stageAppliedSpellcraftReady(alice, bobReady);
		expect(stageAppliedSpellcraftReady(bob, bobReady)).toBeNull();
		const bobPair = stageAppliedSpellcraftReady(bob, aliceReady);
		expect(alicePair?.map(message => message.actorSide)).toEqual(['first-mover', 'second-mover']);
		expect(bobPair?.map(message => message.actorSide)).toEqual(['first-mover', 'second-mover']);

		markSpellcraftTranscriptCommitted(alice, aliceReady.windowKey);
		expect(stageAppliedSpellcraftReady(alice, bobReady)).toBeNull();
	});

	it('commits the canonical pair exactly once and fails closed on a partial historical pair', () => {
		const session = createSpellcraftReadySession();
		const pair = [aliceReady, bobReady] as const;
		const recorded: string[] = [];
		expect(commitSpellcraftTranscriptPair({
			session,
			pair,
			alreadyRecordedDecisionIds: new Set(),
			record: message => recorded.push(message.actorSide),
		})).toBe('committed');
		expect(recorded).toEqual(['first-mover', 'second-mover']);
		expect(commitSpellcraftTranscriptPair({
			session,
			pair,
			alreadyRecordedDecisionIds: new Set(),
			record: message => recorded.push(message.actorSide),
		})).toBe('already_committed');
		expect(recorded).toEqual(['first-mover', 'second-mover']);

		const reloaded = createSpellcraftReadySession();
		expect(commitSpellcraftTranscriptPair({
			session: reloaded,
			pair,
			alreadyRecordedDecisionIds: new Set([aliceReady.decisionId]),
			record: message => recorded.push(message.actorSide),
		})).toBe('incomplete_existing_transcript');
		expect(recorded).toEqual(['first-mover', 'second-mover']);
	});

	it('reemits after a lost Ready or ACK and closes exactly once after ACK', () => {
		const session = createSpellcraftReadySession();
		const bothReady = state(true, true);
		stageAppliedSpellcraftReady(session, aliceReady);
		const pair = stageAppliedSpellcraftReady(session, bobReady);
		expect(pair).not.toBeNull();
		commitSpellcraftTranscriptPair({
			session,
			pair: pair!,
			alreadyRecordedDecisionIds: new Set(),
			record: () => undefined,
		});
		expect(shouldReemitSpellcraftReady({
			session, localReady: aliceReady, pokerState: bothReady, connectionState: 'connected',
		})).toBe(true);
		expect(claimSpellcraftClose({ session, localReady: aliceReady, pokerState: bothReady })).toBe(false);

		const ack = createSpellcraftReadyAckMessage({ ready: aliceReady, acknowledgerSide: 'second-mover' });
		expect(applySpellcraftReadyAck({
			session, ack, localReady: aliceReady, localSide: 'first-mover',
			connectionState: 'connected', pokerState: bothReady,
		})).toEqual({ status: 'applied' });
		expect(shouldReemitSpellcraftReady({
			session, localReady: aliceReady, pokerState: bothReady, connectionState: 'connected',
		})).toBe(false);
		expect(claimSpellcraftClose({ session, localReady: aliceReady, pokerState: bothReady })).toBe(true);
		expect(claimSpellcraftClose({ session, localReady: aliceReady, pokerState: bothReady })).toBe(false);
		expect(applySpellcraftReadyAck({
			session, ack, localReady: aliceReady, localSide: 'first-mover',
			connectionState: 'connected', pokerState: { ...bothReady, phase: CombatPhase.FAITH },
		})).toEqual({ status: 'duplicate' });
	});

	it('reconstructs both Ready messages after reload without changing transcript order', () => {
		const reloaded = createSpellcraftReadySession();
		const pair = [aliceReady, bobReady]
			.map(message => stageAppliedSpellcraftReady(reloaded, message))
			.find((candidate) => candidate !== null);
		expect(pair?.map(message => message.decisionId)).toEqual([
			aliceReady.decisionId,
			bobReady.decisionId,
		]);
	});

	it('converges two independent peers through lost Ready, lost ACK and duplicate post-phase', () => {
		type Side = 'first-mover' | 'second-mover';
		type Peer = {
			side: Side;
			state: PokerCombatState;
			session: ReturnType<typeof createSpellcraftReadySession>;
			ledger: ReturnType<typeof createSpellcraftReadyLedger>;
			transcript: string[];
			closes: number;
		};
		const peer = (side: Side, localId: string, remoteId: string): Peer => ({
			side,
			state: state(false, false),
			session: createSpellcraftReadySession(),
			ledger: createSpellcraftReadyLedger(),
			transcript: [],
			closes: 0,
		});
		const alice = peer('first-mover', 'alice', 'bob');
		alice.state.player.playerId = 'alice';
		alice.state.opponent.playerId = 'bob';
		const bob = peer('second-mover', 'bob', 'alice');
		bob.state.player.playerId = 'bob';
		bob.state.opponent.playerId = 'alice';
		const localReady = (view: Peer) => createSpellcraftReadyMessage({
			matchId: 'match-a', combatId: view.state.combatId, handNumber: view.state.handNumber,
			actorSide: view.side, actorPlayerId: view.state.player.playerId, seq: view.state.handNumber,
		});
		const stage = (view: Peer, message: SpellcraftReadyMessage) => {
			const pair = stageAppliedSpellcraftReady(view.session, message);
			if (!pair) return;
			commitSpellcraftTranscriptPair({
				session: view.session,
				pair,
				alreadyRecordedDecisionIds: new Set(view.transcript),
				record: ready => view.transcript.push(ready.decisionId),
			});
		};
		const receiveReady = (view: Peer, message: SpellcraftReadyMessage) => {
			const result = settleRemoteSpellcraftReady({
				message, connectionState: 'connected', expectedMatchId: 'match-a',
				expectedRemoteSide: view.side === 'first-mover' ? 'second-mover' : 'first-mover',
				pokerState: view.state, ledger: view.ledger, maxLedgerEntries: 8,
			}, {
				applyRemoteReady: () => {
					if (view.state.opponent.isReady) return { status: 'rejected' as const, reason: 'already_ready' as const };
					view.state.opponent.isReady = true;
					return { status: 'applied' as const };
				},
				onApplied: () => stage(view, message),
			});
			if (result.status !== 'applied' && result.status !== 'duplicate') return null;
			const ack = createSpellcraftReadyAckMessage({ ready: message, acknowledgerSide: view.side });
			if (claimSpellcraftClose({
				session: view.session,
				localReady: localReady(view),
				pokerState: view.state,
			})) view.closes += 1;
			return ack;
		};
		const receiveAck = (view: Peer, ack: NonNullable<ReturnType<typeof receiveReady>>) => {
			const ready = localReady(view);
			const result = applySpellcraftReadyAck({
				session: view.session, ack, localReady: ready, localSide: view.side,
				connectionState: 'connected', pokerState: view.state,
			});
			if (result.status === 'applied' && claimSpellcraftClose({
				session: view.session, localReady: ready, pokerState: view.state,
			})) view.closes += 1;
		};

		for (const view of [alice, bob]) {
			view.state.player.isReady = true;
			stage(view, localReady(view));
		}
		// Alice's first Ready is lost. Bob's arrives and its ACK reaches Bob.
		const bobAck = receiveReady(alice, localReady(bob));
		expect(bobAck).not.toBeNull();
		receiveAck(bob, bobAck!);
		expect(shouldReemitSpellcraftReady({
			session: alice.session, localReady: localReady(alice), pokerState: alice.state,
			connectionState: 'connected',
		})).toBe(true);

		// Reemitted Alice Ready applies, but its first ACK is lost.
		const lostAck = receiveReady(bob, localReady(alice));
		expect(lostAck).not.toBeNull();
		expect(bob.closes).toBe(1);
		bob.state.phase = CombatPhase.FAITH;
		// Duplicate post-phase is still ACKed; Alice closes exactly once.
		const retryAck = receiveReady(bob, localReady(alice));
		expect(retryAck).not.toBeNull();
		receiveAck(alice, retryAck!);
		receiveAck(alice, retryAck!);
		expect(alice.closes).toBe(1);
		expect(bob.closes).toBe(1);
		expect(alice.transcript).toEqual([aliceReady.decisionId, bobReady.decisionId]);
		expect(bob.transcript).toEqual(alice.transcript);
	});
});
