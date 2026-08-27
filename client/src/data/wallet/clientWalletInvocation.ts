const CLIENT_WALLET_INVOCATION_BRAND: unique symbol = Symbol('clientWalletInvocation');

export type ClientWalletActionKind =
	| 'login'
	| 'rest_auth'
	| 'daily_quest_claim'
	| 'pack_burn'
	| 'duat_airdrop_claim'
	| 'pack_purchase'
	| 'rune_exchange'
	| 'card_transfer'
	| 'market_action'
	| 'p2p_session_authorize'
	| 'p2p_match_acceptance'
	| 'p2p_result_signature'
	| 'slash_evidence'
	| 'admin_supply'
	| 'transaction_queue_submit';

export type ClientWalletAuthority = 'Posting' | 'Active' | 'Memo';

export type ClientWalletInvocation = Readonly<{
	[CLIENT_WALLET_INVOCATION_BRAND]: true;
	kind: ClientWalletActionKind;
	authority: ClientWalletAuthority;
	label: string;
	invokedAt: number;
	source: 'user';
}>;

type ClientWalletInvocationInput = Readonly<{
	kind: ClientWalletActionKind;
	authority: ClientWalletAuthority;
	label: string;
}>;

export function createClientWalletInvocation(
	input: ClientWalletInvocationInput,
): ClientWalletInvocation {
	return {
		[CLIENT_WALLET_INVOCATION_BRAND]: true,
		kind: input.kind,
		authority: input.authority,
		label: input.label,
		invokedAt: Date.now(),
		source: 'user',
	};
}

export function assertClientWalletInvocation(
	value: unknown,
	expectedKind?: ClientWalletActionKind,
	expectedAuthority?: ClientWalletAuthority,
): asserts value is ClientWalletInvocation {
	if (typeof value !== 'object' || value === null) {
		throw new Error('Client wallet invocation is required before opening Keychain');
	}

	const candidate = value as Record<PropertyKey, unknown>;
	if (candidate[CLIENT_WALLET_INVOCATION_BRAND] !== true || candidate.source !== 'user') {
		throw new Error('Client wallet invocation must come from an explicit user action');
	}

	if (expectedKind && candidate.kind !== expectedKind) {
		throw new Error(`Client wallet invocation kind mismatch: expected ${expectedKind}`);
	}

	if (expectedAuthority && candidate.authority !== expectedAuthority) {
		throw new Error(`Client wallet invocation authority mismatch: expected ${expectedAuthority}`);
	}
}

export async function invokeClientWalletAction<T>(
	input: ClientWalletInvocationInput,
	run: (invocation: ClientWalletInvocation) => Promise<T>,
): Promise<T> {
	return run(createClientWalletInvocation(input));
}
