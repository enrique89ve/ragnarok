/**
 * duatSnapshot.ts — Canonical DUAT holder snapshot.
 *
 * The snapshot JSON is embedded in the protocol bundle as the single
 * source of truth for ELIGIBILITY (which account, with what raw balance).
 * Pack counts are NEVER stored here — they are derived live via
 * `calculateDuatPacks(duatRaw)` from `./types`, which is the same function
 * `applyDuatAirdropClaim` uses to validate the claim payload. Storing
 * `packs` in the JSON created two sources of truth that could silently
 * drift if the formula constants changed; the derived path is the only
 * authority now.
 *
 * Lifecycle: temporary by design — the DUAT airdrop is a one-time event
 * with a 90-day claim window. After finalization, this module can be
 * frozen or removed without affecting the chain's tail.
 */

import snapshotJson from './duatSnapshot.json';
import { calculateDuatPacks, type DuatEntitlement } from './types';

export interface DuatSnapshotEntry {
	account: string;
	duatRaw: number;
}

interface RawSnapshot {
	version: number;
	frozenAt: string;
	stats: { eligibleHolders: number; totalPacks: number };
	holders: DuatSnapshotEntry[];
}

const snapshot = snapshotJson as RawSnapshot;

const index: Map<string, DuatSnapshotEntry> = (() => {
	const m = new Map<string, DuatSnapshotEntry>();
	for (const h of snapshot.holders) {
		m.set(h.account, h);
	}
	return m;
})();

// Boot-time consistency assertion. If anyone bumps DUAT_SCALE or replaces
// the snapshot without rebalancing the other half, this throws on module
// load rather than failing per-claim later. Single O(n) pass over 3.5k
// entries — negligible cost, executed once.
(() => {
	let totalPacks = 0;
	for (const h of snapshot.holders) {
		totalPacks += calculateDuatPacks(h.duatRaw);
	}
	if (totalPacks !== snapshot.stats.totalPacks) {
		throw new Error(
			`DUAT snapshot integrity error: stats.totalPacks=${snapshot.stats.totalPacks} but formula yields ${totalPacks}. ` +
			`Either the snapshot or DUAT_SCALE/BASE_PACKS/MAX_PACKS drifted — rerun scripts/freezeDuatSnapshot.mjs.`,
		);
	}
})();

export function lookupDuatSnapshot(account: string): DuatSnapshotEntry | null {
	return index.get(account) ?? null;
}

export function getDuatSnapshotStats(): RawSnapshot['stats'] {
	return snapshot.stats;
}

export function listDuatHolders(): readonly DuatSnapshotEntry[] {
	return snapshot.holders;
}

export function getDuatPacksFor(entry: DuatSnapshotEntry): number {
	return calculateDuatPacks(entry.duatRaw);
}

export async function getDuatEntitlement(account: string): Promise<DuatEntitlement | null> {
	const entry = lookupDuatSnapshot(account);
	if (!entry) return null;

	return {
		account: entry.account,
		duatRaw: entry.duatRaw,
		packsEarned: calculateDuatPacks(entry.duatRaw),
	};
}
