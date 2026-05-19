import type { CardData } from '../types';
import { getStarterCards, seedStarterHeroDecks } from './starterSet';
import { useStarterStore } from '../stores/starterStore';

export type StarterClaimResult =
	| { success: true; cards: CardData[] }
	| { success: false; error: string };

interface ClaimStarterEntitlementParams {
	accountId?: string | null;
}

function normalizeAccountId(accountId: string | null | undefined): string | null {
	const normalized = accountId?.trim().toLowerCase();
	return normalized && normalized.length > 0 ? normalized : null;
}

export async function claimStarterEntitlement({
	accountId,
}: ClaimStarterEntitlementParams): Promise<StarterClaimResult> {
	const normalizedAccountId = normalizeAccountId(accountId);

	// Ownership is universal — no materialization needed. The claim ceremony's
	// only data effect is (a) seeding the 4 pre-built hero decks for convenience
	// and (b) recording claimedAt so the ritual is not shown again.
	const cards = getStarterCards();
	seedStarterHeroDecks();
	useStarterStore.getState().markClaimed(normalizedAccountId);

	return { success: true, cards };
}
