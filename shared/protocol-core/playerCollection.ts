import { z } from 'zod';
import { CardIdSchema, type CardId } from '../schemas/ids';
import {
	STARTER_ENTITLEMENT,
	isStarterEntitlementCardId,
} from '../schemas/starterEntitlement';

export type StarterCardId = CardId & z.BRAND<'StarterCardId'>;
export type NftUid = string & z.BRAND<'NftUid'>;
export type DeckSlotIndex = number & z.BRAND<'DeckSlotIndex'>;
export type ProtocolAuthority = 'starter-entitlement' | 'nft-custody';

export const StarterCardIdSchema = CardIdSchema
	.refine(isStarterEntitlementCardId, 'cardId is not in STARTER_ENTITLEMENT')
	.brand<'StarterCardId'>();

export const NftUidSchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.brand<'NftUid'>();

export const DeckSlotIndexSchema = z
	.number()
	.int()
	.nonnegative()
	.brand<'DeckSlotIndex'>();

export const ProtocolAuthoritySchema = z.union([
	z.literal('starter-entitlement'),
	z.literal('nft-custody'),
]);

export type PlayerCollectionEntry =
	| {
		readonly authority: 'starter-entitlement';
		readonly cardId: StarterCardId;
		readonly ownedCopies: number;
		readonly transferable: false;
		readonly earnsCardXp: false;
	}
	| {
		readonly authority: 'nft-custody';
		readonly nftUid: NftUid;
		readonly cardId: CardId;
		readonly xp: number;
		readonly level: number;
		readonly transferable: true;
		readonly earnsCardXp: true;
	};

export type NftCustodyCard = {
	readonly nftUid: string;
	readonly cardId: number;
	readonly owner?: string;
	readonly xp: number;
	readonly level: number;
};

export const StarterPlayerCollectionEntrySchema = z.object({
	authority: z.literal('starter-entitlement'),
	cardId: StarterCardIdSchema,
	ownedCopies: z.number().int().nonnegative(),
	transferable: z.literal(false),
	earnsCardXp: z.literal(false),
}).strict();

export const NftPlayerCollectionEntrySchema = z.object({
	authority: z.literal('nft-custody'),
	nftUid: NftUidSchema,
	cardId: CardIdSchema,
	xp: z.number().int().nonnegative(),
	level: z.number().int().nonnegative(),
	transferable: z.literal(true),
	earnsCardXp: z.literal(true),
}).strict();

export const PlayerCollectionEntrySchema = z.discriminatedUnion('authority', [
	StarterPlayerCollectionEntrySchema,
	NftPlayerCollectionEntrySchema,
]);

export const NftCustodyCardSchema = z.object({
	nftUid: NftUidSchema,
	cardId: CardIdSchema,
	owner: z.string().min(1).optional(),
	xp: z.number().int().nonnegative(),
	level: z.number().int().nonnegative(),
}).strict();

export function buildStarterCollectionEntries(): readonly PlayerCollectionEntry[] {
	return STARTER_ENTITLEMENT.cardIds.map(rawCardId => {
		const cardId = StarterCardIdSchema.parse(rawCardId);
		return {
			authority: 'starter-entitlement',
			cardId,
			ownedCopies: STARTER_ENTITLEMENT.copiesPerCardId[rawCardId] ?? 0,
			transferable: false,
			earnsCardXp: false,
		};
	});
}

export function buildPlayerCollection(input: {
	readonly nftCards?: readonly NftCustodyCard[];
} = {}): readonly PlayerCollectionEntry[] {
	const nftEntries = (input.nftCards ?? []).map(card => {
		const parsed = NftCustodyCardSchema.parse(card);
		return {
			authority: 'nft-custody',
			nftUid: parsed.nftUid,
			cardId: parsed.cardId,
			xp: parsed.xp,
			level: parsed.level,
			transferable: true,
			earnsCardXp: true,
		} satisfies PlayerCollectionEntry;
	});
	return [...buildStarterCollectionEntries(), ...nftEntries];
}
