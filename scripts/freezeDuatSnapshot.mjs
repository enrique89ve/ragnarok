#!/usr/bin/env node
/**
 * freezeDuatSnapshot.mjs — Fetch, filter, freeze, and hash the DUAT snapshot
 *
 * Outputs:
 *   shared/protocol-core/duatSnapshot.json  (embedded in the protocol bundle,
 *                                            imported by both client + server)
 *
 * The SHA-256 hash of this file is included in the genesis broadcast.
 * Once frozen, this file NEVER changes — re-running this script regenerates it
 * with whatever the live API returns, so only run before genesis seal.
 *
 * Each holder stores only `{ account, duatRaw }`. Pack counts are derived at
 * read time via `calculateDuatPacks(duatRaw)` from `shared/protocol-core/types`
 * — there is exactly one source of truth.
 *
 * Usage: node scripts/freezeDuatSnapshot.mjs
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'shared', 'protocol-core', 'duatSnapshot.json');

const SYSTEM_ACCOUNTS = new Set(['ra', 'rc', 'rd', 'ri', 'rn', 'rm']);
const MIN_DUAT_RAW = 1000; // 1.0 DUAT (precision 3)
const PRECISION = 1000;

// Calibrated formula constants (from calibrateDuatAirdrop.mjs)
const SCALE = 5.346668;
const BASE_PACKS = 1;
const MAX_PACKS = 500;

function calculatePacks(rawBalance) {
	const display = rawBalance / PRECISION;
	if (display <= 0) return 0;
	return Math.floor(Math.min(MAX_PACKS, BASE_PACKS + Math.log2(display) * SCALE));
}

async function main() {
	console.log('Fetching DUAT snapshot from live API...');
	const resp = await fetch('https://duat.ragnaroknft.quest/api/snapshot-data');
	if (!resp.ok) throw new Error(`API returned ${resp.status}`);
	const data = await resp.json();

	console.log(`Raw holders: ${data.holders.length}`);

	// Filter: system accounts + minimum balance. The frozen entries store
	// only (account, duatRaw) — pack counts are derived at read time via
	// `calculateDuatPacks(duatRaw)` so there is exactly one source of truth.
	const eligible = data.holders
		.filter(h => !SYSTEM_ACCOUNTS.has(h.account) && h.total >= MIN_DUAT_RAW)
		.map(h => ({
			account: h.account,
			duatRaw: h.total,
			_packs: calculatePacks(h.total), // local-only, stripped before write
		}))
		.filter(h => h._packs > 0)
		.sort((a, b) => a.account.localeCompare(b.account)); // canonical sort

	const totalPacks = eligible.reduce((s, h) => s + h._packs, 0);
	const totalDuat = eligible.reduce((s, h) => s + h.duatRaw, 0);

	// Strip the derived field before persisting — keep the JSON minimal.
	const persistedHolders = eligible.map(({ account, duatRaw }) => ({ account, duatRaw }));

	console.log(`Eligible holders: ${eligible.length}`);
	console.log(`Total packs: ${totalPacks.toLocaleString()}`);
	console.log(`Total cards: ${(totalPacks * 5).toLocaleString()}`);
	console.log(`% of 2,741,000 supply: ${((totalPacks * 5) / 2741000 * 100).toFixed(2)}%`);

	// Build frozen snapshot
	const snapshot = {
		version: 1,
		frozenAt: new Date().toISOString(),
		formula: {
			type: 'log-linear',
			scale: SCALE,
			basePacks: BASE_PACKS,
			maxPacks: MAX_PACKS,
			minDuatRaw: MIN_DUAT_RAW,
			precision: PRECISION,
		},
		stats: {
			eligibleHolders: eligible.length,
			totalDuatRaw: totalDuat,
			totalPacks,
			totalCards: totalPacks * 5,
			supplyPercent: parseFloat(((totalPacks * 5) / 2741000 * 100).toFixed(2)),
		},
		holders: persistedHolders,
	};

	// Canonical JSON (sorted keys via replacer isn't needed — object keys are already ordered)
	const json = JSON.stringify(snapshot, null, 2);

	// SHA-256 hash
	const hash = createHash('sha256').update(json, 'utf8').digest('hex');
	snapshot.snapshotHash = hash;

	// Re-serialize with hash included
	const finalJson = JSON.stringify(snapshot, null, 2);

	// Write — `shared/protocol-core/` is always present; no mkdir needed.
	writeFileSync(OUTPUT_PATH, finalJson, 'utf8');

	console.log(`\nSnapshot frozen to: ${OUTPUT_PATH}`);
	console.log(`SHA-256: ${hash}`);
	console.log(`File size: ${(Buffer.byteLength(finalJson) / 1024).toFixed(1)} KB`);

	// Verify: spot-check a known account
	const dan = eligible.find(h => h.account === 'theycallmedan');
	if (dan) {
		console.log(`\nSpot check — theycallmedan: ${dan.duatRaw / PRECISION} DUAT → ${dan._packs} packs`);
	}
}

main().catch(err => {
	console.error('Failed:', err);
	process.exit(1);
});
