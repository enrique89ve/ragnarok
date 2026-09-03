/**
 * Application-delivery receipts for critical P2P actions.
 *
 * A control-plane time-gate ACK only proves the referee forwarded a frame.
 * Gameplay commit requires the remote peer to apply the action and return
 * this receipt with the resulting state hash.
 */

import { z } from 'zod';

import { MAX_MATCH_ID_LENGTH } from '../p2pAvailability';
import { Hash256Schema } from './integrity';

export const P2P_DELIVERY_PROTOCOL_VERSION = 1 as const;
export const ACTION_APPLIED_TYPE = 'action_applied_v1' as const;
export const P2P_ACTION_APPLIED_WAIT_TIMEOUT_MS = 8_000;

const MatchIdSchema = z.string().min(1).max(MAX_MATCH_ID_LENGTH);
const TransportEpochSchema = z.number().int().min(1).max(0xffff_ffff);

export const ActionAppliedSchema = z.object({
	type: z.literal(ACTION_APPLIED_TYPE),
	protocolVersion: z.literal(P2P_DELIVERY_PROTOCOL_VERSION),
	matchId: MatchIdSchema,
	transportEpoch: TransportEpochSchema,
	decisionId: z.string().min(1).max(256),
	seq: z.number().int().nonnegative(),
	resultingStateHash: Hash256Schema,
}).strict();

export type ActionAppliedMessage = z.infer<typeof ActionAppliedSchema>;

export function parseActionAppliedMessage(input: unknown): ActionAppliedMessage | null {
	const parsed = ActionAppliedSchema.safeParse(input);
	return parsed.success ? parsed.data : null;
}

export function buildActionAppliedMessage(input: {
	readonly matchId: string;
	readonly transportEpoch: number;
	readonly decisionId: string;
	readonly seq: number;
	readonly resultingStateHash: string;
}): ActionAppliedMessage {
	return ActionAppliedSchema.parse({
		type: ACTION_APPLIED_TYPE,
		protocolVersion: P2P_DELIVERY_PROTOCOL_VERSION,
		matchId: input.matchId,
		transportEpoch: input.transportEpoch,
		decisionId: input.decisionId,
		seq: input.seq,
		resultingStateHash: input.resultingStateHash,
	});
}
