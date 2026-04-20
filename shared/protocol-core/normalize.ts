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
import { ACTIVE_AUTH_OPS } from './types';

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
	'rp_level_up': 'level_up',
	'rp_queue_join': 'queue_join',
	'rp_queue_leave': 'queue_leave',
	'rp_reward_claim': 'reward_claim',
	'rp_slash_evidence': 'slash_evidence',
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

// ============================================================
// normalizeRawOp
// ============================================================

export type NormalizeResult =
	| { status: 'ok'; op: ProtocolOp }
	| { status: 'ignore'; reason: string };

export function normalizeRawOp(raw: RawHiveOp): NormalizeResult {
	// Step 1: Determine action from custom_json id
	let action: ProtocolAction | null = null;
	let payload: Record<string, unknown>;

	try {
		payload = JSON.parse(raw.json) as Record<string, unknown>;
	} catch {
		return { status: 'ignore', reason: 'malformed JSON' };
	}

	if (raw.customJsonId === 'ragnarok-cards') {
		// Canonical format: action is inside the JSON body
		const bodyAction = payload.action as string | undefined;
		if (!bodyAction) {
			return { status: 'ignore', reason: 'ragnarok-cards op missing action field' };
		}
		// Check if it's a known canonical action
		const known: ReadonlySet<string> = new Set([
			'genesis', 'seal', 'mint_batch', 'pack_commit', 'pack_reveal',
			'reward_claim', 'card_transfer', 'burn', 'level_up',
			'queue_join', 'queue_leave', 'match_anchor', 'match_result',
			'slash_evidence',
			// v1.1
			'pack_mint', 'pack_distribute', 'pack_transfer', 'pack_burn',
			'card_replicate', 'card_merge',
			// v1.2: Marketplace
			'market_list', 'market_unlist', 'market_buy',
			'market_offer', 'market_accept', 'market_reject',
			// v1.2: DUAT Airdrop
			'duat_airdrop_claim', 'duat_airdrop_finalize',
		]);
		if (known.has(bodyAction)) {
			action = bodyAction as CanonicalAction;
		} else {
			return { status: 'ignore', reason: `unknown action: ${bodyAction}` };
		}
	} else if (raw.customJsonId === 'ragnarok_level_up') {
		// Legacy level_up format
		action = 'level_up';
	} else if (raw.customJsonId.startsWith('rp_')) {
		// Legacy rp_ prefix format
		const mapped = LEGACY_MAP[raw.customJsonId];
		if (mapped) {
			action = mapped;
		} else if (raw.customJsonId === 'rp_team_submit') {
			return { status: 'ignore', reason: 'team_submit is informational only' };
		} else {
			return { status: 'ignore', reason: `unknown legacy op: ${raw.customJsonId}` };
		}
	} else {
		return { status: 'ignore', reason: `not a ragnarok op: ${raw.customJsonId}` };
	}

	// Step 2: Check authority level
	const usedActiveAuth = raw.requiredAuths.length > 0;

	if (action !== 'legacy_pack_open' && action !== 'slash_evidence') {
		const canonicalAction = action as CanonicalAction;
		if (ACTIVE_AUTH_OPS.has(canonicalAction) && !usedActiveAuth) {
			return { status: 'ignore', reason: `${action} requires active auth, got posting` };
		}
	}

	// Step 3: Build normalized op
	const op: ProtocolOp = {
		action,
		payload,
		broadcaster: raw.broadcaster,
		trxId: raw.trxId,
		blockNum: raw.blockNum,
		timestamp: raw.timestamp,
		usedActiveAuth,
	};

	return { status: 'ok', op };
}
