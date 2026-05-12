#!/usr/bin/env node
/**
 * testDuatClaim.mjs — End-to-end checks for the DUAT claim system
 *
 * Verifies the canonical snapshot (shared/protocol-core/duatSnapshot.json):
 *   - Shape: each holder has { account, duatRaw } only — pack counts are
 *     derived live via `calculateDuatPacks`, never persisted.
 *   - Integrity: stats.totalPacks equals the sum of the formula over all
 *     holders. This is the same assertion that runs at module load in
 *     `shared/protocol-core/duatSnapshot.ts`.
 *   - Hash: snapshotHash matches a fresh SHA-256 over the canonical JSON
 *     minus the hash itself.
 *
 * Usage: node scripts/testDuatClaim.mjs
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, '..', 'shared', 'protocol-core', 'duatSnapshot.json');

const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
const SCALE = snapshot.formula.scale;
const BASE = snapshot.formula.basePacks;
const MAX = snapshot.formula.maxPacks;
const PREC = snapshot.formula.precision;

function calculateDuatPacks(duatRaw) {
	const display = duatRaw / PREC;
	if (display <= 0) return 0;
	const packs = Math.floor(Math.min(MAX, BASE + Math.log2(display) * SCALE));
	return Math.max(0, packs);
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
	if (condition) {
		passed++;
		console.log(`  PASS: ${message}`);
	} else {
		failed++;
		console.log(`  FAIL: ${message}`);
	}
}

// ═══ TEST 1: Snapshot integrity ═══
console.log('\n=== TEST 1: Snapshot Integrity ===');
assert(snapshot.version === 1, 'version is 1');
assert(snapshot.stats.eligibleHolders === 3511, `holders = ${snapshot.stats.eligibleHolders}`);
assert(snapshot.stats.totalPacks === 164460, `packs = ${snapshot.stats.totalPacks}`);
assert(snapshot.stats.supplyPercent === 30, `supply% = ${snapshot.stats.supplyPercent}`);
assert(typeof snapshot.snapshotHash === 'string' && snapshot.snapshotHash.length === 64, 'hash is 64-char hex');

// ═══ TEST 2: Hash verification ═══
console.log('\n=== TEST 2: Hash Verification ===');
const verify = { ...snapshot };
delete verify.snapshotHash;
const computedHash = createHash('sha256').update(JSON.stringify(verify, null, 2), 'utf8').digest('hex');
assert(computedHash === snapshot.snapshotHash, 'SHA-256 hash matches');

// ═══ TEST 3: Holder shape ═══
console.log('\n=== TEST 3: Holder Shape ===');
const sample = snapshot.holders[0];
const keys = Object.keys(sample).sort();
assert(keys.length === 2 && keys[0] === 'account' && keys[1] === 'duatRaw',
	`holder keys are exactly {account, duatRaw}, got [${keys.join(',')}]`);
const persistedPacks = snapshot.holders.filter(h => 'packs' in h).length;
assert(persistedPacks === 0, 'no holder persists a `packs` field (derived only)');

// ═══ TEST 4: Formula correctness ═══
console.log('\n=== TEST 4: Formula Tests ===');
assert(calculateDuatPacks(1909813950) === 112, 'theycallmedan: 1.9M DUAT → 112 packs');
assert(calculateDuatPacks(9896316000) === 125, 'blocktrades: 9.9M DUAT → 125 packs');
assert(calculateDuatPacks(1000) === 1, 'minimum: 1 DUAT → 1 pack');
assert(calculateDuatPacks(0) === 0, 'zero: 0 DUAT → 0 packs');
assert(calculateDuatPacks(500) === 0, 'below threshold: 0.5 DUAT → 0 packs');
assert(calculateDuatPacks(-1000) === 0, 'negative: -1 DUAT → 0 packs');

// ═══ TEST 5: Aggregate matches stats ═══
console.log('\n=== TEST 5: Aggregate Matches Stats ===');
let totalPacks = 0;
let zeroPack = 0;
let maxPack = 0;
for (const h of snapshot.holders) {
	const p = calculateDuatPacks(h.duatRaw);
	totalPacks += p;
	if (p === 0) zeroPack++;
	if (p > maxPack) maxPack = p;
}
assert(totalPacks === snapshot.stats.totalPacks, `Σ formula(duatRaw) = ${totalPacks} matches stats.totalPacks`);
assert(zeroPack === 0, 'no holders derive to 0 packs');
assert(maxPack <= MAX, `max packs (${maxPack}) ≤ cap (${MAX})`);
assert(maxPack === 125, `max packs is 125 (blocktrades)`);

// ═══ TEST 6: Canonical sort ═══
console.log('\n=== TEST 6: Canonical Sort ===');
let sortOk = true;
for (let i = 1; i < snapshot.holders.length; i++) {
	if (snapshot.holders[i].account < snapshot.holders[i - 1].account) {
		sortOk = false;
		break;
	}
}
assert(sortOk, 'holders sorted by account name ascending');

// ═══ TEST 7: No duplicate accounts ═══
console.log('\n=== TEST 7: Uniqueness ===');
const accountSet = new Set(snapshot.holders.map(h => h.account));
assert(accountSet.size === snapshot.holders.length, `no duplicate accounts (${accountSet.size} unique)`);

// ═══ TEST 8: Supply math ═══
console.log('\n=== TEST 8: Supply Math ===');
const totalCards = totalPacks * 5;
const supplyPct = (totalCards / 2741000) * 100;
assert(Math.abs(supplyPct - 30) < 0.01, `${supplyPct.toFixed(2)}% of supply (target: 30%)`);
assert(totalCards === 822300, `total cards: ${totalCards}`);

// ═══ SUMMARY ═══
console.log('\n' + '='.repeat(50));
console.log(`PASSED: ${passed}  FAILED: ${failed}  TOTAL: ${passed + failed}`);
console.log('='.repeat(50));
if (failed > 0) process.exit(1);
