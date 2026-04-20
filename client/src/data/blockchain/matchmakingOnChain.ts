/**
 * matchmakingOnChain.ts - On-chain matchmaking via queue_join / queue_leave ops
 *
 * Flow:
 *   1. Player calls broadcastQueueJoin() — broadcasts a queue_join custom_json with PoW.
 *      The replay engine writes it to IndexedDB (queue_entries store).
 *   2. pollForMatch() scans the local IndexedDB queue for a compatible opponent
 *      (same mode, ELO within range, not ourselves).
 *   3. On match found, returns the opponent's peerId so the caller can open a WebRTC
 *      connection via peerStore / PeerJS.
 *   4. broadcastQueueLeave() removes us from the queue.
 *
 * ELO matching window: ±200 points, expanding ±50 every 30 s (up to ±500).
 *
 * Usage:
 *   const cancel = await broadcastQueueJoin({ account: 'alice', mode: 'ranked', elo: 1200, peerId: 'xyz', deckHash: '...' });
 *   const match = await pollForMatch('alice', 'ranked', 1200);
 *   if (match) peerStore.join(match.peerId);
 *   await broadcastQueueLeave('alice');
 */

import { hiveSync } from '../HiveSync';
import { computePoW } from './proofOfWork';
import { sha256Hash, canonicalStringify } from './hashUtils';
import { getAllQueueEntries, getQueueEntry, deleteQueueEntry, putQueueEntry } from './replayDB';
import type { QueueEntry } from './replayDB';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const QUEUE_EXPIRY_MS     = 10 * 60 * 1000; // must match replayRules.ts
const POLL_INTERVAL_MS    = 5_000;
const ELO_BASE_WINDOW     = 200;
const ELO_EXPAND_STEP     = 50;
const ELO_EXPAND_INTERVAL = 30_000; // every 30 s
const ELO_MAX_WINDOW      = 500;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueueJoinParams {
	account: string;
	mode: 'ranked' | 'casual';
	elo: number;
	peerId: string;
	deckHash: string;
}

export interface MatchFound {
	opponent: string;
	peerId: string;
	deckHash: string;
	elo: number;
}

// ---------------------------------------------------------------------------
// Broadcast queue_join
// ---------------------------------------------------------------------------

/**
 * Compute PoW and broadcast a queue_join op to Hive.
 * Also writes the entry to local IndexedDB immediately (optimistic) so the
 * poller can see ourselves.
 *
 * Returns a cancel function that broadcasts queue_leave.
 */
export async function broadcastQueueJoin(params: QueueJoinParams): Promise<() => Promise<void>> {
	const { account, mode, elo, peerId, deckHash } = params;

	const basePayload = {
		app: 'ragnarok-cards',
		action: 'queue_join',
		mode,
		elo,
		peer_id: peerId,
		deck_hash: deckHash,
		timestamp: Date.now(),
	};

	const payloadHash = await sha256Hash(canonicalStringify(basePayload));
	const powResult = await computePoW(payloadHash, { count: 32, difficulty: 4 });

	const payload = { ...basePayload, pow: { nonces: powResult.nonces } };

	// Optimistic local write — replay engine will overwrite when confirmed
	await putQueueEntry({
		account,
		mode,
		elo,
		peerId,
		deckHash,
		timestamp: Date.now(),
		blockNum: 0, // not yet on chain
	});

	// Fire-and-forget broadcast (Hive Keychain prompts user)
	hiveSync.broadcastCustomJson(
		'rp_queue_join',
		payload as unknown as Record<string, unknown>,
		false,
	).catch(() => { /* user may reject */ });

	return () => broadcastQueueLeave(account);
}

// ---------------------------------------------------------------------------
// Broadcast queue_leave
// ---------------------------------------------------------------------------

export async function broadcastQueueLeave(account: string): Promise<void> {
	await deleteQueueEntry(account);

	hiveSync.broadcastCustomJson(
		'rp_queue_leave',
		{ app: 'ragnarok-cards', action: 'queue_leave' } as unknown as Record<string, unknown>,
		false,
	).catch(() => { /* ignore */ });
}

// ---------------------------------------------------------------------------
// ELO window — expands over time
// ---------------------------------------------------------------------------

function eloWindow(joinedAt: number): number {
	const elapsed = Date.now() - joinedAt;
	const steps = Math.floor(elapsed / ELO_EXPAND_INTERVAL);
	return Math.min(ELO_BASE_WINDOW + steps * ELO_EXPAND_STEP, ELO_MAX_WINDOW);
}

// ---------------------------------------------------------------------------
// Find a compatible opponent in the local queue
// ---------------------------------------------------------------------------

export async function findMatchInQueue(
	account: string,
	mode: string,
	elo: number,
	joinedAt: number,
): Promise<MatchFound | null> {
	const all = await getAllQueueEntries();
	const now = Date.now();
	const window = eloWindow(joinedAt);

	for (const entry of all) {
		if (entry.account === account) continue;           // skip self
		if (entry.mode !== mode) continue;                 // mode must match
		if (now - entry.timestamp > QUEUE_EXPIRY_MS) continue; // stale entry
		if (Math.abs(entry.elo - elo) > window) continue; // outside ELO window
		if (!entry.peerId) continue;                       // no peerId yet

		return {
			opponent: entry.account,
			peerId: entry.peerId,
			deckHash: entry.deckHash,
			elo: entry.elo,
		};
	}

	return null;
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

/**
 * Poll the local IndexedDB queue every 5 s until a match is found or cancelled.
 *
 * @param account    Our Hive username
 * @param mode       'ranked' | 'casual'
 * @param elo        Our current ELO
 * @param onMatch    Callback invoked when a compatible opponent is found
 * @returns          A cancel function — call it to stop polling and leave the queue
 */
export function startQueuePoller(
	account: string,
	mode: string,
	elo: number,
	onMatch: (match: MatchFound) => void,
): () => void {
	const joinedAt = Date.now();
	let active = true;

	async function poll() {
		if (!active) return;

		// Verify our own entry still exists (not evicted by a duplicate from chain)
		const ours = await getQueueEntry(account);
		if (!ours) {
			// Someone else may have placed us — re-check next tick
		}

		const match = await findMatchInQueue(account, mode, elo, joinedAt);
		if (match) {
			active = false;
			onMatch(match);
			return;
		}

		if (active) {
			setTimeout(poll, POLL_INTERVAL_MS);
		}
	}

	setTimeout(poll, POLL_INTERVAL_MS);

	return () => {
		active = false;
	};
}
