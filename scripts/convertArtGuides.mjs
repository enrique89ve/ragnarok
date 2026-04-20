/**
 * convertArtGuides.mjs - Reformat art guide markdown files to standardized template format
 *
 * Reads card data from the TypeScript registry (via regex extraction),
 * parses existing art guide entries in both Format A and Format B,
 * and outputs template-formatted entries with enriched metadata.
 *
 * Usage: node scripts/convertArtGuides.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const CARD_DATA_DIR = path.join(ROOT, 'client/src/game/data/cardRegistry/sets');

// ---------------------------------------------------------------------------
// Step 1: Build card metadata map from TypeScript source files
// ---------------------------------------------------------------------------

function extractCardsFromTS(dir) {
	const cards = new Map();
	const files = getAllTSFiles(dir);

	for (const file of files) {
		const content = fs.readFileSync(file, 'utf-8');
		// Match card objects: { id: NNNNN, name: '...', ... }
		const cardBlocks = content.match(/\{[^{}]*\bid:\s*\d{4,5}[^{}]*\}/gs) || [];

		for (const block of cardBlocks) {
			const idMatch = block.match(/\bid:\s*(\d+)/);
			if (!idMatch) continue;
			const id = parseInt(idMatch[1], 10);

			const nameMatch = block.match(/\bname:\s*['"`]([^'"`]+)['"`]/);
			const manaMatch = block.match(/\bmanaCost:\s*(\d+)/);
			const attackMatch = block.match(/\battack:\s*(\d+)/);
			const healthMatch = block.match(/\bhealth:\s*(\d+)/);
			const typeMatch = block.match(/\btype:\s*['"`]([^'"`]+)['"`]/);
			const rarityMatch = block.match(/\brarity:\s*['"`]([^'"`]+)['"`]/);
			const classMatch = block.match(/\bclass:\s*['"`]([^'"`]+)['"`]/);
			const raceMatch = block.match(/\brace:\s*['"`]([^'"`]+)['"`]/);
			const descMatch = block.match(/\bdescription:\s*['"`]([^'"`]*?)['"`]/);
			const flavorMatch = block.match(/\bflavorText:\s*['"`]([^'"`]*?)['"`]/);

			cards.set(id, {
				id,
				name: nameMatch?.[1] || '',
				manaCost: manaMatch ? parseInt(manaMatch[1]) : undefined,
				attack: attackMatch ? parseInt(attackMatch[1]) : undefined,
				health: healthMatch ? parseInt(healthMatch[1]) : undefined,
				type: typeMatch?.[1] || 'minion',
				rarity: rarityMatch?.[1] || 'common',
				class: classMatch?.[1] || 'Neutral',
				race: raceMatch?.[1] || undefined,
				description: descMatch?.[1] || '',
				flavorText: flavorMatch?.[1] || '',
			});
		}
	}
	return cards;
}

function getAllTSFiles(dir) {
	const results = [];
	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				results.push(...getAllTSFiles(fullPath));
			} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
				results.push(fullPath);
			}
		}
	} catch { /* skip inaccessible dirs */ }
	return results;
}

// ---------------------------------------------------------------------------
// Step 2: Parse Format A entries (CARD_ART_MASTER_GUIDE, PET_FAMILY)
// ---------------------------------------------------------------------------

function parseFormatA(content) {
	const entries = [];
	// Split by --- separators, then find entries with ## N. headings
	const sections = content.split(/^---$/m);

	for (const section of sections) {
		const lines = section.trim().split('\n');
		if (lines.length < 3) continue;

		// Check for ## N. Card Name or ## Card Name heading
		const headingMatch = lines[0].match(/^##\s+(\d+)\.\s+(.+)$/);
		if (!headingMatch) continue;

		const num = headingMatch[1];
		const name = headingMatch[2].trim();

		// Extract metadata line
		const metaLine = lines.find(l => l.startsWith('**Card ID:**'));
		let cardId = 0, type = '', rarity = '', cardClass = '';
		let stage = '', element = '', evolvesAfter = '', evolvesFrom = '', variants = '';

		if (metaLine) {
			const idM = metaLine.match(/Card ID:\*?\*?\s*(\d+)/);
			if (idM) cardId = parseInt(idM[1]);
			const typeM = metaLine.match(/Type:\*?\*?\s*(\w+)/);
			if (typeM) type = typeM[1];
			const rarM = metaLine.match(/Rarity:\*?\*?\s*(\w+)/);
			if (rarM) rarity = rarM[1];
			const clsM = metaLine.match(/Class:\*?\*?\s*(\w+)/);
			if (clsM) cardClass = clsM[1];
			const stgM = metaLine.match(/Stage:\*?\*?\s*(\d+)/);
			if (stgM) stage = stgM[1];
			const elemM = metaLine.match(/Element:\*?\*?\s*(\w+)/);
			if (elemM) element = elemM[1];
			const evolveAfterM = metaLine.match(/Evolves after:\*?\*?\s*([^|]+)/);
			if (evolveAfterM) evolvesAfter = evolveAfterM[1].trim();
			const evolveFromM = metaLine.match(/Evolves from:\*?\*?\s*([^|]+)/);
			if (evolveFromM) evolvesFrom = evolveFromM[1].trim();
			const varM = metaLine.match(/(\d+)\s+Variant/i);
			if (varM) variants = varM[1];
		}

		// Extract flavor text
		let flavorText = '';
		const flavorLine = lines.find(l => l.match(/^>\s*".*"$/));
		if (flavorLine) {
			flavorText = flavorLine.replace(/^>\s*/, '').replace(/^"/, '').replace(/"$/, '');
		}

		// Extract art prompt
		let artPrompt = '';
		const promptIdx = lines.findIndex(l => l.match(/^\*\*(AI )?Art Prompt/i));
		if (promptIdx >= 0) {
			const promptLines = [];
			for (let i = promptIdx + 1; i < lines.length; i++) {
				if (lines[i].match(/^\*\*Key Visual/) || lines[i].match(/^##/) || lines[i].trim() === '---') break;
				if (lines[i].trim()) promptLines.push(lines[i].trim());
			}
			// Also check if prompt is on same line as header
			const inlinePrompt = lines[promptIdx].match(/Art Prompt.*?:\*?\*?\s*(.+)/);
			if (inlinePrompt && inlinePrompt[1].trim().length > 10) {
				promptLines.unshift(inlinePrompt[1].trim());
			}
			artPrompt = promptLines.join(' ').trim();
		}

		// Extract key visual attributes
		const keyVisuals = [];
		const kvIdx = lines.findIndex(l => l.match(/^\*\*Key Visual/));
		if (kvIdx >= 0) {
			for (let i = kvIdx + 1; i < lines.length; i++) {
				const attrMatch = lines[i].match(/^-\s+(.+)/);
				if (attrMatch) keyVisuals.push(attrMatch[1].trim());
				else if (lines[i].trim() === '' || lines[i].match(/^##/) || lines[i].trim() === '---') break;
			}
		}

		entries.push({
			num, name, cardId, type, rarity, class: cardClass,
			stage, element, evolvesAfter, evolvesFrom, variants,
			flavorText, artPrompt, keyVisuals
		});
	}
	return entries;
}

// ---------------------------------------------------------------------------
// Step 3: Parse Format B entries (CLASS guides, EXPANSION)
// ---------------------------------------------------------------------------

function parseFormatB(content) {
	const entries = [];
	const lines = content.split('\n');
	let counter = 0;
	let currentClass = '';

	for (let i = 0; i < lines.length; i++) {
		// Track current class from # headings
		const classHeading = lines[i].match(/^#\s+(\w+)$/);
		if (classHeading) {
			currentClass = classHeading[1];
			continue;
		}

		// Match ### Card Name (ID: XXXX) or ### Card Name (ID: XXXX, XXX)
		const headingMatch = lines[i].match(/^###\s+(.+?)\s*\(ID:\s*(\d+)\)/);
		if (!headingMatch) continue;

		counter++;
		const name = headingMatch[1].trim();
		const cardId = parseInt(headingMatch[2]);
		let type = 'minion', rarity = 'common', manaCost = undefined;
		let attack = undefined, health = undefined, race = '', cardClass = currentClass;
		let flavorText = '', artPrompt = '', effect = '';
		const keyVisuals = [];

		// Parse subsequent bullet lines
		for (let j = i + 1; j < lines.length; j++) {
			const line = lines[j];
			if (line.match(/^###\s/) || line.match(/^##\s/) || line.match(/^#\s/)) break;

			// Type/Rarity/Cost line
			const typeLine = line.match(/^\s*-\s*\*\*Type\*?\*?:\s*(.+)/i);
			if (typeLine) {
				const tl = typeLine[1];
				const tm = tl.match(/(\w+)(?:\s*\((\w+)\))?/);
				if (tm) {
					type = tm[1].toLowerCase();
					if (tm[2]) race = tm[2];
				}
				const rm = tl.match(/Rarity\*?\*?:\s*(\w+)/i);
				if (rm) rarity = rm[1];
				const cm = tl.match(/Cost\*?\*?:\s*(\d+)/i);
				if (cm) manaCost = parseInt(cm[1]);
			}

			// Stats line
			const statsLine = line.match(/^\s*-\s*\*\*Stats\*?\*?:\s*(\d+)\/(\d+)/);
			if (statsLine) {
				attack = parseInt(statsLine[1]);
				health = parseInt(statsLine[2]);
			}

			// Race line
			const raceLine = line.match(/^\s*-.*\*\*Race\*?\*?:\s*(\w+)/i);
			if (raceLine) race = raceLine[1];

			// Effect line
			const effectLine = line.match(/^\s*-\s*\*\*Effect\*?\*?:\s*(.+)/);
			if (effectLine) effect = effectLine[1];

			// Flavor text
			const flavorLine = line.match(/^\s*-\s*\*\*Flavor Text\*?\*?:\s*"?(.+?)"?\s*$/);
			if (flavorLine) flavorText = flavorLine[1].replace(/^"/, '').replace(/"$/, '');

			// Art prompt
			const promptLine = line.match(/^\s*-\s*\*\*(AI )?Art Prompt\*?\*?:\s*(.+)/i);
			if (promptLine) artPrompt = promptLine[2].trim();

			// Key visual attributes
			const kvMatch = line.match(/^\s+-\s+(?!\*\*)(.+)/);
			if (kvMatch && keyVisuals.length > 0 || line.match(/Key Visual/)) {
				if (kvMatch && !line.match(/Key Visual/)) keyVisuals.push(kvMatch[1].trim());
			}
			const subKv = line.match(/^\s{2,}-\s+(.+)/);
			if (subKv && !subKv[1].startsWith('**')) keyVisuals.push(subKv[1].trim());
		}

		entries.push({
			num: String(counter), name, cardId, type, rarity,
			class: cardClass, manaCost, attack, health, race,
			flavorText, artPrompt, keyVisuals, effect
		});
	}
	return entries;
}

// ---------------------------------------------------------------------------
// Step 4: Build template-format output
// ---------------------------------------------------------------------------

function buildMetaLine(entry, cardData) {
	const cd = cardData || {};
	const parts = [];

	parts.push(`**Card ID:** ${entry.cardId}`);
	parts.push(`**Type:** ${(entry.type || cd.type || 'minion').toLowerCase()}`);
	parts.push(`**Class:** ${entry.class || cd.class || 'Neutral'}`);
	parts.push(`**Rarity:** ${(entry.rarity || cd.rarity || 'common').toLowerCase()}`);

	const mana = entry.manaCost ?? cd.manaCost;
	if (mana !== undefined) parts.push(`**Mana:** ${mana}`);

	const atk = entry.attack ?? cd.attack;
	if (atk !== undefined) parts.push(`**Attack:** ${atk}`);

	const hp = entry.health ?? cd.health;
	if (hp !== undefined) parts.push(`**Health:** ${hp}`);

	const race = entry.race || cd.race;
	if (race) parts.push(`**Race:** ${race}`);

	// Pet-specific fields
	if (entry.stage) parts.push(`**Stage:** ${entry.stage}`);
	if (entry.element) parts.push(`**Element:** ${entry.element}`);

	return parts.join(' | ');
}

function formatEntry(entry, cardData) {
	const lines = [];

	lines.push(`## ${entry.num}. ${entry.name}`);
	lines.push('');
	lines.push(buildMetaLine(entry, cardData));

	// Flavor text
	const flavor = entry.flavorText || cardData?.flavorText || '';
	if (flavor) {
		lines.push('');
		lines.push(`> "${flavor}"`);
	}

	// Art prompt
	if (entry.artPrompt) {
		lines.push('');
		lines.push('**Art Prompt:**');
		lines.push(entry.artPrompt);
	}

	// Key visual attributes (keep as extra info per user request)
	if (entry.keyVisuals && entry.keyVisuals.length > 0) {
		lines.push('');
		lines.push('**Key Visual Attributes:**');
		for (const kv of entry.keyVisuals) {
			lines.push(`- ${kv}`);
		}
	}

	// Pet evolution info
	if (entry.evolvesAfter) {
		lines.push('');
		lines.push(`**Evolves after:** ${entry.evolvesAfter}`);
	}
	if (entry.evolvesFrom) {
		lines.push('');
		lines.push(`**Evolves from:** ${entry.evolvesFrom}`);
	}

	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Step 5: Process files
// ---------------------------------------------------------------------------

function processFormatAFile(inputPath, cardMap, sectionHeaders = true) {
	const content = fs.readFileSync(inputPath, 'utf-8');
	const entries = parseFormatA(content);

	// Also preserve section headers (# lines and intro text)
	const headerBlocks = [];
	const rawSections = content.split(/(?=^# )/m);

	for (const section of rawSections) {
		const headerLine = section.match(/^# .+/m);
		if (headerLine) {
			// Get the header and any italic description line
			const hLines = section.split('\n');
			const block = [];
			for (const hl of hLines) {
				if (hl.startsWith('# ') || hl.startsWith('*') && hl.endsWith('*')) {
					block.push(hl);
				} else if (hl.trim() === '' || hl.trim() === '---') {
					continue;
				} else {
					break;
				}
			}
			if (block.length > 0) {
				headerBlocks.push({ text: block.join('\n'), after: headerLine[0] });
			}
		}
	}

	const output = [];

	// Rebuild with template format
	let currentSection = '';
	const contentLines = content.split('\n');

	for (let i = 0; i < contentLines.length; i++) {
		const line = contentLines[i];

		// Preserve top-level section headers and their descriptions
		if (line.startsWith('# ') && !line.startsWith('## ')) {
			if (output.length > 0) output.push('', '---', '');
			output.push(line);
			// Check for italic description on next lines
			for (let j = i + 1; j < contentLines.length; j++) {
				if (contentLines[j].startsWith('*') && contentLines[j].endsWith('*')) {
					output.push(contentLines[j]);
					i = j;
				} else if (contentLines[j].trim() === '' || contentLines[j].trim() === '---') {
					i = j;
					continue;
				} else {
					break;
				}
			}
			output.push('');
			continue;
		}
	}

	// Now add all entries in template format
	// Group entries by their card ID ranges (matching original sections)
	for (const entry of entries) {
		const cd = cardMap.get(entry.cardId);
		output.push('---');
		output.push('');
		output.push(formatEntry(entry, cd));
		output.push('');
	}

	return output.join('\n');
}

function processFormatBFile(inputPath, cardMap) {
	const content = fs.readFileSync(inputPath, 'utf-8');
	const entries = parseFormatB(content);

	const output = [];

	// Preserve file header
	const headerLines = content.split('\n');
	for (const line of headerLines) {
		if (line.startsWith('# ') || line.startsWith('## ') && !line.match(/^###?\s+\w.*\(ID:/)) {
			output.push(line);
		}
		if (line.trim() === '---') {
			output.push('');
			break;
		}
	}

	// Preserve class fantasy descriptions
	const classFantasyBlocks = content.match(/\*\*Class Fantasy\*?\*?:.+/g) || [];

	let lastClass = '';
	for (const entry of entries) {
		if (entry.class !== lastClass) {
			output.push('');
			output.push(`# ${entry.class}`);
			// Find class fantasy for this class
			const fantasy = classFantasyBlocks.find(b => {
				// heuristic: check if this fantasy block appears before this class's cards
				return true; // simplified
			});
			output.push('');
			lastClass = entry.class;
		}

		const cd = cardMap.get(entry.cardId);
		output.push('---');
		output.push('');
		output.push(formatEntry(entry, cd));
		output.push('');
	}

	return output.join('\n');
}

// ---------------------------------------------------------------------------
// Step 6: Improved Format A processor that preserves structure
// ---------------------------------------------------------------------------

function convertFormatAPreservingStructure(inputPath, cardMap) {
	const content = fs.readFileSync(inputPath, 'utf-8');
	const lines = content.split('\n');
	const output = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		// Preserve # section headers and their descriptions verbatim
		if (line.startsWith('# ') && !line.startsWith('## ')) {
			output.push('');
			output.push(line);
			i++;
			// Capture italic descriptions and blank lines after section header
			while (i < lines.length) {
				if (lines[i].startsWith('*') && lines[i].endsWith('*')) {
					output.push(lines[i]);
					i++;
				} else if (lines[i].trim() === '' || lines[i].trim() === '---') {
					i++;
				} else {
					break;
				}
			}
			output.push('');
			output.push('---');
			output.push('');
			continue;
		}

		// Match ## N. Card Name entry start
		const entryMatch = line.match(/^##\s+(\d+)\.\s+(.+)$/);
		if (entryMatch) {
			const num = entryMatch[1];
			const name = entryMatch[2].trim();
			let cardId = 0, type = '', rarity = '', cardClass = '', stage = '', element = '';
			let evolvesAfter = '', evolvesFrom = '', variants = '';
			let flavorText = '', artPrompt = '';
			const keyVisuals = [];
			const extraLines = []; // pet variant prompts, etc.

			i++;
			// Parse the entry block until next ## or ---
			while (i < lines.length) {
				const cl = lines[i];

				// Next entry or separator
				if (cl.match(/^##\s+\d+\./) || (cl.trim() === '---' && i > 0)) {
					break;
				}

				// Metadata line
				if (cl.startsWith('**Card ID:**')) {
					const idM = cl.match(/Card ID:\*?\*?\s*(\d+)/);
					if (idM) cardId = parseInt(idM[1]);
					const typeM = cl.match(/Type:\*?\*?\s*(\w+)/);
					if (typeM) type = typeM[1];
					const rarM = cl.match(/Rarity:\*?\*?\s*(\w+)/);
					if (rarM) rarity = rarM[1];
					const clsM = cl.match(/Class:\*?\*?\s*(\w+)/);
					if (clsM) cardClass = clsM[1];
					const stgM = cl.match(/Stage:\*?\*?\s*(\d+)/);
					if (stgM) stage = stgM[1];
					const elemM = cl.match(/Element:\*?\*?\s*(\w+)/);
					if (elemM) element = elemM[1];
					const eaM = cl.match(/Evolves after:\*?\*?\s*([^|]+)/);
					if (eaM) evolvesAfter = eaM[1].trim();
					const efM = cl.match(/Evolves from:\*?\*?\s*([^|]+)/);
					if (efM) evolvesFrom = efM[1].trim();
					const varM = cl.match(/(\d+)\s+Variant/i);
					if (varM) variants = varM[1];
					i++;
					continue;
				}

				// Flavor text label (skip the label, keep the > quote)
				if (cl.match(/^\*\*Flavor Text:\*?\*?/)) {
					i++;
					continue;
				}

				// Flavor text value
				if (cl.match(/^>\s*"/)) {
					flavorText = cl.replace(/^>\s*/, '').replace(/^"/, '').replace(/"$/, '');
					i++;
					continue;
				}

				// Art prompt header
				if (cl.match(/^\*\*(AI )?Art Prompt/i)) {
					// Check for inline prompt
					const inlineM = cl.match(/Art Prompt.*?:\*?\*?\s*(.+)/);
					if (inlineM && inlineM[1].trim().length > 10) {
						artPrompt = inlineM[1].trim();
					}
					i++;
					// Collect multi-line prompt
					while (i < lines.length) {
						if (lines[i].match(/^\*\*Key Visual/) || lines[i].match(/^##/) ||
							lines[i].trim() === '---' || lines[i].match(/^\*\*Art Prompt/i)) break;
						if (lines[i].trim()) {
							artPrompt += (artPrompt ? ' ' : '') + lines[i].trim();
						}
						i++;
					}
					continue;
				}

				// Key visual attributes
				if (cl.match(/^\*\*Key Visual/)) {
					i++;
					while (i < lines.length) {
						const kvM = lines[i].match(/^-\s+(.+)/);
						if (kvM) {
							keyVisuals.push(kvM[1].trim());
							i++;
						} else if (lines[i].trim() === '') {
							i++;
						} else {
							break;
						}
					}
					continue;
				}

				// Pet variant prompts (preserve verbatim)
				if (cl.match(/^\*\*Art Prompt \(/i)) {
					extraLines.push('');
					extraLines.push(cl);
					i++;
					while (i < lines.length && !lines[i].match(/^\*\*/) && !lines[i].match(/^##/) && lines[i].trim() !== '---') {
						extraLines.push(lines[i]);
						i++;
					}
					continue;
				}

				i++;
			}

			// Look up card data
			const cd = cardMap.get(cardId) || undefined;

			// Build template entry
			const metaParts = [];
			metaParts.push(`**Card ID:** ${cardId}`);
			metaParts.push(`**Type:** ${(type || cd?.type || 'minion').toLowerCase()}`);
			if (cardClass || cd?.class) metaParts.push(`**Class:** ${cardClass || cd?.class}`);
			metaParts.push(`**Rarity:** ${(rarity || cd?.rarity || 'common').toLowerCase()}`);
			const mana = cd?.manaCost;
			if (mana !== undefined) metaParts.push(`**Mana:** ${mana}`);
			const atk = cd?.attack;
			if (atk !== undefined) metaParts.push(`**Attack:** ${atk}`);
			const hp = cd?.health;
			if (hp !== undefined) metaParts.push(`**Health:** ${hp}`);
			const race = cd?.race;
			if (race) metaParts.push(`**Race:** ${race}`);
			if (stage) metaParts.push(`**Stage:** ${stage}`);
			if (element) metaParts.push(`**Element:** ${element}`);

			output.push(`## ${num}. ${name}`);
			output.push('');
			output.push(metaParts.join(' | '));

			if (flavorText) {
				output.push('');
				output.push(`> "${flavorText}"`);
			}

			if (artPrompt) {
				output.push('');
				output.push('**Art Prompt:**');
				output.push(artPrompt);
			}

			if (keyVisuals.length > 0) {
				output.push('');
				output.push('**Key Visual Attributes:**');
				for (const kv of keyVisuals) output.push(`- ${kv}`);
			}

			if (evolvesAfter) output.push('', `**Evolves after:** ${evolvesAfter}`);
			if (evolvesFrom) output.push('', `**Evolves from:** ${evolvesFrom}`);

			// Extra variant prompts
			for (const el of extraLines) output.push(el);

			output.push('');
			output.push('---');
			output.push('');
			continue;
		}

		// Pass through non-entry lines (file headers, etc.)
		if (i === 0 || line.startsWith('# ') || line.startsWith('Each entry') ||
			line.startsWith('**Art Style') || line.startsWith('**Element') ||
			line.startsWith('**Stage') || line.startsWith('| ')) {
			output.push(line);
			i++;
			continue;
		}

		i++;
	}

	return output.join('\n');
}

// ---------------------------------------------------------------------------
// Step 7: Format B converter preserving structure
// ---------------------------------------------------------------------------

function convertFormatBPreservingStructure(inputPath, cardMap) {
	const content = fs.readFileSync(inputPath, 'utf-8');
	const lines = content.split('\n');
	const output = [];
	let i = 0;
	let counter = 0;
	let currentClass = '';

	while (i < lines.length) {
		const line = lines[i];

		// Preserve file-level headers (# and ##)
		if ((line.startsWith('# ') || line.startsWith('## ')) && !line.match(/^###/)) {
			output.push(line);

			// Track class for entries
			const clsM = line.match(/^#\s+(\w+)$/);
			if (clsM) currentClass = clsM[1];

			i++;
			// Preserve class fantasy descriptions
			while (i < lines.length) {
				if (lines[i].startsWith('**Class Fantasy') || lines[i].startsWith('*') && lines[i].endsWith('*')) {
					output.push(lines[i]);
					i++;
				} else if (lines[i].trim() === '' || lines[i].trim() === '---') {
					output.push(lines[i]);
					i++;
				} else if (lines[i].startsWith('- [')) {
					output.push(lines[i]);
					i++;
				} else {
					break;
				}
			}
			continue;
		}

		// Match ### Card Name (ID: XXXX)
		const entryMatch = line.match(/^###\s+(.+?)\s*\(ID:\s*(\d+)\)/);
		if (entryMatch) {
			counter++;
			const name = entryMatch[1].trim();
			const cardId = parseInt(entryMatch[2]);
			let type = 'minion', rarity = 'common', manaCost, attack, health;
			let race = '', cardClass = currentClass, effect = '';
			let flavorText = '', artPrompt = '';
			const keyVisuals = [];
			let inKeyVisuals = false;

			i++;
			while (i < lines.length) {
				const cl = lines[i];
				if (cl.match(/^###?\s/) || cl.match(/^#\s/)) break;
				if (cl.trim() === '---') { i++; break; }

				// Type/Rarity/Cost line
				const typeLine = cl.match(/^\s*-\s*\*\*Type\*?\*?:?\s*(.+)/i);
				if (typeLine) {
					const tl = typeLine[1];
					const tm = tl.match(/^(\w+)(?:\s*\(([^)]+)\))?/);
					if (tm) {
						type = tm[1].toLowerCase();
						if (tm[2]) race = tm[2];
					}
					const rm = tl.match(/Rarity\*?\*?:?\s*(\w+)/i);
					if (rm) rarity = rm[1];
					const cm = tl.match(/Cost\*?\*?:?\s*(\d+)/i);
					if (cm) manaCost = parseInt(cm[1]);
					i++; continue;
				}

				// Stats
				const statsM = cl.match(/^\s*-\s*\*\*Stats\*?\*?:?\s*(\d+)\/(\d+)/);
				if (statsM) {
					attack = parseInt(statsM[1]);
					health = parseInt(statsM[2]);
					// Check for race on same line
					const raceM = cl.match(/Race\*?\*?:?\s*(\w+)/i);
					if (raceM) race = raceM[1];
					i++; continue;
				}

				// Effect
				const effectM = cl.match(/^\s*-\s*\*\*Effect\*?\*?:?\s*(.+)/);
				if (effectM) { effect = effectM[1]; i++; continue; }

				// Flavor text
				const flavorM = cl.match(/^\s*-\s*\*\*Flavor Text\*?\*?:?\s*"?(.+?)"?\s*$/);
				if (flavorM) { flavorText = flavorM[1].replace(/^"/, '').replace(/"$/, ''); i++; continue; }

				// Art prompt
				const promptM = cl.match(/^\s*-\s*\*\*(AI )?Art Prompt\*?\*?:?\s*(.+)/i);
				if (promptM) { artPrompt = promptM[2].trim(); i++; continue; }

				// Key visuals header
				if (cl.match(/Key Visual/i)) { inKeyVisuals = true; i++; continue; }

				// Key visual items
				const kvM = cl.match(/^\s{2,}-\s+(.+)/);
				if (kvM && inKeyVisuals) { keyVisuals.push(kvM[1].trim()); i++; continue; }
				if (kvM && !cl.match(/\*\*/)) { keyVisuals.push(kvM[1].trim()); i++; continue; }

				// Blank line resets key visuals
				if (cl.trim() === '') { inKeyVisuals = false; }

				i++;
			}

			// Card data lookup
			const cd = cardMap.get(cardId);

			// Build template entry
			const metaParts = [];
			metaParts.push(`**Card ID:** ${cardId}`);
			metaParts.push(`**Type:** ${(type || cd?.type || 'minion').toLowerCase()}`);
			metaParts.push(`**Class:** ${cardClass || cd?.class || 'Neutral'}`);
			metaParts.push(`**Rarity:** ${(rarity || cd?.rarity || 'common').toLowerCase()}`);
			const m = manaCost ?? cd?.manaCost;
			if (m !== undefined) metaParts.push(`**Mana:** ${m}`);
			const a = attack ?? cd?.attack;
			if (a !== undefined) metaParts.push(`**Attack:** ${a}`);
			const h = health ?? cd?.health;
			if (h !== undefined) metaParts.push(`**Health:** ${h}`);
			const r = race || cd?.race;
			if (r) metaParts.push(`**Race:** ${r}`);

			output.push(`## ${counter}. ${name}`);
			output.push('');
			output.push(metaParts.join(' | '));

			const fl = flavorText || cd?.flavorText || '';
			if (fl) { output.push(''); output.push(`> "${fl}"`); }

			if (artPrompt) {
				output.push('');
				output.push('**Art Prompt:**');
				output.push(artPrompt);
			}

			if (keyVisuals.length > 0) {
				output.push('');
				output.push('**Key Visual Attributes:**');
				for (const kv of keyVisuals) output.push(`- ${kv}`);
			}

			output.push('');
			output.push('---');
			output.push('');
			continue;
		}

		// Non-entry section headers for class subsections
		if (line.match(/^##\s+\w+ (Minions|Spells|Weapons|Runes|Quest|Hero|Tokens|Super)/)) {
			output.push('');
			output.push(line);
			output.push('');
			i++;
			continue;
		}

		i++;
	}

	return output.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('Building card metadata map from TypeScript sources...');
const cardMap = extractCardsFromTS(CARD_DATA_DIR);
console.log(`  Found ${cardMap.size} cards in registry`);

// Also scan norseHeroes and other data dirs
const heroDir = path.join(ROOT, 'client/src/game/data/norseHeroes');
const heroCards = extractCardsFromTS(heroDir);
for (const [id, data] of heroCards) cardMap.set(id, data);

const legacyDir = path.join(ROOT, 'client/src/game/data');
const legacyFiles = ['legendaryCards.ts', 'cards.ts'].map(f => path.join(legacyDir, f));
for (const f of legacyFiles) {
	if (fs.existsSync(f)) {
		const content = fs.readFileSync(f, 'utf-8');
		const blocks = content.match(/\{[^{}]*\bid:\s*\d{4,5}[^{}]*\}/gs) || [];
		for (const block of blocks) {
			const idM = block.match(/\bid:\s*(\d+)/);
			if (idM && !cardMap.has(parseInt(idM[1]))) {
				const id = parseInt(idM[1]);
				const nameM = block.match(/\bname:\s*['"`]([^'"`]+)['"`]/);
				const manaM = block.match(/\bmanaCost:\s*(\d+)/);
				const atkM = block.match(/\battack:\s*(\d+)/);
				const hpM = block.match(/\bhealth:\s*(\d+)/);
				const typeM = block.match(/\btype:\s*['"`]([^'"`]+)['"`]/);
				const rarM = block.match(/\brarity:\s*['"`]([^'"`]+)['"`]/);
				const clsM = block.match(/\bclass:\s*['"`]([^'"`]+)['"`]/);
				const raceM = block.match(/\brace:\s*['"`]([^'"`]+)['"`]/);
				const flavorM = block.match(/\bflavorText:\s*['"`]([^'"`]*?)['"`]/);
				cardMap.set(id, {
					id, name: nameM?.[1] || '', manaCost: manaM ? parseInt(manaM[1]) : undefined,
					attack: atkM ? parseInt(atkM[1]) : undefined, health: hpM ? parseInt(hpM[1]) : undefined,
					type: typeM?.[1] || 'minion', rarity: rarM?.[1] || 'common',
					class: clsM?.[1] || 'Neutral', race: raceM?.[1] || undefined,
					flavorText: flavorM?.[1] || '',
				});
			}
		}
	}
}

console.log(`  Total card metadata entries: ${cardMap.size}`);

// Files to convert — SKIP EXPANSION_ART_GUIDE (the 300+ already made)
const FORMAT_A_FILES = [
	'CARD_ART_MASTER_GUIDE.md',
	'PET_FAMILY_ART_GUIDE.md',
];

const FORMAT_B_FILES = [
	'CLASS_CARD_ART_GUIDE_PART1.md',
	'CLASS_CARD_ART_GUIDE_PART1B.md',
	'CLASS_CARD_ART_GUIDE_PART2.md',
	'CLASS_CARD_ART_GUIDE_PART2B.md',
	'CLASS_CARD_ART_GUIDE_PART3.md',
	'CLASS_CARD_ART_GUIDE_PART3B.md',
];

for (const file of FORMAT_A_FILES) {
	const inputPath = path.join(DOCS, file);
	if (!fs.existsSync(inputPath)) { console.log(`  SKIP (not found): ${file}`); continue; }
	console.log(`Converting Format A: ${file}...`);
	const result = convertFormatAPreservingStructure(inputPath, cardMap);
	fs.writeFileSync(inputPath, result, 'utf-8');
	const entryCount = (result.match(/^## \d+\./gm) || []).length;
	console.log(`  Done: ${entryCount} entries`);
}

for (const file of FORMAT_B_FILES) {
	const inputPath = path.join(DOCS, file);
	if (!fs.existsSync(inputPath)) { console.log(`  SKIP (not found): ${file}`); continue; }
	console.log(`Converting Format B: ${file}...`);
	const result = convertFormatBPreservingStructure(inputPath, cardMap);
	fs.writeFileSync(inputPath, result, 'utf-8');
	const entryCount = (result.match(/^## \d+\./gm) || []).length;
	console.log(`  Done: ${entryCount} entries`);
}

// Remove duplicate MINION_SPELL_ART_GUIDE (it's a subset of CARD_ART_MASTER_GUIDE)
const minionSpellPath = path.join(DOCS, 'MINION_SPELL_ART_GUIDE.md');
if (fs.existsSync(minionSpellPath)) {
	fs.unlinkSync(minionSpellPath);
	console.log('Removed duplicate: MINION_SPELL_ART_GUIDE.md (subset of CARD_ART_MASTER_GUIDE.md)');
}

console.log('\nDone! All art guides converted to template format.');
console.log('Skipped: EXPANSION_ART_GUIDE.md (300+ entries already have generated art)');
