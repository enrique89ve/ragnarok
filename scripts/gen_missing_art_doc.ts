/**
 * Generate MISSING_CARD_ART.md from real card registry data.
 * Run: npx tsx scripts/gen_missing_art_doc.ts
 *
 * Uses actual cardRegistry imports (not regex) — 100% accurate card info.
 */
import fs from 'fs';
import { cardRegistry } from '../client/src/game/data/cardRegistry/index.ts';

// Read artMapping.ts and extract CARD_ID_TO_ART IDs
const artFile = fs.readFileSync('client/src/game/utils/art/artMapping.ts', 'utf8');
const idArtMap = new Set<number>();
let m: RegExpExecArray | null;
const idRegex = /^\t(\d+):\s*'/gm;
while ((m = idRegex.exec(artFile)) !== null) {
	idArtMap.add(parseInt(m[1]));
}

// Also get VERCEL names (deprecated fallback, entries already merged but still checked)
const vercelNames = new Set<string>();
const vercelRegex = /^\s+"([^"]+)":\s*"/gm;
while ((m = vercelRegex.exec(artFile)) !== null) {
	vercelNames.add(m[1].toLowerCase());
}

// Get MINION_CARD_TO_ART names
const minionNames = new Set<string>();
const minionIdx = artFile.indexOf('MINION_CARD_TO_ART');
if (minionIdx !== -1) {
	const minionSection = artFile.substring(minionIdx);
	const minionEnd = minionSection.indexOf('};');
	const minionBlock = minionSection.substring(0, minionEnd);
	const minionRegex = /^\s+'([^']+)':\s*'/gm;
	while ((m = minionRegex.exec(minionBlock)) !== null) {
		minionNames.add(m[1].toLowerCase());
	}
}

console.error(`Art: ${idArtMap.size} IDs, ${vercelNames.size} names, ${minionNames.size} minion names`);

// Build card map from real registry
interface CardInfo {
	id: number;
	name: string;
	type: string;
	rarity: string;
	heroClass: string;
	race: string | null;
	collectible: boolean;
	description: string;
	keywords: string[];
	manaCost: number;
	attack?: number;
	health?: number;
}

const seen = new Map<number, CardInfo>();
for (const card of cardRegistry) {
	const id = card.id as number;
	if (id < 1000) continue;
	if (seen.has(id)) continue;

	seen.set(id, {
		id,
		name: card.name,
		type: card.type || 'minion',
		rarity: (card as any).rarity || 'common',
		heroClass: (card as any).heroClass || (card as any).class || 'neutral',
		race: (card as any).race || null,
		collectible: card.collectible !== false,
		description: card.description || '',
		keywords: card.keywords || [],
		manaCost: card.manaCost ?? 0,
		attack: (card as any).attack,
		health: (card as any).health,
	});
}

console.error(`Total unique card IDs: ${seen.size}`);

function hasArt(card: CardInfo): boolean {
	if (idArtMap.has(card.id)) return true;
	if (vercelNames.has(card.name.toLowerCase())) return true;
	if (minionNames.has(card.name.toLowerCase())) return true;
	return false;
}

// Categorize missing cards
const deckBuilderMissing: CardInfo[] = [];
const superMinionMissing: CardInfo[] = [];
const weaponUpgradeMissing: CardInfo[] = [];
const tokenMissing: CardInfo[] = [];
const otherMissing: CardInfo[] = [];

for (const card of seen.values()) {
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

console.error(`Deck builder missing: ${deckBuilderMissing.length}`);
console.error(`Super minion missing: ${superMinionMissing.length}`);
console.error(`Weapon upgrade missing: ${weaponUpgradeMissing.length}`);
console.error(`Token missing: ${tokenMissing.length}`);
console.error(`Other missing: ${otherMissing.length}`);
console.error(`Total: ${totalMissing}`);

// Verify: count cards with type still unknown (should be 0 now)
const unknownType = [...seen.values()].filter(c => !hasArt(c) && (!c.type || c.type === 'unknown'));
if (unknownType.length > 0) {
	console.error(`WARNING: ${unknownType.length} cards still have unknown type:`);
	for (const c of unknownType.slice(0, 10)) {
		console.error(`  ${c.id}: ${c.name}`);
	}
}

// Group deck builder cards by range
function getRangeLabel(id: number) {
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
	if (id >= 85000 && id <= 89999) return { range: '85000-89999', label: 'Rogue, Golem & Class' };
	if (id >= 91000 && id <= 92999) return { range: '91000-92999', label: 'Elder Titans & Support' };
	return { range: 'other', label: 'Other' };
}

const rangeGroups = new Map<string, { label: string; cards: CardInfo[] }>();
for (const card of deckBuilderMissing) {
	const { range, label } = getRangeLabel(card.id);
	if (!rangeGroups.has(range)) {
		rangeGroups.set(range, { label, cards: [] });
	}
	rangeGroups.get(range)!.cards.push(card);
}

function classLabel(c: string): string {
	if (!c || c === 'Neutral' || c === 'neutral') return '';
	return ' | Class: ' + c.charAt(0).toUpperCase() + c.slice(1);
}

/**
 * Generate visual-form art prompts following ART_TEMPLATE.md guidelines.
 * Focus on: SUBJECT (shape/silhouette), MATERIALS (surface/texture),
 * KEY DETAILS (2-3 unique features), COLOR (3-4 max), LIGHTING, CONTEXT.
 * No narrative, no gameplay mechanics, no abstract concepts.
 */

// Name-based visual inference: returns specific visual description
function inferVisualFromName(name: string): string {
	const lc = name.toLowerCase();
	const patterns: [RegExp, string][] = [
		// Sea creatures
		[/kraken/, 'Colossal squid-like sea monster, massive barbed tentacles, bioluminescent suckers, barnacle-crusted hide. Deep ocean blue-black, pale underbelly, green bioluminescence. Murky deep-sea background.'],
		[/leviathan/, 'Enormous armored sea serpent, rows of jagged fins, whale-sized jaw, overlapping dark scales. Deep teal, bone-white belly, coral-red fin edges. Churning dark ocean.'],
		[/jormungandr|world serpent/, 'Planet-spanning serpent coiled around itself, scales like continental plates, glowing venom dripping from fangs. Grey-green scales, toxic yellow-green venom, storm-dark. Ocean horizon background.'],
		[/serpent(?!ine)/, 'Massive coiled serpent, iridescent scales, forked tongue, hooded head. Dark emerald, gold-flecked scales. Misty water background.'],
		[/shark/, 'Great white shark variant, scarred grey hide, rows of serrated teeth, cold black eyes. Steel grey, white belly, dark water. Underwater murk.'],
		[/turtle|snapjaw/, 'Giant snapping turtle, moss-covered shell, powerful beak-jaw, ancient weathered carapace. Algae green, stone-brown shell, amber eyes. Shallow river.'],
		[/crab|crocolisk|crocodile/, 'Armored river predator, heavy scaled hide, powerful jaws, low profile. Muddy brown-green, pale belly. River shore.'],
		// Land beasts
		[/wolf|warg/, 'Large Nordic wolf, thick winter fur, amber eyes, powerful build. Silver-grey fur, white chest ruff. Snowy pine forest.'],
		[/fenrir/, 'Monstrous wolf, broken chains dangling from thick neck, scars across muzzle, towering over trees. Charcoal-black fur, red eyes, corroded iron chains. Ragnarok sky.'],
		[/bear|bjorn/, 'Massive brown bear standing upright, thick scarred hide, heavy claws. Dark brown fur, lighter muzzle. Rocky mountain backdrop.'],
		[/boar|tusker/, 'Wild boar, bristled dark fur, curved ivory tusks, muscular compact body. Dark brown bristles, mud-spattered, ivory tusks. Forest undergrowth.'],
		[/raptor|velociraptor/, 'Feathered predatory dinosaur, sharp curved claws, lean muscular build, alert posture. Mottled brown-green feathers, orange eye stripe. Fern undergrowth.'],
		[/panther|cat|lynx/, 'Sleek black panther, glowing yellow-green eyes, rippling muscle under short fur. Jet black, emerald eyes. Shadow-dappled forest.'],
		[/spider/, 'Giant spider, glossy black carapace, eight barbed legs, multiple glowing red eyes, web strands. Obsidian black, crimson eyes, silver web. Dark cave mouth.'],
		[/scorpion/, 'Giant scorpion, segmented chitinous armor, raised stinger tail, heavy pincers. Desert-tan chitin, amber stinger. Rocky desert.'],
		[/snake|viper|cobra/, 'Hooded cobra, iridescent scales, flared hood with eye-markings, dripping fangs. Jade green, gold hood markings. Dark stone.'],
		[/stag|elk|deer/, 'Majestic white stag, massive branching antlers, luminous coat, regal posture. Silver-white fur, pale gold antlers. Moonlit clearing.'],
		[/eagle|hawk|falcon/, 'Great eagle, broad wingspan, sharp golden beak, fierce golden eyes, detailed feathers. Brown-gold plumage, white head. Mountain peak sky.'],
		[/raven|crow|huginn|muninn/, 'Large raven, glossy blue-black feathers, intelligent dark eyes, slightly open beak. Iridescent blue-black, purple sheen. Stormy grey sky.'],
		[/owl/, 'Great horned owl, wide disc-face, piercing amber eyes, tufted ears. Mottled brown-white plumage. Twilight forest branch.'],
		[/bat/, 'Giant bat, leathery spread wings, pointed ears, bared fangs. Dark brown membrane, lighter fur body. Cave mouth at dusk.'],
		[/lion/, 'Armored war lion, thick dark mane, battle scars, heavy muscled. Golden fur, dark mane, amber eyes. Dry grassland.'],
		[/horse|stallion|steed/, 'Powerful war horse, heavy muscled, flowing mane, iron-shod hooves. Dark bay coat, black mane. Windswept plain.'],
		[/sleipnir/, 'Eight-legged divine horse, muscular grey coat, eight powerful legs in motion, flowing silver mane. Storm grey, silver mane, glowing hooves. Rainbow bridge.'],
		[/hound|dog/, 'Norse war hound, lean muscular build, spiked leather collar, scarred muzzle. Brindle coat, iron collar. Mist-covered heath.'],
		[/frog|toad/, 'Small luminous frog, slick amphibian skin, bulging jewel-like eyes. Vibrant green, golden eyes. Mossy stone.'],
		[/locust/, 'Swarm of locusts, iridescent wings, segmented bodies, mandibles. Bronze-green, translucent wings. Dust cloud.'],
		// Dragons
		[/dragon|wyrm|drake|wyvern/, 'Scaled dragon, spread bat-like wings, horned head, smoke curling from nostrils. Dark scales with ember-glow cracks, molten orange eyes. Volcanic cave.'],
		[/hydra/, 'Multi-headed serpent, five snaking necks, each head with dripping fangs, coiled muscular body. Dark green scales, red-orange throat flesh. Swamp mist.'],
		// Undead
		[/skeleton|bones/, 'Animated skeleton warrior, hollow eye sockets with blue flame, rusted armor fragments, notched sword. Yellowed bone, blue soul-fire, corroded iron. Dark crypt.'],
		[/zombie|ghoul|corpse/, 'Shambling undead, rotting flesh, exposed bone, tattered burial cloth. Grey-green decay, exposed white bone. Fog-filled graveyard.'],
		[/ghost|specter|wraith|phantom/, 'Translucent spectral figure, hollow eyes, trailing ectoplasmic wisps. Pale blue-white, semi-transparent. Dark void.'],
		[/shade/, 'Dark shadow figure, barely corporeal, glowing pale eyes, wisps of dark energy. Deep shadow-black, faint violet glow. Pitch darkness.'],
		[/draugr/, 'Norse undead warrior, desiccated skin over bone, blue-glowing eye sockets, corroded iron helm and mail. Pallid grey-blue, rusted iron, cold blue glow. Barrow chamber.'],
		// Humanoids — warriors
		[/valkyrie|valkyrja/, 'Winged Norse warrior woman, feathered helm, polished breastplate, spread white wings, spear in hand. Burnished steel, white feathers, gold trim. Stormy Valhalla sky.'],
		[/berserker/, 'Bare-chested Norse berserker, wild eyes, animal-skin cloak, foam at mouth, dual axes raised. Scarred pale skin, matted hair, blood-red eyes. Battlefield chaos.'],
		[/einherjar/, 'Fallen Norse warrior spirit, golden ethereal armor, translucent edges, spectral weapon. Gold-white glow, fading at edges. Valhalla mead-hall.'],
		[/knight|crusader/, 'Heavy-armored Norse knight, full plate with knotwork engravings, shield bearing clan sigil. Burnished steel, blue surcoat, gold knotwork. Overcast battlefield.'],
		[/warrior|champion/, 'Norse warrior, chainmail over leather, round shield, battle-scarred face, braided beard. Iron-grey mail, weathered leather, worn wood shield. Misty battlefield.'],
		[/guardian|defender|shieldbearer/, 'Heavily-armored defender, oversized tower shield, braced stance, Norse knotwork shield design. Dark iron, aged oak shield, brass rivets. Stone fortress wall.'],
		[/archer|ranger/, 'Norse archer, lean build, recurve bow drawn, quiver of rune-fletched arrows, hooded cloak. Forest green cloak, ash-wood bow. Pine forest.'],
		[/assassin|thief/, 'Hooded figure, twin curved daggers, wrapped in dark cloth, half-hidden face. Shadow-black cloth, glinting steel blades. Dark alley.'],
		// Humanoids — casters
		[/mage|sorcerer|wizard|warlock/, 'Robed spellcaster, rune-covered staff, glowing hands, floating runic symbols around head. Dark robes, blue-white rune glow. Arcane study.'],
		[/priest|cleric/, 'Norse holy figure, white-gold vestments, hands radiating warm light, rune-carved holy symbol. White-gold cloth, warm amber light. Stone temple.'],
		[/shaman/, 'Tribal shaman, fur-draped, bone necklaces, spirit totem staff, painted face. Earth-brown furs, white bone, spirit-blue paint. Misty hilltop.'],
		[/druid/, 'Nature caster, bark-like skin patches, antler crown, living vines wrapped around arms. Bark brown, moss green, golden sap glow. Ancient grove.'],
		[/necromancer|lich/, 'Skeletal mage, tattered dark robes, skull-topped staff, swirling necrotic energy. Black robes, sickly green energy, bone-white. Shadowed crypt.'],
		// Humanoids — social
		[/pirate|raider|viking/, 'Norse raider, salt-stained leather, battle-worn axe, braided beard with iron rings. Weathered brown leather, sea-stained. Longship deck.'],
		[/dwarf|dverg|svartalf|sindri/, 'Stocky Norse dwarf, massive forearms, forge-burned apron, intricate braided beard, hammer. Soot-darkened skin, bronze tools, fire-glow. Underground forge.'],
		[/elf|alfheim/, 'Slender light elf, luminous pale skin, elongated ears, flowing silver hair, ethereal robes. Moon-silver, pale gold, soft white glow. Crystal-lit forest.'],
		[/giant|jotun|jötunn/, 'Towering frost giant, craggy ice-blue skin, frost-crusted beard, massive club. Ice blue, glacier white, storm grey. Mountain glacier.'],
		[/troll/, 'Hulking troll, rocky moss-covered skin, small eyes, massive hands, hunched posture. Stone grey-green, moss patches. Bridge or cave.'],
		// Constructs
		[/golem/, 'Animated construct, rough-carved stone or wood body, glowing rune core in chest, moss in joints. Grey stone, green moss, blue rune glow. Forest clearing.'],
		[/automaton|construct|mechanical|microbot/, 'Dwarven mechanical construct, riveted bronze plates, exposed gears, steam vents, rune-powered core. Tarnished bronze, brass gears, orange rune glow. Workshop floor.'],
		[/totem/, 'Carved wooden totem pole face, stacked animal spirits, glowing rune eyes, weathered wood. Dark aged wood, turquoise rune glow. Misty hilltop.'],
		// Cosmic/Titan
		[/titan|primordial|ancient one/, 'Towering cosmic entity, nebula-patterned skin, multiple eyes, reality warping around edges. Deep purple, star-white eyes, cosmic void. Starfield.'],
		// Nature objects
		[/treant|tree/, 'Living tree creature, thick bark body, branch-arms, leaf crown, glowing sap veins. Bark brown, autumn-gold leaves, amber sap. Forest.'],
		[/crystal|gem/, 'Floating prismatic crystal formation, geometric facets, internal light refractions. Amethyst purple, quartz white, rainbow refractions. Dark void.'],
		// Rune/magic
		[/rune|seidr|galdor/, 'Glowing Elder Futhark rune circle, angular carved glyphs, energy radiating from center. Blue-white glow, dark stone surface. Dark void.'],
		// Riders/cavalry
		[/rider/, 'Mounted Norse warrior on armored horse, lance or weapon raised, flowing cloak, galloping stance. Dark iron armor, crimson cloak, war horse. Dusty battlefield.'],
		// Named figures with implied visuals
		[/acolyte|apprentice/, 'Young robed initiate, simple cloth vestments, glowing hands, eager expression. Plain brown robes, faint energy glow. Temple interior.'],
		[/scout|spy/, 'Lean hooded figure, light leather armor, alert crouching stance, hand on dagger. Dark leather, forest green cloak. Forest edge.'],
		[/captain|commander|general/, 'Commanding Norse officer, ornate helm with crest, battle-standard, heavy armor. Polished steel, crimson plume, gold rank insignia. Battlefield command post.'],
		[/herald|messenger/, 'Swift Norse messenger, light armor, horn or scroll in hand, running stance. Light leather, bronze horn, wind-blown. Open road.'],
		[/sage|scholar|lorekeeper/, 'Elderly robed scholar, long beard, scroll in hand, rune-covered spectacles. Deep blue robes, parchment, silver hair. Library.'],
		[/smith|forger|blacksmith/, 'Muscular Norse smith, soot-darkened skin, leather apron, hammer raised over anvil. Soot-black, orange forge glow, bronze tools. Forge.'],
	];

	for (const [re, visual] of patterns) {
		if (re.test(lc)) return visual;
	}
	return '';
}

// Generate visual-form art prompt following ART_TEMPLATE.md format
function generatePrompt(card: CardInfo): string {
	const name = card.name;
	const desc = card.description || '';
	const lcDesc = desc.toLowerCase();
	const lcName = name.toLowerCase();

	// Weapons — focus on shape, material, detail
	if (card.type === 'weapon') {
		if (lcName.includes('bow') || lcName.includes('arrow'))
			return `Recurve hunting bow, carved ash-wood grip, Norse knotwork along limbs, glowing rune string. Honey-gold wood, silver-blue string glow. Dark armory background.`;
		if (lcName.includes('staff') || lcName.includes('rod') || lcName.includes('wand'))
			return `Tall gnarled staff, twisted dark wood, embedded crystal at crown, carved Elder Futhark runes spiraling down shaft. Dark walnut wood, blue-white crystal glow. Dim study background.`;
		if (lcName.includes('axe'))
			return `Norse battle axe, wide crescent blade, rune-etched cheek, wrapped leather grip, iron pommel. Dark forged iron, crimson leather, faint rune glow. Dark forge background.`;
		if (lcName.includes('hammer') || lcName.includes('mjolnir'))
			return `Heavy Norse war hammer, square iron head, knotwork engravings on face, leather-wrapped short haft. Dark iron, warm leather brown, blue rune traces. Thunder-lit sky.`;
		if (lcName.includes('sword') || lcName.includes('blade'))
			return `Norse longsword, pattern-welded blade, crossguard with wolf-head terminals, leather-wrapped grip. Damascus steel, dark leather, silver crossguard. Dark background.`;
		if (lcName.includes('hook'))
			return `Curved iron grappling hook, barbed point, rope-wrapped handle, salt-corroded surface. Rusted iron, frayed hemp rope. Ship deck background.`;
		if (lcName.includes('claw'))
			return `Set of curved metal claws, strapped to leather gauntlet, serrated inner edges, blood grooves. Dark steel, black leather, crimson edges. Dark background.`;
		if (lcName.includes('trident') || lcName.includes('fork'))
			return `Three-pronged trident, barnacle-crusted shaft, coral-encrusted tines, seaweed wrapped grip. Sea-green bronze, white barnacles, coral pink. Ocean spray.`;
		return `Norse weapon, forged dark iron, rune-etched surface, leather-wrapped grip, angular Norse design. Dark iron, aged leather, faint blue rune glow. Dark armory background.`;
	}

	// Spells — focus on energy form, particle effects, color
	if (card.type === 'spell' || card.type === 'secret') {
		if (lcDesc.includes('fire') || lcDesc.includes('burn') || lcDesc.includes('flame') || lcName.includes('fire') || lcName.includes('flame') || lcName.includes('ember'))
			return `Radial explosion of Norse fire runes, each glyph a shard of white-hot energy, spiral flame tendrils. Molten orange, white-hot center, dark smoke edges. Dark void.`;
		if (lcDesc.includes('ice') || lcDesc.includes('freeze') || lcDesc.includes('frost') || lcName.includes('frost') || lcName.includes('ice') || lcName.includes('frozen'))
			return `Crystalline ice formation, jagged frost shards radiating outward, frozen Norse rune glyphs suspended in ice. Pale blue, glacier white, deep indigo. Dark void.`;
		if (lcDesc.includes('heal') || lcDesc.includes('restore') || lcName.includes('heal') || lcName.includes('light') || lcName.includes('divine'))
			return `Warm golden light radiating upward, Norse healing runes orbiting in gentle spiral, soft particle motes. Warm gold, amber, soft white. Dark temple interior.`;
		if (lcDesc.includes('shadow') || lcDesc.includes('death') || lcDesc.includes('destroy') || lcName.includes('shadow') || lcName.includes('death'))
			return `Dark necrotic energy vortex, angular death-runes disintegrating at edges, skull-shaped smoke wisps. Shadow purple-black, sickly green traces, bone white. Dark void.`;
		if (lcDesc.includes('lightning') || lcDesc.includes('thunder') || lcDesc.includes('storm') || lcName.includes('lightning') || lcName.includes('storm') || lcName.includes('thunder'))
			return `Branching lightning bolts converging on central rune, electrical arcs, crackling energy. Electric blue-white, deep purple storm, gold sparks. Storm cloud.`;
		if (lcDesc.includes('summon') || lcDesc.includes('raise'))
			return `Glowing Norse rune circle on ground, spectral figures materializing from light pillars, floating angular glyphs. Teal-blue rune lines, spectral white, dark ground. Misty backdrop.`;
		if (lcDesc.includes('draw') || lcDesc.includes('discover') || lcDesc.includes('foresee') || lcDesc.includes('scry'))
			return `Floating runic cards fanning out from central eye-rune, trailing golden light trails, mystical symbols. Deep blue, gold light trails, silver runes. Cosmic void.`;
		if (lcDesc.includes('armor') || lcDesc.includes('shield') || lcDesc.includes('protect'))
			return `Translucent rune-shield dome, interlocking angular glyphs forming barrier, golden energy ripples on impact. Gold-white barrier, blue rune edges. Dark background.`;
		if (lcDesc.includes('buff') || lcDesc.includes('+') || lcDesc.includes('give'))
			return `Rising golden energy aura, Norse empowerment runes spiraling upward, particle motes ascending. Warm gold, white highlights, amber glow. Dark background.`;
		if (lcDesc.includes('silence') || lcDesc.includes('transform') || lcName.includes('hex') || lcName.includes('poly'))
			return `Swirling transformation vortex, angular runes shattering and reforming, prismatic energy distortion. Purple distortion, white shatter lines, prismatic edges. Dark void.`;
		if (card.type === 'secret')
			return `Thin translucent rune-circle half-dissolved into shadow smoke, angular glyphs flickering at edges. Poison-green wire traces threading through dark mist. Shadow black, toxic green rim. Deep dark void.`;
		return `Swirling Norse rune energy, Elder Futhark glyphs orbiting central focal point, arcane particle streams. Blue-white rune glow, deep indigo, silver traces. Dark void.`;
	}

	// Artifacts
	if (card.type === 'artifact') {
		if (lcName.includes('ring'))
			return `Ornate golden ring, embedded gemstone, Norse knotwork band, faint inner rune glow. Aged gold, deep gem color, warm inner glow. Dark velvet background.`;
		if (lcName.includes('amulet') || lcName.includes('necklace') || lcName.includes('pendant'))
			return `Norse amulet pendant, hammered metal, central rune gemstone, leather cord, engraved knotwork. Dark silver, glowing gem, aged leather. Dark background.`;
		if (lcName.includes('horn'))
			return `Carved drinking horn, silver rim, Norse knotwork engravings, leather strap, polished surface. Dark horn, silver fittings, amber liquid glow. Dark tavern.`;
		return `Norse mythological relic, ornate metalwork, embedded glowing rune, age-worn surface, intricate knotwork details. Aged gold, blue rune glow, dark patina. Dark background.`;
	}

	// Armor
	if (card.type === 'armor') {
		if (lcName.includes('helm') || lcName.includes('crown') || lcName.includes('headpiece'))
			return `Norse helm, forged iron with nose guard, hammered surface, faint rune on brow, leather chin-strap. Dark iron, warm rust patina, faint blue rune. Dark armory.`;
		if (lcName.includes('greaves') || lcName.includes('boots') || lcName.includes('treads'))
			return `Norse leg greaves, riveted iron plates, leather strapping, knotwork border at knee. Dark iron, aged leather, brass rivets. Dark armory.`;
		if (lcName.includes('chest') || lcName.includes('plate') || lcName.includes('robes'))
			return `Norse chest armor, overlapping iron plates, central clan sigil, leather undershirt visible at edges. Dark iron, aged leather, faded blue cloth. Dark armory.`;
		return `Norse armor piece, forged iron plates, riveted construction, knotwork border engravings. Dark iron, aged leather, brass fittings. Dark armory.`;
	}

	// Hero cards
	if (card.type === 'hero') {
		if (lcDesc.includes('death') || lcDesc.includes('undead') || lcDesc.includes('ghoul') || lcName.includes('death'))
			return `Dark Norse death-hero, gaunt face, skull motifs on armor, necrotic green energy swirling around hands. Bone-white skin, black armor, sickly green glow. Helheim cavern.`;
		if (lcDesc.includes('fire') || lcDesc.includes('flame') || lcDesc.includes('burn') || lcName.includes('fire') || lcName.includes('flame'))
			return `Norse fire-hero, ember-glowing skin cracks, flame-wreathed hair, volcanic armor. Obsidian-black, molten orange cracks, crimson flame. Muspelheim lava.`;
		if (lcDesc.includes('frost') || lcDesc.includes('ice') || lcDesc.includes('freeze') || lcName.includes('frost') || lcName.includes('ice'))
			return `Norse frost-hero, pale blue skin, ice-crystal crown, frost breath, fur-lined armor. Ice-blue, glacier white, silver armor. Niflheim blizzard.`;
		if (lcDesc.includes('heal') || lcDesc.includes('divine') || lcDesc.includes('holy') || lcName.includes('holy') || lcName.includes('divine'))
			return `Divine Norse hero, golden radiant aura, white-gold vestments, rune-inscribed holy symbol. Warm gold, white cloth, amber divine light. Asgard temple.`;
		return `Norse mythological hero, battle-worn armor, distinctive face, weapon at ready, confident stance. Weathered iron, dark leather, clan colors. Overcast Norse landscape.`;
	}

	// Minions — use name inference first (most specific)
	const nameVisual = inferVisualFromName(name);
	if (nameVisual) return nameVisual;

	// Race-based visual fallback
	const raceVisuals: Record<string, string> = {
		'Beast': 'Norse wild creature, thick fur or hide, alert stance, natural environment. Earth browns, forest greens. Wilderness backdrop.',
		'Dragon': 'Scaled dragon, bat-like wings folded, horned head, smoke from nostrils, armored underbelly. Dark scales, ember cracks, molten eyes. Rocky lair.',
		'Elemental': 'Elemental being, body composed of pure element (fire/ice/stone/storm), humanoid shape dissolving at edges. Element colors, white-hot core. Dark void.',
		'Undead': 'Risen undead, tattered burial garments, exposed bone, glowing eye sockets. Pallid grey, blue soul-fire, rotted cloth. Foggy graveyard.',
		'Automaton': 'Dwarven automaton, riveted bronze plates, visible gears, steam vents, glowing rune core in chest. Tarnished bronze, brass, orange rune glow. Workshop.',
		'Naga': 'Aquatic humanoid, scaled skin, fin-crested head, webbed claws, trident. Sea-green scales, coral-pink fins. Underwater ruins.',
		'Titan': 'Towering cosmic entity, stone-and-starlight body, multiple glowing eyes, reality bending around form. Deep purple, star-white, cosmic void.',
		'Einherjar': 'Fallen Norse warrior spirit, translucent golden armor, spectral weapon, ethereal at edges. Gold-white glow, fading at extremities. Valhalla mead-hall.',
		'Spirit': 'Ethereal spirit form, translucent body, trailing wisps, glowing eyes. Pale blue-white, semi-transparent. Dark void.',
		'Human': 'Norse warrior, chainmail over leather, round shield, braided beard, weathered face. Iron-grey, worn leather. Misty battlefield.',
		'Totem': 'Carved wooden totem, stacked animal spirit faces, glowing rune eyes, weathered dark wood. Aged wood brown, turquoise glow. Misty hilltop.',
		'Pirate': 'Norse viking raider, salt-stained leather, battle-scarred, iron helm, boarding axe. Weathered brown, sea-grey. Longship deck.',
		'Draugr': 'Norse undead warrior, desiccated skin over bone, blue-glowing eye sockets, corroded iron armor. Pallid grey-blue, rusted iron, cold blue glow. Barrow chamber.',
		'Giant': 'Towering frost giant, craggy ice-blue skin, frost-crusted features, massive proportions. Ice-blue, glacier white. Mountain glacier.',
		'Treant': 'Living tree creature, thick bark body, branch-arms, leaf crown, glowing amber sap veins. Bark brown, moss green, amber sap. Forest grove.',
	};

	if (card.race && raceVisuals[card.race]) {
		return raceVisuals[card.race];
	}
	if (card.race) {
		return `${card.race} creature, mythological being, Norse-inspired design, distinctive features. Natural colors. Dark background.`;
	}

	// Final fallback — use whatever name context we can
	return `Norse mythological figure or creature, battle-ready, distinctive silhouette, Norse armor or natural features. Muted iron, leather brown, rune blue. Dark Norse landscape.`;
}

function formatCardEntry(card: CardInfo): string {
	let out = `### ${card.id} — ${card.name}\n`;
	const raceStr = card.race ? ` | Race: ${card.race}` : '';
	const statsStr = (card.attack !== undefined && card.health !== undefined) ? ` | ${card.attack}/${card.health}` : '';
	const keywordStr = card.keywords.length > 0 ? ` | Keywords: ${card.keywords.join(', ')}` : '';
	out += `- **Type:** ${card.type} | **Rarity:** ${card.rarity} | **Mana:** ${card.manaCost}${statsStr}${classLabel(card.heroClass)}${raceStr}${keywordStr}\n`;
	if (card.description) {
		out += `- **Description:** ${card.description}\n`;
	}
	out += `- **AI Art Prompt:** "${generatePrompt(card)}"\n\n`;
	return out;
}

// Build output
let out = '';

out += '# Missing Card Art — Complete List\n\n';
out += `**Generated:** ${new Date().toISOString().slice(0, 10)} (from card registry — 100% accurate)\n`;
out += `**Total cards in game:** ${seen.size}\n`;
out += `**Cards with art:** ${seen.size - totalMissing} (${((seen.size - totalMissing) / seen.size * 100).toFixed(1)}%)\n`;
out += `**Cards missing art:** ${totalMissing} (${(totalMissing / seen.size * 100).toFixed(1)}%)\n`;
out += `**Deck-builder visible missing:** ${deckBuilderMissing.length}\n\n`;

out += '## How to Use This Document\n\n';
out += 'Each card entry includes:\n';
out += '- **Card ID** — for mapping in `CARD_ID_TO_ART` in `artMapping.ts`\n';
out += '- **Name** — the card\'s display name\n';
out += '- **Type** — minion, spell, weapon, hero, artifact, armor, secret\n';
out += '- **Rarity** — basic, common, rare, epic, or mythic\n';
out += '- **Mana Cost** — casting cost\n';
out += '- **Stats** — ATK/HP for minions\n';
out += '- **Class** — Neutral or a specific class\n';
out += '- **Race** — creature type (Beast, Dragon, Elemental, etc.)\n';
out += '- **Keywords** — card abilities (Taunt, Divine Shield, etc.)\n';
out += '- **Description** — card text from the registry\n';
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
for (const [_range, group] of sortedRanges) {
	out += `## ${group.label} (${group.cards.length} cards)\n\n`;
	for (const card of group.cards) {
		out += formatCardEntry(card);
	}
}

// Super minions section
if (superMinionMissing.length > 0) {
	out += `## Super Minions (${superMinionMissing.length} cards)\n\n`;
	for (const card of superMinionMissing) {
		out += formatCardEntry(card);
	}
}

// Weapon upgrades section
if (weaponUpgradeMissing.length > 0) {
	out += `## Hero Weapon Upgrades (${weaponUpgradeMissing.length} cards)\n\n`;
	for (const card of weaponUpgradeMissing) {
		out += formatCardEntry(card);
	}
}

// Tokens section
if (tokenMissing.length > 0) {
	out += `## Tokens (${tokenMissing.length} cards)\n\n`;
	for (const card of tokenMissing) {
		out += formatCardEntry(card);
	}
}

// Other non-collectible section
if (otherMissing.length > 0) {
	out += `## Other Non-Collectible (${otherMissing.length} cards)\n\n`;
	for (const card of otherMissing) {
		out += formatCardEntry(card);
	}
}

// Write output
fs.writeFileSync('docs/MISSING_CARD_ART.md', out);
console.error(`Written to docs/MISSING_CARD_ART.md (${out.split('\n').length} lines)`);

// Audit summary
const allMissing = [...deckBuilderMissing, ...superMinionMissing, ...weaponUpgradeMissing, ...tokenMissing, ...otherMissing];
const typeBreakdown = new Map<string, number>();
const raceBreakdown = new Map<string, number>();
const noDesc = allMissing.filter(c => !c.description).length;

for (const c of allMissing) {
	typeBreakdown.set(c.type, (typeBreakdown.get(c.type) || 0) + 1);
	if (c.race) raceBreakdown.set(c.race, (raceBreakdown.get(c.race) || 0) + 1);
}

console.error('\n=== AUDIT SUMMARY ===');
console.error('Type breakdown:');
for (const [type, count] of [...typeBreakdown.entries()].sort((a, b) => b[1] - a[1])) {
	console.error(`  ${type}: ${count}`);
}
console.error(`\nCards with race: ${allMissing.filter(c => c.race).length}/${allMissing.length}`);
console.error('Race breakdown:');
for (const [race, count] of [...raceBreakdown.entries()].sort((a, b) => b[1] - a[1])) {
	console.error(`  ${race}: ${count}`);
}
console.error(`Cards with description: ${allMissing.length - noDesc}/${allMissing.length}`);
console.error(`Cards without description: ${noDesc}`);
if (noDesc > 0) {
	console.error('Cards missing description:');
	for (const c of allMissing.filter(c => !c.description).slice(0, 20)) {
		console.error(`  ${c.id}: ${c.name} (${c.type})`);
	}
}
