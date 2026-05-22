export type ProtectedFlowSurface =
	| 'starter_claim'
	| 'campaign'
	| 'campaign_battle'
	| 'multiplayer'
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
		readonly reason: 'hive_account_required';
		readonly title: string;
		readonly message: string;
	};

const SURFACE_LABELS: Record<ProtectedFlowSurface, string> = {
	starter_claim: 'Starter claim',
	campaign: 'Campaign',
	campaign_battle: 'Campaign battle',
	multiplayer: 'Multiplayer',
	warband: 'Warband loadouts',
	quick_match: 'Quick Match',
};

export function normalizeProtectedFlowAccountId(accountId: string | null | undefined): string | null {
	const normalized = accountId?.trim().toLowerCase();
	return normalized && normalized.length > 0 ? normalized : null;
}

export function resolveProtectedFlowAccess({
	accountId,
	sharedNetwork,
	surface,
}: {
	readonly accountId?: string | null;
	readonly sharedNetwork: boolean;
	readonly surface: ProtectedFlowSurface;
}): ProtectedFlowAccess {
	const normalizedAccountId = normalizeProtectedFlowAccountId(accountId);
	if (!sharedNetwork) {
		return {
			kind: 'allowed',
			accountId: normalizedAccountId,
			localDev: true,
		};
	}

	if (normalizedAccountId) {
		return {
			kind: 'allowed',
			accountId: normalizedAccountId,
			localDev: false,
		};
	}

	const label = SURFACE_LABELS[surface];
	return {
		kind: 'blocked',
		reason: 'hive_account_required',
		title: 'Hive account required',
		message: `${label} requires a connected Hive account in testnet/mainnet. Local dev remains open for free-play testing.`,
	};
}
