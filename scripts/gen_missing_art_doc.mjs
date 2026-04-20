import fs from 'fs';
import path from 'path';

// Read artMapping.ts and extract CARD_ID_TO_ART IDs
const artFile = fs.readFileSync('client/src/game/utils/art/artMapping.ts', 'utf8');
const idArtMap = new Set();
let m;
const idRegex = /^\t(\d+):\s*'/gm;
while ((m = idRegex.exec(artFile)) !== null) {
	idArtMap.add(parseInt(m[1]));
}

// Also get VERCEL names (deprecated fallback)
const vercelNames = new Set();
const vercelRegex = /^\s+"([^"]+)":\s*"/gm;
while ((m = vercelRegex.exec(artFile)) !== null) {
	vercelNames.add(m[1].toLowerCase());
}

// Get MINION_CARD_TO_ART names
const minionNames = new Set();
const minionSection = artFile.substring(artFile.indexOf('MINION_CARD_TO_ART'));
const minionEnd = minionSection.indexOf('};');
const minionBlock = minionSection.substring(0, minionEnd);
const minionRegex2 = /^\s+'([^']+)':\s*'/gm;
while ((m = minionRegex2.exec(minionBlock)) !== null) {
	minionNames.add(m[1].toLowerCase());
}

console.error('Art: ' + idArtMap.size + ' IDs, ' + vercelNames.size + ' names, ' + minionNames.size + ' minion names');

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
			// Use lookahead regex to find card-like objects (id + name within ~800 chars)
			const cardRegex = /\bid:\s*(\d+)\b[\s\S]*?\bname:\s*['"]([^'"]+)['"]/g;
			let cm;
			while ((cm = cardRegex.exec(content)) !== null) {
				const id = parseInt(cm[1]);
				if (id < 1000) continue;

				// Grab surrounding context (before and after match)
				const surroundStart = Math.max(0, cm.index - 300);
				const surroundEnd = Math.min(content.length, cm.index + cm[0].length + 600);
				const block = content.substring(surroundStart, surroundEnd);

				const typeMatch = block.match(/\btype:\s*'([^']+)'/);
				const rarityMatch = block.match(/\brarity:\s*'([^']+)'/);
				const classMatch = block.match(/\bheroClass:\s*'([^']+)'/) || block.match(/\bclass:\s*'([^']+)'/);
				const raceMatch = block.match(/\brace:\s*'([^']+)'/);
				const collectibleMatch = block.match(/\bcollectible:\s*(true|false)/);
				const descMatch = block.match(/\bdescription:\s*['"]([^'"]{0,200})['"]/);

				cards.push({
					id,
					name: cm[2],
					type: typeMatch ? typeMatch[1] : 'unknown',
					rarity: rarityMatch ? rarityMatch[1] : 'common',
					heroClass: classMatch ? classMatch[1] : 'Neutral',
					race: raceMatch ? raceMatch[1] : null,
					collectible: collectibleMatch ? collectibleMatch[1] === 'true' : true,
					description: descMatch ? descMatch[1] : ''
				});
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

function hasArt(card) {
	if (idArtMap.has(card.id)) return true;
	if (vercelNames.has(card.name.toLowerCase())) return true;
	if (minionNames.has(card.name.toLowerCase())) return true;
	return false;
}

// Get all cards without art, categorized
const uniqueCards = [...seen.values()];

// Separate by visibility
const deckBuilderMissing = [];
const superMinionMissing = [];
const weaponUpgradeMissing = [];
const tokenMissing = [];
const otherMissing = [];

for (const card of uniqueCards) {
	if (hasArt(card)) continue;

	if (card.id >= 95000 && card.id <= 95999) {
		superMinionMissing.push(card);
	} else if (card.id >= 90000 && card.id <= 90999) {
		weaponUpgradeMissing.push(card);
	} else if (card.id >= 9000 && card.id <= 9999) {
		tokenMissing.push(card);
	} else if (!card.collectible) {
		otherMissing.push(card);
	} else {
		deckBuilderMissing.push(card);
	}
}

// Sort all by ID
deckBuilderMissing.sort((a, b) => a.id - b.id);
superMinionMissing.sort((a, b) => a.id - b.id);
weaponUpgradeMissing.sort((a, b) => a.id - b.id);
tokenMissing.sort((a, b) => a.id - b.id);
otherMissing.sort((a, b) => a.id - b.id);

const totalMissing = deckBuilderMissing.length + superMinionMissing.length + weaponUpgradeMissing.length + tokenMissing.length + otherMissing.length;

console.error('Deck builder missing: ' + deckBuilderMissing.length);
console.error('Super minion missing: ' + superMinionMissing.length);
console.error('Weapon upgrade missing: ' + weaponUpgradeMissing.length);
console.error('Token missing: ' + tokenMissing.length);
console.error('Other missing: ' + otherMissing.length);
console.error('Total: ' + totalMissing);

// Group deck builder cards by range for the summary table
function getRangeLabel(id) {
	if (id >= 1000 && id <= 3999) return { range: '1000-3999', label: 'Core Minions' };
	if (id >= 4000 && id <= 5999) return { range: '4000-5999', label: 'Class Cards & Spells' };
	if (id >= 6000 && id <= 8999) return { range: '6000-8999', label: 'Class Cards' };
	if (id >= 10000 && id <= 19999) return { range: '10000-19999', label: 'Legacy & Keyword Cards' };
	if (id >= 20000 && id <= 20999) return { range: '20000-20999', label: 'Norse Mythology — Gods & Creatures' };
	if (id >= 21000 && id <= 25999) return { range: '21000-25999', label: 'Norse Mythology — Misc' };
	if (id >= 26000 && id <= 29999) return { range: '26000-29999', label: 'Norse Mythology — Late' };
	if (id >= 30000 && id <= 30999) return { range: '30000-30999', label: 'Norse Mechanics' };
	if (id >= 31000 && id <= 31999) return { range: '31000-31999', label: 'Norse Expansion' };
	if (id >= 32000 && id <= 32999) return { range: '32000-32999', label: 'Expansion — Dragons, Beasts, Elder Titans' };
	if (id >= 33000 && id <= 33999) return { range: '33000-33999', label: 'Expansion — Class Cards' };
	if (id >= 36000 && id <= 39999) return { range: '36000-39999', label: 'Class Expansions' };
	if (id >= 40000 && id <= 49999) return { range: '40000-49999', label: 'Primordial Expansion' };
	if (id >= 86000 && id <= 89999) return { range: '86000-89999', label: 'Rogue & Golem' };
	if (id >= 91000 && id <= 92999) return { range: '91000-92999', label: 'Elder Titans & Support' };
	return { range: 'other', label: 'Other' };
}

// Build range groups
const rangeGroups = new Map();
for (const card of deckBuilderMissing) {
	const { range, label } = getRangeLabel(card.id);
	if (!rangeGroups.has(range)) {
		rangeGroups.set(range, { label, cards: [] });
	}
	rangeGroups.get(range).cards.push(card);
}

// Generate class label
function classLabel(c) {
	if (!c || c === 'Neutral' || c === 'neutral') return '';
	return ' | Class: ' + c.charAt(0).toUpperCase() + c.slice(1);
}

// Generate art prompt based on card type and name
function generatePrompt(card) {
	const name = card.name;
	const race = card.race;

	if (card.type === 'weapon') {
		return `${name}, Norse weapon, forged metal, intricate rune engravings, dramatic lighting, dark background, card game art, high detail`;
	}
	if (card.type === 'spell') {
		return `${name}, magical energy, Norse rune magic, swirling arcane power, dramatic lighting, dark background, card game art, high detail`;
	}
	if (card.type === 'secret') {
		return `${name}, hidden rune trap, glowing Norse runes, shadowy mist, dark mysterious atmosphere, card game art, high detail`;
	}

	// Minion - use race for flavor
	if (race) {
		const raceFlavorMap = {
			'Beast': 'wild creature, natural, feral',
			'Dragon': 'dragon, scales, wings, fire-breathing',
			'Elemental': 'pure element, energy being, ethereal',
			'Undead': 'undead, skeletal, dark necromantic energy',
			'Automaton': 'mechanical construct, gears, bronze, steam',
			'Naga': 'aquatic creature, serpentine, ocean depths',
			'Titan': 'towering titan, cosmic power, ancient',
			'Einherjar': 'Norse warrior spirit, Valhalla, golden armor',
			'Spirit': 'ethereal spirit, translucent, glowing',
			'Human': 'Norse warrior, armor, weathered',
			'Totem': 'carved totem, glowing runes, spiritual',
			'Pirate': 'Norse pirate, viking raider, ship',
		};
		const flavor = raceFlavorMap[race] || race.toLowerCase() + ', mythological';
		return `${name}, ${flavor}, digital painting, card game art, high detail`;
	}

	return `${name}, Norse mythology, digital painting, dramatic lighting, card game art, high detail`;
}

// Build output
let out = '';

out += '# Missing Card Art — Complete List\n\n';
out += `**Generated:** 2026-03-14 (verified audit)\n`;
out += `**Total cards in game:** ${seen.size}\n`;
out += `**Cards with art:** ${seen.size - totalMissing} (${((seen.size - totalMissing) / seen.size * 100).toFixed(1)}%)\n`;
out += `**Cards missing art:** ${totalMissing} (${(totalMissing / seen.size * 100).toFixed(1)}%)\n`;
out += `**Deck-builder visible missing:** ${deckBuilderMissing.length}\n\n`;

out += '## How to Use This Document\n\n';
out += 'Each card entry includes:\n';
out += '- **Card ID** — for mapping in `CARD_ID_TO_ART` in `artMapping.ts`\n';
out += '- **Name** — the card\'s display name\n';
out += '- **Type** — minion, spell, weapon, or hero\n';
out += '- **Rarity** — common, rare, epic, or mythic\n';
out += '- **Class** — Neutral or a specific class\n';
out += '- **AI Art Prompt** — suggested prompt for generating art\n\n';
out += 'Art specs: **512×512 WebP**, transparent or dark background, centered subject.\n';
out += 'File naming: `{4-hex}-{8-hex}.webp` (hash format) or descriptive name.\n';
out += 'After generating, add mapping to `CARD_ID_TO_ART` in `client/src/game/utils/art/artMapping.ts`.\n\n';
out += '---\n\n';

// Summary table
out += '## Summary by Category\n\n';
out += '| Category | Missing |\n';
out += '|----------|--------|\n';

const sortedRanges = [...rangeGroups.entries()].sort((a, b) => {
	const aNum = parseInt(a[0]) || 99999;
	const bNum = parseInt(b[0]) || 99999;
	return aNum - bNum;
});

for (const [range, group] of sortedRanges) {
	out += `| ${group.label} (${range}) | ${group.cards.length} |\n`;
}
if (superMinionMissing.length > 0) out += `| Super Minions (95000-95999) | ${superMinionMissing.length} |\n`;
if (weaponUpgradeMissing.length > 0) out += `| Hero Weapon Upgrades (90000-90999) | ${weaponUpgradeMissing.length} |\n`;
if (tokenMissing.length > 0) out += `| Tokens (9000-9999) | ${tokenMissing.length} |\n`;
if (otherMissing.length > 0) out += `| Other Non-Collectible | ${otherMissing.length} |\n`;
out += `| **TOTAL** | **${totalMissing}** |\n\n`;
out += '---\n\n';

// Card entries by range group
for (const [range, group] of sortedRanges) {
	out += `## ${group.label} (${range}) (${group.cards.length} cards)\n\n`;
	for (const card of group.cards) {
		out += `### ${card.id} — ${card.name}\n`;
		const raceStr = card.race ? ` | Race: ${card.race}` : '';
		out += `- **Type:** ${card.type} | **Rarity:** ${card.rarity}${classLabel(card.heroClass)}${raceStr}\n`;
		out += `- **AI Art Prompt:** "${generatePrompt(card)}"\n\n`;
	}
}

// Super minions section
if (superMinionMissing.length > 0) {
	out += `## Super Minions (95000-95999) (${superMinionMissing.length} cards)\n\n`;
	for (const card of superMinionMissing) {
		out += `### ${card.id} — ${card.name}\n`;
		const raceStr = card.race ? ` | Race: ${card.race}` : '';
		out += `- **Type:** ${card.type} | **Rarity:** ${card.rarity}${classLabel(card.heroClass)}${raceStr}\n`;
		out += `- **AI Art Prompt:** "${generatePrompt(card)}"\n\n`;
	}
}

// Weapon upgrades section
if (weaponUpgradeMissing.length > 0) {
	out += `## Hero Weapon Upgrades (90000-90999) (${weaponUpgradeMissing.length} cards)\n\n`;
	for (const card of weaponUpgradeMissing) {
		out += `### ${card.id} — ${card.name}\n`;
		const raceStr = card.race ? ` | Race: ${card.race}` : '';
		out += `- **Type:** ${card.type} | **Rarity:** ${card.rarity}${classLabel(card.heroClass)}${raceStr}\n`;
		out += `- **AI Art Prompt:** "${generatePrompt(card)}"\n\n`;
	}
}

// Tokens section
if (tokenMissing.length > 0) {
	out += `## Tokens (9000-9999) (${tokenMissing.length} cards)\n\n`;
	for (const card of tokenMissing) {
		out += `### ${card.id} — ${card.name}\n`;
		const raceStr = card.race ? ` | Race: ${card.race}` : '';
		out += `- **Type:** ${card.type} | **Rarity:** ${card.rarity}${classLabel(card.heroClass)}${raceStr}\n`;
		out += `- **AI Art Prompt:** "${generatePrompt(card)}"\n\n`;
	}
}

// Other non-collectible section
if (otherMissing.length > 0) {
	out += `## Other Non-Collectible (${otherMissing.length} cards)\n\n`;
	for (const card of otherMissing) {
		out += `### ${card.id} — ${card.name}\n`;
		const raceStr = card.race ? ` | Race: ${card.race}` : '';
		out += `- **Type:** ${card.type} | **Rarity:** ${card.rarity}${classLabel(card.heroClass)}${raceStr}\n`;
		out += `- **AI Art Prompt:** "${generatePrompt(card)}"\n\n`;
	}
}

// Write output
fs.writeFileSync('docs/MISSING_CARD_ART.md', out);
console.error('Written to docs/MISSING_CARD_ART.md (' + out.split('\n').length + ' lines)');
