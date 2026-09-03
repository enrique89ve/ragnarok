import { z } from 'zod';

export const POKER_ENTRY_APPROVAL_TIMEOUT_MS = 30_000;

const baseSchema = z.object({
	protocolVersion: z.literal(2),
	matchId: z.string().min(1).max(256),
	transportEpoch: z.number().int().min(1).max(0xffff_ffff),
	combatId: z.string().min(1).max(256),
});

export const PokerEntryOpenSchema = baseSchema.extend({
	type: z.literal('poker_entry_open_v1'),
}).strict();

export const PokerEntryReadySchema = baseSchema.extend({
	type: z.literal('poker_entry_ready_v1'),
}).strict();

export const PokerEntryApprovalStateSchema = baseSchema.extend({
	type: z.literal('poker_entry_approval_state_v1'),
	status: z.enum(['pending', 'paused', 'committed', 'expired']),
	serverNowMs: z.number().int().nonnegative(),
	deadlineAtMs: z.number().int().nonnegative().nullable(),
	remainingMs: z.number().int().min(0).max(POKER_ENTRY_APPROVAL_TIMEOUT_MS),
	readyPeerIds: z.array(z.string().min(1).max(64)).max(2),
}).strict();

export type PokerEntryOpen = z.infer<typeof PokerEntryOpenSchema>;
export type PokerEntryReady = z.infer<typeof PokerEntryReadySchema>;
export type PokerEntryApprovalState = z.infer<typeof PokerEntryApprovalStateSchema>;
