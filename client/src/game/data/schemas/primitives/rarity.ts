/**
 * Rarity canon — re-exported from the shared package.
 *
 * The canon lives under `shared/schemas/rarity.ts` so that both client and
 * server consume the same definition. This file exists only to preserve the
 * existing import surface (`client/src/game/data/schemas/primitives`).
 */
export {
	RARITY,
	RaritySchema,
	RARITY_ORDER,
	isAtLeast,
	adaptRarity,
	tryAdaptRarity,
} from '@shared/schemas/rarity';
export type { Rarity } from '@shared/schemas/rarity';
