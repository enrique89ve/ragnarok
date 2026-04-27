/**
 * Seed Card Supply Script
 *
 * Populates the card_supply table with all collectible cards + heroes,
 * applying the per-rarity supply caps defined as canon in
 * `docs/RULEBOOK.md:904`:
 *
 *   common 2,000 · rare 1,000 · epic 500 · mythic 250 (per card)
 *
 * No randomization, no global supply target — every card of a given rarity
 * gets exactly the same hard cap. This mirrors what the genesis ceremony
 * will broadcast on-chain (see `docs/GENESIS_RUNBOOK.md:381`).
 *
 * Run with: npx tsx server/seedCardSupply.ts
 *   or via: npm run db:seed
 */

import 'dotenv/config';
import { directDb } from './db';
import { tryAdaptRarity, supplyCap, RARITY, type Rarity } from '../shared/schemas/rarity';

type NftRarity = Rarity;

interface CardData {
	id: number;
	name: string;
	type: string;
	rarity?: string;
	heroClass?: string;
	collectible?: boolean;
}

function mapToNftRarity(card: CardData): NftRarity | null {
	if (card.collectible === false) return null;

	// Heroes always mint at the top tier regardless of declared rarity.
	if ((card.type || '').toLowerCase() === 'hero') return 'mythic';

	const adapted = tryAdaptRarity((card.rarity || 'common').toLowerCase());
	return adapted ?? 'common';
}

async function loadCardRegistry(): Promise<CardData[]> {
	const fs = await import('fs');
	const path = await import('path');

	const registryPath = path.join(process.cwd(), 'client/src/game/data/cardRegistry');
	const allCards: CardData[] = [];

	async function findTsFiles(dir: string): Promise<string[]> {
		const files: string[] = [];
		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				files.push(...await findTsFiles(fullPath));
			} else if (entry.name.endsWith('.ts') && !entry.name.includes('index') && !entry.name.includes('validation')) {
				files.push(fullPath);
			}
		}
		return files;
	}

	function extractCards(content: string): CardData[] {
		const cards: CardData[] = [];
		const cardPattern = /\{\s*id:\s*(\d+),\s*name:\s*['"]([^'"]+)['"]/g;
		let match;

		while ((match = cardPattern.exec(content)) !== null) {
			const cardId = parseInt(match[1], 10);
			const cardName = match[2];

			const startIndex = match.index;
			const endIndex = content.indexOf('},', startIndex) || content.indexOf('}]', startIndex);
			if (endIndex === -1) continue;

			const cardBlock = content.substring(startIndex, endIndex + 1);

			const typeMatch = cardBlock.match(/type:\s*['"]([^'"]+)['"]/);
			const type = typeMatch ? typeMatch[1] : 'minion';

			const rarityMatch = cardBlock.match(/rarity:\s*['"]([^'"]+)['"]/);
			const rarity = rarityMatch ? rarityMatch[1] : 'common';

			const classMatch = cardBlock.match(/class:\s*['"]([^'"]+)['"]/);
			const heroClass = classMatch ? classMatch[1] : 'Neutral';

			const collectibleMatch = cardBlock.match(/collectible:\s*(true|false)/);
			const collectible = collectibleMatch ? collectibleMatch[1] === 'true' : true;

			cards.push({ id: cardId, name: cardName, type, rarity, heroClass, collectible });
		}

		return cards;
	}

	try {
		const tsFiles = await findTsFiles(registryPath);
		console.log(`Found ${tsFiles.length} TypeScript files in card registry`);

		for (const file of tsFiles) {
			try {
				const content = fs.readFileSync(file, 'utf-8');
				const cards = extractCards(content);
				allCards.push(...cards);
			} catch (err) {
				console.error(`Error reading file ${file}:`, err);
			}
		}

		const cardSetsPath = path.join(process.cwd(), 'client/src/game/data/cardSets');
		if (fs.existsSync(cardSetsPath)) {
			const cardSetFiles = await findTsFiles(cardSetsPath);
			console.log(`Found ${cardSetFiles.length} TypeScript files in cardSets`);

			for (const file of cardSetFiles) {
				try {
					const content = fs.readFileSync(file, 'utf-8');
					const cards = extractCards(content);
					allCards.push(...cards);
				} catch (err) {
					console.error(`Error reading file ${file}:`, err);
				}
			}
		}
	} catch (err) {
		console.error('Error loading card registry:', err);
	}

	const uniqueCards = new Map<number, CardData>();
	for (const card of allCards) {
		const id = typeof card.id === 'string' ? parseInt(card.id as any, 10) : card.id;
		if (!isNaN(id) && !uniqueCards.has(id)) {
			uniqueCards.set(id, { ...card, id });
		}
	}

	console.log(`Loaded ${uniqueCards.size} unique cards from registry`);
	return Array.from(uniqueCards.values());
}

async function loadHeroData(): Promise<CardData[]> {
	const fs = await import('fs');
	const path = await import('path');

	const heroesPath = path.join(process.cwd(), 'client/src/game/data/norseHeroes');
	const heroFiles = ['heroDefinitions.ts', 'additionalHeroes.ts', 'japaneseHeroes.ts', 'egyptianHeroes.ts'];
	const heroes: CardData[] = [];
	let heroIdCounter = 50000;

	// Load the class mapping from index.ts
	const indexContent = fs.readFileSync(path.join(heroesPath, 'index.ts'), 'utf-8');
	const classMap = new Map<string, string>();
	const classPattern = /'(hero-[^']+)':\s*'([^']+)'/g;
	let classMatch;
	while ((classMatch = classPattern.exec(indexContent)) !== null) {
		classMap.set(classMatch[1], classMatch[2]);
	}

	for (const file of heroFiles) {
		const filePath = path.join(heroesPath, file);
		if (!fs.existsSync(filePath)) continue;

		const content = fs.readFileSync(filePath, 'utf-8');

		// Match hero entries: 'hero-xxx': { ... name: 'Name' ...
		const heroPattern = /'(hero-[^']+)':\s*\{/g;
		let match;

		while ((match = heroPattern.exec(content)) !== null) {
			const heroId = match[1];
			const blockStart = match.index;

			// Extract a reasonable block after the match (up to 600 chars for name extraction)
			const block = content.substring(blockStart, blockStart + 600);

			const nameMatch = block.match(/name:\s*['"]([^'"]+)['"]/);
			if (!nameMatch) continue;

			const heroName = nameMatch[1];
			const heroClass = classMap.get(heroId) || 'neutral';

			heroes.push({
				id: heroIdCounter++,
				name: heroName,
				type: 'hero',
				rarity: 'mythic',
				heroClass,
				collectible: true,
			});
		}
	}

	console.log(`Loaded ${heroes.length} heroes`);
	return heroes;
}

async function seedCardSupply() {
	if (!directDb) {
		console.error('DATABASE_URL not set — cannot seed. Create a .env file (see .env.example)');
		process.exit(1);
	}

	console.log('Starting card supply seed...');
	const capsByRarity = Object.fromEntries(RARITY.map(r => [r, supplyCap(r)]));
	console.log('Per-card caps:', capsByRarity, '\n');

	const cards = await loadCardRegistry();
	const heroes = await loadHeroData();

	// Merge cards + heroes, dedup by ID
	const allItems = new Map<number, CardData>();
	for (const card of cards) {
		allItems.set(card.id, card);
	}
	for (const hero of heroes) {
		allItems.set(hero.id, hero);
	}

	const itemList = Array.from(allItems.values());
	console.log(`\nTotal unique items: ${itemList.length}`);

	// Count per tier (derived from the canonical RARITY set).
	const cardCounts = Object.fromEntries(RARITY.map(r => [r, 0])) as Record<Rarity, number>;
	const tierAssignments: { card: CardData; nftRarity: NftRarity }[] = [];

	for (const card of itemList) {
		const nftRarity = mapToNftRarity(card);
		if (!nftRarity) continue;
		cardCounts[nftRarity]++;
		tierAssignments.push({ card, nftRarity });
	}

	console.log('\nCards per tier:');
	for (const [tier, count] of Object.entries(cardCounts)) {
		console.log(`  ${tier}: ${count}`);
	}

	// Build insert batch — each card gets the canonical fixed cap for its
	// rarity (RULEBOOK.md:904). No randomization.
	const stats = {
		total: 0,
		totalSupply: 0,
		byRarity: {} as Record<string, { count: number; supply: number }>,
		skipped: itemList.length - tierAssignments.length,
	};

	const insertBatch: any[] = [];

	for (const { card, nftRarity } of tierAssignments) {
		const supply = supplyCap(nftRarity);

		insertBatch.push({
			cardId: card.id,
			cardName: card.name,
			nftRarity,
			maxSupply: supply,
			remainingSupply: supply,
			cardType: card.type || 'minion',
			heroClass: (card.heroClass || 'neutral').toLowerCase(),
		});

		stats.total++;
		stats.totalSupply += supply;
		if (!stats.byRarity[nftRarity]) stats.byRarity[nftRarity] = { count: 0, supply: 0 };
		stats.byRarity[nftRarity].count++;
		stats.byRarity[nftRarity].supply += supply;
	}

	// Clear and insert
	try {
		await directDb.query('DELETE FROM card_supply');
		console.log('\nCleared existing card_supply data');
	} catch (err) {
		console.error('Error clearing card_supply:', err);
	}

	const batchSize = 50;
	for (let i = 0; i < insertBatch.length; i += batchSize) {
		const batch = insertBatch.slice(i, i + batchSize);
		try {
			const values: any[] = [];
			const valuePlaceholders: string[] = [];
			let paramIndex = 1;

			for (const item of batch) {
				valuePlaceholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`);
				values.push(
					item.cardId,
					item.cardName,
					item.nftRarity,
					item.maxSupply,
					item.remainingSupply,
					item.cardType,
					item.heroClass
				);
				paramIndex += 7;
			}

			const query = `
				INSERT INTO card_supply (card_id, card_name, nft_rarity, max_supply, remaining_supply, card_type, hero_class)
				VALUES ${valuePlaceholders.join(', ')}
				ON CONFLICT (card_id) DO UPDATE SET
					card_name = EXCLUDED.card_name,
					nft_rarity = EXCLUDED.nft_rarity,
					max_supply = EXCLUDED.max_supply,
					remaining_supply = EXCLUDED.remaining_supply,
					card_type = EXCLUDED.card_type,
					hero_class = EXCLUDED.hero_class
			`;

			await directDb.query(query, values);
			process.stdout.write(`\rInserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(insertBatch.length / batchSize)}`);
		} catch (err: any) {
			console.error('\nError inserting batch:', err.message);
		}
	}

	console.log('\n\n=== Seed Complete ===');
	console.log(`Total unique items: ${stats.total}`);
	console.log(`Skipped (tokens): ${stats.skipped}`);
	console.log(`Total supply: ${stats.totalSupply.toLocaleString()}`);
	console.log('\nBy NFT Rarity:');
	for (const [rarity, data] of Object.entries(stats.byRarity)) {
		const pct = (data.supply / stats.totalSupply * 100).toFixed(1);
		console.log(`  ${rarity}: ${data.count} cards × ${supplyCap(rarity as Rarity)} = ${data.supply.toLocaleString()} supply (${pct}%)`);
	}

	await directDb.end();
	process.exit(0);
}

seedCardSupply().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
