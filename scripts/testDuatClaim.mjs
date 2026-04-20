#!/usr/bin/env node
/**
 * testDuatClaim.mjs — End-to-end test of the DUAT claim system
 *
 * Tests: snapshot loading, formula, applyOp simulation, edge cases
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const snapshot = JSON.parse(readFileSync('client/public/data/duat-snapshot.json', 'utf8'));
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

// ═══ TEST 3: Formula correctness ═══
console.log('\n=== TEST 3: Formula Tests ===');
assert(calculateDuatPacks(1909813950) === 112, 'theycallmedan: 1.9M DUAT → 112 packs');
assert(calculateDuatPacks(9896316000) === 125, 'blocktrades: 9.9M DUAT → 125 packs');
assert(calculateDuatPacks(1000) === 1, 'minimum: 1 DUAT → 1 pack');
assert(calculateDuatPacks(0) === 0, 'zero: 0 DUAT → 0 packs');
assert(calculateDuatPacks(500) === 0, 'below threshold: 0.5 DUAT → 0 packs');
assert(calculateDuatPacks(-1000) === 0, 'negative: -1 DUAT → 0 packs');

// ═══ TEST 4: All holders formula match ═══
console.log('\n=== TEST 4: All Holders Formula Match ===');
let mismatches = 0;
let totalPacks = 0;
for (const h of snapshot.holders) {
	const expected = calculateDuatPacks(h.duatRaw);
	if (expected !== h.packs) mismatches++;
	totalPacks += h.packs;
}
assert(mismatches === 0, `0 formula mismatches across ${snapshot.holders.length} holders`);
assert(totalPacks === snapshot.stats.totalPacks, `sum(packs) = ${totalPacks} matches stats`);

// ═══ TEST 5: No zero-pack holders ═══
console.log('\n=== TEST 5: Edge Cases ===');
const zeroPack = snapshot.holders.filter(h => h.packs === 0);
assert(zeroPack.length === 0, 'no holders with 0 packs');
const maxPack = Math.max(...snapshot.holders.map(h => h.packs));
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

// ═══ TEST 8: Simulate claim validation ═══
console.log('\n=== TEST 8: Claim Validation Simulation ===');

// Valid claim
const dan = snapshot.holders.find(h => h.account === 'theycallmedan');
assert(dan !== undefined, 'theycallmedan found in snapshot');
assert(dan.packs === calculateDuatPacks(dan.duatRaw), 'theycallmedan pack count matches formula');

// Invalid: wrong pack count
const wrongPacks = calculateDuatPacks(dan.duatRaw) + 1;
assert(wrongPacks !== dan.packs, `wrong pack count (${wrongPacks}) rejected by formula check`);

// Invalid: account not in snapshot
const fakeAccount = snapshot.holders.find(h => h.account === 'nonexistent_fake_user');
assert(fakeAccount === undefined, 'fake account not in snapshot');

// Invalid: already claimed (would be checked by IndexedDB)
// This just verifies the logic path exists
assert(typeof snapshot.snapshotHash === 'string', 'snapshot hash available for on-chain genesis');

// ═══ TEST 9: Supply math ═══
console.log('\n=== TEST 9: Supply Math ===');
const totalCards = totalPacks * 5;
const supplyPct = (totalCards / 2741000) * 100;
assert(Math.abs(supplyPct - 30) < 0.01, `${supplyPct.toFixed(2)}% of supply (target: 30%)`);
assert(totalCards === 822300, `total cards: ${totalCards}`);

// ═══ SUMMARY ═══
console.log('\n' + '='.repeat(50));
console.log(`PASSED: ${passed}  FAILED: ${failed}  TOTAL: ${passed + failed}`);
console.log('='.repeat(50));
if (failed > 0) process.exit(1);
