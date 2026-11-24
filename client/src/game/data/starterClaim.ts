import type { CardData } from '../types';
import { getStarterCards, seedStarterHeroDecks } from './starterSet';
import { useStarterStore } from '../stores/starterStore';
import { isSharedNetworkEnvironment } from '../config/featureFlags';
import { resolveProtectedFlowAccess } from '../auth/protectedFlowAccess';
import { getAuthenticatedHiveUsername } from '../../data/HiveSessionIdentity';
import { signHiveMessage } from '../../data/HiveAuth';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { buildStarterClaimAuthMessage, resolveStarterClaimAuthMode } from '@shared/starterClaimAuth';
import { getRagnarokNetworkConfig } from '../config/networkConfig';

export type StarterClaimResult =
	| { success: true; cards: CardData[] }
	| { success: false; error: string };

type ClaimStarterEntitlementParams = {
	readonly accountId?: string | null;
};

type StarterClaimReceiptResult =
	| { success: true }
	| { success: false; error: string };

type StarterClaimRequestBody =
	| { readonly username: string }
	| { readonly username: string; readonly timestamp: number; readonly signature: string };

function normalizeAccountId(accountId: string | null | undefined): string | null {
	const normalized = accountId?.trim().toLowerCase();
	return normalized && normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function fetchSharedNetworkStarterClaimStatus(
	accountId: string,
): Promise<{ readonly ok: true; readonly claimed: boolean } | { readonly ok: false }> {
	const normalizedAccountId = normalizeAccountId(accountId);
	if (!normalizedAccountId) return { ok: false };
	const response = await fetch(`/api/starter/status/${encodeURIComponent(normalizedAccountId)}`);
	if (!response.ok) return { ok: false };
	const payload: unknown = await response.json().catch(() => null);
	if (!isRecord(payload) || payload.success !== true) return { ok: false };
	return { ok: true, claimed: payload.claimed === true };
}

export async function hasSharedNetworkStarterClaimReceipt(accountId: string): Promise<boolean> {
	const status = await fetchSharedNetworkStarterClaimStatus(accountId);
	return status.ok && status.claimed;
}

export async function syncSharedNetworkStarterClaimStatus(
	accountId: string | null | undefined,
): Promise<{ readonly synced: boolean; readonly claimed: boolean }> {
	const normalizedAccountId = normalizeAccountId(accountId);
	if (!normalizedAccountId) return { synced: false, claimed: false };

	const status = await fetchSharedNetworkStarterClaimStatus(normalizedAccountId);
	if (!status.ok) return { synced: false, claimed: false };

	if (status.claimed) {
		useStarterStore.getState().reconcileServerClaimStatus(normalizedAccountId, true);
		return { synced: true, claimed: true };
	}

	const localClaimed = useStarterStore.getState().hasClaimed(normalizedAccountId);
	const policy = buildRagnarokRuntimeEvidence(getRagnarokNetworkConfig()).phasePolicy;
	if (localClaimed && resolveStarterClaimAuthMode(policy) === 'unsigned-local') {
		const repaired = await ensureSharedNetworkStarterClaimReceipt(normalizedAccountId);
		if (repaired.success) {
			useStarterStore.getState().reconcileServerClaimStatus(normalizedAccountId, true);
			return { synced: true, claimed: true };
		}
		// Do not clear a valid local F1 starter claim on a transient server/network
		// error during auto-repair; report unsynced so callers can retry safely.
		return { synced: false, claimed: false };
	}

	useStarterStore.getState().reconcileServerClaimStatus(normalizedAccountId, false);
	return { synced: true, claimed: false };
}

export async function reconcileSharedNetworkStarterClaimReceipt(
	accountId: string,
): Promise<StarterClaimReceiptResult> {
	const normalizedAccountId = normalizeAccountId(accountId);
	if (!normalizedAccountId) {
		return { success: false, error: 'Hive account required to verify starter claim.' };
	}

	const synced = await syncSharedNetworkStarterClaimStatus(normalizedAccountId);
	if (!synced.synced) {
		return { success: false, error: 'Could not verify starter claim status with the server. Try again.' };
	}
	if (synced.claimed) {
		return { success: true };
	}
	return { success: false, error: 'Complete the starter claim before searching for a PvP opponent.' };
}

export async function ensureSharedNetworkStarterClaimReceipt(accountId: string): Promise<StarterClaimReceiptResult> {
	const normalizedAccountId = normalizeAccountId(accountId);
	if (!normalizedAccountId) {
		return { success: false, error: 'Hive account required to register starter claim.' };
	}
	if (await hasSharedNetworkStarterClaimReceipt(normalizedAccountId)) {
		return { success: true };
	}

	const policy = buildRagnarokRuntimeEvidence(getRagnarokNetworkConfig()).phasePolicy;
	const authMode = resolveStarterClaimAuthMode(policy);
	let body: StarterClaimRequestBody = {
		username: normalizedAccountId,
	};
	if (authMode === 'hive-body-auth') {
		const timestamp = Date.now();
		const message = buildStarterClaimAuthMessage({ username: normalizedAccountId, timestamp });
		const signature = await signHiveMessage(message, {
			username: normalizedAccountId,
			title: 'Ragnarok: starter claim',
		});
		if (!signature.success || !signature.signature) {
			return { success: false, error: 'Hive Keychain signature required to register starter claim for shared-network P2P.' };
		}
		body = {
			username: normalizedAccountId,
			timestamp,
			signature: signature.signature,
		};
	}

	const response = await fetch('/api/starter/claim', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
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
