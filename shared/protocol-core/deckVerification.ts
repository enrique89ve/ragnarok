import { z } from 'zod';
import { CardIdSchema, type CardId } from '../schemas/ids';
import {
	DeckSlotIndexSchema,
	NftUidSchema,
	StarterCardIdSchema,
	type DeckSlotIndex,
	type NftUid,
	type PlayerCollectionEntry,
	type ProtocolAuthority,
	type StarterCardId,
} from './playerCollection';

export const DeckRejectionCodeSchema = z.union([
	z.literal('invalid-claim'),
	z.literal('invalid-starter'),
	z.literal('copy-limit-exceeded'),
	z.literal('unknown-nft'),
	z.literal('not-owner'),
	z.literal('duplicate-nft-uid'),
	z.literal('claim-card-id-mismatch'),
]);

export type DeckRejectionCode = z.infer<typeof DeckRejectionCodeSchema>;

export type DeckCardClaim =
	| {
		readonly authority: 'starter-entitlement';
		readonly cardId: StarterCardId;
	}
	| {
		readonly authority: 'nft-custody';
		readonly nftUid: NftUid;
		readonly cardId: CardId;
	};

export type VerifiedDeckCard =
	| {
		readonly slotIndex: DeckSlotIndex;
		readonly authority: 'starter-entitlement';
		readonly cardId: StarterCardId;
		readonly transferable: false;
		readonly earnsCardXp: false;
	}
	| {
		readonly slotIndex: DeckSlotIndex;
		readonly authority: 'nft-custody';
		readonly nftUid: NftUid;
		readonly cardId: CardId;
		readonly xp: number;
		readonly level: number;
		readonly transferable: true;
		readonly earnsCardXp: true;
	};

export type DeckRejection = {
	readonly slotIndex: DeckSlotIndex;
	readonly code: DeckRejectionCode;
	readonly authority?: ProtocolAuthority;
	readonly cardId?: CardId;
	readonly nftUid?: NftUid;
	readonly detail: string;
};

export type DeckVerificationDecision =
	| {
		readonly status: 'verified';
		readonly cards: readonly VerifiedDeckCard[];
	}
	| {
		readonly status: 'rejected';
		readonly cards: readonly VerifiedDeckCard[];
		readonly rejections: readonly DeckRejection[];
	};

export type DeckClaimParseResult =
	| {
		readonly status: 'parsed';
		readonly claims: readonly DeckCardClaim[];
	}
	| {
		readonly status: 'rejected';
		readonly claims: readonly DeckCardClaim[];
		readonly rejections: readonly DeckRejection[];
	};

export type LegacyCardRefLike = {
	readonly nft_id?: string;
	readonly nftUid?: string;
	readonly instanceId?: string;
	readonly cardId?: number;
	readonly category?: string;
};

export const StarterDeckCardClaimSchema = z.object({
	authority: z.literal('starter-entitlement'),
	cardId: StarterCardIdSchema,
}).strict();

export const NftDeckCardClaimSchema = z.object({
	authority: z.literal('nft-custody'),
	nftUid: NftUidSchema,
	cardId: CardIdSchema,
}).strict();

export const DeckCardClaimSchema = z.union([
	StarterDeckCardClaimSchema,
	NftDeckCardClaimSchema,
]);

export const DeckCardClaimsSchema = z.array(DeckCardClaimSchema).min(1).max(100);

export const StarterVerifiedDeckCardSchema = z.object({
	slotIndex: DeckSlotIndexSchema,
	authority: z.literal('starter-entitlement'),
	cardId: StarterCardIdSchema,
	transferable: z.literal(false),
	earnsCardXp: z.literal(false),
}).strict();

export const NftVerifiedDeckCardSchema = z.object({
	slotIndex: DeckSlotIndexSchema,
	authority: z.literal('nft-custody'),
	nftUid: NftUidSchema,
	cardId: CardIdSchema,
	xp: z.number().int().nonnegative(),
	level: z.number().int().nonnegative(),
	transferable: z.literal(true),
	earnsCardXp: z.literal(true),
}).strict();

export const VerifiedDeckCardSchema = z.discriminatedUnion('authority', [
	StarterVerifiedDeckCardSchema,
	NftVerifiedDeckCardSchema,
]);

function deckSlotIndex(index: number): DeckSlotIndex {
	return DeckSlotIndexSchema.parse(index);
}

function rejection(input: {
	readonly slotIndex: DeckSlotIndex;
	readonly code: DeckRejectionCode;
	readonly detail: string;
	readonly authority?: ProtocolAuthority;
	readonly cardId?: CardId;
	readonly nftUid?: NftUid;
}): DeckRejection {
	return input;
}

function zodIssueDetail(error: z.ZodError): string {
	const firstIssue = error.issues[0];
	return firstIssue?.message ?? 'invalid claim';
}

export function toDeckClaimsFromLegacyCardIds(
	cardIds: readonly number[],
): DeckClaimParseResult {
	const claims: DeckCardClaim[] = [];
	const rejections: DeckRejection[] = [];

	for (const [index, rawCardId] of cardIds.entries()) {
		const slotIndex = deckSlotIndex(index);
		const parsed = StarterCardIdSchema.safeParse(rawCardId);
		if (parsed.success) {
			claims.push({ authority: 'starter-entitlement', cardId: parsed.data });
			continue;
		}

		const cardId = CardIdSchema.safeParse(rawCardId);
		rejections.push(rejection({
			slotIndex,
			code: 'invalid-claim',
			detail: 'legacy cardIds can only express starter entitlement claims; genesis cards require nftUid',
			...(cardId.success ? { cardId: cardId.data } : {}),
		}));
	}

	if (rejections.length === 0) return { status: 'parsed', claims };
	return { status: 'rejected', claims, rejections };
}

type NftPlayerCollectionEntry = Extract<PlayerCollectionEntry, { authority: 'nft-custody' }>;

function nftEntriesByCardId(
	collection: readonly PlayerCollectionEntry[],
): ReadonlyMap<number, readonly NftPlayerCollectionEntry[]> {
	const entriesByCardId = new Map<number, NftPlayerCollectionEntry[]>();
	for (const entry of collection) {
		if (entry.authority !== 'nft-custody') continue;
		const entries = entriesByCardId.get(entry.cardId) ?? [];
		entries.push(entry);
		entriesByCardId.set(entry.cardId, entries);
	}
	return entriesByCardId;
}

export function buildDeckClaimsFromCardIds(input: {
	readonly cardIds: readonly number[];
	readonly collection: readonly PlayerCollectionEntry[];
}): DeckClaimParseResult {
	const starterLookup = starterEntriesByCardId(input.collection);
	const nftLookup = nftEntriesByCardId(input.collection);

	const starterUseCounts = new Map<number, number>();
	const usedNftUids = new Set<string>();
	const claims: DeckCardClaim[] = [];
	const rejections: DeckRejection[] = [];

	for (const [index, rawCardId] of input.cardIds.entries()) {
		const slotIndex = deckSlotIndex(index);
		const cardId = CardIdSchema.safeParse(rawCardId);
		if (!cardId.success) {
			rejections.push(rejection({
				slotIndex,
				code: 'invalid-claim',
				detail: 'selected card id is invalid',
			}));
			continue;
		}

		const starterCardId = StarterCardIdSchema.safeParse(rawCardId);
		if (starterCardId.success) {
			const entry = starterLookup.get(starterCardId.data);
			const nextCount = (starterUseCounts.get(starterCardId.data) ?? 0) + 1;
			if (entry && nextCount <= entry.ownedCopies) {
				starterUseCounts.set(starterCardId.data, nextCount);
				claims.push({
					authority: 'starter-entitlement',
					cardId: starterCardId.data,
				});
				continue;
			}
		}

		const nftEntry = (nftLookup.get(cardId.data) ?? [])
			.find(entry => !usedNftUids.has(entry.nftUid));
		if (nftEntry) {
			usedNftUids.add(nftEntry.nftUid);
			claims.push({
				authority: 'nft-custody',
				nftUid: nftEntry.nftUid,
				cardId: nftEntry.cardId,
			});
			continue;
		}

		rejections.push(rejection({
			slotIndex,
			code: starterCardId.success ? 'copy-limit-exceeded' : 'not-owner',
			detail: starterCardId.success
				? 'starter card copy limit exceeded and no NFT copy is available'
				: 'selected card requires NFT custody evidence',
			cardId: cardId.data,
			...(starterCardId.success ? { authority: 'starter-entitlement' as const } : {}),
		}));
	}

	if (rejections.length === 0) return { status: 'parsed', claims };
	return { status: 'rejected', claims, rejections };
}

export function toDeckClaimsFromLegacyCardRefs(
	refs: readonly LegacyCardRefLike[],
): DeckClaimParseResult {
	const claims: DeckCardClaim[] = [];
	const rejections: DeckRejection[] = [];

	for (const [index, ref] of refs.entries()) {
		const slotIndex = deckSlotIndex(index);
		const rawNftUid = ref.nft_id ?? ref.nftUid ?? ref.instanceId;
		if (rawNftUid !== undefined) {
			const nftUid = NftUidSchema.safeParse(rawNftUid);
			const cardId = ref.cardId === undefined
				? undefined
				: CardIdSchema.safeParse(ref.cardId);

			if (!nftUid.success) {
				rejections.push(rejection({
					slotIndex,
					code: 'unknown-nft',
					detail: 'legacy NFT ref has invalid nft uid',
					authority: 'nft-custody',
				}));
				continue;
			}

			if (cardId === undefined) {
				rejections.push(rejection({
					slotIndex,
					code: 'invalid-claim',
					detail: 'legacy NFT ref requires cardId',
					authority: 'nft-custody',
					nftUid: nftUid.data,
				}));
				continue;
			}

			if (!cardId.success) {
				rejections.push(rejection({
					slotIndex,
					code: 'invalid-claim',
					detail: 'legacy NFT ref has invalid cardId',
					authority: 'nft-custody',
					nftUid: nftUid.data,
				}));
				continue;
			}

			claims.push({
				authority: 'nft-custody',
				nftUid: nftUid.data,
				cardId: cardId.data,
			});
			continue;
		}

		const starterCardId = StarterCardIdSchema.safeParse(ref.cardId);
		if (ref.category === 'starter' && starterCardId.success) {
			claims.push({ authority: 'starter-entitlement', cardId: starterCardId.data });
			continue;
		}

		const cardId = CardIdSchema.safeParse(ref.cardId);
		rejections.push(rejection({
			slotIndex,
			code: ref.category === 'starter' ? 'invalid-starter' : 'invalid-claim',
			detail: 'legacy ref cannot prove playable ownership without starter entitlement or nft uid',
			...(cardId.success ? { cardId: cardId.data } : {}),
		}));
	}

	return rejections.length === 0
		? { status: 'parsed', claims }
		: { status: 'rejected', claims, rejections };
}

export function parseDeckCardClaims(value: unknown): DeckClaimParseResult {
	const rawClaims = Array.isArray(value) ? value : [];
	const claims: DeckCardClaim[] = [];
	const rejections: DeckRejection[] = [];

	if (!Array.isArray(value)) {
		return {
			status: 'rejected',
			claims,
			rejections: [
				rejection({
					slotIndex: deckSlotIndex(0),
					code: 'invalid-claim',
					detail: 'deck claims must be an array',
				}),
			],
		};
	}

	const parsedArray = DeckCardClaimsSchema.safeParse(value);
	if (parsedArray.success) return { status: 'parsed', claims: parsedArray.data };

	for (const [index, rawClaim] of rawClaims.entries()) {
		const slotIndex = deckSlotIndex(index);
		const parsedClaim = DeckCardClaimSchema.safeParse(rawClaim);
		if (parsedClaim.success) {
			claims.push(parsedClaim.data);
			continue;
		}

		rejections.push(rejection({
			slotIndex,
			code: 'invalid-claim',
			detail: zodIssueDetail(parsedClaim.error),
		}));
	}

	if (rawClaims.length === 0 || rawClaims.length > 100) {
		rejections.push(rejection({
			slotIndex: deckSlotIndex(0),
			code: 'invalid-claim',
			detail: 'deck claims length must be between 1 and 100',
		}));
	}

	return rejections.length === 0
		? { status: 'parsed', claims }
		: { status: 'rejected', claims, rejections };
}

function starterEntriesByCardId(
	collection: readonly PlayerCollectionEntry[],
): ReadonlyMap<number, Extract<PlayerCollectionEntry, { authority: 'starter-entitlement' }>> {
	const entries = new Map<number, Extract<PlayerCollectionEntry, { authority: 'starter-entitlement' }>>();
	for (const entry of collection) {
		if (entry.authority !== 'starter-entitlement') continue;
		entries.set(entry.cardId, entry);
	}
	return entries;
}

function nftEntriesByUid(
	collection: readonly PlayerCollectionEntry[],
): ReadonlyMap<string, Extract<PlayerCollectionEntry, { authority: 'nft-custody' }>> {
	const entries = new Map<string, Extract<PlayerCollectionEntry, { authority: 'nft-custody' }>>();
	for (const entry of collection) {
		if (entry.authority !== 'nft-custody') continue;
		entries.set(entry.nftUid, entry);
	}
	return entries;
}

export function verifyDeckClaims(input: {
	readonly claims: readonly DeckCardClaim[];
	readonly collection: readonly PlayerCollectionEntry[];
}): DeckVerificationDecision {
	const starterLookup = starterEntriesByCardId(input.collection);
	const nftLookup = nftEntriesByUid(input.collection);
	const starterUseCounts = new Map<number, number>();
	const seenNftUids = new Set<string>();
	const cards: VerifiedDeckCard[] = [];
	const rejections: DeckRejection[] = [];

	for (const [index, claim] of input.claims.entries()) {
		const slotIndex = deckSlotIndex(index);

		if (claim.authority === 'starter-entitlement') {
			const entry = starterLookup.get(claim.cardId);
			const nextCount = (starterUseCounts.get(claim.cardId) ?? 0) + 1;
			starterUseCounts.set(claim.cardId, nextCount);

			if (!entry || entry.ownedCopies <= 0) {
				rejections.push(rejection({
					slotIndex,
					code: 'invalid-starter',
					detail: 'starter card is not in the entitlement',
					authority: claim.authority,
					cardId: claim.cardId,
				}));
				continue;
			}

			if (nextCount > entry.ownedCopies) {
				rejections.push(rejection({
					slotIndex,
					code: 'copy-limit-exceeded',
					detail: 'starter card copy limit exceeded',
					authority: claim.authority,
					cardId: claim.cardId,
				}));
				continue;
			}

			cards.push({
				slotIndex,
				authority: 'starter-entitlement',
				cardId: claim.cardId,
				transferable: false,
				earnsCardXp: false,
			});
			continue;
		}

		if (seenNftUids.has(claim.nftUid)) {
			rejections.push(rejection({
				slotIndex,
				code: 'duplicate-nft-uid',
				detail: 'NFT uid appears more than once in this deck',
				authority: claim.authority,
				nftUid: claim.nftUid,
			}));
			continue;
		}
		seenNftUids.add(claim.nftUid);

		const entry = nftLookup.get(claim.nftUid);
		if (!entry) {
			rejections.push(rejection({
				slotIndex,
				code: 'not-owner',
				detail: 'NFT uid is not in the player collection',
				authority: claim.authority,
				nftUid: claim.nftUid,
			}));
			continue;
		}

		if (claim.cardId !== entry.cardId) {
			rejections.push(rejection({
				slotIndex,
				code: 'claim-card-id-mismatch',
				detail: 'NFT cardId claim does not match resolved instance',
				authority: claim.authority,
				cardId: claim.cardId,
				nftUid: claim.nftUid,
			}));
			continue;
		}

		cards.push({
			slotIndex,
			authority: 'nft-custody',
			nftUid: entry.nftUid,
			cardId: entry.cardId,
			xp: entry.xp,
			level: entry.level,
			transferable: true,
			earnsCardXp: true,
		});
	}

	return rejections.length === 0
		? { status: 'verified', cards }
		: { status: 'rejected', cards, rejections };
}

export function isDeckVerified(
	decision: DeckVerificationDecision,
): decision is Extract<DeckVerificationDecision, { status: 'verified' }> {
	return decision.status === 'verified';
}
