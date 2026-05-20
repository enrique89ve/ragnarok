/**
 * deckVerification.ts - NFT deck ownership verification
 *
 * Runs entirely in the player's browser using IndexedDB — no server call.
 * Verifies that every NFT card in a deck is owned by the specified account
 * according to the local chain replay state.
 *
 * Starter cards are persistent, universally owned, and off-chain, so they are
 * valid in Hive/mainnet mode without an `nft_id`. Other non-NFT cards are
 * skipped only outside Hive/mainnet mode (local/dev runtime).
 *
 * Usage:
 *   const result = await verifyDeckOwnership('alice', deck);
 *   if (!result.valid) console.error(result.invalidCards);
 */

import { getCard } from './replayDB';
import { sha256Hash } from './hashUtils';
import { isSharedNetworkEnvironment } from '@/config/featureFlags';
import type { CardCategory } from '@shared/schemas/cardCategory';
import { isStarterEntitlementCardId } from '@shared/schemas/starterEntitlement';
import {
	buildPlayerCollection,
} from '@shared/protocol-core/playerCollection';
import {
	toDeckClaimsFromLegacyCardRefs,
	verifyDeckClaims,
	type DeckCardClaim,
	type DeckRejection,
	type LegacyCardRefLike,
} from '@shared/protocol-core/deckVerification';
import type { HiveCardAsset } from '../schemas/HiveTypes';
import { getQaFullCatalogCardsForRuntime, getQaFullCatalogOwnedCopies } from '../../game/protocol/qaFullCatalogEntitlement';
import { CardIdSchema } from '@shared/schemas/ids';

export interface CardRef {
	nft_id?: string;
	instanceId?: string;
	cardId?: number;
	category?: CardCategory;
}

export interface DeckVerificationResult {
	valid: boolean;
	checkedCount: number;
	starterCount: number;
	invalidCards: string[]; // nft_ids that failed ownership check
}

function formatDeckRejection(rejection: DeckRejection): string {
	if (rejection.nftUid !== undefined) return rejection.nftUid;
	if (rejection.cardId !== undefined) return `${rejection.code}:${rejection.cardId}`;
	return `${rejection.code}:${rejection.slotIndex}`;
}

function isOwnedCardFor(account: string) {
	return (card: HiveCardAsset | undefined): card is HiveCardAsset => (
		card !== undefined && card.ownerId === account
	);
}

/**
 * Verify that every NFT card in the deck is owned by hiveAccount.
 * Starter cards are accepted without an NFT id because their entitlement is
 * universal and off-chain. Other non-NFT cards are invalid in Hive/mainnet mode.
 */
export async function verifyDeckOwnership(
	hiveAccount: string,
	deck: CardRef[],
): Promise<DeckVerificationResult> {
	const requireNft = isSharedNetworkEnvironment();
	const refsForVerification: LegacyCardRefLike[] = [];
	const qaClaims: DeckCardClaim[] = [];
	const invalidCards: string[] = [];

	for (const card of deck) {
		if (card.nft_id) {
			refsForVerification.push(card);
			continue;
		}

		if (card.category === 'starter') {
			refsForVerification.push(card);
			continue;
		}

		const parsedCardId = card.cardId === undefined ? null : CardIdSchema.safeParse(card.cardId);
		if (parsedCardId?.success && getQaFullCatalogOwnedCopies(parsedCardId.data) > 0) {
			qaClaims.push({
				authority: 'qa_full_catalog',
				cardId: parsedCardId.data,
			});
			continue;
		}

		if (requireNft) {
			invalidCards.push(`no-nft:${card.cardId ?? 'unknown'}`);
		}
	}

	const parsed = toDeckClaimsFromLegacyCardRefs(refsForVerification);
	const claims = [...parsed.claims, ...qaClaims];
	const nftClaims = claims.filter(claim => claim.authority === 'nft-custody');
	const storedCards = await Promise.all(nftClaims.map(claim => getCard(claim.nftUid)));
	const ownedNfts = storedCards
		.filter(isOwnedCardFor(hiveAccount))
		.map(card => ({
			nftUid: card.uid,
			cardId: card.cardId,
			owner: card.ownerId,
			xp: card.xp,
			level: card.level,
		}));

	const collection = buildPlayerCollection({
		nftCards: ownedNfts,
		qaFullCatalogCards: getQaFullCatalogCardsForRuntime(),
	});
	const decision = verifyDeckClaims({
		claims,
		collection,
	});
	const verificationRejections = decision.status === 'rejected' ? decision.rejections : [];
	const parseRejections = parsed.status === 'rejected' ? parsed.rejections : [];
	const allRejections = [...parseRejections, ...verificationRejections];
	const starterCount = decision.cards.filter(card => card.authority === 'starter-entitlement').length;

	for (const rejection of allRejections) {
		invalidCards.push(formatDeckRejection(rejection));
	}

	return {
		valid: invalidCards.length === 0,
		checkedCount: nftClaims.length,
		starterCount,
		invalidCards,
	};
}

/**
 * @deprecated Kept for old tests/callers while the shared verifier migrates in.
 */
export function isStarterCardRef(card: CardRef): boolean {
	return card.category === 'starter' && isStarterEntitlementCardId(card.cardId);
}

/**
 * Quick boolean check — cheaper than full result when you just need pass/fail.
 */
export async function isDeckOwned(
	hiveAccount: string,
	deck: CardRef[],
): Promise<boolean> {
	const result = await verifyDeckOwnership(hiveAccount, deck);
	return result.valid;
}

/**
 * Compute a deterministic deck hash for the match_start anchor.
 * Uses SHA-256 truncated to 32 hex chars. Sorted by nft_id so order doesn't matter.
 * Non-NFT cards are included as their cardId string.
 */
export async function computeDeckHash(deck: CardRef[]): Promise<string> {
	const ids = deck
		.map(c => c.nft_id ?? `card:${c.cardId ?? 'unknown'}`)
		.sort()
		.join(',');
	const fullHash = await sha256Hash(ids);
	return fullHash.slice(0, 32);
}
