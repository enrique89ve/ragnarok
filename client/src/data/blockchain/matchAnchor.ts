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
 *
 * ADR 0004 §Decision.3 (issue 02): `pubkey_a` / `pubkey_b` are now ephemeral
 * Ed25519 session-key pubkeys generated per match (see
 * `client/src/game/protocol/sessionKey.ts`), NOT Hive Posting keys. The
 * binding to a Hive identity happens via `session_authorize` (Hive sig over
 * `matchId | ephemeralPubkey`) exchanged on the wire before this anchor is
 * broadcast; callers are responsible for collecting both ephemeral pubkeys
 * and passing them in.
 */

import { hiveSync } from '../HiveSync';
import { RAGNAROK_APP_ID } from '../schemas/HiveTypes';
import { sha256Hash, canonicalStringify } from './hashUtils';
import { computePoW, POW_CONFIG } from './proofOfWork';
import { HIVE_NODES } from './hiveConfig';
import { getCardRegistryHash } from '../../game/data/effects/registryHash';

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
	// ADR 0004 §Decision.2: hash of the canonical card registry. Anchored at
	// match start so a peer running an older registry invalidates the match.
	card_registry_hash: string;
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

// Loose base64url shape guard. Ephemeral Ed25519 pubkeys are 43-char
// base64url, but we accept a wider range to leave headroom for the wire
// schema's broader 32–256 char band (see `messageSchemas.ts`).
function isLikelyBase64UrlPubkey(value: string): boolean {
	return typeof value === 'string'
		&& value.length >= 32
		&& value.length <= 256
		&& /^[A-Za-z0-9_-]+$/.test(value);
}

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

// ---------------------------------------------------------------------------
// Broadcast
// ---------------------------------------------------------------------------

export async function broadcastMatchAnchor(params: {
	matchId: string;
	playerA: string;
	playerB: string;
	/** Player A's ephemeral Ed25519 session pubkey (base64url). */
	ephemeralPubkey: string;
	/**
	 * Player B's ephemeral Ed25519 session pubkey (base64url). Collected
	 * from the opponent's `session_authorize` wire message before this
	 * anchor is broadcast.
	 */
	opponentEphemeralPubkey: string;
	deckHash: string;
	engineHash: string;
}): Promise<MatchAnchorResult> {
	const { matchId, playerA, playerB, ephemeralPubkey, opponentEphemeralPubkey, deckHash, engineHash } = params;

	// Shape-validate the ephemeral keys before anchoring them on chain.
	// Bad input here would be permanently pinned in the Hive op, so we'd
	// rather fail loudly at the boundary than ship malformed bytes.
	if (!isLikelyBase64UrlPubkey(ephemeralPubkey)) {
		return { success: false, error: 'broadcastMatchAnchor: ephemeralPubkey must be base64url (32–256 chars)' };
	}
	if (!isLikelyBase64UrlPubkey(opponentEphemeralPubkey)) {
		return { success: false, error: 'broadcastMatchAnchor: opponentEphemeralPubkey must be base64url (32–256 chars)' };
	}

	const pubkeyA = ephemeralPubkey;
	const pubkeyB = opponentEphemeralPubkey;

	const blockRef = await getHeadBlockRef();
	// ADR 0004 §Decision.2: pin the card registry hash alongside the engine
	// hash. Memoised inside `getCardRegistryHash` so this is a single hash
	// per client session, not per match.
	const cardRegistryHash = await getCardRegistryHash();

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
		card_registry_hash: cardRegistryHash,
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
		card_registry_hash: cardRegistryHash,
		block_ref: blockRef,
		pow: { nonces: pow.nonces },
	};

	// Emit canonical ragnarok-cards format (not legacy rp_match_start)
	return hiveSync.broadcastCustomJson(
		RAGNAROK_APP_ID,
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
						// Accept both active canonical protocol and legacy match_start.
						if (opData.id !== RAGNAROK_APP_ID && opData.id !== 'rp_match_start') continue;
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
