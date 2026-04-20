/**
 * opSchemas.ts — Zod schemas for all 15 Hive chain op types.
 *
 * Used at the applyOp() dispatch boundary to validate raw JSON payloads
 * before they enter deterministic handlers. Internal game code does NOT
 * use Zod — TypeScript compile-time types are sufficient there.
 *
 * Each schema matches the actual payload shapes consumed by replayRules.ts.
 */

import { z } from 'zod';

// ── Shared primitives ──

const HiveUsername = z.string().min(3).max(16);
const PositiveInt = z.number().int().positive();
const NonNegativeInt = z.number().int().min(0);
const TrxId = z.string().min(8).max(64);
const Nonces = z.array(z.number()).min(1);
const PoWBlock = z.object({ nonces: Nonces });

// ── rp_genesis ──

export const GenesisPayload = z.object({
	total_supply: PositiveInt.optional(),
	version: z.string().min(1).optional(),
	reader_hash: z.string().optional(),
	card_supply_caps: z.record(z.string(), z.number()).optional(),
	card_distribution: z.record(z.string(), z.number()).optional(),
});

// ── rp_mint ──

const MintCard = z.object({
	nft_id: z.string().min(1),
	card_id: PositiveInt,
	rarity: z.enum(['common', 'rare', 'epic', 'mythic']),
	name: z.string().optional(),
	type: z.string().optional(),
	race: z.string().optional(),
	image: z.string().optional(),
	foil: z.enum(['standard', 'gold']).default('standard'),
});

export const MintPayload = z.object({
	to: HiveUsername,
	cards: z.array(MintCard).min(1),
});

// ── rp_seal ──

export const SealPayload = z.object({}).passthrough();

// ── rp_burn ──

export const BurnPayload = z.object({
	nft_id: z.string().optional(),
	card_uid: z.string().optional(),
}).refine(
	(d) => !!(d.nft_id || d.card_uid),
	{ message: 'nft_id or card_uid required' },
);

// ── rp_match_start ──

export const MatchStartPayload = z.object({
	match_id: z.string().min(1),
	pow: PoWBlock,
	hero_ids: z.array(z.number()).optional(),
	king_id: z.union([z.number(), z.string()]).optional(),
	deck_hash: z.string().optional(),
	peer_id: z.string().optional(),
});

// ── rp_match_result ──
// Supports both compact (m/w/l/n/s/v/c/ch/pow) and legacy formats

const CompactMatchResult = z.object({
	m: z.string().min(1),
	w: z.string().min(1),
	l: z.string().min(1),
	n: NonNegativeInt,
	s: z.string().min(1),
	v: z.number().optional(),
	c: z.string().optional(),
	ch: z.string().optional(),
	pow: PoWBlock.optional(),
});

const LegacyMatchResult = z.object({
	matchId: z.string().min(1),
	winnerId: z.string().min(1),
	player1: z.string().optional(),
	player2: z.string().optional(),
	seed: z.string().optional(),
});

export const MatchResultPayload = z.union([CompactMatchResult, LegacyMatchResult]);

// ── rp_queue_join ──

export const QueueJoinPayload = z.object({
	pow: PoWBlock,
	mode: z.string().optional(),
	peer_id: z.string().optional(),
	deck_hash: z.string().optional(),
});

// ── rp_queue_leave ──
// No payload needed — uses op.broadcaster

export const QueueLeavePayload = z.object({}).passthrough();

// ── rp_slash_evidence ──

export const SlashEvidencePayload = z.object({
	offender: HiveUsername,
	reason: z.string().min(1),
	trx_id_1: TrxId.optional(),
	trx_id_2: TrxId.optional(),
	tx_a: TrxId.optional(),
	tx_b: TrxId.optional(),
}).refine(
	(d) => !!((d.trx_id_1 && d.trx_id_2) || (d.tx_a && d.tx_b)),
	{ message: 'two transaction IDs required (trx_id_1/trx_id_2 or tx_a/tx_b)' },
);

// ── rp_card_transfer / rp_transfer ──

const TransferCard = z.object({
	nft_id: z.string().optional(),
	card_uid: z.string().optional(),
	to: HiveUsername.optional(),
}).refine(
	(d) => !!(d.nft_id || d.card_uid),
	{ message: 'nft_id or card_uid required' },
);

export const CardTransferPayload = z.union([
	// Batch: { cards: [...], to }
	z.object({
		cards: z.array(TransferCard).min(1),
		to: HiveUsername,
	}),
	// Single: { nft_id/card_uid, to }
	z.object({
		nft_id: z.string().optional(),
		card_uid: z.string().optional(),
		to: HiveUsername,
	}).refine(
		(d) => !!(d.nft_id || d.card_uid),
		{ message: 'nft_id or card_uid required' },
	),
]);

// ── rp_level_up ──
// Compact: { v: 1, d: "<uid>:<cardId_hex>:<level_hex>" }
// Verbose: { nft_id, card_id, new_level }

export const LevelUpPayload = z.union([
	z.object({
		v: z.literal(1),
		d: z.string().min(5),
	}),
	z.object({
		nft_id: z.string().min(1),
		card_id: PositiveInt,
		new_level: PositiveInt,
	}),
]);

// ── rp_pack_open ──

export const PackOpenPayload = z.object({
	pack_type: z.string().min(1),
	quantity: PositiveInt.default(1),
});

// ── rp_reward_claim ──

export const RewardClaimPayload = z.object({
	reward_id: z.string().min(1),
});

// ── rp_team_submit (informational only, no state change) ──

export const TeamSubmitPayload = z.object({}).passthrough();

// ── v1.1: pack_mint ──

export const PackMintPayload = z.object({
	pack_type: z.enum(['starter', 'standard', 'premium', 'mythic', 'mega']),
	quantity: z.number().int().min(1).max(10).default(1),
	to: HiveUsername,
});

// ── v1.1: pack_distribute (admin → player) ──

export const PackDistributePayload = z.object({
	pack_uids: z.array(z.string().min(1)).min(1).max(50),
	to: HiveUsername,
});

// ── v1.1: pack_transfer ──

export const PackTransferPayload = z.object({
	pack_uid: z.string().min(1),
	to: HiveUsername,
	nonce: NonNegativeInt.optional(),
	memo: z.string().max(256).optional(),
});

// ── v1.1: pack_burn ──

export const PackBurnPayload = z.object({
	pack_uid: z.string().min(1),
	salt: z.string().min(32),
	salt_commit: z.string().optional(),
});

// ── v1.1: card_replicate ──

export const CardReplicatePayload = z.object({
	source_uid: z.string().min(1),
	foil: z.enum(['standard', 'gold']).optional(),
	memo: z.string().max(256).optional(),
});

// ── v1.1: card_merge ──

export const CardMergePayload = z.object({
	source_uids: z.tuple([z.string().min(1), z.string().min(1)]),
});

// ── Schema lookup by op id ──

export const OP_SCHEMAS: Record<string, z.ZodType> = {
	rp_genesis: GenesisPayload,
	rp_mint: MintPayload,
	rp_seal: SealPayload,
	rp_burn: BurnPayload,
	rp_match_start: MatchStartPayload,
	rp_match_result: MatchResultPayload,
	rp_queue_join: QueueJoinPayload,
	rp_queue_leave: QueueLeavePayload,
	rp_slash_evidence: SlashEvidencePayload,
	rp_transfer: CardTransferPayload,
	rp_card_transfer: CardTransferPayload,
	rp_level_up: LevelUpPayload,
	rp_pack_open: PackOpenPayload,
	rp_reward_claim: RewardClaimPayload,
	rp_team_submit: TeamSubmitPayload,
	// v1.1
	rp_pack_mint: PackMintPayload,
	rp_pack_distribute: PackDistributePayload,
	rp_pack_transfer: PackTransferPayload,
	rp_pack_burn: PackBurnPayload,
	rp_card_replicate: CardReplicatePayload,
	rp_card_merge: CardMergePayload,
};

/**
 * Validate a raw payload against the schema for the given op id.
 * Returns the parsed (typed) data on success, or null on failure.
 * Logs validation errors to console.warn.
 */
export function validateOpPayload(
	opId: string,
	payload: unknown,
): Record<string, unknown> | null {
	const schema = OP_SCHEMAS[opId];
	if (!schema) return payload as Record<string, unknown>; // unknown op — pass through

	const result = schema.safeParse(payload);
	if (!result.success) {
		console.warn(
			`[opSchemas] Validation failed for ${opId}:`,
			result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
		);
		return null;
	}
	return result.data as Record<string, unknown>;
}
