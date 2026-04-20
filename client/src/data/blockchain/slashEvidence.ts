/**
 * slashEvidence.ts - Permissionless slash evidence broadcaster
 *
 * Implements the slash_evidence op from HIVE_BLOCKCHAIN_BLUEPRINT.md § 8.5.
 *
 * Any observer can submit two contradictory on-chain transaction IDs as proof
 * of cheating. The replay engine will deterministically slash the offender.
 *
 * Valid slash reasons:
 *   double_result    — two different match results for the same matchId
 *   invalid_anchor   — match_start anchor fails PoW or signature validation
 *   forged_move      — signed move references a block that doesn't exist / wrong block_ref
 *   fake_disconnect  — player claimed disconnect but match_start anchor proves they connected
 *
 * Usage:
 *   await submitSlashEvidence({
 *     matchId: 'abc-123',
 *     offender: 'cheater123',
 *     reason: 'double_result',
 *     trxId1: 'abc...def',  // first conflicting tx
 *     trxId2: '012...345',  // second conflicting tx
 *   });
 */

import { hiveSync } from '../HiveSync';
import type { HiveBroadcastResult } from '../HiveSync';
import { HIVE_NODES } from './hiveConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlashReason =
	| 'double_result'
	| 'invalid_anchor'
	| 'forged_move'
	| 'fake_disconnect';

export interface SlashEvidenceParams {
	matchId: string;
	offender: string;
	reason: SlashReason;
	trxId1: string; // first conflicting transaction id
	trxId2: string; // second conflicting transaction id
	notes?: string; // optional human-readable context (not used by replay engine)
}

interface SlashEvidencePayload {
	app: string;
	type: 'rp_slash_evidence';
	match_id: string;
	offender: string;
	reason: SlashReason;
	trx_id_1: string;
	trx_id_2: string;
	notes?: string;
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

/**
 * Broadcast a slash evidence op.
 * Any account can call this — no special permissions required.
 * Uses Posting key (no tokens at stake for the reporter).
 */
export async function submitSlashEvidence(
	params: SlashEvidenceParams,
): Promise<HiveBroadcastResult> {
	const { matchId, offender, reason, trxId1, trxId2, notes } = params;

	if (!matchId || !offender || !trxId1 || !trxId2) {
		return { success: false, error: 'matchId, offender, trxId1, trxId2 are required' };
	}

	if (trxId1 === trxId2) {
		return { success: false, error: 'trxId1 and trxId2 must be different transactions' };
	}

	const payload: SlashEvidencePayload = {
		app: 'ragnarok-cards',
		type: 'rp_slash_evidence',
		match_id: matchId,
		offender,
		reason,
		trx_id_1: trxId1,
		trx_id_2: trxId2,
		...(notes ? { notes } : {}),
	};

	return hiveSync.broadcastCustomJson(
		'rp_slash_evidence',
		payload as unknown as Record<string, unknown>,
		false, // Posting key
	);
}

// ---------------------------------------------------------------------------
// Detect double-result automatically
// ---------------------------------------------------------------------------

/**
 * Check whether a matchId already has a committed result on chain.
 * Returns the existing trxId if found, null otherwise.
 * Used to auto-detect double_result slashing opportunities.
 */
export async function findExistingMatchResult(
	matchId: string,
	hiveUsername: string,
): Promise<string | null> {
	for (const node of HIVE_NODES) {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 8000);
			const res = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'condenser_api.get_account_history',
					params: [hiveUsername, -1, 200],
					id: 1,
				}),
				signal: controller.signal,
			});
			clearTimeout(timer);

			const data = await res.json() as {
				result?: [number, {
					trx_id: string;
					op: [string, { id: string; json: string }];
				}][]
			};

			if (!data.result) continue;

			for (const [, entry] of data.result) {
				if (entry.op[0] !== 'custom_json') continue;
				if (entry.op[1].id !== 'rp_match_result') continue;
				try {
					const payload = JSON.parse(entry.op[1].json) as { match_id?: string };
					if (payload.match_id === matchId) return entry.trx_id;
				} catch {
					// skip malformed
				}
			}
			return null;
		} catch {
			// try next node
		}
	}
	return null;
}
