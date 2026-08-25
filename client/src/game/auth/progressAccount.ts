import { GUEST_ACCOUNT_ID } from '../../lib/storage/accountScopedStorage';
import { isValidAvailabilityHiveUsername, normalizeHiveUsername } from '@shared/p2pAvailability';
import type { RagnarokNetworkStage } from '@shared/runtimeConfig';

export const LEGACY_LOCAL_ACCOUNT_ID = 'local';

export type ProgressAccount =
	| { readonly kind: 'hive'; readonly account: string }
	| { readonly kind: 'guest'; readonly account: typeof GUEST_ACCOUNT_ID };

export function isReservedAnonymousAccount(account: string | null | undefined): boolean {
	const normalized = account ? normalizeHiveUsername(account) : '';
	return normalized === GUEST_ACCOUNT_ID || normalized === LEGACY_LOCAL_ACCOUNT_ID;
}

export function isSharedProgressStage(stage: RagnarokNetworkStage): boolean {
	return stage !== 'local';
}

export function resolveProgressAccount(input: {
	readonly username: string | null | undefined;
	readonly sharedNetwork: boolean;
}): ProgressAccount | null {
	const username = input.username ? normalizeHiveUsername(input.username) : '';
	if (input.sharedNetwork) {
		if (!username || isReservedAnonymousAccount(username) || !isValidAvailabilityHiveUsername(username)) {
			return null;
		}
		return { kind: 'hive', account: username };
	}
	if (username && isValidAvailabilityHiveUsername(username) && !isReservedAnonymousAccount(username)) {
		return { kind: 'hive', account: username };
	}
	return { kind: 'guest', account: GUEST_ACCOUNT_ID };
}

export function resolveProgressAccountId(input: {
	readonly username: string | null | undefined;
	readonly sharedNetwork: boolean;
}): string | null {
	return resolveProgressAccount(input)?.account ?? null;
}

export function commitProgressAccountId(
	account: string | null | undefined,
	stage: RagnarokNetworkStage,
): string | null {
	return resolveProgressAccountId({
		username: account,
		sharedNetwork: isSharedProgressStage(stage),
	});
}

export function commitHiveProgressAccountId(
	account: string | null | undefined,
	stage: RagnarokNetworkStage,
): string | null {
	const resolved = resolveProgressAccount({
		username: account,
		sharedNetwork: isSharedProgressStage(stage),
	});
	return resolved?.kind === 'hive' ? resolved.account : null;
}
