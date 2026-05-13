/**
 * sessionRenewal.ts — Session renewal verification (ADR 0004 §Decision.6
 * scenarios B–E, issue 06).
 *
 * Inbound flow:
 *   - Opponent reloads / crashes / sleeps. Their in-memory ephemeral
 *     session key dies; the match is still live on our side.
 *   - They generate a fresh Ed25519 keypair and sign the binding
 *     `'ragnarok session_renewal | matchId | newPubkey'` with their Hive
 *     Active key (one Keychain prompt per reload).
 *   - They WS-send `{ type: 'session_renewal', matchId, newPubkey,
 *     hiveSig }`. This module verifies the Hive sig against the
 *     opponent's known Hive account from `match_anchor` and decides
 *     whether to accept the new pubkey.
 *
 * Outbound flow (boot-time, NOT in this module):
 *   - On tab boot, query chain for the user's active matchId, prompt to
 *     resume, then generate a new SessionKey + Hive sig and send. The
 *     boot-time wiring belongs to RagnarokGameCoordinator (issue 07
 *     smoke harness will drive it).
 *
 * Anti-replay:
 *   - Each accepted renewal sets `lastAcceptedRenewalSigHash` (sha256 of
 *     the Hive sig string). Subsequent renewals with the same sig hash
 *     are no-ops (idempotency under network retry / hostile flood).
 *   - Renewals for a different matchId than the active match are
 *     rejected (stale envelope).
 *
 * Trust:
 *   - Hive sig verification reuses `recoverPublicKey` from the existing
 *     client-side hashUtils/hiveSignatureVerifier surface (see callers).
 *   - The new pubkey is shape-validated (base64url, length band) before
 *     being trusted as an Ed25519 public key.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export const SESSION_RENEWAL_PREFIX = 'ragnarok session_renewal';

export function buildRenewalMessage(matchId: string, newPubkey: string): string {
	return `${SESSION_RENEWAL_PREFIX} | ${matchId} | ${newPubkey}`;
}

// ─── Pubkey shape guard (matches messageSchemas.ts band) ───────────────────

const PUBKEY_RE = /^[A-Za-z0-9_-]{32,256}$/;

export function isValidEphemeralPubkey(value: string): boolean {
	return PUBKEY_RE.test(value);
}

// ─── Idempotency cache (matchId → last-accepted hiveSig hash) ──────────────

const lastAcceptedRenewalByMatch = new Map<string, string>();

function hiveSigFingerprint(sig: string): string {
	const bytes = new TextEncoder().encode(sig);
	return bytesToHex(sha256(bytes));
}

export interface RenewalVerifyResult {
	readonly accepted: boolean;
	readonly reason?: string;
}

export interface RenewalVerifyInput {
	readonly matchId: string;
	readonly newPubkey: string;
	readonly hiveSig: string;
	readonly activeMatchId: string;
	/**
	 * Caller-provided async predicate that validates `hiveSig` over
	 * `buildRenewalMessage(matchId, newPubkey)` against the opponent's
	 * known Hive Posting/Active authorities (from match_anchor).
	 * Returns `true` if the sig was produced by an authorized key.
	 */
	readonly verifyHiveSig: (message: string, sig: string) => Promise<boolean>;
}

/**
 * Decide whether to accept an inbound `session_renewal`. Pure-ish: side
 * effect is updating the per-matchId idempotency cache on acceptance.
 */
export async function verifyInboundRenewal(
	input: RenewalVerifyInput,
): Promise<RenewalVerifyResult> {
	if (input.matchId !== input.activeMatchId) {
		return { accepted: false, reason: 'matchId mismatch (stale renewal)' };
	}
	if (!isValidEphemeralPubkey(input.newPubkey)) {
		return { accepted: false, reason: 'newPubkey shape invalid' };
	}
	const fingerprint = hiveSigFingerprint(input.hiveSig);
	const lastSeen = lastAcceptedRenewalByMatch.get(input.matchId);
	if (lastSeen === fingerprint) {
		return { accepted: false, reason: 'duplicate renewal (idempotent no-op)' };
	}
	const message = buildRenewalMessage(input.matchId, input.newPubkey);
	const sigValid = await input.verifyHiveSig(message, input.hiveSig);
	if (!sigValid) {
		return { accepted: false, reason: 'hiveSig verification failed' };
	}
	lastAcceptedRenewalByMatch.set(input.matchId, fingerprint);
	return { accepted: true };
}

export function _resetRenewalCacheForTests(): void {
	lastAcceptedRenewalByMatch.clear();
}
