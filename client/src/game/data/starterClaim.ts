import type { CardData } from '../types';
import { getNFTBridge } from '../nft';
import { buildStarterDecks, getStarterCards, materializeStarterEntitlement } from './starterSet';
import { useStarterStore } from '../stores/starterStore';

export type StarterClaimResult =
	| { success: true; cards: CardData[] }
	| { success: false; error: string };

interface ClaimStarterEntitlementParams {
	accountId?: string | null;
	requireSignature: boolean;
}

function normalizeAccountId(accountId: string | null | undefined): string | null {
	const normalized = accountId?.trim().toLowerCase();
	return normalized && normalized.length > 0 ? normalized : null;
}

export async function claimStarterEntitlement({
	accountId,
	requireSignature,
}: ClaimStarterEntitlementParams): Promise<StarterClaimResult> {
	const normalizedAccountId = normalizeAccountId(accountId);

	if (requireSignature) {
		if (!normalizedAccountId) {
			return { success: false, error: 'Connect Hive before claiming starter.' };
		}

		const bridge = getNFTBridge();
		const activeAccountId = normalizeAccountId(bridge.getUsername());
		if (activeAccountId !== normalizedAccountId) {
			return { success: false, error: 'Active Hive account does not match the starter claim account.' };
		}

		const authBody = await bridge.buildAuthBody(normalizedAccountId, 'starter-claim', {
			claim: 'starter',
			v: 1,
		});
		if (!authBody.signature) {
			return { success: false, error: 'Starter claim signature was rejected.' };
		}
	}

	const cards = getStarterCards();
	materializeStarterEntitlement();
	buildStarterDecks();
	useStarterStore.getState().markClaimed(normalizedAccountId);

	return { success: true, cards };
}
