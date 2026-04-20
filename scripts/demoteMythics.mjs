/**
 * demoteMythics.mjs
 *
 * Scans all card data files for mythic-rarity cards and demotes non-iconic ones
 * to epic or rare. Target: ~300 mythic minions/spells remaining.
 *
 * Artifacts (29800-29967) and Pets (50000-50999) are KEPT mythic separately.
 * Base/basic cards are excluded from NFT supply entirely.
 *
 * Usage: node scripts/demoteMythics.mjs [--dry-run] [--apply]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../client/src/game/data');

const DRY_RUN = !process.argv.includes('--apply');

// ==================== KEEP MYTHIC RULES ====================

// ID ranges that ALWAYS stay mythic
const KEEP_MYTHIC_RANGES = [
	[29800, 29967],  // Artifacts (hero equipment)
	[50000, 50999],  // Pet evolution cards (Stage 3)
	[95001, 95084],  // Hero super minions (signature cards)
	[95501, 95512],  // Quest reward cards
];

// Major deity/entity names that ALWAYS stay mythic (case-insensitive partial match)
const ICONIC_NAMES = [
	// Norse major gods
	'odin', 'thor', 'loki', 'freya', 'freyja', 'baldur', 'baldr', 'tyr', 'heimdall',
	'hel,', 'frigg', 'njord', 'njörð', 'skadi', 'bragi', 'idunn', 'idun',
	'vidar', 'víðarr', 'forseti',
	// Norse primordial/cosmic
	'ymir', 'surtr', 'surt', 'fenrir', 'fenris', 'jormungandr', 'jörmungandr',
	'nidhogg', 'níðhöggr', 'yggdrasil', 'ragnarok', 'ragnarök',
	'bifrost', 'mjolnir', 'mjölnir', 'gungnir',
	'ginnungagap',
	// Norse key figures (top tier only, lesser ones demote to epic)
	'sinmara',
	// Greek Olympians
	'zeus', 'poseidon', 'hades', 'athena', 'apollo', 'artemis',
	'ares', 'aphrodite', 'hermes', 'hephaestus', 'hera', 'dionysus',
	'demeter', 'hestia', 'persephone',
	// Greek Titans/primordial (major only)
	'chronos', 'kronos', 'cronus', 'hyperion', 'prometheus',
	'gaia', 'tartarus', 'nyx',
	'typhon', 'cerberus',
	// Japanese
	'izanami', 'izanagi', 'tsukuyomi', 'amaterasu', 'susanoo',
	'fujin', 'raijin', 'sarutahiko', 'kamimusubi',
	// Egyptian (major only)
	'ammit', 'anubis', 'ra,', 'osiris', 'isis', 'thoth',
	// Elder Titans (renamed Old Gods)
	'gullveig', 'hyrrokkin', 'utgarda-loki', 'fornjot', 'fornjót',
	'c\'thun', 'n\'zoth', 'yogg', 'y\'shaarj',
	// Primordial entities (exact major ones only)
	'allfather', 'world tree', 'world serpent', 'twilight of the gods',
];

// Exact card IDs to FORCE KEEP as mythic (override any demotion rule)
const FORCE_KEEP_IDS = new Set([
	// Core Norse set iconic cards (20xxx range)
	20001, 20003, 20005, 20007, 20009, 20011, 20013, 20015, 20017, 20019,
	// Legendary weapons
	20710, 20711, 20712,
	// Norse mechanic payoff mythics (31xxx)
	31907, 31910, 31914, 31918, 31922,
	// Greek mythic minions
	32101, 32102, 32103, 32104, 32105, 32106,
]);

// ID ranges to ALWAYS DEMOTE (override name matching)
const FORCE_DEMOTE_RANGES = [
	[90001, 90112],  // Hero alternate skins — cosmetic, not deck cards
	[10501, 10603],  // DK hero cards — hero type, not collectible minions
];

// Specific IDs to force demote regardless of name
const FORCE_DEMOTE_IDS = new Set([
	// C3 questionable cards (generic effects)
	3004,   // Fin of the Deep One
	3015,   // The Draugr King (generic DK card)
	3038,   // Frost Wyrm
	3100,   // Shield of the Colossus
	3101,   // Hand of Poseidon (token part)
	4009,   // Lich Queen
	4010,   // Death Knight
	4119,   // Army of Bones
	4304,   // Shadowmaw Alpha
	4305,   // Shadowmaw Direwolf
	4328,   // Draugr, the Deathless Hunger
	4351,   // Muspel (generic)
	4380,   // Abyssal Kraken
	4390,   // Huginn, Odin's Raven (companion, not deity)
	4391,   // Muninn, Odin's Raven (companion, not deity)
	4401,   // Hildisvini (Freyja's boar companion)
	4402,   // Huldra, Forest Spirit (lesser spirit)
	4404,   // Gullinkambi (rooster, not deity)
	4411,   // Bygul (Freyja's cat)
	4413,   // Stormcaller Wyvern
	4415,   // Trjegul (Freyja's cat)
	5022,   // Phoenix (generic creature)
	5024,   // Muspeldreki (generic fire dragon)
	5025,   // Eldjotnar (lesser fire giant)
	5026,   // Muspel (dupe)
	5071,   // Restoration Golem
	5070,   // Transmutation Engine
	5101,   // Mythic War-Sovereign (generic)
	5306,   // Þundrvættr, Storm Spirit (lesser spirit)
	5308,   // Sleipnir (mount, not deity — keep 1)
	5309,   // Frey (duplicate of Freyr)
	5405,   // Voidfang
	5503,   // Ljósálfr (generic light elf)
	5558,   // Granite Hound
	7020,   // Fang Commander
	7201,   // Gram, Sword of Heroes (weapon, not deity)
	8027,   // Rider of Famine
	8028,   // Rider of Pestilence
	8029,   // Rider of War
	8030,   // Rider of Death
	8505,   // Rider of Famine token
	8506,   // Rider of Pestilence token
	8507,   // Rider of War token
	8508,   // Rider of Death token
	8540,   // Luminous Blade
	9110,   // Skull of Prometheus (duplicate)
	9112,   // Swift-Winged Messenger-Fiend (generic)
	9123,   // Typhon variant (duplicate)
	13009,  // Al card (generic)
	13012,  // Magni Stormcaller (duplicate variant)
	13026,  // Rán, Queen of the Sea (lesser deity)
	13047,  // Curse Lord of Circe (generic)
	15019,  // Abyssal Soul-Reaper
	20016,  // Blackwater Behemoth
	20612,  // Fenrir, the Worldbreaker (token)
	31806,  // Svartalf Combo Master
	32096,  // Kel
	33214,  // Arcane Giant of Olympus
	33266,  // Aviana, Goddess of Birds (lesser)
	33267,  // Chronos the Forgotten (dupe variant)
	35018,  // Storm Weaver
	36103,  // Mass Raise Dead
	36104,  // Draugr Overlord
	38606,  // Savanna Prowler
	38805,  // Muspel Lifedrinker
	38808,  // Bolthorn (lesser giant)
	40029,  // Heroic Challenger
	40114,  // Baine Bloodhoof
	48104,  // Nyx, Dark Inquisitor (dupe variant)
	70101,  // Mímir token
	70105,  // Mímir token
	70110,  // Mímir token
	85010,  // Nyxshade Assassin (generic rogue)
	90206,  // Colossus of Rhodes
	91103,  // Surtr, Rage Unbound (dupe variant)
	95116,  // Chaos Elemental
	// Duplicate deity variants — keep 1-2 per deity, demote extras
	95301,  // Fenrir (generic name dupe)
	95302,  // Fenrir, the Worldbreaker (3rd variant)
	95304,  // Fenrir, Soul Flayer (4th variant)
	95316,  // Sleipnir, the Immortal (mount)
	96012,  // Nyx, the Hollow (dupe variant)
	// Excess Nidhogg variants (keep 4303 primary + 32061, demote rest)
	5114,   // Nidhogg the Eternal (priest variant)
	32062,  // Nidhogg the World-Ender (3rd variant)
	38110,  // Nidhogg, Corpse Eater (DK variant)
	38407,  // Nidhogg (druid variant)
	95239,  // Nidhogg, World Eater (5th variant)
	// Excess Surtr variants (keep 5020 + 20114, demote rest)
	17101,  // Surtr, Flame Lord (warlock variant)
	36202,  // Surtr, Lord of Muspelheim (berserker variant)
	32090,  // Surtr (neutral dupe)
	95423,  // Surtr (expansion dupe)
	91103,  // Surtr, Rage Unbound (another dupe)
	// Excess Chronos variants (keep 20801, demote rest)
	32063,  // Chronos the Time Dragon (dupe)
	95209,  // Chronos, Time Dragon (another dupe)
	// Excess Typhon variants (keep 4322 + 32202, demote rest)
	95114,  // Typhon, Dragon Lord (3rd variant)
	95131,  // Typhon, Storm Titan (4th variant)
	20117,  // Typhon, Chaos Elemental (5th variant)
	// Excess Baldur variants (keep 4392 + 20018, demote rest)
	8001,   // Baldur (paladin, generic)
	8025,   // Baldur the Radiant (cards.ts dupe)
	// Other excess variants
	9105,   // Skull of Prometheus (item, not deity)
	60010,  // Thrall of Gullveig (cultist, not deity)
	70016,  // Barnabus, World Tree Spirit (lesser spirit)
	16020,  // Hephaestus, Divine Smith (dupe of 20300)
	95104,  // Dionysus the Showman (lesser variant)
]);

// ==================== LOGIC ====================

function isInRange(id, ranges) {
	return ranges.some(([min, max]) => id >= min && id <= max);
}

function isIconicName(name) {
	const lower = name.toLowerCase();
	return ICONIC_NAMES.some(term => lower.includes(term));
}

function shouldKeepMythic(id, name) {
	// Force demote always wins
	if (FORCE_DEMOTE_IDS.has(id)) return false;
	if (isInRange(id, FORCE_DEMOTE_RANGES)) return false;

	// Protected ranges always keep
	if (isInRange(id, KEEP_MYTHIC_RANGES)) return true;

	// Force keep IDs
	if (FORCE_KEEP_IDS.has(id)) return true;

	// Iconic name check
	if (isIconicName(name)) return true;

	return false;
}

function getNewRarity(id, name, type) {
	// Token parts → rare
	if (type === 'token' || [3004, 3100, 8505, 8506, 8507, 8508, 40114].includes(id)) {
		return 'rare';
	}
	return 'epic';
}

// ==================== FILE PROCESSING ====================

function findTsFiles(dir) {
	const results = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...findTsFiles(full));
		} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
			results.push(full);
		}
	}
	return results;
}

// Match card objects with rarity: 'mythic' and extract their id and name
// This regex finds blocks containing both an id field and rarity: 'mythic'
function processFile(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');
	if (!content.includes("'mythic'") && !content.includes('"mythic"')) return { changes: 0, kept: 0, demoted: [], keptCards: [] };

	let newContent = content;
	let changes = 0;
	let kept = 0;
	const demoted = [];
	const keptCards = [];

	// Find card objects: look for id: NUMBER followed by rarity: 'mythic' within reasonable proximity
	// We'll use a line-by-line approach to find card blocks
	const lines = content.split('\n');
	let currentId = null;
	let currentName = null;
	let currentType = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Track current card context
		const idMatch = line.match(/\bid:\s*(\d+)/);
		if (idMatch) currentId = parseInt(idMatch[1]);

		const nameMatch = line.match(/\bname:\s*['"]([^'"]+)['"]/);
		if (nameMatch) currentName = nameMatch[1];

		const typeMatch = line.match(/\btype:\s*['"]([^'"]+)['"]/);
		if (typeMatch) currentType = typeMatch[1];

		// Check for mythic rarity
		if (line.match(/rarity:\s*['"]mythic['"]/)) {
			if (currentId !== null) {
				const name = currentName || `Unknown_${currentId}`;
				if (shouldKeepMythic(currentId, name)) {
					kept++;
					keptCards.push({ id: currentId, name, line: i + 1 });
				} else {
					const newRarity = getNewRarity(currentId, name, currentType);
					demoted.push({ id: currentId, name, newRarity, line: i + 1 });
					changes++;
				}
			}
		}

		// Reset context on object boundaries (closing brace at low indentation)
		if (line.match(/^\t?\}/) || line.match(/^\s{0,4}\}/)) {
			// Don't reset - card properties can span many lines
		}
	}

	// Now apply the changes
	if (changes > 0 && !DRY_RUN) {
		// For each demoted card, replace its rarity line
		// We need to be careful to replace the RIGHT mythic occurrence
		// Strategy: go through demoted list, find each card's id in the file, then find the nearest rarity: 'mythic'
		for (const card of demoted) {
			// Find the card by its ID in the content
			const idPatterns = [
				`id: ${card.id},`,
				`id: ${card.id} `,
				`id: ${card.id}\n`,
				`id: ${card.id}\r`,
			];

			let idPos = -1;
			for (const pat of idPatterns) {
				idPos = newContent.indexOf(pat);
				if (idPos >= 0) break;
			}

			if (idPos < 0) continue;

			// Find the nearest rarity: 'mythic' AFTER this id position (within 2000 chars)
			const searchRegion = newContent.substring(idPos, idPos + 2000);
			const rarityMatch = searchRegion.match(/rarity:\s*'mythic'/);
			if (rarityMatch) {
				const rarityPos = idPos + rarityMatch.index;
				const oldStr = rarityMatch[0];
				const newStr = `rarity: '${card.newRarity}'`;
				newContent = newContent.substring(0, rarityPos) + newStr + newContent.substring(rarityPos + oldStr.length);
			} else {
				// Try double quotes
				const rarityMatch2 = searchRegion.match(/rarity:\s*"mythic"/);
				if (rarityMatch2) {
					const rarityPos = idPos + rarityMatch2.index;
					const oldStr = rarityMatch2[0];
					const newStr = `rarity: "${card.newRarity}"`;
					newContent = newContent.substring(0, rarityPos) + newStr + newContent.substring(rarityPos + oldStr.length);
				}
			}
		}

		if (newContent !== content) {
			fs.writeFileSync(filePath, newContent, 'utf8');
		}
	}

	return { changes, kept, demoted, keptCards };
}

// ==================== MAIN ====================

const LIST_KEPT = process.argv.includes('--list-kept');

console.log(`\n=== Mythic Rarity Demotion Script ===`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (use --apply to write changes)' : 'APPLYING CHANGES'}\n`);

const files = findTsFiles(ROOT);
console.log(`Scanning ${files.length} TypeScript files...\n`);

let totalKept = 0;
let totalDemoted = 0;
let totalToEpic = 0;
let totalToRare = 0;
const allDemoted = [];
const allKept = [];
const fileChanges = [];

for (const filePath of files) {
	const { changes, kept, demoted, keptCards } = processFile(filePath);
	totalKept += kept;
	totalDemoted += changes;

	for (const d of demoted) {
		if (d.newRarity === 'epic') totalToEpic++;
		if (d.newRarity === 'rare') totalToRare++;
		allDemoted.push({ ...d, file: path.relative(ROOT, filePath) });
	}
	for (const k of keptCards) {
		allKept.push({ ...k, file: path.relative(ROOT, filePath) });
	}

	if (changes > 0 || kept > 0) {
		fileChanges.push({ file: path.relative(ROOT, filePath), changes, kept });
	}
}

console.log(`\n=== RESULTS ===\n`);
console.log(`Total mythic cards found: ${totalKept + totalDemoted}`);
console.log(`Kept as mythic: ${totalKept}`);
console.log(`Demoted: ${totalDemoted} (${totalToEpic} → epic, ${totalToRare} → rare)`);

console.log(`\n--- Files Changed ---`);
for (const fc of fileChanges) {
	console.log(`  ${fc.file}: ${fc.changes} demoted, ${fc.kept} kept`);
}

console.log(`\n--- Demoted Cards ---`);
for (const d of allDemoted) {
	console.log(`  [${d.id}] ${d.name} → ${d.newRarity} (${d.file}:${d.line})`);
}

if (LIST_KEPT) {
	// Filter out protected ranges (artifacts, pets, super minions, quest rewards)
	const nonProtected = allKept.filter(k => !isInRange(k.id, KEEP_MYTHIC_RANGES));
	console.log(`\n--- Kept Mythic Minions/Spells (${nonProtected.length}, excluding artifacts/pets/supers/quests) ---`);
	for (const k of nonProtected.sort((a, b) => a.id - b.id)) {
		console.log(`  [${k.id}] ${k.name} (${k.file})`);
	}
}

// Check if we need more demotions
if (totalKept > 320) {
	console.log(`\n⚠️  WARNING: ${totalKept} mythics remaining is above 300 target.`);
	console.log(`   Need to demote ~${totalKept - 300} more cards.`);
	console.log(`   Consider expanding FORCE_DEMOTE_IDS or tightening ICONIC_NAMES.`);
} else if (totalKept < 280) {
	console.log(`\n⚠️  WARNING: ${totalKept} mythics remaining is below 280.`);
	console.log(`   Consider adding more cards to FORCE_KEEP_IDS.`);
} else {
	console.log(`\n✅ Mythic count (${totalKept}) is within target range (280-320).`);
}
