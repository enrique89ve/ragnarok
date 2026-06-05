export type ProtectedFlowSurface =
	| 'starter_claim'
	| 'campaign'
	| 'campaign_battle'
	| 'collection'
	| 'multiplayer'
	| 'packs'
	| 'warband'
	| 'quick_match';

export type ProtectedFlowAccess =
	| {
		readonly kind: 'allowed';
		readonly accountId: string | null;
		readonly localDev: boolean;
	}
	| {
		readonly kind: 'blocked';
		readonly reason: 'hive_account_required' | 'hive_session_required' | 'hive_session_mismatch';
		readonly title: string;
		readonly message: string;
	};

const SURFACE_LABELS: Record<ProtectedFlowSurface, string> = {
	starter_claim: 'Starter claim',
	campaign: 'Campaign',
	campaign_battle: 'Campaign battle',
	collection: 'Collection',
	multiplayer: 'Multiplayer',
	packs: 'Packs vault',
	warband: 'Warband loadouts',
	quick_match: 'Quick Match',
};

export function normalizeProtectedFlowAccountId(accountId: string | null | undefined): string | null {
	const normalized = accountId?.trim().toLowerCase();
	return normalized && normalized.length > 0 ? normalized : null;
}

export function resolveProtectedFlowAccess({
	accountId,
	authenticatedAccountId,
	sharedNetwork,
	surface,
}: {
	readonly accountId?: string | null;
	readonly authenticatedAccountId?: string | null;
	readonly sharedNetwork: boolean;
	readonly surface: ProtectedFlowSurface;
}): ProtectedFlowAccess {
	const normalizedAccountId = normalizeProtectedFlowAccountId(accountId);
	const normalizedAuthenticatedAccountId = normalizeProtectedFlowAccountId(authenticatedAccountId);
	if (!sharedNetwork) {
		return {
			kind: 'allowed',
			accountId: normalizedAccountId,
			localDev: true,
		};
	}

	const label = SURFACE_LABELS[surface];

	if (!normalizedAccountId) {
		return {
			kind: 'blocked',
			reason: 'hive_account_required',
			title: 'Hive account required',
			message: `${label} requires a connected Hive account in testnet/mainnet. Local dev remains open for free-play testing.`,
		};
	}

	if (!normalizedAuthenticatedAccountId) {
		return {
			kind: 'blocked',
			reason: 'hive_session_required',
			title: 'Hive signature required',
			message: `${label} requires a current Hive Keychain signature for @${normalizedAccountId} in testnet/mainnet. Reconnect or sign again before continuing.`,
		};
	}

	if (normalizedAuthenticatedAccountId === normalizedAccountId) {
		return {
			kind: 'allowed',
			accountId: normalizedAccountId,
			localDev: false,
		};
	}

	return {
		kind: 'blocked',
		reason: 'hive_session_mismatch',
		title: 'Hive account mismatch',
		message: `${label} is opened for @${normalizedAccountId}, but the current Keychain signature belongs to @${normalizedAuthenticatedAccountId}. Disconnect and reconnect with the correct Hive account.`,
	};
}
