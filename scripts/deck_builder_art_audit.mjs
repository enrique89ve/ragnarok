import fs from 'fs';
import path from 'path';

// Read artMapping.ts and extract CARD_ID_TO_ART
const artFile = fs.readFileSync('client/src/game/utils/art/artMapping.ts', 'utf8');
const idArtMap = new Set();
const idRegex = /^\t(\d+):\s*'/gm;
let m;
while ((m = idRegex.exec(artFile)) !== null) {
	idArtMap.add(parseInt(m[1]));
}

// Also get VERCEL names (deprecated but still used as fallback)
const vercelNames = new Set();
const vercelRegex = /^\s+"([^"]+)":\s*"/gm;
while ((m = vercelRegex.exec(artFile)) !== null) {
	vercelNames.add(m[1].toLowerCase());
}

// Get MINION_CARD_TO_ART names
const minionNames = new Set();
const minionSection = artFile.substring(artFile.indexOf('MINION_CARD_TO_ART'));
const minionEndIdx = minionSection.indexOf('};');
const minionBlock = minionSection.substring(0, minionEndIdx);
const minionRegex = /^\s+'([^']+)':\s*'/gm;
while ((m = minionRegex.exec(minionBlock)) !== null) {
	minionNames.add(m[1].toLowerCase());
}

console.log('Art system: ' + idArtMap.size + ' ID entries, ' + vercelNames.size + ' name entries, ' + minionNames.size + ' minion entries');

// Scan card files
function scanDir(dir) {
	const cards = [];
	if (!fs.existsSync(dir)) return cards;
	const files = fs.readdirSync(dir, { withFileTypes: true });
	for (const f of files) {
		const full = path.join(dir, f.name);
		if (f.isDirectory()) {
			cards.push(...scanDir(full));
		} else if (f.name.endsWith('.ts') && !f.name.endsWith('.d.ts') && !f.name.includes('validation') && !f.name.includes('ID_RANGES')) {
			const content = fs.readFileSync(full, 'utf8');
			const cardRegex = /\bid:\s*(\d+)\b[\s\S]*?\bname:\s*['"]([^'"]+)['"]/g;
			let cm;
			while ((cm = cardRegex.exec(content)) !== null) {
				const id = parseInt(cm[1]);
				if (id >= 1000) {
					const surroundStart = Math.max(0, cm.index - 300);
					const surroundEnd = Math.min(content.length, cm.index + cm[0].length + 600);
					const surrounding = content.substring(surroundStart, surroundEnd);
					const collectibleMatch = surrounding.match(/collectible:\s*(true|false)/);
					const collectible = collectibleMatch ? collectibleMatch[1] === 'true' : true;
					const typeMatch = surrounding.match(/type:\s*'([^']+)'/);
					cards.push({
						id,
						name: cm[2],
						collectible,
						type: typeMatch ? typeMatch[1] : 'unknown',
						file: full.replace(/.*cardRegistry/, 'cardRegistry').replace(/.*data[\\/]sets/, 'data/sets')
					});
				}
			}
		}
	}
	return cards;
}

const allCards = scanDir('client/src/game/data/cardRegistry');
allCards.push(...scanDir('client/src/game/data/sets'));

// Deduplicate by ID
const seen = new Map();
for (const card of allCards) {
	if (!seen.has(card.id)) {
		seen.set(card.id, card);
	}
}

const uniqueCards = [...seen.values()];
console.log('Total unique card IDs: ' + uniqueCards.length);

// Categorize
const deckBuilder = [];
const tokens = [];
const weaponUpgrades = [];
const superMinions = [];
const other = [];

for (const card of uniqueCards) {
	if (card.id >= 95000 && card.id <= 95999) {
		superMinions.push(card);
	} else if (card.id >= 90000 && card.id <= 90999) {
		weaponUpgrades.push(card);
	} else if (card.id >= 9000 && card.id <= 9999) {
		tokens.push(card);
	} else if (!card.collectible) {
		other.push(card);
	} else {
		deckBuilder.push(card);
	}
}

console.log('');
console.log('=== CARD CATEGORIES ===');
console.log('Deck builder cards (collectible): ' + deckBuilder.length);
console.log('Tokens (9000-9999): ' + tokens.length);
console.log('Weapon upgrades (90000-90999): ' + weaponUpgrades.length);
console.log('Super minions (95000-95999): ' + superMinions.length);
console.log('Other non-collectible: ' + other.length);

// Check art
function hasArt(card) {
	if (idArtMap.has(card.id)) return 'ID';
	if (vercelNames.has(card.name.toLowerCase())) return 'VERCEL';
	if (minionNames.has(card.name.toLowerCase())) return 'MINION';
	return null;
}

const dbWithArt = deckBuilder.filter(c => hasArt(c));
const dbWithoutArt = deckBuilder.filter(c => !hasArt(c));

console.log('');
console.log('=== DECK BUILDER ART STATUS ===');
console.log('With art: ' + dbWithArt.length + ' (' + (dbWithArt.length / deckBuilder.length * 100).toFixed(1) + '%)');
console.log('WITHOUT art: ' + dbWithoutArt.length);

// Check for duplicate names
const missingNames = dbWithoutArt.map(c => c.name.toLowerCase());
const nameCounts = {};
for (const n of missingNames) {
	nameCounts[n] = (nameCounts[n] || 0) + 1;
}
const dupes = Object.entries(nameCounts).filter(([, c]) => c > 1);
if (dupes.length > 0) {
	console.log('');
	console.log('=== DUPLICATE NAMES IN MISSING LIST ===');
	for (const [name, count] of dupes) {
		const cards = dbWithoutArt.filter(c => c.name.toLowerCase() === name);
		console.log(name + ' x' + count + ': IDs ' + cards.map(c => c.id).join(', '));
	}
}

// Check for duplicate IDs
const idCounts = {};
for (const c of dbWithoutArt) {
	idCounts[c.id] = (idCounts[c.id] || 0) + 1;
}
const idDupes = Object.entries(idCounts).filter(([, c]) => c > 1);
if (idDupes.length > 0) {
	console.log('');
	console.log('=== DUPLICATE IDs IN MISSING LIST ===');
	for (const [id, count] of idDupes) {
		console.log('ID ' + id + ' x' + count);
	}
}

// Missing by range
const ranges = {};
for (const card of dbWithoutArt) {
	const range = Math.floor(card.id / 1000) * 1000;
	const key = range + '-' + (range + 999);
	if (!ranges[key]) ranges[key] = { count: 0, examples: [] };
	ranges[key].count++;
	if (ranges[key].examples.length < 3) {
		ranges[key].examples.push(card.id + ': ' + card.name + ' (' + card.type + ')');
	}
}

console.log('');
console.log('=== MISSING ART BY RANGE (DECK BUILDER ONLY) ===');
for (const [range, data] of Object.entries(ranges).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
	console.log(range + ': ' + data.count + ' missing');
	for (const ex of data.examples) {
		console.log('  ' + ex);
	}
}

// Non-deck-builder
const tokenMissing = tokens.filter(c => !hasArt(c)).length;
const weaponMissing = weaponUpgrades.filter(c => !hasArt(c)).length;
const superMissing = superMinions.filter(c => !hasArt(c)).length;
const otherMissing = other.filter(c => !hasArt(c)).length;

console.log('');
console.log('=== NON-DECK-BUILDER MISSING (not visible in deck builder) ===');
console.log('Tokens: ' + tokenMissing + '/' + tokens.length + ' missing');
console.log('Weapon upgrades: ' + weaponMissing + '/' + weaponUpgrades.length + ' missing');
console.log('Super minions: ' + superMissing + '/' + superMinions.length + ' missing');
console.log('Other non-collectible: ' + otherMissing + '/' + other.length + ' missing');
console.log('');
console.log('TOTAL non-deck-builder missing: ' + (tokenMissing + weaponMissing + superMissing + otherMissing));
console.log('');
console.log('GRAND TOTAL missing (all categories): ' + (dbWithoutArt.length + tokenMissing + weaponMissing + superMissing + otherMissing));
