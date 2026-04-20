#!/usr/bin/env node
/**
 * listMissingArt.mjs
 * Finds all collectible cards that have NO art via any of the 3 art lookup paths.
 *
 * Art lookup priority (mirrors getCardArtPath):
 *   1. CARD_ID_TO_ART[id]        — numeric ID → path
 *   2. VERCEL_CARD_ART[name]     — lowercase name → path (with hero-art guard)
 *   3. MINION_CARD_TO_ART[name]  — lowercase name → creature character (with creature-only guard)
 *
 * Card data is extracted by regex from all .ts files under cardRegistry/sets/.
 * Output: JSON array of missing cards to stdout.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const ART_MAPPING_PATH = join(ROOT, 'client/src/game/utils/art/artMapping.ts');
const CARD_REGISTRY_DIR = join(ROOT, 'client/src/game/data/cardRegistry/sets');

// ─── 1. Parse artMapping.ts ───────────────────────────────────────────────

const artSrc = readFileSync(ART_MAPPING_PATH, 'utf-8');

// 1a. CARD_ID_TO_ART: numeric keys
const cardIdToArt = new Set();
const idMapMatch = artSrc.match(/const CARD_ID_TO_ART[^{]*\{([^]*?)\n\};/);
if (idMapMatch) {
	const body = idMapMatch[1];
	for (const m of body.matchAll(/^\s*(\d+)\s*:/gm)) {
		cardIdToArt.add(Number(m[1]));
	}
}

// 1b. VERCEL_CARD_ART: lowercase card name keys → art paths
const vercelCardArt = new Map();
const vercelMatch = artSrc.match(/const VERCEL_CARD_ART[^{]*\{([^]*?)\n\};/);
if (vercelMatch) {
	const body = vercelMatch[1];
	for (const m of body.matchAll(/^\s*"([^"]+)"\s*:\s*"([^"]+)"/gm)) {
		vercelCardArt.set(m[1], m[2]);
	}
}

// 1c. MINION_CARD_TO_ART: lowercase card name → creature character name
const minionCardToArt = new Map();
const minionMatch = artSrc.match(/const MINION_CARD_TO_ART[^{]*\{([^]*?)\n\};/);
if (minionMatch) {
	const body = minionMatch[1];
	for (const m of body.matchAll(/^\s*"([^"]+)"\s*:\s*"([^"]+)"/gm)) {
		minionCardToArt.set(m[1], m[2]);
	}
}

// 1d. CREATURE_ART_CHARACTERS set
const creatureChars = new Set();
const creatureMatch = artSrc.match(/const CREATURE_ART_CHARACTERS\s*=\s*new Set\(\[([^]*?)\]\)/);
if (creatureMatch) {
	for (const m of creatureMatch[1].matchAll(/'([^']+)'/g)) {
		creatureChars.add(m[1]);
	}
}

// 1e. CHARACTER_ART_IDS: character name → art file ID
const characterArtIds = new Map();
const charMatch = artSrc.match(/const CHARACTER_ART_IDS[^{]*\{([^]*?)\n\};/);
if (charMatch) {
	for (const m of charMatch[1].matchAll(/^\s*'([^']+)'\s*:\s*'([^']+)'/gm)) {
		characterArtIds.set(m[1], m[2]);
	}
}

// 1f. HERO_ART_OVERRIDE values (art IDs reserved for heroes)
const heroArtIds = new Set();
const heroOverrideMatch = artSrc.match(/const HERO_ART_OVERRIDE[^{]*\{([^]*?)\n\};/);
if (heroOverrideMatch) {
	for (const m of heroOverrideMatch[1].matchAll(/:\s*'([^']+)'/g)) {
		heroArtIds.add(m[1]);
	}
}

// Build ALL_CHARACTER_ART_IDS_SET (all values from CHARACTER_ART_IDS)
const allCharArtIdsSet = new Set(characterArtIds.values());
// Build CREATURE_RESERVED_ART_IDS (creature chars that have art)
const creatureReservedArtIds = new Set();
for (const ch of creatureChars) {
	const artId = characterArtIds.get(ch);
	if (artId) creatureReservedArtIds.add(artId);
}
// Build HERO_ART_PATHS
const heroArtPaths = new Set();
for (const id of heroArtIds) {
	heroArtPaths.add(`/art/${id}.webp`);
}

// ─── 2. Replicate getCardArtPath logic ────────────────────────────────────

function hasArt(cardName, cardId) {
	// Check CARD_ID_TO_ART (with hero guard)
	if (cardId != null && cardIdToArt.has(cardId)) {
		const path = artSrc.match(new RegExp(`^\\s*${cardId}\\s*:\\s*'([^']+)'`, 'm'));
		if (path) {
			if (heroArtPaths.has(path[1])) return false;
			return true;
		}
		return true;
	}

	const lowerName = cardName.toLowerCase().trim();

	// Check VERCEL_CARD_ART (with hero guard)
	const vercelUrl = vercelCardArt.get(lowerName);
	if (vercelUrl) {
		const artIdMatch = vercelUrl.match(/\/art\/(.+)\.webp$/);
		if (artIdMatch) {
			const artId = artIdMatch[1];
			if ((allCharArtIdsSet.has(artId) && !creatureReservedArtIds.has(artId)) || heroArtIds.has(artId)) {
				return false;
			}
		}
		return true;
	}

	// Check MINION_CARD_TO_ART (with creature-only guard)
	const character = minionCardToArt.get(lowerName);
	if (!character) return false;
	if (!creatureChars.has(character)) return false;
	const artId = characterArtIds.get(character);
	if (!artId) return false;
	return true;
}

// ─── 3. Extract card data from card registry TS files ─────────────────────

function walkDir(dir) {
	const files = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			files.push(...walkDir(full));
		} else if (entry.endsWith('.ts') && entry !== 'index.ts' && entry !== 'validation.ts') {
			files.push(full);
		}
	}
	return files;
}

/**
 * Extract card objects from a TypeScript source file.
 * We look for object literals with at least `id:` and `name:` fields.
 * Uses a brace-counting parser to find complete object boundaries.
 */
function extractCards(src) {
	const cards = [];
	// Find all object literals that have an `id:` field with a numeric value
	// Strategy: find `{` that contains `id: <number>` and `name: ` within the same block

	// Simple approach: find all top-level objects in arrays by matching balanced braces
	const objectBodies = [];
	let i = 0;
	while (i < src.length) {
		// Look for start of object literal that likely is a card
		if (src[i] === '{') {
			let depth = 1;
			let start = i;
			i++;
			while (i < src.length && depth > 0) {
				if (src[i] === '{') depth++;
				else if (src[i] === '}') depth--;
				// Skip string contents
				else if (src[i] === '\'' || src[i] === '"' || src[i] === '`') {
					const quote = src[i];
					i++;
					while (i < src.length && src[i] !== quote) {
						if (src[i] === '\\') i++;
						i++;
					}
				}
				i++;
			}
			const body = src.slice(start, i);
			if (body.match(/\bid\s*:\s*\d/) && body.match(/\bname\s*:/)) {
				objectBodies.push(body);
			}
		} else {
			i++;
		}
	}

	for (const body of objectBodies) {
		const card = {};

		const idM = body.match(/\bid\s*:\s*(\d+)/);
		if (idM) card.id = Number(idM[1]);
		else continue;

		const nameM = body.match(/\bname\s*:\s*['"`]((?:[^'"`\\]|\\.)*)['"`]/);
		if (nameM) card.name = nameM[1].replace(/\\(.)/g, '$1');
		else continue;

		const typeM = body.match(/\btype\s*:\s*['"`]([^'"`]+)['"`]/);
		if (typeM) card.type = typeM[1];

		const classM = body.match(/\b(?:heroClass|class)\s*:\s*['"`]([^'"`]+)['"`]/);
		card.class = classM ? classM[1] : 'neutral';

		const rarityM = body.match(/\brarity\s*:\s*['"`]([^'"`]+)['"`]/);
		if (rarityM) card.rarity = rarityM[1];

		const raceM = body.match(/\brace\s*:\s*['"`]([^'"`]+)['"`]/);
		if (raceM) card.race = raceM[1];

		const atkM = body.match(/\battack\s*:\s*(\d+)/);
		if (atkM) card.attack = Number(atkM[1]);

		const hpM = body.match(/\bhealth\s*:\s*(\d+)/);
		if (hpM) card.health = Number(hpM[1]);

		const manaM = body.match(/\b(?:manaCost|cost)\s*:\s*(\d+)/);
		if (manaM) card.manaCost = Number(manaM[1]);

		const descM = body.match(/\bdescription\s*:\s*['"`]((?:[^'"`\\]|\\.)*)['"`]/);
		if (descM) card.description = descM[1];

		const collectM = body.match(/\bcollectible\s*:\s*(true|false)/);
		if (collectM) card.collectible = collectM[1] === 'true';

		// Keywords array
		const kwM = body.match(/\bkeywords\s*:\s*\[([^\]]*)\]/);
		if (kwM) {
			card.keywords = [...kwM[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
		}

		cards.push(card);
	}

	return cards;
}

// Scan both cardRegistry/sets AND the broader data/ directory for all card sources
const GAME_DATA_DIR = join(ROOT, 'client/src/game/data');

// Extra top-level card files known from cardRegistry/index.ts imports
const EXTRA_CARD_FILES = [
	'additionalLegendaryCards.ts',
	'iconicLegendaryCards.ts',
	'modernLegendaryCards.ts',
	'finalLegendaryCards.ts',
	'expansionLegendaryCards.ts',
	'questCards.ts',
	'outcastCards.ts',
	'recruitCards.ts',
	'spellburstCards.ts',
	'secretCards.ts',
	'classMinions.ts',
	'pokerSpellCards.ts',
	'cards.ts',
	'neutralMinions.ts',
	'legendaryCards.ts',
	'spellCards.ts',
	'additionalSpellCards.ts',
	'additionalClassMinions.ts',
	'colossalCards.ts',
	'druidCards.ts',
	'rogueCards.ts',
	'warlockCards.ts',
	'selfDamageCards.ts',
	'mechanicCards.ts',
	'starterSet.ts',
].map(f => join(GAME_DATA_DIR, f)).filter(f => {
	try { statSync(f); return true; } catch { return false; }
});

const superMinionFiles = walkDir(join(GAME_DATA_DIR, 'sets'));

const allCardFiles = [
	...walkDir(CARD_REGISTRY_DIR),
	...EXTRA_CARD_FILES,
	...superMinionFiles,
];

// Deduplicate by ID (first occurrence wins, matching validateCardRegistry behavior)
const cardMap = new Map();

for (const file of allCardFiles) {
	const src = readFileSync(file, 'utf-8');
	const cards = extractCards(src);
	for (const c of cards) {
		if (!cardMap.has(c.id)) {
			cardMap.set(c.id, c);
		}
	}
}

// ─── 4. Filter to collectible cards without art ──────────────────────────

const allCards = [...cardMap.values()];
const collectible = allCards.filter(c => c.collectible !== false);
const missing = collectible.filter(c => !hasArt(c.name, c.id));

// Sort by ID
missing.sort((a, b) => a.id - b.id);

// ─── 5. Summary stats ────────────────────────────────────────────────────

const typeCounts = {};
for (const c of missing) {
	const t = c.type || 'unknown';
	typeCounts[t] = (typeCounts[t] || 0) + 1;
}
const classCounts = {};
for (const c of missing) {
	const cl = c.class || 'neutral';
	classCounts[cl] = (classCounts[cl] || 0) + 1;
}
const rarityCounts = {};
for (const c of missing) {
	const r = c.rarity || 'unknown';
	rarityCounts[r] = (rarityCounts[r] || 0) + 1;
}

const summary = {
	totalCollectible: collectible.length,
	totalWithArt: collectible.length - missing.length,
	totalMissingArt: missing.length,
	coveragePercent: ((collectible.length - missing.length) / collectible.length * 100).toFixed(1) + '%',
	missingByType: typeCounts,
	missingByClass: classCounts,
	missingByRarity: rarityCounts,
	artMapSizes: {
		CARD_ID_TO_ART: cardIdToArt.size,
		VERCEL_CARD_ART: vercelCardArt.size,
		MINION_CARD_TO_ART: minionCardToArt.size,
	},
};

console.error('=== Missing Art Summary ===');
console.error(JSON.stringify(summary, null, 2));
console.error('');

// Output the full list to stdout
console.log(JSON.stringify(missing, null, 2));
