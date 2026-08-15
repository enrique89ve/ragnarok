/**
 * Ragnarok Protocol Core — Op Normalization
 *
 * Converts raw Hive custom_json ops into normalized ProtocolOps.
 * Legacy rp_* ids are mapped to canonical actions.
 * Authority level is checked against the spec's posting/active matrix.
 *
 * This runs BEFORE validation, PoW hashing, signature verification,
 * and state transitions. Both client and server call this first.
 */

import type {
	RawHiveOp, ProtocolOp, ProtocolAction, CanonicalAction,
} from './types';
import { ACTIVE_AUTH_OPS, RAGNAROK_PROTOCOL_IDS, isCanonicalAction } from './types';

// ============================================================
// Legacy → Canonical Mapping
// ============================================================

const LEGACY_MAP: Record<string, ProtocolAction> = {
	'rp_genesis': 'genesis',
	'rp_seal': 'seal',
	'rp_mint': 'mint_batch',
	'rp_transfer': 'card_transfer',
	'rp_card_transfer': 'card_transfer',
	'rp_burn': 'burn',
	'rp_match_start': 'match_anchor',
	'rp_match_result': 'match_result',
	'rp_campaign_result': 'campaign_result',
	'rp_warband_request': 'warband_request',
	'rp_warband_accept': 'warband_accept',
	'rp_warband_remove': 'warband_remove',
	'rp_warband_block': 'warband_block',
	'rp_rune_exchange': 'rune_exchange',
	'rp_level_up': 'level_up',
	'rp_queue_join': 'queue_join',
	'rp_queue_leave': 'queue_leave',
	'rp_reward_claim': 'reward_claim',
	'rp_daily_quest_claim': 'daily_quest_claim',
	'rp_slash_evidence': 'slash_evidence',
	'rp_pack_purchase': 'pack_purchase',
	// rp_pack_open is NOT here — it maps to legacy_pack_open (special case)
	'rp_pack_open': 'legacy_pack_open',
	// rp_team_submit is informational-only, ignored
	// v1.1 legacy prefixes
	'rp_pack_mint': 'pack_mint',
	'rp_pack_distribute': 'pack_distribute',
	'rp_pack_transfer': 'pack_transfer',
	'rp_pack_burn': 'pack_burn',
	'rp_card_replicate': 'card_replicate',
	'rp_card_merge': 'card_merge',
	// v1.2 DUAT airdrop legacy prefixes
	'rp_duat_airdrop_claim': 'duat_airdrop_claim',
	'rp_duat_airdrop_finalize': 'duat_airdrop_finalize',
	// v1.2 marketplace legacy prefixes
	'rp_market_list': 'market_list',
	'rp_market_unlist': 'market_unlist',
	'rp_market_buy': 'market_buy',
	'rp_market_offer': 'market_offer',
	'rp_market_accept': 'market_accept',
	'rp_market_reject': 'market_reject',
};

export const GLOBAL_RAW_JSON_BYTE_CEILING = 8192;
export const DAILY_QUEST_CLAIM_RAW_JSON_BYTE_LIMIT = 200;
export const RUNE_EXCHANGE_RAW_JSON_BYTE_LIMIT = 180;

// ============================================================
// normalizeRawOp
// ============================================================

export type NormalizeResult =
	| { status: 'ok'; op: ProtocolOp }
	| { status: 'ignore'; reason: string }
	| { status: 'reject'; reason: string };

export interface NormalizeOptions {
	readonly protocolIds?: readonly string[];
	readonly acceptLegacyProtocolIds?: boolean;
}

type IdClassification = 'canonical' | 'legacy' | 'foreign';

function classifyCustomJsonId(
	customJsonId: string,
	protocolIds: readonly string[],
	acceptLegacyProtocolIds: boolean,
): IdClassification {
	if (protocolIds.includes(customJsonId)) return 'canonical';
	if (acceptLegacyProtocolIds) {
		if (customJsonId === 'ragnarok_level_up' || customJsonId.startsWith('rp_')) {
			return 'legacy';
		}
	}
	return 'foreign';
}

export function rawJsonByteLength(json: string): number {
	return new TextEncoder().encode(json).byteLength;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveAction(
	classification: IdClassification,
	payload: Record<string, unknown>,
	customJsonId: string,
): { action: ProtocolAction } | { ignore: string } | { reject: string } {
	if (classification === 'canonical') {
		const bodyAction = payload.action;
		if (typeof bodyAction !== 'string') {
			return { reject: `${customJsonId} op missing action field` };
		}
		if (isCanonicalAction(bodyAction)) {
			return { action: bodyAction as CanonicalAction };
		}
		return { reject: `unknown action: ${bodyAction}` };
	}

	if (customJsonId === 'ragnarok_level_up') {
		return { action: 'level_up' };
	}
	if (customJsonId === 'rp_team_submit') {
		return { ignore: 'team_submit is informational only' };
	}
	const mapped = LEGACY_MAP[customJsonId];
	if (mapped) return { action: mapped };
	return { ignore: `unknown legacy op: ${customJsonId}` };
}

export function normalizeRawOp(raw: RawHiveOp, options: NormalizeOptions = {}): NormalizeResult {
	const protocolIds = options.protocolIds ?? RAGNAROK_PROTOCOL_IDS;
	const acceptLegacyProtocolIds = options.acceptLegacyProtocolIds ?? true;

	const classification = classifyCustomJsonId(raw.customJsonId, protocolIds, acceptLegacyProtocolIds);
	if (classification === 'foreign') {
		return { status: 'ignore', reason: `not a ragnarok op: ${raw.customJsonId}` };
	}

	const rawBytes = rawJsonByteLength(raw.json);
	if (rawBytes > GLOBAL_RAW_JSON_BYTE_CEILING) {
		return { status: 'reject', reason: 'raw json exceeds global byte ceiling' };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw.json);
	} catch {
		return { status: 'reject', reason: 'malformed JSON' };
	}
	if (!isPlainObject(parsed)) {
		return { status: 'reject', reason: 'payload is not a JSON object' };
	}
	const payload = parsed as Record<string, unknown>;

	const resolvedAction = resolveAction(classification, payload, raw.customJsonId);
	if ('reject' in resolvedAction) {
		return { status: 'reject', reason: resolvedAction.reject };
	}
	if ('ignore' in resolvedAction) {
		return { status: 'ignore', reason: resolvedAction.ignore };
	}
	const action = resolvedAction.action;

	const signedPosting = raw.requiredPostingAuths.includes(raw.broadcaster);
	const signedActive = raw.requiredAuths.includes(raw.broadcaster);
	if (!signedPosting && !signedActive) {
		return { status: 'reject', reason: `${action} broadcaster not in required authorities` };
	}

	if (action !== 'legacy_pack_open' && action !== 'slash_evidence') {
		const canonicalAction = action as CanonicalAction;
		if (ACTIVE_AUTH_OPS.has(canonicalAction) && !signedActive) {
			return { status: 'reject', reason: `${action} requires active auth, got posting` };
		}
	}

	if (action === 'daily_quest_claim' && rawBytes > DAILY_QUEST_CLAIM_RAW_JSON_BYTE_LIMIT) {
		return { status: 'reject', reason: 'daily_quest_claim raw json exceeds 200 bytes' };
	}
	if (action === 'rune_exchange' && rawBytes > RUNE_EXCHANGE_RAW_JSON_BYTE_LIMIT) {
		return { status: 'reject', reason: 'rune_exchange raw json exceeds 180 bytes' };
	}

	const op: ProtocolOp = {
		action,
		payload,
		broadcaster: raw.broadcaster,
		trxId: raw.trxId,
		operationId: `${raw.trxId}:${raw.opInTrx}`,
		blockNum: raw.blockNum,
		timestamp: raw.timestamp,
		usedActiveAuth: signedActive,
	};

	return { status: 'ok', op };
}
