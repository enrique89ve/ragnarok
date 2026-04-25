/**
 * Art metadata Zod schema — runtime validation for /art/nfts/metadata.json.
 *
 * The metadata file is the canonical NFT-art catalog (see docs/NFT_ART_PROTOCOL.md).
 * This schema validates its structure at load time so structural drift fails fast
 * with a clear error instead of mysterious downstream render failures.
 *
 * Constraints enforced:
 *   - id    : matches the canonical asset-id regex (4 hex + dash + 8 alnum)
 *   - _localPath: points under /art/nfts/ with .webp extension
 *
 * Constraints NOT enforced (legacy tolerance — see also docs/NFT_ART_PROTOCOL.md):
 *   - `id` does not need to equal the filename in `_localPath`. Four catalog entries
 *     deliberately reuse a sibling's file (gefjon, jormungandr, nott aliases) and
 *     one (lunarhowler) has a renamed file. Future entries should follow the
 *     `id === filename` convention but the validator does not block legacy violations.
 */
import { z } from 'zod';
import { ASSET_ID_PATTERN } from '../../data/schemas/primitives/ids';

const LOCAL_PATH_PATTERN = /^\/art\/nfts\/[0-9a-z-]+\.webp$/i;

export const ArtCardStatsSchema = z.object({
	health: z.number().nullable(),
	stamina: z.number().nullable(),
	attack: z.number().nullable(),
	speed: z.number().nullable(),
	mana: z.number().nullable(),
	weight: z.number().nullable(),
});

export const StyleDNASchema = z.object({
	palette: z.array(z.string()).optional(),
	composition: z.enum(['hero', 'creature', 'artifact', 'landscape']).optional(),
	scale: z.number().optional(),
});

export const ArtCardSchema = z.object({
	id: z.string().regex(ASSET_ID_PATTERN, 'invalid asset id format'),
	character: z.string().min(1),
	name: z.string().min(1),
	category: z.string().nullable(),
	description: z.string().nullable(),
	lore: z.string().nullable(),
	element: z.string().nullable(),
	piece: z.string().nullable(),
	faction: z.string().nullable(),
	rarity: z.string().nullable(),
	collection: z.string().optional(),
	mainArt: z.boolean(),
	styleDNA: StyleDNASchema.optional(),
	stats: ArtCardStatsSchema,
	wiki: z.string().nullable(),
	_localPath: z.string().regex(LOCAL_PATH_PATTERN, 'invalid local path'),
});

export const ArtMetadataSchema = z.object({
	version: z.string(),
	source: z.string(),
	totalCards: z.number().int().nonnegative(),
	totalCharacters: z.number().int().nonnegative(),
	cards: z.array(ArtCardSchema),
});

export type ArtCardValidated = z.infer<typeof ArtCardSchema>;
export type ArtMetadataValidated = z.infer<typeof ArtMetadataSchema>;
