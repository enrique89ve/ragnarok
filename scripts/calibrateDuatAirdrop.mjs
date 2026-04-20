#!/usr/bin/env node
/**
 * calibrateDuatAirdrop.mjs — Calculate exact pack distribution for DUAT holders
 *
 * Fetches the live snapshot, applies the log-linear formula, and calibrates
 * the SCALE multiplier to hit exactly 30% of NFT supply (164,460 packs).
 *
 * Usage: node scripts/calibrateDuatAirdrop.mjs
 */

const TARGET_PACKS = 164_460;
const MAX_PACKS = 500;
const BASE_PACKS = 1;
const MIN_DUAT_RAW = 1000; // minimum 1.0 DUAT (precision 3)
const PRECISION = 1000; // duat node precision = 3
const SYSTEM_ACCOUNTS = new Set(['ra', 'rc', 'rd', 'ri', 'rn', 'rm']);

async function main() {
	console.log('Fetching DUAT snapshot...');
	const resp = await fetch('https://duat.ragnaroknft.quest/api/snapshot-data');
	const data = await resp.json();

	const holders = data.holders.filter(h =>
		!SYSTEM_ACCOUNTS.has(h.account) && h.total >= MIN_DUAT_RAW
	);

	const totalDuat = holders.reduce((s, h) => s + h.total, 0);
	console.log(`\nTotal holders (≥1 DUAT): ${holders.length}`);
	console.log(`Total DUAT (raw): ${totalDuat.toLocaleString()}`);
	console.log(`Total DUAT (display): ${(totalDuat / PRECISION).toLocaleString()}`);
	console.log(`Target packs: ${TARGET_PACKS.toLocaleString()}`);
	console.log('');

	// Distribution histogram
	const brackets = [0, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];
	const histogram = new Map();
	for (const b of brackets) histogram.set(b, 0);
	for (const h of holders) {
		const display = h.total / PRECISION;
		for (let i = brackets.length - 1; i >= 0; i--) {
			if (display >= brackets[i]) {
				histogram.set(brackets[i], histogram.get(brackets[i]) + 1);
				break;
			}
		}
	}
	console.log('Distribution (display DUAT):');
	for (const [bracket, count] of histogram) {
		console.log(`  ≥${bracket.toLocaleString().padStart(12)} DUAT: ${String(count).padStart(5)} holders`);
	}

	// Compute sums for formula calibration
	let sumLog2 = 0;
	let sumSqrt = 0;
	for (const h of holders) {
		const display = h.total / PRECISION;
		if (display > 0) {
			sumLog2 += Math.log2(display);
			sumSqrt += Math.sqrt(display);
		}
	}
	console.log(`\nsum(log2(balance)): ${sumLog2.toFixed(2)}`);
	console.log(`sum(sqrt(balance)): ${sumSqrt.toFixed(2)}`);

	// Calibrate SCALE for log-linear formula
	// packs = floor(min(MAX, BASE + log2(balance) × SCALE))
	// We need: sum(packs) ≈ TARGET_PACKS
	// Approximate: TARGET = holders.length × BASE + SCALE × sumLog2
	// SCALE ≈ (TARGET - holders.length) / sumLog2
	const approxScale = (TARGET_PACKS - holders.length * BASE_PACKS) / sumLog2;
	console.log(`\nApproximate SCALE (no cap): ${approxScale.toFixed(4)}`);

	// Binary search for exact SCALE that hits target
	let lo = 0.01, hi = 20;
	for (let iter = 0; iter < 100; iter++) {
		const mid = (lo + hi) / 2;
		const total = computeTotal(holders, mid);
		if (total < TARGET_PACKS) lo = mid;
		else hi = mid;
	}
	const CALIBRATED_SCALE = (lo + hi) / 2;

	const totalPacks = computeTotal(holders, CALIBRATED_SCALE);
	const totalCards = totalPacks * 5;
	const pctSupply = (totalCards / 2_741_000) * 100;

	console.log(`\n═══ CALIBRATED RESULT ═══`);
	console.log(`SCALE = ${CALIBRATED_SCALE.toFixed(6)}`);
	console.log(`Total packs: ${totalPacks.toLocaleString()}`);
	console.log(`Total cards: ${totalCards.toLocaleString()}`);
	console.log(`% of 2,741,000 supply: ${pctSupply.toFixed(2)}%`);

	// Show example allocations
	console.log(`\n═══ EXAMPLE ALLOCATIONS ═══`);
	const sorted = [...holders].sort((a, b) => b.total - a.total);
	const examples = [
		...sorted.slice(0, 10),
		sorted[Math.floor(sorted.length * 0.25)],
		sorted[Math.floor(sorted.length * 0.5)],
		sorted[Math.floor(sorted.length * 0.75)],
		sorted[sorted.length - 1],
	];
	console.log('Account'.padEnd(25) + 'DUAT'.padStart(15) + 'Packs'.padStart(8));
	console.log('-'.repeat(48));
	for (const h of examples) {
		const display = h.total / PRECISION;
		const packs = calcPacks(display, CALIBRATED_SCALE);
		console.log(`${h.account.padEnd(25)}${display.toLocaleString().padStart(15)}${String(packs).padStart(8)}`);
	}

	// Verify: accounts with 0 packs
	const zeroPacks = holders.filter(h => calcPacks(h.total / PRECISION, CALIBRATED_SCALE) === 0).length;
	console.log(`\nAccounts with 0 packs: ${zeroPacks}`);

	// Stats
	const allPacks = holders.map(h => calcPacks(h.total / PRECISION, CALIBRATED_SCALE));
	const maxP = Math.max(...allPacks);
	const minP = Math.min(...allPacks);
	const avgP = allPacks.reduce((a, b) => a + b, 0) / allPacks.length;
	const medianP = allPacks.sort((a, b) => a - b)[Math.floor(allPacks.length / 2)];
	console.log(`Min packs: ${minP}, Max packs: ${maxP}, Avg: ${avgP.toFixed(1)}, Median: ${medianP}`);
}

function calcPacks(displayBalance, scale) {
	if (displayBalance <= 0) return 0;
	return Math.floor(Math.min(MAX_PACKS, BASE_PACKS + Math.log2(displayBalance) * scale));
}

function computeTotal(holders, scale) {
	let total = 0;
	for (const h of holders) {
		total += calcPacks(h.total / PRECISION, scale);
	}
	return total;
}

main().catch(console.error);
