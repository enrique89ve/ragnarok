/**
 * Server-notarized poker turn clock contract.
 *
 * The relay certifies when a logical poker turn started and when it expires.
 * It never imports gameplay, cards, HP, mana, betting, or presentation code.
 * A clock is committed only when both authenticated room peers submit the
 * same turn identity. Client timestamps and durations are ignored.
 */

import { z } from 'zod';

import type { PokerActionOrigin } from './combat';
import {
	DEFAULT_POKER_TURN_DURATION_MS,
	buildPokerTurnId,
	isTimedPokerDecisionPhase,
	type TimedPokerDecisionPhase,
} from './pokerTurnClock';

export const POKER_TIME_NOTARY_PROTOCOL_VERSION = 1 as const;
export const POKER_TIME_NOTARY_MISMATCH_STRIKE_LIMIT = 3;

const CombatIdSchema = z.string().min(1).max(128);
const TurnIdSchema = z.string().min(1).max(256);
const ActorIdSchema = z.string().min(1).max(128);
const RoomIdSchema = z.string().min(1).max(128);
const MatchIdSchema = z.string().min(1).max(64);
const NonNegativeInt = z.number().int().nonnegative();
const ProposalDurationMs = z.number().int().min(1).max(300_000);

export const TimedPokerDecisionPhaseSchema = z.enum([
	'pre_flop',
	'faith',
	'foresight',
	'destiny',
]);

export const PokerTurnClockProposalSchema = z.object({
	type: z.literal('poker_turn_started'),
	combatId: CombatIdSchema,
	turnId: TurnIdSchema,
	phase: TimedPokerDecisionPhaseSchema,
	activePlayerId: ActorIdSchema,
	actionsThisRound: NonNegativeInt,
	durationMs: ProposalDurationMs,
	remainingMs: ProposalDurationMs.optional(),
	sentAtMs: NonNegativeInt,
}).strict();

export type PokerTurnClockProposal = z.infer<typeof PokerTurnClockProposalSchema>;

export type PokerTurnClockIdentity = Readonly<{
	combatId: string;
	turnId: string;
	phase: TimedPokerDecisionPhase;
	activePlayerId: string;
	actionsThisRound: number;
}>;

export const PokerTurnNotaryCommitSchema = z.object({
	type: z.literal('poker_turn_notary_commit_v1'),
	protocolVersion: z.literal(POKER_TIME_NOTARY_PROTOCOL_VERSION),
	roomId: RoomIdSchema,
	matchId: MatchIdSchema,
	combatId: CombatIdSchema,
	turnId: TurnIdSchema,
	phase: TimedPokerDecisionPhaseSchema,
	activePlayerId: ActorIdSchema,
	actionsThisRound: NonNegativeInt,
	durationMs: z.literal(DEFAULT_POKER_TURN_DURATION_MS),
	serverStartedAtMs: NonNegativeInt,
	serverDeadlineAtMs: NonNegativeInt,
}).strict();

export type PokerTurnNotaryCommit = z.infer<typeof PokerTurnNotaryCommitSchema>;

export const PokerTurnNotaryDisputeReasonSchema = z.enum([
	'peer_mismatch',
	'equivocation',
	'invalid_identity',
	'room_disputed',
]);

export type PokerTurnNotaryDisputeReason = z.infer<typeof PokerTurnNotaryDisputeReasonSchema>;

export function isRetryablePokerTurnNotaryDispute(
	reason: PokerTurnNotaryDisputeReason,
): boolean {
	return reason === 'peer_mismatch' || reason === 'equivocation';
}

export const PokerTurnNotaryDisputeSchema = z.object({
	type: z.literal('poker_turn_notary_dispute_v1'),
	protocolVersion: z.literal(POKER_TIME_NOTARY_PROTOCOL_VERSION),
	roomId: RoomIdSchema,
	matchId: MatchIdSchema,
	turnId: TurnIdSchema,
	reason: PokerTurnNotaryDisputeReasonSchema,
}).strict();

export type PokerTurnNotaryDispute = z.infer<typeof PokerTurnNotaryDisputeSchema>;

export const PokerTurnNotaryServerMessageSchema = z.discriminatedUnion('type', [
	PokerTurnNotaryCommitSchema,
	PokerTurnNotaryDisputeSchema,
]);

export type PokerTurnNotaryServerMessage = z.infer<typeof PokerTurnNotaryServerMessageSchema>;

const PokerActionTimeGateSchema = z.object({
	type: z.literal('poker_action'),
	origin: z.enum(['player', 'timeout']),
	turnId: TurnIdSchema,
}).passthrough();

export type PokerActionTimeGate = Readonly<{
	origin: PokerActionOrigin;
	turnId: string;
}>;

export function samePokerTurnClockIdentity(
	left: PokerTurnClockIdentity,
	right: PokerTurnClockIdentity,
): boolean {
	return left.combatId === right.combatId
		&& left.turnId === right.turnId
		&& left.phase === right.phase
		&& left.activePlayerId === right.activePlayerId
		&& left.actionsThisRound === right.actionsThisRound;
}

export function pokerTurnClockIdentityFromProposal(
	proposal: PokerTurnClockProposal,
): PokerTurnClockIdentity | null {
	if (!isTimedPokerDecisionPhase(proposal.phase)) return null;
	const identity: PokerTurnClockIdentity = {
		combatId: proposal.combatId,
		turnId: proposal.turnId,
		phase: proposal.phase,
		activePlayerId: proposal.activePlayerId,
		actionsThisRound: proposal.actionsThisRound,
	};
	return buildPokerTurnId(identity) === identity.turnId ? identity : null;
}

export function buildPokerTurnNotaryCommit(input: {
	readonly roomId: string;
	readonly identity: PokerTurnClockIdentity;
	readonly serverStartedAtMs: number;
	readonly serverDeadlineAtMs: number;
}): PokerTurnNotaryCommit {
	return PokerTurnNotaryCommitSchema.parse({
		type: 'poker_turn_notary_commit_v1',
		protocolVersion: POKER_TIME_NOTARY_PROTOCOL_VERSION,
		roomId: input.roomId,
		matchId: input.roomId,
		combatId: input.identity.combatId,
		turnId: input.identity.turnId,
		phase: input.identity.phase,
		activePlayerId: input.identity.activePlayerId,
		actionsThisRound: input.identity.actionsThisRound,
		durationMs: DEFAULT_POKER_TURN_DURATION_MS,
		serverStartedAtMs: input.serverStartedAtMs,
		serverDeadlineAtMs: input.serverDeadlineAtMs,
	});
}

export function buildPokerTurnNotaryDispute(input: {
	readonly roomId: string;
	readonly turnId: string;
	readonly reason: PokerTurnNotaryDisputeReason;
}): PokerTurnNotaryDispute {
	return PokerTurnNotaryDisputeSchema.parse({
		type: 'poker_turn_notary_dispute_v1',
		protocolVersion: POKER_TIME_NOTARY_PROTOCOL_VERSION,
		roomId: input.roomId,
		matchId: input.roomId,
		turnId: input.turnId,
		reason: input.reason,
	});
}

export function tryParsePokerTurnClockProposal(
	input: unknown,
): PokerTurnClockProposal | null {
	const parsed = PokerTurnClockProposalSchema.safeParse(input);
	return parsed.success ? parsed.data : null;
}

export function tryParsePokerTurnNotaryServerMessage(
	input: unknown,
): PokerTurnNotaryServerMessage | null {
	const parsed = PokerTurnNotaryServerMessageSchema.safeParse(input);
	return parsed.success ? parsed.data : null;
}

export function tryParsePokerActionTimeGate(
	input: unknown,
): PokerActionTimeGate | null {
	const parsed = PokerActionTimeGateSchema.safeParse(input);
	if (!parsed.success) return null;
	return {
		origin: parsed.data.origin,
		turnId: parsed.data.turnId,
	};
}
