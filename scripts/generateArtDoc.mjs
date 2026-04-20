#!/usr/bin/env node
/**
 * Generates MISSING_CARD_ART.md from missing-art.json
 * Following the CARD_ART_TEMPLATE.md format for AI art generation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing-art.json'), 'utf8'));

// Norse visual reference pools
const RACE_VISUALS = {
	Beast: 'fur, fangs, claws, animal musculature, glowing eyes',
	Dragon: 'scaled hide, serpentine body, horned head, leathery wings, reptilian eyes',
	Naga: 'fish-scale skin, webbed hands, coral ornaments, bioluminescent markings',
	Elemental: 'pure energy form, crackling particles, translucent body, floating debris orbit',
	Undead: 'pallid rotting flesh, exposed bone, hollow glowing eye-sockets, tattered shroud',
	Automaton: 'bronze/iron plating, visible gears, runic circuit-lines, steam vents, crystal power-core',
	Titan: 'colossal proportions, divine radiance, marble-like skin, cosmic energy aura',
	Giant: 'massive frame, crude stone/ice armor, scarred weathered skin, towering silhouette',
	Spirit: 'translucent ethereal form, soft inner glow, wispy edges dissolving into air',
	Einherjar: 'battle-scarred Norse warrior, golden afterlife-glow, Valhalla symbols',
	Dwarf: 'stocky muscular frame, master-crafted armor, forge-soot, braided beard',
};

const CLASS_PALETTES = {
	neutral: 'warm gold, aged bronze, stone grey',
	warrior: 'blood red, dark iron, battle-steel',
	mage: 'arcane blue, deep purple, silver frost',
	priest: 'radiant gold, pure white, soft amber',
	rogue: 'shadow black, poison green, dark leather-brown',
	hunter: 'forest green, tawny brown, bone white',
	warlock: 'fel green, dark purple, sickly amber',
	shaman: 'storm blue, earthen brown, lightning gold',
	paladin: 'holy gold, divine white, royal blue',
	druid: 'nature green, bark brown, amber sunlight',
	berserker: 'blood crimson, charcoal black, burning orange',
	deathknight: 'frost blue, death-grey, necrotic green',
	necromancer: 'shadow purple, bone white, ghostly teal',
};

const RARITY_INTENSITY = {
	basic: 'simple, muted, understated',
	common: 'clean, modest, functional',
	rare: 'polished, detailed, quality materials',
	epic: 'ornate, dramatic lighting, premium materials, atmospheric',
	mythic: 'awe-inspiring, divine radiance, legendary materials, cinematic lighting, maximum detail',
};

const SPELL_VISUALS = {
	damage: 'explosive energy burst, shattering force, impact shockwave',
	heal: 'warm golden light, nature particles, gentle radiance',
	buff: 'ascending power aura, glowing runes, empowering energy',
	summon: 'portal rift, dimensional tear, emerging silhouette',
	draw: 'swirling card shapes, arcane library, knowledge streams',
	freeze: 'ice crystal formation, frost spreading, cold blue mist',
	destroy: 'dark vortex, disintegration particles, void collapse',
	transform: 'morphing silhouette, prismatic shift, unstable form',
	secret: 'hidden rune-circle, shadow mist, flickering glyphs',
	aoe: 'wide shockwave ring, radiating energy, ground-level devastation',
	generic: 'swirling Norse rune energy, magical convergence',
};

function inferSpellVisual(card) {
	const desc = (card.description || '').toLowerCase();
	if (desc.includes('deal') && desc.includes('damage')) {
		if (desc.includes('all ')) return 'aoe';
		return 'damage';
	}
	if (desc.includes('heal') || desc.includes('restore')) return 'heal';
	if (desc.includes('buff') || desc.includes('+') || desc.includes('give')) return 'buff';
	if (desc.includes('summon')) return 'summon';
	if (desc.includes('draw')) return 'draw';
	if (desc.includes('freeze')) return 'freeze';
	if (desc.includes('destroy') || desc.includes('silence')) return 'destroy';
	if (desc.includes('transform')) return 'transform';
	if (desc.includes('rune') || desc.includes('secret')) return 'secret';
	return 'generic';
}

function inferGender(card) {
	const name = (card.name || '').toLowerCase();
	const desc = (card.description || '').toLowerCase();
	const text = name + ' ' + desc;
	const femaleIndicators = ['goddess', 'queen', 'maiden', 'priestess', 'valkyrie', 'seeress', 'witch', 'norn', 'she ', 'her ', 'wife', 'mother', 'daughter', 'sister', 'enchantress', 'sorceress', 'huntress', 'empress', 'lady'];
	const maleIndicators = ['god ', 'king', 'warrior', 'berserker', 'lord', 'father', 'son ', 'brother', 'smith', 'he ', 'his ', 'warlord', 'jarl', 'chieftain', 'knight'];
	const nonHumanRaces = ['Beast', 'Dragon', 'Elemental', 'Automaton', 'Spirit'];
	if (nonHumanRaces.includes(card.race)) return null;
	if (femaleIndicators.some(w => text.includes(w))) return 'female';
	if (maleIndicators.some(w => text.includes(w))) return 'male';
	return null;
}

function buildPromptHint(card) {
	const cls = (card.class || 'neutral').toLowerCase();
	const palette = CLASS_PALETTES[cls] || CLASS_PALETTES.neutral;
	const rarity = RARITY_INTENSITY[card.rarity] || RARITY_INTENSITY.common;

	if (card.type === 'spell' || card.type === 'poker_spell') {
		const visual = inferSpellVisual(card);
		return `${SPELL_VISUALS[visual]}. ${rarity}. Palette: ${palette}. Dark atmospheric background.`;
	}

	if (card.type === 'weapon') {
		return `Norse weapon, detailed metalwork, runic engravings. ${rarity}. Palette: ${palette}. Dark background, dramatic lighting.`;
	}

	if (card.type === 'hero') {
		const gender = inferGender(card);
		const genderHint = gender === 'female' ? 'Female figure, ' : gender === 'male' ? 'Male figure, ' : '';
		return `${genderHint}Norse mythological character, powerful presence, iconic silhouette. ${rarity}. Palette: ${palette}. Atmospheric background with subtle realm elements.`;
	}

	// Minion
	const raceVis = RACE_VISUALS[card.race] || '';
	const gender = inferGender(card);
	const genderHint = gender === 'female' ? 'Female figure, ' : gender === 'male' ? 'Male figure, ' : '';

	if (raceVis) {
		return `${genderHint}${raceVis}. ${rarity}. Palette: ${palette}. Dark atmospheric background.`;
	}

	return `${genderHint}Norse mythological figure, distinctive silhouette. ${rarity}. Palette: ${palette}. Dark atmospheric background.`;
}

function formatCard(card, index) {
	const cls = (card.class || 'neutral');
	const displayClass = cls.charAt(0).toUpperCase() + cls.slice(1);
	const displayRarity = card.rarity;

	let meta = `**Card ID:** ${card.id} | **Type:** ${card.type} | **Class:** ${displayClass} | **Rarity:** ${displayRarity}`;

	if (card.attack != null) meta += ` | **Attack:** ${card.attack}`;
	if (card.health != null) meta += ` | **Health:** ${card.health}`;
	if (card.manaCost != null) meta += ` | **Mana:** ${card.manaCost}`;
	if (card.race && card.race !== 'None' && card.race !== 'none') meta += ` | **Race:** ${card.race}`;

	const gender = inferGender(card);
	if (gender) meta += ` | **Gender:** ${gender}`;

	let output = `## ${index}. ${card.name}\n\n${meta}\n`;

	if (card.flavorText) {
		output += `\n> "${card.flavorText}"\n`;
	}

	output += `\n**Art Prompt:**\n${buildPromptHint(card)}\n`;

	return output;
}

// Group cards by type, then by class
const groups = {
	hero: [],
	minion: [],
	spell: [],
	weapon: [],
	poker_spell: [],
};

cards.forEach(c => {
	const type = c.type || 'minion';
	if (groups[type]) groups[type].push(c);
	else groups.minion.push(c);
});

// Sort each group by class then by mana cost
Object.values(groups).forEach(arr => {
	arr.sort((a, b) => {
		const ca = (a.class || 'neutral').toLowerCase();
		const cb = (b.class || 'neutral').toLowerCase();
		if (ca !== cb) return ca.localeCompare(cb);
		return (a.manaCost || 0) - (b.manaCost || 0);
	});
});

// Build document
let doc = `# Missing Card Art — Echoes of Ymir

**Total cards needing art:** ${cards.length}
**Breakdown:** ${Object.entries(groups).filter(([,v]) => v.length > 0).map(([k,v]) => `${v.length} ${k}s`).join(', ')}

> Follow the format in \`CARD_ART_TEMPLATE.md\` for prompt writing guidelines.
> Each card below has a **seed prompt hint** — replace or expand it with proper visual-form language before generating.

---

`;

let globalIndex = 1;

const typeLabels = {
	hero: 'Heroes',
	minion: 'Minions',
	spell: 'Spells',
	weapon: 'Weapons',
	poker_spell: 'Poker Spells',
};

for (const [type, typeCards] of Object.entries(groups)) {
	if (typeCards.length === 0) continue;

	doc += `# ${typeLabels[type]} (${typeCards.length})\n\n`;

	// Sub-group by class
	let currentClass = null;
	for (const card of typeCards) {
		const cls = (card.class || 'neutral').toLowerCase();
		if (cls !== currentClass) {
			currentClass = cls;
			const displayClass = cls.charAt(0).toUpperCase() + cls.slice(1);
			doc += `### ${displayClass}\n\n`;
		}
		doc += formatCard(card, globalIndex) + '\n---\n\n';
		globalIndex++;
	}
}

const outPath = path.join(__dirname, '..', 'docs', 'MISSING_CARD_ART.md');
fs.writeFileSync(outPath, doc);
console.log(`Written ${cards.length} cards to ${outPath}`);
console.log(`File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
