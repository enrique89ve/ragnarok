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

/**
 * Verify that every NFT card in the deck is owned by hiveAccount.
 * Starter cards are accepted without an NFT id because their entitlement is
 * universal and off-chain. Other non-NFT cards are invalid in Hive/mainnet mode.
 */
export async function verifyDeckOwnership(
	hiveAccount: string,
	deck: CardRef[],
): Promise<DeckVerificationResult> {
	const invalidCards: string[] = [];
	let checkedCount = 0;
	let starterCount = 0;

	const requireNft = isSharedNetworkEnvironment();
	for (const card of deck) {
		if (!card.nft_id) {
			if (card.category === 'starter' && isStarterEntitlementCardId(card.cardId)) {
				starterCount++;
				continue;
			}
			if (requireNft) {
				const reason = card.category === 'starter' ? 'invalid-starter' : 'no-nft';
				invalidCards.push(`${reason}:${card.cardId ?? 'unknown'}`);
			}
			continue;
		}
		checkedCount++;

		const stored = await getCard(card.nft_id);
		if (!stored || stored.ownerId !== hiveAccount) {
			invalidCards.push(card.nft_id);
		}
	}

	return {
		valid: invalidCards.length === 0,
		checkedCount,
		starterCount,
		invalidCards,
	};
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
