/**
 * matchAnchor.ts - Match anchor broadcast + opponent wait
 *
 * PR 5: Updated to emit canonical `ragnarok-cards` format with pinned pubkeys.
 * The frozen spec (RAGNAROK_PROTOCOL_V1.md §10.12) requires:
 * - pubkey_a / pubkey_b in the match_anchor payload
 * - Signature verification against anchored keys, not current chain keys
 * - PoW required (32 challenges × 4-bit difficulty)
 *
 * Legacy `rp_match_start` is still accepted by readers (normalization alias)
 * but new writers MUST emit the canonical form.
 */

import { hiveSync } from '../HiveSync';
import { sha256Hash, canonicalStringify } from './hashUtils';
import { computePoW, POW_CONFIG } from './proofOfWork';
import { fetchAccountKeys } from './hiveSignatureVerifier';
import { HIVE_NODES } from './hiveConfig';

const MATCH_START_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchAnchorPayload {
	action: 'match_anchor';
	match_id: string;
	player_a: string;
	player_b: string;
	pubkey_a: string;
	pubkey_b: string;
	deck_hash_a: string;
	engine_hash: string;
	block_ref: string;
	pow: { nonces: number[] };
}

export interface MatchAnchorResult {
	success: boolean;
	trxId?: string;
	blockNum?: number;
	error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getHeadBlockRef(): Promise<string> {
	for (const node of HIVE_NODES) {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 5000);
			const res = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'condenser_api.get_dynamic_global_properties',
					params: [],
					id: 1,
				}),
				signal: controller.signal,
			});
			clearTimeout(timer);
			const data = await res.json() as { result?: { head_block_id?: string } };
			if (data.result?.head_block_id) return data.result.head_block_id;
		} catch {
			// try next node
		}
	}
	return sha256Hash(`fallback:${Date.now()}`);
}

async function getPostingPubKey(username: string): Promise<string> {
	const keys = await fetchAccountKeys(username);
	if (keys.posting.length === 0) throw new Error(`No posting key found for ${username}`);
	return keys.posting[0];
}

// ---------------------------------------------------------------------------
// Broadcast
// ---------------------------------------------------------------------------

export async function broadcastMatchAnchor(params: {
	matchId: string;
	playerA: string;
	playerB: string;
	deckHash: string;
	engineHash: string;
}): Promise<MatchAnchorResult> {
	const { matchId, playerA, playerB, deckHash, engineHash } = params;

	// Fetch both players' posting public keys for anchoring
	let pubkeyA: string;
	let pubkeyB: string;
	try {
		[pubkeyA, pubkeyB] = await Promise.all([
			getPostingPubKey(playerA),
			getPostingPubKey(playerB),
		]);
	} catch (err) {
		return { success: false, error: `Failed to fetch pubkeys: ${err instanceof Error ? err.message : err}` };
	}

	const blockRef = await getHeadBlockRef();

	// PoW over canonical payload (excludes pow field itself)
	const payloadForPow = canonicalStringify({
		action: 'match_anchor',
		match_id: matchId,
		player_a: playerA,
		player_b: playerB,
		pubkey_a: pubkeyA,
		pubkey_b: pubkeyB,
		deck_hash_a: deckHash,
		engine_hash: engineHash,
		block_ref: blockRef,
	});
	const payloadHash = await sha256Hash(payloadForPow);
	const pow = await computePoW(payloadHash, POW_CONFIG.MATCH_START);

	const payload: MatchAnchorPayload = {
		action: 'match_anchor',
		match_id: matchId,
		player_a: playerA,
		player_b: playerB,
		pubkey_a: pubkeyA,
		pubkey_b: pubkeyB,
		deck_hash_a: deckHash,
		engine_hash: engineHash,
		block_ref: blockRef,
		pow: { nonces: pow.nonces },
	};

	// Emit canonical ragnarok-cards format (not legacy rp_match_start)
	return hiveSync.broadcastCustomJson(
		'ragnarok-cards',
		payload as unknown as Record<string, unknown>,
		false, // Posting key
	);
}

// ---------------------------------------------------------------------------
// Wait for opponent anchor (polls Hive account history)
// ---------------------------------------------------------------------------

export async function waitForOpponentAnchor(
	matchId: string,
	opponentUsername: string,
	timeoutMs: number = MATCH_START_TIMEOUT_MS,
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	const POLL_INTERVAL = 3000;

	while (Date.now() < deadline) {
		try {
			for (const node of HIVE_NODES) {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 5000);
				try {
					const res = await fetch(node, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							jsonrpc: '2.0',
							method: 'condenser_api.get_account_history',
							params: [opponentUsername, -1, 20],
							id: 1,
						}),
						signal: controller.signal,
					});
					clearTimeout(timer);
					const data = await res.json();
					const history = data.result as [number, { op: [string, Record<string, unknown>] }][] | undefined;
					if (!history) continue;

					for (const [, entry] of history) {
						if (entry.op[0] !== 'custom_json') continue;
						const opData = entry.op[1] as { id?: string; json?: string };
						// Accept both canonical and legacy
						if (opData.id !== 'ragnarok-cards' && opData.id !== 'rp_match_start') continue;
						try {
							const parsed = JSON.parse(opData.json ?? '{}');
							const mId = parsed.match_id ?? parsed.matchId;
							if (mId === matchId) return true;
						} catch { /* skip malformed */ }
					}
					break; // got a valid response from this node
				} catch {
					clearTimeout(timer);
				}
			}
		} catch { /* retry */ }

		await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
	}

	return false;
}
