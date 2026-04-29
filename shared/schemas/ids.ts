/**
 * Branded identifier primitives — canonical source.
 *
 * `CardId` and `AssetId` are nominally distinct from raw `number`/`string`.
 * Construction must go through the smart constructors, which validate at
 * runtime. Once branded, values flow through the type system without
 * re-validation.
 *
 * This file is the canon for both client and server. The
 * `client/src/game/data/schemas/primitives/ids.ts` module exists only as a
 * thin re-export to preserve the existing import surface; consumers should
 * prefer `@shared/schemas/ids` directly.
 */
import { z } from 'zod';

// ── Card identifiers (gameplay engine) ─────────────────────────────────────
//
// Card IDs are integers. Reserved ranges live in
// client/src/game/data/cardRegistry/ID_RANGES.md.
// The bounds below are intentionally permissive — we trust the registry,
// not the type.

const CARD_ID_MIN = 100 as const;
const CARD_ID_MAX = 99_999 as const;

export const CardIdSchema = z
	.number()
	.int()
	.min(CARD_ID_MIN)
	.max(CARD_ID_MAX)
	.brand<'CardId'>();

export type CardId = z.infer<typeof CardIdSchema>;

export const cardId = (n: number): CardId => CardIdSchema.parse(n);
export const tryCardId = (n: number): CardId | null => {
	const r = CardIdSchema.safeParse(n);
	return r.success ? r.data : null;
};

// ── Asset identifiers (visual / NFT layer) ─────────────────────────────────
//
// Asset IDs follow the canonical filename pattern: 4 hex + dash + 8 alnum.
// Examples: "150b-2gudiaxw", "0dc0-t8g7ugzd".
// Source: client/src/game/utils/art/artMapping.ts (existing canon).

export const ASSET_ID_PATTERN = /^[0-9a-f]{4}-[0-9a-z]{8}$/;

export const AssetIdSchema = z
	.string()
	.regex(ASSET_ID_PATTERN)
	.brand<'AssetId'>();

export type AssetId = z.infer<typeof AssetIdSchema>;

export const assetId = (s: string): AssetId => AssetIdSchema.parse(s);
export const tryAssetId = (s: string): AssetId | null => {
	const r = AssetIdSchema.safeParse(s);
	return r.success ? r.data : null;
};

// ── Path resolution (single canonical projection) ──────────────────────────
//
// Every entry in the art registry projects to `${ASSET_DIR}/${id}${ASSET_EXT}`.
// Keep this in sync with the on-disk layout under `client/public/art/nfts/`.

const ASSET_DIR = '/art/nfts';
const ASSET_EXT = '.webp';

export const assetPathFor = (id: AssetId): string => `${ASSET_DIR}/${id}${ASSET_EXT}`;
