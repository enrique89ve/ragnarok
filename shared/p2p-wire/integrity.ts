/**
 * P2P transition-integrity primitives.
 *
 * Version 1 deliberately covers the two domains already canonical on the
 * chess wire: chess and cards. It is not a whole-match commitment yet; poker,
 * round-flow and combat-handoff roots will be added as explicit protocol
 * versions instead of silently widening the meaning of an existing hash.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { z } from 'zod';

import { canonicalStringify } from '../protocol-core/hash';
import { MAX_MATCH_ID_LENGTH } from '../p2pAvailability';

export const CHESS_INTEGRITY_PROTOCOL_VERSION = 1 as const;
export const CHESS_INTEGRITY_SCOPE = 'chess+cards' as const;

export const Hash256Schema = z
	.string()
	.regex(/^[a-f0-9]{64}$/)
	.brand<'Hash256'>();

export type Hash256 = z.infer<typeof Hash256Schema>;

const MatchIdSchema = z.string().min(1).max(MAX_MATCH_ID_LENGTH);
const CommandIdSchema = z.string().uuid();
const TransitionSequenceSchema = z.number().int().min(0).max(0xffff_ffff);
const ENCODER = new TextEncoder();

export function parseHash256(input: unknown): Hash256 | null {
	const parsed = Hash256Schema.safeParse(input);
	return parsed.success ? parsed.data : null;
}

export type ChessIntegrityRootInput = Readonly<{
	matchId: string;
	chessHash: Hash256;
	cardsHash: Hash256;
}>;

/**
 * Compute a deterministic root over the currently covered domains.
 *
 * A fixed-position JSON tuple avoids key-order ambiguity and delimiter
 * collisions. Every field is already runtime-validated or a protocol
 * literal, so identical inputs produce byte-identical payloads.
 */
export function computeChessIntegrityRoot(input: ChessIntegrityRootInput): Hash256 {
	const matchId = MatchIdSchema.parse(input.matchId);
	const canonicalTuple = JSON.stringify([
		'ragnarok-transition-integrity',
		CHESS_INTEGRITY_PROTOCOL_VERSION,
		CHESS_INTEGRITY_SCOPE,
		matchId,
		input.chessHash,
		input.cardsHash,
	]);
	const digest = bytesToHex(sha256(ENCODER.encode(canonicalTuple)));
	return Hash256Schema.parse(digest);
}

export type TransitionIntentHashInput = Readonly<{
	matchId: string;
	seq: number;
	commandId: string;
	prevRoot: Hash256;
	action: unknown;
}>;

export function computeTransitionIntentHash(input: TransitionIntentHashInput): Hash256 {
	const matchId = MatchIdSchema.parse(input.matchId);
	const seq = TransitionSequenceSchema.parse(input.seq);
	const commandId = CommandIdSchema.parse(input.commandId);
	const canonicalTuple = canonicalStringify([
		'ragnarok-transition-intent',
		CHESS_INTEGRITY_PROTOCOL_VERSION,
		CHESS_INTEGRITY_SCOPE,
		matchId,
		seq,
		commandId,
		input.prevRoot,
		input.action,
	]);
	const digest = bytesToHex(sha256(ENCODER.encode(canonicalTuple)));
	return Hash256Schema.parse(digest);
}

export const TransitionRejectReasonSchema = z.enum([
	'no-such-piece',
	'wrong-turn',
	'illegal-target',
	'not-promotable',
	'game-over',
	'integrity-root-unavailable',
]);

export type TransitionRejectReason = z.infer<typeof TransitionRejectReasonSchema>;

const TransitionReceiptBaseSchema = z.object({
	type: z.literal('transition_receipt_v1'),
	protocolVersion: z.literal(CHESS_INTEGRITY_PROTOCOL_VERSION),
	scope: z.literal(CHESS_INTEGRITY_SCOPE),
	matchId: MatchIdSchema,
	seq: TransitionSequenceSchema,
	commandId: CommandIdSchema,
	intentHash: Hash256Schema,
}).strict();

const AppliedTransitionReceiptSchema = TransitionReceiptBaseSchema.extend({
	status: z.literal('applied'),
	prevRoot: Hash256Schema,
	nextRoot: Hash256Schema,
}).strict();

const RejectedTransitionReceiptSchema = TransitionReceiptBaseSchema.extend({
	status: z.literal('rejected'),
	currentRoot: Hash256Schema,
	reason: TransitionRejectReasonSchema,
}).strict();

export const TransitionReceiptMessageSchema = z.discriminatedUnion('status', [
	AppliedTransitionReceiptSchema,
	RejectedTransitionReceiptSchema,
]);

export type TransitionReceiptMessage = z.infer<typeof TransitionReceiptMessageSchema>;

export function tryParseTransitionReceiptMessage(input: unknown): TransitionReceiptMessage | null {
	const parsed = TransitionReceiptMessageSchema.safeParse(input);
	return parsed.success ? parsed.data : null;
}
