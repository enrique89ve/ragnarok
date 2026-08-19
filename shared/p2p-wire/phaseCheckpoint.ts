/**
 * Deterministic phase-boundary checkpoint contract.
 *
 * The relay compares two opaque client-computed state roots. It never imports
 * gameplay, card, poker, chess, effect, or presentation code. A checkpoint is
 * committed only when both authenticated room peers submit byte-identical
 * proposals for the same epoch.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { z } from 'zod';

import { Hash256Schema, type Hash256 } from './integrity';

export const PHASE_CHECKPOINT_PROTOCOL_VERSION = 1 as const;
export const PHASE_CHECKPOINT_SCOPE = 'round-boundary' as const;
export const ZERO_PHASE_CHECKPOINT_ID = Hash256Schema.parse('0'.repeat(64));

export const PhaseCheckpointPhaseSchema = z.enum([
	'chess',
	'poker_combat',
	'game_over',
]);

export type PhaseCheckpointPhase = z.infer<typeof PhaseCheckpointPhaseSchema>;

const MatchIdSchema = z.string().min(1).max(64);
const RoomIdSchema = z.string().min(1).max(128);
const CheckpointEpochSchema = z.number().int().min(1).max(0xffff_ffff);

export const PhaseCheckpointProposalSchema = z.object({
	type: z.literal('phase_checkpoint_propose_v1'),
	protocolVersion: z.literal(PHASE_CHECKPOINT_PROTOCOL_VERSION),
	scope: z.literal(PHASE_CHECKPOINT_SCOPE),
	matchId: MatchIdSchema,
	epoch: CheckpointEpochSchema,
	fromPhase: PhaseCheckpointPhaseSchema,
	toPhase: PhaseCheckpointPhaseSchema,
	previousCheckpointId: Hash256Schema,
	stateRoot: Hash256Schema,
}).strict();

export type PhaseCheckpointProposal = z.infer<typeof PhaseCheckpointProposalSchema>;

export const PhaseCheckpointCommitSchema = z.object({
	type: z.literal('phase_checkpoint_commit_v1'),
	protocolVersion: z.literal(PHASE_CHECKPOINT_PROTOCOL_VERSION),
	scope: z.literal(PHASE_CHECKPOINT_SCOPE),
	roomId: RoomIdSchema,
	matchId: MatchIdSchema,
	epoch: CheckpointEpochSchema,
	fromPhase: PhaseCheckpointPhaseSchema,
	toPhase: PhaseCheckpointPhaseSchema,
	previousCheckpointId: Hash256Schema,
	stateRoot: Hash256Schema,
	checkpointId: Hash256Schema,
}).strict();

export type PhaseCheckpointCommit = z.infer<typeof PhaseCheckpointCommitSchema>;

export const PhaseCheckpointDisputeReasonSchema = z.enum([
	'invalid_transition',
	'epoch_gap',
	'chain_mismatch',
	'peer_mismatch',
	'equivocation',
	'room_disputed',
]);

export type PhaseCheckpointDisputeReason = z.infer<typeof PhaseCheckpointDisputeReasonSchema>;

/** Observer-only: a root mismatch is not a winner. Clients may resubmit. */
export function isRetryablePhaseCheckpointDispute(
	reason: PhaseCheckpointDisputeReason,
): boolean {
	return reason === 'peer_mismatch' || reason === 'equivocation';
}

export const PhaseCheckpointDisputeSchema = z.object({
	type: z.literal('phase_checkpoint_dispute_v1'),
	protocolVersion: z.literal(PHASE_CHECKPOINT_PROTOCOL_VERSION),
	scope: z.literal(PHASE_CHECKPOINT_SCOPE),
	roomId: RoomIdSchema,
	matchId: MatchIdSchema,
	epoch: CheckpointEpochSchema,
	reason: PhaseCheckpointDisputeReasonSchema,
	expectedEpoch: CheckpointEpochSchema.optional(),
	lastCommittedCheckpointId: Hash256Schema.optional(),
}).strict();

export type PhaseCheckpointDispute = z.infer<typeof PhaseCheckpointDisputeSchema>;

export const PhaseCheckpointServerMessageSchema = z.discriminatedUnion('type', [
	PhaseCheckpointCommitSchema,
	PhaseCheckpointDisputeSchema,
]);

export type PhaseCheckpointServerMessage = z.infer<typeof PhaseCheckpointServerMessageSchema>;

const ALLOWED_TRANSITIONS: ReadonlySet<string> = new Set([
	'chess:poker_combat',
	'poker_combat:chess',
	'chess:game_over',
	'poker_combat:game_over',
]);

const ENCODER = new TextEncoder();

export function isAllowedPhaseCheckpointTransition(
	fromPhase: PhaseCheckpointPhase,
	toPhase: PhaseCheckpointPhase,
): boolean {
	return ALLOWED_TRANSITIONS.has(`${fromPhase}:${toPhase}`);
}

export function computePhaseCheckpointId(
	input: {
		readonly roomId: string;
		readonly proposal: PhaseCheckpointProposal;
	},
): Hash256 {
	const roomId = RoomIdSchema.parse(input.roomId);
	const parsed = PhaseCheckpointProposalSchema.parse(input.proposal);
	const canonicalTuple = JSON.stringify([
		'ragnarok-phase-checkpoint',
		PHASE_CHECKPOINT_PROTOCOL_VERSION,
		PHASE_CHECKPOINT_SCOPE,
		roomId,
		parsed.matchId,
		parsed.epoch,
		parsed.fromPhase,
		parsed.toPhase,
		parsed.previousCheckpointId,
		parsed.stateRoot,
	]);
	return Hash256Schema.parse(bytesToHex(sha256(ENCODER.encode(canonicalTuple))));
}

export function buildPhaseCheckpointCommit(
	input: {
		readonly roomId: string;
		readonly proposal: PhaseCheckpointProposal;
	},
): PhaseCheckpointCommit {
	const roomId = RoomIdSchema.parse(input.roomId);
	const { proposal } = input;
	return PhaseCheckpointCommitSchema.parse({
		type: 'phase_checkpoint_commit_v1',
		protocolVersion: PHASE_CHECKPOINT_PROTOCOL_VERSION,
		scope: PHASE_CHECKPOINT_SCOPE,
		roomId,
		matchId: proposal.matchId,
		epoch: proposal.epoch,
		fromPhase: proposal.fromPhase,
		toPhase: proposal.toPhase,
		previousCheckpointId: proposal.previousCheckpointId,
		stateRoot: proposal.stateRoot,
		checkpointId: computePhaseCheckpointId({ roomId, proposal }),
	});
}

export function samePhaseCheckpointProposal(
	left: PhaseCheckpointProposal,
	right: PhaseCheckpointProposal,
): boolean {
	return left.matchId === right.matchId
		&& left.epoch === right.epoch
		&& left.fromPhase === right.fromPhase
		&& left.toPhase === right.toPhase
		&& left.previousCheckpointId === right.previousCheckpointId
		&& left.stateRoot === right.stateRoot;
}

export function tryParsePhaseCheckpointProposal(
	input: unknown,
): PhaseCheckpointProposal | null {
	const parsed = PhaseCheckpointProposalSchema.safeParse(input);
	return parsed.success ? parsed.data : null;
}

export function tryParsePhaseCheckpointServerMessage(
	input: unknown,
): PhaseCheckpointServerMessage | null {
	const parsed = PhaseCheckpointServerMessageSchema.safeParse(input);
	return parsed.success ? parsed.data : null;
}
