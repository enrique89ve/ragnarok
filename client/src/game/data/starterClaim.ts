import type { CardData } from '../types';
import { getStarterCards, seedStarterHeroDecks } from './starterSet';
import { useStarterStore } from '../stores/starterStore';
import { isSharedNetworkEnvironment } from '../config/featureFlags';
import { resolveProtectedFlowAccess } from '../auth/protectedFlowAccess';
import { getAuthenticatedHiveUsername } from '../../data/HiveSessionIdentity';
import { signHiveMessage } from '../../data/HiveAuth';
import { buildStarterClaimAuthMessage } from '@shared/starterClaimAuth';

export type StarterClaimResult =
	| { success: true; cards: CardData[] }
	| { success: false; error: string };

type ClaimStarterEntitlementParams = {
	readonly accountId?: string | null;
};

type StarterClaimReceiptResult =
	| { success: true }
	| { success: false; error: string };

function normalizeAccountId(accountId: string | null | undefined): string | null {
	const normalized = accountId?.trim().toLowerCase();
	return normalized && normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function hasSharedNetworkStarterClaimReceipt(accountId: string): Promise<boolean> {
	const response = await fetch(`/api/starter/status/${encodeURIComponent(accountId)}`);
	if (!response.ok) return false;
	const payload: unknown = await response.json().catch(() => null);
	return isRecord(payload) && payload.success === true && payload.claimed === true;
}

export async function ensureSharedNetworkStarterClaimReceipt(accountId: string): Promise<StarterClaimReceiptResult> {
	const normalizedAccountId = normalizeAccountId(accountId);
	if (!normalizedAccountId) {
		return { success: false, error: 'Hive account required to register starter claim.' };
	}
	if (await hasSharedNetworkStarterClaimReceipt(normalizedAccountId)) {
		return { success: true };
	}

	const timestamp = Date.now();
	const message = buildStarterClaimAuthMessage({ username: normalizedAccountId, timestamp });
	const signature = await signHiveMessage(message, {
		username: normalizedAccountId,
		title: 'Ragnarok: starter claim',
	});
	if (!signature.success || !signature.signature) {
		return { success: false, error: 'Hive Keychain signature required to register starter claim for shared-network P2P.' };
	}

	const response = await fetch('/api/starter/claim', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			username: normalizedAccountId,
			timestamp,
			signature: signature.signature,
		}),
	});
	if (!response.ok) {
		return { success: false, error: `Starter claim registry rejected the ceremony (HTTP ${response.status}).` };
	}
	return { success: true };
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
	if (isSharedNetworkEnvironment()) {
		if (!normalizedAccountId) {
			return { success: false, error: 'Hive account required to register starter claim.' };
		}
		const receipt = await ensureSharedNetworkStarterClaimReceipt(normalizedAccountId);
		if (!receipt.success) return receipt;
	}

	// Ownership is universal — no materialization needed. The claim ceremony's
	// only data effect is (a) seeding the 4 pre-built hero decks for convenience
	// and (b) recording claimedAt so the ritual is not shown again.
	const cards = getStarterCards();
	seedStarterHeroDecks();
	useStarterStore.getState().markClaimed(normalizedAccountId);

	return { success: true, cards };
}
