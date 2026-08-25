import type {
	SpellcraftActorSide,
	SpellcraftReadyAckMessage,
	SpellcraftReadyMessage,
} from '@shared/p2p-wire/spellcraft';
import { CombatPhase, type PokerCombatState } from '../../../../types/PokerCombatTypes';

type WindowReadyPair = Partial<Record<SpellcraftActorSide, SpellcraftReadyMessage>>;

export type SpellcraftReadySession = {
	readonly readyByWindow: Map<string, WindowReadyPair>;
	readonly transcriptCommittedWindows: Set<string>;
	readonly acknowledgedLocalDecisionIds: Set<string>;
	readonly closedWindows: Set<string>;
};

export function createSpellcraftReadySession(): SpellcraftReadySession {
	return {
		readyByWindow: new Map(),
		transcriptCommittedWindows: new Set(),
		acknowledgedLocalDecisionIds: new Set(),
		closedWindows: new Set(),
	};
}

export function resetSpellcraftReadySession(session: SpellcraftReadySession): void {
	session.readyByWindow.clear();
	session.transcriptCommittedWindows.clear();
	session.acknowledgedLocalDecisionIds.clear();
	session.closedWindows.clear();
}

export function stageAppliedSpellcraftReady(
	session: SpellcraftReadySession,
	message: SpellcraftReadyMessage,
): readonly [SpellcraftReadyMessage, SpellcraftReadyMessage] | null {
	if (session.transcriptCommittedWindows.has(message.windowKey)) return null;
	const staged = session.readyByWindow.get(message.windowKey) ?? {};
	staged[message.actorSide] = message;
	session.readyByWindow.set(message.windowKey, staged);
	const first = staged['first-mover'];
	const second = staged['second-mover'];
	return first && second ? [first, second] : null;
}

export function markSpellcraftTranscriptCommitted(
	session: SpellcraftReadySession,
	windowKey: string,
): void {
	session.transcriptCommittedWindows.add(windowKey);
}

export function commitSpellcraftTranscriptPair(input: {
	readonly session: SpellcraftReadySession;
	readonly pair: readonly [SpellcraftReadyMessage, SpellcraftReadyMessage];
	readonly alreadyRecordedDecisionIds: ReadonlySet<string>;
	readonly record: (message: SpellcraftReadyMessage) => void;
}): 'committed' | 'already_committed' | 'incomplete_existing_transcript' {
	const [first, second] = input.pair;
	if (input.session.transcriptCommittedWindows.has(first.windowKey)) {
		return 'already_committed';
	}
	const firstExists = input.alreadyRecordedDecisionIds.has(first.decisionId);
	const secondExists = input.alreadyRecordedDecisionIds.has(second.decisionId);
	if (firstExists !== secondExists) {
		// Never append around a partial historical pair: doing so would make the
		// transcript order depend on which peer/reload observed the failure.
		return 'incomplete_existing_transcript';
	}
	if (!firstExists) {
		input.record(first);
		input.record(second);
	}
	markSpellcraftTranscriptCommitted(input.session, first.windowKey);
	return firstExists ? 'already_committed' : 'committed';
}

export type SpellcraftAckResult =
	| { readonly status: 'applied' }
	| { readonly status: 'duplicate' }
	| { readonly status: 'rejected'; readonly reason: 'disconnected' | 'identity_mismatch' | 'state_mismatch' };

export function applySpellcraftReadyAck(input: {
	readonly session: SpellcraftReadySession;
	readonly ack: SpellcraftReadyAckMessage;
	readonly localReady: SpellcraftReadyMessage;
	readonly localSide: SpellcraftActorSide;
	readonly connectionState: string;
	readonly pokerState: PokerCombatState | null;
}): SpellcraftAckResult {
	if (input.connectionState !== 'connected') return { status: 'rejected', reason: 'disconnected' };
	if (input.session.acknowledgedLocalDecisionIds.has(input.ack.readyDecisionId)) {
		return { status: 'duplicate' };
	}
	const expectedRemoteSide = input.localSide === 'first-mover' ? 'second-mover' : 'first-mover';
	if (
		input.ack.matchId !== input.localReady.matchId
		|| input.ack.combatId !== input.localReady.combatId
		|| input.ack.handNumber !== input.localReady.handNumber
		|| input.ack.windowKey !== input.localReady.windowKey
		|| input.ack.readyActorSide !== input.localSide
		|| input.ack.acknowledgerSide !== expectedRemoteSide
		|| input.ack.readyDecisionId !== input.localReady.decisionId
	) {
		return { status: 'rejected', reason: 'identity_mismatch' };
	}
	if (
		!input.pokerState
		|| input.pokerState.phase !== CombatPhase.SPELL_PET
		|| input.pokerState.combatId !== input.localReady.combatId
		|| input.pokerState.handNumber !== input.localReady.handNumber
		|| !input.pokerState.player.isReady
	) {
		return { status: 'rejected', reason: 'state_mismatch' };
	}
	input.session.acknowledgedLocalDecisionIds.add(input.ack.readyDecisionId);
	return { status: 'applied' };
}

export function claimSpellcraftClose(input: {
	readonly session: SpellcraftReadySession;
	readonly localReady: SpellcraftReadyMessage;
	readonly pokerState: PokerCombatState | null;
}): boolean {
	const state = input.pokerState;
	if (
		!state
		|| state.phase !== CombatPhase.SPELL_PET
		|| state.combatId !== input.localReady.combatId
		|| state.handNumber !== input.localReady.handNumber
		|| !state.player.isReady
		|| !state.opponent.isReady
		|| !input.session.transcriptCommittedWindows.has(input.localReady.windowKey)
		|| !input.session.acknowledgedLocalDecisionIds.has(input.localReady.decisionId)
		|| input.session.closedWindows.has(input.localReady.windowKey)
	) {
		return false;
	}
	input.session.closedWindows.add(input.localReady.windowKey);
	return true;
}

export function shouldReemitSpellcraftReady(input: {
	readonly session: SpellcraftReadySession;
	readonly localReady: SpellcraftReadyMessage;
	readonly pokerState: PokerCombatState | null;
	readonly connectionState: string;
}): boolean {
	return input.connectionState === 'connected'
		&& input.pokerState?.phase === CombatPhase.SPELL_PET
		&& input.pokerState.combatId === input.localReady.combatId
		&& input.pokerState.handNumber === input.localReady.handNumber
		&& input.pokerState.player.isReady
		&& !input.session.acknowledgedLocalDecisionIds.has(input.localReady.decisionId);
}
