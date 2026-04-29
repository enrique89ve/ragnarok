/**
 * Collection manifests — Zod schemas for the two JSON files generated from
 * `cardRegistry`.
 *
 * The TS card registry (with effect functions) is the runtime source of
 * truth for combat. These manifests are its serialized projection: pure data
 * that can be hashed, published, audited and consumed off-chain (NFT mint
 * payload, public collection viewer, server lookup, etc).
 *
 * Two files, two shapes:
 *   - `genesisCollection.json` — `set: 'genesis'`, `collectible: true`,
 *     finite supply per rarity. The genesis ceremony commits to the hash
 *     of this file on Hive L1.
 *   - `starterCollection.json`  — `set: 'starter'`, infinite supply, never
 *     on-chain. Fixed universal entitlement materialized locally for every
 *     player via `StarterPackCeremony`.
 *
 * Tokens (`collectible: false`) are excluded from both: per `RULEBOOK.md`
 * they are not NFTs and have no supply.
 */
import { z } from 'zod';
import { RARITY, RARITY_TABLE, type Rarity } from './rarity';

// ── Shared primitives ─────────────────────────────────────────────────────

const RaritySchema = z.enum(RARITY as readonly [Rarity, ...Rarity[]]);

const CardTypeSchema = z.enum([
	'minion',
	'spell',
	'weapon',
	'hero',
	'secret',
	'location',
	'poker_spell',
	'artifact',
	'armor',
] as const);

const NonNegativeInt = z.number().int().nonnegative();
const PositiveInt = z.number().int().positive();

// ── Genesis collection (NFT manifest) ─────────────────────────────────────

const GenesisCardSchema = z.object({
	id: z.union([z.number().int(), z.string().min(1)]),
	name: z.string().min(1),
	type: CardTypeSchema,
	rarity: RaritySchema,
	heroClass: z.string().min(1),
	manaCost: NonNegativeInt,
	attack: NonNegativeInt,
	health: NonNegativeInt,
	race: z.string().nullable(),
	supplyCap: PositiveInt,
	assetId: z.string().nullable(),
}).strict();

export type GenesisCard = z.infer<typeof GenesisCardSchema>;

const RarityMetaSchema = z.object({
	order: NonNegativeInt,
	supplyCap: PositiveInt,
	deckLimit: PositiveInt,
	eitrForge: NonNegativeInt,
	eitrDissolve: NonNegativeInt,
}).strict();

export const GenesisCollectionSchema = z.object({
	version: z.string().min(1),
	collection: z.literal('Genesis'),
	rarityTable: z.record(RaritySchema, RarityMetaSchema),
	cards: z.array(GenesisCardSchema).min(1),
	totals: z.object({
		byRarity: z.record(RaritySchema, NonNegativeInt),
		totalCards: NonNegativeInt,
		totalNFTs: NonNegativeInt,
	}).strict(),
}).strict();

export type GenesisCollection = z.infer<typeof GenesisCollectionSchema>;

// ── Starter collection (off-chain, infinite supply) ───────────────────────

const StarterCardSchema = z.object({
	id: z.union([z.number().int(), z.string().min(1)]),
	name: z.string().min(1),
	type: CardTypeSchema,
	rarity: RaritySchema,
	heroClass: z.string().min(1),
	manaCost: NonNegativeInt,
	attack: NonNegativeInt,
	health: NonNegativeInt,
	race: z.string().nullable(),
	assetId: z.string().nullable(),
}).strict();

export type StarterCard = z.infer<typeof StarterCardSchema>;

export const StarterCollectionSchema = z.object({
	version: z.string().min(1),
	collection: z.literal('Starter'),
	cards: z.array(StarterCardSchema).min(1),
	totals: z.object({
		byClass: z.record(z.string(), NonNegativeInt),
		totalCards: NonNegativeInt,
	}).strict(),
}).strict();

export type StarterCollection = z.infer<typeof StarterCollectionSchema>;

// ── Helpers exposed for the generator + tests ─────────────────────────────

export const CURRENT_RARITY_TABLE = RARITY_TABLE;
