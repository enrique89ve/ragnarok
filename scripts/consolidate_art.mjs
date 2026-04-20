#!/usr/bin/env node
/**
 * Art map consolidation script
 * Merges VERCEL_CARD_ART and MINION_CARD_TO_ART entries into CARD_ID_TO_ART
 * by matching card names to IDs from the card registry.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const ART_MAPPING_PATH = join(ROOT, 'client/src/game/utils/art/artMapping.ts');

// ─── Step 1: Parse artMapping.ts ───────────────────────────────────────────

const artSrc = readFileSync(ART_MAPPING_PATH, 'utf-8');

// Extract CARD_ID_TO_ART (number → string)
function extractCardIdToArt(src) {
	const map = {};
	const startMarker = 'const CARD_ID_TO_ART: Record<number, string> = {';
	const startIdx = src.indexOf(startMarker);
	if (startIdx < 0) throw new Error('Could not find CARD_ID_TO_ART');
	const block = src.slice(startIdx);
	const endIdx = block.indexOf('};');
	const body = block.slice(0, endIdx);
	const re = /(\d+):\s*'([^']+)'/g;
	let m;
	while ((m = re.exec(body)) !== null) {
		map[parseInt(m[1])] = m[2];
	}
	return map;
}

// Extract VERCEL_CARD_ART (string → string)
function extractVercelCardArt(src) {
	const map = {};
	const startMarker = 'const VERCEL_CARD_ART: Record<string, string> = {';
	const startIdx = src.indexOf(startMarker);
	if (startIdx < 0) throw new Error('Could not find VERCEL_CARD_ART');
	const block = src.slice(startIdx);
	const endIdx = block.indexOf('};');
	const body = block.slice(0, endIdx);
	const re = /"([^"]+)":\s*"([^"]+)"/g;
	let m;
	while ((m = re.exec(body)) !== null) {
		map[m[1]] = m[2];
	}
	return map;
}

// Extract MINION_CARD_TO_ART (string → string character name)
function extractMinionCardToArt(src) {
	const map = {};
	const startMarker = 'const MINION_CARD_TO_ART: Record<string, string> = {';
	const startIdx = src.indexOf(startMarker);
	if (startIdx < 0) throw new Error('Could not find MINION_CARD_TO_ART');
	const block = src.slice(startIdx);
	const endIdx = block.indexOf('};');
	const body = block.slice(0, endIdx);
	const re = /"([^"]+)":\s*"([^"]+)"/g;
	let m;
	while ((m = re.exec(body)) !== null) {
		map[m[1]] = m[2];
	}
	return map;
}

// Extract CHARACTER_ART_IDS (string → string)
function extractCharacterArtIds(src) {
	const map = {};
	const startMarker = "const CHARACTER_ART_IDS: Record<string, string> = {";
	const startIdx = src.indexOf(startMarker);
	if (startIdx < 0) throw new Error('Could not find CHARACTER_ART_IDS');
	const block = src.slice(startIdx);
	const endIdx = block.indexOf('};');
	const body = block.slice(0, endIdx);
	const re = /'([^']+)':\s*'([^']+)'/g;
	let m;
	while ((m = re.exec(body)) !== null) {
		map[m[1]] = m[2];
	}
	return map;
}

const cardIdToArt = extractCardIdToArt(artSrc);
const vercelCardArt = extractVercelCardArt(artSrc);
const minionCardToArt = extractMinionCardToArt(artSrc);
const characterArtIds = extractCharacterArtIds(artSrc);

console.log(`Existing CARD_ID_TO_ART entries: ${Object.keys(cardIdToArt).length}`);
console.log(`VERCEL_CARD_ART entries: ${Object.keys(vercelCardArt).length}`);
console.log(`MINION_CARD_TO_ART entries: ${Object.keys(minionCardToArt).length}`);
console.log(`CHARACTER_ART_IDS entries: ${Object.keys(characterArtIds).length}`);

// ─── Step 2: Build name→ID lookup from card data ──────────────────────────

// Parse all TypeScript card data files to extract card IDs and names
function findTsFiles(dir) {
	const files = [];
	try {
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			try {
				const stat = statSync(full);
				if (stat.isDirectory()) {
					files.push(...findTsFiles(full));
				} else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
					files.push(full);
				}
			} catch { /* skip */ }
		}
	} catch { /* skip */ }
	return files;
}

// Extract cards from TS source files by regex
function extractCardsFromFile(filePath) {
	const cards = [];
	const src = readFileSync(filePath, 'utf-8');

	// Match patterns like: id: 12345 ... name: 'Card Name' or name: "Card Name"
	// Cards are objects in arrays, we look for id/name pairs
	const idRe = /\bid\s*:\s*(\d+)/g;
	const nameRe = /\bname\s*:\s*(?:'([^']*)'|"([^"]*)")/g;

	const ids = [];
	const names = [];
	let m;
	while ((m = idRe.exec(src)) !== null) {
		ids.push({ value: parseInt(m[1]), index: m.index });
	}
	while ((m = nameRe.exec(src)) !== null) {
		names.push({ value: m[1] || m[2], index: m.index });
	}

	// Match each id with the nearest following name (within 500 chars)
	for (const id of ids) {
		let bestName = null;
		let bestDist = Infinity;
		for (const name of names) {
			const dist = name.index - id.index;
			if (dist > 0 && dist < 500 && dist < bestDist) {
				bestDist = dist;
				bestName = name.value;
			}
		}
		if (bestName) {
			cards.push({ id: id.value, name: bestName });
		}
	}

	return cards;
}

const cardDataDirs = [
	join(ROOT, 'client/src/game/data/cardRegistry'),
	join(ROOT, 'client/src/game/data'),
];

const nameToIds = new Map(); // lowercase name → [card IDs]
const allCardIds = new Set();
const processedFiles = new Set();

for (const dir of cardDataDirs) {
	const files = findTsFiles(dir);
	for (const f of files) {
		if (processedFiles.has(f)) continue;
		// Skip non-card files
		const base = f.split(/[/\\]/).pop();
		if (['index.ts', 'validation.ts', 'allCards.ts', 'cardDatabase.ts', 'cardDatabaseUtils.ts',
			'discoverPools.ts', 'discoveryHelper.ts', 'heroes.ts', 'keywordDefinitions.ts',
			'dailyQuestPool.ts', 'ChessPieceConfig.ts', 'starterSet.ts'].includes(base)) continue;
		processedFiles.add(f);

		const cards = extractCardsFromFile(f);
		for (const c of cards) {
			allCardIds.add(c.id);
			const lower = c.name.toLowerCase();
			if (!nameToIds.has(lower)) nameToIds.set(lower, []);
			const arr = nameToIds.get(lower);
			if (!arr.includes(c.id)) arr.push(c.id);
		}
	}
}

console.log(`\nTotal unique card IDs found: ${allCardIds.size}`);
console.log(`Total unique card names found: ${nameToIds.size}`);

// ─── Step 3: Merge VERCEL_CARD_ART into CARD_ID_TO_ART ────────────────────

const newFromVercel = {};
let vercelAlreadyCovered = 0;
let vercelNoMatch = 0;
const vercelUnmatched = [];

for (const [name, artPath] of Object.entries(vercelCardArt)) {
	const ids = nameToIds.get(name);
	if (!ids || ids.length === 0) {
		vercelNoMatch++;
		vercelUnmatched.push(name);
		continue;
	}

	let allCovered = true;
	for (const id of ids) {
		if (cardIdToArt[id]) {
			// Already in CARD_ID_TO_ART
		} else {
			allCovered = false;
			newFromVercel[id] = artPath;
		}
	}
	if (allCovered) vercelAlreadyCovered++;
}

console.log(`\n=== VERCEL_CARD_ART merge ===`);
console.log(`Already covered by CARD_ID_TO_ART: ${vercelAlreadyCovered}`);
console.log(`New entries to add: ${Object.keys(newFromVercel).length}`);
console.log(`Could not resolve name to ID: ${vercelNoMatch}`);
if (vercelUnmatched.length > 0) {
	console.log(`\nUnmatched VERCEL names (first 30):`);
	vercelUnmatched.slice(0, 30).forEach(n => console.log(`  - "${n}"`));
	if (vercelUnmatched.length > 30) console.log(`  ... and ${vercelUnmatched.length - 30} more`);
}

// ─── Step 4: Merge MINION_CARD_TO_ART into CARD_ID_TO_ART ─────────────────

const newFromMinion = {};
let minionAlreadyCovered = 0;
let minionNoMatch = 0;
let minionNoArt = 0;
const minionUnmatched = [];

for (const [name, character] of Object.entries(minionCardToArt)) {
	// Resolve character → art path
	let artPath;
	if (character.startsWith('/')) {
		// Direct path (e.g. "/art/demon_lord_helheim.png")
		artPath = character;
	} else {
		const artId = characterArtIds[character];
		if (!artId) {
			minionNoArt++;
			continue;
		}
		artPath = `/art/${artId}.webp`;
	}

	const ids = nameToIds.get(name);
	if (!ids || ids.length === 0) {
		minionNoMatch++;
		minionUnmatched.push(name);
		continue;
	}

	let allCovered = true;
	for (const id of ids) {
		if (cardIdToArt[id] || newFromVercel[id]) {
			// Already covered
		} else {
			allCovered = false;
			newFromMinion[id] = artPath;
		}
	}
	if (allCovered) minionAlreadyCovered++;
}

console.log(`\n=== MINION_CARD_TO_ART merge ===`);
console.log(`Already covered by CARD_ID_TO_ART: ${minionAlreadyCovered}`);
console.log(`New entries to add: ${Object.keys(newFromMinion).length}`);
console.log(`Could not resolve name to ID: ${minionNoMatch}`);
console.log(`Character not in CHARACTER_ART_IDS: ${minionNoArt}`);
if (minionUnmatched.length > 0) {
	console.log(`\nUnmatched MINION names:`);
	minionUnmatched.forEach(n => console.log(`  - "${n}"`));
}

// ─── Step 5: Generate output ───────────────────────────────────────────────

const totalNew = Object.keys(newFromVercel).length + Object.keys(newFromMinion).length;
console.log(`\n=== TOTAL ===`);
console.log(`New entries to add to CARD_ID_TO_ART: ${totalNew}`);

// Sort by ID
const sortedVercel = Object.entries(newFromVercel).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
const sortedMinion = Object.entries(newFromMinion).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

if (sortedVercel.length > 0) {
	console.log(`\n// ─── Merged from VERCEL_CARD_ART (${sortedVercel.length} entries) ───`);
	for (const [id, path] of sortedVercel) {
		console.log(`\t${id}: '${path}',`);
	}
}

if (sortedMinion.length > 0) {
	console.log(`\n// ─── Merged from MINION_CARD_TO_ART (${sortedMinion.length} entries) ───`);
	for (const [id, path] of sortedMinion) {
		console.log(`\t${id}: '${path}',`);
	}
}

// ─── Step 6: Coverage report ───────────────────────────────────────────────

// Check how many cards still have NO art after merge
const allCoveredIds = new Set([
	...Object.keys(cardIdToArt).map(Number),
	...Object.keys(newFromVercel).map(Number),
	...Object.keys(newFromMinion).map(Number),
]);

// Also count name-based matches that couldn't get IDs but have art
let withoutArt = 0;
let withArt = 0;
for (const id of allCardIds) {
	if (allCoveredIds.has(id)) {
		withArt++;
	} else {
		withoutArt++;
	}
}

console.log(`\n=== COVERAGE AFTER CONSOLIDATION ===`);
console.log(`Cards with art in CARD_ID_TO_ART: ${allCoveredIds.size} (of ${allCardIds.size} known IDs)`);
console.log(`Cards still without art: ${withoutArt}`);
console.log(`Coverage: ${((withArt / allCardIds.size) * 100).toFixed(1)}%`);
