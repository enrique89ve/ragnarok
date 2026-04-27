#!/usr/bin/env npx tsx
/**
 * Generate Collection Manifests
 *
 * Reads `client/src/game/data/cardRegistry` (the runtime source of truth
 * for combat) and produces two JSON manifests:
 *
 *   client/public/data/genesisCollection.json   (NFT manifest, set=genesis)
 *   client/public/data/starterCollection.json   (starter pool, set=starter)
 *
 * Both files are validated against `shared/schemas/collections.ts` before
 * being written. The generator is purely functional: every step is a small
 * pure function, no classes, no shared mutable state. The only side effect
 * is the final write at the end of `main`.
 *
 * Run:  npm run gen:collections
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	GenesisCollectionSchema,
	StarterCollectionSchema,
	type GenesisCard,
	type GenesisCollection,
	type StarterCard,
	type StarterCollection,
} from '../shared/schemas/collections';
import {
	RARITY,
	RARITY_TABLE,
	tryAdaptRarity,
	supplyCap,
	type Rarity,
} from '../shared/schemas/rarity';
import { type CardCategory } from '../shared/schemas/cardCategory';
import { cardRegistry } from '../client/src/game/data/cardRegistry';
import { ART_REGISTRY } from '../client/src/game/utils/art/artMapping';

// ── Constants ──────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'client', 'public', 'data');
const GENESIS_OUT = path.join(OUTPUT_DIR, 'genesisCollection.json');
const STARTER_OUT = path.join(OUTPUT_DIR, 'starterCollection.json');

const MANIFEST_VERSION = '1.0.0';

const ASSET_ID_RE = /\/art\/nfts\/([^/]+)\.webp$/;

// ── Domain types (raw card from registry) ──────────────────────────────────

type RawCard = {
	readonly id: number | string;
	readonly name: string;
	readonly type: string;
	readonly rarity?: string;
	// The registry mixes `heroClass` (CardData-typed sets) and `class` (base
	// cards / hero definitions typed as `any[]`). Accept either at the
	// boundary; normalize downstream.
	readonly heroClass?: string;
	readonly class?: string;
	readonly manaCost?: number;
	readonly attack?: number;
	readonly health?: number;
	readonly race?: string;
	// `category` is stamped by `validateCardRegistry`; cards exiting the
	// registry boundary always carry it. We use it as the canonical
	// discriminator instead of combining `set` + `collectible` ourselves.
	readonly category: CardCategory;
};

// ── Pure helpers ───────────────────────────────────────────────────────────

const extractAssetId = (artPath: string | undefined): string | null => {
	if (!artPath) return null;
	const match = ASSET_ID_RE.exec(artPath);
	return match ? match[1] : null;
};

const lookupAssetId = (cardId: number | string): string | null => {
	const key = String(cardId);
	return extractAssetId(ART_REGISTRY[key]);
};

const normalizeRarity = (input: string | undefined): Rarity => {
	const adapted = tryAdaptRarity((input ?? 'common').toLowerCase());
	return adapted ?? 'common';
};

const normalizeHeroClass = (raw: RawCard): string =>
	(raw.heroClass ?? raw.class ?? 'neutral').toLowerCase();

const intOrZero = (v: number | undefined): number =>
	typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

// ── Mappers (RawCard → manifest shape) ────────────────────────────────────

const toGenesisCard = (c: RawCard): GenesisCard => {
	const rarity = normalizeRarity(c.rarity);
	return {
		id: c.id,
		name: c.name,
		type: c.type as GenesisCard['type'],
		rarity,
		heroClass: normalizeHeroClass(c),
		manaCost: intOrZero(c.manaCost),
		attack: intOrZero(c.attack),
		health: intOrZero(c.health),
		race: c.race ?? null,
		supplyCap: supplyCap(rarity),
		assetId: lookupAssetId(c.id),
	};
};

const toStarterCard = (c: RawCard): StarterCard => ({
	id: c.id,
	name: c.name,
	type: c.type as StarterCard['type'],
	rarity: normalizeRarity(c.rarity),
	heroClass: normalizeHeroClass(c),
	manaCost: intOrZero(c.manaCost),
	attack: intOrZero(c.attack),
	health: intOrZero(c.health),
	race: c.race ?? null,
	assetId: lookupAssetId(c.id),
});

// ── Aggregators ────────────────────────────────────────────────────────────

const countByRarity = (cards: ReadonlyArray<{ rarity: Rarity }>): Record<Rarity, number> => {
	const init = Object.fromEntries(RARITY.map(r => [r, 0])) as Record<Rarity, number>;
	for (const c of cards) init[c.rarity] += 1;
	return init;
};

const countByClass = (cards: ReadonlyArray<{ heroClass: string }>): Record<string, number> => {
	const out: Record<string, number> = {};
	for (const c of cards) out[c.heroClass] = (out[c.heroClass] ?? 0) + 1;
	return out;
};

const sortById = <T extends { id: number | string }>(cards: ReadonlyArray<T>): T[] =>
	[...cards].sort((a, b) => {
		const ka = typeof a.id === 'number' ? a.id : Number.MAX_SAFE_INTEGER;
		const kb = typeof b.id === 'number' ? b.id : Number.MAX_SAFE_INTEGER;
		if (ka !== kb) return ka - kb;
		return String(a.id).localeCompare(String(b.id));
	});

// ── Builders ───────────────────────────────────────────────────────────────

const buildGenesis = (cards: ReadonlyArray<GenesisCard>): GenesisCollection => {
	const sorted = sortById(cards);
	const byRarity = countByRarity(sorted);
	const totalNFTs = (Object.entries(byRarity) as [Rarity, number][])
		.reduce((sum, [r, n]) => sum + n * supplyCap(r), 0);
	return {
		version: MANIFEST_VERSION,
		collection: 'Genesis',
		rarityTable: RARITY_TABLE,
		cards: sorted,
		totals: {
			byRarity,
			totalCards: sorted.length,
			totalNFTs,
		},
	};
};

const buildStarter = (cards: ReadonlyArray<StarterCard>): StarterCollection => {
	const sorted = sortById(cards);
	return {
		version: MANIFEST_VERSION,
		collection: 'Starter',
		cards: sorted,
		totals: {
			byClass: countByClass(sorted),
			totalCards: sorted.length,
		},
	};
};

// ── Boundary I/O ───────────────────────────────────────────────────────────

const ensureDir = (dir: string): void => {
	fs.mkdirSync(dir, { recursive: true });
};

const writeJson = (filePath: string, data: unknown): void => {
	const json = JSON.stringify(data, null, 2) + '\n';
	fs.writeFileSync(filePath, json, 'utf8');
};

// ── Orchestration ──────────────────────────────────────────────────────────

type Partitioned = {
	readonly genesis: ReadonlyArray<RawCard>;
	readonly starter: ReadonlyArray<RawCard>;
	readonly tokens: ReadonlyArray<RawCard>;
};

/**
 * Bucket cards by their stamped `category`. The exhaustive switch ensures
 * adding a new category to `CARD_CATEGORY_TABLE` triggers a compile error
 * here until we decide how the new bucket is exported (or skipped).
 */
const partition = (cards: ReadonlyArray<RawCard>): Partitioned => {
	const genesis: RawCard[] = [];
	const starter: RawCard[] = [];
	const tokens: RawCard[] = [];
	for (const c of cards) {
		switch (c.category) {
			case 'genesis': genesis.push(c); break;
			case 'starter': starter.push(c); break;
			case 'token':   tokens.push(c);  break;
		}
	}
	return { genesis, starter, tokens };
};

const main = (): void => {
	const raw = cardRegistry as ReadonlyArray<RawCard>;
	if (!Array.isArray(raw) || raw.length === 0) {
		throw new Error('cardRegistry is empty or not an array');
	}

	const { genesis, starter, tokens } = partition(raw);

	const genesisCards = genesis.map(toGenesisCard);
	const starterCards = starter.map(toStarterCard);

	const genesisManifest = buildGenesis(genesisCards);
	const starterManifest = buildStarter(starterCards);

	const failOnInvalid = (label: string, error: unknown): never => {
		const err = new Error(`${label} failed schema validation`);
		(err as Error & { cause?: unknown }).cause = error;
		throw err;
	};

	const genesisParsed = GenesisCollectionSchema.safeParse(genesisManifest);
	if (!genesisParsed.success) failOnInvalid('Genesis manifest', genesisParsed.error);

	const starterParsed = StarterCollectionSchema.safeParse(starterManifest);
	if (!starterParsed.success) failOnInvalid('Starter manifest', starterParsed.error);

	ensureDir(OUTPUT_DIR);
	writeJson(GENESIS_OUT, genesisParsed.data);
	writeJson(STARTER_OUT, starterParsed.data);

	console.log('Collection manifests written:');
	console.log(`  ${path.relative(REPO_ROOT, GENESIS_OUT)}`);
	console.log(`     ${genesisManifest.totals.totalCards} cards · ${genesisManifest.totals.totalNFTs.toLocaleString()} NFTs total`);
	console.log(`     by rarity: ${JSON.stringify(genesisManifest.totals.byRarity)}`);
	console.log(`  ${path.relative(REPO_ROOT, STARTER_OUT)}`);
	console.log(`     ${starterManifest.totals.totalCards} cards · ${Object.keys(starterManifest.totals.byClass).length} classes`);
	console.log(`  excluded tokens: ${tokens.length}`);
};

main();
