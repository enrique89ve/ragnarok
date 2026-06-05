import type { CardData } from '../types';
import { getStarterCards, seedStarterHeroDecks } from './starterSet';
import { useStarterStore } from '../stores/starterStore';
import { isSharedNetworkEnvironment } from '../config/featureFlags';
import { resolveProtectedFlowAccess } from '../auth/protectedFlowAccess';
import { getAuthenticatedHiveUsername } from '../../data/HiveSessionIdentity';

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
	const authenticatedAccountId = getAuthenticatedHiveUsername();
	const access = resolveProtectedFlowAccess({
		accountId: accountId ?? authenticatedAccountId,
		authenticatedAccountId,
		sharedNetwork: isSharedNetworkEnvironment(),
		surface: 'starter_claim',
	});

	if (access.kind === 'blocked') {
		return { success: false, error: access.message };
	}

	const normalizedAccountId = normalizeAccountId(access.accountId);

	// Ownership is universal — no materialization needed. The claim ceremony's
	// only data effect is (a) seeding the 4 pre-built hero decks for convenience
	// and (b) recording claimedAt so the ritual is not shown again.
	const cards = getStarterCards();
	seedStarterHeroDecks();
	useStarterStore.getState().markClaimed(normalizedAccountId);

	return { success: true, cards };
}
