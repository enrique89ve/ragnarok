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
		readonly reason:
			| 'hive_account_required'
			| 'hive_session_required'
			| 'hive_session_mismatch'
			| 'starter_claim_required';
		readonly accountId?: string | null;
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

type ResolveProtectedFlowAccessParams = {
	readonly accountId?: string | null;
	readonly authenticatedAccountId?: string | null;
	readonly sharedNetwork: boolean;
	readonly surface: ProtectedFlowSurface;
	readonly requiresAuthenticatedSession?: boolean;
	readonly requiresStarterClaim?: boolean;
	readonly starterClaimed?: boolean;
};

function allowProtectedFlow(accountId: string | null, localDev: boolean): ProtectedFlowAccess {
	return {
		kind: 'allowed',
		accountId,
		localDev,
	};
}

function blockHiveAccountRequired(label: string): ProtectedFlowAccess {
	return {
		kind: 'blocked',
		reason: 'hive_account_required',
		accountId: null,
		title: 'Hive account required',
		message: `${label} requires a connected Hive account in testnet/mainnet. Local dev remains open for free-play testing.`,
	};
}

function blockHiveSessionRequired(label: string, accountId: string): ProtectedFlowAccess {
	return {
		kind: 'blocked',
		reason: 'hive_session_required',
		accountId,
		title: 'Hive signature required',
		message: `${label} requires a current Hive Keychain signature for @${accountId} in testnet/mainnet. Reconnect or sign again before continuing.`,
	};
}

function blockHiveSessionMismatch(label: string, accountId: string, authenticatedAccountId: string): ProtectedFlowAccess {
	return {
		kind: 'blocked',
		reason: 'hive_session_mismatch',
		accountId,
		title: 'Hive account mismatch',
		message: `${label} is opened for @${accountId}, but the current Keychain signature belongs to @${authenticatedAccountId}. Disconnect and reconnect with the correct Hive account.`,
	};
}

function blockStarterClaimRequired(label: string, accountId: string | null, sharedNetwork: boolean): ProtectedFlowAccess {
	return {
		kind: 'blocked',
		reason: 'starter_claim_required',
		accountId,
		title: 'Starter claim required',
		message: sharedNetwork && accountId
			? `${label} requires @${accountId} to claim the starter deck before entering P2P.`
			: `${label} requires the starter claim before battle-ready loadouts can enter play.`,
	};
}

function resolveSharedNetworkAccountAccess({
	label,
	accountId,
	authenticatedAccountId,
	requiresAuthenticatedSession,
}: {
	readonly label: string;
	readonly accountId: string | null;
	readonly authenticatedAccountId: string | null;
	readonly requiresAuthenticatedSession: boolean;
}): ProtectedFlowAccess | null {
	if (!accountId) return blockHiveAccountRequired(label);
	if (!requiresAuthenticatedSession) return null;
	if (!authenticatedAccountId) return blockHiveSessionRequired(label, accountId);
	if (authenticatedAccountId !== accountId) return blockHiveSessionMismatch(label, accountId, authenticatedAccountId);
	return null;
}

export function resolveProtectedFlowAccess({
	accountId,
	authenticatedAccountId,
	sharedNetwork,
	surface,
	requiresAuthenticatedSession = true,
	requiresStarterClaim = false,
	starterClaimed = false,
}: ResolveProtectedFlowAccessParams): ProtectedFlowAccess {
	const normalizedAccountId = normalizeProtectedFlowAccountId(accountId);
	const normalizedAuthenticatedAccountId = normalizeProtectedFlowAccountId(authenticatedAccountId);
	const label = SURFACE_LABELS[surface];

	if (sharedNetwork) {
		const accountAccess = resolveSharedNetworkAccountAccess({
			label,
			accountId: normalizedAccountId,
			authenticatedAccountId: normalizedAuthenticatedAccountId,
			requiresAuthenticatedSession,
		});
		if (accountAccess) return accountAccess;
	}

	if (requiresStarterClaim && !starterClaimed) {
		return blockStarterClaimRequired(label, normalizedAccountId, sharedNetwork);
	}

	return allowProtectedFlow(normalizedAccountId, !sharedNetwork);
}
