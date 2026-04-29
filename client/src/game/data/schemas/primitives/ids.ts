/**
 * Branded id primitives — re-exported from the shared package.
 *
 * The canon lives under `shared/schemas/ids.ts` so that both client and server
 * consume the same definitions. This file exists only to preserve the
 * existing `client/src/game/data/schemas/primitives` import surface; new code
 * should prefer `@shared/schemas/ids` directly.
 */
export {
	CardIdSchema,
	cardId,
	tryCardId,
	ASSET_ID_PATTERN,
	AssetIdSchema,
	assetId,
	tryAssetId,
	assetPathFor,
} from '@shared/schemas/ids';
export type { CardId, AssetId } from '@shared/schemas/ids';
